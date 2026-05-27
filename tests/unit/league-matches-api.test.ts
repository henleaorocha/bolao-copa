import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseServerClient: vi.fn(),
}))

import { GET } from '@/app/api/leagues/[id]/matches/route'
import { getSupabaseServerClient } from '@/lib/supabase/client'

const MOCK_USER = { id: 'user-abc' }
const LEAGUE_ID = 'league-xyz'

function makeRequest(url = `http://localhost/api/leagues/${LEAGUE_ID}/matches`): NextRequest {
  return new NextRequest(url, { method: 'GET' })
}

function makeParams(id = LEAGUE_ID): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

function makeMatch(overrides: Record<string, unknown> = {}) {
  return {
    id: `match-${Math.random().toString(36).slice(2)}`,
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
  const methods = ['select', 'order', 'eq', 'neq', 'gte', 'gt', 'lte', 'lt', 'limit', 'in', 'is', 'filter']
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

  let leagueCallCount = 0

  const from = vi.fn((table: string) => {
    if (table === 'leagues') {
      leagueCallCount++
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

describe('GET /api/leagues/[id]/matches', () => {
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

  it('returns 200 with correct response shape { status, data.matches, data.total }', async () => {
    const matches = [makeMatch(), makeMatch()]
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ matchesResult: { data: matches, error: null } }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('success')
    expect(json.data).toHaveProperty('matches')
    expect(json.data).toHaveProperty('total', 2)
    expect(Array.isArray(json.data.matches)).toBe(true)
  })

  it('applies ?next=4 as a limit and returns at most 4 matches', async () => {
    const matches = Array.from({ length: 4 }, () => makeMatch())
    const supabase = makeSupabase({ matchesResult: { data: matches, error: null } })
    vi.mocked(getSupabaseServerClient).mockResolvedValue(supabase as never)

    const url = `http://localhost/api/leagues/${LEAGUE_ID}/matches?next=4`
    const res = await GET(makeRequest(url), makeParams())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.matches).toHaveLength(4)
    expect(supabase._matchesQuery.limit).toHaveBeenCalledWith(4)
  })

  it('applies ?phase=group filter', async () => {
    const matches = [makeMatch({ phase: 'group' })]
    const supabase = makeSupabase({ matchesResult: { data: matches, error: null } })
    vi.mocked(getSupabaseServerClient).mockResolvedValue(supabase as never)

    const url = `http://localhost/api/leagues/${LEAGUE_ID}/matches?phase=group`
    const res = await GET(makeRequest(url), makeParams())
    expect(res.status).toBe(200)
    expect(supabase._matchesQuery.eq).toHaveBeenCalledWith('phase', 'group')
  })

  it('applies ?group=A filter', async () => {
    const matches = [makeMatch({ group: 'A' })]
    const supabase = makeSupabase({ matchesResult: { data: matches, error: null } })
    vi.mocked(getSupabaseServerClient).mockResolvedValue(supabase as never)

    const url = `http://localhost/api/leagues/${LEAGUE_ID}/matches?group=A`
    const res = await GET(makeRequest(url), makeParams())
    expect(res.status).toBe(200)
    expect(supabase._matchesQuery.eq).toHaveBeenCalledWith('group', 'A')
  })

  it('applies ?date=today filter with gte/lt range', async () => {
    const matches = [makeMatch()]
    const supabase = makeSupabase({ matchesResult: { data: matches, error: null } })
    vi.mocked(getSupabaseServerClient).mockResolvedValue(supabase as never)

    const url = `http://localhost/api/leagues/${LEAGUE_ID}/matches?date=today`
    const res = await GET(makeRequest(url), makeParams())
    expect(res.status).toBe(200)

    const gteCalls = vi.mocked(supabase._matchesQuery.gte as ReturnType<typeof vi.fn>).mock.calls
    const ltCalls = vi.mocked(supabase._matchesQuery.lt as ReturnType<typeof vi.fn>).mock.calls

    expect(gteCalls.length).toBeGreaterThan(0)
    expect(gteCalls[0][0]).toBe('match_date')
    expect(ltCalls.length).toBeGreaterThan(0)
    expect(ltCalls[0][0]).toBe('match_date')

    // The gte date should be today (UTC midnight) and lt should be tomorrow
    const gteDate = new Date(gteCalls[0][1] as string)
    const ltDate = new Date(ltCalls[0][1] as string)
    const now = new Date()
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const tomorrowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
    expect(gteDate.toISOString()).toBe(todayUTC.toISOString())
    expect(ltDate.toISOString()).toBe(tomorrowUTC.toISOString())
  })

  it('applies ?date=tomorrow filter with gte/lt range for the next day', async () => {
    const matches = [makeMatch()]
    const supabase = makeSupabase({ matchesResult: { data: matches, error: null } })
    vi.mocked(getSupabaseServerClient).mockResolvedValue(supabase as never)

    const url = `http://localhost/api/leagues/${LEAGUE_ID}/matches?date=tomorrow`
    const res = await GET(makeRequest(url), makeParams())
    expect(res.status).toBe(200)

    const gteCalls = vi.mocked(supabase._matchesQuery.gte as ReturnType<typeof vi.fn>).mock.calls
    const ltCalls = vi.mocked(supabase._matchesQuery.lt as ReturnType<typeof vi.fn>).mock.calls

    const gteDate = new Date(gteCalls[0][1] as string)
    const ltDate = new Date(ltCalls[0][1] as string)
    const now = new Date()
    const tomorrowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
    const dayAfterUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2))
    expect(gteDate.toISOString()).toBe(tomorrowUTC.toISOString())
    expect(ltDate.toISOString()).toBe(dayAfterUTC.toISOString())
  })

  it('returns non-null prediction for matches that have predictions', async () => {
    const matchA = makeMatch({ id: 'match-with-pred' })
    const matchB = makeMatch({ id: 'match-no-pred' })
    const predictions = [
      { match_id: 'match-with-pred', predicted_home_score: 2, predicted_away_score: 1 },
    ]
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        matchesResult: { data: [matchA, matchB], error: null },
        predictionsResult: { data: predictions, error: null },
      }) as never
    )

    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(200)
    const json = await res.json()

    const withPred = json.data.matches.find((m: { id: string }) => m.id === 'match-with-pred')
    const noPred = json.data.matches.find((m: { id: string }) => m.id === 'match-no-pred')

    expect(withPred.prediction).not.toBeNull()
    expect(withPred.prediction.predicted_home_score).toBe(2)
    expect(withPred.prediction.predicted_away_score).toBe(1)
    expect(noPred.prediction).toBeNull()
  })

  it('is_deadline_passed is true for match_date less than now+1h', async () => {
    const pastMatch = makeMatch({
      id: 'past-match',
      match_date: new Date(Date.now() - 1000).toISOString(),
    })
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ matchesResult: { data: [pastMatch], error: null } }) as never
    )

    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data.matches[0].is_deadline_passed).toBe(true)
  })

  it('is_deadline_passed is false for match_date more than 1h from now', async () => {
    const futureMatch = makeMatch({
      id: 'future-match',
      match_date: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    })
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ matchesResult: { data: [futureMatch], error: null } }) as never
    )

    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data.matches[0].is_deadline_passed).toBe(false)
  })
})
