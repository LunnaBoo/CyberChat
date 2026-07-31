import { useState } from "react";
import { useApp } from "@/stores/appStore";
import { useAuth } from "@/stores/authStore";
import { ModalFrame } from "./ModalFrame";
import { SIGILS } from "@/lib/types";

export function Settings() {
  const { me, updateProfile, closeModal } = useApp();
  const { identity } = useAuth();
  const [displayName, setDisplayName] = useState(me?.display_name ?? "");
  const [sigil, setSigil] = useState(me?.avatar_sigil ?? SIGILS[0]);
  const [saved, setSaved] = useState(false);
  const [revealKey, setRevealKey] = useState(false);

  async function save() {
    await updateProfile({
      display_name: displayName.trim(),
      avatar_sigil: sigil,
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  return (
    <ModalFrame title="SETTINGS" onClose={closeModal}>
      <div className="space-y-2">
        <Row label="display name">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full"
          />
        </Row>
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
