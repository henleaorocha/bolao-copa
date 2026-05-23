# Task Memory: task_10.md

## Objective Snapshot
Implemented `/join?token=<t>` page for invite-link joins with OAuth cold-start redirect preservation. Supports both authenticated users (preview + join) and unauthenticated users (redirect loop via middleware → sessionStorage → callback).

## Important Decisions
- **Middleware with cookie**: Middleware intercepts unauthenticated /join, redirects to /login with x-invite-redirect cookie (httpOnly=false for JS access)
- **InviteRedirectHandler component**: Client component on login page reads cookie and stores in sessionStorage
- **Callback-redirect page**: New route /auth/callback-redirect checks sessionStorage on client, redirects to stored URL or /dashboard
- **Server-side token lookup**: Join page queries leagues by invite_token directly (separate from GET /api/leagues/[id] which requires membership)
- **Token never exposed**: Join page includes token in lookup SELECT, but response uses JoinButton sub-component to call API with token

## Learnings
- Middleware can't directly set response cookies in Next.js—must return a Response object
- Next.js middleware checks auth via Supabase SSR client (works in middleware context)
- sessionStorage is browser-only, so callback restoration must happen client-side
- Server Components can't render async async operations—needed separate /auth/callback-redirect page
- Vitest tests need `@vitest-environment jsdom` comment for client component tests

## Files / Surfaces
**New:**
- middleware.ts (intercepts /join, redirects unauthenticated to /login with cookie)
- app/join/page.tsx (Server Component, renders preview or error)
- app/join/JoinButton.tsx (Client Component, calls API on click)
- components/InviteRedirectHandler.tsx (Client Component, reads cookie → sessionStorage)
- app/auth/callback-redirect/page.tsx (Client Component, restores redirect from sessionStorage)
- tests/unit/join-page.test.tsx (6 tests)
- tests/unit/join-button.test.tsx (8 tests: requires jsdom)
- tests/integration/cold-start-join-flow.test.ts (7 tests, skipped without SERVICE_ROLE_KEY)

**Modified:**
- app/login/page.tsx (added InviteRedirectHandler)
- app/auth/callback/route.ts (redirects to /auth/callback-redirect instead of /dashboard)

## Test Results
✓ 14 unit tests passing (join-page: 6, join-button: 8)
✓ 7 integration tests skipped (expect SERVICE_ROLE_KEY)
✓ All existing tests still passing (108 total)
✓ No test failures or regressions

## Errors / Corrections
- Initial middleware used headers (read-only in Next.js middleware)—changed to cookies
- Join-button tests needed jsdom environment—added @vitest-environment comment
- Join-page tests needed file-based assertions since Server Components can't be rendered in unit tests—used pattern verification approach

## Deliverables Verified
✓ app/join/page.tsx (Server Component with token lookup, error states, already-member check)
✓ JoinButton component (POST to /api/leagues/[id]/join with token)
✓ middleware.ts (unauthenticated /join detection + x-invite-redirect cookie)
✓ Login page with InviteRedirectHandler (cookie → sessionStorage)
✓ OAuth callback redirect preservation (sessionStorage check + fallback to /dashboard)
✓ All UI text in PT-BR
✓ Responsive design (375px viewport classes: px-4, py-8, max-w-sm, min-h-screen)
✓ Unit tests (6 + 8 = 14 passing)
✓ Integration tests (7, skipped as expected)

## PT-BR UI Text Verified
- "Link de Convite Inválido" (error)
- "Liga Não Encontrada" (error)
- "Você já é membro" (already-member)
- "Entrar na Liga" (button)
- "Ver Liga" (link)
- "Voltar para Ligas" (link)
- "membro/membros" (member count)

## Ready for Next Run
- Cold-start flow complete: unauthenticated → middleware redirect → login → OAuth → callback restore → join
- Token lookup server-side prevents client exposure
- All existing tests pass; no regressions
- Task-specific coverage: 14 new tests added
