import { useApp } from "@/stores/appStore";
import { Avatar } from "@/components/Avatar";

export function ConversationTabs() {
  const {
    tabs,
    activeTab,
    conversations,
    unread,
    openConversation,
    closeTab,
    openModal,
  } = useApp();

  return (
    <div className="flex items-stretch overflow-x-auto border-b border-border bg-panel">
      {tabs.map((id) => {
        const conv = conversations.find((c) => c.conversation.id === id);
        const active = id === activeTab;
        return (
          <div
            key={id}
            className={`flex shrink-0 items-center gap-1 border-r border-border px-2 py-0.5 ${
              active ? "bg-foreground text-background" : "text-muted-foreground"
            }`}
          >
            <button
              onClick={() => openConversation(id)}
              className="flex max-w-40 items-center gap-1 truncate"
            >
              <Avatar url={conv?.avatarUrl} sigil={conv?.sigil} />
              <span className="truncate">{conv?.title ?? "…"}</span>
            </button>
            {unread[id] ? (
              <span
                className={active ? "text-background" : "bloom text-accent"}
              >
                ({unread[id]})
              </span>
            ) : null}
            <button
              onClick={() => closeTab(id)}
              className="opacity-60 hover:opacity-100"
            >
              x
            </button>
          </div>
        );
      })}
      <button
        onClick={() => openModal({ kind: "new-conversation" })}
        className="shrink-0 px-2 py-0.5 text-dim hover:bg-foreground hover:text-background"
      >
        [+]
      </button>
    </div>
  );
}
