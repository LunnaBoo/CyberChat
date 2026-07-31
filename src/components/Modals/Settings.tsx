import { useState } from "react";
import { useApp } from "@/stores/appStore";
import { useAuth } from "@/stores/authStore";
import { ModalFrame } from "./ModalFrame";

const EMOJI = ["👤", "🐧", "👾", "🤖", "💀", "🦊", "🐙", "🌵", "🛰", "🧿", "🕶", "🔮"];

export function Settings() {
  const { me, updateProfile, closeModal } = useApp();
  const { identity } = useAuth();
  const [username, setUsername] = useState(me?.username ?? "");
  const [displayName, setDisplayName] = useState(me?.display_name ?? "");
  const [emoji, setEmoji] = useState(me?.avatar_emoji ?? "👤");
  const [saved, setSaved] = useState(false);
  const [revealKey, setRevealKey] = useState(false);

  async function save() {
    await updateProfile({
      username: username.trim().toLowerCase().replace(/\s+/g, "_"),
      display_name: displayName.trim(),
      avatar_emoji: emoji,
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  return (
    <ModalFrame title="SETTINGS" onClose={closeModal}>
      <div className="space-y-2">
        <Row label="username">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full"
          />
        </Row>
        <Row label="display name">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full"
          />
        </Row>
        <div>
          <div className="text-muted-foreground">avatar</div>
          <div className="flex flex-wrap gap-1 pt-1">
            {EMOJI.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={`border px-1.5 ${
                  emoji === e
                    ? "border-foreground bg-foreground text-background"
                    : "border-border"
                }`}
              >
                {e}
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
