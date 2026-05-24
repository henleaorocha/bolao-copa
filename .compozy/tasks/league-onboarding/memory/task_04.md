# Task Memory: task_04.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Create `app/api/leagues/[id]/me/route.ts` — PATCH handler that sets `onboarded_at = NOW()` on `league_members` for the authenticated user. Returns 204 on success, 401 if no session, 403 if 0 rows updated (not a member). COMPLETED.

## Important Decisions

- Used `.select('user_id')` after `.update()` to detect 0-row case and return 403 (non-member). Supabase `.update()` alone doesn't return count.
- Integration tests use correct Supabase SSR cookie format:
  - Cookie name: `sb-<projectRef>-auth-token` where projectRef = `hostname.split('.')[0]` from NEXT_PUBLIC_SUPABASE_URL
  - Cookie value: `base64-<Buffer.from(JSON.stringify(session)).toString('base64url')>`
  - Derived from `@supabase/ssr` v0.10.3 source (`cookieEncoding: "base64url"` default, confirmed in createServerClient.ts:142)
- 401 test uses plain fetch with no cookie (unauthenticated path — no cookie needed)

## Learnings

- `@supabase/ssr` v0.10.3 default cookie encoding is `"base64url"` (set in `createServerClient.ts` line 142)
- `defaultStorageKey = sb-${baseUrl.hostname.split('.')[0]}-auth-token` (confirmed in supabase-js `SupabaseClient.ts` line 301)
- Existing tests in leagues.test.ts use `sb-access-token=<token>` which is WRONG (wrong name + wrong value format) — the new tests use the correct format and all pass
- Running vitest integration tests requires env vars sourced from .env.local. Use `set -a && source .env.local && set +a` — do NOT use `export $(cat .env.local | xargs)` as it corrupts multi-char/special-char values

## Files / Surfaces

- `app/api/leagues/[id]/me/route.ts` — CREATED (PATCH handler)
- `tests/integration/leagues.test.ts` — added 4 PATCH tests under `PATCH /api/leagues/{id}/me (task_04)` describe block

## Verification Evidence

- TypeScript: `npx tsc --noEmit` → exit 0
- Tests: 4/4 task_04 integration tests pass; 18 pre-existing failures unaffected

## Ready for Next Run

Task 04 COMPLETE. task_05 can proceed: it calls `PATCH /api/leagues/${id}/me` on modal mount. The endpoint is live at the correct path.
