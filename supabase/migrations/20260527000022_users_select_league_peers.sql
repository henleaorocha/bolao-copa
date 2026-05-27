-- Migration 22: let members read co-members' profiles (full_name, avatar)
--
-- Bug: users_select_own (auth.uid() = id) was the ONLY SELECT policy on
-- public.users, so embedded `users(...)` joins (ranking, member lists, league
-- owner) returned NULL for every row except your own. The UI then fell back to
-- the literal "Usuário" for everyone else.
--
-- Fix: allow reading a user row when you share at least one league with that
-- user. A SECURITY DEFINER helper performs the league_members lookup so the
-- users policy does not recurse into league_members RLS.

CREATE OR REPLACE FUNCTION public.shares_league_with(p_user_id UUID)
  RETURNS BOOLEAN
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.league_members me
    JOIN public.league_members peer ON peer.league_id = me.league_id
    WHERE me.user_id = auth.uid()
      AND peer.user_id = p_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.shares_league_with(UUID) TO authenticated, anon;

DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_select_visible" ON public.users;

CREATE POLICY "users_select_visible" ON public.users
  FOR SELECT USING (
    auth.uid() = id
    OR public.shares_league_with(id)
  );
