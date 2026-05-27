import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/football-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/football-api')>()
  return {
    ...actual,
    fetchWorldCupFixtures: vi.fn(),
  }
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}))

import { mapFixtureStatus, fetchWorldCupFixtures } from '@/lib/football-api'
import { POST } from '@/app/api/admin/sync-matches/route'
import { createClient } from '@supabase/supabase-js'
import type { ApiFootballFixture } from '@/lib/football-api'

const SERVICE_KEY = 'test-service-key-abc'

// ── Unit tests: mapFixtureStatus ────────────────────────────────────────────

describe('mapFixtureStatus', () => {
  it('maps NS to scheduled', () => {
    expect(mapFixtureStatus('NS')).toBe('scheduled')
  })

  it.each(['1H', '2H', 'ET'])('maps live code %s to live', (code) => {
    expect(mapFixtureStatus(code)).toBe('live')
  })

  it('maps HT to live', () => {
    expect(mapFixtureStatus('HT')).toBe('live')
  })

  it('maps P to live', () => {
    expect(mapFixtureStatus('P')).toBe('live')
  })

  it('maps FT to finished', () => {
    expect(mapFixtureStatus('FT')).toBe('finished')
  })

  it('maps AET to finished', () => {
    expect(mapFixtureStatus('AET')).toBe('finished')
  })

  it('maps PEN to finished', () => {
    expect(mapFixtureStatus('PEN')).toBe('finished')
  })

  it('maps unknown code to scheduled', () => {
    expect(mapFixtureStatus('XYZ')).toBe('scheduled')
  })

  it('maps empty string to scheduled', () => {
    expect(mapFixtureStatus('')).toBe('scheduled')
  })
})

// ── Integration tests: result ingestion in sync route ───────────────────────

function makeFixture(overrides: Partial<ApiFootballFixture> & {
  id?: number
  statusShort?: string
  goalsHome?: number | null
  goalsAway?: number | null
}): ApiFootballFixture {
  const { id = 1, statusShort = 'NS', goalsHome = null, goalsAway = null } = overrides
  return {
    fixture: {
      id,
      date: '2026-06-28T21:00:00Z',
      venue: { name: 'MetLife', city: 'East Rutherford' },
      status: { short: statusShort },
    },
    league: { round: 'Group Stage - 1', group: 'Group A' },
    teams: {
      home: { name: 'Brasil', logo: '' },
      away: { name: 'Argentina', logo: '' },
    },
    goals: { home: goalsHome, away: goalsAway },
  }
}

function makeSupabase({
  upsertError = null,
  deleteError = null,
}: { upsertError?: unknown; deleteError?: unknown } = {}) {
  const upsertFn = vi.fn().mockResolvedValue({ error: upsertError })
  const isFn = vi.fn().mockResolvedValue({ error: deleteError })
  const deleteFn = vi.fn(() => ({ is: isFn }))
  const from = vi.fn(() => ({ upsert: upsertFn, delete: deleteFn }))
  return { from, upsertFn, deleteFn, isFn }
}

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost/api/admin/sync-matches', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SERVICE_KEY}` },
  })
}

describe('sync route — result ingestion', () => {
  beforeEach(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test-supabase.local'
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('upserts status=finished and correct scores for a FT fixture with goals', async () => {
    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([
      makeFixture({ id: 10, statusShort: 'FT', goalsHome: 2, goalsAway: 1 }),
    ])

    const { from, upsertFn } = makeSupabase()
    vi.mocked(createClient).mockReturnValue({ from } as never)

    const res = await POST(makeRequest())

    expect(res.status).toBe(200)
    const rows = upsertFn.mock.calls[0][0] as Array<{
      status: string
      home_score: number | null
      away_score: number | null
    }>
    expect(rows[0].status).toBe('finished')
    expect(rows[0].home_score).toBe(2)
    expect(rows[0].away_score).toBe(1)
  })

  it('upserts status=scheduled and null scores for a NS fixture', async () => {
    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([
      makeFixture({ id: 11, statusShort: 'NS', goalsHome: null, goalsAway: null }),
    ])

    const { from, upsertFn } = makeSupabase()
    vi.mocked(createClient).mockReturnValue({ from } as never)

    const res = await POST(makeRequest())

    expect(res.status).toBe(200)
    const rows = upsertFn.mock.calls[0][0] as Array<{
      status: string
      home_score: number | null
      away_score: number | null
    }>
    expect(rows[0].status).toBe('scheduled')
    expect(rows[0].home_score).toBeNull()
    expect(rows[0].away_score).toBeNull()
  })

  it('upserts status=live for a 1H fixture with no goals yet', async () => {
    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([
      makeFixture({ id: 12, statusShort: '1H', goalsHome: 0, goalsAway: 0 }),
    ])

    const { from, upsertFn } = makeSupabase()
    vi.mocked(createClient).mockReturnValue({ from } as never)

    await POST(makeRequest())

    const rows = upsertFn.mock.calls[0][0] as Array<{ status: string }>
    expect(rows[0].status).toBe('live')
  })

  it('upserts status=finished for AET fixture', async () => {
    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([
      makeFixture({ id: 13, statusShort: 'AET', goalsHome: 1, goalsAway: 1 }),
    ])

    const { from, upsertFn } = makeSupabase()
    vi.mocked(createClient).mockReturnValue({ from } as never)

    await POST(makeRequest())

    const rows = upsertFn.mock.calls[0][0] as Array<{ status: string }>
    expect(rows[0].status).toBe('finished')
  })

  it('upserts status=finished for PEN fixture', async () => {
    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([
      makeFixture({ id: 14, statusShort: 'PEN', goalsHome: 0, goalsAway: 0 }),
    ])

    const { from, upsertFn } = makeSupabase()
    vi.mocked(createClient).mockReturnValue({ from } as never)

    await POST(makeRequest())

    const rows = upsertFn.mock.calls[0][0] as Array<{ status: string }>
    expect(rows[0].status).toBe('finished')
  })

  it('preserves upsert-by-external_id behavior', async () => {
    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([
      makeFixture({ id: 99, statusShort: 'FT', goalsHome: 3, goalsAway: 0 }),
    ])

    const { from, upsertFn } = makeSupabase()
    vi.mocked(createClient).mockReturnValue({ from } as never)

    await POST(makeRequest())

    expect(upsertFn).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ external_id: '99' })]),
      { onConflict: 'external_id' }
    )
  })

  it('preserves delete-rows-with-null-external_id behavior', async () => {
    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([
      makeFixture({ id: 99, statusShort: 'NS' }),
    ])

    const { from, isFn } = makeSupabase()
    vi.mocked(createClient).mockReturnValue({ from } as never)

    await POST(makeRequest())

    expect(isFn).toHaveBeenCalledWith('external_id', null)
  })

  it('emits sync_result_ingested log with finished_count and scored_matches', async () => {
    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([
      makeFixture({ id: 1, statusShort: 'FT', goalsHome: 2, goalsAway: 1 }),
      makeFixture({ id: 2, statusShort: 'NS', goalsHome: null, goalsAway: null }),
    ])

    const { from } = makeSupabase()
    vi.mocked(createClient).mockReturnValue({ from } as never)

    await POST(makeRequest())

    const logs = (console.log as ReturnType<typeof vi.fn>).mock.calls
      .map((call) => JSON.parse(call[0] as string))
    const ingestionLog = logs.find((l) => l.event === 'sync_result_ingested')

    expect(ingestionLog).toBeDefined()
    expect(ingestionLog.finished_count).toBe(1)
    expect(ingestionLog.scored_matches).toBe(1)
  })
})
