---
status: completed
title: "Create `PATCH /api/leagues/{id}/me` endpoint"
type: backend
complexity: low
dependencies:
  - task_01
  - task_02
---

# Task 4: Create `PATCH /api/leagues/{id}/me` endpoint

## Overview

Creates a new route file `app/api/leagues/[id]/me/route.ts` that handles `PATCH /api/leagues/{id}/me`. When called by an authenticated league member, it sets `onboarded_at = NOW()` on their `league_members` row. The `LeagueWelcomeModal` component fires this request the moment it opens (Screen 1), ensuring the flag is set even if the user closes the browser mid-flow.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST create the file at `app/api/leagues/[id]/me/route.ts` (the directory `me/` does not yet exist)
- MUST use `getSupabaseServerClient()` from `lib/supabase/client` for auth (consistent with all other API routes)
- MUST return `204 No Content` (no body) on success
- MUST return `401` if there is no valid session
- MUST NOT fail if `onboarded_at` is already set — the UPDATE is idempotent (calling twice is safe)
- MUST follow the same error response format as existing routes: `{ status: 'error', error: string, code: string, statusCode: number, timestamp: string }`
- The RLS UPDATE policy from task_01 enforces row ownership — the Supabase UPDATE is scoped to `league_id + user_id`
</requirements>

## Subtasks

- [x] 4.1 Create directory `app/api/leagues/[id]/me/` and file `route.ts`
- [x] 4.2 Implement `PATCH` handler: authenticate via `getSupabaseServerClient`, update `onboarded_at` where `league_id = params.id AND user_id = user.id`
- [x] 4.3 Return `204 No Content` on success, `401` if no session
- [x] 4.4 Add integration tests covering success, 401, and non-member scenarios

## Implementation Details

See TechSpec "API Endpoints — New: PATCH /api/leagues/{id}/me" section for the full implementation. Use `new NextResponse(null, { status: 204 })` for the success response (consistent with REST conventions for no-body responses).

The `params` object follows the Next.js pattern used in this codebase:
```typescript
{ params }: { params: Promise<{ id: string }> }
const { id: leagueId } = await params
```

The Supabase UPDATE returns `{ count }` — if `count === 0` the user is not a member of that league (RLS filtered the row). Return `403` in that case.

### Relevant Files

- `app/api/leagues/[id]/route.ts` — reference for auth pattern, `getSupabaseServerClient` usage, and error response format
- `app/api/leagues/[id]/join/route.ts` — another member-level endpoint; use as secondary pattern reference
- `lib/supabase/client.ts` — `getSupabaseServerClient` implementation
- `lib/api/types.ts` — error response type for consistency

### Dependent Files

- `components/LeagueWelcomeModal.tsx` — calls `PATCH /api/leagues/{id}/me` on mount (task_05)
- `tests/integration/leagues.test.ts` — new test cases added here

### Related ADRs

- [ADR-001: Per-League Welcome Onboarding Flow](../adrs/adr-001.md) — establishes that `onboarded_at` is set on Screen 1 open (modal mount) to prevent re-triggering
- [ADR-003: PATCH /api/leagues/{id}/me Write Path](../adrs/adr-003.md) — documents why a new endpoint was chosen over reusing the existing PATCH

## Deliverables

- `app/api/leagues/[id]/me/route.ts` — new PATCH endpoint
- Integration tests for the endpoint **(REQUIRED)**

## Tests

- Unit tests:
  - [x] N/A — handler is tightly coupled to Supabase; covered by integration tests
- Integration tests:
  - [x] `PATCH /api/leagues/{id}/me` with valid session + member of league returns 204
  - [x] After calling PATCH, the `league_members.onboarded_at` column is non-null for that user (verify via subsequent GET or direct DB query)
  - [x] `PATCH /api/leagues/{id}/me` without session cookie returns 401
  - [x] `PATCH /api/leagues/{id}/me` for a league the user is not a member of returns 403
  - [x] Calling `PATCH /api/leagues/{id}/me` twice for the same user does not error (idempotency)
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- `PATCH /api/leagues/{id}/me` returns 204 for an authenticated member
- `PATCH /api/leagues/{id}/me` returns 401 for an unauthenticated request
- `PATCH /api/leagues/{id}/me` is idempotent — repeated calls do not error
- `league_members.onboarded_at` is set after the first successful PATCH call
