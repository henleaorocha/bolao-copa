---
status: completed
title: "app/ligas/page.tsx: conditional create card + no-league empty state"
type: frontend
complexity: medium
dependencies:
  - task_03
---

# Task 5: app/ligas/page.tsx: conditional create card + no-league empty state

## Overview
Make the leagues hub reflect the new permission model: hide the "Criar nova liga" entry point for
users who cannot create leagues, and show a sensible "no league yet" empty state that guides
new/league-less users toward joining an open league or accepting an invite. Hiding (not disabling)
the create action keeps the interface uncluttered per the PRD.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
- READ node_modules/next/dist/docs/ for this project's modified Next.js before writing code
</critical>

<requirements>
- MUST read the caller's capability via `canCreateLeague()` in the server component and render the
  `CreateLeagueModal` / "Criar nova liga" card ONLY when it is `true`.
- MUST NOT render any disabled or hinted create control for users without the capability.
- MUST show a no-league empty state (guiding to joinable open leagues / invite links) when the
  user has no leagues to display.
- MUST preserve the existing hub layout (hero, card grid, countdown) for users who do have
  leagues and/or the capability.
</requirements>

## Subtasks
- [x] 5.1 Call `canCreateLeague()` in the `LigasPage` server component for the authed user.
- [x] 5.2 Conditionally render the `CreateLeagueModal`/create card based on the capability.
- [x] 5.3 Render a no-league empty state pointing to open leagues / invites when the hub list is
  empty.
- [x] 5.4 Add tests covering capability-gated rendering and the empty state.

## Implementation Details
Edit `app/ligas/page.tsx` (server component, `async function LigasPage()`). It already calls
`getLeaguesHub(supabase, user.id)` (~line 52) and renders `CreateLeagueModal` unconditionally
(~line 101). Add the `canCreateLeague()` read and gate the modal; add the empty-state branch when
the returned hub list is empty. Consult `node_modules/next/dist/docs/` for server-component and
data-fetching conventions in this Next.js build. See TechSpec "Component Overview" and PRD "User
Experience".

### Relevant Files
- `app/ligas/page.tsx` — leagues hub server component to modify (~line 52 hub fetch, ~line 101
  modal render).
- `lib/leagues/can-create-league.ts` — capability helper consumed here (task_03).
- `lib/leagues/get-leagues-hub.ts` — returns `LeagueHubItem[]`; an empty array drives the empty
  state.

### Dependent Files
- `app/ligas/` components (e.g. `CreateLeagueModal`) — rendering becomes conditional.
- `tests/` — new tests for gated rendering and empty state.

### Related ADRs
- [ADR-001: Per-user boolean flag to gate league creation](adrs/adr-001.md) — UI side of the gate.
- [ADR-005: Graceful no-league state guiding users to an invite link](adrs/adr-005.md) — the
  empty-state behavior.

## Deliverables
- `app/ligas/page.tsx` renders the create card only for permitted users.
- A no-league empty state guiding to open leagues / invites.
- Tests for gated rendering and empty state **(REQUIRED)**.
- Test coverage >=80% for the new logic.

## Tests
- Unit tests:
  - [x] When `canCreateLeague()` is `true`, the create card/modal is rendered.
  - [x] When `canCreateLeague()` is `false`, no create card/modal and no disabled control is
    rendered.
  - [x] When `getLeaguesHub()` returns an empty list, the no-league empty state (with join/invite
    guidance) is rendered.
  - [x] When the user has leagues, the standard hub grid renders (no empty state).
- Integration tests:
  - [x] Rendering the page as a default user shows leagues/empty state without a create control;
    as an operator user shows the create card.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- The create action is present only for permitted users; league-less users see a helpful empty
  state.
