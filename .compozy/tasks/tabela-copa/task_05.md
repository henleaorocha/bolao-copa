---
status: completed
title: Activate Tabela nav in sidebar and bottom tab bar
type: frontend
complexity: low
dependencies:
  - task_04
---

# Task 05: Activate Tabela nav in sidebar and bottom tab bar

## Overview
Turn the currently-disabled "Tabela" navigation entry into a working link in both the desktop sidebar and the mobile bottom tab bar, including correct active-state highlighting on the Tabela route. This is the final wiring that makes the screen reachable from the league panel.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST change the "Tabela" nav item `href` from `null` to `/ligas/${leagueId}/tabela` in both `PainelSidebar` and `BottomTabBar`.
- MUST render "Tabela" as an enabled link (remove the disabled `aria-disabled`/`cursor-not-allowed` treatment) once it has a route.
- MUST mark the "Tabela" item active when the current pathname is the Tabela route, using the existing active-state logic in each component.
- MUST NOT alter the behavior of other still-disabled items (e.g. "Mata-mata", "Ranking", "Perfil") that remain `href: null`.
- SHOULD keep the existing icon, label, and ordering of nav items unchanged.
</requirements>

## Subtasks
- [x] 5.1 Set the "Tabela" `href` to the route and enable the link in `PainelSidebar`.
- [x] 5.2 Set the "Tabela" `href` and enable the tab in `BottomTabBar`.
- [x] 5.3 Confirm active-state logic marks "Tabela" active on the Tabela route in both components.
- [x] 5.4 Write tests asserting the enabled link target and active-state behavior.

## Implementation Details
Locate the "Tabela" entry (`href: null`, `exact: true`) in the `NAV_ITEMS` array of `PainelSidebar.tsx` and the `TABS` array of `BottomTabBar.tsx`. Per the exploration these live under `app/ligas/[id]/components/` (`PainelSidebar.tsx` ~line 31, `BottomTabBar.tsx` ~line 17); confirm the actual path before editing. Set `href` to `/ligas/${leagueId}/tabela`. Both components already compute active state from `usePathname()` (exact vs prefix match) and already render `href: null` items as disabled — flipping the href is sufficient to enable the link and active highlighting. Keep `exact: true` (the Tabela route has no sub-routes in MVP). See TechSpec "Component Overview" (nav rows) and PRD "Navigation" section.

### Relevant Files
- `app/ligas/[id]/components/PainelSidebar.tsx` — `NAV_ITEMS` "Tabela" entry and active-state logic (~`PainelSidebar.tsx:31`, `:66`).
- `app/ligas/[id]/components/BottomTabBar.tsx` — `TABS` "Tabela" entry and active-state logic (~`BottomTabBar.tsx:17`, `:29`).
- `app/ligas/[id]/tabela/page.tsx` (Task 04) — the route being linked; must exist first.

### Dependent Files
- None — this is leaf wiring; no component imports these nav arrays.

### Related ADRs
- None apply directly to this task.

## Deliverables
- Updated "Tabela" nav item (enabled link + active state) in `PainelSidebar.tsx` and `BottomTabBar.tsx`.
- Tests asserting the enabled link target and active highlighting.
- Unit/component tests with 80%+ coverage **(REQUIRED)**.

## Tests
- Unit tests:
  - [x] `PainelSidebar` renders "Tabela" as an enabled `<a>`/link to `/ligas/${leagueId}/tabela` (not a disabled element).
  - [x] `BottomTabBar` renders "Tabela" as an enabled link to `/ligas/${leagueId}/tabela`.
  - [x] When `usePathname()` returns the Tabela route, "Tabela" is marked active in both components.
  - [x] Other `href: null` items (e.g. "Mata-mata") remain disabled and not active.
- Integration tests:
  - [x] Navigating to the Tabela route highlights the "Tabela" nav item active in the panel chrome.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- "Tabela" is a working link in both desktop sidebar and mobile tab bar.
- "Tabela" shows active state on its route; other disabled items are unaffected.
