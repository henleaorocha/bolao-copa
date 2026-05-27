# Task Memory: task_01.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Create static Copa 2026 team data (`lib/copa-teams.ts`) and extend API types (`lib/api/types.ts`). Status: **complete**.

## Important Decisions

- PRD stated 32 nations; FIFA 2026 is a 48-team tournament. Used all 48 teams from `designReferences/data.jsx` as the authoritative reference. Comment in code documents this correction.
- Escócia uses `gb-sct` (Saltire flag) following the same logic as Inglaterra (`gb-eng`) — both need subdivision codes for correct flagcdn.com rendering.

## Learnings

- `tests/unit/api-responses.test.ts` uses `satisfies LeagueDetail` — required adding `has_champion_bet: false` to that fixture when extending the interface.
- 4 pre-existing test failures exist in `tests/unit/get-leagues-hub.test.ts` (3) and `tests/unit/league-detail.test.tsx` (1). Confirmed pre-existing via `git stash` regression check. Do not fix in this feature branch without a separate task.
- Coverage global threshold (80%) fails when running only `copa-teams.test.ts --coverage` because the scope includes all `lib/**` and `app/api/**` files. The file itself is 100% covered. Run full suite for real coverage validation.

## Files / Surfaces

- `lib/copa-teams.ts` — created (new)
- `lib/api/types.ts` — added `ChampionBet` interface and `has_champion_bet: boolean` to `LeagueDetail`
- `tests/unit/copa-teams.test.ts` — created (new, 8 tests)
- `tests/unit/api-responses.test.ts` — added `has_champion_bet: false` to `LeagueDetail` fixture

## Errors / Corrections

- First `tsc --noEmit` run failed: `api-responses.test.ts` had a `LeagueDetail satisfies` fixture missing `has_champion_bet`. Fixed by adding the field to the fixture.

## Ready for Next Run

Task complete. Diff is uncommitted and ready for manual review.
