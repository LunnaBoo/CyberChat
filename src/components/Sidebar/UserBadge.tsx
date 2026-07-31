import { useState } from "react";
import { useApp } from "@/stores/appStore";
import { useAuth } from "@/stores/authStore";
import { displayName } from "@/lib/nostr";
import { handleOf } from "@/lib/username";
import { Avatar } from "@/components/Avatar";
import { STATUS_DOT, type PresenceStatus } from "@/lib/types";

const STATUSES: PresenceStatus[] = ["online", "idle", "busy", "offline"];

export function UserBadge() {
  const { me, setStatus, updateProfile } = useApp();
  const { identity } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  if (!me) return null;

  return (
    <div className="border-b border-border px-2 py-1">
      <div className="flex items-center gap-1">
        <Avatar url={me.avatar_url} sigil={me.avatar_sigil} />
        <span className="truncate">{displayName(me)}</span>
        <div className="relative ml-auto">
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-muted-foreground hover:bg-foreground hover:text-background"
          >
            {STATUS_DOT[me.status]} {me.status} ▾
          </button>
          {open && (
            <div className="absolute right-0 z-30 mt-0.5 w-28 border border-border bg-panel">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    void setStatus(s);
                    setOpen(false);
                  }}
                  className="block w-full px-1.5 py-0.5 text-left hover:bg-foreground hover:text-background"
                >
                  {STATUS_DOT[s]} {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            void updateProfile({ status_message: draft });
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              void updateProfile({ status_message: draft });
              setEditing(false);
            }
            if (e.key === "Escape") setEditing(false);
          }}
          placeholder="status message..."
          className="w-full border border-border bg-surface px-1 text-xs"
        />
      ) : (
        <button
          onClick={() => {
            setDraft(me.status_message ?? "");
            setEditing(true);
          }}
          className="block w-full truncate text-left text-xs text-dim hover:text-muted-foreground"
        >
          {me.status_message || "click to set status message..."}
        </button>
      )}
      <div className="truncate text-xs text-dim">
        {handleOf(me) ? `${handleOf(me)} · ` : ""}
        {identity?.method === "extension" ? "nip-07" : "local key"} ·{" "}
        {me.npub.slice(0, 14)}…
      </div>
    </div>
  );
}
