---
status: completed
title: Hourly sync pg_cron/pg_net migration
type: infra
complexity: medium
dependencies: []
---

# Task 06: Hourly sync pg_cron/pg_net migration

## Overview
Add a Supabase migration that enables the `pg_cron` and `pg_net` extensions and registers an hourly job which issues an authenticated `http_post` to the existing `POST /api/admin/sync-matches` route. This keeps match scores fresh (ADR-001) using zero new billable surface (ADR-003), and is fully decoupled from the page-load path so it can be built in parallel with the UI tasks.

<critical>
- ALWAYS READ the PRD and TechSpec before starting
- REFERENCE TECHSPEC for implementation details — do not duplicate here
- FOCUS ON "WHAT" — describe what needs to be accomplished, not how
- MINIMIZE CODE — show code only to illustrate current structure or problem areas
- TESTS REQUIRED — every task MUST include tests in deliverables
</critical>

<requirements>
- MUST add a new migration under `supabase/migrations/` following the existing naming/timestamp and SQL-style conventions.
- MUST enable the `pg_cron` and `pg_net` extensions (idempotently, e.g. `CREATE EXTENSION IF NOT EXISTS`).
- MUST register a single scheduled job with cron expression `0 * * * *` (hourly) that issues an `http_post` to the existing `/api/admin/sync-matches` route — do NOT lower the interval (stays under the API-Football free-tier daily cap).
- MUST send the `Authorization: Bearer <service-role>` header expected by the sync route, sourcing the target URL and service-role secret from Supabase config/secrets rather than hardcoding them in the migration.
- MUST NOT modify the `/api/admin/sync-matches` route itself or the `matches` schema.
- MUST be idempotent/re-runnable so re-applying does not create duplicate jobs.
</requirements>

## Subtasks
- [x] 6.1 Create a new timestamped migration file enabling `pg_cron` and `pg_net`.
- [x] 6.2 Register the hourly (`0 * * * *`) job issuing an authenticated `http_post` to the sync route.
- [x] 6.3 Source the target URL and service-role auth from config/secrets, not hardcoded literals.
- [x] 6.4 Make job registration idempotent (avoid duplicate scheduled jobs on re-run).
- [x] 6.5 Add a test/verification that the job is registered with the correct schedule and target.

## Implementation Details
Create `supabase/migrations/20260526000021_schedule_hourly_sync.sql` (confirm it sorts after `20260526000020`). Follow the SQL header/comment and formatting style of existing migrations such as `supabase/migrations/20260522000001_create_users.sql`. No existing migration enables `pg_cron`/`pg_net`, so enable both here.

The job calls the existing sync route, which authorizes via `Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}` (see `app/api/admin/sync-matches/route.ts:41`). Pull the app base URL and service-role key from Supabase configuration/secrets (e.g. a settings/vault lookup) rather than embedding them — see ADR-003 Implementation Notes and TechSpec "Integration Points" (Supabase `pg_cron` + `pg_net`). Keep the cron expression exactly `0 * * * *` per ADR-003. The route and `matches` table are unchanged by this task.

### Relevant Files
- `app/api/admin/sync-matches/route.ts` — target route; Bearer service-role auth at `route.ts:41`; unchanged here.
- `lib/football-api.ts` — `fetchWorldCupFixtures()` invoked downstream by the route (context only).
- `supabase/migrations/20260522000001_create_users.sql` — SQL style/header reference.
- `supabase/migrations/20260526000020_seed_real_copa2026_group_stage.sql` — latest existing migration; new file must sort after it.

### Dependent Files
- None — the migration is self-contained and does not change application code.

### Related ADRs
- [ADR-003: Supabase pg_cron as the Hourly Sync Trigger](adrs/adr-003.md) — the trigger choice, cadence, and secret-handling this task implements.
- [ADR-001: DB-Computed Standings with Hourly Background Sync](adrs/adr-001.md) — the freshness contract the job satisfies.

## Deliverables
- `supabase/migrations/20260526000021_schedule_hourly_sync.sql` enabling `pg_cron`/`pg_net` and registering the hourly job.
- A test/verification asserting the registered schedule and target.
- Tests with 80%+ coverage of the verifiable surface **(REQUIRED)**.

## Tests
- Integration tests:
  - [x] After applying the migration, a `cron.job` row exists with schedule `0 * * * *` targeting the sync route.
  - [x] The scheduled command issues an `http_post` carrying an `Authorization: Bearer` header (asserted from the registered command text), not an anonymous call.
  - [x] Re-applying the migration does not create a duplicate job (idempotent registration).
  - [x] `pg_cron` and `pg_net` extensions are present after migration.
- Unit tests:
  - [x] Not applicable — migration is verified via the DB-level checks above (gate with `describe.skipIf` when service-role/DB is unavailable, per existing integration-test convention).
- Test coverage target: >=80%
- All tests must pass

## Success Criteria
- All tests passing
- Test coverage >=80%
- Hourly job registered at `0 * * * *` posting authenticated requests to `/api/admin/sync-matches`.
- URL and service-role secret are sourced from config/secrets, not hardcoded.
- Migration is idempotent and does not alter the sync route or `matches` schema.
