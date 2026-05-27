---
status: completed
title: "Sync endpoint (`POST /api/admin/sync-matches`)"
type: backend
complexity: medium
dependencies:
  - task_02
  - task_03
---

# Task 04: Sync endpoint (`POST /api/admin/sync-matches`)

## Overview

Creates the protected admin endpoint `POST /api/admin/sync-matches` that fetches all Copa 2026 fixtures from API Football via `fetchWorldCupFixtures()`, maps them to the `matches` table schema (resolving flag codes from `ALL_COPA_TEAMS`), upserts all rows, deletes any remaining placeholder rows (`external_id IS NULL`), and invalidates the Next.js fetch cache. This is a one-time + periodic operation that populates the database with real fixture data before the betting UI can be used.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST protect the endpoint with `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` header check; return 401 for missing or incorrect token
- MUST call `fetchWorldCupFixtures()` and upsert all returned fixtures into `matches` using `external_id` as the conflict key (see TechSpec "Sync upsert logic" section)
- MUST resolve `home_flag`/`away_flag` by looking up team name in `ALL_COPA_TEAMS`; store `null` if not found
- MUST delete all rows where `external_id IS NULL` after a successful upsert
- MUST call `revalidateTag('fixtures')` after the transaction completes
- MUST emit structured log events `sync_start` and `sync_complete` with `upserted` count and `duration_ms` (see TechSpec "Monitoring and Observability")
- MUST return 500 with a descriptive error if `fetchWorldCupFixtures()` throws or the DB write fails
- SHOULD use the Supabase service role client (not the user session client) for the upsert
- MUST map `ApiFootballFixture.league.round` → `phase` and `league.group` → `group` fields per TechSpec mapping rules
</requirements>

## Subtasks

- [x] 4.1 Create `app/api/admin/sync-matches/route.ts` with POST handler and service-key auth guard
- [x] 4.2 Implement fixture-to-match mapping logic (team names, flag codes, phase/group parsing)
- [x] 4.3 Implement upsert + cleanup transaction (upsert all, then delete `external_id IS NULL`)
- [x] 4.4 Call `revalidateTag('fixtures')` and emit log events
- [x] 4.5 Write unit tests mocking `fetchWorldCupFixtures` and the Supabase client

## Implementation Details

See TechSpec "API Endpoints — POST /api/admin/sync-matches" section for request/response contract, sync sequence, and log events. See ADR-002 for rationale on the upsert-then-delete approach.

Auth guard pattern: compare `request.headers.get('Authorization')` to `'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY`. Use `getSupabaseServerClient` with the service role key for DB writes (not the user session). Follow the existing route handler conventions in `app/api/leagues/[id]/route.ts` for structured logging and response formatting.

Phase mapping from API Football `league.round`:
- `"Group Stage - *"` → `phase: 'group'`, group extracted from `league.group` (e.g. `"Group A"` → `'A'`)
- Knockout rounds map to their respective phase strings per TechSpec

### Relevant Files

- `app/api/leagues/[id]/route.ts` — reference for logging, auth patterns, and response formatting
- `app/api/leagues/[id]/champion-bet/route.ts` — reference for service-level auth guard pattern
- `lib/football-api.ts` (task_03) — `fetchWorldCupFixtures()` caller
- `lib/copa-teams.ts` — `ALL_COPA_TEAMS` for flag code resolution
- `lib/api/responses.ts` — `formatSuccess`, `formatError` helpers
- `lib/supabase/client.ts` — `getSupabaseServerClient`

### Dependent Files

- (None — this endpoint is triggered manually or via cron; no other task calls it)

### Related ADRs

- [ADR-002: Sync API Football Fixture Data Into the Existing `matches` Table](../adrs/adr-002.md) — mandates the upsert approach with `external_id` conflict key and the cleanup of placeholder rows
- [ADR-003: Next.js Fetch Cache With Revalidate Tags for API Football Responses](../adrs/adr-003.md) — mandates `revalidateTag('fixtures')` call after sync

## Deliverables

- `app/api/admin/sync-matches/route.ts`
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for auth guard and upsert behaviour **(REQUIRED)**

## Tests

- Unit tests:
  - [x] POST with missing `Authorization` header returns 401
  - [x] POST with `Authorization: Bearer wrong-key` returns 401
  - [x] POST with correct service key and mocked `fetchWorldCupFixtures()` returning 2 fixtures calls Supabase upsert with 2 rows
  - [x] POST calls `DELETE FROM matches WHERE external_id IS NULL` after successful upsert
  - [x] POST returns `{ status: 'success', data: { upserted: 2, skipped: 0 } }` on success
  - [x] POST when `fetchWorldCupFixtures()` throws returns 500
  - [x] Team name found in `ALL_COPA_TEAMS` maps to correct 2-letter flag code; unknown team maps to `null`
  - [x] `league.round = "Group Stage - 1"` maps to `phase: 'group'`; `league.group = "Group A"` maps to `group: 'A'`
- Integration tests:
  - [x] POST with correct service key against local Supabase upserts a seeded fixture and returns 200 with `upserted: 1`
  - [x] A second POST with the same fixture updates the row (idempotent — row count stays 1)
  - [x] After sync, all rows with `external_id IS NULL` are deleted from `matches`
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- `POST /api/admin/sync-matches` with correct Bearer token returns 200 with `upserted` count
- Placeholder rows (`external_id IS NULL`) are absent from `matches` after first successful sync
- `revalidateTag('fixtures')` is called exactly once per successful sync
- Unauthorized requests consistently return 401
