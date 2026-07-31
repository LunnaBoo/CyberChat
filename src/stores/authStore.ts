import { useCallback, useSyncExternalStore } from "react";
import type { Identity } from "@/lib/nostr";
import { clearIdentity, loadIdentity, saveIdentity } from "@/lib/nostr";
import type { Profile } from "@/lib/types";

interface AuthState {
  identity: Identity | null;
  profile: Profile | null;
  hydrated: boolean;
}

let state: AuthState = { identity: null, profile: null, hydrated: false };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function set(patch: Partial<AuthState>) {
  state = { ...state, ...patch };
  emit();
}

const serverSnapshot: AuthState = {
  identity: null,
  profile: null,
  hydrated: false,
};

export const authStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get: () => state,
  getServer: () => serverSnapshot,
  hydrate() {
    if (state.hydrated) return;
    set({ identity: loadIdentity(), hydrated: true });
  },
  signIn(identity: Identity) {
    saveIdentity(identity);
    set({ identity });
  },
  setProfile(profile: Profile | null) {
    set({ profile });
  },
  lock() {
    clearIdentity();
    set({ identity: null, profile: null });
  },
};

export function useAuth() {
  const snapshot = useSyncExternalStore(
    authStore.subscribe,
    authStore.get,
    authStore.getServer,
  );
  const lock = useCallback(() => authStore.lock(), []);
  return { ...snapshot, lock };
}
