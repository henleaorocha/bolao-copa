---
status: completed
title: Leagues Hub Data Layer
type: backend
complexity: medium
dependencies:
  - task_02
---

# Task 3: Leagues Hub Data Layer

## Overview

Create `lib/leagues/get-leagues-hub.ts`, the shared server function that queries Supabase for all leagues visible to a given user, applies the tri-group sort (main → private members → public), and returns a `LeagueHubItem[]`. Both `app/ligas/page.tsx` and `app/api/leagues/hub/route.ts` call this function directly — no HTTP round-trip. Add `MAIN_LEAGUE_ID` to `.env.local` to enable the PRINCIPAL badge.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST export `getLeaguesHub(supabase: SupabaseClient, userId: string): Promise<LeagueHubItem[]>` from `lib/leagues/get-leagues-hub.ts`.
2. MUST implement the three-group sort order defined in TechSpec "Data Models" — Sort Order section: `is_main` first, then private member leagues by `joined_at DESC`, then remaining public leagues by `member_count DESC`.
3. MUST set `is_member: true` for any league the user has already joined (public or private).
4. MUST set `is_main: true` only for the league whose `id === process.env.MAIN_LEAGUE_ID`; MUST gracefully return `is_main: false` for all leagues when `MAIN_LEAGUE_ID` is unset.
5. MUST NOT duplicate a league — a public league the user has joined MUST appear once, in the membership group (position 2), not in the public group (position 3).
6. MUST log a structured warning (using the project's existing JSON log pattern) when the returned array is empty.
7. `MAIN_LEAGUE_ID` MUST be added to `.env.local` with the real UUID from Supabase before the function is tested end-to-end.
8. SHOULD use a single Supabase query (or minimal queries) rather than N+1 calls.
</requirements>

## Subtasks

- [x] 3.1 Create `lib/leagues/get-leagues-hub.ts` with the `getLeaguesHub` function signature and Supabase query logic.
- [x] 3.2 Implement the tri-group sort and deduplication logic in-memory after the query returns.
- [x] 3.3 Add `MAIN_LEAGUE_ID=00000000-0000-0000-0000-000000000001` to `.env.local` (Test Bolão UUID from Supabase).
- [x] 3.4 Add a startup warning log when `MAIN_LEAGUE_ID` is unset (see TechSpec "Technical Considerations" → Known Risks).
- [x] 3.5 Write unit tests for sort order and deduplication using mock Supabase data.

## Implementation Details

See TechSpec "Core Interfaces", "Data Models", and "Integration Points" sections for the function signature, `LeagueHubItem` fields, sort order rules, and the `MAIN_LEAGUE_ID` env var usage.

Pattern reference: `app/dashboard/page.tsx` and `lib/resolve-active-league.ts` for the Supabase server client usage pattern and structured log format.

### Relevant Files

- `lib/leagues/get-leagues-hub.ts` — new file to create
- `lib/supabase/client.ts` — `getSupabaseServerClient()` pattern (this function receives the client as a parameter)
- `lib/api/types.ts` — `LeagueHubItem` type (Task 02)
- `lib/resolve-active-league.ts` — reference for Supabase query patterns and structured logging
- `app/api/leagues/route.ts` — reference for JSON log pattern (`timestamp`, `level`, `endpoint`, `duration`)
- `.env.local` — add `MAIN_LEAGUE_ID`
- `tests/unit/` — Vitest unit test directory

### Dependent Files

- `app/api/leagues/hub/route.ts` — calls `getLeaguesHub()` (Task 04)
- `app/ligas/page.tsx` — calls `getLeaguesHub()` (Task 06)

### Related ADRs

- [ADR-002: Server Component with Shared Data Layer](adrs/adr-002.md) — mandates that both the Server Component and API route call this shared function; forbids HTTP loopback calls from SSR.
- [ADR-003: Test Bolao Identification via MAIN_LEAGUE_ID Env Var](adrs/adr-003.md) — prescribes the env-var approach for `is_main` identification and graceful degradation when unset.

## Deliverables

- `lib/leagues/get-leagues-hub.ts` — exported `getLeaguesHub` function
- `.env.local` updated with `MAIN_LEAGUE_ID`
- `tests/unit/get-leagues-hub.test.ts` — unit test suite
- Unit tests with 80%+ coverage **(REQUIRED)**

## Tests

- Unit tests:
  - [x] `getLeaguesHub()` with a mix of one main-league, two private member leagues, and two public non-member leagues returns them in the correct tri-group order.
  - [x] `getLeaguesHub()` where the user is a member of a public league returns that league once in the membership group and omits it from the public group.
  - [x] `getLeaguesHub()` with `MAIN_LEAGUE_ID` set to a matching UUID returns `is_main: true` only for that league.
  - [x] `getLeaguesHub()` with `MAIN_LEAGUE_ID` unset (or set to an unknown UUID) returns `is_main: false` for all leagues without throwing.
  - [x] `getLeaguesHub()` returning zero leagues triggers the structured warning log.
  - [x] Private member leagues are sorted by `joined_at DESC` (most recent first).
  - [x] Public non-member leagues are sorted by `member_count DESC`.
- Integration tests:
  - [ ] (Integration covered by Task 04 — the API route test exercises the full stack including this function.)
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- `MAIN_LEAGUE_ID` is set in `.env.local` and the function returns `is_main: true` for "Test Bolao".
- No duplicate leagues in the returned array regardless of input data shape.
