---
status: completed
title: Copa Countdown Utility
type: backend
complexity: low
dependencies: []
---

# Task 1: Copa Countdown Utility

## Overview

Create `lib/leagues/get-days-until-copa.ts`, a pure function that returns how many calendar days remain until June 11, 2026 and whether the Copa is already underway. This utility has no side effects and no external dependencies, making it the safest starting point in the build sequence — `app/ligas/page.tsx` calls it at render time to drive the countdown banner.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST export a function `getDaysUntilCopa(): CopaCountdown` from `lib/leagues/get-days-until-copa.ts`.
2. MUST export the `CopaCountdown` interface (or re-export from `lib/api/types.ts` if added there) with fields `days: number` and `isUnderway: boolean`.
3. `days` MUST be the floor of calendar days from today's local midnight to June 11 2026 00:00 UTC; it MUST NOT be negative — clamp at 0 when the date has passed.
4. `isUnderway` MUST be `true` when today's date is on or after June 11, 2026.
5. MUST NOT make any network calls or read any environment variables.
6. The Copa date (June 11, 2026) MUST be a named constant inside the file, not a magic literal.
</requirements>

## Subtasks

- [x] 1.1 Create `lib/leagues/get-days-until-copa.ts` with the `CopaCountdown` interface and `getDaysUntilCopa` function.
- [x] 1.2 Write unit tests covering: a date before June 11 2026, exactly June 11 2026, and a date after June 11 2026.
- [x] 1.3 Verify the function is exported correctly and importable from other modules.

## Implementation Details

See TechSpec "Core Interfaces" section for the `CopaCountdown` interface definition and the expected return shape.

The function is called once per Server Component render (step 1 in TechSpec "Development Sequencing"). No caching or memoization needed — it is a pure calculation.

### Relevant Files

- `lib/leagues/get-days-until-copa.ts` — new file to create
- `lib/api/types.ts` — may house `CopaCountdown` if it is needed by the API response type (see Task 02)
- `tests/unit/` — unit test directory (Vitest, `environment: 'node'`)
- `vitest.config.ts` — test runner configuration

### Dependent Files

- `app/ligas/page.tsx` — Server Component calls `getDaysUntilCopa()` to render the countdown banner (Task 06)
- `app/api/leagues/hub/route.ts` — API route includes `countdown: CopaCountdown` in its response (Task 04)

## Deliverables

- `lib/leagues/get-days-until-copa.ts` — exported `getDaysUntilCopa` function and `CopaCountdown` interface
- `tests/unit/get-days-until-copa.test.ts` — unit test suite
- Unit tests with 80%+ coverage **(REQUIRED)**

## Tests

- Unit tests:
  - [x] `getDaysUntilCopa()` called with system date mocked to May 1 2026 returns `isUnderway: false` and `days` equal to the correct calendar count to June 11 2026.
  - [x] `getDaysUntilCopa()` called with system date mocked to June 11 2026 returns `isUnderway: true` and `days: 0`.
  - [x] `getDaysUntilCopa()` called with system date mocked to June 20 2026 returns `isUnderway: true` and `days: 0` (no negative values).
  - [x] `CopaCountdown` type shape: returned object has exactly the `days` and `isUnderway` fields.
- Integration tests:
  - [ ] (None required — pure utility with no I/O boundaries.)
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- `getDaysUntilCopa()` is importable with no runtime errors in a Node environment.
- `days` is never negative regardless of the current date.
