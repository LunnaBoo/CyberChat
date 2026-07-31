import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const TRINITY =
  "npub107whj74v3egyew339f0ppzlstzacvy7u979s25rcfydmxzsflpqqkatgzu";

const REPLIES = [
  "copy that",
  "i see you",
  "good, keep talking",
  "the system is watching us",
  "interesting...",
  "we need to talk in private",
  "morpheus would want to hear this",
];

let lastReplyAt = 0;

function envFromDotEnv() {
  const raw = readFileSync(".env", "utf8");
  const vars = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/);
    if (m) vars[m[1]] = m[2].trim();
  }
  return vars;
}

const env = envFromDotEnv();
const supabase = createClient("http://localhost:54321", env.VITE_SUPABASE_PUBLISHABLE_KEY);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function pickReply() {
  return REPLIES[Math.floor(Math.random() * REPLIES.length)];
}

async function replyTo(convId, incoming) {
  const { data: parts } = await supabase
    .from("conversation_participants")
    .select("user_npub")
    .eq("conversation_id", convId);
  const npubs = (parts ?? []).map((p) => p.user_npub);

  if (npubs.length !== 2) return;
  if (!npubs.includes(TRINITY)) return;
  const other = npubs.find((n) => n !== TRINITY);
  if (!other) return;

  const now = Date.now();
  if (now - lastReplyAt < 1500) return;
  lastReplyAt = now;

  await supabase.from("typing_indicators").upsert(
    {
      conversation_id: convId,
      user_npub: TRINITY,
      started_at: new Date().toISOString(),
    },
    { onConflict: "conversation_id,user_npub" },
  );
  await sleep(1200 + Math.random() * 1300);

  if (incoming.is_nudge) {
    await supabase.from("messages").insert({
      conversation_id: convId,
      sender_npub: TRINITY,
      content: "NUDGE",
      is_nudge: true,
    });
  } else {
    await supabase.from("messages").insert({
      conversation_id: convId,
      sender_npub: TRINITY,
      content: pickReply(),
      is_nudge: false,
    });
  }

  await supabase
    .from("typing_indicators")
    .delete()
    .eq("conversation_id", convId)
    .eq("user_npub", TRINITY);

  console.log(
    `[trinity-bot] replied to ${other.slice(0, 10)}… in ${convId}`,
  );
}

const channel = supabase
  .channel("trinity-bot")
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "messages" },
    (payload) => {
      const row = payload.new;
      if (row.sender_npub === TRINITY) return;
      void replyTo(row.conversation_id, row);
    },
  )
  .subscribe((status) => console.log("[trinity-bot] messages:", status));

supabase
  .channel("trinity-bot-friends")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "friends" },
    (payload) => {
      const row = payload.new ?? payload.old;
      if (!row || row.friend_npub !== TRINITY || row.status !== "pending") return;
      void supabase
        .from("friends")
        .update({ status: "accepted" })
        .eq("id", row.id)
        .then(() =>
          console.log(
            `[trinity-bot] accepted friend request from ${row.user_npub.slice(0, 10)}…`,
          ),
        );
    },
  )
  .subscribe((status) => console.log("[trinity-bot] friends:", status));

console.log("[trinity-bot] listening for DMs...");
