import { useState } from "react";
import { useApp } from "@/stores/appStore";
import { STATUS_DOT, type Profile } from "@/lib/types";

export function ContactItem({ contact }: { contact: Profile }) {
  const { startDm, openModal, contacts } = useApp();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  return (
    <>
      <button
        onClick={() => void startDm(contact.npub)}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu({ x: e.clientX, y: e.clientY });
        }}
        className="flex w-full items-center gap-1 px-2 py-0.5 text-left hover:bg-foreground hover:text-background"
      >
        <span
          className={
            contact.status === "busy" ? "text-destructive" : "text-current"
          }
        >
          {STATUS_DOT[contact.status]}
        </span>
        <span>{contact.avatar_emoji}</span>
        <span className="truncate">
          {contact.display_name ?? contact.username}
        </span>
        {contact.status_message && (
          <span className="ml-1 truncate text-xs opacity-60">
            — {contact.status_message}
          </span>
        )}
      </button>

      {menu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
          <div
            className="fixed z-50 w-40 border border-border bg-panel"
            style={{ left: menu.x, top: menu.y }}
          >
            <MenuRow
              label="open chat"
              onClick={() => {
                void startDm(contact.npub);
                setMenu(null);
              }}
            />
            <MenuRow
              label="view profile"
              onClick={() => {
                openModal({ kind: "profile", npub: contact.npub });
                setMenu(null);
              }}
            />
            <MenuRow
              label="remove friend"
              onClick={() => {
                void contacts.removeFriend(contact.npub);
                setMenu(null);
              }}
            />
            <MenuRow
              label="block"
              danger
              onClick={() => {
                void contacts.blockUser(contact.npub);
                setMenu(null);
              }}
            />
          </div>
        </>
      )}
    </>
  );
}

function MenuRow({
  label,
  onClick,
  danger,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`block w-full px-2 py-0.5 text-left hover:bg-foreground hover:text-background ${
        danger ? "text-destructive" : ""
      }`}
    >
      {label}
    </button>
  );
}
