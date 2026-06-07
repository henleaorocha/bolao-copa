-- League-permissions enforcement (PRD league-permissions, task_02; ADR-002, ADR-003, ADR-004).
-- The authoritative security migration. Depends on task_01's column migration
-- (20260601000025) which adds public.users.can_create_league. Three changes:
--   1. Gate INSERT on leagues behind can_create_league (leagues_insert).
--   2. Hide the seeded test league from open discovery while keeping it visible
--      to its members (leagues_select_open).
--   3. Stop handle_new_user() from auto-enrolling new accounts into the test league.

-- ── 1. Creation gate ─────────────────────────────────────────────────────────
-- Replaces the old leagues_insert (which checked only auth.uid() = created_by).
-- INSERT now also requires a public.users row for the caller with the flag set.
DROP POLICY IF EXISTS leagues_insert ON public.leagues;
CREATE POLICY leagues_insert ON public.leagues
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.can_create_league = true
    )
  );

-- ── 2. Hide the test league from open discovery ──────────────────────────────
-- Replaces leagues_select_open. The open branch excludes the fixed test-league
-- UUID; the membership branch is unchanged, so testers (members) still see it.
-- The separate leagues_select_own_created policy (migration 14) is untouched.
-- NOTE: the outer column is fully qualified as leagues.id. An unqualified `id`
-- here resolves to league_members.id (inner scope wins, see migration 13),
-- compiling to `lm.league_id = lm.id` and hiding leagues from their own members.
DROP POLICY IF EXISTS "leagues_select_open" ON public.leagues;
CREATE POLICY "leagues_select_open" ON public.leagues
  FOR SELECT USING (
    (access_type = 'open' AND leagues.id <> '00000000-0000-0000-0000-000000000001'::uuid)
    OR EXISTS (
      SELECT 1 FROM public.league_members lm
      WHERE lm.league_id = leagues.id AND lm.user_id = auth.uid()
    )
  );

-- ── 3. Stop auto-enrolling new users into the test league ─────────────────────
-- Keeps the public.users upsert (idempotent on conflict) and SECURITY DEFINER;
-- drops the auto-enroll INSERT into the test league (ADR-002). New users now
-- start with no league until they join or create one.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  -- Auto-enroll into the test league removed (PRD ADR-002).
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
