-- ============================================================================
-- Validation preset state: PRE-CUP (nothing kicked off yet)
-- ----------------------------------------------------------------------------
-- Part of the pre-launch validation harness (PRD football-api-ingestion,
-- task_09 / ADR-009). Drives scenarios 1 (invite/join — the run creates its own
-- private league at this state), 2 (public/private visibility), 3 (bet saved)
-- and 4 (deadline lock + champion bet before BET_DEADLINE) of VALIDACAO-MANUAL.md.
--
-- TARGET: a DISPOSABLE database (local `supabase start`). NEVER apply against
-- production — `public.matches` is GLOBAL.
-- Apply: docker exec -i supabase_db_bolao-copa psql -U postgres -d postgres -f - < this-file
--
-- All matches scheduled in the future. One match sits inside the 1h deadline
-- window (now()+30min → locked) and one comfortably outside (now()+3h → open)
-- so scenario 4 can show both behaviours against a fixed clock.
-- ============================================================================

BEGIN;

-- ── Idempotent cleanup (safe to re-run) ─────────────────────────────────────
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

-- ── Two participants ────────────────────────────────────────────────────────
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

-- ── Leagues: pilot (private) + public ───────────────────────────────────────
INSERT INTO public.leagues (id, name, description, access_type, invite_token, created_by)
VALUES
  ('e2e00000-0000-0000-0000-0000000000c1', 'Bolão de Validação (Piloto)',
   'Liga piloto da validação pré-lançamento', 'private',
   'val-token-piloto-0001', 'e2e00000-0000-0000-0000-0000000000a1'),
  ('e2e00000-0000-0000-0000-0000000000c2', 'Bolão Público de Validação',
   'Liga pública usada no cenário de descoberta', 'open',
   'val-token-publico-0002', 'e2e00000-0000-0000-0000-0000000000a1');

INSERT INTO public.league_members (league_id, user_id, role) VALUES
  ('e2e00000-0000-0000-0000-0000000000c1', 'e2e00000-0000-0000-0000-0000000000a1', 'admin'),
  ('e2e00000-0000-0000-0000-0000000000c1', 'e2e00000-0000-0000-0000-0000000000a2', 'member');

-- ── Matches (all scheduled / future) ────────────────────────────────────────
INSERT INTO public.matches
  (id, external_id, home_team, home_flag, away_team, away_flag,
   match_date, phase, "group", venue, city, status, home_score, away_score)
VALUES
  -- OPEN: kickoff > 1h away → betting allowed (scenario 3 / 4.1).
  ('e2e10000-0000-0000-0000-000000000001', 'val-open-grp', 'Brasil', 'br', 'Marrocos', 'ma',
   now() + interval '3 hours', 'group', 'C', 'MetLife Stadium', 'East Rutherford', 'scheduled', NULL, NULL),
  -- LOCKED: kickoff < 1h away → DEADLINE_PASSED (scenario 4.2).
  ('e2e10000-0000-0000-0000-000000000002', 'val-locked-grp', 'Espanha', 'es', 'Portugal', 'pt',
   now() + interval '30 minutes', 'group', 'B', 'SoFi Stadium', 'Inglewood', 'scheduled', NULL, NULL),
  -- A second open match a few days out (extra editable card).
  ('e2e10000-0000-0000-0000-000000000003', 'val-future-grp', 'Argentina', 'ar', 'França', 'fr',
   now() + interval '5 days', 'group', 'J', 'Estadio Azteca', 'Cidade do México', 'scheduled', NULL, NULL);

-- ── Deterministic predictions (both users) + champion bets ──────────────────
-- Pre-cup predictions on the open matches (no scoring yet — all scheduled).
INSERT INTO public.predictions
  (user_id, league_id, match_id, predicted_home_score, predicted_away_score)
VALUES
  ('e2e00000-0000-0000-0000-0000000000a1', 'e2e00000-0000-0000-0000-0000000000c1', 'e2e10000-0000-0000-0000-000000000001', 2, 1),
  ('e2e00000-0000-0000-0000-0000000000a1', 'e2e00000-0000-0000-0000-0000000000c1', 'e2e10000-0000-0000-0000-000000000003', 1, 0),
  ('e2e00000-0000-0000-0000-0000000000a2', 'e2e00000-0000-0000-0000-0000000000c1', 'e2e10000-0000-0000-0000-000000000001', 1, 0),
  ('e2e00000-0000-0000-0000-0000000000a2', 'e2e00000-0000-0000-0000-0000000000c1', 'e2e10000-0000-0000-0000-000000000003', 2, 1);

INSERT INTO public.champion_bets (user_id, league_id, champion_team, runner_up_team)
VALUES
  ('e2e00000-0000-0000-0000-0000000000a1', 'e2e00000-0000-0000-0000-0000000000c1', 'Brasil', 'Espanha'),
  ('e2e00000-0000-0000-0000-0000000000a2', 'e2e00000-0000-0000-0000-0000000000c1', 'Argentina', 'Brasil');

COMMIT;
