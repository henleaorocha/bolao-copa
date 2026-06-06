import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseServerClient: vi.fn(),
}))

import { GET } from '@/app/api/leagues/[id]/route'
import { getSupabaseServerClient } from '@/lib/supabase/client'

const MOCK_USER = { id: 'user-123' }
const MOCK_LEAGUE = {
  id: 'league-abc',
  name: 'Test League',
  access_type: 'private',
  logo_url: null,
  member_count: 1,
  description: null,
  created_by: 'user-123',
  created_at: '2026-01-01T00:00:00Z',
  invite_token: 'tok-abc',
  prize_pool: null,
}
const MOCK_MEMBER_ROW = {
  user_id: 'user-123',
  role: 'admin',
  joined_at: '2026-01-01T00:00:00Z',
  onboarded_at: null,
  users: [{ full_name: 'João', avatar_url: null, avatar_color: '#FF0000' }],
}

function makePrediction(overrides: Record<string, unknown> = {}) {
  return {
    user_id: 'user-123',
    match_id: 'match-001',
    predicted_home_score: 2,
    predicted_away_score: 1,
    ...overrides,
  }
}

function makeFinishedMatch(overrides: Record<string, unknown> = {}) {
  return {
    id: 'match-001',
    phase: 'group',
    home_team: 'Brasil',
    away_team: 'Argentina',
    home_score: 2,
    away_score: 1,
    match_date: '2026-06-15T15:00:00Z',
    ...overrides,
  }
}

function makeChampBet(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bet-001',
    user_id: 'user-123',
    league_id: 'league-abc',
    champion_team: 'BRA',
    runner_up_team: 'ARG',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost/api/leagues/league-abc', { method: 'GET' })
}

function makeParams(): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id: 'league-abc' }) }
}

function makeThenable<T>(result: { data: T; error: unknown }) {
  const promise = Promise.resolve(result)
  return { then: promise.then.bind(promise), catch: promise.catch.bind(promise) }
}

function makeSupabase(overrides?: {
  user?: unknown
  authError?: unknown
  membershipResult?: { data: unknown; error: unknown }
  leagueResult?: { data: unknown; error: unknown }
  membersResult?: { data: unknown; error: unknown }
  champBetsResult?: { data: unknown; error: unknown }
  predictionsResult?: { data: unknown; error: unknown }
  finishedMatchesResult?: { data: unknown; error: unknown }
}) {
  const opts = {
    user: MOCK_USER,
    authError: null,
    membershipResult: { data: { role: 'admin' }, error: null },
    leagueResult: { data: MOCK_LEAGUE, error: null },
    membersResult: { data: [MOCK_MEMBER_ROW], error: null },
    champBetsResult: { data: [], error: null },
    predictionsResult: { data: [], error: null },
    finishedMatchesResult: { data: [], error: null },
    ...overrides,
  }

  let leagueMembersCallCount = 0

  const from = vi.fn((table: string) => {
    if (table === 'leagues') {
      const single = vi.fn().mockResolvedValue(opts.leagueResult)
      const eq = vi.fn(() => ({ single }))
      const select = vi.fn(() => ({ eq }))
      return { select }
    }

    if (table === 'league_members') {
      leagueMembersCallCount++
      if (leagueMembersCallCount === 1) {
        const single = vi.fn().mockResolvedValue(opts.membershipResult)
        const eq2 = vi.fn(() => ({ single }))
        const eq1 = vi.fn(() => ({ eq: eq2 }))
        const select = vi.fn(() => ({ eq: eq1 }))
        return { select }
      } else {
        const order = vi.fn().mockResolvedValue(opts.membersResult)
        const eq = vi.fn(() => ({ order }))
        const select = vi.fn(() => ({ eq }))
        return { select }
      }
    }

    if (table === 'champion_bets') {
      const thenable = makeThenable(opts.champBetsResult)
      const eq = vi.fn(() => thenable)
      const select = vi.fn(() => ({ eq }))
      return { select }
    }

    if (table === 'predictions') {
      const thenable = makeThenable(opts.predictionsResult)
      const eq = vi.fn(() => thenable)
      const select = vi.fn(() => ({ eq }))
      return { select }
    }

    if (table === 'matches') {
      const thenable = makeThenable(opts.finishedMatchesResult)
      const eq = vi.fn(() => thenable)
      const select = vi.fn(() => ({ eq }))
      return { select }
    }

    return {}
  })

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: opts.user },
        error: opts.authError,
      }),
    },
    from,
  }
}

describe('GET /api/leagues/[id] — query param validation', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when unexpected query params are present', async () => {
    const req = new NextRequest('http://localhost/api/leagues/league-abc?foo=bar', { method: 'GET' })
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await GET(req, makeParams())
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('INVALID_PARAMS')
  })
})

describe('GET /api/leagues/[id] — auth guards', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 when auth returns an error', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ authError: { message: 'jwt expired' } }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.code).toBe('SESSION_EXPIRED')
  })

  it('returns 401 when user is null', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ user: null }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(401)
  })

  it('returns 403 when user is not a member', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ membershipResult: { data: null, error: { message: 'not found' } } }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('NOT_A_MEMBER')
  })

  it('returns 404 when league does not exist', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ leagueResult: { data: null, error: { message: 'row not found' } } }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.code).toBe('LEAGUE_NOT_FOUND')
  })

  it('returns 500 when members query errors', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        membersResult: { data: null, error: { message: 'db error' } },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.code).toBe('DATABASE_ERROR')
  })
})

describe('GET /api/leagues/[id] — has_champion_bet', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns has_champion_bet: false when no row exists for user+league', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ champBetsResult: { data: [], error: null } }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.has_champion_bet).toBe(false)
  })

  it('returns has_champion_bet: true when a row exists for user+league', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        champBetsResult: { data: [makeChampBet()], error: null },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.has_champion_bet).toBe(true)
  })

  it('returns has_champion_bet: false when bet exists for another user (not the requesting user)', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        champBetsResult: { data: [makeChampBet({ user_id: 'other-user' })], error: null },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.has_champion_bet).toBe(false)
  })

  it('returns has_champion_bet: false (not an error) when the champion_bets query throws', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ champBetsResult: { data: null, error: { message: 'relation does not exist' } } }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('success')
    expect(json.data.has_champion_bet).toBe(false)
  })

  it('response includes all existing LeagueDetail fields unchanged', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(200)
    const json = await res.json()
    const data = json.data

    expect(data).toHaveProperty('id', MOCK_LEAGUE.id)
    expect(data).toHaveProperty('name', MOCK_LEAGUE.name)
    expect(data).toHaveProperty('access_type', MOCK_LEAGUE.access_type)
    expect(data).toHaveProperty('logo_url', MOCK_LEAGUE.logo_url)
    expect(data).toHaveProperty('member_count', MOCK_LEAGUE.member_count)
    expect(data).toHaveProperty('description', MOCK_LEAGUE.description)
    expect(data).toHaveProperty('created_by', MOCK_LEAGUE.created_by)
    expect(data).toHaveProperty('created_at', MOCK_LEAGUE.created_at)
    expect(data).toHaveProperty('role', 'admin')
    expect(data).toHaveProperty('user_onboarded_at', null)
    expect(data).toHaveProperty('members')
    expect(Array.isArray(data.members)).toBe(true)
    expect(data).toHaveProperty('has_champion_bet')
    expect(data).toHaveProperty('prizes')
    expect(data).toHaveProperty('user_stats')
    expect(data).toHaveProperty('ranking')
  })
})

describe('GET /api/leagues/[id] — prizes', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('response includes prizes field (null when league has no prize_pool)', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data).toHaveProperty('prizes')
    expect(json.data.prizes).toBeNull()
  })

  it('response includes prizes as a non-null string when league has prize_pool set', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        leagueResult: { data: { ...MOCK_LEAGUE, prize_pool: 'R$100 para o 1º lugar' }, error: null },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data.prizes).toBe('R$100 para o 1º lugar')
  })
})

describe('GET /api/leagues/[id] — scoring: group stage', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('no finished matches → user_stats.points = 0, position = 1 (only member)', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data.user_stats.points).toBe(0)
    expect(json.data.user_stats.position).toBe(1)
    expect(json.data.matches_played).toBe(0)
    expect(json.data.user_stats.exact_scores).toBe(0)
  })

  it('exact group hit → +10 points and exact_scores: 1', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        predictionsResult: {
          data: [makePrediction({ predicted_home_score: 2, predicted_away_score: 1 })],
          error: null,
        },
        finishedMatchesResult: {
          data: [makeFinishedMatch({ phase: 'group', home_score: 2, away_score: 1 })],
          error: null,
        },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data.user_stats.points).toBe(10)
    expect(json.data.user_stats.exact_scores).toBe(1)
    expect(json.data.matches_played).toBe(1)
  })

  it('correct outcome (non-exact) group hit → +5 points', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        predictionsResult: {
          data: [makePrediction({ predicted_home_score: 3, predicted_away_score: 0 })],
          error: null,
        },
        finishedMatchesResult: {
          data: [makeFinishedMatch({ phase: 'group', home_score: 2, away_score: 0 })],
          error: null,
        },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data.user_stats.points).toBe(5)
    expect(json.data.user_stats.exact_scores).toBe(0)
  })

  it('wrong outcome group prediction → 0 points', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        predictionsResult: {
          data: [makePrediction({ predicted_home_score: 0, predicted_away_score: 2 })],
          error: null,
        },
        finishedMatchesResult: {
          data: [makeFinishedMatch({ phase: 'group', home_score: 2, away_score: 0 })],
          error: null,
        },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data.user_stats.points).toBe(0)
  })

  it('prediction for a non-finished match → 0 points (match not in finishedMatches)', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        predictionsResult: {
          data: [makePrediction({ match_id: 'scheduled-match' })],
          error: null,
        },
        finishedMatchesResult: { data: [], error: null },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data.user_stats.points).toBe(0)
    expect(json.data.matches_played).toBe(0)
  })

  it('matches_played counts every finished match with both scores (tournament-wide)', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        finishedMatchesResult: {
          data: [
            makeFinishedMatch({ id: 'm1' }),
            makeFinishedMatch({ id: 'm2' }),
            makeFinishedMatch({ id: 'm3' }),
          ],
          error: null,
        },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data.matches_played).toBe(3)
  })

  it('matches_played excludes finished rows missing a home or away score', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        finishedMatchesResult: {
          data: [
            makeFinishedMatch({ id: 'm1', home_score: 2, away_score: 1 }),
            makeFinishedMatch({ id: 'm2', home_score: null, away_score: 1 }),
            makeFinishedMatch({ id: 'm3', home_score: 0, away_score: null }),
            makeFinishedMatch({ id: 'm4', home_score: null, away_score: null }),
          ],
          error: null,
        },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    // Only m1 carries both scores.
    expect(json.data.matches_played).toBe(1)
  })

  it('does not expose per-user guesses_made / guesses_total fields', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data.user_stats).not.toHaveProperty('guesses_made')
    expect(json.data.user_stats).not.toHaveProperty('guesses_total')
  })
})

describe('GET /api/leagues/[id] — scoring: knockout phase with multiplier', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('exact hit in 8th (2.5×) → 25 points (10 × 2.5)', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        predictionsResult: {
          data: [makePrediction({ predicted_home_score: 2, predicted_away_score: 1 })],
          error: null,
        },
        finishedMatchesResult: {
          data: [makeFinishedMatch({ phase: '8th', home_score: 2, away_score: 1 })],
          error: null,
        },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data.user_stats.points).toBe(25)
    expect(json.data.ranking[0].points).toBe(25)
  })

  it('correct outcome in 8th (2.5×) → 12.5 points (5 × 2.5)', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        predictionsResult: {
          data: [makePrediction({ predicted_home_score: 3, predicted_away_score: 0 })],
          error: null,
        },
        finishedMatchesResult: {
          data: [makeFinishedMatch({ phase: '8th', home_score: 2, away_score: 0 })],
          error: null,
        },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data.user_stats.points).toBe(12.5)
  })

  it('exact hit in final (4×) → 40 points (10 × 4), separate from champion scoring', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        predictionsResult: {
          data: [makePrediction({ match_id: 'final-m', predicted_home_score: 1, predicted_away_score: 0 })],
          error: null,
        },
        finishedMatchesResult: {
          data: [
            makeFinishedMatch({
              id: 'final-m',
              phase: 'final',
              home_team: 'BRA',
              away_team: 'ARG',
              home_score: 1,
              away_score: 0,
            }),
          ],
          error: null,
        },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data.user_stats.points).toBe(40)
  })
})

describe('GET /api/leagues/[id] — scoring: champion / vice', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('correct champion + correct vice → +75 once final is finished', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        champBetsResult: {
          data: [makeChampBet({ champion_team: 'BRA', runner_up_team: 'ARG' })],
          error: null,
        },
        finishedMatchesResult: {
          data: [
            makeFinishedMatch({
              id: 'final-m',
              phase: 'final',
              home_team: 'BRA',
              away_team: 'ARG',
              home_score: 1,
              away_score: 0,
            }),
          ],
          error: null,
        },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data.user_stats.points).toBe(75)
  })

  it('correct champion, wrong vice → +50 only', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        champBetsResult: {
          data: [makeChampBet({ champion_team: 'BRA', runner_up_team: 'GER' })],
          error: null,
        },
        finishedMatchesResult: {
          data: [
            makeFinishedMatch({
              id: 'final-m',
              phase: 'final',
              home_team: 'BRA',
              away_team: 'ARG',
              home_score: 1,
              away_score: 0,
            }),
          ],
          error: null,
        },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data.user_stats.points).toBe(50)
  })

  it('wrong champion, correct vice → +25 only', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        champBetsResult: {
          data: [makeChampBet({ champion_team: 'GER', runner_up_team: 'ARG' })],
          error: null,
        },
        finishedMatchesResult: {
          data: [
            makeFinishedMatch({
              id: 'final-m',
              phase: 'final',
              home_team: 'BRA',
              away_team: 'ARG',
              home_score: 1,
              away_score: 0,
            }),
          ],
          error: null,
        },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data.user_stats.points).toBe(25)
  })

  it('final not yet finished → champion/vice contribute 0 points', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        champBetsResult: {
          data: [makeChampBet({ champion_team: 'BRA', runner_up_team: 'ARG' })],
          error: null,
        },
        finishedMatchesResult: { data: [], error: null },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data.user_stats.points).toBe(0)
  })

  it('champion/vice contribute 0 when final score is a draw (unresolvable winner)', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        champBetsResult: {
          data: [makeChampBet({ champion_team: 'BRA', runner_up_team: 'ARG' })],
          error: null,
        },
        finishedMatchesResult: {
          data: [
            makeFinishedMatch({
              id: 'final-m',
              phase: 'final',
              home_team: 'BRA',
              away_team: 'ARG',
              home_score: 1,
              away_score: 1,
            }),
          ],
          error: null,
        },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data.user_stats.points).toBe(0)
  })
})

describe('GET /api/leagues/[id] — ranking', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('ranking is sorted by total points descending', async () => {
    const members = [
      {
        user_id: 'user-A',
        role: 'member' as const,
        joined_at: '2026-01-01T00:00:00Z',
        onboarded_at: null,
        users: [{ full_name: 'A', avatar_url: null, avatar_color: '#111' }],
      },
      {
        user_id: 'user-B',
        role: 'member' as const,
        joined_at: '2026-01-02T00:00:00Z',
        onboarded_at: null,
        users: [{ full_name: 'B', avatar_url: null, avatar_color: '#222' }],
      },
    ]
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        user: { id: 'user-A' },
        membersResult: { data: members, error: null },
        predictionsResult: {
          data: [
            // user-A predicts match-1 exactly (group → +10)
            { user_id: 'user-A', match_id: 'match-1', predicted_home_score: 2, predicted_away_score: 1 },
            // user-B predicts match-1 wrong
            { user_id: 'user-B', match_id: 'match-1', predicted_home_score: 0, predicted_away_score: 1 },
          ],
          error: null,
        },
        finishedMatchesResult: {
          data: [makeFinishedMatch({ id: 'match-1', home_score: 2, away_score: 1 })],
          error: null,
        },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data.ranking[0].user_id).toBe('user-A')
    expect(json.data.ranking[0].points).toBe(10)
    expect(json.data.ranking[0].position).toBe(1)
    expect(json.data.ranking[1].user_id).toBe('user-B')
    expect(json.data.ranking[1].points).toBe(0)
    expect(json.data.ranking[1].position).toBe(2)
  })

  it('tie-break by most-recent exact match date: later match_date ranks higher on equal points', async () => {
    const members = [
      {
        user_id: 'user-A',
        role: 'member' as const,
        joined_at: '2026-01-01T00:00:00Z',
        onboarded_at: null,
        users: [{ full_name: 'Zara', avatar_url: null, avatar_color: '#111' }],
      },
      {
        user_id: 'user-B',
        role: 'member' as const,
        joined_at: '2026-01-03T00:00:00Z',
        onboarded_at: null,
        users: [{ full_name: 'Ana', avatar_url: null, avatar_color: '#222' }],
      },
    ]
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        user: { id: 'user-A' },
        membersResult: { data: members, error: null },
        predictionsResult: {
          data: [
            // user-A: exact on later match (match-2) → more recent exact date
            { user_id: 'user-A', match_id: 'match-2', predicted_home_score: 1, predicted_away_score: 0 },
            // user-B: exact on earlier match (match-1) → less recent exact date
            { user_id: 'user-B', match_id: 'match-1', predicted_home_score: 2, predicted_away_score: 1 },
          ],
          error: null,
        },
        finishedMatchesResult: {
          data: [
            makeFinishedMatch({ id: 'match-1', home_score: 2, away_score: 1, match_date: '2026-01-15T15:00:00Z' }),
            makeFinishedMatch({ id: 'match-2', home_score: 1, away_score: 0, match_date: '2026-02-15T15:00:00Z' }),
          ],
          error: null,
        },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    // Both have equal points (10 each — exact group hits); user-A's exact was on the later
    // match (2026-02-15) → ranks 1st by most-recent-exact-date tiebreaker
    expect(json.data.ranking[0].user_id).toBe('user-A')
    expect(json.data.ranking[0].position).toBe(1)
    expect(json.data.ranking[1].user_id).toBe('user-B')
    expect(json.data.ranking[1].position).toBe(2)
  })

  it('ranking contains at most 5 entries when league has more than 5 members', async () => {
    const manyMembers = Array.from({ length: 7 }, (_, i) => ({
      user_id: `user-${i}`,
      role: 'member' as const,
      joined_at: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
      onboarded_at: null,
      users: [{ full_name: `User ${i}`, avatar_url: null, avatar_color: '#FF0000' }],
    }))
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ membersResult: { data: manyMembers, error: null } }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data.ranking.length).toBe(5)
  })

  it('ranking contains all members when league has fewer than 5 members', async () => {
    const fewMembers = Array.from({ length: 3 }, (_, i) => ({
      user_id: `user-${i}`,
      role: 'member' as const,
      joined_at: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
      onboarded_at: null,
      users: [{ full_name: `User ${i}`, avatar_url: null, avatar_color: '#FF0000' }],
    }))
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ membersResult: { data: fewMembers, error: null } }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data.ranking.length).toBe(3)
  })

  it('user_stats.position reflects actual rank even when user is outside top 5', async () => {
    const manyMembers = Array.from({ length: 7 }, (_, i) => ({
      user_id: `user-${i}`,
      role: 'member' as const,
      joined_at: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
      onboarded_at: null,
      users: [{ full_name: `User ${i}`, avatar_url: null, avatar_color: '#FF0000' }],
    }))
    // user-6 has lowest points (joined last, all 0 points → position 7)
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        user: { id: 'user-6' },
        membersResult: { data: manyMembers, error: null },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data.user_stats.position).toBe(7)
    expect(json.data.ranking.length).toBe(5)
  })

  it('ranking entries have 1-based position', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data.ranking.length).toBeGreaterThan(0)
    expect(json.data.ranking[0].position).toBe(1)
  })

  it('ranking reflects multiplier-weighted knockout points', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        predictionsResult: {
          data: [makePrediction({ predicted_home_score: 2, predicted_away_score: 1 })],
          error: null,
        },
        finishedMatchesResult: {
          data: [makeFinishedMatch({ phase: '8th', home_score: 2, away_score: 1 })],
          error: null,
        },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data.ranking[0].points).toBe(25)
  })
})

describe('GET /api/leagues/[id] — combined scoring scenarios', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('group + knockout + champion all contribute to total points', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        predictionsResult: {
          data: [
            // exact group: +10
            makePrediction({ match_id: 'group-m', predicted_home_score: 2, predicted_away_score: 1 }),
            // exact 8th: +25
            makePrediction({ match_id: '8th-m', predicted_home_score: 1, predicted_away_score: 0 }),
          ],
          error: null,
        },
        champBetsResult: {
          // champion: +50, vice: +25 = +75
          data: [makeChampBet({ champion_team: 'BRA', runner_up_team: 'ARG' })],
          error: null,
        },
        finishedMatchesResult: {
          data: [
            makeFinishedMatch({ id: 'group-m', phase: 'group', home_score: 2, away_score: 1 }),
            makeFinishedMatch({ id: '8th-m', phase: '8th', home_score: 1, away_score: 0 }),
            makeFinishedMatch({
              id: 'final-m',
              phase: 'final',
              home_team: 'BRA',
              away_team: 'ARG',
              home_score: 1,
              away_score: 0,
            }),
          ],
          error: null,
        },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    // 10 (group) + 25 (8th) + 75 (champion+vice) = 110
    expect(json.data.user_stats.points).toBe(110)
    expect(json.data.user_stats.exact_scores).toBe(2)
    // 3 finished matches (group, 8th, final), all with both scores.
    expect(json.data.matches_played).toBe(3)
  })

  it('away team wins final → correct champion/vice derived from away_score > home_score', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        champBetsResult: {
          data: [makeChampBet({ champion_team: 'ARG', runner_up_team: 'BRA' })],
          error: null,
        },
        finishedMatchesResult: {
          data: [
            makeFinishedMatch({
              id: 'final-m',
              phase: 'final',
              home_team: 'BRA',
              away_team: 'ARG',
              home_score: 0,
              away_score: 1,
            }),
          ],
          error: null,
        },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    // realChamp = 'ARG' (away wins), realVice = 'BRA'
    expect(json.data.user_stats.points).toBe(75)
  })

  it('matches query error → graceful fallback to 0 points (still 200)', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        predictionsResult: {
          data: [makePrediction({ predicted_home_score: 2, predicted_away_score: 1 })],
          error: null,
        },
        finishedMatchesResult: { data: null, error: { message: 'connection timeout' } },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.user_stats.points).toBe(0)
    expect(json.data.matches_played).toBe(0)
  })

  it('predictions query error → graceful fallback to 0 points (still 200)', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        predictionsResult: { data: null, error: { message: 'timeout' } },
        finishedMatchesResult: {
          data: [makeFinishedMatch({ id: 'm1' })],
          error: null,
        },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.user_stats.points).toBe(0)
    expect(json.data.matches_played).toBe(1)
  })

  it('prediction for a dead-enum 4th phase match → 0 points', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        predictionsResult: {
          data: [makePrediction({ match_id: 'dead-m', predicted_home_score: 2, predicted_away_score: 1 })],
          error: null,
        },
        finishedMatchesResult: {
          data: [makeFinishedMatch({ id: 'dead-m', phase: '4th', home_score: 2, away_score: 1 })],
          error: null,
        },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data.user_stats.points).toBe(0)
    expect(json.data.matches_played).toBe(1)
  })
})
