# Task 01 Memory

## Deliverables Shipped
- `supabase/migrations/20260522000011_leagues_invite_token_member_count.sql`
- `supabase/migrations/20260522000012_users_active_league_id_rls.sql`
- `supabase/migrations/20260522000013_fix_rls_league_members_select.sql` (fix migration)
- `tests/fixtures/factories.ts` — added createTestLeague, deleteTestLeague, addTestLeagueMember, authedClient
- `tests/integration/leagues-migrations.test.ts` — 10 DB-level tests
- `tests/integration/leagues-rls.test.ts` — 10 RLS policy tests

## Critical Bugs Fixed (pre-existing)

### Bug 1: leagues_select_open (migration 9)
`lm.league_id = lm.id` was a PostgreSQL column ambiguity — unqualified `id` inside the
subquery resolved to `league_members.id` (the PK) instead of `leagues.id` (the outer table).
**Effect**: private leagues were invisible even to their own members.
**Fix**: changed to `lm.league_id = leagues.id` (fully qualified) in migration 13.

### Bug 2: league_members SELECT policy too restrictive (migration 10)
`league_members_select_own` (`auth.uid() = user_id`) prevented admins from seeing other
members' rows. PostgreSQL applies SELECT policies BEFORE DELETE policies, so admin couldn't
delete member rows because they weren't DELETE candidates (invisible rows can't be deleted).
**Fix**: replaced with `league_members_select_league` using a SECURITY DEFINER function
`is_member_of_league(p_league_id UUID)` that queries league_members without RLS (avoiding
infinite recursion), allowing any league member to see all rows in their leagues.

## invite_token Column Protection
Column-level REVOKE (`REVOKE SELECT (invite_token) FROM authenticated`) does NOT work when
the role holds a table-level SELECT grant (which Supabase provides by default). Protection is
therefore API-layer only (per ADR-003): server-side code never includes invite_token in
client responses, and token lookups use the service role.

## Coverage Note
TypeScript line coverage is 7.24% (pre-existing). The vitest coverage threshold of 80% was
already failing before this task. My changes add only SQL migrations and test files (excluded
from coverage scope). This requires a separate infrastructure fix.

## Local Test Credentials
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```
