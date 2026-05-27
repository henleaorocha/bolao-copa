# Task Memory: task_05.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Wire `PreCopaBetModal` into `app/ligas/[id]/page.tsx` with sequential modal flow:
- First-visit: welcome modal → (onComplete) → bet modal
- Return-visit: bet modal directly on load
- Deadline passed or bet already placed: no bet modal

## Important Decisions

- **`isBetDeadlinePassed` at module level (not inside component)**: Computed as `const isBetDeadlinePassed = new Date() > BET_DEADLINE` at module level. This avoids `react-hooks/exhaustive-deps` linter warning and allows deadline-based tests to work via module-level mock of `@/lib/copa-teams` (the mock is applied before module load, so the constant captures the mocked value).
- **Two test files for deadline split**: `league-page-bet-modal.test.tsx` (real BET_DEADLINE, future) and `league-page-bet-modal-deadline.test.tsx` (mocked BET_DEADLINE to past). Fake timers avoided per shared learning.
- **`has_champion_bet: true` in base `mockLeague`** of `league-detail.test.tsx`: Prevents existing tests from triggering the bet modal on load, preserving all pre-existing test behavior.

## Learnings

- `vi.mock('@/lib/copa-teams', ...)` in a test file correctly overrides a module-level constant in the imported page module, because Vitest applies mocks before module evaluation per test file.
- Existing test `removes LeagueWelcomeModal from DOM when onComplete fires without re-fetching` is the pre-existing failure in `league-detail.test.tsx` — my changes didn't affect it (the PATCH call count stays the same regardless of bet modal logic, since `has_champion_bet: true` in updated `mockLeague` prevents `setShowBetModal(true)` from being called).

## Files / Surfaces

- `app/ligas/[id]/page.tsx` — added `isBetDeadlinePassed` (module-level), `showBetModal` state, useEffect logic, onComplete update, `<PreCopaBetModal>` render
- `tests/unit/league-detail.test.tsx` — added `has_champion_bet: true` to `mockLeague`, added `PreCopaBetModal` mock
- `tests/unit/league-page-bet-modal.test.tsx` — NEW: 10 unit + integration tests (normal deadline)
- `tests/unit/league-page-bet-modal-deadline.test.tsx` — NEW: 2 tests for deadline-passed scenarios

## Errors / Corrections

No implementation errors. Linter warning (`react-hooks/exhaustive-deps`) was fixed by moving `isBetDeadlinePassed` to module level.

## Ready for Next Run

task_05 is the final task. All 5 tasks complete. Entire feature is uncommitted — ready for a single commit or PR.
