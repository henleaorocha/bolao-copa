/**
 * Integration tests for PUT /api/leagues/[id]/predictions/[matchId].
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
} from '../fixtures/factories'

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseServerClient: vi.fn(),
}))

import { PUT } from '@/app/api/leagues/[id]/predictions/[matchId]/route'
import { getSupabaseServerClient } from '@/lib/supabase/client'

const HAS_SERVICE_KEY = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

function makeRequest(leagueId: string, matchId: string, body: object): NextRequest {
  return new NextRequest(
    `http://localhost/api/leagues/${leagueId}/predictions/${matchId}`,
    {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }
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

describe.skipIf(!HAS_SERVICE_KEY)('PUT /api/leagues/[id]/predictions/[matchId] — integration', () => {
  let userAEmail: string
  let userAId: string
  let userBEmail: string
  let userBId: string
  let testLeagueId: string

  const insertedMatchIds: string[] = []

  beforeAll(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    userAEmail = `test-pred-a-${Date.now()}@example.com`
    userBEmail = `test-pred-b-${Date.now()}@example.com`

    const userA = await createTestUser(userAEmail)
    const userB = await createTestUser(userBEmail)
    userAId = userA.id
    userBId = userB.id

    const league = await createTestLeague(`Predictions Test League ${Date.now()}`, 'private', userAId)
    testLeagueId = league.id

    await addTestLeagueMember(testLeagueId, userAId, 'admin')
    await addTestLeagueMember(testLeagueId, userBId, 'member')
  })

  afterAll(async () => {
    vi.restoreAllMocks()

    const admin = adminClient()
    if (insertedMatchIds.length > 0) {
      await admin.from('predictions').delete().in('match_id', insertedMatchIds)
      await admin.from('matches').delete().in('id', insertedMatchIds)
    }
    await deleteTestUser(userAId)
    await deleteTestUser(userBId)
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('inserts a new prediction row; second PUT updates the same row (idempotent upsert)', async () => {
    const futureDate = new Date(Date.now() + 3 * 60 * 60 * 1000) // 3h from now
    const match = await createTestMatch('Brasil', 'Argentina', futureDate)
    insertedMatchIds.push(match.id)

    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeAuthenticatedClient(userAId) as never
    )

    // First PUT — insert
    const res1 = await PUT(
      makeRequest(testLeagueId, match.id, { home_score: 2, away_score: 1 }),
      makeParams(testLeagueId, match.id)
    )
    expect(res1.status).toBe(200)
    const json1 = await res1.json()
    expect(json1.status).toBe('success')
    expect(json1.data.predicted_home_score).toBe(2)
    expect(json1.data.predicted_away_score).toBe(1)
    const firstUpdatedAt = json1.data.updated_at

    // Verify exactly 1 row exists
    const admin = adminClient()
    const { data: rows1 } = await admin
      .from('predictions')
      .select('id')
      .eq('user_id', userAId)
      .eq('league_id', testLeagueId)
      .eq('match_id', match.id)
    expect(rows1?.length).toBe(1)

    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeAuthenticatedClient(userAId) as never
    )

    // Second PUT — update (different scores)
    const res2 = await PUT(
      makeRequest(testLeagueId, match.id, { home_score: 3, away_score: 0 }),
      makeParams(testLeagueId, match.id)
    )
    expect(res2.status).toBe(200)
    const json2 = await res2.json()
    expect(json2.data.predicted_home_score).toBe(3)
    expect(json2.data.predicted_away_score).toBe(0)

    // Still exactly 1 row — upsert did not duplicate
    const { data: rows2 } = await admin
      .from('predictions')
      .select('id, predicted_home_score, predicted_away_score, updated_at')
      .eq('user_id', userAId)
      .eq('league_id', testLeagueId)
      .eq('match_id', match.id)
    expect(rows2?.length).toBe(1)
    expect(rows2?.[0].predicted_home_score).toBe(3)
    expect(rows2?.[0].predicted_away_score).toBe(0)
    // updated_at must have changed
    expect(rows2?.[0].updated_at).not.toBe(firstUpdatedAt)
  })

  it('returns 403 DEADLINE_PASSED for a match past deadline (within 1h of kickoff)', async () => {
    // Match 30 minutes from now — deadline (match_date - 1h) is already past
    const nearDate = new Date(Date.now() + 30 * 60 * 1000)
    const match = await createTestMatch('França', 'Alemanha', nearDate)
    insertedMatchIds.push(match.id)

    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeAuthenticatedClient(userAId) as never
    )

    const res = await PUT(
      makeRequest(testLeagueId, match.id, { home_score: 1, away_score: 1 }),
      makeParams(testLeagueId, match.id)
    )
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('DEADLINE_PASSED')
  })

  it('predictions from user A and user B in the same league are isolated by user_id', async () => {
    const futureDate = new Date(Date.now() + 4 * 60 * 60 * 1000) // 4h from now
    const match = await createTestMatch('Espanha', 'Portugal', futureDate)
    insertedMatchIds.push(match.id)

    // User A bets
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeAuthenticatedClient(userAId) as never
    )
    const resA = await PUT(
      makeRequest(testLeagueId, match.id, { home_score: 2, away_score: 0 }),
      makeParams(testLeagueId, match.id)
    )
    expect(resA.status).toBe(200)

    // User B bets
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeAuthenticatedClient(userBId) as never
    )
    const resB = await PUT(
      makeRequest(testLeagueId, match.id, { home_score: 0, away_score: 3 }),
      makeParams(testLeagueId, match.id)
    )
    expect(resB.status).toBe(200)

    // Verify isolation: 2 separate rows, one per user
    const admin = adminClient()
    const { data: allRows } = await admin
      .from('predictions')
      .select('user_id, predicted_home_score, predicted_away_score')
      .eq('league_id', testLeagueId)
      .eq('match_id', match.id)
      .order('user_id')

    expect(allRows?.length).toBe(2)

    const rowA = allRows?.find((r) => r.user_id === userAId)
    const rowB = allRows?.find((r) => r.user_id === userBId)

    expect(rowA?.predicted_home_score).toBe(2)
    expect(rowA?.predicted_away_score).toBe(0)
    expect(rowB?.predicted_home_score).toBe(0)
    expect(rowB?.predicted_away_score).toBe(3)

    // User A updating their bet does NOT affect user B
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeAuthenticatedClient(userAId) as never
    )
    const resA2 = await PUT(
      makeRequest(testLeagueId, match.id, { home_score: 1, away_score: 1 }),
      makeParams(testLeagueId, match.id)
    )
    expect(resA2.status).toBe(200)

    const { data: afterUpdate } = await admin
      .from('predictions')
      .select('user_id, predicted_home_score, predicted_away_score')
      .eq('league_id', testLeagueId)
      .eq('match_id', match.id)

    expect(afterUpdate?.length).toBe(2)
    const rowAAfter = afterUpdate?.find((r) => r.user_id === userAId)
    const rowBAfter = afterUpdate?.find((r) => r.user_id === userBId)
    expect(rowAAfter?.predicted_home_score).toBe(1)
    expect(rowAAfter?.predicted_away_score).toBe(1)
    // User B unchanged
    expect(rowBAfter?.predicted_home_score).toBe(0)
    expect(rowBAfter?.predicted_away_score).toBe(3)
  })
})
