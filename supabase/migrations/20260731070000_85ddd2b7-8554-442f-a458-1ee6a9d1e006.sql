CREATE OR REPLACE FUNCTION public.search_users(query TEXT)
RETURNS SETOF public.profiles LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM profiles
  WHERE npub ILIKE '%' || query || '%'
     OR display_name ILIKE '%' || query || '%'
     OR username ILIKE '%' || query || '%'
  ORDER BY display_name LIMIT 25;
$$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_format
  CHECK (username ~ '^[a-z][a-z0-9_]{2,63}$');
