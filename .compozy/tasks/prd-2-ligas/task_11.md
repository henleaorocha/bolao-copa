---
status: completed
title: "Dashboard Refactor: Replace DEFAULT_LEAGUE_ID with Dynamic Context"
type: frontend
complexity: medium
dependencies:
  - task_02
  - task_03
---

# Task 11: Dashboard Refactor: Replace DEFAULT_LEAGUE_ID with Dynamic Context

## Overview
The dashboard currently hardcodes `DEFAULT_LEAGUE_ID` in its Supabase queries to filter predictions, scores, and league membership. This task replaces that constant with the user's actual `active_league_id` from the DB, making the dashboard league-aware without changing its server-rendered architecture.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. `app/dashboard/page.tsx` MUST replace every reference to `DEFAULT_LEAGUE_ID` with the user's resolved `active_league_id` from the server-side user record (fetched via `getSupabaseServerClient()` using the same flow as updated `GET /api/auth/me`).
2. When `active_league_id` is NULL, the dashboard MUST fall back to the first `league_members` row by `joined_at ASC`, identical to the NULL-fallback logic in `GET /api/auth/me`.
3. The dashboard MUST render without errors when a user has `active_league_id = NULL` and belongs to at least one league.
4. `tests/fixtures/factories.ts` MUST have the `DEFAULT_LEAGUE_ID` constant usage audited; it may remain in test fixtures (as the seed default league ID for test setup) but MUST NOT be imported or used in `app/dashboard/page.tsx`.
5. No changes to the dashboard's visual design, component structure, or data display logic — this is a data-source refactor only.
6. The dashboard page MUST continue to pass all existing tests after this change.
</requirements>

## Subtasks
- [x] 11.1 Update `app/dashboard/page.tsx` to resolve `active_league_id` dynamically from the DB instead of the hardcoded constant
- [x] 11.2 Implement NULL fallback (first `league_members` row) in the dashboard's league resolution logic
- [x] 11.3 Confirm `tests/fixtures/factories.ts` still works for test setup; update imports in dashboard tests if needed
- [x] 11.4 Run all existing dashboard-related tests and fix any failures

## Implementation Details
`app/dashboard/page.tsx` is a Server Component. The refactor is confined to the data-fetching section at the top of the component. Currently it fetches `leagues WHERE id = DEFAULT_LEAGUE_ID`. After the refactor it fetches the user record first (to get `active_league_id`), then resolves the league using the same NULL-fallback logic as `GET /api/auth/me`.

To avoid duplicating the resolution logic, consider extracting a shared utility function (e.g., `lib/resolve-active-league.ts`) that both `app/api/auth/me/route.ts` and `app/dashboard/page.tsx` import. This is optional but avoids drift.

The existing `tests/integration/auth.test.ts` tests for the dashboard may reference `DEFAULT_LEAGUE_ID` — update assertions to use the dynamic league ID.

See TechSpec "Impact Analysis — `app/dashboard/page.tsx`" for the exact scope: "same logic, dynamic ID."

### Relevant Files
- `app/dashboard/page.tsx` — file to modify; all `DEFAULT_LEAGUE_ID` references must be removed
- `app/api/auth/me/route.ts` — reference for the `active_league_id` resolution + NULL fallback logic (task_02)
- `lib/user-sync.ts` — `DEFAULT_LEAGUE_ID` was removed from here in task_03; verify no re-introduction
- `tests/fixtures/factories.ts` — exports `DEFAULT_LEAGUE_ID` for test setup; verify it still works after dashboard change
- `tests/integration/pages.test.ts` — existing dashboard page tests to update

### Dependent Files
- None — this task has no downstream dependents in this PRD. It is a leaf-node refactor.

## Deliverables
- Updated `app/dashboard/page.tsx` (no `DEFAULT_LEAGUE_ID` references)
- Updated dashboard tests **(REQUIRED)**
- Optionally: `lib/resolve-active-league.ts` (shared utility, if extracted)

## Tests
- Unit tests:
  - [ ] Dashboard renders the correct league name when `users.active_league_id` is set to a specific league
  - [ ] Dashboard renders the fallback league (first by `joined_at ASC`) when `users.active_league_id` is NULL
  - [ ] Dashboard does not throw or render an error state when a newly created user has `active_league_id = NULL` but belongs to the default league via the DB trigger
- Integration tests:
  - [ ] After switching the active league via `PATCH /api/auth/me`, a hard reload of the dashboard shows data for the newly selected league (not the old one)
  - [ ] A user with `active_league_id` pointing to a league they were removed from sees the fallback league on the dashboard (not an error)
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- No reference to `DEFAULT_LEAGUE_ID` in `app/dashboard/page.tsx`
- All existing dashboard integration tests pass with updated assertions
- Dashboard renders correctly for users in multiple leagues with different active league selections
