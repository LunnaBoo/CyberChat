import { useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/stores/appStore";
import { authStore, useAuth } from "@/stores/authStore";
import { Sidebar } from "./Sidebar/Sidebar";
import { ChatArea } from "./Chat/ChatArea";
import { NewConversation } from "./Modals/NewConversation";
import { Settings } from "./Modals/Settings";
import { UserProfile } from "./Modals/UserProfile";
import { CommandPalette } from "./Modals/CommandPalette";

export function MainLayout() {
  const {
    modal,
    openModal,
    closeModal,
    sidebarOpen,
    toggleSidebar,
    cycleTab,
    activeTab,
    closeTab,
  } = useApp();
  const { identity } = useAuth();

  const lock = useCallback(async () => {
    if (identity) {
      await supabase
        .from("profiles")
        .update({ status: "offline" })
        .eq("npub", identity.npub);
    }
    authStore.lock();
  }, [identity]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal();
        return;
      }
      if (!e.ctrlKey && !e.metaKey) return;
      const key = e.key.toLowerCase();
      if (key === "k") {
        e.preventDefault();
        openModal({ kind: "palette" });
      } else if (key === "n") {
        e.preventDefault();
        openModal({ kind: "new-conversation" });
      } else if (key === "w") {
        e.preventDefault();
        if (activeTab) closeTab(activeTab);
      } else if (key === "d") {
        e.preventDefault();
        toggleSidebar();
      } else if (key === ",") {
        e.preventDefault();
        openModal({ kind: "settings" });
      } else if (key === "l") {
        e.preventDefault();
        void lock();
      } else if (e.key === "Tab") {
        e.preventDefault();
        cycleTab(e.shiftKey ? -1 : 1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openModal, closeModal, toggleSidebar, cycleTab, activeTab, closeTab, lock]);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-border bg-panel px-2 py-0.5">
        <span className="text-foreground">●</span>
        <span>CyberChat v0.1.0</span>
        <div className="ml-auto flex gap-2 text-muted-foreground">
          <button
            onClick={() => void lock()}
            className="hover:bg-foreground hover:text-background"
          >
            [Lock]
          </button>
          <button
            onClick={() => openModal({ kind: "settings" })}
            className="hover:bg-foreground hover:text-background"
          >
            [Settings]
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {sidebarOpen && (
          <aside className="w-64 shrink-0 md:w-72">
            <Sidebar />
          </aside>
        )}
        <main className="min-w-0 flex-1">
          <ChatArea />
        </main>
      </div>

      <footer className="border-t border-border px-2 text-xs text-dim">
        CTRL+K commands · CTRL+N new · CTRL+W close tab · CTRL+D sidebar ·
        CTRL+L lock
      </footer>

      {modal.kind === "new-conversation" && <NewConversation />}
      {modal.kind === "settings" && <Settings />}
      {modal.kind === "profile" && <UserProfile npub={modal.npub} />}
      {modal.kind === "palette" && <CommandPalette onLock={() => void lock()} />}
    </div>
  );
}
