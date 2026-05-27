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
  prizes: null,
}
const MOCK_MEMBER_ROW = {
  user_id: 'user-123',
  role: 'admin',
  joined_at: '2026-01-01T00:00:00Z',
  onboarded_at: null,
  users: [{ full_name: 'João', avatar_url: null, avatar_color: '#FF0000' }],
}

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost/api/leagues/league-abc', { method: 'GET' })
}

function makeParams(): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id: 'league-abc' }) }
}

function makeSupabase(overrides?: {
  user?: unknown
  authError?: unknown
  membershipResult?: { data: unknown; error: unknown }
  leagueResult?: { data: unknown; error: unknown }
  membersResult?: { data: unknown; error: unknown }
  betResult?: { data: unknown; error: unknown }
}) {
  const opts = {
    user: MOCK_USER,
    authError: null,
    membershipResult: { data: { role: 'admin' }, error: null },
    leagueResult: { data: MOCK_LEAGUE, error: null },
    membersResult: { data: [MOCK_MEMBER_ROW], error: null },
    betResult: { data: null, error: null },
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
      const maybeSingle = vi.fn().mockResolvedValue(opts.betResult)
      const eq2 = vi.fn(() => ({ maybeSingle }))
      const eq1 = vi.fn(() => ({ eq: eq2 }))
      const select = vi.fn(() => ({ eq: eq1 }))
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

describe('GET /api/leagues/[id] — has_champion_bet', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns has_champion_bet: false when no row exists in champion_bets for user+league', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ betResult: { data: null, error: null } }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.has_champion_bet).toBe(false)
  })

  it('returns has_champion_bet: true when a row exists in champion_bets for user+league', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ betResult: { data: { id: 'bet-1' }, error: null } }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.has_champion_bet).toBe(true)
  })

  it('returns has_champion_bet: false (not an error) when the champion_bets query throws', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ betResult: { data: null, error: { message: 'relation does not exist' } } }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('success')
    expect(json.data.has_champion_bet).toBe(false)
  })

  it('returns all existing LeagueDetail fields unchanged in the response', async () => {
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
  })
})

describe('GET /api/leagues/[id] — has_champion_bet integration scenarios', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('end-to-end: authenticated GET for a league with no bet returns has_champion_bet: false in data', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.status).toBe('success')
    expect(json.data).toHaveProperty('has_champion_bet', false)
  })

  it('end-to-end: with a bet row in champion_bets, GET returns has_champion_bet: true', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        betResult: { data: { id: 'bet-existing' }, error: null },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.status).toBe('success')
    expect(json.data).toHaveProperty('has_champion_bet', true)
  })
})

describe('GET /api/leagues/[id] — prizes, user_stats, ranking', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('response includes prizes field (null when league has no prizes)', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data).toHaveProperty('prizes')
    expect(json.data.prizes).toBeNull()
  })

  it('response includes prizes as a non-null string when league has prizes set', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        leagueResult: { data: { ...MOCK_LEAGUE, prizes: 'R$100 para o 1º lugar' }, error: null },
      }) as never
    )
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data.prizes).toBe('R$100 para o 1º lugar')
  })

  it('response includes user_stats with all five fields set to 0', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data.user_stats).toEqual({
      position: 0,
      points: 0,
      guesses_made: 0,
      guesses_total: 0,
      exact_scores: 0,
    })
  })

  it('response includes ranking as an array with points: 0 for each entry', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(Array.isArray(json.data.ranking)).toBe(true)
    for (const entry of json.data.ranking) {
      expect(entry.points).toBe(0)
    }
  })

  it('ranking entries have 1-based position', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await GET(makeRequest(), makeParams())
    const json = await res.json()
    expect(json.data.ranking.length).toBeGreaterThan(0)
    expect(json.data.ranking[0].position).toBe(1)
  })

  it('ranking contains at most 5 entries even when league has more than 5 members', async () => {
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
    expect(json.data.ranking.length).toBeLessThanOrEqual(5)
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

  it('all previously existing response fields are present and unchanged', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await GET(makeRequest(), makeParams())
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
    expect(data).toHaveProperty('has_champion_bet')
    expect(data).toHaveProperty('prizes')
    expect(data).toHaveProperty('user_stats')
    expect(data).toHaveProperty('ranking')
  })
})
