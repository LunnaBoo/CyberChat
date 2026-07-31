# CyberChat

An MSN Messenger-inspired web chat app styled as a terminal emulator, with the
aesthetic of [cyberspace.online](https://cyberspace.online). Identity comes from
Nostr keypairs; all data and real-time messaging run on Supabase (Postgres +
Realtime).

## Features

- Three sign-in methods on one screen: import an `nsec`, generate a new keypair,
  or use a NIP-07 browser extension
- Realtime DMs and group chats, conversation tabs, typing indicators, MSN-style
  nudges, command palette, friend requests
- Terminal TUI aesthetic: matrix-green monospace, text sigil avatars, no emojis
- Static SPA build (no SSR) — auth lives in localStorage, data flows through
  Supabase Realtime

## Quick start

Prerequisites: Bun, the [Supabase CLI](https://supabase.com/docs/guides/cli).

```sh
bun install
supabase start          # Postgres + Realtime on :54321
supabase db push        # apply migrations
supabase db reset       # re-apply migrations + seeds
```

Note: if the project is linked to a hosted Supabase project (`supabase link`),
`supabase db push` targets that remote by default. Use `supabase db push
--local` to apply migrations to the local instance.

Copy `.env.example` to `.env` and fill in values from `supabase status`:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-or-publishable-key>
VITE_SUPABASE_ANON_KEY=<anon-key>
```

`VITE_SUPABASE_URL` empty (or `auto`) means the SPA reaches Supabase through a
same-origin proxy — the Vite dev server proxies `/rest`, `/realtime`, `/auth`,
`/storage` to the local instance on `:54321`. This avoids cross-origin CORS
preflights and ngrok's free-tier browser interstitial. Set an explicit URL
instead to talk to Supabase cross-origin (e.g. a hosted project).

Then run the dev server:

```sh
bun run dev
```

## Seeded test users

`supabase/seed.sql` provides 4 profiles (neo/trinity/morpheus/cipher),
friendships, and a group conversation. Sign in as any test user by importing
their nsec, listed at the top of the seed file.

## Deploy with Docker

```sh
docker build \
  --build-arg VITE_SUPABASE_URL= \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
  --build-arg VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
  --build-arg SUPABASE_PROXY_PASS=$SUPABASE_PROXY_PASS \
  -t cyberchat .
docker run -p 8080:80 cyberchat
```

Serves the static SPA build through `nginx:alpine` with fallback to
`_shell.html`. The API is same-origin: nginx proxies `/rest`, `/realtime`,
`/auth`, `/storage` to `SUPABASE_PROXY_PASS` (e.g. `http://localhost:54321`),
baked in at build time alongside the Supabase keys.

## Development guide

See [AGENTS.md](AGENTS.md) for the agent reference: commands, architecture,
database schema, and the design rules that must not regress.
