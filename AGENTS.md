# AGENTS.md — CyberChat

CyberChat is a web-based chat app styled as a terminal emulator, inspired by MSN
Messenger and the aesthetic of cyberspace.online. Identity comes from Nostr
keypairs (nsec/npub, NIP-07 support). All data and real-time messaging run on a
local Supabase instance (Postgres + Realtime).

## Commands

| Command | Purpose |
| --- | --- |
| `bun install` | Install dependencies (Bun is the package manager; `bun.lock`) |
| `bun run dev` | Start Vite dev server |
| `bun run build` | Production build |
| `bun run preview` | Preview the production build |
| `bun run lint` | ESLint |
| `bun run format` | Prettier (writes to disk) |
| `supabase start` | Start local Supabase (Postgres + Realtime on :54321) |
| `supabase db push` | Apply migrations in `supabase/migrations/` (defaults to the linked remote project if any; use `supabase db push --local` for the local instance) |
| `supabase db reset` | Reset local DB and re-apply migrations + seeds |
| `supabase status` | Show local connection strings / anon key |
| `supabase gen types typescript --local > src/integrations/supabase/types.ts` | Regenerate typed DB client |
| `bun scripts/trinity-bot.mjs` | Test bot (trinity): auto-replies to DMs, echoes nudges, auto-accepts friend requests — talks straight to local Supabase on :54321 |
| `docker build -t cyberchat .` | Build the nginx SPA image (pass Supabase keys + `SUPABASE_PROXY_PASS` as `--build-arg`) |
| `docker run -p 8080:80 cyberchat` | Run the Docker image |

Always run `bun run lint` after changing code. Do not run `format` across the
whole repo (it rewrites everything); format only changed files if needed. Note
that repo-wide `bun run lint` currently reports pre-existing errors in the
unused `src/components/ui/*` boilerplate and `scripts/trinity-bot.mjs`; lint
the files you changed rather than trusting the full-repo exit code.

## Environment

Copy `.env.example` to `.env` and fill in values from `supabase status`:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-or-publishable-key>
VITE_SUPABASE_ANON_KEY=<anon-key>
```

The Supabase client (`src/integrations/supabase/client.ts`) accepts both
`VITE_SUPABASE_ANON_KEY` and `VITE_SUPABASE_PUBLISHABLE_KEY` (it prefers the
publishable key). Use whichever your local `supabase status` reports.

`VITE_SUPABASE_URL` empty (or `auto`) makes the client use its own origin and
reach Supabase through a **same-origin proxy** (Vite dev server in dev, nginx
in the Docker build). This avoids cross-origin CORS preflights and ngrok's
free-tier browser interstitial (`ERR_NGROK_6024`), which silently breaks
browser REST calls to an ngrok'd Supabase. In dev the proxy targets the local
instance (`vite.config.ts` → `http://127.0.0.1:54321`); set an explicit URL in
`.env` to talk cross-origin instead (e.g. hosted Supabase).

## Architecture

- **React 19 + Vite + TypeScript**, built on **TanStack Start/Start Router** in
  **SPA mode** (`spa: { enabled: true }`, `nitro: false`) — the app is a pure
  client-side app (auth via localStorage, data via Supabase), so there is no SSR.
- **Tailwind CSS v4** — config lives in CSS via `@theme` in `src/styles.css` (no `tailwind.config.*`).
- **Supabase JS client** for all data + realtime subscriptions.
- **nostr-tools** for key generation, npub/nsec encoding, NIP-07.
- State is plain React context/hooks — no external state library.

### Directory layout

```
src/
├── App.tsx                  # boot → auth → main flow
├── components/
│   ├── BootScreen, AuthScreen, MainLayout, ProfileSetup, TerminalContainer
│   ├── Sidebar/             # UserBadge, SearchBar, ContactList, ContactItem, FriendRequests
│   ├── Chat/                # ChatArea, ConversationTabs, MessageList, MessageBubble, MessageInput, TypingIndicator
│   ├── Modals/              # NewConversation, Settings, UserProfile, CommandPalette, ModalFrame
│   └── ui/                  # shadcn/ui primitives (mostly unused — do NOT add more)
├── hooks/                   # useContacts, useRealtimeMessages, useTypingIndicator
├── lib/                     # nostr.ts, types.ts, utils.ts
├── routes/                  # TanStack Router: __root.tsx, index.tsx (mounts App)
├── stores/                  # authStore.ts (identity/profile), appStore.tsx (conversations/tabs/modals)
├── integrations/supabase/   # client.ts, types.ts (regenerated types)
└── scripts/                 # trinity-bot.mjs (dev/test bot, talks straight to local Supabase)
```

### Auth flow (all in `src/stores/authStore.ts` + `src/lib/nostr.ts`)

1. `AuthScreen` offers 3 methods: import nsec, generate new keypair, NIP-07 extension.
2. On sign-in, `authStore.signIn(identity)` persists the nsec obfuscated in localStorage (`cyberchat.vault` + device key).
3. If no profile row exists for the npub, `ProfileSetup` runs to register one.
4. "Lock" clears localStorage (signs out) and sets status offline.

## Design decisions (do not regress)

These are hard rules from the product spec and follow-up decisions with the owner:

1. **Username IS the npub.** The `profiles.username` column stores the user's
   Nostr public key (`npub1...`), NOT a custom handle. Custom handles do not
   exist. Display names are non-unique and free-form.
2. **No emojis, ever.** The app is a text-based terminal TUI. No emoji in code,
   UI, or default data. Avatars use text sigils (`◆ ◇ ■ □ ▣ ▪ ▫ ▲ △ ● ○ ★`).
   This also means: never use emoji in commit messages, comments, or docs.
3. **Display names fall back to truncated npub.** When a user has no display
   name, show `shortNpub(npub)` (e.g. `npub1abcde…fghi`) from `src/lib/nostr.ts`.
4. **Search matches npub AND display_name.** `search_users` RPC must search
   `npub ILIKE` and `display_name ILIKE` (username column holds the npub, so it
   is covered by the npub match). Search by display name is fuzzy by design
   since names are non-unique.
5. **Terminal aesthetic only** — see style rules below.

## Styling rules (cyberspace.online terminal aesthetic)

Enforced in `src/styles.css` and must be respected in new code:

- Palette (Tailwind tokens): `background` near-black, `panel` darker green-gray,
  `surface` input bg, `foreground` matrix green (`#00ff41`-ish), `dim` muted
  green, `accent` yellow (`#ffb000`), `destructive` red (`#ff3355`).
- Monospace everywhere (`--font-mono` / `--font-sans` both JetBrains Mono stack).
- **Zero border-radius, zero box-shadow** (globally forced in CSS).
- Thin green-tinted scrollbar (global).
- CRT scanline + vignette overlay via `.scanlines` class on the root container.
- Blinking cursor via `.cursor-blink`; nudge shake/flash via `.nudging`/`.nudging-flash`.
- Dense, compact layout: tight padding (4-8px), borders as separators, avoid
  `gap-*` spacing utilities where borders + padding suffice.
- Active/selected items use inverted colors (`bg-foreground text-background`).

## Database schema

All tables keyed by `npub`. See `supabase/migrations/` for the authoritative SQL.

- `profiles(npub PK, username UNIQUE, display_name, avatar_sigil, status_message, status CHECK, last_seen, created_at)`
- `friends(id, user_npub, friend_npub, status pending/accepted/blocked, UNIQUE(user_npub, friend_npub))`
- `conversations(id, type dm/group, name)`
- `conversation_participants(conversation_id, user_npub, last_read_at, PK(conversation_id, user_npub))`
- `messages(id, conversation_id, sender_npub, content, is_nudge, created_at, edited_at)`
- `typing_indicators(conversation_id, user_npub, started_at, PK(conversation_id, user_npub))`

RPCs: `get_or_create_dm`, `search_users`, `get_friend_requests`, `get_unread_counts`.

Realtime is enabled on `messages`, `typing_indicators`, `profiles`, `friends`.
All tables have permissive RLS policies (dev app; auth is client-side via keys).

### Seed data

`supabase/seed.sql` creates 4 test profiles (neo/trinity/morpheus/cipher),
friendships, and a group conversation. Each profile's nsec/npub pair is listed
at the top of the file — use them to sign in during testing.

## Conventions

- No code comments unless the owner asks. Explain non-obvious logic via clear naming.
- Do not add shadcn/ui components or new dependencies without asking; most of
  `src/components/ui/` is unused boilerplate from the generator.
- Follow existing patterns: hooks for data (`hooks/`), store context for app state,
  Supabase realtime via `supabase.channel(...).on('postgres_changes', ...)`.
- Path alias `@/*` → `src/*`.
- TypeScript strict; use types from `src/lib/types.ts` / regenerated Supabase types.
- When changing the DB schema, write a new migration in `supabase/migrations/`
  (never edit applied ones) and regenerate `integrations/supabase/types.ts`.
- SQL function parameters are shadowed by same-named columns in the function
  body: `WHERE col = param` silently compares against the table column when a
  joined table has a column with the same name. Qualify the reference as
  `function_name.param` (see the `get_friend_requests` fix in
  `20260731051000_*.sql`).

## Current status / open work

Completed so far:

1. `supabase/seed.sql` — 4 test users (neo/trinity/morpheus/cipher), friendships,
   and a group so messaging is testable.
2. `avatar_emoji` → `avatar_sigil` — text sigils (`◆ ◇ ■ □ ▣ ▪ ▫ ▲ △ ● ○ ★`)
   replace all emojis in UI, code, and default data.
3. Username IS the npub — enforced everywhere; `displayName()` falls back to
   `shortNpub(npub)`.
4. Config polish — package renamed `cyberchat`, HTML title/meta fixed,
   `.env.example` + `.gitignore` added, Supabase client accepts anon or
   publishable key.
5. Docker — static SPA build (`spa: true`, `nitro: false`) served by
   `nginx:alpine` with `_shell.html` fallback.
6. Same-origin Supabase proxy — `VITE_SUPABASE_URL=` (empty) default routes the
   browser through `/rest`, `/realtime`, `/auth`, `/storage` on its own origin
   (Vite in dev → `127.0.0.1:54321`, nginx in Docker via `SUPABASE_PROXY_PASS`).
   Eliminates CORS preflights and ngrok's free-tier browser interstitial, the
   root cause of silent sign-in/refresh/data failures.
7. Auth persistence hardening — `App.tsx` no longer wipes the localStorage
   vault on transient profile-fetch failures (shows `[retry]`/`[sign out]`
   instead); `ProfileSetup` only runs when a profile is genuinely missing.
   `AuthScreen` surfaces query errors; `ProfileSetup` falls back on duplicates;
   `autoComplete="off"` on nsec/display-name inputs.
8. Friend management — `get_friend_requests` RPC fixed (its `npub` parameter
   was shadowed by the `npub` columns of the joined tables; qualified as
   `get_friend_requests.npub` in `20260731051000_*.sql`). Incoming requests now
   render in the sidebar, with accept/decline; outgoing requests show a SENT
   section with `[cancel]`; search results in NewConversation gain a per-row
   friend-state button (`friend`/`sent`/`incoming`/`add`).
9. Trinity bot (`scripts/trinity-bot.mjs`) — auto-replies to DMs (after a
   typing indicator), echoes nudges, and auto-accepts friend requests, so
   add-friend and DM flows are testable end-to-end without a second human.
10. Favicon — center-cropped square from an owner-supplied image, shipped as
    `public/favicon.png` (512×512) + `public/favicon.ico`, referenced from
    `src/routes/__root.tsx`.

Open work if needed later: wire deploy hooks so `bun run build` regenerates
Supabase types automatically; anything else the owner requests.
