import { useMemo, useState } from "react";
import { useApp } from "@/stores/appStore";
import { ModalFrame } from "./ModalFrame";

export function CommandPalette({ onLock }: { onLock: () => void }) {
  const {
    closeModal,
    openModal,
    toggleSidebar,
    conversations,
    openConversation,
    cycleTab,
  } = useApp();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  const commands = useMemo(
    () => [
      {
        label: "new conversation",
        hint: "CTRL+N",
        run: () => openModal({ kind: "new-conversation" }),
      },
      {
        label: "settings",
        hint: "CTRL+,",
        run: () => openModal({ kind: "settings" }),
      },
      { label: "toggle sidebar", hint: "CTRL+D", run: toggleSidebar },
      { label: "next tab", hint: "CTRL+TAB", run: () => cycleTab(1) },
      { label: "previous tab", hint: "CTRL+SHIFT+TAB", run: () => cycleTab(-1) },
      { label: "lock / sign out", hint: "CTRL+L", run: onLock },
      ...conversations.map((c) => ({
        label: `open: ${c.title}`,
        hint: c.conversation.type,
        run: () => openConversation(c.conversation.id),
      })),
    ],
    [
      openModal,
      toggleSidebar,
      cycleTab,
      onLock,
      conversations,
      openConversation,
    ],
  );

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  function run(i: number) {
    const cmd = filtered[i];
    if (!cmd) return;
    closeModal();
    cmd.run();
  }

  return (
    <ModalFrame title="COMMAND PALETTE" onClose={closeModal}>
      <div className="mb-2 flex items-center gap-1 border border-border bg-surface px-2 py-1">
        <span className="text-foreground">&gt;</span>
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((i) => Math.min(i + 1, filtered.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((i) => Math.max(i - 1, 0));
            }
            if (e.key === "Enter") run(index);
          }}
          placeholder="type a command..."
          className="w-full"
        />
      </div>
      <div className="max-h-64 overflow-y-auto">
        {filtered.map((c, i) => (
          <button
            key={c.label}
            onClick={() => run(i)}
            onMouseEnter={() => setIndex(i)}
            className={`flex w-full items-center px-2 py-0.5 text-left ${
              i === index ? "bg-foreground text-background" : ""
            }`}
          >
            <span className="truncate">{c.label}</span>
            <span className="ml-auto text-xs opacity-60">{c.hint}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="px-2 py-1 text-dim">no matching command</div>
        )}
      </div>
    </ModalFrame>
  );
}
