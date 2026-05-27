# Task Memory: task_02.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Completed. Refactored `GET /api/leagues/[id]` to call `computeRanking()`, slice to top-5 for `ranking`, derive `user_stats` from helper output. Updated test factory + rewrote tie-break test.

## Important Decisions

- `guesses_made` / `guesses_total` are NOT in `RankingFullEntry`; computed separately via filter on `allPredictions` and `finishedMatchMap.size`.
- `finishedMatchMap` kept for `guesses_made` check (match score null-guard) and `guesses_total`.
- `champBetByUser` kept for `has_champion_bet` and `champion_bet` fields.
- `predsByUser` Map removed; `realChamp`/`realVice` block removed (both handled by helper internally).
- `FinishedMatchRow` kept (for `finishedMatchMap` type), updated to include `match_date: string`.
- Cast `(finishedMatches ?? []) as Parameters<typeof computeRanking>[0]['finishedMatches']` used to satisfy TypeScript without importing `RankingMatchInput` explicitly.
- `makeFinishedMatch` in test factory updated with default `match_date: '2026-06-15T15:00:00Z'`.

## Files / Surfaces

- `app/api/leagues/[id]/route.ts` — refactored GET handler
- `tests/unit/league-detail-get-api.test.ts` — factory + tie-break test updated
- `lib/ranking.ts` — consumed as-is (no changes)

## Errors / Corrections

None.

## Ready for Next Run

Task 02 complete. 51 tests pass (39 league-detail-get-api + 12 ranking-helper). TypeScript clean. Lint clean.
