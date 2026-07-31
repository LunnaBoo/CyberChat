
CREATE TABLE public.profiles (
  npub TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_sigil TEXT DEFAULT '◆',
  status_message TEXT DEFAULT '',
  status TEXT DEFAULT 'offline' CHECK (status IN ('online','idle','busy','offline')),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO anon, authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_all" ON public.profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_npub TEXT NOT NULL REFERENCES public.profiles(npub) ON DELETE CASCADE,
  friend_npub TEXT NOT NULL REFERENCES public.profiles(npub) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_npub, friend_npub)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friends TO anon, authenticated;
GRANT ALL ON public.friends TO service_role;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "friends_all" ON public.friends FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT DEFAULT 'dm' CHECK (type IN ('dm','group')),
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO anon, authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversations_all" ON public.conversations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.conversation_participants (
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_npub TEXT REFERENCES public.profiles(npub) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_npub)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_participants TO anon, authenticated;
GRANT ALL ON public.conversation_participants TO service_role;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants_all" ON public.conversation_participants FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_npub TEXT REFERENCES public.profiles(npub) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_nudge BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO anon, authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_all" ON public.messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.typing_indicators (
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_npub TEXT REFERENCES public.profiles(npub) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_npub)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.typing_indicators TO anon, authenticated;
GRANT ALL ON public.typing_indicators TO service_role;
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "typing_all" ON public.typing_indicators FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_messages_conv_time ON public.messages(conversation_id, created_at);
CREATE INDEX idx_friends_user ON public.friends(user_npub, status);
CREATE INDEX idx_participants_conv ON public.conversation_participants(conversation_id);

CREATE OR REPLACE FUNCTION public.get_or_create_dm(npub_a TEXT, npub_b TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE conv UUID;
BEGIN
  SELECT c.id INTO conv
  FROM conversations c
  JOIN conversation_participants p1 ON p1.conversation_id = c.id AND p1.user_npub = npub_a
  JOIN conversation_participants p2 ON p2.conversation_id = c.id AND p2.user_npub = npub_b
  WHERE c.type = 'dm'
  LIMIT 1;
  IF conv IS NOT NULL THEN RETURN conv; END IF;
  INSERT INTO conversations (type) VALUES ('dm') RETURNING id INTO conv;
  INSERT INTO conversation_participants (conversation_id, user_npub) VALUES (conv, npub_a), (conv, npub_b);
  RETURN conv;
END; $$;

CREATE OR REPLACE FUNCTION public.search_users(query TEXT)
RETURNS SETOF public.profiles LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM profiles
  WHERE npub ILIKE '%' || query || '%' OR display_name ILIKE '%' || query || '%'
  ORDER BY display_name LIMIT 25;
$$;

CREATE OR REPLACE FUNCTION public.get_friend_requests(npub TEXT)
RETURNS TABLE (id UUID, user_npub TEXT, username TEXT, display_name TEXT, avatar_sigil TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT f.id, f.user_npub, p.username, p.display_name, p.avatar_sigil, f.created_at
  FROM friends f JOIN profiles p ON p.npub = f.user_npub
  WHERE f.friend_npub = npub AND f.status = 'pending'
  ORDER BY f.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_unread_counts(npub TEXT)
RETURNS TABLE (conversation_id UUID, unread BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cp.conversation_id, COUNT(m.id)
  FROM conversation_participants cp
  LEFT JOIN messages m ON m.conversation_id = cp.conversation_id
    AND m.created_at > cp.last_read_at AND m.sender_npub <> npub
  WHERE cp.user_npub = npub
  GROUP BY cp.conversation_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_dm(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_users(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_friend_requests(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_counts(TEXT) TO anon, authenticated;

ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.typing_indicators REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.friends REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friends;
