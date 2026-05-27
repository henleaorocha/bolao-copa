---
status: completed
title: "Phase-unlock indicator (banner + nav dot)"
type: frontend
complexity: medium
dependencies:
  - task_03
  - task_04
---

# Task 06: Phase-unlock indicator (banner + nav dot)

## Overview

Surface the in-app phase-unlock cue so members don't miss a betting window. The Mata-mata screen shows an on-screen banner naming the most recently opened phase that still has an open, un-bet match, and the Mata-mata nav item (sidebar + bottom bar) shows a derived dot. The signal is the `newlyUnlockedPhase` already computed by the `/bracket` endpoint — no persistence, no "seen" tracking; it self-clears as the user bets.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST render an on-screen banner on the Mata-mata screen when `newlyUnlockedPhase` is non-null (e.g. "32 avos liberado! Faça seus palpites até 28/jun"), naming that phase.
- MUST render a derived dot/badge on the Mata-mata nav item in BOTH `PainelSidebar` and `BottomTabBar` when there is an open, un-bet knockout match.
- MUST derive the indicator entirely from the `/bracket` payload (`newlyUnlockedPhase`) with NO new persistence, table, or acknowledge endpoint (ADR-006).
- The dot/banner MUST self-clear once the user has placed predictions on all open matches (i.e. when the derived signal goes null on the next read).
- MUST be in-app only — no push or email.
- MUST reuse the existing nav dot styling convention (sidebar `#FFC72C`) and not disturb the tab order from task_04.
</requirements>

## Subtasks
- [x] 6.1 Add the unlock banner to the Mata-mata screen, gated on `newlyUnlockedPhase`, with the phase name in the copy.
- [x] 6.2 Make the unlock signal available to the nav surfaces (e.g. via the league panel context or a lightweight derived flag).
- [x] 6.3 Render the derived dot on the Mata-mata item in `PainelSidebar` and `BottomTabBar`.
- [x] 6.4 Ensure the dot/banner clear when the signal is null (user has bet all open matches).
- [x] 6.5 Add tests for banner gating, nav-dot rendering, and self-clearing.

## Implementation Details

Extends task_03's screen and task_04's nav items. The banner reads `newlyUnlockedPhase` from the `/bracket` payload the screen already fetches. For the nav dot, the sidebar/bottom-bar components don't fetch `/bracket` themselves — route the derived "has un-bet open match" flag through the existing shared state (`app/ligas/[id]/league-panel-context.tsx` / `useLeaguePanel()`) or an equivalent lightweight prop, so both nav surfaces and the screen agree on one source. Reuse the existing active-dot styling in `PainelSidebar.tsx` (`bg-[#FFC72C]`). No persistence per ADR-006: the banner may reappear across visits until the user bets, which is the intended behavior.

### Relevant Files
- `app/ligas/[id]/mata-mata/page.tsx` + components — banner placement (task_03).
- `app/ligas/[id]/components/PainelSidebar.tsx` — Mata-mata item gains the derived dot (task_04 enabled it).
- `app/ligas/[id]/components/BottomTabBar.tsx` — Mata-mata tab gains the derived dot (task_04 enabled it).
- `app/ligas/[id]/league-panel-context.tsx` — shared state to carry the unlock flag to the nav.
- `app/api/leagues/[id]/bracket/route.ts` — provides `newlyUnlockedPhase` (task_02).

### Dependent Files
- None downstream; this completes the F5 indicator.

### Related ADRs
- [ADR-006: Dedicated /bracket Endpoint with Derived Phase-Unlock Indicator](../adrs/adr-006.md) — data-derived unlock signal, no persistence; self-clears on betting.

## Deliverables
- On-screen unlock banner on the Mata-mata screen, gated on `newlyUnlockedPhase`.
- Derived dot on the Mata-mata item in both nav surfaces.
- Unit/component tests with 80%+ coverage of the indicator logic **(REQUIRED)**.

## Tests
- Unit tests:
  - [x] Banner renders with the correct phase name when `newlyUnlockedPhase` is set; hidden when null.
  - [x] `PainelSidebar` Mata-mata item shows the dot when the unlock flag is true; no dot when false.
  - [x] `BottomTabBar` Mata-mata tab shows the dot when the unlock flag is true; no dot when false.
  - [x] Indicator clears (dot + banner gone) when the signal is null on the next read.
- Integration tests:
  - [x] Given a `/bracket` payload with an `open`, un-bet slot, the screen shows the banner and the nav shows the dot; after the prediction is saved and the payload refetched with the signal null, both clear.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- The unlock indicator appears (banner + nav dot) when a phase opens and self-clears once the user bets all open matches — PRD Phase 2 success criteria; no new persistence.
- `npm run type-check`, `npm run lint`, and `npm run build` pass.
