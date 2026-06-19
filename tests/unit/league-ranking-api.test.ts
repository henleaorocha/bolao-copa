import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseServerClient: vi.fn(),
}))

// The route reads champion_bets with a service-role client (createClient from
// @supabase/supabase-js) to bypass the per-row owner RLS filter. Mock it to
// serve whatever champBetsResult the current makeSupabase() was configured with,
// shared via vi.hoisted so the mock factory can reach it despite hoisting.
const { champBetsState } = vi.hoisted(() => ({
  champBetsState: { current: { data: [] as unknown, error: null as unknown } },
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === 'champion_bets') {
        const promise = Promise.resolve(champBetsState.current)
        const thenable = {
          then: promise.then.bind(promise),
          catch: promise.catch.bind(promise),
        }
        return { select: () => ({ eq: () => thenable }) }
      }
      return {}
    },
  }),
}))

import { GET } from '@/app/api/leagues/[id]/ranking/route'
import { getSupabaseServerClient } from '@/lib/supabase/client'

const MOCK_USER = { id: 'user-123' }
const MOCK_LEAGUE = { id: 'league-abc' }
const MOCK_MEMBER_ROW = {
  user_id: 'user-123',
  joined_at: '2026-01-01T00:00:00Z',
  users: [{ full_name: 'João', avatar_color: '#FF0000' }],
}

function makeMemberRow(overrides: Record<string, unknown> = {}) {
  return { ...MOCK_MEMBER_ROW, ...overrides }
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

function makeRequest(url = 'http://localhost/api/leagues/league-abc/ranking'): NextRequest {
  return new NextRequest(url, { method: 'GET' })
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
  leagueResult?: { data: unknown; error: unknown }
  membershipResult?: { data: unknown; error: unknown }
  membersResult?: { data: unknown; error: unknown }
  champBetsResult?: { data: unknown; error: unknown }
  predictionsResult?: { data: unknown; error: unknown }
  finishedMatchesResult?: { data: unknown; error: unknown }
}) {
  const opts = {
    user: MOCK_USER,
    authError: null,
    leagueResult: { data: MOCK_LEAGUE, error: null },
    membershipResult: { data: { role: 'member' }, error: null },
    membersResult: { data: [MOCK_MEMBER_ROW], error: null },
    champBetsResult: { data: [], error: null },
    predictionsResult: { data: [], error: null },
    finishedMatchesResult: { data: [], error: null },
    ...overrides,
  }

  // Champion bets are read via the service-role client (mocked above), so expose
  // this instance's champBetsResult to that mock.
  champBetsState.current = opts.champBetsResult

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
        // membership check: .select('role').eq(user_id).eq(league_id).single()
        const single = vi.fn().mockResolvedValue(opts.membershipResult)
        const eq2 = vi.fn(() => ({ single }))
        const eq1 = vi.fn(() => ({ eq: eq2 }))
        const select = vi.fn(() => ({ eq: eq1 }))
        return { select }
      } else {
        // members list: .select(...).eq(league_id).order(...)
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
      // Paginated read: .select().eq(league_id).order('id').range(from, to).
      // Test fixtures are all < 1000 rows, so the helper reads a single page.
      const range = vi.fn(() => makeThenable(opts.predictionsResult))
      const order = vi.fn(() => ({ range }))
      const eq = vi.fn(() => ({ order }))
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

describe('GET /api/leagues/[id]/ranking — query param validation', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 INVALID_PARAMS when unknown query params are present', async () => {
    const req = makeRequest('http://localhost/api/leagues/league-abc/ranking?page=2')
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await GET(req, makeParams())
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('INVALID_PARAMS')
  })

  it('returns 200 when no query params are present', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(200)
  })
})

describe('GET /api/leagues/[id]/ranking — auth guards', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 SESSION_EXPIRED when auth returns an error', async () => {
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

  it('returns 404 LEAGUE_NOT_FOUND when league does not exist', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ leagueResult: { data: null, error: { message: 'row not found' } } }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.code).toBe('LEAGUE_NOT_FOUND')
  })

  it('returns 403 NOT_A_MEMBER when user is not a member', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        membershipResult: { data: null, error: { message: 'not found' } },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('NOT_A_MEMBER')
  })

  it('returns 500 DATABASE_ERROR when members query fails', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        membersResult: { data: null, error: { message: 'connection timeout' } },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.code).toBe('DATABASE_ERROR')
  })
})

describe('GET /api/leagues/[id]/ranking — full list (no truncation)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns all 8 members when league has 8 members (no top-5 truncation)', async () => {
    const eightMembers = Array.from({ length: 8 }, (_, i) =>
      makeMemberRow({
        user_id: `user-${i}`,
        joined_at: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
        users: [{ full_name: `User ${i}`, avatar_color: '#FF0000' }],
      })
    )
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ membersResult: { data: eightMembers, error: null } }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.ranking).toHaveLength(8)
  })

  it('returns all 1 member when league has only 1 member', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.ranking).toHaveLength(1)
  })

  it('response shape is { status, data: { ranking }, timestamp }', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.status).toBe('success')
    expect(json.data).toHaveProperty('ranking')
    expect(Array.isArray(json.data.ranking)).toBe(true)
    expect(json).toHaveProperty('timestamp')
  })
})

describe('GET /api/leagues/[id]/ranking — entry field set', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('each entry has exactly user_id, full_name, avatar_color, points, position, exact_scores, correct_outcomes', async () => {
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
    const entry = json.data.ranking[0]
    expect(entry).toHaveProperty('user_id')
    expect(entry).toHaveProperty('full_name')
    expect(entry).toHaveProperty('avatar_color')
    expect(entry).toHaveProperty('points')
    expect(entry).toHaveProperty('position')
    expect(entry).toHaveProperty('exact_scores')
    expect(entry).toHaveProperty('correct_outcomes')
    // no extra fields from panel (no guesses_made, guesses_total, etc.)
    expect(entry).not.toHaveProperty('guesses_made')
    expect(entry).not.toHaveProperty('guesses_total')
  })

  it('exact group score → points=10, exact_scores=1, correct_outcomes=1', async () => {
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
    const entry = json.data.ranking[0]
    expect(entry.points).toBe(10)
    expect(entry.exact_scores).toBe(1)
    expect(entry.correct_outcomes).toBe(1)
    expect(entry.position).toBe(1)
  })

  it('correct outcome (non-exact) group → points=5, exact_scores=0, correct_outcomes=1', async () => {
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
    const entry = json.data.ranking[0]
    expect(entry.points).toBe(5)
    expect(entry.exact_scores).toBe(0)
    expect(entry.correct_outcomes).toBe(1)
  })
})

describe('GET /api/leagues/[id]/ranking — ordering', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('orders by points descending', async () => {
    const members = [
      makeMemberRow({
        user_id: 'user-A',
        joined_at: '2026-01-01T00:00:00Z',
        users: [{ full_name: 'Alice', avatar_color: '#111' }],
      }),
      makeMemberRow({
        user_id: 'user-B',
        joined_at: '2026-01-02T00:00:00Z',
        users: [{ full_name: 'Bob', avatar_color: '#222' }],
      }),
    ]
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        user: { id: 'user-A' },
        membersResult: { data: members, error: null },
        predictionsResult: {
          data: [
            // user-A exact group (+10)
            { user_id: 'user-A', match_id: 'match-1', predicted_home_score: 2, predicted_away_score: 1 },
            // user-B wrong
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

  it('tie-break by most-recent exact match_date: later date ranks higher on equal points', async () => {
    const members = [
      makeMemberRow({
        user_id: 'user-A',
        joined_at: '2026-01-01T00:00:00Z',
        users: [{ full_name: 'Zara', avatar_color: '#111' }],
      }),
      makeMemberRow({
        user_id: 'user-B',
        joined_at: '2026-01-03T00:00:00Z',
        users: [{ full_name: 'Ana', avatar_color: '#222' }],
      }),
    ]
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        user: { id: 'user-A' },
        membersResult: { data: members, error: null },
        predictionsResult: {
          data: [
            // user-A exact on later match (match-2)
            { user_id: 'user-A', match_id: 'match-2', predicted_home_score: 1, predicted_away_score: 0 },
            // user-B exact on earlier match (match-1)
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
    // Both 10 points; user-A had later exact → position 1
    expect(json.data.ranking[0].user_id).toBe('user-A')
    expect(json.data.ranking[0].position).toBe(1)
    expect(json.data.ranking[1].user_id).toBe('user-B')
    expect(json.data.ranking[1].position).toBe(2)
  })

  it('tie-break by exact count beats most-recent: more cravadas ranks higher even if the other has a newer single exact', async () => {
    const members = [
      makeMemberRow({
        user_id: 'user-A',
        joined_at: '2026-01-01T00:00:00Z',
        users: [{ full_name: 'Zara', avatar_color: '#111' }],
      }),
      makeMemberRow({
        user_id: 'user-B',
        joined_at: '2026-01-03T00:00:00Z',
        users: [{ full_name: 'Ana', avatar_color: '#222' }],
      }),
    ]
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        user: { id: 'user-A' },
        membersResult: { data: members, error: null },
        predictionsResult: {
          data: [
            // user-A: 2 exact scores on earlier matches → 20 pts, 2 cravadas
            { user_id: 'user-A', match_id: 'match-1', predicted_home_score: 2, predicted_away_score: 1 },
            { user_id: 'user-A', match_id: 'match-2', predicted_home_score: 1, predicted_away_score: 0 },
            // user-B: 1 exact (newer) + 2 correct-outcome → 20 pts, 1 cravada (most recent of all)
            { user_id: 'user-B', match_id: 'match-3', predicted_home_score: 3, predicted_away_score: 2 },
            { user_id: 'user-B', match_id: 'match-4', predicted_home_score: 1, predicted_away_score: 0 },
            { user_id: 'user-B', match_id: 'match-5', predicted_home_score: 1, predicted_away_score: 0 },
          ],
          error: null,
        },
        finishedMatchesResult: {
          data: [
            makeFinishedMatch({ id: 'match-1', home_score: 2, away_score: 1, match_date: '2026-01-15T15:00:00Z' }),
            makeFinishedMatch({ id: 'match-2', home_score: 1, away_score: 0, match_date: '2026-02-15T15:00:00Z' }),
            makeFinishedMatch({ id: 'match-3', home_score: 3, away_score: 2, match_date: '2026-03-15T15:00:00Z' }),
            makeFinishedMatch({ id: 'match-4', home_score: 3, away_score: 0, match_date: '2026-01-10T15:00:00Z' }),
            makeFinishedMatch({ id: 'match-5', home_score: 2, away_score: 0, match_date: '2026-01-11T15:00:00Z' }),
          ],
          error: null,
        },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    // Both 20 points. user-A has 2 cravadas vs user-B's 1 (whose single exact is newer).
    // "more cravadas" outranks "most recent exact" → user-A first.
    expect(json.data.ranking[0].user_id).toBe('user-A')
    expect(json.data.ranking[0].exact_scores).toBe(2)
    expect(json.data.ranking[0].points).toBe(20)
    expect(json.data.ranking[1].user_id).toBe('user-B')
    expect(json.data.ranking[1].exact_scores).toBe(1)
    expect(json.data.ranking[1].points).toBe(20)
  })

  it('all-zero league: members ordered alphabetically (pt-BR)', async () => {
    const members = [
      makeMemberRow({
        user_id: 'user-Z',
        joined_at: '2026-01-01T00:00:00Z',
        users: [{ full_name: 'Zélio', avatar_color: '#111' }],
      }),
      makeMemberRow({
        user_id: 'user-A',
        joined_at: '2026-01-02T00:00:00Z',
        users: [{ full_name: 'Ana', avatar_color: '#222' }],
      }),
    ]
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        user: { id: 'user-A' },
        membersResult: { data: members, error: null },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data.ranking[0].user_id).toBe('user-A') // Ana < Zélio
    expect(json.data.ranking[1].user_id).toBe('user-Z')
  })

  it('ranking returns full list matching computeRanking output for 8 members', async () => {
    const eightMembers = Array.from({ length: 8 }, (_, i) =>
      makeMemberRow({
        user_id: `user-${i}`,
        joined_at: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
        users: [{ full_name: `User ${i}`, avatar_color: '#FF0000' }],
      })
    )
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        membersResult: { data: eightMembers, error: null },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data.ranking).toHaveLength(8)
    // All 8 have 0 points → positions 1..8 all present
    const positions = json.data.ranking.map((e: { position: number }) => e.position)
    expect(positions).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })
})
