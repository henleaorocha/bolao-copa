---
status: completed
---

# Task Memory: task_03.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Extend `GET /api/leagues/[id]` to return `prizes` (from DB), `user_stats` (stub zeros), and `ranking` (top-5 by joined_at, RankingEntry shape, points: 0). No new endpoint; all changes in the existing GET handler.

## Important Decisions

- `prizes` comes from `leagueResult.data` via spread after adding it to the SELECT string — no separate variable needed.
- `ranking` derivation uses `.slice()` before `.sort()` to avoid mutating the `members` array.
- Members fetched from DB are already ordered by `joined_at ASC`, but the in-memory sort is kept for correctness per the TechSpec.

## Learnings

- `MOCK_LEAGUE` in `league-detail-get-api.test.ts` must include `prizes: null` so that mock league data matches what the real DB returns after adding `prizes` to the SELECT.
- Pre-existing lint errors in `tests/integration/leagues-detail.test.ts` (lines 21, 25, 29 — `any` on session vars) are unrelated to this task; ESLint exit code is still 0 because the global config does not treat errors as exit-1 for the full project run.

## Files / Surfaces

- `app/api/leagues/[id]/route.ts` — added `prizes` to SELECT, added `user_stats` stub and `ranking` derivation, updated response object
- `tests/unit/league-detail-get-api.test.ts` — added `prizes: null` to MOCK_LEAGUE; added new describe block with 8 new tests
- `tests/integration/leagues-detail.test.ts` — added one new `it` block asserting prizes/user_stats/ranking in HTTP 200 response

## Errors / Corrections

None.

## Ready for Next Run

Task complete. 41 unit tests pass (14 in league-detail-get-api, 27 in api-responses). tsc clean. task_08 (StatsRow, PrizesStrip, RankingCard) is unblocked and may consume the extended API response.
