# Workflow Memory

Keep only durable, cross-task context here. Do not duplicate facts that are obvious from the repository, PRD documents, or git history.

## Current State

- Task 01 (Extend POST /api/leagues with prize_pool): **completed**
- Task 02 (CreateLeagueModal client component): **completed**
- Task 03 (Wire modal into /ligas page): **completed**

## Shared Decisions

- Route-level unit tests for `app/api/leagues/route.ts` must mock `@/lib/supabase/client` and import the handler directly. See `tests/unit/leagues-hub-api.test.ts` as the established pattern for this project.
- Integration tests are gated by `describe.skipIf(!HAS_SERVICE_KEY)` — they only run against a live Supabase instance with `SUPABASE_SERVICE_ROLE_KEY` set.

## Shared Learnings

- The global 80% line coverage threshold (`vitest.config.ts`) was already failing before task 01 started. Do not treat this as a blocker introduced by new work.
- The `prize_pool` column already exists in the `leagues` table (migration `20260522000002_create_leagues.sql`). No migrations are needed for this feature.

## Open Risks

- None carried forward from task 01.

## Handoffs

- Task 02 (`CreateLeagueModal`): the API now validates and persists `prize_pool` as an optional string (max 300 chars). The modal should send `prize_pool` only when `hasPrize=true`, omitting or sending `null` otherwise.
