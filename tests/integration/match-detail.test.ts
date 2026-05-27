/**
 * Integration tests for GET /api/leagues/[id]/matches/[matchId].
 * Uses a hybrid mock:
 * - auth.getUser() is mocked to return a real test user identity
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

import { GET } from '@/app/api/leagues/[id]/matches/[matchId]/route'
import { getSupabaseServerClient } from '@/lib/supabase/client'

const HAS_SERVICE_KEY = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

function makeRequest(leagueId: string, matchId: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/leagues/${leagueId}/matches/${matchId}`,
    { method: 'GET' }
  )
}

function makeParams(
  id: string,
  matchId: string
): { params: Promise<{ id: string; matchId: string }> } {
  return { params: Promise.resolve({ id, matchId }) }
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

describe.skipIf(!HAS_SERVICE_KEY)('GET /api/leagues/[id]/matches/[matchId] — integration', () => {
  let memberEmail: string
  let memberId: string
  let nonMemberEmail: string
  let nonMemberId: string
  let testLeagueId: string
  let otherLeagueId: string

  let otherMemberEmail: string
  let otherMemberId: string

  const insertedMatchIds: string[] = []

  beforeAll(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    memberEmail = `test-detail-member-${Date.now()}@example.com`
    nonMemberEmail = `test-detail-nonmember-${Date.now()}@example.com`
    otherMemberEmail = `test-detail-othermember-${Date.now()}@example.com`

    const memberUser = await createTestUser(memberEmail)
    const nonMemberUser = await createTestUser(nonMemberEmail)
    const otherMemberUser = await createTestUser(otherMemberEmail)
    memberId = memberUser.id
    nonMemberId = nonMemberUser.id
    otherMemberId = otherMemberUser.id

    const league = await createTestLeague(`Detail Test League ${Date.now()}`, 'private', memberId)
    testLeagueId = league.id
    await addTestLeagueMember(testLeagueId, memberId, 'admin')
    await addTestLeagueMember(testLeagueId, otherMemberId, 'member')

    const otherLeague = await createTestLeague(`Other League ${Date.now()}`, 'private', memberId)
    otherLeagueId = otherLeague.id
    await addTestLeagueMember(otherLeagueId, memberId, 'admin')
  })

  afterAll(async () => {
    vi.restoreAllMocks()

    const admin = adminClient()
    if (insertedMatchIds.length > 0) {
      await admin.from('predictions').delete().in('match_id', insertedMatchIds)
      await admin.from('matches').delete().in('id', insertedMatchIds)
    }
    await deleteTestUser(memberId)
    await deleteTestUser(nonMemberId)
    await deleteTestUser(otherMemberId)
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('GET after deadline with 3 seeded predictions returns correct distribution', async () => {
    // Use a past match (deadline already passed)
    const pastDate = new Date(Date.now() - 2 * 60 * 60 * 1000) // 2h ago
    const match = await createTestMatch('Brasil', 'Argentina', pastDate)
    insertedMatchIds.push(match.id)

    // Seed 3 predictions: 2 home wins, 1 draw
    const user2Email = `pred-user2-${Date.now()}@example.com`
    const user3Email = `pred-user3-${Date.now()}@example.com`
    const user2 = await createTestUser(user2Email)
    const user3 = await createTestUser(user3Email)
    await addTestLeagueMember(testLeagueId, user2.id, 'member')
    await addTestLeagueMember(testLeagueId, user3.id, 'member')

    await createTestPrediction(memberId, testLeagueId, match.id, 2, 1)     // home win
    await createTestPrediction(user2.id, testLeagueId, match.id, 3, 0)     // home win
    await createTestPrediction(user3.id, testLeagueId, match.id, 1, 1)     // draw

    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeAuthenticatedClient(memberId) as never
    )

    const res = await GET(makeRequest(testLeagueId, match.id), makeParams(testLeagueId, match.id))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('success')
    expect(json.data.is_deadline_passed).toBe(true)

    const dist = json.data.distribution
    expect(dist).not.toBeNull()
    expect(dist.total_predictions).toBe(3)
    // 2 home wins out of 3 ≈ 67%
    expect(dist.home_win).toBeGreaterThanOrEqual(66)
    expect(dist.home_win).toBeLessThanOrEqual(68)
    // 1 draw out of 3 ≈ 33%
    expect(dist.draw).toBeGreaterThanOrEqual(32)
    expect(dist.draw).toBeLessThanOrEqual(34)
    expect(dist.away_win).toBe(0)

    // Cleanup extra users
    await deleteTestUser(user2.id)
    await deleteTestUser(user3.id)
  })

  it('GET before deadline returns distribution: null for the same match', async () => {
    const futureDate = new Date(Date.now() + 3 * 60 * 60 * 1000) // 3h from now
    const match = await createTestMatch('França', 'Alemanha', futureDate)
    insertedMatchIds.push(match.id)

    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeAuthenticatedClient(memberId) as never
    )

    const res = await GET(makeRequest(testLeagueId, match.id), makeParams(testLeagueId, match.id))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.is_deadline_passed).toBe(false)
    expect(json.data.distribution).toBeNull()
  })

  it('distribution is scoped per-league: predictions from another league do not affect the count', async () => {
    const pastDate = new Date(Date.now() - 2 * 60 * 60 * 1000)
    const match = await createTestMatch('Espanha', 'Portugal', pastDate)
    insertedMatchIds.push(match.id)

    // Seed 1 prediction in the test league
    await createTestPrediction(memberId, testLeagueId, match.id, 1, 0) // home win

    // Seed 2 predictions in the OTHER league (should not be counted)
    const extraUserEmail = `pred-extra-${Date.now()}@example.com`
    const extraUser = await createTestUser(extraUserEmail)
    await addTestLeagueMember(otherLeagueId, extraUser.id, 'member')

    await createTestPrediction(extraUser.id, otherLeagueId, match.id, 0, 1) // away win
    await createTestPrediction(memberId, otherLeagueId, match.id, 1, 1)     // draw

    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeAuthenticatedClient(memberId) as never
    )

    const res = await GET(makeRequest(testLeagueId, match.id), makeParams(testLeagueId, match.id))
    expect(res.status).toBe(200)
    const json = await res.json()

    const dist = json.data.distribution
    expect(dist).not.toBeNull()
    // Only 1 prediction scoped to testLeagueId
    expect(dist.total_predictions).toBe(1)
    expect(dist.home_win).toBe(100)
    expect(dist.draw).toBe(0)
    expect(dist.away_win).toBe(0)

    await deleteTestUser(extraUser.id)
  })

  it('returns 403 NOT_A_MEMBER for a user not in the league', async () => {
    const match = await createTestMatch('Itália', 'Croácia', new Date('2026-06-20T14:00:00Z'))
    insertedMatchIds.push(match.id)

    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeAuthenticatedClient(nonMemberId) as never
    )

    const res = await GET(makeRequest(testLeagueId, match.id), makeParams(testLeagueId, match.id))
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('NOT_A_MEMBER')
  })

  it('returns embedded prediction when the user has already bet', async () => {
    const futureDate = new Date(Date.now() + 5 * 60 * 60 * 1000)
    const match = await createTestMatch('Holanda', 'Senegal', futureDate)
    insertedMatchIds.push(match.id)

    await createTestPrediction(memberId, testLeagueId, match.id, 2, 0)

    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeAuthenticatedClient(memberId) as never
    )

    const res = await GET(makeRequest(testLeagueId, match.id), makeParams(testLeagueId, match.id))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.prediction).not.toBeNull()
    expect(json.data.prediction.predicted_home_score).toBe(2)
    expect(json.data.prediction.predicted_away_score).toBe(0)
  })
})
