-- Migration 14: allow league creator to SELECT their own league immediately after INSERT
--
-- Bug: INSERT INTO leagues (...) RETURNING ... with .single() returns 0 rows for
-- private leagues because leagues_select_open requires membership, which doesn't
-- exist yet at INSERT time. The INSERT succeeds but the RETURNING is blocked.
--
-- Fix: add a SELECT policy letting the creator always see their own league.

CREATE POLICY "leagues_select_own_created" ON public.leagues
  FOR SELECT USING (auth.uid() = created_by);
