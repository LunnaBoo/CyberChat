import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { displayName } from "@/lib/nostr";
import { useContacts } from "@/hooks/useContacts";
import { authStore, useAuth } from "@/stores/authStore";
import type {
  Conversation,
  ConversationSummary,
  Message,
  PresenceStatus,
  Profile,
} from "@/lib/types";

type ModalKind =
  | { kind: "none" }
  | { kind: "new-conversation" }
  | { kind: "settings" }
  | { kind: "profile"; npub: string }
  | { kind: "palette" };

interface AppValue {
  me: Profile | null;
  contacts: ReturnType<typeof useContacts>;
  conversations: ConversationSummary[];
  tabs: string[];
  activeTab: string | null;
  unread: Record<string, number>;
  modal: ModalKind;
  sidebarOpen: boolean;
  openModal: (modal: ModalKind) => void;
  closeModal: () => void;
  toggleSidebar: () => void;
  openConversation: (id: string) => void;
  closeTab: (id: string) => void;
  cycleTab: (dir: 1 | -1) => void;
  startDm: (npub: string) => Promise<void>;
  createGroup: (name: string, npubs: string[]) => Promise<void>;
  reloadConversations: () => Promise<void>;
  setStatus: (status: PresenceStatus) => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  profileFor: (npub: string) => Profile | undefined;
}

const AppContext = createContext<AppValue | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { identity, profile } = useAuth();
  const myNpub = identity?.npub ?? null;
  const contacts = useContacts(myNpub);

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [tabs, setTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [modal, setModal] = useState<ModalKind>({ kind: "none" });
  const [sidebarOpen, setSidebarOpen] = useState(
    () =>
      typeof window === "undefined" ||
      window.matchMedia("(min-width: 768px)").matches,
  );
  const reloadInFlight = useRef<Promise<void> | null>(null);
  const openingDm = useRef<string | null>(null);

  const doReload = useCallback(async () => {
    if (!myNpub) {
      setConversations([]);
      return;
    }
    const { data: mine } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_npub", myNpub);
    const ids = (mine ?? []).map((r) => r.conversation_id as string);
    if (ids.length === 0) {
      setConversations([]);
      return;
    }
    const [{ data: convs }, { data: parts }] = await Promise.all([
      supabase.from("conversations").select("*").in("id", ids),
      supabase
        .from("conversation_participants")
        .select("conversation_id,user_npub")
        .in("conversation_id", ids),
    ]);
    const otherNpubs = Array.from(
      new Set((parts ?? []).map((p) => p.user_npub as string)),
    );
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("npub", otherNpubs);
    const byNpub = new Map(
      ((profiles ?? []) as Profile[]).map((p) => [p.npub, p]),
    );

    const summaries: ConversationSummary[] = ((convs ?? []) as Conversation[])
      .map((c) => {
        const members = (parts ?? [])
          .filter((p) => p.conversation_id === c.id)
          .map((p) => byNpub.get(p.user_npub as string))
          .filter((p): p is Profile => Boolean(p));
        const others = members.filter((p) => p.npub !== myNpub);
        const title =
          c.type === "group"
            ? (c.name ?? "group")
            : displayName(others[0] ?? null);
        const sigil =
          c.type === "group" ? "▤" : (others[0]?.avatar_sigil ?? "◆");
        return {
          conversation: c,
          participants: members,
          title,
          sigil,
          avatarUrl:
            c.type === "group" ? null : (others[0]?.avatar_url ?? null),
        };
      })
      .sort((a, b) => a.title.localeCompare(b.title));

    setConversations(summaries);
  }, [myNpub]);

  const reloadConversations = useCallback(async () => {
    if (!myNpub) {
      setConversations([]);
      return;
    }
    if (reloadInFlight.current) return reloadInFlight.current;
    reloadInFlight.current = doReload().finally(() => {
      reloadInFlight.current = null;
    });
    return reloadInFlight.current;
  }, [myNpub, doReload]);

  useEffect(() => {
    void reloadConversations();
  }, [reloadConversations]);

  // unread counts + global message feed
  useEffect(() => {
    if (!myNpub) return;
    void supabase
      .rpc("get_unread_counts", { npub: myNpub })
      .then(({ data }) => {
        const map: Record<string, number> = {};
        ((data ?? []) as { conversation_id: string; unread: number }[]).forEach(
          (r) => {
            if (r.unread > 0) map[r.conversation_id] = Number(r.unread);
          },
        );
        setUnread(map);
      });

    const channel = supabase
      .channel("global-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as Message;
          if (row.sender_npub === myNpub) return;
          setUnread((prev) => {
            if (row.conversation_id === activeTab) return prev;
            return {
              ...prev,
              [row.conversation_id]: (prev[row.conversation_id] ?? 0) + 1,
            };
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversation_participants" },
        (payload) => {
          if (
            payload.eventType === "INSERT" ||
            payload.eventType === "DELETE"
          ) {
            void reloadConversations();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [myNpub, activeTab, reloadConversations]);

  // presence heartbeat
  useEffect(() => {
    if (!myNpub) return;
    const beat = () =>
      void supabase
        .from("profiles")
        .update({ last_seen: new Date().toISOString() })
        .eq("npub", myNpub);
    beat();
    const timer = window.setInterval(beat, 45000);
    return () => window.clearInterval(timer);
  }, [myNpub]);

  const markRead = useCallback(
    async (id: string) => {
      if (!myNpub) return;
      setUnread((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await supabase
        .from("conversation_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", id)
        .eq("user_npub", myNpub);
    },
    [myNpub],
  );

  const openConversation = useCallback(
    (id: string) => {
      setTabs((prev) => (prev.includes(id) ? prev : [...prev, id]));
      setActiveTab(id);
      void markRead(id);
    },
    [markRead],
  );

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t !== id);
      setActiveTab((cur) =>
        cur === id ? (next[next.length - 1] ?? null) : cur,
      );
      return next;
    });
  }, []);

  const cycleTab = useCallback(
    (dir: 1 | -1) => {
      if (tabs.length === 0) return;
      const idx = activeTab ? tabs.indexOf(activeTab) : -1;
      const next = (idx + dir + tabs.length) % tabs.length;
      openConversation(tabs[next]);
    },
    [tabs, activeTab, openConversation],
  );

  const startDm = useCallback(
    async (npub: string) => {
      if (!myNpub || openingDm.current === npub) return;
      openingDm.current = npub;
      try {
        const { data } = await supabase.rpc("get_or_create_dm", {
          npub_a: myNpub,
          npub_b: npub,
        });
        if (!data) return;
        openConversation(data as string);
        await reloadConversations();
      } finally {
        openingDm.current = null;
      }
    },
    [myNpub, reloadConversations, openConversation],
  );

  const createGroup = useCallback(
    async (name: string, npubs: string[]) => {
      if (!myNpub) return;
      const { data: conv } = await supabase
        .from("conversations")
        .insert({ type: "group", name })
        .select()
        .single();
      if (!conv) return;
      await supabase.from("conversation_participants").insert(
        [myNpub, ...npubs].map((n) => ({
          conversation_id: conv.id,
          user_npub: n,
        })),
      );
      await reloadConversations();
      openConversation(conv.id);
    },
    [myNpub, reloadConversations, openConversation],
  );

  const updateProfile = useCallback(
    async (patch: Partial<Profile>) => {
      if (!myNpub) return;
      const { data } = await supabase
        .from("profiles")
        .update(patch)
        .eq("npub", myNpub)
        .select()
        .single();
      if (data) authStore.setProfile(data as Profile);
    },
    [myNpub],
  );

  const setStatus = useCallback(
    async (status: PresenceStatus) => {
      await updateProfile({ status });
    },
    [updateProfile],
  );

  const profileFor = useCallback(
    (npub: string) => {
      if (profile && profile.npub === npub) return profile;
      const fromContacts = contacts.contacts.find((c) => c.npub === npub);
      if (fromContacts) return fromContacts;
      for (const conv of conversations) {
        const hit = conv.participants.find((p) => p.npub === npub);
        if (hit) return hit;
      }
      return undefined;
    },
    [profile, contacts.contacts, conversations],
  );

  const value = useMemo<AppValue>(
    () => ({
      me: profile,
      contacts,
      conversations,
      tabs,
      activeTab,
      unread,
      modal,
      sidebarOpen,
      openModal: setModal,
      closeModal: () => setModal({ kind: "none" }),
      toggleSidebar: () => setSidebarOpen((v) => !v),
      openConversation,
      closeTab,
      cycleTab,
      startDm,
      createGroup,
      reloadConversations,
      setStatus,
      updateProfile,
      profileFor,
    }),
    [
      profile,
      contacts,
      conversations,
      tabs,
      activeTab,
      unread,
      modal,
      sidebarOpen,
      openConversation,
      closeTab,
      cycleTab,
      startDm,
      createGroup,
      reloadConversations,
      setStatus,
      updateProfile,
      profileFor,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
