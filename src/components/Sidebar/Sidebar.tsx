import { useState } from "react";
import { useApp } from "@/stores/appStore";
import { UserBadge } from "./UserBadge";
import { SearchBar } from "./SearchBar";
import { ContactList } from "./ContactList";
import { FriendRequests } from "./FriendRequests";

export function Sidebar() {
  const [filter, setFilter] = useState("");
  const { conversations, openConversation, unread, openModal, activeTab } =
    useApp();
  const groups = conversations.filter((c) => c.conversation.type === "group");

  return (
    <div className="flex h-full flex-col border-r border-border bg-panel">
      <UserBadge />
      <SearchBar value={filter} onChange={setFilter} />
      <ContactList filter={filter} />
      <FriendRequests />

      <div className="border-t border-border">
        <div className="flex items-center bg-surface px-2 text-xs text-dim">
          <span>── GROUPS ──</span>
          <button
            onClick={() => openModal({ kind: "new-conversation" })}
            className="ml-auto hover:text-foreground"
          >
            [+]
          </button>
        </div>
        {groups.length === 0 && (
          <div className="px-2 py-0.5 text-xs text-dim">no groups</div>
        )}
        {groups.map((g) => (
          <button
            key={g.conversation.id}
            onClick={() => openConversation(g.conversation.id)}
            className={`flex w-full items-center gap-1 px-2 py-0.5 text-left ${
              activeTab === g.conversation.id
                ? "bg-foreground text-background"
                : "hover:bg-foreground hover:text-background"
            }`}
          >
            <span>▤</span>
            <span className="truncate">{g.title}</span>
            {unread[g.conversation.id] ? (
              <span className="ml-auto text-xs text-accent">
                ({unread[g.conversation.id]})
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
