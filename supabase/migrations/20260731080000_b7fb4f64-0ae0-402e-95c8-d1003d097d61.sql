ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;

DROP FUNCTION IF EXISTS public.get_friend_requests(TEXT);

CREATE OR REPLACE FUNCTION public.get_friend_requests(npub TEXT)
RETURNS TABLE (id UUID, user_npub TEXT, username TEXT, display_name TEXT, avatar_sigil TEXT, avatar_url TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT f.id, f.user_npub, p.username, p.display_name, p.avatar_sigil, p.avatar_url, f.created_at
  FROM friends f JOIN profiles p ON p.npub = f.user_npub
  WHERE f.friend_npub = get_friend_requests.npub AND f.status = 'pending'
  ORDER BY f.created_at DESC;
$$;
