---
status: completed
title: Tabela page Server Component with membership guard
type: frontend
complexity: medium
dependencies:
  - task_01
  - task_03
---

# Task 04: Tabela page Server Component with membership guard

## Overview
Create `app/ligas/[id]/tabela/page.tsx`, the route that ties standings together: a React Server Component that verifies session and league membership server-side, queries group matches, computes standings, and renders `StandingsGrid` in the initial HTML. This is the first Server Component under `app/ligas/[id]/` (all siblings are client components), so the membership guard must be re-implemented server-side rather than relying on `useLeaguePanel()`.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST be a React Server Component (no `'use client'`) at `app/ligas/[id]/tabela/page.tsx`, rendering inside the existing client `layout.tsx` unchanged.
- MUST resolve the Supabase server client via `getSupabaseServerClient()` and verify the session with `auth.getUser()`, handling the unauthenticated case.
- MUST verify the user is a member of the league via the `league_members` table before rendering, mirroring the auth/membership checks in `app/api/leagues/[id]/matches/route.ts`; non-members MUST NOT see standings.
- MUST query `matches` where `phase = 'group'` and pass the rows to `computeStandings()` from `lib/standings.ts`.
- MUST render `StandingsGrid` with the computed standings and the page header/subtitle/section label from the PRD ("Tabela da Copa" / "Classificação oficial — 12 grupos, 48 seleções" / "FASE DE GRUPOS").
- MUST NOT make any external API call on the page-load path (standings come from the DB only).
- MUST NOT render a loading skeleton or perform a client-side fetch (standings ship in initial HTML).
</requirements>

## Subtasks
- [x] 4.1 Create the `tabela/page.tsx` Server Component scaffold and page header/subtitle/section label.
- [x] 4.2 Resolve `getSupabaseServerClient()` and verify session + `league_members` membership server-side.
- [x] 4.3 Query `matches` for `phase = 'group'` and call `computeStandings()`.
- [x] 4.4 Render `StandingsGrid` with the result and handle the unauthorized/non-member case.
- [x] 4.5 Write an integration test rendering the page/grid with seeded matches.

## Implementation Details
Create `app/ligas/[id]/tabela/page.tsx`. Reuse the exact server-side auth/membership flow from `app/api/leagues/[id]/matches/route.ts` (session via `supabase.auth.getUser()`, league existence check, then `league_members` `.select('role').eq('user_id', …).eq('league_id', …).single()`). Use `getSupabaseServerClient()` from `lib/supabase/client.ts:4`. The `[id]` param is the league id (App Router params are async in this Next version — read the relevant guide in `node_modules/next/dist/docs/` before implementing the params signature).

Query `matches` with `.select('*').eq('phase','group')`, feed the rows to `computeStandings` (Task 01), and render `StandingsGrid` (Task 03). The page is a child of the existing client `layout.tsx` (`app/ligas/[id]/layout.tsx:1`) — confirm RSC-under-client-layout renders correctly. See TechSpec "Data Flow" (read path), ADR-002, and the PRD Desktop Flow for header copy.

### Relevant Files
- `app/api/leagues/[id]/matches/route.ts` — canonical server-side auth + `league_members` membership pattern to mirror (`route.ts:19`–`60`).
- `lib/supabase/client.ts` — `getSupabaseServerClient()` (`client.ts:4`).
- `lib/standings.ts` (Task 01) — `computeStandings()`.
- `app/ligas/[id]/components/StandingsGrid.tsx` (Task 03) — rendered with computed standings.
- `app/ligas/[id]/layout.tsx` — client layout/`LeaguePanelProvider` this page renders inside (`layout.tsx:1`).
- `tests/integration/league-matches.test.ts` — reference for seeded-match integration test conventions and `describe.skipIf` gating.

### Dependent Files
- `components/PainelSidebar.tsx` / `components/BottomTabBar.tsx` (Task 05) — link to this route once it exists.

### Related ADRs
- [ADR-002: Server Component Rendering for the Tabela Page](adrs/adr-002.md) — the core decision implemented by this task.
- [ADR-001: DB-Computed Standings with Hourly Background Sync](adrs/adr-001.md) — read path is DB-only, no external call.

## Deliverables
- `app/ligas/[id]/tabela/page.tsx` Server Component with server-side membership guard and PRD header copy.
- `tests/integration/tabela-page.test.tsx` rendering the page/grid with seeded matches.
- Integration tests with 80%+ coverage **(REQUIRED)**.

## Tests
- Unit tests:
  - [x] Covered by `computeStandings` unit tests (Task 01); page logic is exercised via integration tests below.
- Integration tests:
  - [x] With seeded group matches, the rendered page shows 12 group cards in A→L order.
  - [x] A group with finished matches renders teams sorted correctly with positions 1–2 carrying the qualification highlight.
  - [x] GP/GC columns are hidden at the mobile breakpoint while SG remains.
  - [x] An unauthenticated request / a non-member does not receive rendered standings (guard returns the unauthorized/redirect path).
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Standings ship in the initial server-rendered HTML with no client fetch or skeleton.
- Non-members and unauthenticated users cannot view standings.
- No external API call occurs on the page-load path.
