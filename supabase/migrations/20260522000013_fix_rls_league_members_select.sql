-- Migration 13: fix leagues_select_open + league_members SELECT policy
--
-- Problem 1: leagues_select_open compiled as (lm.league_id = lm.id) instead of
--            (lm.league_id = leagues.id) — ambiguous unqualified 'id' in subquery.
--            Result: private leagues are invisible even to their own members.
--
-- Problem 2: league_members_select_own (auth.uid() = user_id) prevents an admin
--            from seeing other members' rows, which means those rows are never
--            DELETE candidates — league_members_admin_delete silently blocks
--            because PostgreSQL applies SELECT policy before DELETE policy.
--
-- Fix: replace both policies. Use a SECURITY DEFINER helper function for the
-- league-membership check to avoid infinite recursion in league_members RLS.

-- ── Fix leagues_select_open ───────────────────────────────────────────────────

DROP POLICY IF EXISTS "leagues_select_open" ON public.leagues;

CREATE POLICY "leagues_select_open" ON public.leagues
  FOR SELECT USING (
    access_type = 'open'
    OR EXISTS (
      SELECT 1 FROM public.league_members lm
      WHERE lm.league_id = leagues.id          -- fully qualified: no ambiguity
        AND lm.user_id = auth.uid()
    )
  );

-- ── Security-definer helper to check membership without infinite recursion ────

CREATE OR REPLACE FUNCTION public.is_member_of_league(p_league_id UUID)
  RETURNS BOOLEAN
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.league_members
    WHERE league_id = p_league_id AND user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_member_of_league(UUID) TO authenticated, anon;

-- ── Replace league_members SELECT policy ─────────────────────────────────────
-- Old: auth.uid() = user_id (too restrictive — blocks admin delete cascade)
-- New: any member can see all rows in leagues they belong to (original intent)

DROP POLICY IF EXISTS "league_members_select_own"  ON public.league_members;
DROP POLICY IF EXISTS "league_members_select"       ON public.league_members;

CREATE POLICY "league_members_select_league" ON public.league_members
  FOR SELECT USING (
    public.is_member_of_league(league_id)
  );
