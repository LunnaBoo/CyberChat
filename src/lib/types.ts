export type PresenceStatus = "online" | "idle" | "busy" | "offline";

export interface Profile {
  npub: string;
  username: string;
  display_name: string | null;
  avatar_sigil: string | null;
  avatar_url: string | null;
  status_message: string | null;
  status: PresenceStatus;
  last_seen: string | null;
  created_at: string | null;
}

export interface Friend {
  id: string;
  user_npub: string;
  friend_npub: string;
  status: "pending" | "accepted" | "blocked";
  created_at: string | null;
}

export interface Conversation {
  id: string;
  type: "dm" | "group";
  name: string | null;
  created_at: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_npub: string;
  content: string;
  is_nudge: boolean;
  created_at: string;
  edited_at: string | null;
}

export interface TypingIndicator {
  conversation_id: string;
  user_npub: string;
  started_at: string;
}

export interface FriendRequest {
  id: string;
  user_npub: string;
  username: string;
  display_name: string | null;
  avatar_sigil: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

export interface ConversationSummary {
  conversation: Conversation;
  participants: Profile[];
  title: string;
  sigil: string;
  avatarUrl: string | null;
}

export const STATUS_DOT: Record<PresenceStatus, string> = {
  online: "●",
  idle: "◐",
  busy: "⛔",
  offline: "○",
};

export const STATUS_LABEL: Record<PresenceStatus, string> = {
  online: "ONLINE",
  idle: "IDLE",
  busy: "BUSY",
  offline: "OFFLINE",
};

export const SIGILS = [
  "◆",
  "◇",
  "■",
  "□",
  "▣",
  "▪",
  "▫",
  "▲",
  "△",
  "●",
  "○",
  "★",
];
