import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
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
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}))

import { fetchWorldCupFixtures } from '@/lib/football-api'
import { POST } from '@/app/api/admin/sync-matches/route'
import { createClient } from '@supabase/supabase-js'
import { revalidateTag } from 'next/cache'
import type { OpenfootballMatch } from '@/lib/football-api'

const SERVICE_KEY = 'test-service-key-abc'

const FIXTURE: { matches: OpenfootballMatch[] } = JSON.parse(
  readFileSync(join(process.cwd(), 'tests/fixtures/openfootball-wc2026.json'), 'utf-8')
)

function makeMatch(overrides: Partial<OpenfootballMatch> = {}): OpenfootballMatch {
  return {
    round: 'Matchday 1',
    date: '2026-06-28',
    time: '17:00 UTC-4',
    team1: 'Brazil',
    team2: 'Morocco',
    group: 'Group C',
    ground: 'East Rutherford',
    ...overrides,
  }
}

function makeSupabase({
  upsertError = null,
  deleteError = null,
  manualError = null,
  manualExternalIds = [],
}: {
  upsertError?: unknown
  deleteError?: unknown
  manualError?: unknown
  manualExternalIds?: string[]
} = {}) {
  const upsertFn = vi.fn().mockResolvedValue({ error: upsertError })
  const isFn = vi.fn().mockResolvedValue({ error: deleteError })
  const deleteFn = vi.fn(() => ({ is: isFn }))
  // Manual-read query: .select('external_id').eq('is_manual', true)
  const eqFn = vi.fn().mockResolvedValue({
    data: manualError ? null : manualExternalIds.map((external_id) => ({ external_id })),
    error: manualError,
  })
  const selectFn = vi.fn(() => ({ eq: eqFn }))
  const from = vi.fn(() => ({ upsert: upsertFn, delete: deleteFn, select: selectFn }))
  return { from, upsertFn, deleteFn, isFn, selectFn, eqFn }
}

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost/api/admin/sync-matches', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SERVICE_KEY}` },
  })
}

describe('sync route — result ingestion (openfootball)', () => {
  beforeEach(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test-supabase.local'
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('upserts status=finished with scores for a played match (score.ft present)', async () => {
    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([
      makeMatch({ score: { ft: [2, 1] } }),
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

  it('upserts status=scheduled with null scores for an unplayed match (no score)', async () => {
    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([makeMatch()])

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

  it('falls back to scheduled for an unknown score shape', async () => {
    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([
      makeMatch({ score: {} as OpenfootballMatch['score'] }),
    ])

    const { from, upsertFn } = makeSupabase()
    vi.mocked(createClient).mockReturnValue({ from } as never)

    await POST(makeRequest())

    const rows = upsertFn.mock.calls[0][0] as Array<{ status: string }>
    expect(rows[0].status).toBe('scheduled')
  })

  it('synthesizes external_id for a group match (PT names + group letter)', async () => {
    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([
      makeMatch({ team1: 'Brazil', team2: 'Morocco', group: 'Group C' }),
    ])

    const { from, upsertFn } = makeSupabase()
    vi.mocked(createClient).mockReturnValue({ from } as never)

    await POST(makeRequest())

    const rows = upsertFn.mock.calls[0][0] as Array<{ external_id: string }>
    expect(rows[0].external_id).toBe('wc2026-C-Brasil-Marrocos')
  })

  it('preserves upsert-by-external_id behavior for a knockout match', async () => {
    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([
      makeMatch({
        round: 'Round of 32',
        num: 73,
        group: undefined,
        team1: '2A',
        team2: '2B',
        score: { ft: [3, 0] },
      }),
    ])

    const { from, upsertFn } = makeSupabase()
    vi.mocked(createClient).mockReturnValue({ from } as never)

    await POST(makeRequest())

    expect(upsertFn).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ external_id: 'wc2026-73' })]),
      { onConflict: 'external_id' }
    )
  })

  it('preserves delete-rows-with-null-external_id behavior', async () => {
    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([makeMatch()])

    const { from, isFn } = makeSupabase()
    vi.mocked(createClient).mockReturnValue({ from } as never)

    await POST(makeRequest())

    expect(isFn).toHaveBeenCalledWith('external_id', null)
  })

  it('emits sync_result_ingested log with finished_count and scored_matches', async () => {
    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([
      makeMatch({ score: { ft: [2, 1] } }),
      makeMatch({ team1: 'Haiti', team2: 'Scotland' }),
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

  it('ingests the full pinned fixture (104 rows) with correct external_ids', async () => {
    vi.mocked(fetchWorldCupFixtures).mockResolvedValue(FIXTURE.matches)

    const { from, upsertFn } = makeSupabase()
    vi.mocked(createClient).mockReturnValue({ from } as never)

    const res = await POST(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.upserted).toBe(104)
    expect(json.data.skipped).toBe(0)

    const rows = upsertFn.mock.calls[0][0] as Array<{ external_id: string }>
    const ids = new Set(rows.map((r) => r.external_id))
    // All external_ids are unique (no collisions across 104 matches).
    expect(ids.size).toBe(104)
    expect(ids.has('wc2026-73')).toBe(true)
    expect(ids.has('wc2026-final')).toBe(true)
    expect(ids.has('wc2026-3rd')).toBe(true)
  })

  it('excludes a manually-controlled match from the upsert set', async () => {
    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([
      makeMatch({ round: 'Round of 32', num: 73, group: undefined, team1: '2A', team2: '2B' }),
      makeMatch({ round: 'Round of 32', num: 74, group: undefined, team1: '1C', team2: '3D' }),
    ])

    // wc2026-73 is under manual control → must not be upserted.
    const { from, upsertFn } = makeSupabase({ manualExternalIds: ['wc2026-73'] })
    vi.mocked(createClient).mockReturnValue({ from } as never)

    const res = await POST(makeRequest())
    expect(res.status).toBe(200)

    const rows = upsertFn.mock.calls[0][0] as Array<{ external_id: string }>
    const ids = rows.map((r) => r.external_id)
    expect(ids).toContain('wc2026-74')
    expect(ids).not.toContain('wc2026-73')
  })

  it('reports skipped = number of excluded manual matches and upserted = the rest', async () => {
    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([
      makeMatch({ round: 'Round of 32', num: 73, group: undefined, team1: '2A', team2: '2B' }),
      makeMatch({ round: 'Round of 32', num: 74, group: undefined, team1: '1C', team2: '3D' }),
      makeMatch({ round: 'Round of 32', num: 75, group: undefined, team1: '1E', team2: '3F' }),
    ])

    const { from } = makeSupabase({ manualExternalIds: ['wc2026-73', 'wc2026-75'] })
    vi.mocked(createClient).mockReturnValue({ from } as never)

    const res = await POST(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.skipped).toBe(2)
    expect(json.data.upserted).toBe(1)
  })

  it('ignores manual external_ids that are not in the fetched set (no false skips)', async () => {
    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([
      makeMatch({ round: 'Round of 32', num: 73, group: undefined, team1: '2A', team2: '2B' }),
    ])

    // A manual id that does not correspond to any fetched row.
    const { from } = makeSupabase({ manualExternalIds: ['wc2026-999'] })
    vi.mocked(createClient).mockReturnValue({ from } as never)

    const res = await POST(makeRequest())
    const json = await res.json()

    expect(json.data.skipped).toBe(0)
    expect(json.data.upserted).toBe(1)
  })

  it('still deletes null-external_id rows and revalidates the fixtures tag after exclusion', async () => {
    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([
      makeMatch({ round: 'Round of 32', num: 73, group: undefined, team1: '2A', team2: '2B' }),
    ])

    const { from, isFn } = makeSupabase({ manualExternalIds: ['wc2026-73'] })
    vi.mocked(createClient).mockReturnValue({ from } as never)

    await POST(makeRequest())

    expect(isFn).toHaveBeenCalledWith('external_id', null)
    expect(vi.mocked(revalidateTag)).toHaveBeenCalledWith('fixtures', { expire: 0 })
  })

  it('includes skipped_manual in the sync_result_ingested log', async () => {
    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([
      makeMatch({ round: 'Round of 32', num: 73, group: undefined, team1: '2A', team2: '2B' }),
      makeMatch({ round: 'Round of 32', num: 74, group: undefined, team1: '1C', team2: '3D' }),
    ])

    const { from } = makeSupabase({ manualExternalIds: ['wc2026-73'] })
    vi.mocked(createClient).mockReturnValue({ from } as never)

    await POST(makeRequest())

    const logs = (console.log as ReturnType<typeof vi.fn>).mock.calls.map((call) =>
      JSON.parse(call[0] as string)
    )
    const ingestionLog = logs.find((l) => l.event === 'sync_result_ingested')
    expect(ingestionLog.skipped_manual).toBe(1)
  })

  it('emits ingestion_error when the manual-read query fails', async () => {
    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([makeMatch()])

    const { from, upsertFn } = makeSupabase({ manualError: { message: 'manual read boom' } })
    vi.mocked(createClient).mockReturnValue({ from } as never)

    const res = await POST(makeRequest())
    expect(res.status).toBe(500)
    // The upsert must not run when the exclusion read fails.
    expect(upsertFn).not.toHaveBeenCalled()

    const errorLogs = (console.error as ReturnType<typeof vi.fn>).mock.calls.map((call) =>
      JSON.parse(call[0] as string)
    )
    expect(errorLogs.some((l) => l.event === 'ingestion_error')).toBe(true)
  })

  it('emits ingestion_error on the error path', async () => {
    vi.mocked(fetchWorldCupFixtures).mockResolvedValue([makeMatch()])

    const { from } = makeSupabase({ upsertError: { message: 'boom' } })
    vi.mocked(createClient).mockReturnValue({ from } as never)

    const res = await POST(makeRequest())
    expect(res.status).toBe(500)

    const errorLogs = (console.error as ReturnType<typeof vi.fn>).mock.calls.map((call) =>
      JSON.parse(call[0] as string)
    )
    expect(errorLogs.some((l) => l.event === 'ingestion_error')).toBe(true)
    expect(errorLogs.some((l) => l.event === 'api_football_error')).toBe(false)
  })

  it('returns 401 for a non-service-role request (auth unchanged)', async () => {
    const req = new NextRequest('http://localhost/api/admin/sync-matches', {
      method: 'POST',
      headers: { Authorization: 'Bearer wrong-key' },
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
    expect(vi.mocked(fetchWorldCupFixtures)).not.toHaveBeenCalled()
  })
})
