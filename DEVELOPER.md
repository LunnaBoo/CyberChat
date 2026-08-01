# DEVELOPER.md — Working on CyberChat by yourself

Everything you need to run, test, change, and deploy CyberChat. This is your
personal guide; the repo also has `README.md` (user-facing quick start) and
`AGENTS.md` (agent reference) with the same rules.

---

## 1. What this is

A web chat app styled as a terminal emulator (matrix green, monospace, text
sigil avatars). Identity comes from Nostr keypairs (nsec/npub, NIP-07
supported). All data and real-time messaging live in a **local Supabase**
instance (Postgres + Realtime). There is no backend code of our own — the
browser talks to Supabase directly.

Stack: React 19 + Vite + TypeScript, TanStack Start in **SPA mode** (no SSR),
Tailwind CSS v4, supabase-js, nostr-tools. Package manager is **Bun**.

---

## 2. Prerequisites

- [Bun](https://bun.sh)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (logged in)
- [Docker](https://www.docker.com) (only for the container build)
- Optional: [ngrok](https://ngrok.com) to share the app on the internet
- `git` — remote is `git@github.com:LunnaBoo/CyberChat.git`, branch `main`

---

## 3. First-time setup

```sh
bun install
supabase start          # Postgres + Realtime on :54321
supabase db reset       # applies all migrations + seeds
cp .env.example .env
```

Then fill `.env` with values from `supabase status`:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-or-publishable-key>
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Notes:

- **Leave `VITE_SUPABASE_URL` empty** (or set it to `auto`). That is the
  default and the whole point — see section 5.
- The Supabase client accepts either anon or publishable key and prefers the
  publishable key. Use whatever `supabase status` prints.

---

## 4. Daily workflow

```sh
supabase start      # if not already running
bun run dev         # Vite dev server on http://localhost:8080
```

Open http://localhost:8080. HMR applies most changes live; hard-refresh
(Ctrl+Shift+R) for favicon/cache issues.

Useful commands:

| Command | What it does |
| --- | --- |
| `bun run dev` | Dev server on **:8080** (not 5173) |
| `bun run build` | Production build into `dist/` |
| `bun run preview` | Serve the production build |
| `bun run lint` | ESLint (see noise warning in section 9) |
| `bun run format` | Prettier — writes to disk, use only on changed files |
| `bun scripts/trinity-bot.mjs` | Test bot (auto-replies, auto-accepts friend requests) |
| `supabase status` | Local URLs + keys |
| `supabase db push --local` | Apply new migrations to the **local** DB |
| `supabase db reset` | Rebuild local DB from migrations + seeds (wipes data) |
| `supabase gen types typescript --local > src/integrations/supabase/types.ts` | Regenerate typed DB client after schema changes |

---

## 5. The same-origin proxy (read this before anything breaks)

The browser must never call Supabase cross-origin. Why it matters:

- If you share the app over ngrok and the app fetches Supabase from an
  ngrok'd URL with a browser User-Agent, ngrok's **free tier shows a warning
  interstitial page (`ERR_NGROK_6024`)** instead of the JSON. That silently
  breaks sign-in, message history, and everything else. curl/Node tests pass
  (no browser UA), which makes this easy to misdiagnose.
- Cross-origin calls also add CORS preflight overhead.

The fix, already built: with `VITE_SUPABASE_URL` empty, the app talks to
Supabase through **its own origin**:

- **Dev**: `vite.config.ts` proxies `/rest`, `/realtime`, `/auth`, `/storage`
  → `http://127.0.0.1:54321` (realtime is websocket-proxied).
- **Docker**: nginx proxies the same paths to `SUPABASE_PROXY_PASS`, baked in
  at build time via `envsubst`.

Avatar profile pictures go through the proxy too, as `/img/<percent-encoded
url>` with the scheme kept literal (Vite middleware in dev, an nginx regex
`location` in Docker) so the browser can read pixels for dithering even when
the upstream sends no CORS headers. Only `http(s)` targets are accepted.

So the only URL the browser ever hits is the app's own origin. If you want to
talk to a hosted Supabase instead, set `VITE_SUPABASE_URL` explicitly.

**Gotcha**: ngrok gives each tunnel a different origin, and `localStorage` is
per-origin. Signing in on one ngrok URL will not keep your session on another
ngrok URL. Use one stable URL while testing.

---

## 6. Sharing the app (ngrok)

One tunnel, for the app:

```sh
ngrok http 8080    # the APP — this is the URL you share and open in a browser
```

ngrok free URLs rotate every time the process restarts. Current app URL (as of
the last run): `https://7bf2-177-125-125-223.ngrok-free.app` — check with
`curl http://127.0.0.1:4040/api/tunnels` (port 4040 is the app tunnel's agent
API).

Do NOT also run an `ngrok http 54321` tunnel for Supabase at the same time: two
free-tier agents on one host conflict (`ERR_NGROK_8012`) and can take the app
tunnel down. The app reaches Supabase through its own origin (section 5), so a
Supabase tunnel is never needed.

---

## 7. Test identities and the trinity bot

`supabase/seed.sql` creates 4 test profiles. Their nsec/npub pairs are listed
at the top of that file — import the nsec in the app to sign in:

- `neo` (online) — good default account
- `trinity` — the bot account
- `morpheus`
- `cipher` — has a **pending** friend request to neo, useful for testing the
  incoming-request flow

The seed also creates friendships, one group chat ("the crew"), and a pending
friend request.

**Trinity bot** (`scripts/trinity-bot.mjs`):

- Reads keys from `.env`, talks straight to local Supabase on :54321.
- Auto-replies to DMs after a typing indicator, echoes nudges, and
  **auto-accepts incoming friend requests**.
- Run it with `bun scripts/trinity-bot.mjs`. While it's running, sign in as
  neo and message trinity, or send her a friend request — both flows are
  testable end-to-end without a second human.

Note: `supabase db reset` wipes manually created test users/conversations and
re-applies the seed. Keep any test accounts you need in the seed file.

---

## 8. Project layout and how it works

```
src/
├── App.tsx                  # boot -> auth -> main flow (owns the [retry] screen)
├── components/
│   ├── BootScreen, AuthScreen, MainLayout, ProfileSetup, TerminalContainer, Avatar
│   ├── Sidebar/             # UserBadge, SearchBar, ContactList, ContactItem, FriendRequests
│   ├── Chat/                # ChatArea, ConversationTabs, MessageList, MessageBubble, MessageInput, TypingIndicator
│   ├── Modals/              # NewConversation, Settings, UserProfile, CommandPalette, ModalFrame
│   └── ui/                  # shadcn/ui boilerplate — unused, do NOT add more
├── hooks/                   # useContacts, useRealtimeMessages, useTypingIndicator
├── lib/                     # nostr.ts (keygen/encode), types.ts, utils.ts
├── routes/                  # TanStack Router: __root.tsx (head/shell), index.tsx (mounts App)
├── stores/                  # authStore.ts (identity/profile), appStore.tsx (conversations/tabs/modals)
├── integrations/supabase/   # client.ts, types.ts (regenerated)
└── scripts/                 # trinity-bot.mjs
```

Flow:

- **Auth** — `AuthScreen` offers import-nsec / generate-new / NIP-07. On
  sign-in, `authStore.signIn()` stores the nsec (obfuscated) in localStorage
  (`cyberchat.vault` + a device key). If no profile row exists for the npub,
  `ProfileSetup` runs. "Lock" clears localStorage and goes offline.
- **Data** — everything is React context/hooks over supabase-js. App state
  lives in `appStore`; data hooks (`useContacts`, `useRealtimeMessages`) query
  Supabase and subscribe to Realtime (`supabase.channel(...).on('postgres_changes', ...)`).
- **Messages** — sending inserts with `.select()` and appends the result
  locally; Realtime echoes it back and is deduplicated by id. This is what
  makes messages appear instantly.

---

## 9. Making changes

### Hard rules (do not regress)

1. **npub is the identity key; username is a custom @handle.** Auth, friends,
   and conversations are keyed by `profiles.npub`. `profiles.username` is a
   unique, lowercase custom handle (`@neo`, 3-20 chars: `[a-z][a-z0-9_]*`,
   letter-first) used for search and the directory. Legacy accounts keep their
   npub as `username` until they change it in Settings — they keep working and
   show no @handle until they set one. Display names are free-form and
   non-unique.
2. **No emojis, ever.** Not in code, UI, data, comments, commit messages, or
   docs. Avatars default to text sigils (`◆ ◇ ■ □ ▣ ▪ ▫ ▲ △ ● ○ ★`); a user may
   optionally set a profile picture via `profiles.avatar_url` (an http(s) URL,
   shown instead of the sigil by the `Avatar` component in
   `src/components/Avatar.tsx`).
3. **Display names fall back to the truncated npub** (`shortNpub(npub)` from
   `src/lib/nostr.ts`, e.g. `npub1abcde…fghi`).
4. **Search matches npub, username AND display_name** (`search_users` RPC).
5. **Terminal aesthetic**: zero border-radius and box-shadow, monospace
   everywhere, dense 4-8px padding, borders as separators, inverted colors for
   selected items. Palette tokens are in `src/styles.css` (`background`,
   `panel`, `surface`, `foreground`, `dim`, `accent`, `destructive`).

### Code conventions

- TypeScript strict; path alias `@/*` → `src/*`. No code comments unless
  asked; prefer clear naming.
- Hooks for data, store context for app state, Realtime via
  `supabase.channel(...).on('postgres_changes', ...)`.
- `src/components/ui/*` is unused generator boilerplate — don't add to it.
- **Lint noise**: `bun run lint` (repo-wide) reports pre-existing errors in
  `src/components/ui/*` and `scripts/trinity-bot.mjs`. Lint only the files you
  changed: `bunx eslint <files>`.

### Changing the database

1. Write a **new** migration in `supabase/migrations/` (never edit an applied
   one). Name format: `<timestamp>_<uuid>.sql`.
2. Apply to the local DB: `supabase db push --local`.
3. Regenerate types: `supabase gen types typescript --local > src/integrations/supabase/types.ts`.

**SQL gotcha to remember**: inside a function body, a parameter name is
shadowed by a same-named column in the query's tables. `WHERE col = npub` can
silently compare against a table column, not your parameter (this already bit
us in `get_friend_requests`). Qualify it as `function_name.param`:
`WHERE f.friend_npub = get_friend_requests.npub`. Don't add a column to a
RPC's tables with the same name as its parameter.

### Verify before committing

```sh
bunx eslint <changed files>
bunx tsc --noEmit
bun run build
```

Commit in the repo's style: short lowercase summary, no emoji
(`git log --oneline` shows recent examples).

---

## 10. Database at a glance

Tables (all keyed by npub):

- `profiles(npub PK, username UNIQUE, display_name, avatar_sigil, avatar_url, status_message, status, last_seen, created_at)`
- `friends(id, user_npub, friend_npub, status pending/accepted/blocked, UNIQUE(user_npub, friend_npub))`
- `conversations(id, type dm/group, name)`
- `conversation_participants(conversation_id, user_npub, last_read_at)`
- `messages(id, conversation_id, sender_npub, content, is_nudge, created_at, edited_at)`
- `typing_indicators(conversation_id, user_npub, started_at)`

RPCs: `get_or_create_dm`, `search_users`, `get_friend_requests`,
`get_unread_counts`. Realtime is on `messages`, `typing_indicators`,
`profiles`, `friends`. RLS is permissive (dev app; auth is client-side).

---

## 11. Deployment (Docker)

```sh
docker build \
  --build-arg VITE_SUPABASE_URL= \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
  --build-arg VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
  --build-arg SUPABASE_PROXY_PASS=http://localhost:54321 \
  -t cyberchat .
docker run -p 8080:80 cyberchat
```

`SUPABASE_PROXY_PASS` should point at the Supabase API host the container can
reach (local instance, or a hosted URL). Serves the static SPA from
`nginx:alpine` with `_shell.html` fallback and the same-origin proxy baked in.

---

## 12. Favicon

Files: `public/favicon.png` (512x512) + `public/favicon.ico`, referenced from
`src/routes/__root.tsx`. They were made by center-cropping an owner-supplied
image to a square and generating the sizes:

```sh
magick source.jpg -gravity center -crop <SIZE>x<SIZE>+0+0 +repage -resize 512x512 public/favicon.png
magick source.jpg -gravity center -crop <SIZE>x<SIZE>+0+0 +repage -define icon:auto-resize=16,32,48 public/favicon.ico
```

Smaller crop size = more zoomed in. Browsers cache favicons aggressively —
hard-refresh to see changes.

---

## 13. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Silent sign-in/data failures in a browser, but curl works | Browser hitting an ngrok'd Supabase URL → interstitial. Use the app tunnel (:8080) and empty `VITE_SUPABASE_URL`. |
| Session lost after refresh | Reloaded a different origin (ngrok URLs don't share localStorage) or profile fetch failed hard. Retry the same URL. |
| Incoming friend requests don't show | Old `get_friend_requests` param-shadowing bug — make sure the fixed migration is applied locally. |
| `supabase db push` goes to the wrong place | It targets the linked remote project; add `--local` for the local instance. |
| Migration/type drift | Re-run `supabase gen types typescript --local`. |
| Lint exit code 1 | Pre-existing noise in unused `ui/*` + bot script; lint changed files only. |
| Disk full (nvme ~98%) | 3.1G pacman cache can be cleared: `sudo pacman -Scc`. |
