/**
 * Integration tests for GET, PATCH, DELETE /api/leagues/[id].
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

describe.skipIf(!HAS_SERVICE_KEY)('League detail endpoints (GET, PATCH, DELETE)', () => {
  let adminEmail: string
  let adminId: string
  let adminSession: any

  let memberEmail: string
  let memberId: string
  let memberSession: any

  let nonMemberEmail: string
  let nonMemberId: string
  let nonMemberSession: any

  let testLeagueId: string
  let testLeagueName: string

  beforeAll(async () => {
    // Create test users
    adminEmail = `test-league-detail-admin-${Date.now()}@example.com`
    memberEmail = `test-league-detail-member-${Date.now()}@example.com`
    nonMemberEmail = `test-league-detail-non-member-${Date.now()}@example.com`

    const adminUser = await createTestUser(adminEmail)
    const memberUser = await createTestUser(memberEmail)
    const nonMemberUser = await createTestUser(nonMemberEmail)

    adminId = adminUser.id
    memberId = memberUser.id
    nonMemberId = nonMemberUser.id

    const adminSess = await signInTestUser(adminEmail)
    const memberSess = await signInTestUser(memberEmail)
    const nonMemberSess = await signInTestUser(nonMemberEmail)

    adminSession = adminSess.session
    memberSession = memberSess.session
    nonMemberSession = nonMemberSess.session

    // Create test league
    testLeagueName = `Test League ${Date.now()}`
    const league = await createTestLeague(testLeagueName, 'private', adminId)
    testLeagueId = league.id

    // Add member to league
    await addTestLeagueMember(testLeagueId, memberId, 'member')
  })

  afterAll(async () => {
    await deleteTestUser(adminId)
    await deleteTestUser(memberId)
    await deleteTestUser(nonMemberId)
  })

  describe('GET /api/leagues/[id]', () => {
    it('returns 401 SESSION_EXPIRED when no session', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues/${testLeagueId}`)
      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.code).toBe('SESSION_EXPIRED')
    })

    it('returns 403 NOT_A_MEMBER for non-member', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues/${testLeagueId}`, {
        headers: { Cookie: `sb-access-token=${nonMemberSession.access_token}` },
      })
      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.code).toBe('NOT_A_MEMBER')
    })

    it('returns 404 LEAGUE_NOT_FOUND for non-existent league', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const res = await fetch(`${BASE_URL}/api/leagues/${fakeId}`, {
        headers: { Cookie: `sb-access-token=${adminSession.access_token}` },
      })
      expect(res.status).toBe(404)
      const json = await res.json()
      expect(json.code).toBe('LEAGUE_NOT_FOUND')
    })

    it('returns LeagueDetail with members for valid member', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues/${testLeagueId}`, {
        headers: { Cookie: `sb-access-token=${adminSession.access_token}` },
      })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.status).toBe('success')
      expect(json.data).toHaveProperty('id')
      expect(json.data).toHaveProperty('name')
      expect(json.data.name).toBe(testLeagueName)
      expect(json.data).toHaveProperty('access_type')
      expect(json.data).toHaveProperty('logo_url')
      expect(json.data).toHaveProperty('role')
      expect(json.data).toHaveProperty('member_count')
      expect(json.data).toHaveProperty('description')
      expect(json.data).toHaveProperty('created_by')
      expect(json.data).toHaveProperty('created_at')
      expect(json.data).toHaveProperty('members')
      expect(Array.isArray(json.data.members)).toBe(true)
    })

    it('does not return invite_token in response', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues/${testLeagueId}`, {
        headers: { Cookie: `sb-access-token=${adminSession.access_token}` },
      })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data).not.toHaveProperty('invite_token')
    })

    it('returns members array with correct structure', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues/${testLeagueId}`, {
        headers: { Cookie: `sb-access-token=${adminSession.access_token}` },
      })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data.members.length).toBeGreaterThan(0)

      const member = json.data.members[0]
      expect(member).toHaveProperty('user_id')
      expect(member).toHaveProperty('full_name')
      expect(member).toHaveProperty('avatar_url')
      expect(member).toHaveProperty('avatar_color')
      expect(member).toHaveProperty('role')
      expect(member).toHaveProperty('joined_at')
    })

    it('member can access league details', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues/${testLeagueId}`, {
        headers: { Cookie: `sb-access-token=${memberSession.access_token}` },
      })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.status).toBe('success')
      expect(json.data.id).toBe(testLeagueId)
    })

    it('returns prizes, user_stats, and ranking fields in the response', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues/${testLeagueId}`, {
        headers: { Cookie: `sb-access-token=${adminSession.access_token}` },
      })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.status).toBe('success')

      // prizes: present and null or string
      expect(json.data).toHaveProperty('prizes')
      expect(json.data.prizes === null || typeof json.data.prizes === 'string').toBe(true)

      // user_stats: stub zeros
      expect(json.data).toHaveProperty('user_stats')
      expect(json.data.user_stats).toEqual({
        position: 0,
        points: 0,
        guesses_made: 0,
        guesses_total: 0,
        exact_scores: 0,
      })

      // ranking: array, ≤5 entries, each with points: 0 and 1-based position
      expect(json.data).toHaveProperty('ranking')
      expect(Array.isArray(json.data.ranking)).toBe(true)
      expect(json.data.ranking.length).toBeLessThanOrEqual(5)
      json.data.ranking.forEach((entry: { points: number; position: number }, i: number) => {
        expect(entry.points).toBe(0)
        expect(entry.position).toBe(i + 1)
      })
    })

    it('returns has_champion_bet: false when no champion bet exists for the user', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues/${testLeagueId}`, {
        headers: { Cookie: `sb-access-token=${adminSession.access_token}` },
      })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data).toHaveProperty('has_champion_bet')
      expect(json.data.has_champion_bet).toBe(false)
    })

    it('returns has_champion_bet: true after inserting a champion bet row', async () => {
      const admin = adminClient()
      await admin.from('champion_bets').insert({
        user_id: adminId,
        league_id: testLeagueId,
        champion_team: 'Brasil',
        runner_up_team: 'Argentina',
      })

      try {
        const res = await fetch(`${BASE_URL}/api/leagues/${testLeagueId}`, {
          headers: { Cookie: `sb-access-token=${adminSession.access_token}` },
        })
        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.data.has_champion_bet).toBe(true)
      } finally {
        await admin
          .from('champion_bets')
          .delete()
          .eq('user_id', adminId)
          .eq('league_id', testLeagueId)
      }
    })
  })

  describe('PATCH /api/leagues/[id]', () => {
    it('returns 401 SESSION_EXPIRED when no session', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues/${testLeagueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Name' }),
      })
      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.code).toBe('SESSION_EXPIRED')
    })

    it('returns 403 NOT_ADMIN for non-admin member', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues/${testLeagueId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${memberSession.access_token}`,
        },
        body: JSON.stringify({ name: 'New Name' }),
      })
      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.code).toBe('NOT_ADMIN')
    })

    it('returns 403 NOT_ADMIN for non-member', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues/${testLeagueId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${nonMemberSession.access_token}`,
        },
        body: JSON.stringify({ name: 'New Name' }),
      })
      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.code).toBe('NOT_ADMIN')
    })

    it('returns 400 INVALID_BODY for name too short', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues/${testLeagueId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${adminSession.access_token}`,
        },
        body: JSON.stringify({ name: 'A' }),
      })
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.code).toBe('INVALID_BODY')
    })

    it('returns 400 INVALID_BODY for name too long', async () => {
      const longName = 'A'.repeat(51)
      const res = await fetch(`${BASE_URL}/api/leagues/${testLeagueId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${adminSession.access_token}`,
        },
        body: JSON.stringify({ name: longName }),
      })
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.code).toBe('INVALID_BODY')
    })

    it('returns 400 INVALID_BODY for invalid access_type', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues/${testLeagueId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${adminSession.access_token}`,
        },
        body: JSON.stringify({ access_type: 'invalid' }),
      })
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.code).toBe('INVALID_BODY')
    })

    it('admin can update league name', async () => {
      const newName = `Updated League ${Date.now()}`
      const res = await fetch(`${BASE_URL}/api/leagues/${testLeagueId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${adminSession.access_token}`,
        },
        body: JSON.stringify({ name: newName }),
      })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.status).toBe('success')
      expect(json.data.name).toBe(newName)
      expect(json.data).not.toHaveProperty('invite_token')

      // Verify in database
      const verifyRes = await fetch(`${BASE_URL}/api/leagues/${testLeagueId}`, {
        headers: { Cookie: `sb-access-token=${adminSession.access_token}` },
      })
      const verifyJson = await verifyRes.json()
      expect(verifyJson.data.name).toBe(newName)
    })

    it('admin can update access_type', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues/${testLeagueId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${adminSession.access_token}`,
        },
        body: JSON.stringify({ access_type: 'open' }),
      })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.status).toBe('success')
      expect(json.data.access_type).toBe('open')
    })

    it('admin can update both name and access_type', async () => {
      const newName = `Both Updated ${Date.now()}`
      const res = await fetch(`${BASE_URL}/api/leagues/${testLeagueId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${adminSession.access_token}`,
        },
        body: JSON.stringify({ name: newName, access_type: 'private' }),
      })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.status).toBe('success')
      expect(json.data.name).toBe(newName)
      expect(json.data.access_type).toBe('private')
    })

    it('returns 404 LEAGUE_NOT_FOUND for non-existent league', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const res = await fetch(`${BASE_URL}/api/leagues/${fakeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${adminSession.access_token}`,
        },
        body: JSON.stringify({ name: 'New Name' }),
      })
      expect(res.status).toBe(404)
      const json = await res.json()
      expect(json.code).toBe('LEAGUE_NOT_FOUND')
    })
  })

  describe('DELETE /api/leagues/[id]', () => {
    let deleteTestLeagueId: string
    let deleteTestLeagueName: string

    beforeAll(async () => {
      const league = await createTestLeague(`Delete Test ${Date.now()}`, 'private', adminId)
      deleteTestLeagueId = league.id
      deleteTestLeagueName = league.name
      await addTestLeagueMember(deleteTestLeagueId, memberId, 'member')
    })

    it('returns 401 SESSION_EXPIRED when no session', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues/${deleteTestLeagueId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm_name: deleteTestLeagueName }),
      })
      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.code).toBe('SESSION_EXPIRED')
    })

    it('returns 403 NOT_ADMIN for non-admin member', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues/${deleteTestLeagueId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${memberSession.access_token}`,
        },
        body: JSON.stringify({ confirm_name: deleteTestLeagueName }),
      })
      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.code).toBe('NOT_ADMIN')
    })

    it('returns 400 CONFIRM_NAME_MISMATCH for wrong name', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues/${deleteTestLeagueId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${adminSession.access_token}`,
        },
        body: JSON.stringify({ confirm_name: 'Wrong Name' }),
      })
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.code).toBe('CONFIRM_NAME_MISMATCH')

      // Verify league still exists
      const verifyRes = await fetch(`${BASE_URL}/api/leagues/${deleteTestLeagueId}`, {
        headers: { Cookie: `sb-access-token=${adminSession.access_token}` },
      })
      expect(verifyRes.status).toBe(200)
    })

    it('admin can delete league with correct confirm_name', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues/${deleteTestLeagueId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${adminSession.access_token}`,
        },
        body: JSON.stringify({ confirm_name: deleteTestLeagueName }),
      })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.status).toBe('success')
      expect(json.data.ok).toBe(true)
    })

    it('cascades to delete league_members', async () => {
      // Create a new league for this test
      const league = await createTestLeague(`Cascade Test ${Date.now()}`, 'private', adminId)
      const cascadeTestId = league.id
      const cascadeName = league.name
      await addTestLeagueMember(cascadeTestId, memberId, 'member')

      // Delete the league
      const deleteRes = await fetch(`${BASE_URL}/api/leagues/${cascadeTestId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${adminSession.access_token}`,
        },
        body: JSON.stringify({ confirm_name: cascadeName }),
      })
      expect(deleteRes.status).toBe(200)

      // Verify league_members are deleted
      const admin = await adminClient()
      const membersResult = await admin
        .from('league_members')
        .select('id')
        .eq('league_id', cascadeTestId)

      expect(membersResult.data?.length ?? 0).toBe(0)
    })

    it('cascades to set active_league_id to NULL', async () => {
      // Create a new league for this test
      const league = await createTestLeague(`Cascade Active Test ${Date.now()}`, 'private', memberId)
      const cascadeTestId = league.id
      const cascadeName = league.name

      // Set as active league for member
      const setActiveRes = await fetch(`${BASE_URL}/api/auth/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${memberSession.access_token}`,
        },
        body: JSON.stringify({ active_league_id: cascadeTestId }),
      })
      expect(setActiveRes.status).toBe(200)

      // Delete the league as admin (member)
      const deleteRes = await fetch(`${BASE_URL}/api/leagues/${cascadeTestId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${memberSession.access_token}`,
        },
        body: JSON.stringify({ confirm_name: cascadeName }),
      })
      expect(deleteRes.status).toBe(200)

      // Verify active_league_id is NULL
      const admin = await adminClient()
      const userResult = await admin
        .from('users')
        .select('active_league_id')
        .eq('id', memberId)
        .single()

      expect(userResult.data?.active_league_id).toBeNull()
    })

    it('returns 404 LEAGUE_NOT_FOUND for non-existent league', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const res = await fetch(`${BASE_URL}/api/leagues/${fakeId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${adminSession.access_token}`,
        },
        body: JSON.stringify({ confirm_name: 'Some Name' }),
      })
      expect(res.status).toBe(404)
      const json = await res.json()
      expect(json.code).toBe('LEAGUE_NOT_FOUND')
    })
  })
})
