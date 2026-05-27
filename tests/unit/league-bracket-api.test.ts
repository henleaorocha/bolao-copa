import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseServerClient: vi.fn(),
}))

import { GET } from '@/app/api/leagues/[id]/bracket/route'
import { getSupabaseServerClient } from '@/lib/supabase/client'

const MOCK_USER = { id: 'user-abc' }
const LEAGUE_ID = 'league-xyz'

// R32 slot #1 calendar key (matches bracket-skeleton.ts)
const R32_SLOT1_DATE = '2026-06-28T21:00:00Z'
const R32_SLOT1_VENUE = 'MetLife Stadium'

function makeRequest(): NextRequest {
  return new NextRequest(`http://localhost/api/leagues/${LEAGUE_ID}/bracket`, { method: 'GET' })
}

function makeParams(id = LEAGUE_ID): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

function makeMatch(overrides: Record<string, unknown> = {}) {
  return {
    id: 'match-1',
    external_id: null,
    home_team: 'Brasil',
    away_team: 'Argentina',
    home_flag: 'br',
    away_flag: 'ar',
    match_date: R32_SLOT1_DATE,
    phase: '32nd',
    group: null,
    status: 'scheduled',
    home_score: null,
    away_score: null,
    venue: R32_SLOT1_VENUE,
    city: null,
    ...overrides,
  }
}

function makeChainableQuery<T>(result: { data: T; error: unknown }) {
  const q: Record<string, unknown> = {}
  const methods = ['select', 'order', 'eq', 'neq', 'in', 'gte', 'gt', 'lte', 'lt', 'limit', 'is', 'filter']
  for (const method of methods) {
    q[method] = vi.fn(() => q)
  }
  const promise = Promise.resolve(result)
  q.then = promise.then.bind(promise)
  q.catch = promise.catch.bind(promise)
  return q
}

function makeSupabase(opts: {
  user?: unknown
  authError?: unknown
  leagueResult?: { data: unknown; error: unknown }
  membershipResult?: { data: unknown; error: unknown }
  matchesResult?: { data: unknown; error: unknown }
  predictionsResult?: { data: unknown; error: unknown }
} = {}) {
  const {
    user = MOCK_USER,
    authError = null,
    leagueResult = { data: { id: LEAGUE_ID }, error: null },
    membershipResult = { data: { role: 'member' }, error: null },
    matchesResult = { data: [], error: null },
    predictionsResult = { data: [], error: null },
  } = opts

  const matchesQuery = makeChainableQuery(matchesResult)
  const predictionsQuery = makeChainableQuery(predictionsResult)

  const from = vi.fn((table: string) => {
    if (table === 'leagues') {
      const single = vi.fn().mockResolvedValue(leagueResult)
      const eq = vi.fn(() => ({ single }))
      const select = vi.fn(() => ({ eq }))
      return { select }
    }

    if (table === 'league_members') {
      const single = vi.fn().mockResolvedValue(membershipResult)
      const eq2 = vi.fn(() => ({ single }))
      const eq1 = vi.fn(() => ({ eq: eq2 }))
      const select = vi.fn(() => ({ eq: eq1 }))
      return { select }
    }

    if (table === 'matches') {
      return matchesQuery
    }

    if (table === 'predictions') {
      return predictionsQuery
    }

    return {}
  })

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: authError,
      }),
    },
    from,
    _matchesQuery: matchesQuery,
    _predictionsQuery: predictionsQuery,
  }
}

describe('GET /api/leagues/[id]/bracket', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  describe('auth/membership guards', () => {
    it('returns 401 when there is no session', async () => {
      vi.mocked(getSupabaseServerClient).mockResolvedValue(
        makeSupabase({ user: null, authError: { message: 'no session' } }) as never
      )
      const res = await GET(makeRequest(), makeParams())
      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.code).toBe('SESSION_EXPIRED')
    })

    it('returns 404 when league does not exist', async () => {
      vi.mocked(getSupabaseServerClient).mockResolvedValue(
        makeSupabase({ leagueResult: { data: null, error: { message: 'not found' } } }) as never
      )
      const res = await GET(makeRequest(), makeParams())
      expect(res.status).toBe(404)
      const json = await res.json()
      expect(json.code).toBe('LEAGUE_NOT_FOUND')
    })

    it('returns 403 NOT_A_MEMBER when user is not in the league', async () => {
      vi.mocked(getSupabaseServerClient).mockResolvedValue(
        makeSupabase({ membershipResult: { data: null, error: { message: 'no row' } } }) as never
      )
      const res = await GET(makeRequest(), makeParams())
      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.code).toBe('NOT_A_MEMBER')
    })
  })

  describe('response shape', () => {
    it('returns 200 with { status, data.phases, data.newlyUnlockedPhase } shape', async () => {
      vi.mocked(getSupabaseServerClient).mockResolvedValue(
        makeSupabase() as never
      )
      const res = await GET(makeRequest(), makeParams())
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.status).toBe('success')
      expect(json.data).toHaveProperty('phases')
      expect(json.data).toHaveProperty('newlyUnlockedPhase')
      expect(Array.isArray(json.data.phases)).toBe(true)
      expect(json.data.phases).toHaveLength(6)
    })

    it('pre-Copa: all slots are placeholder, newlyUnlockedPhase is null', async () => {
      vi.mocked(getSupabaseServerClient).mockResolvedValue(
        makeSupabase({ matchesResult: { data: [], error: null } }) as never
      )
      const res = await GET(makeRequest(), makeParams())
      const json = await res.json()

      expect(json.data.newlyUnlockedPhase).toBeNull()
      for (const phase of json.data.phases) {
        for (const slot of phase.slots) {
          expect(slot.state).toBe('placeholder')
        }
      }
    })
  })

  describe('partial fill', () => {
    it('returns mixed states when some R32 slots are confirmed and rest are placeholder', async () => {
      // Only match-1 resolves to R32 slot #1 (MetLife, 2026-06-28T21:00:00Z)
      // All other R32 slots remain placeholder
      const confirmedMatch = makeMatch({
        match_date: R32_SLOT1_DATE,
        venue: R32_SLOT1_VENUE,
        // Future kickoff — but resolveSlot uses exact date, so the slot resolves
        // The state will be determined by Date comparison; R32_SLOT1_DATE is in the past relative to now
        // so it will be 'locked' (within 1h threshold) since 2026-06-28 < now (2026-05-27 + 1h)
        // Actually wait: the date 2026-06-28T21:00:00Z is in the future (today is 2026-05-27)
        // So this slot should be 'open'
      })

      vi.mocked(getSupabaseServerClient).mockResolvedValue(
        makeSupabase({ matchesResult: { data: [confirmedMatch], error: null } }) as never
      )
      const res = await GET(makeRequest(), makeParams())
      const json = await res.json()

      const r32Phase = json.data.phases.find((p: { phase: string }) => p.phase === '32nd')
      expect(r32Phase).toBeDefined()

      const filledSlot = r32Phase.slots.find((s: { pos: number }) => s.pos === 1)
      const emptySlot = r32Phase.slots.find((s: { pos: number }) => s.pos === 2)

      expect(filledSlot.state).not.toBe('placeholder')
      expect(emptySlot.state).toBe('placeholder')
    })

    it('attaches user prediction to the matching confirmed slot', async () => {
      const confirmedMatch = makeMatch()
      const predictions = [
        { match_id: 'match-1', predicted_home_score: 2, predicted_away_score: 0 },
      ]

      vi.mocked(getSupabaseServerClient).mockResolvedValue(
        makeSupabase({
          matchesResult: { data: [confirmedMatch], error: null },
          predictionsResult: { data: predictions, error: null },
        }) as never
      )
      const res = await GET(makeRequest(), makeParams())
      const json = await res.json()

      const r32Phase = json.data.phases.find((p: { phase: string }) => p.phase === '32nd')
      const slot1 = r32Phase.slots.find((s: { pos: number }) => s.pos === 1)

      expect(slot1.prediction).not.toBeNull()
      expect(slot1.prediction.home).toBe(2)
      expect(slot1.prediction.away).toBe(0)
    })
  })

  describe('error handling', () => {
    it('returns 500 when the matches query fails', async () => {
      const supabase = makeSupabase()
      // Make the matches query return an error
      const errorQuery = makeChainableQuery({ data: null, error: { message: 'db error' } })
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'leagues') {
          const single = vi.fn().mockResolvedValue({ data: { id: LEAGUE_ID }, error: null })
          const eq = vi.fn(() => ({ single }))
          const select = vi.fn(() => ({ eq }))
          return { select } as never
        }
        if (table === 'league_members') {
          const single = vi.fn().mockResolvedValue({ data: { role: 'member' }, error: null })
          const eq2 = vi.fn(() => ({ single }))
          const eq1 = vi.fn(() => ({ eq: eq2 }))
          const select = vi.fn(() => ({ eq: eq1 }))
          return { select } as never
        }
        if (table === 'matches') return errorQuery as never
        return {} as never
      })

      vi.mocked(getSupabaseServerClient).mockResolvedValue(supabase as never)
      const res = await GET(makeRequest(), makeParams())
      expect(res.status).toBe(500)
      const json = await res.json()
      expect(json.code).toBe('DATABASE_ERROR')
    })
  })
})
