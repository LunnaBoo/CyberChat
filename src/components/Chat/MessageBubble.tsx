import { useApp } from "@/stores/appStore";
import { displayName } from "@/lib/nostr";
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

  if (message.is_nudge) {
    return (
      <div className="bloom px-2 py-0.5 text-center text-accent">
        * {self ? "you" : name} sent a NUDGE *
      </div>
    );
  }

  return (
    <div className={`px-2 ${self ? "text-right" : "text-left"}`}>
      <div className="inline-block max-w-[85%] text-left align-top">
        {!grouped && (
          <span className="mr-1 text-xs text-muted-foreground">[{time}]</span>
        )}
        {!grouped && (
          <button
            onClick={() =>
              !self && openModal({ kind: "profile", npub: message.sender_npub })
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
  );
}
