import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/football-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/football-api')>()
  return { ...actual, fetchWorldCupFixtures: vi.fn() }
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}))

import { POST } from '@/app/api/admin/sync-matches/route'
import { fetchWorldCupFixtures } from '@/lib/football-api'
import { createClient } from '@supabase/supabase-js'
import { revalidateTag } from 'next/cache'
import type { ApiFootballFixture } from '@/lib/football-api'

const SERVICE_KEY = 'test-service-key-abc'

function makeRequest(authHeader?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (authHeader !== undefined) {
    headers['Authorization'] = authHeader
  }
  return new NextRequest('http://localhost/api/admin/sync-matches', {
    method: 'POST',
    headers,
  })
}

function makeFixture(
  id: number,
  homeName: string,
  awayName: string,
  round = 'Group Stage - 1',
  group: string | null = 'Group A'
): ApiFootballFixture {
  return {
    fixture: { id, date: '2026-06-14T18:00:00Z', venue: { name: 'MetLife', city: 'East Rutherford' }, status: { short: 'NS' } },
    league: { round, group },
    teams: {
      home: { name: homeName, logo: '' },
      away: { name: awayName, logo: '' },
    },
    goals: { home: null, away: null },
  }
}

function makeSupabase({
  upsertError = null,
  deleteError = null,
}: { upsertError?: unknown; deleteError?: unknown } = {}) {
  const upsertFn = vi.fn().mockResolvedValue({ error: upsertError })
  const isFn = vi.fn().mockResolvedValue({ error: deleteError })
  const deleteFn = vi.fn(() => ({ is: isFn }))

  const from = vi.fn(() => ({
    upsert: upsertFn,
    delete: deleteFn,
  }))

  return { from, upsertFn, deleteFn, isFn }
}

describe('POST /api/admin/sync-matches', () => {
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

  it('returns 401 when Authorization header is missing', async () => {
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.code).toBe('UNAUTHORIZED')
  })

  it('returns 401 when Authorization header has wrong key', async () => {
    const res = await POST(makeRequest('Bearer wrong-key'))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.code).toBe('UNAUTHORIZED')
  })

  it('calls upsert with 2 rows when fetchWorldCupFixtures returns 2 fixtures', async () => {
    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([
      makeFixture(1, 'Brasil', 'Argentina'),
      makeFixture(2, 'França', 'Alemanha'),
    ])

    const { from, upsertFn } = makeSupabase()
    vi.mocked(createClient).mockReturnValue({ from } as never)

    const res = await POST(makeRequest(`Bearer ${SERVICE_KEY}`))

    expect(res.status).toBe(200)
    expect(upsertFn).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ external_id: '1' }),
        expect.objectContaining({ external_id: '2' }),
      ]),
      { onConflict: 'external_id' }
    )
    const call = upsertFn.mock.calls[0][0] as unknown[]
    expect(call).toHaveLength(2)
  })

  it('calls DELETE WHERE external_id IS NULL after successful upsert', async () => {
    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([
      makeFixture(1, 'Brasil', 'Argentina'),
    ])

    const { from, isFn } = makeSupabase()
    vi.mocked(createClient).mockReturnValue({ from } as never)

    await POST(makeRequest(`Bearer ${SERVICE_KEY}`))

    expect(isFn).toHaveBeenCalledWith('external_id', null)
  })

  it('returns { status: success, data: { upserted: 2, skipped: 0 } } on success', async () => {
    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([
      makeFixture(1, 'Brasil', 'Argentina'),
      makeFixture(2, 'França', 'Alemanha'),
    ])

    const { from } = makeSupabase()
    vi.mocked(createClient).mockReturnValue({ from } as never)

    const res = await POST(makeRequest(`Bearer ${SERVICE_KEY}`))
    const json = await res.json()

    expect(json.status).toBe('success')
    expect(json.data).toEqual({ upserted: 2, skipped: 0 })
  })

  it('returns 500 when fetchWorldCupFixtures throws', async () => {
    vi.mocked(fetchWorldCupFixtures).mockRejectedValue(new Error('API Football down'))

    const res = await POST(makeRequest(`Bearer ${SERVICE_KEY}`))

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.code).toBe('SYNC_FAILED')
  })

  it('maps team name found in ALL_COPA_TEAMS to correct flag code; unknown team maps to null', async () => {
    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([
      makeFixture(1, 'Brasil', 'Unknown FC'),
    ])

    const { from, upsertFn } = makeSupabase()
    vi.mocked(createClient).mockReturnValue({ from } as never)

    await POST(makeRequest(`Bearer ${SERVICE_KEY}`))

    const rows = upsertFn.mock.calls[0][0] as Array<{ home_flag: string | null; away_flag: string | null }>
    expect(rows[0].home_flag).toBe('br')
    expect(rows[0].away_flag).toBeNull()
  })

  it('maps Group Stage round to phase:group and extracts group letter from league.group', async () => {
    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([
      makeFixture(1, 'Brasil', 'Argentina', 'Group Stage - 1', 'Group A'),
    ])

    const { from, upsertFn } = makeSupabase()
    vi.mocked(createClient).mockReturnValue({ from } as never)

    await POST(makeRequest(`Bearer ${SERVICE_KEY}`))

    const rows = upsertFn.mock.calls[0][0] as Array<{ phase: string; group: string | null }>
    expect(rows[0].phase).toBe('group')
    expect(rows[0].group).toBe('A')
  })

  it('calls revalidateTag("fixtures") after a successful sync', async () => {
    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([
      makeFixture(1, 'Brasil', 'Argentina'),
    ])

    const { from } = makeSupabase()
    vi.mocked(createClient).mockReturnValue({ from } as never)

    await POST(makeRequest(`Bearer ${SERVICE_KEY}`))

    expect(revalidateTag).toHaveBeenCalledWith('fixtures', { expire: 0 })
    expect(revalidateTag).toHaveBeenCalledTimes(1)
  })

  it('returns 500 when Supabase upsert fails', async () => {
    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([
      makeFixture(1, 'Brasil', 'Argentina'),
    ])

    const { from } = makeSupabase({ upsertError: { message: 'db error' } })
    vi.mocked(createClient).mockReturnValue({ from } as never)

    const res = await POST(makeRequest(`Bearer ${SERVICE_KEY}`))

    expect(res.status).toBe(500)
  })
})
