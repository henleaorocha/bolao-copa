# Task Memory: task_06.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Ranking page at `app/ligas/[id]/ranking/page.tsx` — fetch-on-mount, loading/error states, and screen composition (Podium → PrizesStrip → "Sua posição" card → RankingTable). **Completed.**

## Important Decisions

- **PrizesStrip always rendered** (not conditionally rendered at the JSX level): `PrizesStrip` already returns `null` when `prizes` is `null/falsy`, so calling `<PrizesStrip prizes={league?.prizes ?? null} />` unconditionally is correct and avoids duplicate conditional logic.
- **AbortError handling**: On abort, `setError` and `setLoading(false)` are NOT called — the component stays in loading state. This matches the mata-mata pattern and ensures unmounted components don't trigger state updates.
- **"Sua posição" card hidden via conditional render** (`{myEntry && ...}`), not CSS. `myEntry` is derived from `ranking.find(e => e.user_id === currentUser.id)`, returns `null` if user not found or `currentUser` is null.
- **Test mocking**: used `vi.mock('@/app/ligas/[id]/league-panel-context', () => ({ useLeaguePanel: vi.fn() }))` + `vi.mocked(useLeaguePanel).mockReturnValue(...)` per test. This is the cleanest configurable-context pattern in Vitest and avoids `vi.hoisted()` complexity.

## Learnings

- `vi.fn()` inside a `vi.mock` factory is safe — the factory runs during module initialization (after hoisting), not at hoist time, so `vi` is available.
- Dynamic lazy import (`async function importRankingPage()`) is required when the component uses mocked modules, to ensure mock registration is processed before the module loads.
- The layout (`app/ligas/[id]/layout.tsx`) already applies `overflow-x-hidden` on `<main>`, so the page wrapper does not need to add it; `max-w-full` is sufficient.

## Files / Surfaces

- **Created**: `app/ligas/[id]/ranking/page.tsx`
- **Created**: `tests/unit/ranking-page.test.tsx` — 13 tests, all passing; 96.55% statement coverage, 88.46% branch coverage on the page.

## Errors / Corrections

None.

## Ready for Next Run

- **task_07** (nav activation): The `/ligas/[id]/ranking` route now exists. `BottomTabBar`, `PainelSidebar`, and `RankingCard` can safely set `href="/ligas/[id]/ranking"`. Use `usePathname()` (from `next/navigation`) to derive the active state — already used in `navigation-shell.test.tsx`.
