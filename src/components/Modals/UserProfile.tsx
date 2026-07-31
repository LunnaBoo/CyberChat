import { useApp } from "@/stores/appStore";
import { ModalFrame } from "./ModalFrame";
import { STATUS_DOT } from "@/lib/types";

export function UserProfile({ npub }: { npub: string }) {
  const { profileFor, closeModal, startDm, contacts } = useApp();
  const profile = profileFor(npub);

  return (
    <ModalFrame title="OPERATOR PROFILE" onClose={closeModal}>
      {!profile ? (
        <div className="text-dim">profile unavailable</div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{profile.avatar_emoji}</span>
            <div>
              <div>{profile.display_name ?? profile.username}</div>
              <div className="text-xs text-muted-foreground">
                @{profile.username} · {STATUS_DOT[profile.status]}{" "}
                {profile.status}
              </div>
            </div>
          </div>
          <div className="text-muted-foreground">
            {profile.status_message || "— no status —"}
          </div>
          <div className="break-all border border-border bg-surface px-2 py-1 text-xs text-dim">
            {profile.npub}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                void startDm(profile.npub);
                closeModal();
              }}
              className="border border-border px-2 py-0.5 hover:bg-foreground hover:text-background"
            >
              send message
            </button>
            <button
              onClick={() => {
                void contacts.sendRequest(profile.npub);
              }}
              className="border border-border px-2 py-0.5 hover:bg-foreground hover:text-background"
            >
              add friend
            </button>
            <button
              onClick={() => {
                void contacts.removeFriend(profile.npub);
                closeModal();
              }}
              className="border border-border px-2 py-0.5 hover:bg-foreground hover:text-background"
            >
              remove friend
            </button>
            <button
              onClick={() => {
                void contacts.blockUser(profile.npub);
                closeModal();
              }}
              className="border border-destructive px-2 py-0.5 text-destructive hover:bg-destructive hover:text-background"
            >
              block
            </button>
          </div>
        </div>
      )}
    </ModalFrame>
  );
}
