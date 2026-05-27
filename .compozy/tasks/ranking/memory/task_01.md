# Task Memory: task_01.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

COMPLETED. Created `lib/ranking.ts` with pure `computeRanking()` + input interfaces; added `RankingFullEntry` to `lib/api/types.ts`; wrote 12 passing unit tests in `tests/unit/ranking-helper.test.ts`.

## Important Decisions

- `RankingMatchInput` has optional `home_team?` / `away_team?` fields (not in TechSpec interface but required by `scoreChampion` to derive realChamp/realVice from the final match). Downstream callers must include these when providing the final match row.
- `mostRecentExactDate` is internal-only (`MemberAccum` type), not returned in `RankingFullEntry`.
- `correct_outcomes` is incremented when `matchPoints > 0` (captures both exact and correct-direction-only via `scoreGroup`/`scoreKnockout` returning > 0).
- Null `full_name` treated as empty string in `localeCompare` (per ADR-003).
- KNOCKOUT_PHASES set defined locally in `lib/ranking.ts` (mirrors `route.ts:53`).

## Files / Surfaces

- `lib/ranking.ts` — created (pure helper + interfaces + re-exports `RankingFullEntry`)
- `lib/api/types.ts` — added `RankingFullEntry` after `RankingEntry` (line 82)
- `tests/unit/ranking-helper.test.ts` — created (12 tests, all passing)

## Errors / Corrections

- TechSpec's `RankingMatchInput` lacked `home_team`/`away_team` but champion bet derivation requires them. Added as optional fields. Task_02/03 callers must select these columns from the matches query.

## Ready for Next Run

Task 02 can start. It refactors `GET /api/leagues/[id]` to call `computeRanking()` and slice to 5. Key notes:
- The route must add `match_date`, `home_team`, `away_team` to its finished-matches query (currently missing `match_date` and will need all three for champion derivation).
- The `joined_at` sort at route.ts:266-273 must be replaced by the helper's built-in comparator.
- Response shape stays identical; only tie-break ordering changes.
