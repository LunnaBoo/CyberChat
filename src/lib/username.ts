import { supabase } from "@/integrations/supabase/client";

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
const USERNAME_RE = /^[a-z][a-z0-9_]*$/;

export type UsernameResult =
  { ok: true; value: string } | { ok: false; error: string };

export function validateUsername(raw: string): UsernameResult {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.length === 0) return { ok: false, error: "choose a @username" };
  if (trimmed.length < USERNAME_MIN)
    return { ok: false, error: `at least ${USERNAME_MIN} characters` };
  if (trimmed.length > USERNAME_MAX)
    return { ok: false, error: `at most ${USERNAME_MAX} characters` };
  if (!USERNAME_RE.test(trimmed))
    return {
      ok: false,
      error: "lowercase letters, digits, underscores; start with a letter",
    };
  return { ok: true, value: trimmed };
}

export function isHandle(username: string | null | undefined): boolean {
  if (!username) return false;
  return validateUsername(username).ok;
}

export function handleOf(
  p: { username?: string | null } | null | undefined,
): string | null {
  if (!p) return null;
  if (!isHandle(p.username)) return null;
  return `@${p.username}`;
}

export async function checkUsernameAvailable(
  username: string,
  excludeNpub?: string | null,
): Promise<boolean> {
  const valid = validateUsername(username);
  if (!valid.ok) return false;
  const query = supabase
    .from("profiles")
    .select("npub")
    .eq("username", valid.value);
  if (excludeNpub) query.neq("npub", excludeNpub);
  const { data } = await query.maybeSingle();
  return !data;
}
