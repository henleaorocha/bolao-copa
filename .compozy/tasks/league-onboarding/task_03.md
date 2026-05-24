---
status: completed
title: "Update `GET /api/leagues/{id}` — expose `invite_token` and `user_onboarded_at`"
type: backend
complexity: medium
dependencies:
  - task_02
---

# Task 3: Update `GET /api/leagues/{id}` — expose `invite_token` and `user_onboarded_at`

## Overview

Extends the existing GET handler for `app/api/leagues/[id]/route.ts` to include two new fields in its response: `invite_token` (from the `leagues` table) and `user_onboarded_at` (the calling user's `onboarded_at` from `league_members`). The league detail page uses these to decide whether to render the welcome modal and to construct the share URL on Screen 4.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST include `invite_token` in the Supabase SELECT from `leagues` (currently excluded)
- MUST include `onboarded_at` in the Supabase SELECT from `league_members` so the caller's onboarding status can be read
- MUST derive `user_onboarded_at` by finding the authenticated user's row in the already-fetched members list — no second query
- MUST set `user_onboarded_at: null` when the authenticated user's `league_members.onboarded_at` is null (first-time visitor)
- MUST set `user_onboarded_at` to the ISO timestamp string when the column is set (returning visitor)
- MUST NOT change the HTTP status codes, error codes, or shape of any other field in the response
- All response fields must match the updated `LeagueDetail` type from task_02
</requirements>

## Subtasks

- [x] 3.1 Add `invite_token` to the Supabase SELECT clause for the `leagues` table fetch
- [x] 3.2 Add `onboarded_at` to the `league_members` SELECT clause (already fetches members; extend the field list)
- [x] 3.3 Extract `user_onboarded_at` from the members list using `find(m => m.user_id === session.user.id)`
- [x] 3.4 Add `invite_token` and `user_onboarded_at` to the response object
- [x] 3.5 Update the response type annotation from `LeagueDetail` (ensure TypeScript validates the new fields)
- [x] 3.6 Add integration tests for both new fields

## Implementation Details

See TechSpec "API Endpoints — Modified: GET /api/leagues/{id}" section. The GET handler currently fetches `leagues` with a fixed field list that does NOT include `invite_token`. The `league_members` SELECT already returns per-member data; extend it with `onboarded_at`.

The user identification for `user_onboarded_at` uses the already-resolved `session.user.id` from the auth check at the top of the handler — no extra auth call needed.

Current response object shape (abbreviated):
```typescript
// Today
return NextResponse.json({ status: 'success', data: { id, name, ..., members }, timestamp })

// After this task
return NextResponse.json({ status: 'success', data: { id, name, ..., invite_token, user_onboarded_at, members }, timestamp })
```

### Relevant Files

- `app/api/leagues/[id]/route.ts` — the only file to modify; GET handler starts around line 1
- `lib/api/types.ts` — `LeagueDetail` (updated in task_02); ensure the response object satisfies the type
- `tests/integration/leagues.test.ts` — integration tests; add assertions for new fields here

### Dependent Files

- `app/ligas/[id]/page.tsx` — reads the GET response; will use `user_onboarded_at` and `invite_token` in task_06
- `tests/unit/league-detail.test.tsx` — may have fixtures using `LeagueDetail`; update if `invite_token` is required (non-optional field)

### Related ADRs

- [ADR-002: Extend LeagueDetail API Response](../adrs/adr-002.md) — decision to extend the existing GET response rather than create separate endpoints

## Deliverables

- Updated `app/api/leagues/[id]/route.ts` — GET handler returns `invite_token` and `user_onboarded_at`
- Integration tests for new response fields **(REQUIRED)**

## Tests

- Unit tests:
  - [ ] N/A — handler logic is too tightly coupled to Supabase to unit-test meaningfully; covered by integration tests
- Integration tests:
  - [x] `GET /api/leagues/{id}` response body includes `invite_token` as a non-empty string for a member
  - [x] `GET /api/leagues/{id}` returns `user_onboarded_at: null` for a user who has never opened the modal
  - [ ] `GET /api/leagues/{id}` returns `user_onboarded_at` as an ISO timestamp string after `PATCH /api/leagues/{id}/me` has been called (cross-task integration; requires task_04 to be complete)
  - [x] All previously passing `GET /api/leagues/{id}` assertions still pass (regression)
  - [x] `GET /api/leagues/{id}` still returns 401 for unauthenticated requests (regression)
  - [ ] `GET /api/leagues/{id}` still returns 403 for a non-member (regression — requires HTTP cookie fix, deferred)
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- `GET /api/leagues/{id}` response includes `invite_token` (string) and `user_onboarded_at` (string | null)
- Response for a fresh member has `user_onboarded_at: null`
- Response for an onboarded member has `user_onboarded_at` set to a valid ISO timestamp
- No other response fields or status codes changed
