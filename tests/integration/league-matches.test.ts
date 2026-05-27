/**
 * Integration tests for GET /api/leagues/[id]/matches.
 * Imports the route handler directly and uses a hybrid mock:
 * - auth.getUser() is mocked to return a real test user
 * - from() delegates to a real service-role Supabase client
 * Requires a running local Supabase instance with SUPABASE_SERVICE_ROLE_KEY set.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import {
  adminClient,
  createTestUser,
  deleteTestUser,
  createTestLeague,
  addTestLeagueMember,
  createTestMatch,
  createTestPrediction,
} from '../fixtures/factories'

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseServerClient: vi.fn(),
}))

import { GET } from '@/app/api/leagues/[id]/matches/route'
import { getSupabaseServerClient } from '@/lib/supabase/client'

const HAS_SERVICE_KEY = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

function makeRequest(leagueId: string, query = ''): NextRequest {
  return new NextRequest(`http://localhost/api/leagues/${leagueId}/matches${query}`, { method: 'GET' })
}

function makeParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

function makeAuthenticatedClient(userId: string) {
  const service = adminClient()
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
    from: service.from.bind(service),
  }
}

describe.skipIf(!HAS_SERVICE_KEY)('GET /api/leagues/[id]/matches — integration', () => {
  let memberEmail: string
  let memberId: string
  let nonMemberEmail: string
  let nonMemberId: string
  let testLeagueId: string

  const insertedMatchIds: string[] = []

  beforeAll(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    memberEmail = `test-matches-member-${Date.now()}@example.com`
    nonMemberEmail = `test-matches-nonmember-${Date.now()}@example.com`

    const memberUser = await createTestUser(memberEmail)
    const nonMemberUser = await createTestUser(nonMemberEmail)
    memberId = memberUser.id
    nonMemberId = nonMemberUser.id

    const league = await createTestLeague(`Matches Test League ${Date.now()}`, 'private', memberId)
    testLeagueId = league.id

    await addTestLeagueMember(testLeagueId, memberId, 'admin')
  })

  afterAll(async () => {
    vi.restoreAllMocks()

    const admin = adminClient()
    if (insertedMatchIds.length > 0) {
      await admin.from('matches').delete().in('id', insertedMatchIds)
    }
    await deleteTestUser(memberId)
    await deleteTestUser(nonMemberId)
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with all 4 seeded matches and 2 with non-null predictions', async () => {
    // Seed 4 matches
    const m1 = await createTestMatch('Brasil', 'Argentina', new Date('2026-06-15T14:00:00Z'))
    const m2 = await createTestMatch('França', 'Alemanha', new Date('2026-06-16T14:00:00Z'))
    const m3 = await createTestMatch('Espanha', 'Portugal', new Date('2026-06-17T14:00:00Z'))
    const m4 = await createTestMatch('Itália', 'Croácia', new Date('2026-06-18T14:00:00Z'))
    insertedMatchIds.push(m1.id, m2.id, m3.id, m4.id)

    // Seed 2 predictions for the member user
    await createTestPrediction(memberId, testLeagueId, m1.id, 2, 1)
    await createTestPrediction(memberId, testLeagueId, m2.id, 0, 0)

    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeAuthenticatedClient(memberId) as never
    )

    const res = await GET(makeRequest(testLeagueId), makeParams(testLeagueId))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('success')

    // All 4 matches must be present (plus any previously inserted from other tests)
    const returnedIds = json.data.matches.map((m: { id: string }) => m.id)
    expect(returnedIds).toContain(m1.id)
    expect(returnedIds).toContain(m2.id)
    expect(returnedIds).toContain(m3.id)
    expect(returnedIds).toContain(m4.id)

    const r1 = json.data.matches.find((m: { id: string }) => m.id === m1.id)
    const r2 = json.data.matches.find((m: { id: string }) => m.id === m2.id)
    const r3 = json.data.matches.find((m: { id: string }) => m.id === m3.id)
    const r4 = json.data.matches.find((m: { id: string }) => m.id === m4.id)

    expect(r1.prediction).not.toBeNull()
    expect(r1.prediction.predicted_home_score).toBe(2)
    expect(r1.prediction.predicted_away_score).toBe(1)
    expect(r2.prediction).not.toBeNull()
    expect(r2.prediction.predicted_home_score).toBe(0)
    expect(r3.prediction).toBeNull()
    expect(r4.prediction).toBeNull()
  })

  it('returns exactly 2 matches (earliest by date) with ?next=2', async () => {
    const matches = await Promise.all([
      createTestMatch('TeamA', 'TeamB', new Date('2026-07-01T10:00:00Z')),
      createTestMatch('TeamC', 'TeamD', new Date('2026-07-02T10:00:00Z')),
      createTestMatch('TeamE', 'TeamF', new Date('2026-07-03T10:00:00Z')),
      createTestMatch('TeamG', 'TeamH', new Date('2026-07-04T10:00:00Z')),
    ])
    const ids = matches.map((m) => m.id)
    insertedMatchIds.push(...ids)

    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeAuthenticatedClient(memberId) as never
    )

    const res = await GET(makeRequest(testLeagueId, '?next=2'), makeParams(testLeagueId))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.matches).toHaveLength(2)
    expect(json.data.total).toBe(2)

    // Verify ordering: first match has earlier date than second
    const dates = json.data.matches.map((m: { match_date: string }) => new Date(m.match_date).getTime())
    expect(dates[0]).toBeLessThanOrEqual(dates[1])
  })

  it('returns 403 NOT_A_MEMBER for a user not in the league', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeAuthenticatedClient(nonMemberId) as never
    )

    const res = await GET(makeRequest(testLeagueId), makeParams(testLeagueId))
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('NOT_A_MEMBER')
  })
})
