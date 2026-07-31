import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";

export interface Identity {
  npub: string;
  nsec: string | null; // null when using a NIP-07 extension
  method: "key" | "extension";
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Generate a brand new Nostr identity. */
export function createIdentity(): { nsec: string; npub: string } {
  const sk = generateSecretKey();
  const pk = getPublicKey(sk);
  return { nsec: nip19.nsecEncode(sk), npub: nip19.npubEncode(pk) };
}

/** Validate an nsec and derive its npub. Throws on invalid input. */
export function npubFromNsec(nsec: string): string {
  const trimmed = nsec.trim();
  if (!trimmed.startsWith("nsec1")) {
    throw new Error("key must start with nsec1");
  }
  const decoded = nip19.decode(trimmed);
  if (decoded.type !== "nsec") throw new Error("not a private key");
  return nip19.npubEncode(getPublicKey(decoded.data as Uint8Array));
}

export function isValidNsec(nsec: string): boolean {
  try {
    npubFromNsec(nsec);
    return true;
  } catch {
    return false;
  }
}

export function shortNpub(npub: string): string {
  if (npub.length <= 16) return npub;
  return `${npub.slice(0, 10)}…${npub.slice(-6)}`;
}

export interface Nameable {
  npub?: string | null;
  user_npub?: string | null;
  display_name?: string | null;
}

export function displayName(p: Nameable | null | undefined): string {
  if (!p) return "unknown";
  const key = p.npub ?? p.user_npub;
  if (!key) return "unknown";
  return p.display_name ?? shortNpub(key);
}

/* ---------------- NIP-07 ---------------- */

interface Nip07 {
  getPublicKey(): Promise<string>;
}

export function hasExtension(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as unknown as { nostr?: Nip07 }).nostr?.getPublicKey ===
      "function"
  );
}

export async function extensionNpub(): Promise<string> {
  const nostr = (window as unknown as { nostr?: Nip07 }).nostr;
  if (!nostr) throw new Error("no NIP-07 extension detected");
  const hex = await nostr.getPublicKey();
  return nip19.npubEncode(hex);
}

/* -------- local storage (obfuscated at rest) -------- */

const DEVICE_KEY = "cyberchat.dk";
const VAULT_KEY = "cyberchat.vault";

function deviceKey(): Uint8Array {
  let stored = localStorage.getItem(DEVICE_KEY);
  if (!stored) {
    const rand = crypto.getRandomValues(new Uint8Array(32));
    stored = toHex(rand);
    localStorage.setItem(DEVICE_KEY, stored);
  }
  return fromHex(stored);
}

function xorCipher(data: Uint8Array, key: Uint8Array): Uint8Array {
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i] ^ key[i % key.length];
  return out;
}

function encrypt(plain: string): string {
  const bytes = new TextEncoder().encode(plain);
  return btoa(String.fromCharCode(...xorCipher(bytes, deviceKey())));
}

function decrypt(cipher: string): string {
  const bytes = Uint8Array.from(atob(cipher), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(xorCipher(bytes, deviceKey()));
}

export function saveIdentity(identity: Identity) {
  const payload = {
    npub: identity.npub,
    method: identity.method,
    nsec: identity.nsec ? encrypt(identity.nsec) : null,
  };
  localStorage.setItem(VAULT_KEY, JSON.stringify(payload));
}

export function loadIdentity(): Identity | null {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw) as {
      npub: string;
      method: "key" | "extension";
      nsec: string | null;
    };
    return {
      npub: payload.npub,
      method: payload.method,
      nsec: payload.nsec ? decrypt(payload.nsec) : null,
    };
  } catch {
    return null;
  }
}

export function clearIdentity() {
  localStorage.removeItem(VAULT_KEY);
}
