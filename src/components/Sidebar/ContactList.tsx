import { useEffect, useState } from "react";
import { useApp } from "@/stores/appStore";
import { ContactItem } from "./ContactItem";
import { STATUS_LABEL, type PresenceStatus, type Profile } from "@/lib/types";

const ORDER: PresenceStatus[] = ["online", "idle", "busy", "offline"];

export function ContactList({ filter }: { filter: string }) {
  const { contacts, startDm } = useApp();
  const [found, setFound] = useState<Profile[]>([]);

  const query = filter.trim().toLowerCase();
  const list = contacts.contacts.filter(
    (c) =>
      !query ||
      c.username.toLowerCase().includes(query) ||
      (c.display_name ?? "").toLowerCase().includes(query),
  );

  useEffect(() => {
    if (query.length < 2) {
      setFound([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(async () => {
      const res = await contacts.searchUsers(query);
      if (!cancelled) setFound(res);
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query, contacts]);

  const knownNpubs = new Set(contacts.contacts.map((c) => c.npub));
  const strangers = found.filter((p) => !knownNpubs.has(p.npub));

  return (
    <div className="flex-1 overflow-y-auto">
      {ORDER.map((status) => {
        const group = list.filter((c) => c.status === status);
        if (group.length === 0) return null;
        return (
          <div key={status}>
            <div className="bg-surface px-2 text-xs text-dim">
              ── {STATUS_LABEL[status]} ({group.length}) ──
            </div>
            {group.map((c) => (
              <ContactItem key={c.npub} contact={c} />
            ))}
          </div>
        );
      })}

      {list.length === 0 && !query && (
        <div className="px-2 py-1 text-xs text-dim">
          no contacts yet. search a username above to add someone.
        </div>
      )}

      {strangers.length > 0 && (
        <div>
          <div className="bg-surface px-2 text-xs text-dim">
            ── DIRECTORY ──
          </div>
          {strangers.map((p) => (
            <div key={p.npub} className="flex items-center gap-1 px-2 py-0.5">
              <span>{p.avatar_emoji}</span>
              <span className="truncate">{p.display_name ?? p.username}</span>
              <div className="ml-auto flex gap-1">
                <button
                  onClick={() => void contacts.sendRequest(p.npub)}
                  className="text-xs text-accent hover:underline"
                >
                  {contacts.outgoing.includes(p.npub) ? "sent" : "+add"}
                </button>
                <button
                  onClick={() => void startDm(p.npub)}
                  className="text-xs text-dim hover:text-foreground"
                >
                  msg
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
