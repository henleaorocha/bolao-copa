import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseServerClient: vi.fn(),
}))

import { PUT } from '@/app/api/leagues/[id]/champion-bet/route'
import { getSupabaseServerClient } from '@/lib/supabase/client'

const MOCK_USER = { id: 'user-123' }
const MOCK_BET = {
  id: 'bet-abc',
  user_id: 'user-123',
  league_id: 'league-abc',
  champion_team: 'Brasil',
  runner_up_team: 'Argentina',
  created_at: '2026-05-24T10:00:00Z',
  updated_at: '2026-05-24T10:00:00Z',
}

function makeRequest(body?: object): NextRequest {
  return new NextRequest('http://localhost/api/leagues/league-abc/champion-bet', {
    method: 'PUT',
    body: body !== undefined ? JSON.stringify(body) : undefined,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
  })
}

function makeParams(): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id: 'league-abc' }) }
}

function makeSupabase(overrides?: {
  user?: unknown
  authError?: unknown
  membershipResult?: { data: unknown; error: unknown }
  upsertResult?: { data: unknown; error: unknown }
}) {
  const opts = {
    user: MOCK_USER,
    authError: null,
    membershipResult: { data: { role: 'member' }, error: null },
    upsertResult: { data: MOCK_BET, error: null },
    ...overrides,
  }

  const from = vi.fn((table: string) => {
    if (table === 'league_members') {
      const single = vi.fn().mockResolvedValue(opts.membershipResult)
      const eq2 = vi.fn(() => ({ single }))
      const eq1 = vi.fn(() => ({ eq: eq2 }))
      const select = vi.fn(() => ({ eq: eq1 }))
      return { select }
    }

    if (table === 'champion_bets') {
      const single = vi.fn().mockResolvedValue(opts.upsertResult)
      const select = vi.fn(() => ({ single }))
      const upsert = vi.fn(() => ({ select }))
      return { upsert }
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

describe('PUT /api/leagues/[id]/champion-bet', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('returns 401 SESSION_EXPIRED when no session', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ user: null, authError: { message: 'no session' } }) as never
    )
    const res = await PUT(makeRequest({ champion_team: 'Brasil', runner_up_team: 'Argentina' }), makeParams())
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.code).toBe('SESSION_EXPIRED')
  })

  it('returns 403 NOT_A_MEMBER when user is not a member of the league', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        membershipResult: { data: null, error: { message: 'row not found' } },
      }) as never
    )
    const res = await PUT(makeRequest({ champion_team: 'Brasil', runner_up_team: 'Argentina' }), makeParams())
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('NOT_A_MEMBER')
  })

  it('returns 409 BET_DEADLINE_PASSED when current time is past the deadline', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-12T00:00:00.000Z'))

    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await PUT(makeRequest({ champion_team: 'Brasil', runner_up_team: 'Argentina' }), makeParams())
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.code).toBe('BET_DEADLINE_PASSED')
  })

  it('returns 400 INVALID_PARAMS when champion_team is missing', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await PUT(makeRequest({ runner_up_team: 'Argentina' }), makeParams())
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('INVALID_PARAMS')
  })

  it('returns 400 INVALID_PARAMS when runner_up_team is missing', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await PUT(makeRequest({ champion_team: 'Brasil' }), makeParams())
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('INVALID_PARAMS')
  })

  it('returns 400 INVALID_PARAMS when champion_team is empty string', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await PUT(makeRequest({ champion_team: '', runner_up_team: 'Argentina' }), makeParams())
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('INVALID_PARAMS')
  })

  it('returns 400 INVALID_PARAMS when runner_up_team is empty string', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await PUT(makeRequest({ champion_team: 'Brasil', runner_up_team: '' }), makeParams())
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('INVALID_PARAMS')
  })

  it('returns 400 INVALID_TEAM when champion_team is not in VALID_TEAM_NAMES', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await PUT(makeRequest({ champion_team: 'Germany', runner_up_team: 'Argentina' }), makeParams())
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('INVALID_TEAM')
  })

  it('returns 400 INVALID_TEAM when runner_up_team is not in VALID_TEAM_NAMES', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await PUT(makeRequest({ champion_team: 'Brasil', runner_up_team: 'England' }), makeParams())
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('INVALID_TEAM')
  })

  it('returns 400 SAME_TEAM when champion_team equals runner_up_team', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await PUT(makeRequest({ champion_team: 'Brasil', runner_up_team: 'Brasil' }), makeParams())
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('SAME_TEAM')
  })

  it('returns 200 with ChampionBet data on valid payload (first bet)', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await PUT(makeRequest({ champion_team: 'Brasil', runner_up_team: 'Argentina' }), makeParams())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('success')
    expect(json.data).toMatchObject({
      id: MOCK_BET.id,
      user_id: MOCK_BET.user_id,
      league_id: MOCK_BET.league_id,
      champion_team: 'Brasil',
      runner_up_team: 'Argentina',
    })
    expect(json.data).toHaveProperty('created_at')
    expect(json.data).toHaveProperty('updated_at')
  })

  it('returns 200 on second PUT with updated teams (upsert — updated_at changes)', async () => {
    const updatedBet = { ...MOCK_BET, champion_team: 'Alemanha', runner_up_team: 'França', updated_at: '2026-05-24T11:00:00Z' }
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ upsertResult: { data: updatedBet, error: null } }) as never
    )
    const res = await PUT(makeRequest({ champion_team: 'Alemanha', runner_up_team: 'França' }), makeParams())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('success')
    expect(json.data.champion_team).toBe('Alemanha')
    expect(json.data.runner_up_team).toBe('França')
    expect(json.data.updated_at).toBe('2026-05-24T11:00:00Z')
  })

  it('returns 500 DATABASE_ERROR when upsert fails', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ upsertResult: { data: null, error: { message: 'db error' } } }) as never
    )
    const res = await PUT(makeRequest({ champion_team: 'Brasil', runner_up_team: 'Argentina' }), makeParams())
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.code).toBe('DATABASE_ERROR')
  })
})
