# Task Memory: task_08.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
Scrub every api-sports remnant outside `lib/football-api.ts` (already clean from task_03): env keys, the api-sports URL, `ApiFootballFixture`/`mapFixtureStatus` symbols, and stray docs/fixtures. Add a guard test asserting their absence. DONE — verified.

## Important Decisions
- Scrubbed the literal `api-sports` everywhere too (not just the URL/symbols) to satisfy success criterion "zero api-sports references in code, env, or docs". Reworded one comment in `lib/football-api.ts` ("previous third-party paid API integration") and two test comments.
- Deleted three unreferenced api-sports fixture leftovers: `tests/fixtures/api-football-{wc2022-sample,standings-2022-sample,raw}.json` (grep confirmed zero code refs; the openfootball fixtures are the live ones).
- Removed dead `API_FOOTBALL_KEY` from BOTH `.env.example` and the gitignored `.env.local` (no code reads it post task_03). The value in `.env.local` was a real api-sports key now defunct.
- Guard test `tests/unit/no-api-sports-references.test.ts` walks the repo, excludes `.compozy/` (legitimately documents the migration), `node_modules`/`.next`/etc., gitignored `*.local` files, and itself. Patterns built from string fragments + path self-exclusion so the guard doesn't match its own source.
- Rewrote `docs/VALIDACAO-MANUAL.md` sections 1.5, 1.6, and Part 3 to describe the openfootball flow (`OpenfootballMatch` shape, `mapOpenfootballMatch`, score→status derivation, `{ matches: [...] }` body, EN→PT normalization now resolves the old knockout-ingestion limitation).

## Learnings
- The guard must skip `*.local` env files: a developer's gitignored `.env.local` carried a stale `API_FOOTBALL_KEY` and made the test machine-dependent. Guard scope = committed code/env/docs; `.env.example` is the canonical template.

## Files / Surfaces
- `.env.example`, `.env.local` (key removed)
- `lib/football-api.ts` (comment reword only)
- `docs/VALIDACAO-MANUAL.md` (§1.5, §1.6, Part 3)
- `tests/unit/football-api.test.ts`, `tests/unit/sync-team-name-normalization.test.ts` (comment rewords)
- `tests/unit/no-api-sports-references.test.ts` (new guard, 6 tests)
- deleted: `tests/fixtures/api-football-{wc2022-sample,standings-2022-sample,raw}.json`

## Errors / Corrections
- First guard run failed on `.env.local` (gitignored local secret) → added `*.local` skip + removed the dead key from `.env.local`. Re-run green.

## Ready for Next Run
- Verification: guard 6/6; tsc clean; eslint clean on touched files; full suite 51 failed/897 passed — the SAME documented pre-existing baseline (UI LeaguePanelProvider + sync-matches-api task_06 mock gap), none in task_08 surfaces. Awaiting manual review (auto-commit off).
