import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/stores/appStore";
import { useAuth } from "@/stores/authStore";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { ConversationTabs } from "./ConversationTabs";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { TypingIndicator } from "./TypingIndicator";

export function ChatArea() {
  const { activeTab, conversations, openModal } = useApp();
  const { identity } = useAuth();
  const myNpub = identity?.npub ?? null;
  const { messages } = useRealtimeMessages(activeTab);
  const { typingNpubs, ping, stop } = useTypingIndicator(activeTab, myNpub);
  const [shake, setShake] = useState(false);
  const lastNudge = useRef<string | null>(null);

  const conv = conversations.find((c) => c.conversation.id === activeTab);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || !last.is_nudge || last.id === lastNudge.current) return;
    lastNudge.current = last.id;
    setShake(true);
    const t = window.setTimeout(() => setShake(false), 650);
    return () => window.clearTimeout(t);
  }, [messages]);

  async function send(content: string, isNudge = false) {
    if (!activeTab || !myNpub) return;
    stop();
    await supabase.from("messages").insert({
      conversation_id: activeTab,
      sender_npub: myNpub,
      content,
      is_nudge: isNudge,
    });
  }

  if (!activeTab || !myNpub) {
    return (
      <div className="flex h-full flex-col">
        <ConversationTabs />
        <div className="flex flex-1 flex-col items-center justify-center text-dim">
          <pre className="text-xs leading-tight">{`   ╔══════════════════════════╗
   ║  NO ACTIVE CHANNEL       ║
   ╚══════════════════════════╝`}</pre>
          <div className="mt-2">
            pick a contact on the left, or{" "}
            <button
              onClick={() => openModal({ kind: "new-conversation" })}
              className="text-muted-foreground underline"
            >
              start a conversation
            </button>{" "}
            (CTRL+N)
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex h-full flex-col ${shake ? "nudging nudging-flash" : ""}`}
    >
      <ConversationTabs />
      <div className="flex items-center gap-1 border-b border-border px-2 py-0.5 text-xs text-muted-foreground">
        <span>
          {conv?.sigil} {conv?.title}
        </span>
        <span className="ml-auto text-dim">
          {conv?.conversation.type === "group"
            ? `${conv.participants.length} members`
            : "direct message"}
        </span>
      </div>
      <MessageList messages={messages} myNpub={myNpub} />
      <TypingIndicator npubs={typingNpubs} />
      <MessageInput
        onSend={(t) => void send(t)}
        onNudge={() => void send("NUDGE", true)}
        onTyping={ping}
      />
    </div>
  );
}
