# Task Memory: task_06.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Implement `YourBetCard` component: displays champion/vice picks with flags, "+50 PTS" badge, and "Alterar aposta" button gated on `BET_DEADLINE`.

## Important Decisions

- Component returns `null` early when `has_champion_bet=false` (before any state hooks are declared).
- `getTeamCode` looks up team code from `ALL_COPA_TEAMS` using the team name string stored in `champion_bet.champion_team` / `runner_up_team`.
- Flag images only rendered when `getTeamCode` returns a non-null code (defensive guard).
- `isBeforeDeadline` computed inline at render using `Date.now() < BET_DEADLINE.getTime()`.
- Days remaining uses `Math.floor` (consistent with ChampionBanner pattern).

## Learnings

- `next/image` must be mocked in jsdom tests: `vi.mock('next/image', () => ({ default: function MockImage({src, alt}) { return <img src={src} alt={alt} /> } }))` — same pattern as PreCopaBetModal.test.tsx.
- `vi.spyOn(Date, 'now')` + `vi.restoreAllMocks()` in `afterEach` is the correct pattern for deadline-gated tests (confirmed again from ChampionBanner.test.tsx).

## Files / Surfaces

- `app/ligas/[id]/components/YourBetCard.tsx` — created
- `tests/unit/YourBetCard.test.tsx` — created (10 unit tests)
- `tests/integration/YourBetCard.test.tsx` — created (2 integration tests)

## Errors / Corrections

None. All 12 tests passed on first run; tsc clean.

## Ready for Next Run

- task_06 COMPLETE. Gate for task_09 (page orchestrator) partially satisfied; task_09 still requires tasks 07 and 08.
