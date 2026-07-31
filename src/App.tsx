import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TerminalContainer } from "@/components/TerminalContainer";
import { BootScreen } from "@/components/BootScreen";
import { AuthScreen } from "@/components/AuthScreen";
import { MainLayout } from "@/components/MainLayout";
import { ProfileSetup } from "@/components/ProfileSetup";
import { AppProvider } from "@/stores/appStore";
import { authStore, useAuth } from "@/stores/authStore";
import type { Profile } from "@/lib/types";

export function App() {
  const [booted, setBooted] = useState(false);
  const [profileError, setProfileError] = useState(false);
  const [profileMissing, setProfileMissing] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const { identity, profile, hydrated } = useAuth();

  useEffect(() => {
    authStore.hydrate();
  }, []);

  useEffect(() => {
    if (!identity || profile) return;
    let cancelled = false;
    setProfileError(false);
    setProfileMissing(false);
    void supabase
      .from("profiles")
      .select("*")
      .eq("npub", identity.npub)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (data) {
          authStore.setProfile(data as Profile);
          void supabase
            .from("profiles")
            .update({ status: "online", last_seen: new Date().toISOString() })
            .eq("npub", identity.npub);
        } else if (error) {
          setProfileError(true);
        } else {
          setProfileMissing(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [identity, profile, retryKey]);

  const retry = useCallback(() => setRetryKey((k) => k + 1), []);

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
          ) : profileError ? (
            <div className="p-3 text-dim">
              <div>! connection error loading your profile</div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={retry}
                  className="border border-border px-2 py-0.5 hover:bg-foreground hover:text-background"
                >
                  [retry]
                </button>
                <button
                  onClick={() => authStore.lock()}
                  className="border border-border px-2 py-0.5 hover:bg-foreground hover:text-background"
                >
                  [sign out]
                </button>
              </div>
            </div>
          ) : profileMissing ? (
            <ProfileSetup
              identity={identity}
              onCancel={() => authStore.lock()}
            />
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
