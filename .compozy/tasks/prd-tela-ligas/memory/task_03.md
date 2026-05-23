# Task Memory: task_03.md

Keep only task-local execution context here. Do not duplicate facts that are obvious from the repository, task file, PRD documents, or git history.

## Objective Snapshot

Create `lib/leagues/get-leagues-hub.ts` exporting `getLeaguesHub(supabase, userId)` that queries Supabase, applies tri-group sort, and returns `LeagueHubItem[]`. Add `MAIN_LEAGUE_ID` to `.env.local`. Write unit tests with mock Supabase.

## Important Decisions

- Use two parallel queries (`Promise.all`): one for user memberships (via `league_members` JOIN `leagues`), one for all public leagues. Merge in-memory. Not N+1.
- Group 1: `is_main === true` (from either member or public source)
- Group 2: all `is_member === true` leagues that are not is_main, sorted by `joined_at DESC` (per task req 5 — public member leagues also go here, not group 3)
- Group 3: public non-member leagues that are not is_main, sorted by `member_count DESC`
- `joined_at` is kept as an internal field for sorting, stripped before returning `LeagueHubItem[]`.
- Two structured `console.warn` calls: one when `MAIN_LEAGUE_ID` is unset, one when result is empty.
- Unit tests use a hand-crafted thenable mock for the Supabase client (chainable `.select().eq()` pattern).

## Learnings

- Test Bolão UUID in Supabase: `00000000-0000-0000-0000-000000000001` (access_type: open)
- `.env.local` already has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_PASSWORD` — does NOT yet have `MAIN_LEAGUE_ID`
- Supabase join response returns related records as an array (e.g., `row.leagues[0]`) — same pattern as `app/api/leagues/route.ts`
- Vitest config: coverage threshold 80% lines, includes `lib/**` and `app/api/**`

## Files / Surfaces

- `lib/leagues/get-leagues-hub.ts` — NEW: main implementation
- `.env.local` — ADD: `MAIN_LEAGUE_ID=00000000-0000-0000-0000-000000000001`
- `tests/unit/get-leagues-hub.test.ts` — NEW: unit tests

## Errors / Corrections

- ESLint `@typescript-eslint/no-unused-vars` does not ignore `_` prefix or `_named` destructuring by default in this project's config. Used explicit field mapping (`toHubItem` helper) instead of destructuring to strip `joined_at`.

## Ready for Next Run

Task complete. All 12 unit tests pass. TypeScript clean. Lint clean (0 errors, 0 warnings).
Deliverables: `lib/leagues/get-leagues-hub.ts`, `.env.local` updated, `tests/unit/get-leagues-hub.test.ts` (12 tests, lib/leagues coverage 83.33%).
