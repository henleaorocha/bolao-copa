-- ============================================================================
-- Validation preset state: FINISHED tournament
-- ----------------------------------------------------------------------------
-- Part of the pre-launch validation harness (PRD football-api-ingestion,
-- task_09 / ADR-009). Seeds a deterministic, reproducible snapshot used by
-- tests/e2e/validation-run.spec.ts to walk scenarios 5 (per-match scoring),
-- 6 (ranking & tiebreakers) and 7.3-7.5 (knockout scoring + champion) of
-- docs/VALIDACAO-MANUAL.md.
--
-- TARGET: a DISPOSABLE database (local `supabase start`). NEVER apply against
-- the production project — `public.matches` is GLOBAL and this rewrites results.
-- Apply with:  docker exec -i supabase_db_bolao-copa psql -U postgres -d postgres -f - < this-file
--
-- Properties guaranteed by this seed (asserted in tests/unit/validation-seeds.test.ts):
--   * exactly one pilot league with two members (Ana + Bruno), both with predictions
--   * Portuguese team names throughout (roster = lib/copa-teams.ts / seed 020)
--   * knockout rows use external_id = wc2026-<num> (+ wc2026-final) and real PT
--     names, so isConfirmedMatchup passes and the bracket fills (scenario 7)
--   * deterministic predictions: Ana and Bruno TIE on points (135 each); both
--     hold exactly one exact (cravada); Ana's exact is on the later-dated
--     semifinal, so the "most recent exact" tiebreaker ranks Ana #1, Bruno #2
--   * match_date values are relative to now() (time-machine clock) so the state
--     reproduces whenever the seed runs
-- ============================================================================

BEGIN;

-- ── Idempotent cleanup of all validation rows (safe to re-run) ──────────────
DELETE FROM public.leagues
  WHERE id IN ('e2e00000-0000-0000-0000-0000000000c1',
               'e2e00000-0000-0000-0000-0000000000c2');
DELETE FROM public.matches
  WHERE external_id LIKE 'val-%'
     OR external_id IN ('wc2026-101', 'wc2026-102', 'wc2026-final');
DELETE FROM public.users
  WHERE email IN ('validacao.a@bolao.test', 'validacao.b@bolao.test');
DELETE FROM auth.users
  WHERE email IN ('validacao.a@bolao.test', 'validacao.b@bolao.test');

-- ── Two participants (auth.users → trigger creates public.users + joins main) ─
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token,
  is_sso_user, is_anonymous
) VALUES
  ('00000000-0000-0000-0000-000000000000', 'e2e00000-0000-0000-0000-0000000000a1',
   'authenticated', 'authenticated', 'validacao.a@bolao.test',
   extensions.crypt('Validacao123!', extensions.gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Ana Validação"}',
   '', '', '', '', '', '', '', '', false, false),
  ('00000000-0000-0000-0000-000000000000', 'e2e00000-0000-0000-0000-0000000000a2',
   'authenticated', 'authenticated', 'validacao.b@bolao.test',
   extensions.crypt('Validacao123!', extensions.gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Bruno Validação"}',
   '', '', '', '', '', '', '', '', false, false);

UPDATE public.users SET full_name = 'Ana Validação',   avatar_color = '#FFC72C'
  WHERE id = 'e2e00000-0000-0000-0000-0000000000a1';
UPDATE public.users SET full_name = 'Bruno Validação', avatar_color = '#2EC4B6'
  WHERE id = 'e2e00000-0000-0000-0000-0000000000a2';

-- ── Leagues: pilot (private) + a public one for the discover/visibility check ─
INSERT INTO public.leagues (id, name, description, access_type, invite_token, created_by)
VALUES
  ('e2e00000-0000-0000-0000-0000000000c1', 'Bolão de Validação (Piloto)',
   'Liga piloto da validação pré-lançamento', 'private',
   'val-token-piloto-0001', 'e2e00000-0000-0000-0000-0000000000a1'),
  ('e2e00000-0000-0000-0000-0000000000c2', 'Bolão Público de Validação',
   'Liga pública usada no cenário de descoberta', 'open',
   'val-token-publico-0002', 'e2e00000-0000-0000-0000-0000000000a1');

-- Both participants are members of the pilot league (finished state needs both
-- for ranking). Ana is the admin/creator. member_count is kept by trigger.
INSERT INTO public.league_members (league_id, user_id, role) VALUES
  ('e2e00000-0000-0000-0000-0000000000c1', 'e2e00000-0000-0000-0000-0000000000a1', 'admin'),
  ('e2e00000-0000-0000-0000-0000000000c1', 'e2e00000-0000-0000-0000-0000000000a2', 'member');

-- ── Finished matches (PT names; time-machine dates ascending toward "now") ───
-- Group stage (phase 'group', multiplier 1).
INSERT INTO public.matches
  (id, external_id, home_team, home_flag, away_team, away_flag,
   match_date, phase, "group", venue, city, status, home_score, away_score)
VALUES
  ('e2e10000-0000-0000-0000-000000000001', 'val-g1', 'Brasil',     'br', 'Marrocos',  'ma',
   now() - interval '12 days', 'group', 'C', 'MetLife Stadium', 'East Rutherford', 'finished', 2, 1),
  ('e2e10000-0000-0000-0000-000000000002', 'val-g2', 'Espanha',    'es', 'Portugal',  'pt',
   now() - interval '11 days', 'group', 'B', 'SoFi Stadium', 'Inglewood', 'finished', 1, 1),
  ('e2e10000-0000-0000-0000-000000000003', 'val-g3', 'Argentina',  'ar', 'França',    'fr',
   now() - interval '10 days', 'group', 'J', 'Estadio Azteca', 'Cidade do México', 'finished', 2, 0),
  ('e2e10000-0000-0000-0000-000000000004', 'val-g4', 'Inglaterra', 'gb-eng', 'Croácia', 'hr',
   now() - interval '9 days', 'group', 'L', 'BC Place', 'Vancouver', 'finished', 2, 1),
  ('e2e10000-0000-0000-0000-000000000005', 'val-g5', 'Holanda',    'nl', 'Catar',     'qa',
   now() - interval '8 days', 'group', 'F', 'Lumen Field', 'Seattle', 'finished', 2, 0),
  ('e2e10000-0000-0000-0000-000000000006', 'val-g6', 'Japão',      'jp', 'Suíça',     'ch',
   now() - interval '7 days', 'group', 'F', 'Levi''s Stadium', 'Santa Clara', 'finished', 1, 0),
  -- Semifinal (phase 'semi', multiplier x3), keyed to the openfootball bracket slot.
  ('e2e10000-0000-0000-0000-000000000101', 'wc2026-101', 'Brasil', 'br', 'Argentina', 'ar',
   now() - interval '4 days', 'semi', NULL, 'MetLife Stadium', 'East Rutherford', 'finished', 2, 1),
  -- Final (phase 'final', multiplier x4) → champion = Brasil, vice = Espanha.
  ('e2e10000-0000-0000-0000-0000000000ff', 'wc2026-final', 'Brasil', 'br', 'Espanha', 'es',
   now() - interval '2 days', 'final', NULL, 'MetLife Stadium', 'East Rutherford', 'finished', 1, 0);

-- ── Deterministic predictions (Ana = a1, Bruno = a2) ────────────────────────
-- Designed so both total 60 match points; each holds exactly ONE exact.
--   Ana's exact  = semifinal (latest date)  → 30 pts
--   Bruno's exact = group g1 (earliest date) → 10 pts
-- Equal totals → "most recent exact" tiebreaker ranks Ana above Bruno.
-- Per-match outcomes (real result in parentheses):
--   Ana:  g1 1x0 outcome(5) g2 0x0 draw(5) g3 1x0 outcome(5) g4 1x0 outcome(5)
--         g5 1x0 outcome(5) g6 2x0 outcome(5) SF 2x1 EXACT(30) final 0x1 WRONG(0)
--   Bruno: g1 2x1 EXACT(10) g2 2x2 outcome(5) g3 3x1 outcome(5) g4 3x1 outcome(5)
--         g5 0x2 WRONG(0) g6 0x1 WRONG(0) SF 1x0 outcome(15) final 2x1 outcome(20)
INSERT INTO public.predictions
  (user_id, league_id, match_id, predicted_home_score, predicted_away_score)
VALUES
  -- Ana
  ('e2e00000-0000-0000-0000-0000000000a1', 'e2e00000-0000-0000-0000-0000000000c1', 'e2e10000-0000-0000-0000-000000000001', 1, 0),
  ('e2e00000-0000-0000-0000-0000000000a1', 'e2e00000-0000-0000-0000-0000000000c1', 'e2e10000-0000-0000-0000-000000000002', 0, 0),
  ('e2e00000-0000-0000-0000-0000000000a1', 'e2e00000-0000-0000-0000-0000000000c1', 'e2e10000-0000-0000-0000-000000000003', 1, 0),
  ('e2e00000-0000-0000-0000-0000000000a1', 'e2e00000-0000-0000-0000-0000000000c1', 'e2e10000-0000-0000-0000-000000000004', 1, 0),
  ('e2e00000-0000-0000-0000-0000000000a1', 'e2e00000-0000-0000-0000-0000000000c1', 'e2e10000-0000-0000-0000-000000000005', 1, 0),
  ('e2e00000-0000-0000-0000-0000000000a1', 'e2e00000-0000-0000-0000-0000000000c1', 'e2e10000-0000-0000-0000-000000000006', 2, 0),
  ('e2e00000-0000-0000-0000-0000000000a1', 'e2e00000-0000-0000-0000-0000000000c1', 'e2e10000-0000-0000-0000-000000000101', 2, 1),
  ('e2e00000-0000-0000-0000-0000000000a1', 'e2e00000-0000-0000-0000-0000000000c1', 'e2e10000-0000-0000-0000-0000000000ff', 0, 1),
  -- Bruno
  ('e2e00000-0000-0000-0000-0000000000a2', 'e2e00000-0000-0000-0000-0000000000c1', 'e2e10000-0000-0000-0000-000000000001', 2, 1),
  ('e2e00000-0000-0000-0000-0000000000a2', 'e2e00000-0000-0000-0000-0000000000c1', 'e2e10000-0000-0000-0000-000000000002', 2, 2),
  ('e2e00000-0000-0000-0000-0000000000a2', 'e2e00000-0000-0000-0000-0000000000c1', 'e2e10000-0000-0000-0000-000000000003', 3, 1),
  ('e2e00000-0000-0000-0000-0000000000a2', 'e2e00000-0000-0000-0000-0000000000c1', 'e2e10000-0000-0000-0000-000000000004', 3, 1),
  ('e2e00000-0000-0000-0000-0000000000a2', 'e2e00000-0000-0000-0000-0000000000c1', 'e2e10000-0000-0000-0000-000000000005', 0, 2),
  ('e2e00000-0000-0000-0000-0000000000a2', 'e2e00000-0000-0000-0000-0000000000c1', 'e2e10000-0000-0000-0000-000000000006', 0, 1),
  ('e2e00000-0000-0000-0000-0000000000a2', 'e2e00000-0000-0000-0000-0000000000c1', 'e2e10000-0000-0000-0000-000000000101', 1, 0),
  ('e2e00000-0000-0000-0000-0000000000a2', 'e2e00000-0000-0000-0000-0000000000c1', 'e2e10000-0000-0000-0000-0000000000ff', 2, 1);

-- ── Champion bets (both correct: champion Brasil, vice Espanha → +75 each) ───
-- Identical bets keep the points tie intact while still exercising scenario 5.7.
INSERT INTO public.champion_bets (user_id, league_id, champion_team, runner_up_team)
VALUES
  ('e2e00000-0000-0000-0000-0000000000a1', 'e2e00000-0000-0000-0000-0000000000c1', 'Brasil', 'Espanha'),
  ('e2e00000-0000-0000-0000-0000000000a2', 'e2e00000-0000-0000-0000-0000000000c1', 'Brasil', 'Espanha');

COMMIT;
