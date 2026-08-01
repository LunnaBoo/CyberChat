import { useEffect, useRef, useState } from "react";

export function MessageInput({
  onSend,
  onNudge,
  onTyping,
  disabled,
}: {
  onSend: (text: string) => void;
  onNudge: () => void;
  onTyping: () => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [value]);

  function submit() {
    const text = value.trim();
    if (!text) return;
    if (text === "/nudge") {
      onNudge();
    } else {
      onSend(text);
    }
    setValue("");
  }

  return (
    <div className="flex items-start gap-1 border-t border-border bg-panel px-2 pb-[max(env(safe-area-inset-bottom),4px)] pt-1">
      <span className="pt-0.5 text-foreground">&gt;</span>
      <textarea
        ref={ref}
        rows={1}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          setValue(e.target.value);
          onTyping();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="type a message — /nudge to buzz"
        className="max-h-[140px] flex-1 resize-none overflow-y-auto leading-normal"
      />
      <button
        onClick={onNudge}
        title="send nudge"
        className="bloom border border-border px-1 text-accent hover:bg-accent hover:text-background"
      >
        [nudge]
      </button>
      <button
        onClick={submit}
        className="border border-border px-1 hover:bg-foreground hover:text-background"
      >
        send
      </button>
    </div>
  );
}
