---
status: completed
title: Ranking page — fetch-on-mount and screen composition
type: frontend
complexity: medium
dependencies:
  - task_03
  - task_04
  - task_05
---

# Task 06: Ranking page — fetch-on-mount and screen composition

## Overview
Create the `/ligas/[id]/ranking` client page that reads identity and league metadata from `LeaguePanelContext`, fetches the full ranking from the new endpoint on mount, and composes the screen: Podium, conditional prize strip, the pinned "Sua posição" card, and the full classification table. It follows the established mata-mata fetch-on-mount pattern with loading and error states.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST be a client component at `app/ligas/[id]/ranking/page.tsx` that reads `currentUser` and `league` (name, prizes) from `LeaguePanelContext` and fetches `/api/leagues/[id]/ranking` on mount with loading and error states (mata-mata pattern, including `AbortController` cleanup).
- MUST compose, in DOM order: top bar (title "Ranking", subtitle with player count), Podium, `PrizesStrip` (reused as-is, conditional on `league.prizes`), the "Sua posição" card, then `RankingTable`.
- MUST render the "Sua posição" card BEFORE the table (so it is visible without scrolling on initial load) showing the logged-in user's rank, full name, total points, and exact-score count, on a dark background (`#244C5A`) with yellow points (`#FFC72C`).
- MUST hide the "Sua posição" card if the current user is not a member / not present in the ranking.
- MUST reuse `app/ligas/[id]/components/PrizesStrip.tsx` unchanged (no duplicate prize display logic).
- MUST handle the all-zero empty state by surfacing the alphabetical full table and the podium empty-state message (delegated to the Podium component).
- MUST NOT cause horizontal overflow at 375px / 390px, and the "Sua posição" card MUST be visible without scrolling on initial load.
</requirements>

## Subtasks
- [x] 06.1 Scaffold the client page reading `currentUser`/`league` from `LeaguePanelContext`.
- [x] 06.2 Implement fetch-on-mount of `/api/leagues/[id]/ranking` with loading/error/abort handling.
- [x] 06.3 Render the top bar with title and player-count subtitle (mobile and desktop variants).
- [x] 06.4 Compose Podium + conditional `PrizesStrip` + "Sua posição" card + `RankingTable` in the required order.
- [x] 06.5 Implement the "Sua posição" card (dark bg, yellow points) and hide it for non-members.
- [x] 06.6 Verify responsive behavior (no horizontal scroll at 375/390px; card visible without scrolling).
- [x] 06.7 Write tests for fetch states, composition order, and the non-member card-hidden case.

## Implementation Details
Create `app/ligas/[id]/ranking/page.tsx`. Model the fetch-on-mount, loading, error, and `AbortController` cleanup on `app/ligas/[id]/mata-mata/page.tsx` (lines 32-81) — read context via the panel context hook, `fetch('/api/leagues/${leagueId}/ranking')`, unwrap `body.data.ranking`. Pull `currentUser` and `league` (name, prizes) from `app/ligas/[id]/league-panel-context.tsx`. Compose `Podium` (task_04), `PrizesStrip` (`app/ligas/[id]/components/PrizesStrip.tsx`, prop `prizes`), the "Sua posição" card, and `RankingTable` (task_05). Colors are inline hex (`#244C5A` dark, `#FFC72C` yellow). Respect the layout `overflow-x-hidden` rule. See TechSpec "Component Overview" / "Data flow" and PRD "User Experience" + "Core Feature 3".

### Relevant Files
- `app/ligas/[id]/ranking/page.tsx` — new page to create.
- `app/ligas/[id]/mata-mata/page.tsx` — fetch-on-mount template (32-81).
- `app/ligas/[id]/league-panel-context.tsx` — `useLeaguePanel()` → `currentUser`, `league` (8-68).
- `app/ligas/[id]/components/PrizesStrip.tsx` — reused conditional prize block (props: `prizes`, 3-18).
- `app/ligas/[id]/ranking/Podium.tsx` — composed here (task_04).
- `app/ligas/[id]/ranking/RankingTable.tsx` — composed here (task_05).
- `lib/api/types.ts` — `RankingFullEntry`, `LeagueDetail` (prizes/name), `AuthUser` shapes.

### Dependent Files
- `app/ligas/[id]/components/BottomTabBar.tsx`, `PainelSidebar.tsx`, `RankingCard.tsx` — gain working nav targets to this route (task_07).

### Related ADRs
- [ADR-001: Dedicated Ranking Page as a Separate Route](../adrs/adr-001.md) — the route and layout this page realizes.
- [ADR-002: Dedicated Ranking Endpoint Backed by a Shared Scoring Helper](../adrs/adr-002.md) — the fetch-on-mount endpoint contract.

## Deliverables
- `app/ligas/[id]/ranking/page.tsx` composing the full ranking screen with fetch-on-mount.
- "Sua posição" card implementation pinned above the table.
- Component/integration tests with 80%+ coverage **(REQUIRED)**
- Integration tests covering fetch states and composition **(REQUIRED)**

## Tests
- Unit tests (`@testing-library/react`, mocked `fetch` and context):
  - [ ] Loading state renders while the fetch is pending, then the composed screen on resolve.
  - [ ] Error state renders a failure message when the fetch rejects (non-AbortError).
  - [ ] Composition order: Podium precedes the "Sua posição" card, which precedes the `RankingTable` in the DOM.
  - [ ] `PrizesStrip` renders when `league.prizes` is set and is absent when `prizes` is null.
  - [ ] "Sua posição" card shows the current user's rank/points/exact count when present.
  - [ ] "Sua posição" card is hidden when the current user is not in the ranking.
- Integration tests:
  - [ ] Mounting with a mocked successful endpoint response renders all members from `data.ranking`.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Screen composes Podium + conditional prize strip + "Sua posição" card + full table in the correct order.
- No horizontal overflow at 375px / 390px; "Sua posição" card visible without scrolling on initial load.
