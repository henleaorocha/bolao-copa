# Task Memory: task_06.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Add phase-unlock banner (UnlockBanner component) to the mata-mata screen gated on `newlyUnlockedPhase`, and a derived dot on Mata-mata nav items in PainelSidebar and BottomTabBar. Signal routed through `LeaguePanelContext`. COMPLETED.

## Important Decisions

- **UnlockBanner is a separate component** from `StatusBanner`. The pre-launch `StatusBanner` always renders; `UnlockBanner` is gated on `newlyUnlockedPhase`. This avoids breaking existing tests and keeps the two concerns separate.
- **Unlock signal flow**: `mata-mata/page.tsx` calls `setMataMataUnlock(data.newlyUnlockedPhase)` after each bracket fetch. The context retains the last known value; it persists across nav (by design per ADR-006 — no "seen" tracking).
- **Nav dot via prop, not context consumer**: `PainelSidebar` and `BottomTabBar` receive `mataMataUnlock?: boolean` as a prop from the layout. The layout reads it from `useLeaguePanel()`. Nav components themselves don't access context directly.
- **`showDot` field in NAV_ITEMS/TABS arrays**: cleaner than label-string comparisons; only Mata-mata has `showDot: mataMataUnlock`.
- **`data-testid="mata-mata-unlock-dot"`** used on the dot element for testability.

## Learnings

- **Stable vi.fn() in mocks for dep-array hooks**: When mocking a hook that returns a function used in a `useEffect` dependency array, the mock factory MUST return a stable (closure-captured) function reference — not `vi.fn()` inline in the factory return. A new `vi.fn()` on every call makes the dependency unstable, causing infinite effect re-runs and exhausting `mockResolvedValueOnce` mocks. Fix: `vi.mock('...', () => { const fn = vi.fn(); return { useHook: () => ({ fn }) } })`.

## Files / Surfaces

- `app/ligas/[id]/mata-mata/components/UnlockBanner.tsx` — NEW
- `app/ligas/[id]/league-panel-context.tsx` — added `mataMataUnlock: KnockoutPhase | null` + `setMataMataUnlock`
- `app/ligas/[id]/mata-mata/page.tsx` — added `useLeaguePanel`, calls `setMataMataUnlock`, renders `<UnlockBanner>`
- `app/ligas/[id]/components/PainelSidebar.tsx` — added `mataMataUnlock?: boolean` prop + `showDot` in NAV_ITEMS
- `app/ligas/[id]/components/BottomTabBar.tsx` — added `mataMataUnlock?: boolean` prop + `showDot` in TABS + icon wrapper div
- `app/ligas/[id]/layout.tsx` — passes `mataMataUnlock={!!mataMataUnlock}` to PainelSidebar and BottomTabBar
- `tests/unit/mata-mata.test.tsx` — added `vi.mock` for league-panel-context + 10 new tests (UnlockBanner + page integration)
- `tests/unit/static-panel-components.test.tsx` — added 4 BottomTabBar unlock dot tests
- `tests/unit/navigation-shell.test.tsx` — added 5 PainelSidebar unlock dot tests

## Errors / Corrections

- First mock iteration used `vi.fn()` inline: `useLeaguePanel: () => ({ setMataMataUnlock: vi.fn() })`. This created a new function reference on every render, making the effect re-run repeatedly and exhausting `mockResolvedValueOnce`. Fixed by capturing inside factory: `const fn = vi.fn(); return { useLeaguePanel: () => ({ setMataMataUnlock: fn }) }`.

## Ready for Next Run

task_06 is COMPLETE. Next: task_07 (pure scoring engine `lib/scoring.ts` — no dependencies, standalone).
