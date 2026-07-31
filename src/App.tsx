import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TerminalContainer } from "@/components/TerminalContainer";
import { BootScreen } from "@/components/BootScreen";
import { AuthScreen } from "@/components/AuthScreen";
import { MainLayout } from "@/components/MainLayout";
import { AppProvider } from "@/stores/appStore";
import { authStore, useAuth } from "@/stores/authStore";
import type { Profile } from "@/lib/types";

export function App() {
  const [booted, setBooted] = useState(false);
  const { identity, profile, hydrated } = useAuth();

  useEffect(() => {
    authStore.hydrate();
  }, []);

  useEffect(() => {
    if (!identity || profile) return;
    let cancelled = false;
    void supabase
      .from("profiles")
      .select("*")
      .eq("npub", identity.npub)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) {
          authStore.setProfile(data as Profile);
          void supabase
            .from("profiles")
            .update({ status: "online", last_seen: new Date().toISOString() })
            .eq("npub", identity.npub);
        } else {
          authStore.lock();
        }
      });
    return () => {
      cancelled = true;
    };
  }, [identity, profile]);

  return (
    <TerminalContainer>
      {!booted ? (
        <BootScreen onDone={() => setBooted(true)} />
      ) : !hydrated ? (
        <div className="p-3 text-dim">restoring session…</div>
      ) : !identity ? (
        <AuthScreen />
      ) : (
        <AppProvider>
          {profile ? (
            <MainLayout />
          ) : (
            <div className="p-3 text-dim">
              loading profile<span className="cursor-blink">_</span>
            </div>
          )}
        </AppProvider>
      )}
    </TerminalContainer>
  );
}
