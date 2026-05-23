---
status: completed
title: Join Page & OAuth Cold-Start Redirect Preservation
type: frontend
complexity: high
dependencies:
    - task_04
    - task_05
    - task_06
---

# Task 10: Join Page & OAuth Cold-Start Redirect Preservation

## Overview
The `/join?token=<t>` page is the entry point for invite-link joins. It must work for both authenticated users (show preview and join) and unauthenticated cold-start users (preserve the invite URL through the OAuth redirect loop and return them to the join page after login). This is one of the highest-risk flows in the feature.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
1. `app/join/page.tsx` MUST be a Server Component that reads `?token=` from the URL, performs a server-side Supabase query to find the league by `invite_token`, and renders a join preview card (name, avatar, member count) with an "Entrar na Liga" button.
2. If the user is already a member of the league, `app/join/page.tsx` MUST show a PT-BR confirmation that they are already in the league, with a link to `/ligas/[id]`.
3. If the token is invalid (no matching league), `app/join/page.tsx` MUST show a PT-BR error state.
4. The "Entrar na Liga" button MUST be a Client Component that calls `POST /api/leagues/[id]/join` with the token on click; on success, it navigates to `/ligas/[id]`.
5. `middleware.ts` (new file at project root) MUST intercept unauthenticated requests to `/join` and attach an `x-invite-redirect` response header containing the original URL (`/join?token=<t>`).
6. The login page (`app/login/page.tsx` or wherever the login UI is) MUST read the `x-invite-redirect` header and store the value in `sessionStorage` under the key `inviteRedirect` before triggering the OAuth flow.
7. `app/auth/callback/route.ts` MUST check `sessionStorage` for `inviteRedirect` after a successful OAuth exchange; if present, redirect to that URL and clear the key; if absent, use the existing `/dashboard` redirect.
8. The cold-start flow MUST complete without losing the invite URL even when the user navigates away to the OAuth provider and back.
9. ALL UI text on the join page MUST be in PT-BR.
10. The join page MUST be responsive and usable on a 375px viewport.
</requirements>

## Subtasks
- [ ] 10.1 Create `app/join/page.tsx` (Server Component shell + league preview via server-side token lookup)
- [ ] 10.2 Create the "Entrar na Liga" client button sub-component with join API call and navigation
- [ ] 10.3 Create `middleware.ts` at project root with unauthenticated `/join` detection and `x-invite-redirect` header injection
- [ ] 10.4 Update login page to read `x-invite-redirect` header and store in `sessionStorage`
- [ ] 10.5 Update `app/auth/callback/route.ts` to check and consume `sessionStorage.inviteRedirect` after OAuth success
- [ ] 10.6 Write E2E-style integration test for the cold-start flow (unauthenticated → OAuth → join)

## Implementation Details
`app/join/page.tsx` is a Server Component. The server-side token lookup uses `getSupabaseServerClient()` to query `leagues WHERE invite_token = token`. This query should succeed even without membership because it's running with the service role or because the RLS on `leagues` allows lookup by `invite_token` (check the existing SELECT policy — if it doesn't allow this, use the admin client server-side).

The `middleware.ts` file uses Next.js middleware. It runs before rendering and can read request headers and set response headers. For unauthenticated `/join` requests, it should check for the absence of a Supabase auth cookie and set the response header. See TechSpec "Integration Points — OAuth Cold-Start Redirect Preservation" for the exact 6-step flow.

`sessionStorage` is browser-only. The login page reads the header from the server response (`response.headers.get('x-invite-redirect')`), which means the login page needs a small `useEffect` or a client-rendered component to access headers and write to `sessionStorage`. Alternatively, the middleware can set a cookie instead of a header to avoid the browser JS requirement.

See TechSpec "Integration Points" for the canonical implementation plan and test scenario 7.

### Relevant Files
- `app/auth/callback/route.ts` — OAuth callback to modify (currently redirects to `/dashboard`)
- `app/login/page.tsx` — login page to update (add `x-invite-redirect` → sessionStorage logic)
- `lib/supabase/client.ts` — `getSupabaseServerClient()` for server-side token lookup
- `app/api/leagues/[id]/join/route.ts` — `POST` endpoint called by the join button (task_06)
- `app/api/leagues/[id]/route.ts` — `GET` endpoint for league detail (task_05); may be needed for rendering the preview card after join

### Dependent Files
- `app/ligas/[id]/page.tsx` — join success navigates here (task_09)
- `lib/league-context.tsx` — after join, `setLeague()` should be called if the user has the context loaded (task_03)

### Related ADRs
- [ADR-003: Invite Token as Column on leagues Table](adrs/adr-003.md) — Token lookup and never-expose requirement applies to the join page server query

## Deliverables
- `app/join/page.tsx` (new)
- `middleware.ts` (new)
- Updated `app/login/page.tsx`
- Updated `app/auth/callback/route.ts`
- Integration tests for cold-start flow **(REQUIRED)**
- Unit tests for join page states (valid token, invalid token, already member) **(REQUIRED)**

## Tests
- Unit tests:
  - [ ] `app/join/page.tsx` with a valid token and unauthenticated user shows the league name, avatar, and member count in the preview card
  - [ ] `app/join/page.tsx` with a valid token and the user already a member shows the PT-BR "você já é membro" state with a link to `/ligas/[id]`
  - [ ] `app/join/page.tsx` with an invalid or missing token shows the PT-BR error state
  - [ ] "Entrar na Liga" button calls `POST /api/leagues/[id]/join` with the correct token and navigates to `/ligas/[id]` on success
- Integration tests:
  - [ ] Unauthenticated GET `/join?token=abc123` goes through middleware → `x-invite-redirect` header is present in the response
  - [ ] After OAuth callback with `inviteRedirect` stored in sessionStorage, the user is redirected to `/join?token=abc123` (not `/dashboard`)
  - [ ] After OAuth callback without `inviteRedirect` in sessionStorage, the user is redirected to `/dashboard` (existing behavior preserved)
  - [ ] Full cold-start flow: unauthenticated → middleware stores URL → OAuth → callback restores URL → user lands on join page → confirms → member of the league
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Cold-start flow completes successfully: unauthenticated user who opens an invite link ends up as a member after logging in
- Existing OAuth flow (login without an invite link) is unaffected — still redirects to `/dashboard`
- All join page UI text is in PT-BR
- Page is usable on a 375px viewport
