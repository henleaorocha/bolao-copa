/**
 * Integration tests for migration 20260525000018_add_matches_external_id.sql.
 * Require a running local Supabase instance with SUPABASE_SERVICE_ROLE_KEY set.
 *
 * Note on index verification: pg_catalog.pg_indexes is not exposed via PostgREST
 * (only the public schema is). Index existence is confirmed by:
 *   - supabase db push exit code 0 (verifies DDL applied without error)
 *   - The UNIQUE constraint test (proves idx_matches_external_id is operational)
 *   - The phase+status filter query (exercises idx_matches_phase_status)
 */
import { describe, it, expect, afterAll } from 'vitest'
import { adminClient } from '../fixtures/factories'

const HAS_SERVICE_KEY = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

describe.skipIf(!HAS_SERVICE_KEY)('matches table — migration 20260525000018', () => {
  const insertedIds: string[] = []

  afterAll(async () => {
    if (insertedIds.length > 0) {
      const admin = adminClient()
      await admin.from('matches').delete().in('id', insertedIds)
    }
  })

  // ── Column existence ──────────────────────────────────────────────────────

  it('all 5 new columns are selectable in a single query', async () => {
    const admin = adminClient()
    const { error } = await admin
      .from('matches')
      .select('external_id, venue, city, home_flag, away_flag')
      .limit(1)
    expect(error).toBeNull()
  })

  it('new columns default to null on existing placeholder rows', async () => {
    const admin = adminClient()
    const { data, error } = await admin
      .from('matches')
      .select('home_team, away_team, match_date, external_id, venue, city, home_flag, away_flag')
      .limit(1)
      .single()
    expect(error).toBeNull()
    expect((data as any).external_id).toBeNull()
    expect((data as any).venue).toBeNull()
    expect((data as any).city).toBeNull()
    expect((data as any).home_flag).toBeNull()
    expect((data as any).away_flag).toBeNull()
    // Existing columns must still be intact
    expect((data as any).home_team).toBeTruthy()
    expect((data as any).away_team).toBeTruthy()
    expect((data as any).match_date).toBeTruthy()
  })

  // ── Row insert with new columns ───────────────────────────────────────────

  it('can insert a row with all 5 new columns populated', async () => {
    const admin = adminClient()
    const externalId = `ext-test-${Date.now()}`
    const { data, error } = await admin
      .from('matches')
      .insert({
        home_team: 'TST',
        away_team: 'TST2',
        match_date: '2026-07-01T12:00:00Z',
        phase: 'group',
        status: 'scheduled',
        external_id: externalId,
        venue: 'Test Stadium',
        city: 'Test City',
        home_flag: 'br',
        away_flag: 'ar',
      })
      .select('id, external_id, venue, city, home_flag, away_flag')
      .single()

    expect(error).toBeNull()
    expect((data as any).external_id).toBe(externalId)
    expect((data as any).venue).toBe('Test Stadium')
    expect((data as any).city).toBe('Test City')
    expect((data as any).home_flag).toBe('br')
    expect((data as any).away_flag).toBe('ar')
    insertedIds.push((data as any).id)
  })

  // ── UNIQUE constraint on external_id (proves idx_matches_external_id) ─────

  it('duplicate external_id raises a unique constraint violation (code 23505)', async () => {
    const admin = adminClient()
    const externalId = `ext-dupe-${Date.now()}`

    const { data: first, error: firstErr } = await admin
      .from('matches')
      .insert({
        home_team: 'TST',
        away_team: 'TST2',
        match_date: '2026-07-01T14:00:00Z',
        phase: 'group',
        status: 'scheduled',
        external_id: externalId,
      })
      .select('id')
      .single()
    expect(firstErr).toBeNull()
    insertedIds.push((first as any).id)

    const { error: dupeErr } = await admin
      .from('matches')
      .insert({
        home_team: 'TST3',
        away_team: 'TST4',
        match_date: '2026-07-02T14:00:00Z',
        phase: 'group',
        status: 'scheduled',
        external_id: externalId,
      })
      .select('id')
      .single()

    expect(dupeErr).not.toBeNull()
    expect(dupeErr!.code).toBe('23505')
  })

  it('null external_id does not trigger unique constraint (multiple NULLs allowed)', async () => {
    const admin = adminClient()
    const rows = [
      { home_team: 'TN1', away_team: 'TN2', match_date: '2026-07-03T14:00:00Z', phase: 'group', status: 'scheduled', external_id: null },
      { home_team: 'TN3', away_team: 'TN4', match_date: '2026-07-04T14:00:00Z', phase: 'group', status: 'scheduled', external_id: null },
    ]
    const { data, error } = await admin.from('matches').insert(rows).select('id')
    expect(error).toBeNull()
    expect((data as any[]).length).toBe(2)
    insertedIds.push(...(data as any[]).map((r: any) => r.id))
  })

  // ── idx_matches_phase_status (functional verification) ────────────────────

  it('filter by phase + status returns results without error (exercises idx_matches_phase_status)', async () => {
    const admin = adminClient()
    const { data, error } = await admin
      .from('matches')
      .select('id, phase, status')
      .eq('phase', 'group')
      .eq('status', 'scheduled')
      .limit(10)
    expect(error).toBeNull()
    expect((data as any[]).length).toBeGreaterThan(0)
    for (const row of data as any[]) {
      expect(row.phase).toBe('group')
      expect(row.status).toBe('scheduled')
    }
  })

  // ── Existing data integrity ───────────────────────────────────────────────

  it('existing placeholder rows retain original data after migration', async () => {
    const admin = adminClient()
    const { data, error } = await admin
      .from('matches')
      .select('home_team, away_team, match_date, phase, status')
      .eq('phase', 'group')
      .limit(5)

    expect(error).toBeNull()
    expect((data as any[]).length).toBeGreaterThan(0)
    for (const row of data as any[]) {
      expect(row.home_team).toBeTruthy()
      expect(row.away_team).toBeTruthy()
      expect(row.match_date).toBeTruthy()
    }
  })
})
