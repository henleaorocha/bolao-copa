import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseServerClient: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

import { GET } from '@/app/api/leagues/[id]/matches/[matchId]/predictions/route'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { createClient } from '@supabase/supabase-js'

const MOCK_USER = { id: 'user-abc' }
const LEAGUE_ID = 'league-xyz'
const MATCH_ID = 'match-001'

function makeRequest(): NextRequest {
  return new NextRequest(
    `http://localhost/api/leagues/${LEAGUE_ID}/matches/${MATCH_ID}/predictions`,
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
    phase: 'group',
    status: 'scheduled',
    home_team: 'Brasil',
    away_team: 'Argentina',
    home_score: null,
    away_score: null,
    // Default: 2h in the future → deadline NOT passed.
    match_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  }
}

const PAST = () => new Date(Date.now() - 1000).toISOString()

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
  membersResult?: { data: unknown; error: unknown }
  predictionsResult?: { data: unknown; error: unknown }
} = {}) {
  const {
    user = MOCK_USER,
    authError = null,
    leagueResult = { data: { id: LEAGUE_ID }, error: null },
    membershipResult = { data: { role: 'member' }, error: null },
    matchResult = { data: makeMatch(), error: null },
    membersResult = { data: [], error: null },
    predictionsResult = { data: [], error: null },
  } = opts

  // league_members is queried twice: first the membership check (.single()),
  // then the members list (.order(), awaited). Differentiate by call order.
  let leagueMembersCall = 0
  const from = vi.fn((table: string) => {
    if (table === 'leagues') {
      const single = vi.fn().mockResolvedValue(leagueResult)
      const eq = vi.fn(() => ({ single }))
      const select = vi.fn(() => ({ eq }))
      return { select }
    }
    if (table === 'league_members') {
      leagueMembersCall++
      return makeChainableQuery(leagueMembersCall === 1 ? membershipResult : membersResult)
    }
    if (table === 'matches') {
      return makeChainableQuery(matchResult)
    }
    return {}
  })

  // All-picks read uses the service-role client built via createClient().
  vi.mocked(createClient).mockReturnValue({
    from: vi.fn((table: string) => {
      if (table === 'predictions') return makeChainableQuery(predictionsResult)
      return makeChainableQuery({ data: null, error: null })
    }),
  } as never)

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: authError }),
    },
    from,
  }
}

describe('GET /api/leagues/[id]/matches/[matchId]/predictions', () => {
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
    expect((await res.json()).code).toBe('SESSION_EXPIRED')
  })

  it('returns 404 when the league does not exist', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ leagueResult: { data: null, error: { message: 'not found' } } }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(404)
    expect((await res.json()).code).toBe('LEAGUE_NOT_FOUND')
  })

  it('returns 403 NOT_A_MEMBER when user is not in the league', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ membershipResult: { data: null, error: { message: 'no row' } } }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(403)
    expect((await res.json()).code).toBe('NOT_A_MEMBER')
  })

  it('returns 404 when the match does not exist', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ matchResult: { data: null, error: { message: 'no rows' } } }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(404)
    expect((await res.json()).code).toBe('MATCH_NOT_FOUND')
  })

  it('locked before the deadline: no players are revealed', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        matchResult: { data: makeMatch(), error: null }, // future date
        membersResult: {
          data: [{ user_id: 'u1', joined_at: 't1', users: { full_name: 'Joao', avatar_color: '#FFC72C' } }],
          error: null,
        },
        predictionsResult: {
          data: [{ user_id: 'u1', predicted_home_score: 2, predicted_away_score: 1 }],
          error: null,
        },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.is_deadline_passed).toBe(false)
    expect(json.data.players).toEqual([])
  })

  it('after the deadline but before finish: shows picks with no points', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        matchResult: { data: makeMatch({ status: 'live', match_date: PAST() }), error: null },
        membersResult: {
          data: [{ user_id: 'u1', joined_at: 't1', users: { full_name: 'Joao', avatar_color: '#FFC72C' } }],
          error: null,
        },
        predictionsResult: {
          data: [{ user_id: 'u1', predicted_home_score: 2, predicted_away_score: 1 }],
          error: null,
        },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data.is_deadline_passed).toBe(true)
    expect(json.data.is_finished).toBe(false)
    expect(json.data.players).toHaveLength(1)
    expect(json.data.players[0].predicted_home_score).toBe(2)
    expect(json.data.players[0].points).toBeNull()
    expect(json.data.players[0].is_exact).toBe(false)
  })

  it('finished: computes points, flags exact, sorts by points, marks "sem palpite" and current user', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        matchResult: {
          data: makeMatch({ status: 'finished', home_score: 2, away_score: 1, match_date: PAST() }),
          error: null,
        },
        membersResult: {
          data: [
            { user_id: 'u2', joined_at: 't1', users: { full_name: 'Maria Silva', avatar_color: '#0097A9' } },
            // current user
            { user_id: MOCK_USER.id, joined_at: 't2', users: { full_name: 'Joao Rocha', avatar_color: '#FFC72C' } },
            { user_id: 'u3', joined_at: 't3', users: { full_name: 'Pedro Alves', avatar_color: '#244C5A' } },
          ],
          error: null,
        },
        predictionsResult: {
          data: [
            { user_id: MOCK_USER.id, predicted_home_score: 1, predicted_away_score: 0 }, // outcome → 5
            { user_id: 'u2', predicted_home_score: 2, predicted_away_score: 1 }, // exact → 10
            // u3 → no pick
          ],
          error: null,
        },
      }) as never
    )

    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data.is_finished).toBe(true)

    const players = json.data.players
    expect(players).toHaveLength(3)

    // Sorted: exact (10) → outcome (5) → no pick
    expect(players[0].full_name).toBe('Maria Silva')
    expect(players[0].points).toBe(10)
    expect(players[0].is_exact).toBe(true)

    expect(players[1].full_name).toBe('Joao Rocha')
    expect(players[1].points).toBe(5)
    expect(players[1].is_exact).toBe(false)
    expect(players[1].is_current_user).toBe(true)

    // No pick sinks to the bottom with null scores.
    expect(players[2].full_name).toBe('Pedro Alves')
    expect(players[2].predicted_home_score).toBeNull()
    expect(players[2].points).toBeNull()

    expect(players[0].is_current_user).toBe(false)
  })

  it('applies the knockout multiplier to per-match points (final ×4)', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        matchResult: {
          data: makeMatch({ phase: 'final', status: 'finished', home_score: 2, away_score: 1, match_date: PAST() }),
          error: null,
        },
        membersResult: {
          data: [{ user_id: 'u1', joined_at: 't1', users: { full_name: 'Joao', avatar_color: '#FFC72C' } }],
          error: null,
        },
        predictionsResult: {
          data: [{ user_id: 'u1', predicted_home_score: 2, predicted_away_score: 1 }], // exact → 10 × 4
          error: null,
        },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data.players[0].points).toBe(40)
    expect(json.data.players[0].is_exact).toBe(true)
  })
})
