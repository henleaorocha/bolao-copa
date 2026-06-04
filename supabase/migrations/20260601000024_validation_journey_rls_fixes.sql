-- Pre-launch validation (PRD football-api-ingestion, task_09) surfaced three
-- RLS/trigger defects in the league-social flows that block the participant
-- journey. All three are pre-existing (unrelated to match ingestion) and each
-- fix mirrors an established pattern in this repo's migration history.

-- ── 1. member_count trigger must run with definer rights ────────────────────
-- Bug: sync_league_member_count() ran under the JOINING user's RLS. Its
-- `UPDATE public.leagues SET member_count = ...` is gated by leagues_admin_update
-- (auth.uid() = created_by), so when a member joins a league they did NOT create
-- the UPDATE is blocked and the whole league_members INSERT fails with
-- "new row violates row-level security policy". Net effect: nobody can join a
-- league they didn't create. Auto-join to the main league only works because it
-- fires inside the SECURITY DEFINER handle_new_user().
-- Fix: make the counter SECURITY DEFINER, like every other helper here
-- (handle_new_user, is_member_of_league, shares_league_with).
CREATE OR REPLACE FUNCTION public.sync_league_member_count()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  UPDATE public.leagues
    SET member_count = (
      SELECT COUNT(*) FROM public.league_members
      WHERE league_id = COALESCE(NEW.league_id, OLD.league_id)
    )
  WHERE id = COALESCE(NEW.league_id, OLD.league_id);
  RETURN NULL;
END;
$$;

-- ── 2. Co-members must be able to read each other's FINISHED-match predictions ─
-- Bug: predictions_all_own (auth.uid() = user_id) is the only SELECT policy, so
-- the ranking endpoint — computed under the viewer's RLS — only sees the viewer's
-- own predictions and scores every other member as 0. Migration 22 fixed the
-- parallel problem for user profiles but not for predictions/champion_bets.
-- Fix: allow reading a co-member's prediction ONLY for matches that are already
-- finished (scoring inputs), so picks are never leaked before kickoff.
DROP POLICY IF EXISTS "predictions_select_league_peers" ON public.predictions;
CREATE POLICY "predictions_select_league_peers" ON public.predictions
  FOR SELECT USING (
    auth.uid() = user_id
    OR (
      public.shares_league_with(user_id)
      AND EXISTS (
        SELECT 1 FROM public.matches m
        WHERE m.id = predictions.match_id AND m.status = 'finished'
      )
    )
  );

-- Champion bets only score once a final is finished — reveal co-members' bets to
-- the ranking only from that point, never earlier.
DROP POLICY IF EXISTS "champion_bets_select_league_peers" ON public.champion_bets;
CREATE POLICY "champion_bets_select_league_peers" ON public.champion_bets
  FOR SELECT USING (
    auth.uid() = user_id
    OR (
      public.shares_league_with(user_id)
      AND EXISTS (
        SELECT 1 FROM public.matches m
        WHERE m.phase = 'final' AND m.status = 'finished'
      )
    )
  );
