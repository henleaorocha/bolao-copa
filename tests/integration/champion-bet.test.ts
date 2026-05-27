/**
 * Integration tests for PUT /api/leagues/[id]/champion-bet.
 * Require a running local Supabase instance (supabase start) with SUPABASE_SERVICE_ROLE_KEY set.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestUser,
  deleteTestUser,
  signInTestUser,
  createTestLeague,
  addTestLeagueMember,
  adminClient,
} from '../fixtures/factories'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
const HAS_SERVICE_KEY = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

describe.skipIf(!HAS_SERVICE_KEY)('PUT /api/leagues/[id]/champion-bet', () => {
  let memberEmail: string
  let memberId: string
  let memberSession: any

  let nonMemberEmail: string
  let nonMemberId: string
  let nonMemberSession: any

  let testLeagueId: string

  beforeAll(async () => {
    memberEmail = `test-champion-bet-member-${Date.now()}@example.com`
    nonMemberEmail = `test-champion-bet-nonmember-${Date.now()}@example.com`

    const memberUser = await createTestUser(memberEmail)
    const nonMemberUser = await createTestUser(nonMemberEmail)

    memberId = memberUser.id
    nonMemberId = nonMemberUser.id

    const memberSess = await signInTestUser(memberEmail)
    const nonMemberSess = await signInTestUser(nonMemberEmail)

    memberSession = memberSess.session
    nonMemberSession = nonMemberSess.session

    // Create league and add member
    const league = await createTestLeague(`Champion Bet Test ${Date.now()}`, 'private', memberId)
    testLeagueId = league.id
    await addTestLeagueMember(testLeagueId, memberId, 'member')
  })

  afterAll(async () => {
    // Clean up any champion_bets rows first
    const admin = adminClient()
    await admin.from('champion_bets').delete().eq('league_id', testLeagueId)
    await deleteTestUser(memberId)
    await deleteTestUser(nonMemberId)
  })

  it('returns 401 SESSION_EXPIRED when no session', async () => {
    const res = await fetch(`${BASE_URL}/api/leagues/${testLeagueId}/champion-bet`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ champion_team: 'Brasil', runner_up_team: 'Argentina' }),
    })
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.code).toBe('SESSION_EXPIRED')
  })

  it('returns 403 NOT_A_MEMBER for non-member user', async () => {
    const res = await fetch(`${BASE_URL}/api/leagues/${testLeagueId}/champion-bet`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `sb-access-token=${nonMemberSession.access_token}`,
      },
      body: JSON.stringify({ champion_team: 'Brasil', runner_up_team: 'Argentina' }),
    })
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('NOT_A_MEMBER')
  })

  it('returns 400 INVALID_PARAMS when champion_team is missing', async () => {
    const res = await fetch(`${BASE_URL}/api/leagues/${testLeagueId}/champion-bet`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `sb-access-token=${memberSession.access_token}`,
      },
      body: JSON.stringify({ runner_up_team: 'Argentina' }),
    })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('INVALID_PARAMS')
  })

  it('returns 400 INVALID_TEAM for team name not in allowed list', async () => {
    const res = await fetch(`${BASE_URL}/api/leagues/${testLeagueId}/champion-bet`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `sb-access-token=${memberSession.access_token}`,
      },
      body: JSON.stringify({ champion_team: 'Germany', runner_up_team: 'Argentina' }),
    })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('INVALID_TEAM')
  })

  it('returns 400 SAME_TEAM when champion equals runner_up', async () => {
    const res = await fetch(`${BASE_URL}/api/leagues/${testLeagueId}/champion-bet`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `sb-access-token=${memberSession.access_token}`,
      },
      body: JSON.stringify({ champion_team: 'Brasil', runner_up_team: 'Brasil' }),
    })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('SAME_TEAM')
  })

  it('full round-trip: PUT returns 200 and row exists in champion_bets', async () => {
    const admin = adminClient()

    // Ensure no pre-existing bet
    await admin.from('champion_bets').delete().eq('user_id', memberId).eq('league_id', testLeagueId)

    const res = await fetch(`${BASE_URL}/api/leagues/${testLeagueId}/champion-bet`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `sb-access-token=${memberSession.access_token}`,
      },
      body: JSON.stringify({ champion_team: 'Brasil', runner_up_team: 'Argentina' }),
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('success')
    expect(json.data.champion_team).toBe('Brasil')
    expect(json.data.runner_up_team).toBe('Argentina')
    expect(json.data.user_id).toBe(memberId)
    expect(json.data.league_id).toBe(testLeagueId)

    // Verify DB row exists
    const { data: dbRow } = await admin
      .from('champion_bets')
      .select('*')
      .eq('user_id', memberId)
      .eq('league_id', testLeagueId)
      .single()

    expect(dbRow).not.toBeNull()
    expect(dbRow!.champion_team).toBe('Brasil')
    expect(dbRow!.runner_up_team).toBe('Argentina')
  })

  it('second PUT with different teams overwrites the first (upsert — no constraint violation)', async () => {
    const admin = adminClient()

    // Get the original updated_at
    const { data: firstRow } = await admin
      .from('champion_bets')
      .select('updated_at')
      .eq('user_id', memberId)
      .eq('league_id', testLeagueId)
      .single()

    // Small delay to ensure updated_at will differ
    await new Promise((r) => setTimeout(r, 10))

    const res = await fetch(`${BASE_URL}/api/leagues/${testLeagueId}/champion-bet`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `sb-access-token=${memberSession.access_token}`,
      },
      body: JSON.stringify({ champion_team: 'Alemanha', runner_up_team: 'França' }),
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.champion_team).toBe('Alemanha')
    expect(json.data.runner_up_team).toBe('França')

    // Verify exactly one row still exists (no duplicate)
    const { data: rows } = await admin
      .from('champion_bets')
      .select('*')
      .eq('user_id', memberId)
      .eq('league_id', testLeagueId)

    expect(rows).toHaveLength(1)
    expect(rows![0].champion_team).toBe('Alemanha')
    expect(rows![0].runner_up_team).toBe('França')

    // updated_at should have changed
    if (firstRow?.updated_at) {
      expect(rows![0].updated_at).not.toBe(firstRow.updated_at)
    }
  })
})
