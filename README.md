# CyberChat Terminal

# CyberChat — MSN-inspired Terminal Messaging App

Build a web-based chat app that looks like a terminal emulator, inspired by MSN Messenger and the aesthetic of cyberspace.online. The app uses **Nostr keypairs for identity** and **Supabase for all data storage + real-time messaging**.

## Tech Stack
- React + Vite + TypeScript
- Tailwind CSS with custom terminal theme
- Supabase (Postgres + Realtime)
- nostr-tools library
- NIP-07 support (window.nostr browser extensions like Alby)

## Auth System (3 methods, all on same login screen)

1. **Import existing Nostr key** — text field to paste nsec, validate, derive npub
2. **Generate new identity** — use nostr-tools generatePrivateKey() + getPublicKey(), show nsec once with backup warning + copy button
3. **NIP-07 browser extension** — detect window.nostr, call getPublicKey(), show "Sign in with Extension" button

Store nsec encrypted in localStorage. "Lock" button clears localStorage to sign out.

## Database Schema (Supabase)

All tables use npub (Nostr public key) as user identifier:

### profiles
- npub TEXT PRIMARY KEY
- username TEXT UNIQUE NOT NULL
- display_name TEXT
- avatar_emoji TEXT DEFAULT '👤'
- status_message TEXT DEFAULT ''
- status TEXT DEFAULT 'offline' CHECK (status IN ('online','idle','busy','offline'))
- last_seen TIMESTAMPTZ DEFAULT NOW()
- created_at TIMESTAMPTZ DEFAULT NOW()

### friends
- id UUID PRIMARY KEY DEFAULT gen_random_uuid()
- user_npub TEXT NOT NULL REFERENCES profiles(npub)
- friend_npub TEXT NOT NULL REFERENCES profiles(npub)
- status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','blocked'))
- created_at TIMESTAMPTZ DEFAULT NOW()
- UNIQUE(user_npub, friend_npub)

### conversations
- id UUID PRIMARY KEY DEFAULT gen_random_uuid()
- type TEXT DEFAULT 'dm' CHECK (type IN ('dm','group'))
- name TEXT (only for groups)
- created_at TIMESTAMPTZ DEFAULT NOW()

### conversation_participants
- conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE
- user_npub TEXT REFERENCES profiles(npub)
- joined_at TIMESTAMPTZ DEFAULT NOW()
- PRIMARY KEY (conversation_id, user_npub)

### messages
- id UUID PRIMARY KEY DEFAULT gen_random_uuid()
- conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL
- sender_npub TEXT REFERENCES profiles(npub) NOT NULL
- content TEXT NOT NULL
- created_at TIMESTAMPTZ DEFAULT NOW()
- edited_at TIMESTAMPTZ

### typing_indicators
- conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE
- user_npub TEXT REFERENCES profiles(npub)
- started_at TIMESTAMPTZ DEFAULT NOW()
- PRIMARY KEY (conversation_id, user_npub)

### Indexes
- idx_messages_conv_time ON messages(conversation_id, created_at)
- idx_friends_user ON friends(user_npub, status)
- idx_participants_conv ON conversation_participants(conversation_id)

### Helper RPCs (create as PostgreSQL functions)
- get_or_create_dm(npub_a, npub_b) → conversation_id
- search_users(query TEXT) → profiles matching username or display_name
- get_friend_requests(npub TEXT) → pending friend requests with profile data
- get_unread_counts(npub TEXT) → per-conversation unread message counts

## UI Components (ordered by implementation)

### 1. BootScreen
Terminal boot sequence animation (text scrolling line by line):
CyberOS v3.0.9
Booting kernel...
Initializing network interfaces...
Starting session manager...
Loading CyberChat...
_
Fades after ~2s or on any keypress.

### 2. AuthScreen
Large ASCII art header (big "CYBERCHAT" in block letters), then 3 options:
- `[1] Sign in with existing key` → nsec input field with show/hide toggle
- `[2] Create new identity` → generates keypair, shows nsec with warning
- `[3] Sign in with extension` → NIP-07 button (only shown if window.nostr exists)
Footer: `CTRL+K Commands | TAB Select`

### 3. MainLayout (split pane — vertical divider)
Header bar: `● CyberChat v0.1.0` left-aligned, [Lock] [Settings] right-aligned

### 4. Sidebar (left pane)
- **UserBadge**: avatar emoji + display_name, dropdown to change status (Online/Idle/Busy/Offline), click status message to edit
- **SearchBar**: `🔍 filter contacts...` — filters contact list and searches all users
- **ContactList**: grouped by Online/Idle/Busy/Offline sections. Each ContactItem shows status dot (● ◐ ⛔ ○), avatar emoji, username, truncated status message. Click to open conversation. Right-click menu: Remove friend, Block
- **FriendRequests**: badge with pending count, click to open accept/decline panel
- **Groups**: list of group conversations

### 5. ChatArea (right pane)
- **ConversationTabs**: horizontal tabs for open conversations, active tab highlighted, unread count badge, close button on each tab, [+] to start new conversation
- **MessageList**: scrollable, auto-scrolls to bottom. Self messages right-aligned, others left-aligned. Format: `[HH:MM] username: message`. Group consecutive messages from same user (hide username repeat within 2min)
- **TypingIndicator**: `username is typing... █` with blinking cursor, clears after 3s no heartbeat
- **MessageInput**: `> ` green prompt prefix, auto-resize textarea, Enter sends, Shift+Enter newline, /nudge command or button

### 6. Modals
- **NewConversation**: search users → select → creates DM, or select multiple + name for group
- **UserProfile**: click username in chat, shows avatar + info + Send message / Remove friend / Block
- **Settings**: edit display_name, avatar_emoji, username

### 7. Nudge Feature
Special message type. When received, the chat window plays a shake/flash animation. Send via `/nudge` command or button.

## Keyboard Shortcuts
- Ctrl+K: Command palette
- Ctrl+N: New conversation
- Ctrl+W: Close current tab
- Ctrl+Tab / Ctrl+Shift+Tab: Next/previous tab
- Ctrl+D: Toggle sidebar
- Ctrl+,: Settings
- Ctrl+L: Lock/sign out
- Esc: Close modal
- Enter: Send (in message input)
- Shift+Enter: New line (in message input)

## Aesthetic Specification (cyberspace.online style)

### Colors
- Background main: #0a0e0a
- Background secondary (sidebar, panels): #0f130f
- Background tertiary (inputs, hover): #141a14
- Text primary: #00ff41 (Matrix green)
- Text secondary (timestamps): #00cc33
- Text muted (placeholders): #006b1a
- Accent (notifications): #ffb000
- Error (busy status, errors): #ff3355
- Borders: #00ff41 at 0.3 opacity

### Typography
- Font stack: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace
- Base size: 14px, timestamps: 12px
- Line-height: 1.5
- No font smoothing (`-webkit-font-smoothing: none`)

### Effects & Layout
- CRT scanline overlay (CSS pseudo-element, subtle ~0.05 opacity)
- Terminal cursor blink animation on `> ` prompt
- No border-radius anywhere, no box-shadow anywhere
- Active/selected items use inverted text/background
- Thin green-tinted scrollbar
- Tight padding (4-8px), no gaps, border lines as separators only
- Compact, text-dense layout — maximum information density

## File Structure
src/
├── App.tsx
├── main.tsx
├── index.css              # Terminal theme, scanline, cursor blink, scrollbar
├── lib/
│   ├── supabase.ts        # Supabase client
│   ├── nostr.ts           # Key gen, NIP-07, validation helpers
│   └── types.ts           # TypeScript interfaces matching DB schema
├── stores/
│   └── authStore.ts       # Auth state: npub, nsec memory, localStorage
├── components/
│   ├── TerminalContainer  # Outer wrapper with scanline overlay
│   ├── BootScreen         # Boot animation
│   ├── AuthScreen         # Login with 3 methods
│   ├── MainLayout         # Post-auth split pane
│   ├── Sidebar/
│   │   ├── Sidebar
│   │   ├── UserBadge
│   │   ├── SearchBar
│   │   ├── ContactList
│   │   ├── ContactItem
│   │   └── FriendRequests
│   ├── Chat/
│   │   ├── ChatArea
│   │   ├── ConversationTabs
│   │   ├── MessageList
│   │   ├── MessageBubble
│   │   ├── TypingIndicator
│   │   └── MessageInput
│   └── Modals/
│       ├── NewConversation
│       ├── UserProfile
│       └── Settings
└── hooks/
    ├── useRealtimeMessages  # Supabase Realtime msg subscriptions
    ├── useTypingIndicator   # Typing broadcast/subscribe
    └── useContacts          # Friends + requests + search

## Build Instructions

1. Run `npm create vite@latest cyberchat -- --template react-ts`
2. Install: `npm install @supabase/supabase-js nostr-tools tailwindcss @tailwindcss/vite`
3. Configure Tailwind with the terminal color palette above
4. Set up local Supabase:
   - Install Supabase CLI and Docker
   - Run `supabase init` in the project root
   - Run `supabase start` (starts Postgres + Realtime locally on port 54321)
   - Paste the SQL schema into `supabase/migrations/20240101000000_init.sql`
   - Run `supabase db push` to apply migrations
   - Get local connection strings from `supabase status`
5. Set VITE_SUPABASE_URL=http://localhost:54321 and VITE_SUPABASE_ANON_KEY=<anon-key-from-supabase-status> in a .env file
6. Enable Realtime: run `supabase realtime enable` or enable via the local Studio at http://localhost:54323
7. Build all components in the order listed above

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2bf77e45-c765-4dee-b726-fcd30d45b5a7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
