---
status: completed
title: Scrub remaining api-sports references
type: chore
complexity: low
dependencies:
  - task_03
---

# Task 8: Scrub remaining api-sports references

## Overview
After the adapter rewrite (task_03) removes the api-sports types from `lib/football-api.ts`, stray references remain in environment config and docs. This task removes the `API_FOOTBALL_KEY`, the api-sports URL, and any lingering `ApiFootballFixture`/`mapFixtureStatus` references so the api-sports source is fully gone.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- `API_FOOTBALL_KEY` MUST be removed from `.env.example` and any env/config references.
- The api-sports URL (`v3.football.api-sports.io`) MUST NOT remain anywhere in the codebase.
- Any lingering `ApiFootballFixture` / `mapFixtureStatus` imports or type references (outside tests intentionally rewritten) MUST be removed.
- Removal MUST NOT break the openfootball ingestion path or its tests.
</requirements>

## Subtasks
- [x] 8.1 Grep the repo for `API_FOOTBALL_KEY`, `api-sports`, `ApiFootballFixture`, `mapFixtureStatus`.
- [x] 8.2 Remove `API_FOOTBALL_KEY` from `.env.example` and any env docs.
- [x] 8.3 Delete remaining api-sports type/URL references in non-test code.
- [x] 8.4 Add a guard test asserting no api-sports references remain.

## Implementation Details
This is a cleanup task gated on task_03 (which already removes the in-file `ApiFootballFixture`/`mapFixtureStatus`). Scope here is everything *outside* `lib/football-api.ts`: `.env.example`, any README/docs, and stray imports. Use a repo-wide search to be exhaustive. Reference ADR-006 "Remove ApiFootballFixture, mapFixtureStatus, the api-sports URL, and API_FOOTBALL_KEY."

### Relevant Files
- `.env.example` — remove `API_FOOTBALL_KEY`.
- `lib/football-api.ts` — confirm no api-sports remnants after task_03.
- Any docs referencing api-sports (search-driven).

### Dependent Files
- `app/api/admin/sync-matches/route.ts` — must still import only the openfootball seam.
- Test files that intentionally reference openfootball shapes — must not reintroduce api-sports types.

### Related ADRs
- [ADR-006: Replace api-sports with an openfootball ingestion adapter](adrs/adr-006.md) — mandates full removal of api-sports artifacts.

## Deliverables
- All api-sports env/URL/type references removed.
- A guard test asserting their absence.
- Unit tests with 80%+ coverage **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] Repo-wide search finds no `API_FOOTBALL_KEY` reference.
  - [ ] No `v3.football.api-sports.io` URL remains.
  - [ ] No `ApiFootballFixture` / `mapFixtureStatus` symbol is exported or imported in non-test code.
- Integration tests:
  - [ ] The full unit suite passes after removal (openfootball ingestion path unaffected).
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Zero api-sports references remain in code, env, or docs
- openfootball ingestion and its tests still pass
