---
status: completed
title: "canCreateLeague() server helper"
type: backend
complexity: low
dependencies:
  - task_01
---

# Task 3: canCreateLeague() server helper

## Overview
Provide a single server-side helper that reads `users.can_create_league` for a given user so the
API guard and the leagues page do not inline a Supabase query each. The helper defaults to
`false` on any missing row or query error, making "no permission" the safe fallback.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST create `lib/leagues/can-create-league.ts` exporting `canCreateLeague(supabase, userId):
  Promise<boolean>`.
- MUST read `users.can_create_league` for the given `userId` and return `true` only when the
  value is exactly `true`.
- MUST return `false` on a missing row or any query error (no throw).
- MUST type `supabase` as `SupabaseClient` from `@supabase/supabase-js`, matching the signature
  in the TechSpec "Core Interfaces" section.
</requirements>

## Subtasks
- [x] 3.1 Create the `lib/leagues/can-create-league.ts` module with the `canCreateLeague` function.
- [x] 3.2 Implement the single-row read with safe `false` fallback on error/missing row.
- [x] 3.3 Add unit tests covering `true`, `false`, missing-row, and query-error cases.

## Implementation Details
Add a new file alongside the existing `lib/leagues/` helpers. See the TechSpec "Core Interfaces"
section for the exact signature and behavior. Mirror the import and typing style used by
`lib/leagues/get-leagues-hub.ts`.

### Relevant Files
- `lib/leagues/get-leagues-hub.ts` — sibling helper; match its Supabase usage and typing style.
- `lib/leagues/get-days-until-copa.ts` — sibling helper; confirms the `lib/leagues/` module
  conventions.

### Dependent Files
- `app/api/leagues/route.ts` — task_04 consumes this helper for the 403 guard.
- `app/ligas/page.tsx` — task_05 consumes this helper to conditionally render the create card.

### Related ADRs
- [ADR-001: Per-user boolean flag to gate league creation](adrs/adr-001.md) — defines the
  capability this helper reads.
- [ADR-004: Enforce league-creation permission in RLS and the API](adrs/adr-004.md) — this helper
  is the API/UI side of the two-place enforcement.

## Deliverables
- New `lib/leagues/can-create-league.ts` exporting `canCreateLeague`.
- Unit tests with 80%+ coverage **(REQUIRED)**.

## Tests
- Unit tests:
  - [x] Returns `true` when the queried row has `can_create_league === true`.
  - [x] Returns `false` when the queried row has `can_create_league === false`.
  - [x] Returns `false` when no row is found for the `userId`.
  - [x] Returns `false` when the Supabase query returns an error.
- Integration tests:
  - [x] Against a real session, returns `true` for a granted operator user and `false` for a
    default user (may reuse the task_01 migration fixtures).
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- `canCreateLeague` returns the correct boolean for granted, default, missing, and error cases.
