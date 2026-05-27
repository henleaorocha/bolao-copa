---
status: completed
title: "Navigation: enable Mata-mata + reorder bottom tab bar"
type: frontend
complexity: low
dependencies:
  - task_03
---

# Task 04: Navigation: enable Mata-mata + reorder bottom tab bar

## Overview

Activate the previously disabled "Mata-mata" entry in both navigation surfaces so members can reach the new screen. On desktop the `PainelSidebar` item gets a real href; on mobile the `BottomTabBar` replaces the (non-functional) "Perfil" tab with "Mata-mata" and reorders the five tabs to **Mata-mata · Tabela · Painel · Palpites · Ranking**, keeping Painel centered.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST enable the `PainelSidebar` "Mata-mata" item by giving it `href = /ligas/[id]/mata-mata` (currently `href: null` / disabled) and an active state consistent with other items.
- MUST replace the mobile `BottomTabBar` "Perfil" tab with a "Mata-mata" tab linking to `/ligas/[id]/mata-mata`.
- MUST reorder the bottom tab bar to exactly five tabs, left→right: **Mata-mata · Tabela · Painel · Palpites · Ranking**, with Painel centered.
- MUST preserve the existing active/disabled styling conventions (sidebar active dot `#FFC72C`; bottom bar active `#0097A9`); Ranking stays disabled until its screen exists.
- MUST NOT remove desktop Perfil access (the desktop sidebar keeps Perfil; only the mobile bottom-bar Perfil tab is replaced).
- MUST NOT introduce the unlock dot here — that derived indicator is task_06.
</requirements>

## Subtasks
- [x] 4.1 Give the `PainelSidebar` "Mata-mata" item a real href and enabled state.
- [x] 4.2 Replace the `BottomTabBar` "Perfil" tab with "Mata-mata" (Zap icon) linking to the route.
- [x] 4.3 Reorder the bottom tab bar to Mata-mata · Tabela · Painel · Palpites · Ranking (Painel centered).
- [x] 4.4 Add tests asserting the enabled item, the new tab, and the exact tab order.

## Implementation Details

Modify `app/ligas/[id]/components/PainelSidebar.tsx` (`NAV_ITEMS` array — flip the Mata-mata entry from `href: null` to the route) and `app/ligas/[id]/components/BottomTabBar.tsx` (`TABS` array — swap Perfil→Mata-mata and reorder). The Zap icon is already assigned to Mata-mata in the sidebar; reuse it for the bottom bar. Keep the existing styling classes for active/disabled states. This task only enables navigation and reordering; the data-derived unlock dot is wired in task_06. Depends on task_03 so the linked route exists (no 404).

### Relevant Files
- `app/ligas/[id]/components/PainelSidebar.tsx` — desktop `NAV_ITEMS`; enable the Mata-mata item.
- `app/ligas/[id]/components/BottomTabBar.tsx` — mobile `TABS`; replace Perfil, reorder.
- `app/ligas/[id]/mata-mata/page.tsx` — the route both nav surfaces link to (task_03).

### Dependent Files
- Phase-unlock indicator (task_06) — adds the derived dot to these same nav items.

### Related ADRs
- [ADR-006: Dedicated /bracket Endpoint with Derived Phase-Unlock Indicator](../adrs/adr-006.md) — context for the nav item that later carries the unlock dot.

## Deliverables
- `PainelSidebar` with an enabled Mata-mata item linking to the route.
- `BottomTabBar` with Perfil replaced by Mata-mata and the five tabs reordered (Painel centered).
- Unit tests with 80%+ coverage of the changed nav logic **(REQUIRED)**.

## Tests
- Unit tests:
  - [x] `PainelSidebar` renders the Mata-mata item with href `/ligas/[id]/mata-mata` and as enabled (not `pointer-events-none`).
  - [x] `BottomTabBar` no longer renders a "Perfil" tab and renders a "Mata-mata" tab linking to the route.
  - [x] `BottomTabBar` renders tabs in order Mata-mata · Tabela · Painel · Palpites · Ranking with Painel centered (index 2 of 5).
  - [x] Ranking tab remains disabled; active-state styling is applied to the current route.
- Integration tests:
  - [ ] N/A — pure navigation component changes; covered by unit/render tests.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Mata-mata is reachable from both the desktop sidebar and the mobile bottom tab bar; the bottom bar shows the exact five-tab order with Painel centered.
- `npm run type-check`, `npm run lint`, and `npm run build` pass.
