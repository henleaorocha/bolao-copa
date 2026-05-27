---
name: task-09-palpites-page
description: Execution memory for task_09 — Palpites list page at /ligas/[id]/palpites (COMPLETED)
metadata:
  type: project
---

# Task Memory: task_09.md — COMPLETED

## Objective Snapshot

Created `app/ligas/[id]/palpites/page.tsx` (client component) with full Palpites list functionality:
- Fetches all group-stage matches on mount (`GET /api/leagues/[id]/matches?phase=group`)
- Client-side date+group filters (single fetch, no re-fetch on filter change)
- Match list grouped by date with section headers
- `PalpitesFilters` component: date tabs (Todos/Hoje/Amanhã with counts) + group chips (TODOS, GRUPO A–L)
- `MatchRow` component: group badge, time, home/away teams with flags, score inputs, status badge, Detalhes link
- "Salvar todos" CTA: batch PUT via `Promise.allSettled`, optimistic badge update to PALPITADO

## Files Created

- `app/ligas/[id]/palpites/page.tsx`
- `app/ligas/[id]/palpites/components/PalpitesFilters.tsx`
- `app/ligas/[id]/palpites/components/MatchRow.tsx`
- `tests/unit/PalpitesPage.test.tsx` — 24 tests passing
- `tests/integration/palpites-page.test.tsx` — 6 tests passing

## Important Decisions

- **Client-side filtering** — single fetch on mount, filters applied via `useMemo`. Faster UX, no extra API calls.
- **Parallel PUT** (`Promise.allSettled`) for "Salvar todos" — faster batch save.
- **Optimistic UI** — after save, `setAllMatches` updates prediction field; MatchRow re-renders with PALPITADO badge.
- `isUnsaved()` helper: match is unsaved when both inputs are filled, no saved prediction OR values differ from saved.
- `next/link` mock must forward `...rest` props to pass `data-testid` through in tests.

## Test Results

- 30 tests total (24 unit, 6 integration) — all passing
- Coverage: 91.66% stmts, 84.09% branches, 93.96% lines (all ≥ 80% threshold)
- `tsc --noEmit`: clean

## Errors / Corrections

- TypeScript: `id` was specified twice in `makeMatch` factory (explicit + spread). Fixed by removing explicit `id:` assignment.
- `next/link` mock needed `...rest` spread to forward `data-testid` props.

## Ready for Next Run

- task_10 (Bet detail screen) is the next task. Depends on task_06 (GET /api/leagues/[id]/matches/[matchId]) and task_07 (PUT predictions endpoint).
- "Detalhes →" links on the Palpites page point to `/ligas/[id]/palpites/[matchId]` — task_10 must create that route.
