# Task Memory: task_02.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

COMPLETED. `GET /api/leagues/[id]/bracket` endpoint + `lib/bracket.ts` pure helper. 49 tests pass, 95.6% coverage.

## Important Decisions

- Pure helper lives in `lib/bracket.ts` (not co-located in route) — makes it importable by future tasks (task_06, etc.).
- `PHASE_LABELS` exported from `lib/bracket.ts` so the screen (task_03) can use them without re-defining.
- `newlyUnlockedPhase` tracks the **latest** phase in `PHASE_ORDER` with an open un-bet slot — iterating and overwriting gives correct "most recently opened" semantics.
- `status='finished'` takes priority over the 1h-window check (finished is checked first in the if-chain).

## Learnings

- Unit tests for `buildBracketResponse` must use **exact skeleton calendar-key dates** (e.g. `'2026-06-28T21:00:00Z'`) + explicit `nowMs` arg — `resolveSlot` matches by exact `match_date`+`venue` string, so dynamic `Date.now()+3h` strings will never resolve to any slot.
- The chainable query mock pattern from `league-matches-api.test.ts` works unchanged for the predictions `.select().eq().eq().in()` chain.

## Files / Surfaces

- `lib/bracket.ts` — new pure helper + all view types
- `app/api/leagues/[id]/bracket/route.ts` — new endpoint
- `tests/unit/bracket-helper.test.ts` — 23 unit tests for pure helper
- `tests/unit/league-bracket-api.test.ts` — 3 integration tests for endpoint

## Errors / Corrections

- First test draft used dynamic `Date.now()+3h` for `match_date` — slot never resolved because `resolveSlot` requires exact skeleton dates. Fixed by using skeleton dates + explicit `nowMs`.

## Ready for Next Run

- task_03 (screen): fetch `GET /api/leagues/[id]/bracket` → render `BracketResponse`. Import view types + `PHASE_LABELS` from `@/lib/bracket`.
- task_06 (unlock banner): reads `newlyUnlockedPhase` from the bracket response; no endpoint changes needed.
