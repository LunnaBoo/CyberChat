import { useState } from "react";
import { useApp } from "@/stores/appStore";
import { displayName } from "@/lib/nostr";

export function FriendRequests() {
  const { contacts } = useApp();
  const [open, setOpen] = useState(false);
  const count = contacts.requests.length;

  if (count === 0) return null;

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1 px-2 py-0.5 text-left text-accent hover:bg-accent hover:text-background"
      >
        <span>{open ? "▾" : "▸"} friend requests</span>
        <span className="ml-auto border border-accent px-1 text-xs">
          {count}
        </span>
      </button>
      {open &&
        contacts.requests.map((r) => (
          <div key={r.id} className="px-2 py-0.5">
            <div className="flex items-center gap-1">
              <span>{r.avatar_sigil}</span>
              <span className="truncate">{displayName(r)}</span>
            </div>
            <div className="flex gap-2 text-xs">
              <button
                onClick={() => void contacts.acceptRequest(r.id, r.user_npub)}
                className="text-muted-foreground hover:underline"
              >
                [accept]
              </button>
              <button
                onClick={() => void contacts.declineRequest(r.id)}
                className="text-destructive hover:underline"
              >
                [decline]
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}
