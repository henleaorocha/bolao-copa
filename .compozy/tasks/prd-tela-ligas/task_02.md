---
status: completed
title: LeagueHubItem Type
type: backend
complexity: low
dependencies: []
---

# Task 2: LeagueHubItem Type

## Overview

Add the `LeagueHubItem` interface and the `GET /api/leagues/hub` response shape to `lib/api/types.ts`. This is a purely additive change — no existing type is modified or removed. Every subsequent task (data layer, API route, LeagueCard, page rewrite) imports from this single source of truth, so it must be in place before any implementation task begins.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST add `LeagueHubItem` interface to `lib/api/types.ts` as specified in TechSpec "Core Interfaces" section.
2. MUST add `CopaCountdown` interface to `lib/api/types.ts` (or confirm it lives in `lib/leagues/get-days-until-copa.ts` and is re-exported from `types.ts` for API consumers).
3. MUST add the `LeagueHubResponse` (or equivalent) type for the `GET /api/leagues/hub` 200 response body as specified in TechSpec "Data Models" section.
4. MUST NOT modify or remove any existing type in `lib/api/types.ts`.
5. All new types MUST be exported so that importing modules do not need to use internal paths.
6. TypeScript compilation MUST succeed with no new errors (`tsc --noEmit`).
</requirements>

## Subtasks

- [x] 2.1 Read `lib/api/types.ts` in full to understand current exports and naming conventions.
- [x] 2.2 Add `CopaCountdown`, `LeagueHubItem`, and the hub API response type following existing naming patterns.
- [x] 2.3 Run `tsc --noEmit` to confirm no type errors were introduced.
- [x] 2.4 Write a type-level test (compile-time assertion or a Vitest type-check test) that the new interfaces satisfy their expected shapes.

## Implementation Details

See TechSpec "Core Interfaces" and "Data Models" sections for exact field names, types, and derivation rules for each field of `LeagueHubItem`.

Existing naming pattern in `lib/api/types.ts`: `ApiSuccessResponse<T>`, `LeagueSummary`, `LeagueMember`. New types should follow the same PascalCase, generic-wrapper pattern where appropriate.

### Relevant Files

- `lib/api/types.ts` — file to modify (additive only)
- `vitest.config.ts` — test setup for any type-check tests

### Dependent Files

- `lib/leagues/get-leagues-hub.ts` — imports `LeagueHubItem` (Task 03)
- `app/api/leagues/hub/route.ts` — imports `LeagueHubItem` and response type (Task 04)
- `components/LeagueCard.tsx` — imports `LeagueHubItem` for props (Task 05)
- `app/ligas/page.tsx` — imports `LeagueHubItem` (Task 06)

## Deliverables

- Updated `lib/api/types.ts` with three new exported types
- `tests/unit/types-hub.test.ts` (or equivalent) confirming shape correctness
- Unit tests with 80%+ coverage **(REQUIRED)**

## Tests

- Unit tests:
  - [x] A `LeagueHubItem` object with all required fields assigned compiles without TypeScript errors.
  - [x] A `LeagueHubItem` object missing the `is_member` field causes a TypeScript compile error (type narrowing test).
  - [x] `CopaCountdown` with `{ days: 0, isUnderway: true }` is assignable to the type without error.
  - [x] The hub API response wrapper type correctly wraps `{ leagues: LeagueHubItem[], user: { first_name: string }, countdown: CopaCountdown }`.
- Integration tests:
  - [ ] (None required — type-only file, no runtime behavior.)
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- `tsc --noEmit` exits 0 after this change.
- All downstream task files can import from `lib/api/types.ts` without path hacks.
