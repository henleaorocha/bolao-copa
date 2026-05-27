---
status: completed
title: Activate Ranking nav slots and RankingCard "Ver tudo" link
type: frontend
complexity: low
dependencies:
  - task_06
---

# Task 07: Activate Ranking nav slots and RankingCard "Ver tudo" link

## Overview
Wire up navigation to the now-existing ranking route: enable the disabled "Ranking" slots in the mobile bottom tab bar and the desktop sidebar, and activate the disabled "Ver tudo →" link on the panel's `RankingCard`. This completes the league navigation structure so members can actually reach the ranking screen.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST set the "Ranking" nav item `href` to `/ligas/[id]/ranking` in `BottomTabBar.tsx` and `PainelSidebar.tsx`, replacing `href: null`.
- MUST remove the disabled styling (`pointer-events-none`, `cursor-not-allowed`, `opacity-50`, `aria-disabled`) from the Ranking slot so it renders as an active link handled by the existing active-state logic.
- MUST activate the `RankingCard` "Ver tudo →" link to navigate to `/ligas/[id]/ranking`, replacing the disabled anchor with a working `Link`.
- MUST NOT alter the behavior of any other nav slot (e.g. the still-disabled or active states of other tabs), and MUST keep the MATA-MATA unlock-dot logic intact.
- MUST update the nav tests so the "Ranking" slot is asserted enabled with the correct `href` and no `pointer-events-none` / `aria-disabled`.
</requirements>

## Subtasks
- [x] 07.1 Set the Ranking `href` and remove disabled styling in `BottomTabBar.tsx`.
- [x] 07.2 Set the Ranking `href` and remove disabled styling in `PainelSidebar.tsx`.
- [x] 07.3 Replace the disabled "Ver tudo →" anchor in `RankingCard.tsx` with a working `Link` to the ranking route.
- [x] 07.4 Update `navigation-shell.test.tsx` and `static-panel-components.test.tsx` to assert the activated Ranking slot and link.

## Implementation Details
Modify `app/ligas/[id]/components/BottomTabBar.tsx` (Ranking item `href: null` at line 20; disabled-branch styling 35-42; disabled `<button>` render 66-77) and `app/ligas/[id]/components/PainelSidebar.tsx` (Ranking item 30-37, same disabled pattern) to point at `/ligas/${leagueId}/ranking` and flow through the existing active-link rendering rather than the disabled branch. In `app/ligas/[id]/components/RankingCard.tsx`, replace the disabled "Ver tudo" anchor (73-80) with a `Link` to the ranking route. Build the href from the league id already available to these components. See TechSpec "Impact Analysis" rows for `BottomTabBar`/`PainelSidebar`/`RankingCard` and PRD "Core Feature 6: Navigation Activation".

### Relevant Files
- `app/ligas/[id]/components/BottomTabBar.tsx` — Ranking tab to activate (20, 35-42, 66-77).
- `app/ligas/[id]/components/PainelSidebar.tsx` — Ranking sidebar item to activate (30-37).
- `app/ligas/[id]/components/RankingCard.tsx` — "Ver tudo →" link to activate (73-80).
- `tests/unit/navigation-shell.test.tsx` — nav activation assertions (73-110).
- `tests/unit/static-panel-components.test.tsx` — panel component / RankingCard assertions.

### Dependent Files
- `app/ligas/[id]/ranking/page.tsx` — the navigation target that must exist first (task_06).

### Related ADRs
- [ADR-001: Dedicated Ranking Page as a Separate Route](../adrs/adr-001.md) — requires activating the previously disabled nav slots.

## Deliverables
- `BottomTabBar.tsx` and `PainelSidebar.tsx` with an active "Ranking" link to `/ligas/[id]/ranking`.
- `RankingCard.tsx` with a working "Ver tudo →" link to the ranking route.
- Updated nav tests with 80%+ coverage **(REQUIRED)**
- Integration/component tests asserting nav activation **(REQUIRED)**

## Tests
- Unit tests:
  - [x] `BottomTabBar` renders the "RANKING" tab as a link with `href="/ligas/[id]/ranking"` and without `pointer-events-none` / `aria-disabled="true"`.
  - [x] `PainelSidebar` renders the "Ranking" item as an active link to the ranking route.
  - [x] `RankingCard` "Ver tudo →" is a working link to `/ligas/[id]/ranking` (no longer `aria-disabled`).
  - [x] Other nav slots are unaffected and the MATA-MATA unlock-dot logic still works.
- Integration tests:
  - [x] Active-state logic marks the Ranking slot selected when on the ranking route.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- "Ranking" is reachable from the bottom tab bar, the sidebar, and the panel `RankingCard`, with no regressions to other nav slots.
