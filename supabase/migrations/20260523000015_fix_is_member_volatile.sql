-- Migration 15: change is_member_of_league from STABLE to VOLATILE
--
-- STABLE functions use a pre-command snapshot. When called inside an
-- INSERT...RETURNING to evaluate the SELECT RLS policy, the just-inserted
-- league_members row is invisible → policy returns FALSE → PostgREST throws 42501.
-- VOLATILE ensures the function always sees the current transaction state.

CREATE OR REPLACE FUNCTION public.is_member_of_league(p_league_id UUID)
  RETURNS BOOLEAN
  LANGUAGE sql
  SECURITY DEFINER
  VOLATILE
  SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.league_members
    WHERE league_id = p_league_id AND user_id = auth.uid()
  );
$$;
