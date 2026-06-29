/**
 * Integration tests for POST /api/admin/sync-matches.
 * Call the route handler directly with a real Supabase service-role client
 * and a mocked fetchWorldCupFixtures to avoid external API calls.
 * Require a running local Supabase instance with SUPABASE_SERVICE_ROLE_KEY set.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { adminClient } from '../fixtures/factories'

vi.mock('@/lib/football-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/football-api')>()
  return { ...actual, fetchWorldCupFixtures: vi.fn() }
})

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}))

import { POST } from '@/app/api/admin/sync-matches/route'
import { fetchWorldCupFixtures } from '@/lib/football-api'
import type { OpenfootballMatch } from '@/lib/football-api'

const HAS_SERVICE_KEY = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost/api/admin/sync-matches', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SERVICE_KEY}` },
  })
}

// Knockout match → deterministic external_id `wc2026-<num>`, so the test can
// target a unique row without depending on numeric fixture ids.
function makeKnockout(num: number, overrides: Partial<OpenfootballMatch> = {}): OpenfootballMatch {
  return {
    round: 'Round of 32',
    num,
    date: '2026-06-28',
    time: '16:00 UTC-4',
    team1: 'Brazil',
    team2: 'Argentina',
    ground: 'Test City',
    ...overrides,
  }
}

describe.skipIf(!HAS_SERVICE_KEY)('POST /api/admin/sync-matches — integration', () => {
  const UNIQUE_NUM = (Date.now() % 100000) + 900000
  const EXTERNAL_ID = `wc2026-${UNIQUE_NUM}`
  const insertedExternalIds: string[] = [EXTERNAL_ID]
  let nullMatchIds: string[] = []

  beforeAll(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterAll(async () => {
    vi.restoreAllMocks()
    const admin = adminClient()

    if (insertedExternalIds.length > 0) {
      await admin.from('matches').delete().in('external_id', insertedExternalIds)
    }
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('upserts a match and returns 200 with upserted: 1', async () => {
    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([makeKnockout(UNIQUE_NUM)])

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
      .eq('external_id', EXTERNAL_ID)
      .single()

    expect(error).toBeNull()
    expect(data).not.toBeNull()
    expect(data!.home_team).toBe('Brasil')
    expect(data!.away_team).toBe('Argentina')
    expect(data!.home_flag).toBe('br')
    expect(data!.away_flag).toBe('ar')
    expect(data!.phase).toBe('32nd')
    expect(data!.group).toBeNull()
  })

  it('second POST with same match is idempotent (row count stays 1)', async () => {
    const admin = adminClient()

    const { data: existing } = await admin
      .from('matches')
      .select('external_id')
      .eq('external_id', EXTERNAL_ID)
      .single()

    expect(existing).not.toBeNull()

    // Same external_id (same num), different away team + ground → updated on conflict.
    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([
      makeKnockout(UNIQUE_NUM, { team2: 'France', ground: 'New City' }),
    ])

    const res = await POST(makeRequest())

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.upserted).toBe(1)

    const { data: rows } = await admin
      .from('matches')
      .select('external_id, away_team, city')
      .eq('external_id', EXTERNAL_ID)

    expect(rows).toHaveLength(1)
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
    const otherNum = UNIQUE_NUM + 1
    insertedExternalIds.push(`wc2026-${otherNum}`)
    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([
      makeKnockout(otherNum, { team1: 'Brazil', team2: 'Germany', ground: 'C' }),
    ])

    const res = await POST(makeRequest())
    expect(res.status).toBe(200)

    // Verify placeholder rows are gone
    const { data: after } = await admin
      .from('matches')
      .select('id')
      .in('id', nullMatchIds)

    expect(after).toHaveLength(0)
  })

  it('leaves a manually-controlled match untouched while upserting the rest', async () => {
    const admin = adminClient()

    const manualNum = UNIQUE_NUM + 2
    const otherNum = UNIQUE_NUM + 3
    const manualId = `wc2026-${manualNum}`
    const otherId = `wc2026-${otherNum}`
    insertedExternalIds.push(manualId, otherId)

    // Seed a manual correction the operator entered: 5-0, finished, is_manual.
    const { error: seedErr } = await admin.from('matches').upsert(
      {
        external_id: manualId,
        home_team: 'Brasil',
        away_team: 'Argentina',
        match_date: '2026-06-29T16:00:00Z',
        phase: '32nd',
        status: 'finished',
        home_score: 5,
        away_score: 0,
        is_manual: true,
        manual_updated_at: new Date().toISOString(),
      },
      { onConflict: 'external_id' }
    )
    expect(seedErr).toBeNull()

    // Sync sees the same match with a DIFFERENT (stale) score plus a fresh one.
    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([
      makeKnockout(manualNum, { team1: 'Brazil', team2: 'Argentina', score: { ft: [1, 1] } }),
      makeKnockout(otherNum, { team1: 'Brazil', team2: 'Germany', score: { ft: [2, 0] } }),
    ])

    const res = await POST(makeRequest())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.skipped).toBe(1)
    expect(json.data.upserted).toBe(1)

    // Manual row preserved exactly (not overwritten by the stale 1-1).
    const { data: manual } = await admin
      .from('matches')
      .select('home_score, away_score, status, is_manual')
      .eq('external_id', manualId)
      .single()
    expect(manual!.home_score).toBe(5)
    expect(manual!.away_score).toBe(0)
    expect(manual!.is_manual).toBe(true)

    // Non-manual row upserted as usual.
    const { data: other } = await admin
      .from('matches')
      .select('home_score, away_score, is_manual')
      .eq('external_id', otherId)
      .single()
    expect(other!.home_score).toBe(2)
    expect(other!.away_score).toBe(0)
    expect(other!.is_manual).toBe(false)
  })
})
