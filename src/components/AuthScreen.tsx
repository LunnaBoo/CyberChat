import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  createIdentity,
  extensionNpub,
  hasExtension,
  npubFromNsec,
  type Identity,
} from "@/lib/nostr";
import { authStore } from "@/stores/authStore";
import type { Profile } from "@/lib/types";
import { ProfileSetup } from "./ProfileSetup";

const ASCII = `
 ██████╗██╗   ██╗██████╗ ███████╗██████╗  ██████╗██╗  ██╗ █████╗ ████████╗
██╔════╝╚██╗ ██╔╝██╔══██╗██╔════╝██╔══██╗██╔════╝██║  ██║██╔══██╗╚══██╔══╝
██║      ╚████╔╝ ██████╔╝█████╗  ██████╔╝██║     ███████║███████║   ██║
██║       ╚██╔╝  ██╔══██╗██╔══╝  ██╔══██╗██║     ██╔══██║██╔══██║   ██║
╚██████╗   ██║   ██████╔╝███████╗██║  ██║╚██████╗██║  ██║██║  ██║   ██║
 ╚═════╝   ╚═╝   ╚═════╝ ╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝`;

type Mode = "menu" | "import" | "created";

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("menu");
  const [nsecInput, setNsecInput] = useState("");
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<{
    nsec: string;
    npub: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [extension, setExtension] = useState(false);
  const [pending, setPending] = useState<Identity | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setExtension(hasExtension());
  }, []);

  async function proceed(identity: Identity) {
    setBusy(true);
    setError(null);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("npub", identity.npub)
      .maybeSingle();
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data) {
      authStore.signIn(identity);
      authStore.setProfile(data as Profile);
      void supabase
        .from("profiles")
        .update({ status: "online", last_seen: new Date().toISOString() })
        .eq("npub", identity.npub);
    } else {
      setPending(identity);
    }
  }

  function handleImport() {
    try {
      const npub = npubFromNsec(nsecInput);
      void proceed({ npub, nsec: nsecInput.trim(), method: "key" });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleExtension() {
    try {
      const npub = await extensionNpub();
      await proceed({ npub, nsec: null, method: "extension" });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (pending) {
    return (
      <ProfileSetup identity={pending} onCancel={() => setPending(null)} />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center overflow-auto px-4">
        <pre className="mb-6 text-[7px] leading-[1.15] text-foreground sm:text-[9px] md:text-[11px]">
          {ASCII}
        </pre>
        <div className="mb-4 text-dim">
          nostr identity terminal — no passwords, only keys
        </div>

        <div className="w-full max-w-xl border border-border bg-panel p-3">
          {mode === "menu" && (
            <div className="space-y-1">
              <MenuItem
                label="[1] Sign in with existing key"
                onClick={() => setMode("import")}
              />
              <MenuItem
                label="[2] Create new identity"
                onClick={() => {
                  setGenerated(createIdentity());
                  setMode("created");
                }}
              />
              {extension && (
                <MenuItem
                  label="[3] Sign in with extension"
                  onClick={() => void handleExtension()}
                />
              )}
              {!extension && (
                <div className="px-2 py-1 text-dim">
                  [3] Sign in with extension — no NIP-07 extension detected
                </div>
              )}
            </div>
          )}

          {mode === "import" && (
            <div className="space-y-2">
              <div className="text-muted-foreground">
                paste your nsec private key
              </div>
              <div className="flex items-center gap-2 border border-border bg-surface px-2 py-1">
                <span className="text-dim">nsec&gt;</span>
                <input
                  autoFocus
                  autoComplete="off"
                  type={reveal ? "text" : "password"}
                  value={nsecInput}
                  onChange={(e) => setNsecInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleImport()}
                  placeholder="nsec1..."
                  className="flex-1"
                />
                <button
                  onClick={() => setReveal((v) => !v)}
                  className="text-dim hover:text-foreground"
                >
                  [{reveal ? "hide" : "show"}]
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <TermButton onClick={handleImport} disabled={busy}>
                  {busy ? "verifying..." : "sign in"}
                </TermButton>
                <TermButton onClick={() => setMode("menu")}>back</TermButton>
              </div>
            </div>
          )}

          {mode === "created" && generated && (
            <div className="space-y-2">
              <div className="border border-destructive px-2 py-1 text-destructive">
                ! WARNING: this private key is shown ONCE. Back it up now. Lose
                it and your identity is gone forever.
              </div>
              <div className="text-muted-foreground">npub (public)</div>
              <div className="break-all border border-border bg-surface px-2 py-1 text-dim">
                {generated.npub}
              </div>
              <div className="text-muted-foreground">nsec (private)</div>
              <div className="break-all border border-border bg-surface px-2 py-1">
                {generated.nsec}
              </div>
              <div className="flex flex-wrap gap-2">
                <TermButton
                  onClick={() => {
                    void navigator.clipboard.writeText(generated.nsec);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied ? "copied ✓" : "copy nsec"}
                </TermButton>
                <TermButton
                  onClick={() =>
                    void proceed({
                      npub: generated.npub,
                      nsec: generated.nsec,
                      method: "key",
                    })
                  }
                  disabled={busy}
                >
                  i saved it — continue
                </TermButton>
                <TermButton onClick={() => setMode("menu")}>cancel</TermButton>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-2 text-destructive">! error: {error}</div>
          )}
        </div>

        {extension && mode === "menu" && (
          <div className="mt-2 text-dim">NIP-07 extension detected</div>
        )}
      </div>

      <div className="border-t border-border px-3 py-1 text-xs text-dim">
        CTRL+K Commands | TAB Select
      </div>
    </div>
  );
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="block w-full px-2 py-1 text-left hover:bg-foreground hover:text-background focus:bg-foreground focus:text-background"
    >
      {label}
    </button>
  );
}

export function TermButton({
  children,
  onClick,
  disabled,
  tone = "default",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`border px-2 py-0.5 disabled:opacity-40 ${
        tone === "danger"
          ? "border-destructive text-destructive hover:bg-destructive hover:text-background"
          : "border-border hover:bg-foreground hover:text-background"
      }`}
    >
      {children}
    </button>
  );
}
