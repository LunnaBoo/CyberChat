import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Identity } from "@/lib/nostr";
import { shortNpub } from "@/lib/nostr";
import { authStore } from "@/stores/authStore";
import { SIGILS, type Profile } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { isHttpUrl } from "@/lib/utils";
import { checkUsernameAvailable, validateUsername } from "@/lib/username";

type UsernameStatus =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "ok"; text: string }
  | { kind: "error"; text: string };

export function ProfileSetup({
  identity,
  onCancel,
}: {
  identity: Identity;
  onCancel: () => void;
}) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [sigil, setSigil] = useState(SIGILS[0]);
  const [avatarUrl, setAvatarUrl] = useState("");
  const avatarUrlValid = avatarUrl.trim() === "" || isHttpUrl(avatarUrl);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>({
    kind: "idle",
  });
  const [availableUsername, setAvailableUsername] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const result = validateUsername(username);
    if (!result.ok) {
      setUsernameStatus(
        username.trim()
          ? { kind: "error", text: result.error ?? "invalid username" }
          : { kind: "idle" },
      );
      setAvailableUsername(null);
      return;
    }
    setUsernameStatus({ kind: "checking" });
    setAvailableUsername(null);
    let cancelled = false;
    const t = window.setTimeout(async () => {
      const available = await checkUsernameAvailable(result.value);
      if (cancelled) return;
      if (available) {
        setUsernameStatus({
          kind: "ok",
          text: `@${result.value} is available`,
        });
        setAvailableUsername(result.value);
      } else {
        setUsernameStatus({
          kind: "error",
          text: `@${result.value} is taken`,
        });
        setAvailableUsername(null);
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [username]);

  async function submit() {
    if (!availableUsername || !avatarUrlValid) return;
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("profiles")
      .insert({
        npub: identity.npub,
        username: availableUsername,
        display_name: displayName.trim() || shortNpub(identity.npub),
        avatar_sigil: sigil,
        avatar_url: avatarUrl.trim() || null,
        status: "online",
      })
      .select()
      .single();
    setBusy(false);
    if (err) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("*")
        .eq("npub", identity.npub)
        .maybeSingle();
      if (existing) {
        authStore.signIn(identity);
        authStore.setProfile(existing as Profile);
        return;
      }
      setError(err.message);
      return;
    }
    authStore.signIn(identity);
    authStore.setProfile(data as Profile);
  }

  return (
    <div className="flex h-full items-start justify-center overflow-y-auto px-4 py-4 md:items-center">
      <div className="w-full max-w-lg border border-border bg-panel p-3">
        <div className="mb-2 border-b border-border pb-1">
          ┌─ NEW OPERATOR REGISTRATION ─┐
        </div>
        <div className="mb-2 text-dim">key {shortNpub(identity.npub)}</div>

        <Field label="username (@handle)">
          <div className="flex items-center gap-1">
            <span className="text-dim">@</span>
            <input
              autoFocus
              autoComplete="off"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="neo"
              className="w-full"
            />
          </div>
        </Field>
        {usernameStatus.kind !== "idle" && (
          <div
            className={`mb-2 text-xs ${
              usernameStatus.kind === "ok" ? "text-accent" : "text-destructive"
            }`}
          >
            {usernameStatus.kind === "checking"
              ? "checking..."
              : usernameStatus.text}
          </div>
        )}

        <Field label="display name">
          <input
            autoComplete="off"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Thomas A."
            className="w-full"
          />
        </Field>
        <Field label="avatar image url (optional)">
          <div className="flex items-center gap-2">
            <input
              autoComplete="off"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…/me.png"
              className="w-full"
            />
            <Avatar
              url={avatarUrlValid ? avatarUrl.trim() : null}
              sigil={sigil}
              className="text-xl"
            />
          </div>
        </Field>
        {avatarUrl.trim() && !avatarUrlValid && (
          <div className="mb-2 text-xs text-destructive">
            must be a valid http(s) url
          </div>
        )}
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
            disabled={busy || !availableUsername || !avatarUrlValid}
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
