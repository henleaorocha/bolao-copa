# Task Memory: task_02.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

GroupChips client component (`app/ligas/[id]/components/GroupChips.tsx`) + unit tests (`tests/unit/GroupChips.test.tsx`). Complete.

## Important Decisions

- Used `lg:hidden` to hide on desktop (lg = 1024px+); matches the existing breakpoint convention in `PainelSidebar.tsx` (`hidden lg:flex`).
- Used `aria-pressed` boolean on each button to track active state; allows the test to assert via `toHaveAttribute('aria-pressed', 'true'/'false')`.
- `document.getElementById(id)?.scrollIntoView(...)` — optional chaining is the safe-degradation mechanism when anchor is absent.
- Inner `w-max` flex container inside `overflow-x-auto` outer div is the standard Tailwind pattern to prevent horizontal page overflow while allowing chip-row internal scroll.

## Learnings

- `vitest.config.ts` coverage includes only `lib/**` + `app/api/**`, so the global threshold never fires for components under `app/ligas/`. To check component coverage, pass `--coverage.include` explicitly on the CLI.
- `vi.spyOn(document, 'getElementById')` in `beforeEach` returning `null` is the right mock baseline; individual tests override it with `mockImplementation` for the positive case.

## Files / Surfaces

- `app/ligas/[id]/components/GroupChips.tsx` — created (client component)
- `tests/unit/GroupChips.test.tsx` — created (4 unit tests, jsdom)

## Errors / Corrections

None.

## Ready for Next Run

- Task 03 (StandingsGrid + GroupCard) must pass `groups` as `string[]` to `<GroupChips>` and attach `id="grupo-{letter.toLowerCase()}"` to each `GroupCard`. The anchor contract is `grupo-a` … `grupo-l`.
