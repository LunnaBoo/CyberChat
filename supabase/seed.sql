-- CyberChat seed data
-- Test identities (username = @handle per design; npub is the identity key)
--
--   neo      nsec1pxvdnl0jmanqar4t8fv0x0me3x0st69rl0eup65plzt9vcps2nzqpg04nn
--            npub13qx368xtcvutd83t574wh3qn3uhwdkvv49hp7ypuyejsh9vtfznq2swdju
--   trinity  nsec1z4jdsr8pmd58nfgy0uk3whvecs3eyjaa7ua5rwgqh9hl533vdvtq4ulzdp
--            npub107whj74v3egyew339f0ppzlstzacvy7u979s25rcfydmxzsflpqqkatgzu
--   morpheus nsec1mjkdk9l5tghs42c37ksqhyzfut866pthe6d8he4t0hywhs6lzz3s48wvcp
--            npub10wh9dqcdxlsek7apd9cn2lzh326h2erugf0lhe98022l2wa3xvcq0wsa6l
--   cipher   nsec1cgz8h3e6lwf9ekfqmgf4wtrk8yvfxmnkt9eyndl9pzvxyvjy96gs72ktgn
--            npub1u38pw3r9p7w0xe4dreumx0zngt9tjrd43laz4s3cc8qs26rjduwqmf9w5d

INSERT INTO public.profiles (npub, username, display_name, avatar_sigil, status_message, status) VALUES
  ('npub13qx368xtcvutd83t574wh3qn3uhwdkvv49hp7ypuyejsh9vtfznq2swdju', 'neo', 'neo', '◆', 'the one', 'online'),
  ('npub107whj74v3egyew339f0ppzlstzacvy7u979s25rcfydmxzsflpqqkatgzu', 'trinity', 'trinity', '◇', 'hacking the grid', 'online'),
  ('npub10wh9dqcdxlsek7apd9cn2lzh326h2erugf0lhe98022l2wa3xvcq0wsa6l', 'morpheus', 'morpheus', '■', 'free your mind', 'idle'),
  ('npub1u38pw3r9p7w0xe4dreumx0zngt9tjrd43laz4s3cc8qs26rjduwqmf9w5d', 'cipher', 'cipher', '▲', 'i know the rules', 'offline');

INSERT INTO public.friends (user_npub, friend_npub, status) VALUES
  ('npub13qx368xtcvutd83t574wh3qn3uhwdkvv49hp7ypuyejsh9vtfznq2swdju', 'npub107whj74v3egyew339f0ppzlstzacvy7u979s25rcfydmxzsflpqqkatgzu', 'accepted'),
  ('npub13qx368xtcvutd83t574wh3qn3uhwdkvv49hp7ypuyejsh9vtfznq2swdju', 'npub10wh9dqcdxlsek7apd9cn2lzh326h2erugf0lhe98022l2wa3xvcq0wsa6l', 'accepted'),
  ('npub107whj74v3egyew339f0ppzlstzacvy7u979s25rcfydmxzsflpqqkatgzu', 'npub13qx368xtcvutd83t574wh3qn3uhwdkvv49hp7ypuyejsh9vtfznq2swdju', 'accepted'),
  ('npub10wh9dqcdxlsek7apd9cn2lzh326h2erugf0lhe98022l2wa3xvcq0wsa6l', 'npub13qx368xtcvutd83t574wh3qn3uhwdkvv49hp7ypuyejsh9vtfznq2swdju', 'accepted'),
  ('npub1u38pw3r9p7w0xe4dreumx0zngt9tjrd43laz4s3cc8qs26rjduwqmf9w5d', 'npub13qx368xtcvutd83t574wh3qn3uhwdkvv49hp7ypuyejsh9vtfznq2swdju', 'pending');

INSERT INTO public.conversations (type, name) VALUES
  ('group', 'the crew');

INSERT INTO public.conversation_participants (conversation_id, user_npub) VALUES
  ((SELECT id FROM public.conversations WHERE name = 'the crew'), 'npub13qx368xtcvutd83t574wh3qn3uhwdkvv49hp7ypuyejsh9vtfznq2swdju'),
  ((SELECT id FROM public.conversations WHERE name = 'the crew'), 'npub107whj74v3egyew339f0ppzlstzacvy7u979s25rcfydmxzsflpqqkatgzu'),
  ((SELECT id FROM public.conversations WHERE name = 'the crew'), 'npub10wh9dqcdxlsek7apd9cn2lzh326h2erugf0lhe98022l2wa3xvcq0wsa6l');

INSERT INTO public.messages (conversation_id, sender_npub, content, is_nudge) VALUES
  ((SELECT id FROM public.conversations WHERE name = 'the crew'), 'npub13qx368xtcvutd83t574wh3qn3uhwdkvv49hp7ypuyejsh9vtfznq2swdju', 'wake up, neo...', false),
  ((SELECT id FROM public.conversations WHERE name = 'the crew'), 'npub107whj74v3egyew339f0ppzlstzacvy7u979s25rcfydmxzsflpqqkatgzu', 'follow the white rabbit', false),
  ((SELECT id FROM public.conversations WHERE name = 'the crew'), 'npub10wh9dqcdxlsek7apd9cn2lzh326h2erugf0lhe98022l2wa3xvcq0wsa6l', 'there is no spoon', false);
