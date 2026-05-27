# Task Memory: task_04.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Build `PreCopaBetModal` component — 3-step fullscreen modal for champion/vice-champion selection.

## Important Decisions

- Component was already fully implemented from a prior run. Only the unit tests were missing.
- Removed fake timers for the "Fecha em X dias" test — using real-time calculation is safe because `BET_DEADLINE` (June 11, 2026) is far enough in the future that the test is stable within any single run.
- jsdom normalizes inline colors: `#FFC72C` → `rgb(255, 199, 44)`, `rgba(255,255,255,0.4)` → `rgba(255, 255, 255, 0.4)` (spaces after commas). Progress indicator style assertions must use the normalized form.
- Used `{ delay: null }` was not needed after switching away from fake timers; standard `userEvent.setup()` works fine.

## Learnings

- `vi.useFakeTimers()` + `waitFor()` deadlocks in component tests: `waitFor` internally uses `setTimeout`, so fake time must be advanced for it to resolve. Avoiding fake timers is simpler when the date-under-test is a fixed future constant.
- jsdom color normalization: hex colors and rgba strings written without spaces are normalized with spaces. Test assertions must match the normalized form, not the source string.

## Files / Surfaces

- `components/PreCopaBetModal.tsx` — 3-step modal, already complete, untracked
- `next.config.ts` — `flagcdn.com` added to `images.remotePatterns`, already done, modified
- `tests/unit/PreCopaBetModal.test.tsx` — **created in this run**, 21 unit tests, all passing

## Errors / Corrections

- Initial progress indicator assertions used `'#FFC72C'` — failed because jsdom normalizes to `'rgb(255, 199, 44)'`. Fixed.
- Initial "Fecha em X dias" test used `vi.useFakeTimers()` + `navigateToStep3` — timed out because `waitFor` blocked on fake timers. Fixed by removing fake timers.

## Ready for Next Run

- task_04 is complete: component + next.config update + 21 unit tests all passing.
- task_05 can proceed: `league.has_champion_bet` is available from GET response; `PreCopaBetModal` is at `@/components/PreCopaBetModal`.
