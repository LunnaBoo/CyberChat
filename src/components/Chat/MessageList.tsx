import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { useApp } from "@/stores/appStore";
import type { Message } from "@/lib/types";

const GROUP_WINDOW_MS = 2 * 60 * 1000;

export function MessageList({
  messages,
  myNpub,
}: {
  messages: Message[];
  myNpub: string;
}) {
  const { profileFor } = useApp();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  return (
    <div className="flex-1 overflow-y-auto py-1">
      {messages.length === 0 && (
        <div className="px-2 py-1 text-dim">
          — no transmissions yet. say something. —
        </div>
      )}
      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const grouped =
          !!prev &&
          !prev.is_nudge &&
          !m.is_nudge &&
          prev.sender_npub === m.sender_npub &&
          new Date(m.created_at).getTime() -
            new Date(prev.created_at).getTime() <
            GROUP_WINDOW_MS;
        return (
          <MessageBubble
            key={m.id}
            message={m}
            sender={profileFor(m.sender_npub)}
            self={m.sender_npub === myNpub}
            grouped={grouped}
          />
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
