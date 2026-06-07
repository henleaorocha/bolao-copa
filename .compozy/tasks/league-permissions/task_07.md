---
status: completed
title: "app/dashboard/page.tsx: redirect to /ligas on no active league"
type: frontend
complexity: low
dependencies:
  - task_02
---

# Task 7: app/dashboard/page.tsx: redirect to /ligas on no active league

## Overview
Now that new users can legitimately have no active league, the dashboard must stop throwing when
that happens. Replace the "Usuário não tem nenhuma liga" throw with a redirect to `/ligas`, where
the user finds the no-league empty state and joinable leagues.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
- READ node_modules/next/dist/docs/ for this project's modified Next.js before writing code
</critical>

<requirements>
- MUST replace the no-active-league `throw` in `app/dashboard/page.tsx` with a redirect to
  `/ligas`.
- MUST preserve the existing unauthenticated behavior (redirect to `/login`) and the normal
  dashboard render when an active league exists.
- MUST use this Next.js build's supported redirect mechanism (verify against
  `node_modules/next/dist/docs/`).
</requirements>

## Subtasks
- [x] 7.1 Locate the no-active-league throw after `resolveActiveLeague()` in the dashboard page.
- [x] 7.2 Replace it with a redirect to `/ligas`.
- [x] 7.3 Add tests covering the redirect, the authed-with-league render, and the login redirect.

## Implementation Details
Edit `app/dashboard/page.tsx`. It redirects to `/login` when unauthenticated, calls
`ensureUserSynced()` (~line 21) and `resolveActiveLeague()` (~line 24), then throws at ~lines
26-28 (`throw new Error('Usuário não tem nenhuma liga')`). Replace that throw with a redirect to
`/ligas`. Confirm the redirect API in `node_modules/next/dist/docs/`. See TechSpec "Component
Overview" and "Development Sequencing" step 7.

### Relevant Files
- `app/dashboard/page.tsx` — server component; throw at ~lines 26-28 to replace.
- `app/ligas/page.tsx` — redirect target; renders the no-league empty state (task_05).

### Dependent Files
- `tests/` — new test for the dashboard redirect behavior.

### Related ADRs
- [ADR-005: Graceful no-league state guiding users to an invite link](adrs/adr-005.md) — the
  no-league redirect/state decision.

## Deliverables
- `app/dashboard/page.tsx` redirects no-league users to `/ligas` instead of throwing.
- Tests for the redirect and unchanged paths **(REQUIRED)**.
- Test coverage >=80% for the changed branch.

## Tests
- Unit tests:
  - [x] A user with no active league is redirected to `/ligas` (no error thrown).
  - [x] A user with an active league renders the dashboard normally.
  - [x] An unauthenticated request is redirected to `/login`.
- Integration tests:
  - [x] A freshly created (no-league) user hitting `/dashboard` lands on `/ligas`.
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- `/dashboard` never throws for a missing active league; league-less users reach `/ligas`.
