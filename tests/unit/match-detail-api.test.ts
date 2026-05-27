import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseServerClient: vi.fn(),
}))

import { GET } from '@/app/api/leagues/[id]/matches/[matchId]/route'
import { getSupabaseServerClient } from '@/lib/supabase/client'

const MOCK_USER = { id: 'user-abc' }
const LEAGUE_ID = 'league-xyz'
const MATCH_ID = 'match-001'

function makeRequest(): NextRequest {
  return new NextRequest(
    `http://localhost/api/leagues/${LEAGUE_ID}/matches/${MATCH_ID}`,
    { method: 'GET' }
  )
}

function makeParams(
  id = LEAGUE_ID,
  matchId = MATCH_ID
): { params: Promise<{ id: string; matchId: string }> } {
  return { params: Promise.resolve({ id, matchId }) }
}

function makeMatch(overrides: Record<string, unknown> = {}) {
  return {
    id: MATCH_ID,
    external_id: null,
    home_team: 'Brasil',
    away_team: 'Argentina',
    home_flag: 'br',
    away_flag: 'ar',
    match_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    phase: 'group',
    group: 'A',
    status: 'scheduled',
    home_score: null,
    away_score: null,
    venue: null,
    city: null,
    ...overrides,
  }
}

function makeChainableQuery<T>(result: { data: T; error: unknown }) {
  const q: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'neq', 'gte', 'gt', 'lte', 'lt', 'limit', 'in', 'is', 'filter', 'order']
  for (const method of methods) {
    q[method] = vi.fn(() => q)
  }
  q['single'] = vi.fn().mockResolvedValue(result)
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
  matchResult?: { data: unknown; error: unknown }
  userPredictionResult?: { data: unknown; error: unknown }
  distributionResult?: { data: unknown; error: unknown }
} = {}) {
  const {
    user = MOCK_USER,
    authError = null,
    leagueResult = { data: { id: LEAGUE_ID }, error: null },
    membershipResult = { data: { role: 'member' }, error: null },
    matchResult = { data: makeMatch(), error: null },
    userPredictionResult = { data: null, error: { code: 'PGRST116', message: 'no rows' } },
    distributionResult = { data: [], error: null },
  } = opts

  let predictionsCallCount = 0

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
      return makeChainableQuery(matchResult)
    }

    if (table === 'predictions') {
      predictionsCallCount++
      if (predictionsCallCount === 1) {
        // User prediction query — ends with .single()
        return makeChainableQuery(userPredictionResult)
      }
      // Distribution query — no .single(), resolves as array
      return makeChainableQuery(distributionResult)
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
  }
}

describe('GET /api/leagues/[id]/matches/[matchId]', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('returns 401 when there is no session', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ user: null, authError: { message: 'no session' } }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.code).toBe('SESSION_EXPIRED')
  })

  it('returns 404 when the league does not exist', async () => {
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

  it('returns 404 when matchId does not exist', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ matchResult: { data: null, error: { message: 'no rows' } } }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.code).toBe('MATCH_NOT_FOUND')
  })

  it('returns is_deadline_passed: false and distribution: null when match_date > now+1h', async () => {
    const futureMatch = makeMatch({
      match_date: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    })
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ matchResult: { data: futureMatch, error: null } }) as never
    )

    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.is_deadline_passed).toBe(false)
    expect(json.data.distribution).toBeNull()
  })

  it('distribution is null (not 0) when is_deadline_passed is false', async () => {
    const futureMatch = makeMatch({
      match_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    })
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ matchResult: { data: futureMatch, error: null } }) as never
    )

    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data.distribution).toBeNull()
    expect(json.data.distribution).not.toBe(0)
  })

  it('returns is_deadline_passed: true and non-null distribution when match_date < now+1h', async () => {
    const pastMatch = makeMatch({
      match_date: new Date(Date.now() - 1000).toISOString(),
    })
    const allPreds = [
      { predicted_home_score: 2, predicted_away_score: 1 },
      { predicted_home_score: 1, predicted_away_score: 0 },
      { predicted_home_score: 0, predicted_away_score: 1 },
    ]
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        matchResult: { data: pastMatch, error: null },
        distributionResult: { data: allPreds, error: null },
      }) as never
    )

    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.is_deadline_passed).toBe(true)
    expect(json.data.distribution).not.toBeNull()
    expect(json.data.distribution.total_predictions).toBe(3)
  })

  it('distribution home_win + draw + away_win percentages sum to ≈100 when total > 0', async () => {
    const pastMatch = makeMatch({
      match_date: new Date(Date.now() - 1000).toISOString(),
    })
    // 2 home wins, 1 draw: 67 + 33 + 0 = 100
    const allPreds = [
      { predicted_home_score: 2, predicted_away_score: 1 },
      { predicted_home_score: 3, predicted_away_score: 0 },
      { predicted_home_score: 1, predicted_away_score: 1 },
    ]
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        matchResult: { data: pastMatch, error: null },
        distributionResult: { data: allPreds, error: null },
      }) as never
    )

    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    const { home_win, draw, away_win } = json.data.distribution
    const total = home_win + draw + away_win
    // Allow ±1 for rounding
    expect(total).toBeGreaterThanOrEqual(99)
    expect(total).toBeLessThanOrEqual(101)
  })

  it('returns non-null prediction when the user has a prediction for the match', async () => {
    const predRow = { predicted_home_score: 2, predicted_away_score: 1 }
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        userPredictionResult: { data: predRow, error: null },
      }) as never
    )

    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.prediction).not.toBeNull()
    expect(json.data.prediction.predicted_home_score).toBe(2)
    expect(json.data.prediction.predicted_away_score).toBe(1)
  })

  it('returns prediction: null when the user has no prediction', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        userPredictionResult: { data: null, error: { code: 'PGRST116', message: 'no rows' } },
      }) as never
    )

    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.prediction).toBeNull()
  })

  it('returns distribution with total_predictions: 0 when deadline passed but no predictions exist', async () => {
    const pastMatch = makeMatch({
      match_date: new Date(Date.now() - 1000).toISOString(),
    })
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        matchResult: { data: pastMatch, error: null },
        distributionResult: { data: [], error: null },
      }) as never
    )

    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data.distribution).not.toBeNull()
    expect(json.data.distribution.total_predictions).toBe(0)
    expect(json.data.distribution.home_win).toBe(0)
    expect(json.data.distribution.draw).toBe(0)
    expect(json.data.distribution.away_win).toBe(0)
  })

  it('returns 200 with correct response shape', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase() as never
    )

    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('success')
    expect(json.data).toHaveProperty('id')
    expect(json.data).toHaveProperty('home_team')
    expect(json.data).toHaveProperty('away_team')
    expect(json.data).toHaveProperty('is_deadline_passed')
    expect(json.data).toHaveProperty('prediction')
    expect(json.data).toHaveProperty('distribution')
  })
})
