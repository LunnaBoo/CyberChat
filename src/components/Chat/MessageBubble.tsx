import { useApp } from "@/stores/appStore";
import { displayName } from "@/lib/nostr";
import { Avatar } from "@/components/Avatar";
import type { Message, Profile } from "@/lib/types";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function MessageBubble({
  message,
  sender,
  self,
  grouped,
}: {
  message: Message;
  sender: Profile | undefined;
  self: boolean;
  grouped: boolean;
}) {
  const { openModal } = useApp();
  const d = new Date(message.created_at);
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const name = displayName(sender);
  const hasAvatar = Boolean(sender?.avatar_url);

  if (message.is_nudge) {
    return (
      <div className="px-2 py-0.5 text-center text-accent">
        * {self ? "you" : name} sent a NUDGE *
      </div>
    );
  }

  return (
    <div className={`flex px-2 ${self ? "justify-end" : ""}`}>
      {!self && !grouped && hasAvatar && (
        <div className="mr-1 w-[1.6em] shrink-0 pt-0.5">
          <Avatar url={sender.avatar_url} sigil={sender.avatar_sigil} />
        </div>
      )}
      <div className="min-w-0 max-w-[75%] md:max-w-[85%]">
        <div className="inline-block text-left">
          {!grouped && (
            <span className="mr-1 text-xs text-muted-foreground">[{time}]</span>
          )}
          {!grouped && (
            <button
              onClick={() =>
                !self &&
                openModal({ kind: "profile", npub: message.sender_npub })
              }
              className={`mr-1 ${self ? "text-dim" : "text-muted-foreground hover:underline"}`}
            >
              {self ? "you" : name}:
            </button>
          )}
          <span className="whitespace-pre-wrap break-words">
            {message.content}
          </span>
          {message.edited_at && (
            <span className="ml-1 text-xs text-dim">(edited)</span>
          )}
        </div>
      </div>
      {self && !grouped && hasAvatar && (
        <div className="ml-1 w-[1.6em] shrink-0 pt-0.5">
          <Avatar url={sender.avatar_url} sigil={sender.avatar_sigil} />
        </div>
      )}
    </div>
  );
}
