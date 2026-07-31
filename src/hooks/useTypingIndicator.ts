import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const HEARTBEAT_MS = 2000;
const STALE_MS = 3000;

export function useTypingIndicator(
  conversationId: string | null,
  myNpub: string | null,
) {
  const [typingNpubs, setTypingNpubs] = useState<string[]>([]);
  const lastSent = useRef(0);

  useEffect(() => {
    if (!conversationId || !myNpub) {
      setTypingNpubs([]);
      return;
    }
    const seen = new Map<string, number>();

    const refresh = () => {
      const now = Date.now();
      const alive: string[] = [];
      seen.forEach((ts, npub) => {
        if (now - ts < STALE_MS) alive.push(npub);
        else seen.delete(npub);
      });
      setTypingNpubs(alive);
    };

    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "typing_indicators",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as {
            user_npub: string;
          } | null;
          if (!row || row.user_npub === myNpub) return;
          if (payload.eventType === "DELETE") seen.delete(row.user_npub);
          else seen.set(row.user_npub, Date.now());
          refresh();
        },
      )
      .subscribe();

    const timer = window.setInterval(refresh, 1000);

    return () => {
      window.clearInterval(timer);
      supabase.removeChannel(channel);
      void supabase
        .from("typing_indicators")
        .delete()
        .eq("conversation_id", conversationId)
        .eq("user_npub", myNpub);
    };
  }, [conversationId, myNpub]);

  const ping = useCallback(() => {
    if (!conversationId || !myNpub) return;
    const now = Date.now();
    if (now - lastSent.current < HEARTBEAT_MS) return;
    lastSent.current = now;
    void supabase.from("typing_indicators").upsert(
      {
        conversation_id: conversationId,
        user_npub: myNpub,
        started_at: new Date().toISOString(),
      },
      { onConflict: "conversation_id,user_npub" },
    );
  }, [conversationId, myNpub]);

  const stop = useCallback(() => {
    if (!conversationId || !myNpub) return;
    lastSent.current = 0;
    void supabase
      .from("typing_indicators")
      .delete()
      .eq("conversation_id", conversationId)
      .eq("user_npub", myNpub);
  }, [conversationId, myNpub]);

  return { typingNpubs, ping, stop };
}
