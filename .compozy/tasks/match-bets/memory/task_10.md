---
name: task-10-bet-detail-screen
description: Task 10 execution context — Bet detail screen /ligas/[id]/palpites/[matchId]
metadata:
  type: project
---

# Task Memory: task_10.md

## Objective Snapshot

COMPLETED. Built `app/ligas/[id]/palpites/[matchId]/page.tsx` (client component) + child components: `BetHero`, `ScoringCard`, `DistributionCard`, `UnsavedModal`. 20 tests pass, 89.88% statement coverage, TypeScript clean.

## Important Decisions

- Co-located child components in `app/ligas/[id]/palpites/[matchId]/components/`
- Used `useRouter` from `next/navigation` for back navigation
- Dirty state: `inputHome !== String(savedHome ?? '')` OR `inputAway !== String(savedAway ?? '')`
- `String(null ?? '')` = `''` so clean when both inputs are empty and no prediction exists
- After successful PUT: update `savedHome`/`savedAway` to current inputs, show "Salvo!" for 2 seconds
- Modal "Salvar e sair" path: `await performSave()` then `setShowModal(false)` then `router.back()`
- Passed `saving` state (same state var) to UnsavedModal since main save and modal save are mutually exclusive
- Dirty check uses `String(savedHome ?? '')` pattern — handles `null` as `''`

## Files / Surfaces

- `app/ligas/[id]/palpites/[matchId]/page.tsx` — created
- `app/ligas/[id]/palpites/[matchId]/components/BetHero.tsx` — created
- `app/ligas/[id]/palpites/[matchId]/components/ScoringCard.tsx` — created
- `app/ligas/[id]/palpites/[matchId]/components/DistributionCard.tsx` — created
- `app/ligas/[id]/palpites/[matchId]/components/UnsavedModal.tsx` — created
- `tests/unit/BetDetailPage.test.tsx` — created (16 tests)
- `tests/integration/bet-screen.test.tsx` — created (4 tests)

## Learnings

- `vi.mock('next/navigation', () => ({ useRouter: () => ({ back: mockBack }), useParams: () => ({...}) }))` — inline factory avoids per-test `mockReturnValue` calls when params are fixed
- `fireEvent.click(overlay)` correctly triggers overlay's `onClick` without bubbling to dialog (dialog has `e.stopPropagation()`)
- Coverage scoped with `--coverage.include="app/ligas/[id]/palpites/[matchId]/**"` — need `--coverage.thresholds.lines=0` to suppress global threshold failure when scoping
- Error state (`!res.ok` + catch) at lines 119-124 not tested → uncovered lines; acceptable given 89.88% overall stmt coverage

## Ready for Next Run

Task complete. All subtasks checked. No follow-up work identified.
