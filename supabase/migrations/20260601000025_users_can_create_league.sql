-- League-creation capability (PRD league-permissions, task_01; ADR-001, ADR-004).
-- Adds the authoritative per-user flag that gates league creation. Every account is
-- born with the capability OFF; only the two operator e-mails are granted it here.
-- This migration is data/schema only — the RLS `leagues_insert` gate, test-league
-- hiding, and the `handle_new_user()` change all live in the next migration (task_02).

-- ── Column ──────────────────────────────────────────────────────────────────
-- NOT NULL DEFAULT false → existing rows backfill to false, new users born false.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS can_create_league BOOLEAN NOT NULL DEFAULT false;

-- ── Grant (one-time, existing accounts only — ADR-004 "UPDATE now") ───────────
-- Idempotent: re-running leaves the flag true; if an operator account does not
-- exist yet the UPDATE simply matches zero rows and does not error. A future
-- signup of an operator e-mail needs a manual re-run of this grant.
UPDATE public.users
   SET can_create_league = true
 WHERE email IN ('hen.leao.rocha@gmail.com', 'henrique.rocha@arkmeds.com');
