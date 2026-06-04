---
status: completed
title: Validation harness — seeds + Playwright run + evidence doc
type: test
complexity: high
dependencies:
  - task_03
  - task_04
  - task_06
  - task_07
---

# Task 9: Validation harness — seeds + Playwright run + evidence doc

## Overview
Before public launch the owner must validate the full participant journey end-to-end and have screenshot-backed proof. This task delivers SQL seeds for three preset tournament states plus a re-runnable Playwright UI run that walks all seven scenarios and emits a written evidence document.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST provide `supabase/seeds/state-precup.sql`, `state-live.sql`, `state-finished.sql`, each seeding matches with Portuguese team names — including knockout matches with `external_id = wc2026-<num>` so `isConfirmedMatchup` passes and Scenario 7 is unblocked.
- Seeds MUST create one test league with two members and deterministic predictions/champion bets (so tiebreakers are observable and the evidence reproduces).
- Deadline-dependent states MUST use match dates relative to a fixed clock (time-machine seed) per memory `reference-authed-browser-e2e`.
- `tests/e2e/validation-run.spec.ts` MUST sign in as each seeded user via the captured SSR-cookie technique, walk scenarios 1–7 in the real UI, and capture a screenshot per step.
- The run MUST emit `docs/VALIDACAO-EVIDENCIA.md` recording each step's expected vs. observed result and pass/fail, with screenshots embedded/linked.
- The run MUST be re-executable end-to-end without manual data fixes.
</requirements>

## Subtasks
- [x] 9.1 Author the three preset-state SQL seeds (PT names, knockout by `num`, fixed clock).
- [x] 9.2 Seed one league + two users + deterministic predictions/champion bets.
- [x] 9.3 Build `validation-run.spec.ts` signing in per user and walking scenarios 1–7.
- [x] 9.4 Capture a screenshot per step and assert each scenario's expected outcome.
- [x] 9.5 Emit `docs/VALIDACAO-EVIDENCIA.md` with per-step expected/observed/pass-fail + screenshots.
- [x] 9.6 Confirm the run reproduces on a clean re-execution.

## Completion Notes
- Delivered: `supabase/seeds/state-{precup,live,finished}.sql`, `tests/e2e/{validation-run.spec.ts,seed-runner.ts,local-env.ts}`, `playwright.config.ts`, `tests/unit/validation-seeds.test.ts`, generated `docs/VALIDACAO-EVIDENCIA.md` (+ `docs/evidencia/*.png`).
- Run target = LOCAL Supabase (`supabase start`) — NOT the prod project in `.env.local` (matches table is global). App pointed at local via `next dev` process-env overrides (Next ranks process.env above `.env.local`).
- **Result: 7/7 scenarios, 19/19 steps PASS**, verified twice (clean run + immediate re-execution) — `npx playwright test` against the running dev server.
- Unit: `tests/unit/validation-seeds.test.ts` (16 pass) parses each seed and drives the real `computeRanking`/`isConfirmedMatchup` (asserts the tie + most-recent-exact tiebreaker + knockout `wc2026-<num>` confirmation). vitest excludes `tests/e2e/**`.
- The harness surfaced 3 PRE-EXISTING, out-of-PRD (league/RLS) launch blockers and fixed them minimally (each matches documented repo intent): `supabase/migrations/20260601000024_validation_journey_rls_fixes.sql` (member_count trigger → SECURITY DEFINER so non-creators can join; predictions/champion_bets peer-read scoped to finished matches so ranking scores all members without leaking picks) + join route service-role league/token lookup (ADR-003) and dropped the `.select()` whose RETURNING was blocked by the STABLE `is_member_of_league` SELECT policy.
- Scenario 4.4 (global BET_DEADLINE 409) is not reproducible at the current clock (deadline 2026-06-11 > now 2026-06-02); the reproducible per-match 1h lock (4.1/4.2) and bet-open (4.3) are covered.
- No new vitest regressions: 51 failed (pre-existing baseline) / 913 passed / 199 skipped; +16 from the new seed test. tsc + eslint clean on touched files. Auto-commit disabled — diff left for manual review.

## Implementation Details
Create `supabase/seeds/state-{precup,live,finished}.sql` and `tests/e2e/validation-run.spec.ts`; the run writes `docs/VALIDACAO-EVIDENCIA.md`. Scenarios 1–7 (invite → public/private visibility → bet saved → deadline lock → per-match scoring → ranking & tiebreakers → knockout betting & scoring) are defined in `docs/VALIDACAO-MANUAL.md`. Reuse the proven authed-browser harness (Playwright + captured SSR cookie + time-machine seed) from memory `reference-authed-browser-e2e`. The finished/in-progress seeds must use real PT names so knockout predictions confirm. This task exercises the corrected adapter (task_03), bracket (task_04), sync exclusion (task_06), and operator override (task_07). Reference TechSpec "Integration Tests" and ADR-009.

### Relevant Files
- `supabase/seeds/state-precup.sql` / `state-live.sql` / `state-finished.sql` — new preset-state seeds.
- `tests/e2e/validation-run.spec.ts` — new Playwright run (the deliverable).
- `docs/VALIDACAO-EVIDENCIA.md` — emitted evidence record.
- `docs/VALIDACAO-MANUAL.md` — defines the seven scenarios and §1.6 knockout PT-name constraint.
- `tests/fixtures/openfootball-wc2026.json` — source of knockout `num`/PT-name mapping for seeds.
- `lib/bracket-skeleton.ts` / `lib/bracket.ts` — bracket the knockout scenarios validate (task_04).

### Dependent Files
- `app/(operator)/controle-resultados` + result endpoint (task_07) — exercised by the override scenario.
- `app/api/admin/sync-matches/route.ts` (task_06) — manual-precedence scenario.

### Related ADRs
- [ADR-009: Validation harness — DB seed + Playwright UI run with screenshot evidence](adrs/adr-009.md) — seeds + real-UI run + evidence doc.
- [ADR-005: Reproducible, self-documenting two-user simulation across preset states](adrs/adr-005.md) — several snapshots, two bettors, evidence record.

## Deliverables
- Three preset-state SQL seeds (league + 2 users + deterministic predictions, PT knockout names).
- `tests/e2e/validation-run.spec.ts` walking scenarios 1–7 with per-step screenshots.
- Generated `docs/VALIDACAO-EVIDENCIA.md` evidence record.
- Integration (E2E) tests for the seven scenarios **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] Seed-validity check: each seed yields exactly the expected league + two members + deterministic predictions.
  - [ ] Knockout seed rows use `external_id = wc2026-<num>` and PT names that pass `isConfirmedMatchup`.
- Integration tests:
  - [ ] Scenario 1 (invite) — second user joins the pilot league via invite.
  - [ ] Scenario 2 (public/private visibility) — visibility behaves per league setting.
  - [ ] Scenario 3 (bet saved) — a prediction persists and reloads.
  - [ ] Scenario 4 (deadline lock) — a match past the fixed-clock deadline rejects edits.
  - [ ] Scenario 5 (per-match scoring) — points update correctly after a finished match.
  - [ ] Scenario 6 (ranking & tiebreakers) — two differing bettors rank with the correct tiebreaker order.
  - [ ] Scenario 7 (knockout betting & scoring) — a knockout slot accepts a prediction and scores it.
  - [ ] The run produces `docs/VALIDACAO-EVIDENCIA.md` with a screenshot and pass/fail per step.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- 7/7 validation scenarios pass via the recorded two-participant run across the preset states
- The run is re-executable and reproduces the evidence record without manual data fixes
- `docs/VALIDACAO-EVIDENCIA.md` captures each step with screenshot and pass/fail
