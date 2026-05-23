---
status: completed
title: Auth Callback Redirect Update
type: frontend
complexity: low
dependencies: []
---

# Task 7: Auth Callback Redirect Update

## Overview

Change the fallback redirect destination in `app/auth/callback-redirect/page.tsx` from `'/dashboard'` to `'/ligas'`. This is a single string replacement. The invite redirect path (read from `sessionStorage.inviteRedirect`) is checked first and remains unchanged — only the fallback path that runs when no invite redirect is present is updated.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. MUST change the fallback redirect string from `'/dashboard'` to `'/ligas'` in `app/auth/callback-redirect/page.tsx`.
2. MUST NOT modify the invite redirect path — `sessionStorage.inviteRedirect` check and redirect MUST remain intact and take precedence over the fallback.
3. MUST NOT change any other logic in the file (no cleanup, no refactor beyond the string change).
4. After OAuth completion, a browser session with no `sessionStorage.inviteRedirect` MUST land on `/ligas`.
5. After OAuth completion, a browser session with `sessionStorage.inviteRedirect` set MUST still land on the invite redirect path (regression guard).
</requirements>

## Subtasks

- [x] 7.1 Read `app/auth/callback-redirect/page.tsx` and locate the fallback redirect string.
- [x] 7.2 Replace `'/dashboard'` with `'/ligas'` as the fallback destination.
- [x] 7.3 Write integration tests for both the invite-redirect path and the fallback path.

## Implementation Details

See TechSpec "API Endpoints" → "Modified: app/auth/callback-redirect/page.tsx" for the scope of this change.

See TechSpec "Technical Considerations" → Known Risks: "Auth redirect change breaks the existing invite flow" — the invite path uses `sessionStorage.inviteRedirect` and is checked before the fallback; this task MUST NOT touch that logic.

### Relevant Files

- `app/auth/callback-redirect/page.tsx` — file to modify (one string change)
- `tests/integration/auth.test.ts` — existing auth integration tests to update/extend

### Dependent Files

- No downstream files are affected by this change; the route the user lands on changes, but no component depends on the callback page's redirect target.

## Deliverables

- Updated `app/auth/callback-redirect/page.tsx` (one-line change)
- Updated or new test case in `tests/integration/auth.test.ts`
- Unit tests with 80%+ coverage **(REQUIRED)**
- Integration tests for auth redirect behavior **(REQUIRED)**

## Tests

- Unit tests:
  - [x] `app/auth/callback-redirect` renders without errors (smoke test — component mounts and runs redirect logic without throwing).
- Integration tests:
  - [x] After OAuth callback with no `sessionStorage.inviteRedirect`, the component navigates to `/ligas` (not `/dashboard`).
  - [x] After OAuth callback with `sessionStorage.inviteRedirect = '/join/abc123'`, the component navigates to `/join/abc123` (invite path preserved).
- Test coverage target: >=80%
- All tests must pass

## Success Criteria

- All tests passing
- Test coverage >=80%
- Manual smoke test: completing Google OAuth in the browser lands on `/ligas`, not `/dashboard`.
- Existing invite-redirect flow is unbroken: a join link still deep-links the user to the correct league join page after auth.
