---
status: completed
title: "Extend `LeagueDetail` TypeScript type"
type: backend
complexity: low
dependencies:
  - task_01
---

# Task 2: Extend `LeagueDetail` TypeScript type

## Overview

Adds `invite_token: string` and `user_onboarded_at: string | null` to the `LeagueDetail` interface in `lib/api/types.ts`. This type change gates all downstream work — the GET endpoint (task_03), the PATCH endpoint (task_04), and the modal component (task_05) all depend on these fields being present in the shared type.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add `invite_token: string` to `LeagueDetail` (non-optional — all members can share)
- MUST add `user_onboarded_at: string | null` to `LeagueDetail` (null = modal has not been seen)
- MUST NOT modify `LeagueSummary`, `LeagueMember`, or any other existing interfaces
- MUST NOT break TypeScript compilation — run `tsc --noEmit` to verify
- All existing consumers of `LeagueDetail` that destructure or spread the type MUST still compile
</requirements>

## Subtasks

- [x] 2.1 Add `invite_token: string` to `LeagueDetail` in `lib/api/types.ts`
- [x] 2.2 Add `user_onboarded_at: string | null` to `LeagueDetail` in `lib/api/types.ts`
- [x] 2.3 Run `tsc --noEmit` and fix any type errors introduced by the new required fields
- [x] 2.4 Update the unit test for type shapes (`tests/unit/api-responses.test.ts`) if it asserts on `LeagueDetail` structure

## Implementation Details

See TechSpec "Core Interfaces" section for the exact field definitions. The current `LeagueDetail` in `lib/api/types.ts` extends `LeagueSummary` and adds `description`, `created_by`, `created_at`, and `members`. The two new fields go after `created_at`.

The new fields are **required** (non-optional) in `LeagueDetail` because:
- `invite_token` is always present for any persisted league (added in migration `20260522000011`)
- `user_onboarded_at` is always present — it is `null` (not `undefined`) when unset

`league_members` row existence is guaranteed for any authenticated user accessing the detail endpoint (the endpoint already returns 403 if not a member), so `user_onboarded_at` will always have a value to populate.

### Relevant Files

- `lib/api/types.ts` — the only file to modify in this task
- `tests/unit/api-responses.test.ts` — may assert on `LeagueDetail` shape; check and update if needed
- `tests/unit/league-detail.test.tsx` — may use `LeagueDetail` fixtures; check for type errors

### Dependent Files

- `app/api/leagues/[id]/route.ts` — GET handler builds a `LeagueDetail` response; will need the new fields (task_03)
- `app/ligas/[id]/page.tsx` — reads `LeagueDetail`; will need `user_onboarded_at` and `invite_token` (task_06)
- `components/LeagueWelcomeModal.tsx` — new component receives `invite_token` and `role` from the page (task_05)

### Related ADRs

- [ADR-002: Extend LeagueDetail API Response](../adrs/adr-002.md) — documents the decision to add both fields to the existing type rather than creating separate endpoints

## Deliverables

- Updated `lib/api/types.ts` with two new fields on `LeagueDetail`
- Zero TypeScript compilation errors after change
- Unit tests verifying the shape of `LeagueDetail` **(REQUIRED)**

## Tests

- Unit tests:
  - [x] `LeagueDetail` type includes `invite_token: string` field (type-level assertion via `satisfies` or fixture cast)
  - [x] `LeagueDetail` type includes `user_onboarded_at: string | null` field
  - [x] Existing `LeagueSummary` and `LeagueMember` shapes are unchanged (regression)
- Integration tests:
  - [ ] N/A at this stage — the GET endpoint test (task_03) will verify the runtime shape
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- `tsc --noEmit` exits 0 with no errors
- `LeagueDetail` has both `invite_token` and `user_onboarded_at` fields
- No existing type consumers are broken
