/**
 * Tests for migration 20260526000021_schedule_hourly_sync.sql.
 *
 * Two-part structure:
 *   1. Always-on SQL content tests (no DB) — parse the migration file and
 *      assert the correct extensions, schedule, target, and auth patterns.
 *   2. DB-level tests (skipIf no SUPABASE_SERVICE_ROLE_KEY) — query the
 *      deployed cron job via SECURITY DEFINER RPC helpers added by the same
 *      migration, verifying actual registered state.
 *
 * Unit tests: N/A — the verifiable surface is the migration SQL and DB state.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { adminClient } from '../fixtures/factories'

const MIGRATION_FILE = join(
  __dirname,
  '../../supabase/migrations/20260526000021_schedule_hourly_sync.sql'
)

const JOB_NAME = 'sync-matches-hourly'
const EXPECTED_SCHEDULE = '0 * * * *'
const EXPECTED_ROUTE = '/api/admin/sync-matches'

const HAS_SERVICE_KEY = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

// ── 1. SQL content validation (always runs — no DB required) ─────────────────

describe('migration 20260526000021 — SQL content', () => {
  let sql: string

  beforeAll(() => {
    sql = readFileSync(MIGRATION_FILE, 'utf-8')
  })

  it('migration file exists and is non-empty', () => {
    expect(sql.trim().length).toBeGreaterThan(0)
  })

  it('enables pg_cron idempotently', () => {
    expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS pg_cron')
  })

  it('enables pg_net idempotently', () => {
    expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS pg_net')
  })

  it('registers job with the correct cron schedule (0 * * * *)', () => {
    expect(sql).toContain(`'${EXPECTED_SCHEDULE}'`)
  })

  it('targets the sync route', () => {
    expect(sql).toContain(EXPECTED_ROUTE)
  })

  it('includes an Authorization Bearer header in the job command', () => {
    expect(sql).toContain('Authorization')
    expect(sql).toContain('Bearer')
  })

  it('sources the target URL from app settings — not a hardcoded literal', () => {
    expect(sql).toContain("current_setting('app.settings.site_url'")
  })

  it('sources the service-role key from app settings — not a hardcoded literal', () => {
    expect(sql).toContain("current_setting('app.settings.service_role_key'")
  })

  it('unschedules any existing job before registering — guarantees idempotency', () => {
    const unscheduleIdx = sql.indexOf('cron.unschedule')
    const scheduleIdx = sql.indexOf("cron.schedule(")
    expect(unscheduleIdx).toBeGreaterThanOrEqual(0)
    expect(scheduleIdx).toBeGreaterThanOrEqual(0)
    // The unschedule call must appear before the new schedule call
    expect(unscheduleIdx).toBeLessThan(scheduleIdx)
  })
})

// ── 2. DB-level validation (requires running Supabase with migration applied) ─

describe.skipIf(!HAS_SERVICE_KEY)('migration 20260526000021 — DB state', () => {
  it('pg_cron and pg_net extensions are installed', async () => {
    const admin = adminClient()
    const { data, error } = await admin.rpc('admin_get_installed_extensions', {
      p_names: ['pg_cron', 'pg_net'],
    })
    expect(error).toBeNull()
    const names = (data as Array<{ extname: string }>).map((r) => r.extname)
    expect(names).toContain('pg_cron')
    expect(names).toContain('pg_net')
  })

  it('sync job is registered with schedule 0 * * * *', async () => {
    const admin = adminClient()
    const { data, error } = await admin.rpc('admin_get_cron_job', {
      p_jobname: JOB_NAME,
    })
    expect(error).toBeNull()
    const rows = data as Array<{ jobname: string; schedule: string; command: string; active: boolean }>
    expect(rows.length).toBeGreaterThanOrEqual(1)
    expect(rows[0].schedule).toBe(EXPECTED_SCHEDULE)
  })

  it('job command targets /api/admin/sync-matches', async () => {
    const admin = adminClient()
    const { data, error } = await admin.rpc('admin_get_cron_job', {
      p_jobname: JOB_NAME,
    })
    expect(error).toBeNull()
    const rows = data as Array<{ command: string }>
    expect(rows[0].command).toContain(EXPECTED_ROUTE)
  })

  it('job command carries an Authorization: Bearer header', async () => {
    const admin = adminClient()
    const { data, error } = await admin.rpc('admin_get_cron_job', {
      p_jobname: JOB_NAME,
    })
    expect(error).toBeNull()
    const rows = data as Array<{ command: string }>
    expect(rows[0].command).toContain('Authorization')
    expect(rows[0].command).toContain('Bearer')
  })

  it('exactly one job with this name — migration is idempotent (no duplicates)', async () => {
    const admin = adminClient()
    const { data, error } = await admin.rpc('admin_get_cron_job', {
      p_jobname: JOB_NAME,
    })
    expect(error).toBeNull()
    const rows = data as Array<unknown>
    expect(rows.length).toBe(1)
  })
})
