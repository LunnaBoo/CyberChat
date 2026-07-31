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

Copy `.env.example` to `.env` and fill in values from `supabase status`:

```
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-or-publishable-key>
VITE_SUPABASE_ANON_KEY=<anon-key>
```

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
  --build-arg VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
  --build-arg VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
  -t cyberchat .
docker run -p 8080:80 cyberchat
```

Serves the static SPA build through `nginx:alpine` with fallback to
`_shell.html`. Supabase env vars are baked in at build time, so pass them as
build args.

## Development guide

See [AGENTS.md](AGENTS.md) for the agent reference: commands, architecture,
database schema, and the design rules that must not regress.
