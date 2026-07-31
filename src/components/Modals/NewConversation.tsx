import { useEffect, useState } from "react";
import { useApp } from "@/stores/appStore";
import { ModalFrame } from "./ModalFrame";
import type { Profile } from "@/lib/types";

export function NewConversation() {
  const { contacts, startDm, createGroup, closeModal } = useApp();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Profile[]>([]);
  const [groupName, setGroupName] = useState("");

  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(async () => {
      const base = query.trim()
        ? await contacts.searchUsers(query)
        : contacts.contacts;
      if (!cancelled) setResults(base);
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query, contacts]);

  function toggle(p: Profile) {
    setSelected((prev) =>
      prev.some((s) => s.npub === p.npub)
        ? prev.filter((s) => s.npub !== p.npub)
        : [...prev, p],
    );
  }

  async function confirm() {
    if (selected.length === 0) return;
    if (selected.length === 1 && !groupName.trim()) {
      await startDm(selected[0].npub);
    } else {
      await createGroup(
        groupName.trim() || selected.map((s) => s.username).join("+"),
        selected.map((s) => s.npub),
      );
    }
    closeModal();
  }

  return (
    <ModalFrame title="NEW CONVERSATION" onClose={closeModal}>
      <div className="mb-2 flex items-center gap-1 border border-border bg-surface px-2 py-1">
        <span className="text-dim">🔍</span>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search users by username..."
          className="w-full"
        />
      </div>

      <div className="mb-2 max-h-56 overflow-y-auto border border-border">
        {results.length === 0 && (
          <div className="px-2 py-1 text-dim">no users found</div>
        )}
        {results.map((p) => {
          const on = selected.some((s) => s.npub === p.npub);
          return (
            <button
              key={p.npub}
              onClick={() => toggle(p)}
              className={`flex w-full items-center gap-1 px-2 py-0.5 text-left ${
                on ? "bg-foreground text-background" : "hover:bg-surface"
              }`}
            >
              <span>{on ? "[x]" : "[ ]"}</span>
              <span>{p.avatar_emoji}</span>
              <span className="truncate">{p.display_name ?? p.username}</span>
              <span className="ml-auto text-xs opacity-60">@{p.username}</span>
            </button>
          );
        })}
      </div>

      {selected.length > 1 && (
        <div className="mb-2 flex items-center gap-1 border border-border bg-surface px-2 py-1">
          <span className="text-dim">group name</span>
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="#ops-room"
            className="w-full"
          />
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => void confirm()}
          disabled={selected.length === 0}
          className="border border-border px-2 py-0.5 hover:bg-foreground hover:text-background disabled:opacity-40"
        >
          {selected.length > 1 ? "create group" : "open chat"}
        </button>
        <button
          onClick={closeModal}
          className="border border-border px-2 py-0.5 hover:bg-foreground hover:text-background"
        >
          cancel
        </button>
      </div>
    </ModalFrame>
  );
}
