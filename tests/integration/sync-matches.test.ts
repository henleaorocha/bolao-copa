/**
 * Integration tests for POST /api/admin/sync-matches.
 * Call the route handler directly with a real Supabase service-role client
 * and a mocked fetchWorldCupFixtures to avoid external API calls.
 * Require a running local Supabase instance with SUPABASE_SERVICE_ROLE_KEY set.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { adminClient } from '../fixtures/factories'

vi.mock('@/lib/football-api', () => ({
  fetchWorldCupFixtures: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}))

import { POST } from '@/app/api/admin/sync-matches/route'
import { fetchWorldCupFixtures } from '@/lib/football-api'
import type { ApiFootballFixture } from '@/lib/football-api'

const HAS_SERVICE_KEY = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost/api/admin/sync-matches', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SERVICE_KEY}` },
  })
}

function makeFixture(id: number): ApiFootballFixture {
  return {
    fixture: {
      id,
      date: '2026-06-14T18:00:00Z',
      venue: { name: 'Test Stadium', city: 'Test City' },
      status: { short: 'NS' },
    },
    league: { round: 'Group Stage - 1', group: 'Group A' },
    teams: {
      home: { name: 'Brasil', logo: '' },
      away: { name: 'Argentina', logo: '' },
    },
    goals: { home: null, away: null },
  }
}

describe.skipIf(!HAS_SERVICE_KEY)('POST /api/admin/sync-matches — integration', () => {
  const EXTERNAL_ID = `sync-test-${Date.now()}`
  const insertedExternalIds: string[] = []
  let nullMatchIds: string[] = []

  beforeAll(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterAll(async () => {
    vi.restoreAllMocks()
    const admin = adminClient()

    if (insertedExternalIds.length > 0) {
      await admin.from('matches').delete().in('external_id', insertedExternalIds)
    }

    // Restore any null-id matches we deleted in the cleanup test
    // (they were already cleaned up in the test; no further action needed)
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('upserts a fixture and returns 200 with upserted: 1', async () => {
    const fixture = makeFixture(1)
    // Override fixture id to use our unique string as external_id
    const customFixture: ApiFootballFixture = {
      ...fixture,
      fixture: { ...fixture.fixture, id: parseInt(EXTERNAL_ID.replace(/\D/g, '').slice(-8), 10) || 99001 },
    }

    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([customFixture])
    insertedExternalIds.push(String(customFixture.fixture.id))

    const res = await POST(makeRequest())

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('success')
    expect(json.data.upserted).toBe(1)
    expect(json.data.skipped).toBe(0)

    const admin = adminClient()
    const { data, error } = await admin
      .from('matches')
      .select('external_id, home_team, away_team, home_flag, away_flag, phase, group')
      .eq('external_id', String(customFixture.fixture.id))
      .single()

    expect(error).toBeNull()
    expect(data).not.toBeNull()
    expect(data!.home_team).toBe('Brasil')
    expect(data!.away_team).toBe('Argentina')
    expect(data!.home_flag).toBe('br')
    expect(data!.away_flag).toBe('ar')
    expect(data!.phase).toBe('group')
    expect(data!.group).toBe('A')
  })

  it('second POST with same fixture is idempotent (row count stays 1)', async () => {
    const admin = adminClient()
    const externalId = insertedExternalIds[0]

    // Get fixture id from the previously inserted row
    const { data: existing } = await admin
      .from('matches')
      .select('external_id')
      .eq('external_id', externalId)
      .single()

    expect(existing).not.toBeNull()

    // Build fixture with same external_id
    const fixtureId = parseInt(externalId, 10)
    const fixture: ApiFootballFixture = {
      fixture: { id: fixtureId, date: '2026-06-14T19:00:00Z', venue: { name: 'New Stadium', city: 'New City' }, status: { short: 'NS' } },
      league: { round: 'Group Stage - 2', group: 'Group B' },
      teams: {
        home: { name: 'Brasil', logo: '' },
        away: { name: 'França', logo: '' },
      },
      goals: { home: null, away: null },
    }

    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([fixture])

    const res = await POST(makeRequest())

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.upserted).toBe(1)

    // Verify exactly one row exists with the external_id
    const { data: rows } = await admin
      .from('matches')
      .select('external_id, away_team, city')
      .eq('external_id', externalId)

    expect(rows).toHaveLength(1)
    // Fields updated on conflict
    expect(rows![0].away_team).toBe('França')
    expect(rows![0].city).toBe('New City')
  })

  it('deletes all rows with external_id IS NULL after sync', async () => {
    const admin = adminClient()

    // Insert 2 placeholder rows (external_id IS NULL)
    const { data: placeholders, error: insertErr } = await admin
      .from('matches')
      .insert([
        { home_team: 'PH1', away_team: 'PH2', match_date: '2026-09-01T12:00:00Z', phase: 'group', status: 'scheduled', external_id: null },
        { home_team: 'PH3', away_team: 'PH4', match_date: '2026-09-02T12:00:00Z', phase: 'group', status: 'scheduled', external_id: null },
      ])
      .select('id')

    expect(insertErr).toBeNull()
    nullMatchIds = (placeholders as Array<{ id: string }>).map((r) => r.id)

    // Confirm they exist
    const { data: before } = await admin
      .from('matches')
      .select('id')
      .in('id', nullMatchIds)
    expect(before).toHaveLength(2)

    // Run sync — should delete all external_id IS NULL rows
    const uniqueId = Date.now() + 99002
    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([
      {
        fixture: { id: uniqueId, date: '2026-06-20T18:00:00Z', venue: { name: 'V', city: 'C' }, status: { short: 'NS' } },
        league: { round: 'Group Stage - 1', group: 'Group C' },
        teams: {
          home: { name: 'Brasil', logo: '' },
          away: { name: 'Alemanha', logo: '' },
        },
        goals: { home: null, away: null },
      },
    ])
    insertedExternalIds.push(String(uniqueId))

    const res = await POST(makeRequest())
    expect(res.status).toBe(200)

    // Verify placeholder rows are gone
    const { data: after } = await admin
      .from('matches')
      .select('id')
      .in('id', nullMatchIds)

    expect(after).toHaveLength(0)
  })
})
