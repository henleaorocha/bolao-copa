---
status: completed
title: "API Football client (`lib/football-api.ts`)"
type: backend
complexity: low
dependencies:
  - task_02
---

# Task 03: API Football client (`lib/football-api.ts`)

## Overview

Creates `lib/football-api.ts`, a single-function module that fetches all Copa 2026 fixtures from API Football and returns them as typed `ApiFootballFixture[]`. Uses the Next.js App Router native fetch cache with a 1-hour revalidation TTL and tag-based invalidation, bounding external API calls to one per sync trigger regardless of UI traffic.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST export `ApiFootballFixture` interface and `fetchWorldCupFixtures(): Promise<ApiFootballFixture[]>` from `lib/football-api.ts`
- MUST use `next: { revalidate: 3600, tags: ['fixtures'] }` on the fetch call (see ADR-003)
- MUST read `API_FOOTBALL_KEY` from `process.env` — never hardcode or expose to the browser
- MUST throw an error if the API response is not ok (non-2xx status)
- MUST add `API_FOOTBALL_KEY=<your-api-football-key>` to `.env.example`
- SHOULD NOT call `revalidateTag` — that is the sync endpoint's responsibility (task_04)
- `API_FOOTBALL_KEY` MUST NOT have a `NEXT_PUBLIC_` prefix
</requirements>

## Subtasks

- [x] 3.1 Create `lib/football-api.ts` with the `ApiFootballFixture` interface
- [x] 3.2 Implement `fetchWorldCupFixtures()` with the correct API Football URL, auth header, and Next.js fetch cache options
- [x] 3.3 Add `API_FOOTBALL_KEY` to `.env.example`
- [x] 3.4 Write unit tests mocking `fetch`

## Implementation Details

See TechSpec "Integration Points — API Football v3" and "Core Interfaces — `lib/football-api.ts`" sections for the exact URL, headers, and interface shape. See ADR-003 for the caching rationale and the exact fetch options.

The function fetches `GET /fixtures?league=1&season=2026` and returns the parsed `response.data` array. Map errors to thrown `Error` objects so callers can catch them without parsing response bodies.

### Relevant Files

- `.env.example` — add `API_FOOTBALL_KEY` entry here

### Dependent Files

- `app/api/admin/sync-matches/route.ts` (task_04) — the only caller of `fetchWorldCupFixtures()`

### Related ADRs

- [ADR-003: Next.js Fetch Cache With Revalidate Tags for API Football Responses](../adrs/adr-003.md) — mandates `next: { revalidate: 3600, tags: ['fixtures'] }` and explains why alternative caching approaches were rejected

## Deliverables

- `lib/football-api.ts` with `ApiFootballFixture` interface and `fetchWorldCupFixtures()` export
- Updated `.env.example` with `API_FOOTBALL_KEY` entry
- Unit tests with 80%+ coverage **(REQUIRED)**

## Tests

- Unit tests:
  - [x] `fetchWorldCupFixtures()` with a mocked successful fetch returning 3 fixture objects returns an array of length 3 with correct field mapping
  - [x] `fetchWorldCupFixtures()` with a mocked fetch returning HTTP 429 throws an error (does not return a value)
  - [x] `fetchWorldCupFixtures()` with a mocked fetch returning malformed JSON (non-array `data`) throws or returns empty array consistently
  - [x] The fetch call is made with `x-apisports-key` header equal to `process.env.API_FOOTBALL_KEY`
  - [x] The fetch call includes `next: { revalidate: 3600, tags: ['fixtures'] }` in options
- Integration tests:
  - [ ] (None — integration with real API Football is gated behind env var; skip in CI without key)
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- `lib/football-api.ts` exports both `ApiFootballFixture` and `fetchWorldCupFixtures`
- `.env.example` contains `API_FOOTBALL_KEY` (without `NEXT_PUBLIC_` prefix)
- `tsc --noEmit` exits 0
