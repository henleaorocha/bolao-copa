import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseServerClient: vi.fn(),
}))

import { PUT } from '@/app/api/leagues/[id]/predictions/[matchId]/route'
import { getSupabaseServerClient } from '@/lib/supabase/client'

const MOCK_USER = { id: 'user-123' }
const MATCH_ID = 'match-abc'
const LEAGUE_ID = 'league-abc'

// A future group-stage match (3h from now) — deadline not passed, group bypasses confirmed check
const FUTURE_MATCH = {
  id: MATCH_ID,
  match_date: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
  phase: 'group',
  home_team: 'Brasil',
  away_team: 'Argentina',
}

// A group-stage match 30 min from now — deadline IS passed (match_date < now + 1h)
const NEAR_MATCH = {
  id: MATCH_ID,
  match_date: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  phase: 'group',
  home_team: 'Brasil',
  away_team: 'Argentina',
}

// A confirmed knockout match (both real teams) 3h from now — should allow prediction
const CONFIRMED_KNOCKOUT_MATCH = {
  id: MATCH_ID,
  match_date: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
  phase: '32nd',
  home_team: 'Brasil',
  away_team: 'Argentina',
}

// A confirmed knockout match 30 min from now — deadline IS passed
const CONFIRMED_KNOCKOUT_NEAR = {
  id: MATCH_ID,
  match_date: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  phase: '32nd',
  home_team: 'Brasil',
  away_team: 'Argentina',
}

// An unconfirmed knockout match — home team is a TBD placeholder, not a real team
const UNCONFIRMED_KNOCKOUT_MATCH = {
  id: MATCH_ID,
  match_date: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
  phase: '32nd',
  home_team: 'Vencedor 1º Grupo A',
  away_team: 'Vencedor 2º Grupo B',
}

const MOCK_PREDICTION_RESPONSE = {
  match_id: MATCH_ID,
  predicted_home_score: 2,
  predicted_away_score: 1,
  updated_at: '2026-05-25T10:00:00Z',
}

function makeRequest(body?: object): NextRequest {
  return new NextRequest(
    `http://localhost/api/leagues/${LEAGUE_ID}/predictions/${MATCH_ID}`,
    {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    }
  )
}

function makeParams(): { params: Promise<{ id: string; matchId: string }> } {
  return { params: Promise.resolve({ id: LEAGUE_ID, matchId: MATCH_ID }) }
}

function makeSupabase(overrides?: {
  user?: unknown
  authError?: unknown
  membershipResult?: { data: unknown; error: unknown }
  matchResult?: { data: unknown; error: unknown }
  existingPrediction?: { data: unknown; error: unknown }
  upsertResult?: { data: unknown; error: unknown }
}) {
  const opts = {
    user: MOCK_USER,
    authError: null,
    membershipResult: { data: { role: 'member' }, error: null },
    matchResult: { data: FUTURE_MATCH, error: null },
    existingPrediction: { data: null, error: null },
    upsertResult: { data: MOCK_PREDICTION_RESPONSE, error: null },
    ...overrides,
  }

  // tracks which prediction call we're on: 1 = select, 2 = upsert
  let predictionsCallCount = 0

  const from = vi.fn((table: string) => {
    if (table === 'league_members') {
      const single = vi.fn().mockResolvedValue(opts.membershipResult)
      const eq2 = vi.fn(() => ({ single }))
      const eq1 = vi.fn(() => ({ eq: eq2 }))
      const select = vi.fn(() => ({ eq: eq1 }))
      return { select }
    }

    if (table === 'matches') {
      const single = vi.fn().mockResolvedValue(opts.matchResult)
      const eq = vi.fn(() => ({ single }))
      const select = vi.fn(() => ({ eq }))
      return { select }
    }

    if (table === 'predictions') {
      predictionsCallCount++
      if (predictionsCallCount === 1) {
        // select — existing prediction check
        const maybeSingle = vi.fn().mockResolvedValue(opts.existingPrediction)
        const eq3 = vi.fn(() => ({ maybeSingle }))
        const eq2 = vi.fn(() => ({ eq: eq3 }))
        const eq1 = vi.fn(() => ({ eq: eq2 }))
        const select = vi.fn(() => ({ eq: eq1 }))
        return { select }
      } else {
        // upsert
        const single = vi.fn().mockResolvedValue(opts.upsertResult)
        const select = vi.fn(() => ({ single }))
        const upsert = vi.fn(() => ({ select }))
        return { upsert }
      }
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

describe('PUT /api/leagues/[id]/predictions/[matchId]', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 SESSION_EXPIRED when no session', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ user: null, authError: { message: 'no session' } }) as never
    )
    const res = await PUT(makeRequest({ home_score: 2, away_score: 1 }), makeParams())
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
    const res = await PUT(makeRequest({ home_score: 2, away_score: 1 }), makeParams())
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('NOT_A_MEMBER')
  })

  it('returns 400 INVALID_BODY when home_score is negative', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await PUT(makeRequest({ home_score: -1, away_score: 0 }), makeParams())
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('INVALID_BODY')
  })

  it('returns 400 INVALID_BODY when home_score is a non-integer float', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await PUT(makeRequest({ home_score: 1.5, away_score: 0 }), makeParams())
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('INVALID_BODY')
  })

  it('returns 400 INVALID_BODY when away_score is missing', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await PUT(makeRequest({ home_score: 2 }), makeParams())
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('INVALID_BODY')
  })

  it('returns 400 INVALID_BODY when home_score is missing', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await PUT(makeRequest({ away_score: 1 }), makeParams())
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('INVALID_BODY')
  })

  it('returns 400 INVALID_BODY when away_score is negative', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await PUT(makeRequest({ home_score: 0, away_score: -2 }), makeParams())
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('INVALID_BODY')
  })

  it('returns 400 INVALID_BODY when scores are non-numeric strings', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await PUT(makeRequest({ home_score: '2', away_score: '1' }), makeParams())
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('INVALID_BODY')
  })

  it('returns 400 INVALID_BODY when home_score exceeds the upper bound', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await PUT(makeRequest({ home_score: 999999, away_score: 0 }), makeParams())
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('INVALID_BODY')
  })

  it('returns 400 INVALID_BODY when away_score exceeds the upper bound', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await PUT(makeRequest({ home_score: 1, away_score: 100 }), makeParams())
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('INVALID_BODY')
  })

  it('accepts a score exactly at the upper bound (99)', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await PUT(makeRequest({ home_score: 99, away_score: 99 }), makeParams())
    expect(res.status).toBe(200)
  })

  it('returns 404 MATCH_NOT_FOUND when match does not exist', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        matchResult: { data: null, error: { message: 'row not found' } },
      }) as never
    )
    const res = await PUT(makeRequest({ home_score: 2, away_score: 1 }), makeParams())
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.code).toBe('MATCH_NOT_FOUND')
  })

  it('returns 403 DEADLINE_PASSED for a match within the next 30 minutes', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ matchResult: { data: NEAR_MATCH, error: null } }) as never
    )
    const res = await PUT(makeRequest({ home_score: 2, away_score: 1 }), makeParams())
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('DEADLINE_PASSED')
  })

  it('returns 200 with prediction fields on valid payload (new prediction)', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await PUT(makeRequest({ home_score: 2, away_score: 1 }), makeParams())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('success')
    expect(json.data).toMatchObject({
      match_id: MATCH_ID,
      predicted_home_score: 2,
      predicted_away_score: 1,
    })
    expect(json.data).toHaveProperty('updated_at')
  })

  it('logs is_update: false when no prior prediction exists', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ existingPrediction: { data: null, error: null } }) as never
    )
    await PUT(makeRequest({ home_score: 2, away_score: 1 }), makeParams())
    const loggedEvent = logSpy.mock.calls
      .map((args) => {
        try { return JSON.parse(args[0] as string) } catch { return null }
      })
      .find((obj) => obj?.event === 'prediction_saved')
    expect(loggedEvent?.is_update).toBe(false)
  })

  it('logs is_update: true when a prior prediction exists (second PUT updates row)', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const updatedResponse = { ...MOCK_PREDICTION_RESPONSE, predicted_home_score: 3, predicted_away_score: 0, updated_at: '2026-05-25T11:00:00Z' }
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        existingPrediction: { data: { id: 'pred-existing' }, error: null },
        upsertResult: { data: updatedResponse, error: null },
      }) as never
    )
    const res = await PUT(makeRequest({ home_score: 3, away_score: 0 }), makeParams())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.predicted_home_score).toBe(3)
    expect(json.data.updated_at).toBe('2026-05-25T11:00:00Z')
    const loggedEvent = logSpy.mock.calls
      .map((args) => {
        try { return JSON.parse(args[0] as string) } catch { return null }
      })
      .find((obj) => obj?.event === 'prediction_saved')
    expect(loggedEvent?.is_update).toBe(true)
  })

  it('returns 500 DATABASE_ERROR when upsert fails', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ upsertResult: { data: null, error: { message: 'db write error' } } }) as never
    )
    const res = await PUT(makeRequest({ home_score: 2, away_score: 1 }), makeParams())
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.code).toBe('DATABASE_ERROR')
  })

  it('logs prediction_rejected_deadline event on DEADLINE_PASSED', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ matchResult: { data: NEAR_MATCH, error: null } }) as never
    )
    await PUT(makeRequest({ home_score: 2, away_score: 1 }), makeParams())
    const loggedEvent = logSpy.mock.calls
      .map((args) => {
        try { return JSON.parse(args[0] as string) } catch { return null }
      })
      .find((obj) => obj?.event === 'prediction_rejected_deadline')
    expect(loggedEvent).toBeTruthy()
    expect(loggedEvent?.match_id).toBe(MATCH_ID)
    expect(loggedEvent?.user_id).toBe(MOCK_USER.id)
  })

  // ─── Confirmed-teams guard (task_05) ─────────────────────────────────────

  it('returns 409 MATCH_NOT_CONFIRMED when a knockout match has unconfirmed teams', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ matchResult: { data: UNCONFIRMED_KNOCKOUT_MATCH, error: null } }) as never
    )
    const res = await PUT(makeRequest({ home_score: 1, away_score: 0 }), makeParams())
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.code).toBe('MATCH_NOT_CONFIRMED')
  })

  it('returns 200 when a confirmed knockout match is bet before deadline', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ matchResult: { data: CONFIRMED_KNOCKOUT_MATCH, error: null } }) as never
    )
    const res = await PUT(makeRequest({ home_score: 2, away_score: 1 }), makeParams())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('success')
  })

  it('returns 403 DEADLINE_PASSED for a confirmed knockout match within 1h of kickoff', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ matchResult: { data: CONFIRMED_KNOCKOUT_NEAR, error: null } }) as never
    )
    const res = await PUT(makeRequest({ home_score: 1, away_score: 1 }), makeParams())
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('DEADLINE_PASSED')
  })

  it('allows prediction on a group-stage match (no confirmed-teams check)', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await PUT(makeRequest({ home_score: 3, away_score: 0 }), makeParams())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('success')
  })

  it('logs prediction_rejected_unconfirmed event when knockout match has unconfirmed teams', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ matchResult: { data: UNCONFIRMED_KNOCKOUT_MATCH, error: null } }) as never
    )
    await PUT(makeRequest({ home_score: 1, away_score: 0 }), makeParams())
    const loggedEvent = logSpy.mock.calls
      .map((args) => {
        try { return JSON.parse(args[0] as string) } catch { return null }
      })
      .find((obj) => obj?.event === 'prediction_rejected_unconfirmed')
    expect(loggedEvent).toBeTruthy()
    expect(loggedEvent?.match_id).toBe(MATCH_ID)
    expect(loggedEvent?.user_id).toBe(MOCK_USER.id)
    expect(loggedEvent?.status_code).toBe(409)
  })
})
