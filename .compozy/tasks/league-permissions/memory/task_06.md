# Task Memory: task_06.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot
DONE. `GET /api/auth/me` now exposes `can_create_league` and returns `200 + league: null`
for no-league users instead of 500. `AuthUser` gained `can_create_league: boolean`;
`AuthMeResponse.league` widened to `LeagueSummary | null`.

## Important Decisions
- Extracted a single `userPayload` object in the GET handler and reuse it on BOTH the
  no-league (`league: null`) and populated-league returns, so the flag is always present.
- Coerce with `userData.can_create_league === true` (defensive; mirrors `canCreateLeague`).
- ALSO added `can_create_league` to the PATCH user `select` (one line) for contract
  consistency — `AuthUser` is now required, so PATCH's returned user must carry it too.
  PATCH no-league is not a concern (you can only switch INTO a league you're a member of).

## Learnings
- GET consumer `app/ligas/[id]/league-panel-context.tsx` reads only `meData.data.user`,
  never `.league` → safe under `league: null`. The other two `/api/auth/me` callers
  (`LeagueSwitcher`, `LeagueCard`) are PATCH-only and already guard `data.data?.league`.
- Two test files build TYPED `AuthUser` objects and broke on the new required field:
  `tests/unit/ranking-page.test.tsx` (`makeUser`) and
  `tests/integration/league-detail-page.test.tsx` (`mockUser`). Untyped `mockUser` literals
  (e.g. `tests/unit/league-detail.test.tsx`) did NOT need changes.
- Unit-testing the route in isolation: mock `@/lib/user-sync` (ensureUserSynced no-op) and
  `@/lib/resolve-active-league` (control the returned league id / null), hand-mock the
  supabase `from()` chains. Integration test exercises the REAL `resolveActiveLeague` via
  `authedClient(token)` (anon key + RLS), per the established pattern.
- `createTestUser` does NOT enrol into any league (trigger no longer auto-enrols, task_02),
  so a freshly created + signed-in user is a ready-made no-league fixture.
- Coverage caveat: file-level `route.ts` coverage counts the untouched PATCH body; the GET
  handler is 100% covered. Added 4 PATCH unit tests to lift file coverage to exactly 80%.

## Files / Surfaces
- `lib/api/types.ts` — `AuthUser.can_create_league`, `AuthMeResponse.league` nullable.
- `app/api/auth/me/route.ts` — GET select+payload+no-league 200; PATCH select +flag.
- `tests/unit/auth-me-api.test.ts` (new), `tests/integration/auth-me-no-league.test.ts` (new).
- `tests/unit/ranking-page.test.tsx`, `tests/integration/league-detail-page.test.tsx` — fixture fix.

## Errors / Corrections
- TS2698 (spread of `unknown`) in the PATCH mock — cast `o.member as Record<string, unknown>`.

## Ready for Next Run
- Clients can now read `data.user.can_create_league` from `/api/auth/me` and must branch on
  `data.league === null` (task_07 dashboard already redirects no-league to `/ligas`).
