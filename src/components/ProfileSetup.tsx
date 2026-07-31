import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Identity } from "@/lib/nostr";
import { shortNpub } from "@/lib/nostr";
import { authStore } from "@/stores/authStore";
import { SIGILS, type Profile } from "@/lib/types";

export function ProfileSetup({
  identity,
  onCancel,
}: {
  identity: Identity;
  onCancel: () => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [sigil, setSigil] = useState(SIGILS[0]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const { data, error: err } = await supabase
      .from("profiles")
      .insert({
        npub: identity.npub,
        username: identity.npub,
        display_name: displayName.trim() || shortNpub(identity.npub),
        avatar_sigil: sigil,
        status: "online",
      })
      .select()
      .single();
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    authStore.signIn(identity);
    authStore.setProfile(data as Profile);
  }

  return (
    <div className="flex h-full items-center justify-center px-4">
      <div className="w-full max-w-lg border border-border bg-panel p-3">
        <div className="mb-2 border-b border-border pb-1">
          ┌─ NEW OPERATOR REGISTRATION ─┐
        </div>
        <div className="mb-2 text-dim">key {shortNpub(identity.npub)}</div>

        <Field label="display name">
          <input
            autoFocus
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Thomas A."
            className="w-full"
          />
        </Field>
        <div className="mb-2">
          <div className="text-muted-foreground">avatar sigil</div>
          <div className="flex flex-wrap gap-1 pt-1">
            {SIGILS.map((s) => (
              <button
                key={s}
                onClick={() => setSigil(s)}
                className={`border px-1.5 ${
                  sigil === s
                    ? "border-foreground bg-foreground text-background"
                    : "border-border"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="mb-2 text-destructive">! {error}</div>}

        <div className="flex gap-2">
          <button
            onClick={() => void submit()}
            disabled={busy}
            className="border border-border px-2 py-0.5 hover:bg-foreground hover:text-background disabled:opacity-40"
          >
            {busy ? "registering..." : "create profile"}
          </button>
          <button
            onClick={onCancel}
            className="border border-border px-2 py-0.5 hover:bg-foreground hover:text-background"
          >
            cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="border border-border bg-surface px-2 py-1">
        {children}
      </div>
    </div>
  );
}
