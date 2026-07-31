import { useEffect, useState } from "react";
import { useApp } from "@/stores/appStore";
import { useAuth } from "@/stores/authStore";
import { ModalFrame } from "./ModalFrame";
import { SIGILS } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { isHttpUrl } from "@/lib/utils";
import {
  checkUsernameAvailable,
  isHandle,
  validateUsername,
} from "@/lib/username";

type UsernameStatus =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "ok"; text: string }
  | { kind: "error"; text: string };

export function Settings() {
  const { me, updateProfile, closeModal } = useApp();
  const { identity } = useAuth();
  const [displayName, setDisplayName] = useState(me?.display_name ?? "");
  const [sigil, setSigil] = useState(me?.avatar_sigil ?? SIGILS[0]);
  const [avatarUrl, setAvatarUrl] = useState(me?.avatar_url ?? "");
  const [username, setUsername] = useState(me?.username ?? "");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>({
    kind: "idle",
  });
  const [availableUsername, setAvailableUsername] = useState<string | null>(
    null,
  );
  const [usernameSaved, setUsernameSaved] = useState(false);
  const [saved, setSaved] = useState(false);
  const [revealKey, setRevealKey] = useState(false);

  useEffect(() => {
    if (!me) return;
    if (username === me.username) {
      setUsernameStatus({ kind: "idle" });
      setAvailableUsername(null);
      return;
    }
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
      const available = await checkUsernameAvailable(result.value, me.npub);
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
  }, [username, me]);

  const canSetUsername =
    availableUsername !== null && availableUsername !== me?.username;

  const avatarUrlValid = avatarUrl.trim() === "" || isHttpUrl(avatarUrl);

  async function save() {
    await updateProfile({
      display_name: displayName.trim(),
      avatar_sigil: sigil,
      avatar_url: avatarUrlValid ? avatarUrl.trim() || null : me?.avatar_url,
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  async function setUsernameHandle() {
    if (!availableUsername) return;
    await updateProfile({ username: availableUsername });
    setUsernameSaved(true);
    window.setTimeout(() => setUsernameSaved(false), 1500);
  }

  return (
    <ModalFrame title="SETTINGS" onClose={closeModal}>
      <div className="space-y-2">
        <div>
          <div className="text-muted-foreground">username (@handle)</div>
          <div className="flex items-center gap-1 border border-border bg-surface px-2 py-1">
            <span className="text-dim">@</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
              placeholder="neo"
              className="w-full"
            />
            <button
              onClick={() => void setUsernameHandle()}
              disabled={!canSetUsername}
              className="shrink-0 border border-border px-1.5 text-xs hover:bg-foreground hover:text-background disabled:opacity-40"
            >
              {usernameSaved ? "saved ✓" : "[set]"}
            </button>
          </div>
          {usernameStatus.kind !== "idle" && (
            <div
              className={`text-xs ${
                usernameStatus.kind === "ok"
                  ? "text-accent"
                  : "text-destructive"
              }`}
            >
              {usernameStatus.kind === "checking"
                ? "checking..."
                : usernameStatus.text}
            </div>
          )}
          {me?.username && !isHandle(me.username) && (
            <div className="text-xs text-accent">
              your @username is still your npub — pick a handle to be findable
              in the directory.
            </div>
          )}
        </div>

        <Row label="display name">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full"
          />
        </Row>
        <div>
          <div className="text-muted-foreground">
            avatar image url (optional)
          </div>
          <div className="flex items-center gap-2 border border-border bg-surface px-2 py-1">
            <input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              autoComplete="off"
              placeholder="https://…/me.png"
              className="w-full"
            />
            <Avatar
              url={avatarUrlValid ? avatarUrl.trim() : me?.avatar_url}
              sigil={sigil}
              className="text-xl"
            />
          </div>
          {avatarUrl.trim() && !avatarUrlValid && (
            <div className="text-xs text-destructive">
              must be a valid http(s) url
            </div>
          )}
          {!avatarUrl.trim() && me?.avatar_url && (
            <div className="text-xs text-dim">
              empty = back to your sigil icon
            </div>
          )}
        </div>
        <div>
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

        {identity?.nsec && (
          <div>
            <div className="text-muted-foreground">private key</div>
            <div className="flex items-center gap-1 border border-border bg-surface px-2 py-1">
              <span className="flex-1 break-all text-xs">
                {revealKey ? identity.nsec : "•".repeat(48)}
              </span>
              <button
                onClick={() => setRevealKey((v) => !v)}
                className="text-dim hover:text-foreground"
              >
                [{revealKey ? "hide" : "show"}]
              </button>
              <button
                onClick={() =>
                  void navigator.clipboard.writeText(identity.nsec ?? "")
                }
                className="text-dim hover:text-foreground"
              >
                [copy]
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => void save()}
            className="border border-border px-2 py-0.5 hover:bg-foreground hover:text-background"
          >
            {saved ? "saved ✓" : "save"}
          </button>
          <button
            onClick={closeModal}
            className="border border-border px-2 py-0.5 hover:bg-foreground hover:text-background"
          >
            close
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="border border-border bg-surface px-2 py-1">
        {children}
      </div>
    </div>
  );
}
