# Task Memory: task_09.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
Validation harness: 3 preset-state SQL seeds + Playwright run walking scenarios 1–7 + emitted `docs/VALIDACAO-EVIDENCIA.md`. Local Supabase is the disposable target (NOT the remote/prod in .env.local — `matches` is global, seeding prod would corrupt live data).

## Important Decisions
- Run target = LOCAL supabase (`supabase start`; container `supabase_db_bolao-copa`; keys via `supabase status -o env`). Seeds applied via `docker exec ... psql -U postgres` (auth.users insert needs superuser; PostgREST/service-role can't write auth schema). No `pg` npm dep added.
- Auth users seeded directly in `auth.users` with `extensions.crypt('Validacao123!', extensions.gen_salt('bf'))`; token cols set to '' (GoTrue scan). Trigger `handle_new_user` auto-creates public.users + joins main league `...0001`. Verified password sign-in works against local GoTrue.
- Fixed UUIDs so reseeding keeps ids stable: users a1(Ana)/a2(Bruno) `e2e00000-…-0000000000a1/a2`; leagues pilot(private) `…c001` token `val-token-piloto-0001`, public(open) `…c002`; matches `e2e10000-…`.
- Finished-state tiebreaker design: A & B tie at 135 pts (60 match + 75 champion each); both have 1 exact; A's exact on SF (later date) beats B's exact on g1 (earlier) → demonstrates ranking criterion #3 (most-recent exact). A SF exact=30 covers 7.3; B final outcome×4=20 covers 7.4; A final wrong=0 covers 5.4; A g2 0x0 draw covers 5.3; B g1 exact covers 5.1.
- Spec drives real UI for screenshots AND asserts via real route handlers (fetch from authed page context, httpOnly cookie auto-attached) per memory reference-authed-browser-e2e — robust vs brittle form-clicking.
- Spec guarded by `VALIDATION_BASE_URL`; skips cleanly when app not running so it never breaks `npm test` (Playwright specs aren't picked up by vitest anyway).

## Learnings
- BET_DEADLINE = 2026-06-11T21:00Z (future vs system clock 2026-06-02) → champion bets OPEN now; scn 4.4 (global bet-deadline 409) NOT reproducible at current clock — record honestly. Per-match 1h deadline (scn 4.1/4.2) IS reproducible via now()±interval.
- Success envelope `{status:'success', data, timestamp}`; errors `{status:'error', error, code, statusCode}`.
- matches cols: external_id, venue, city, home_flag, away_flag (mig 018), is_manual/manual_updated_at (023). phase CHECK includes legacy '4th'.

## Files / Surfaces
- NEW: supabase/seeds/state-{precup,live,finished}.sql, tests/e2e/validation-run.spec.ts, tests/e2e/seed-runner.ts, playwright.config.ts, docs/VALIDACAO-EVIDENCIA.md, tests/unit/validation-seeds.test.ts

## Errors / Corrections
- Finished-seed tie bug: Ana's g6 1x0 accidentally matched real 1x0 → 2nd exact → 140≠135. Fixed to 2x0 (outcome). Always re-verify scoring with the real `computeRanking`, not by hand.
- Join 500 root cause was NOT the trigger alone: `.insert().select()` RETURNING blocked by STABLE `is_member_of_league` SELECT policy. Dropped `.select()`. Trigger SECURITY DEFINER still needed for member_count to reach 2.
- Env/sandbox: foreground `next dev`/`playwright` get SIGKILLed (exit 144) when the Bash call returns; run the dev server as a detached background task and point Playwright at it via `VALIDATION_BASE_URL`. Applying a migration to a running stack needs PostgREST restart or `supabase db reset`.

## Ready for Next Run
- task_09 COMPLETE. Harness re-runs via: `supabase start` → `next dev` (local env) → `npx playwright test`. FOLLOW-UP (not done, out of scope): `app/join/page.tsx` still reads private league with user client → shows "Liga não encontrada" for private invites (the JOIN action itself works via the fixed route).
