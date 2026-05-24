---
status: completed
title: "Integrate `LeagueWelcomeModal` into league detail page"
type: frontend
complexity: low
dependencies:
  - task_03
  - task_05
---

# Task 6: Integrate `LeagueWelcomeModal` into league detail page

## Overview

Wires the `LeagueWelcomeModal` component into `app/ligas/[id]/page.tsx` so that the welcome flow fires automatically when the page loads and `user_onboarded_at` is null. This task is the final integration point — it reads the new fields from the GET response (task_03), renders the modal component (task_05), and removes the modal from the DOM when `onComplete` fires.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST import and render `<LeagueWelcomeModal>` in `app/ligas/[id]/page.tsx` — conditionally when `league.user_onboarded_at === null`
- MUST pass `leagueId`, `leagueName`, `inviteToken`, and `role` as props to the modal
- MUST use a `useState<boolean>` flag (`showWelcomeModal`) initialized from `league.user_onboarded_at === null` to allow the modal to be dismissed via `onComplete` without re-fetching
- MUST NOT re-show the modal after `onComplete` fires within the same session (setting `showWelcomeModal = false` is sufficient)
- MUST render the modal AFTER the league data is loaded (not during the loading skeleton)
- MUST NOT block the league page content from rendering — the modal overlays on top
</requirements>

## Subtasks

- [x] 6.1 Add `showWelcomeModal` state initialized from `league.user_onboarded_at === null` after league data is fetched
- [x] 6.2 Import `LeagueWelcomeModal` from `components/LeagueWelcomeModal`
- [x] 6.3 Render `<LeagueWelcomeModal>` conditionally when `showWelcomeModal === true` and `league !== null`
- [x] 6.4 Pass correct props: `leagueId={league.id}`, `leagueName={league.name}`, `inviteToken={league.invite_token}`, `role={league.role}`
- [x] 6.5 Set `onComplete={() => setShowWelcomeModal(false)}`
- [x] 6.6 Update existing unit tests for the league detail page to cover modal trigger/dismiss logic

## Implementation Details

See TechSpec "System Architecture" section for the full component tree and data flow. The modal is placed at the end of the JSX return, after the existing `ConfigureModal` and `ConfirmDialog`, consistent with how other modals are positioned in the file.

The `showWelcomeModal` state should be set inside the existing data-fetching `useEffect` after the `setLeague(data)` call:

```typescript
// Inside the useEffect, after setLeague(data)
setShowWelcomeModal(data.user_onboarded_at === null)
```

This avoids a flash where the modal appears before league data is ready.

### Relevant Files

- `app/ligas/[id]/page.tsx` — the only file to modify; add import, state, and JSX
- `components/LeagueWelcomeModal.tsx` — component to import (created in task_05)
- `tests/unit/ligas-page.test.tsx` — existing unit tests; add modal trigger cases

### Dependent Files

- None — this is the terminal task in the dependency chain

### Related ADRs

- [ADR-001: Per-League Welcome Onboarding Flow](../adrs/adr-001.md) — confirms the trigger condition: modal shows when `user_onboarded_at` is null
- [ADR-002: Extend LeagueDetail API Response](../adrs/adr-002.md) — `user_onboarded_at` and `invite_token` are read from the GET response populated in task_03

## Deliverables

- Updated `app/ligas/[id]/page.tsx` with `LeagueWelcomeModal` integration
- Updated `tests/unit/ligas-page.test.tsx` (or similar) with modal trigger tests **(REQUIRED)**

## Tests

- Unit tests:
  - [x] When fetched `LeagueDetail` has `user_onboarded_at: null`, `<LeagueWelcomeModal>` is rendered in the DOM
  - [x] When fetched `LeagueDetail` has `user_onboarded_at: "2026-05-23T10:00:00Z"` (non-null), `<LeagueWelcomeModal>` is NOT rendered
  - [x] Calling `onComplete` (simulated) removes `<LeagueWelcomeModal>` from the DOM without re-fetching league data
  - [x] Modal is NOT rendered during the loading state (before league data is fetched)
  - [x] All existing league detail page tests still pass (regression)
- Integration tests:
  - [ ] Navigating to `/ligas/{id}` for a fresh member shows the welcome modal
  - [ ] Navigating to `/ligas/{id}` for a returning member (onboarded_at set) does not show the modal
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- `<LeagueWelcomeModal>` renders when `user_onboarded_at === null` after page load
- `<LeagueWelcomeModal>` does not render when `user_onboarded_at` is set
- After `onComplete` fires, the modal is gone and the league page is fully interactive
- No regressions in existing league detail page behaviour (member list, configure modal, remove member, etc.)
