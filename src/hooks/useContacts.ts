import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FriendRequest, Profile } from "@/lib/types";

export function useContacts(myNpub: string | null) {
  const [contacts, setContacts] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!myNpub) {
      setContacts([]);
      setRequests([]);
      setOutgoing([]);
      return;
    }

    const [{ data: links }, { data: reqs }] = await Promise.all([
      supabase
        .from("friends")
        .select("*")
        .or(`user_npub.eq.${myNpub},friend_npub.eq.${myNpub}`),
      supabase.rpc("get_friend_requests", { npub: myNpub }),
    ]);

    setRequests((reqs ?? []) as FriendRequest[]);

    const accepted = (links ?? []).filter((l) => l.status === "accepted");
    const npubs = accepted.map((l) =>
      l.user_npub === myNpub ? l.friend_npub : l.user_npub,
    );
    setOutgoing(
      (links ?? [])
        .filter((l) => l.status === "pending" && l.user_npub === myNpub)
        .map((l) => l.friend_npub),
    );

    if (npubs.length === 0) {
      setContacts([]);
      return;
    }
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("npub", npubs);
    setContacts((profiles ?? []) as Profile[]);
  }, [myNpub]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!myNpub) return;
    const channel = supabase
      .channel("contacts-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friends" },
        () => void load(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const row = payload.new as Profile;
          setContacts((prev) =>
            prev.map((c) => (c.npub === row.npub ? row : c)),
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [myNpub, load]);

  const sendRequest = useCallback(
    async (targetNpub: string) => {
      if (!myNpub || targetNpub === myNpub) return;
      await supabase
        .from("friends")
        .upsert(
          { user_npub: myNpub, friend_npub: targetNpub, status: "pending" },
          { onConflict: "user_npub,friend_npub" },
        );
      await load();
    },
    [myNpub, load],
  );

  const acceptRequest = useCallback(
    async (requestId: string, requesterNpub: string) => {
      if (!myNpub) return;
      await supabase
        .from("friends")
        .update({ status: "accepted" })
        .eq("id", requestId);
      await supabase.from("friends").upsert(
        {
          user_npub: myNpub,
          friend_npub: requesterNpub,
          status: "accepted",
        },
        { onConflict: "user_npub,friend_npub" },
      );
      await load();
    },
    [myNpub, load],
  );

  const declineRequest = useCallback(
    async (requestId: string) => {
      await supabase.from("friends").delete().eq("id", requestId);
      await load();
    },
    [load],
  );

  const removeFriend = useCallback(
    async (npub: string) => {
      if (!myNpub) return;
      await supabase
        .from("friends")
        .delete()
        .or(
          `and(user_npub.eq.${myNpub},friend_npub.eq.${npub}),and(user_npub.eq.${npub},friend_npub.eq.${myNpub})`,
        );
      await load();
    },
    [myNpub, load],
  );

  const blockUser = useCallback(
    async (npub: string) => {
      if (!myNpub) return;
      await supabase
        .from("friends")
        .delete()
        .eq("user_npub", npub)
        .eq("friend_npub", myNpub);
      await supabase.from("friends").upsert(
        { user_npub: myNpub, friend_npub: npub, status: "blocked" },
        { onConflict: "user_npub,friend_npub" },
      );
      await load();
    },
    [myNpub, load],
  );

  const searchUsers = useCallback(
    async (query: string): Promise<Profile[]> => {
      if (!query.trim()) return [];
      const { data } = await supabase.rpc("search_users", {
        query: query.trim(),
      });
      return ((data ?? []) as Profile[]).filter((p) => p.npub !== myNpub);
    },
    [myNpub],
  );

  return {
    contacts,
    requests,
    outgoing,
    reload: load,
    sendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
    blockUser,
    searchUsers,
  };
}
