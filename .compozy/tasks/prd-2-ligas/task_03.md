---
status: completed
title: LeagueProvider, useLeague() Hook & Layout Integration
type: frontend
complexity: medium
dependencies:
  - task_02
---

# Task 3: LeagueProvider, useLeague() Hook & Layout Integration

## Overview
This task creates the client-side React Context that makes the active league available to all Client Components without prop drilling. A `LeagueProvider` ('use client') is initialized from the server-fetched active league and mounted in the root layout. It also removes the `DEFAULT_LEAGUE_ID` hard-enrollment from `lib/user-sync.ts`, which is now handled entirely by the DB trigger.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. `lib/league-context.tsx` MUST export a `LeagueProvider` ('use client') component that accepts an `initialLeague: LeagueSummary` prop and provides `{ league, setLeague }` via React Context.
2. `useLeague()` MUST be exported from the same file and throw a descriptive error if called outside a `LeagueProvider`.
3. The context value object MUST be memoized with `useMemo` to prevent unnecessary consumer re-renders.
4. `app/layout.tsx` MUST fetch the active league server-side (via `GET /api/auth/me` or a direct Supabase query) and pass it as `initialLeague` to `LeagueProvider`; unauthenticated renders must handle the `null` case without throwing.
5. `LeagueProvider` MUST only be rendered around authenticated content — do NOT wrap the login page or other public routes inside the provider.
6. `lib/user-sync.ts` MUST have the hard-enrollment in `DEFAULT_LEAGUE_ID` removed from `ensureUserSynced()`; the DB trigger (`handle_new_user`) is now the sole enrollment mechanism.
7. The `LeagueSummary` type imported by `lib/league-context.tsx` MUST come from `lib/api/types.ts` (not redefined locally).
</requirements>

## Subtasks
- [x] 3.1 Create `lib/league-context.tsx` with `LeagueProvider`, `useLeague()`, and the `LeagueContextValue` interface
- [x] 3.2 Update `app/layout.tsx` to server-fetch the active league and mount `LeagueProvider` around authenticated children
- [x] 3.3 Remove `DEFAULT_LEAGUE_ID` hard-enrollment from `lib/user-sync.ts`
- [x] 3.4 Write unit tests for `useLeague()` hook behavior (initial value, setLeague re-render, out-of-provider error)
- [x] 3.5 Smoke-test all existing routes after the layout change to verify no regressions

## Implementation Details
`lib/league-context.tsx` is a new file. It uses `React.createContext`, `useState`, and `useMemo`. The initial value is passed as a prop from the Server Component layout, bridging server → client state (the idiomatic App Router pattern).

`app/layout.tsx` currently has no providers. After this task it will have `LeagueProvider` as the outermost client wrapper. The server-side fetch of the active league can reuse the same Supabase query logic as `GET /api/auth/me` (not a fetch to the API itself — direct Supabase call in the Server Component).

See TechSpec "Technical Considerations — React Context for active league" and ADR-004 for the memoization requirement and the explicit rejection of Zustand.

The `lib/user-sync.ts` change is a removal: delete the line(s) that insert into `league_members` with `DEFAULT_LEAGUE_ID`. The DB trigger `handle_new_user` already handles auto-enrollment for new users.

### Relevant Files
- `lib/api/types.ts` — `LeagueSummary` type to import (created in task_02)
- `app/layout.tsx` — root layout to modify; currently minimal, no providers
- `lib/user-sync.ts` — `ensureUserSynced()` has DEFAULT_LEAGUE_ID enrollment to remove
- `lib/supabase/client.ts` — `getSupabaseServerClient()` for the server-side league fetch

### Dependent Files
- `components/topbar/LeagueSwitcher.tsx` — will call `useLeague()` (task_08)
- `app/ligas/page.tsx` — will call `useLeague()` (task_07)
- `app/ligas/[id]/page.tsx` — will call `useLeague()` (task_09)
- `app/dashboard/page.tsx` — layout wraps it; must continue to render after this change (task_11)

### Related ADRs
- [ADR-004: React Context for Active League Client State](adrs/adr-004.md) — Defines the `LeagueProvider` pattern, memoization requirement, and Zustand rejection

## Deliverables
- `lib/league-context.tsx` (new)
- Updated `app/layout.tsx`
- Updated `lib/user-sync.ts` (DEFAULT_LEAGUE_ID enrollment removed)
- Unit tests for `useLeague()` hook **(REQUIRED)**
- Smoke-test confirmation that all existing routes render correctly **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] `useLeague()` returns `{ league, setLeague }` where `league` matches the `initialLeague` prop passed to `LeagueProvider`
  - [ ] Calling `setLeague(newLeague)` with a different `LeagueSummary` triggers a re-render in consumers and the new value is returned by `useLeague()`
  - [ ] `useLeague()` called outside a `LeagueProvider` tree throws an error with a descriptive message (not a silent undefined)
  - [ ] `LeagueProvider` renders its children without errors when `initialLeague` is a valid `LeagueSummary`
- Integration tests:
  - [ ] `app/layout.tsx` renders the `LeagueProvider` wrapper around authenticated page content without breaking existing dashboard/login routes
  - [ ] After removing DEFAULT_LEAGUE_ID enrollment from `ensureUserSynced()`, a new user created by the DB trigger is still auto-enrolled in the default league via the trigger alone
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- `useLeague()` is accessible from any Client Component in the app tree
- No reference to `DEFAULT_LEAGUE_ID` remains in `lib/user-sync.ts`
- All existing routes (`/dashboard`, `/login`) continue to load without errors after layout change
