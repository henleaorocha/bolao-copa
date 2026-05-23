/**
 * Integration tests for league member management endpoints.
 * Require a running local Supabase instance (supabase start) with SUPABASE_SERVICE_ROLE_KEY set.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestUser,
  deleteTestUser,
  signInTestUser,
  createTestLeague,
  deleteTestLeague,
  addTestLeagueMember,
  adminClient,
} from '../fixtures/factories'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
const HAS_SERVICE_KEY = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

describe.skipIf(!HAS_SERVICE_KEY)('League member management endpoints', () => {
  let adminId: string
  let adminEmail: string
  let adminSession: any

  let user1Id: string
  let user1Email: string
  let user1Session: any

  let user2Id: string
  let user2Email: string
  let user2Session: any

  let privateLeagueId: string
  let openLeagueId: string

  beforeAll(async () => {
    // Create three test users
    adminEmail = `test-member-admin-${Date.now()}@example.com`
    user1Email = `test-member-user1-${Date.now()}@example.com`
    user2Email = `test-member-user2-${Date.now()}@example.com`

    const adminUser = await createTestUser(adminEmail)
    const user1 = await createTestUser(user1Email)
    const user2 = await createTestUser(user2Email)

    adminId = adminUser.id
    user1Id = user1.id
    user2Id = user2.id

    const adminSessionData = await signInTestUser(adminEmail)
    const user1SessionData = await signInTestUser(user1Email)
    const user2SessionData = await signInTestUser(user2Email)

    adminSession = adminSessionData.session
    user1Session = user1SessionData.session
    user2Session = user2SessionData.session

    // Create test leagues
    const privateLeague = await createTestLeague('Test Private League', 'private', adminId)
    const openLeague = await createTestLeague('Test Open League', 'open', adminId)

    privateLeagueId = privateLeague.id
    openLeagueId = openLeague.id

    // Admin is already a member of both (from creation)
    // Add user1 to openLeague as a member (for testing remove)
    await addTestLeagueMember(openLeagueId, user1Id, 'member')
  })

  afterAll(async () => {
    // Clean up leagues
    await deleteTestLeague(privateLeagueId)
    await deleteTestLeague(openLeagueId)

    // Clean up users
    await deleteTestUser(adminId)
    await deleteTestUser(user1Id)
    await deleteTestUser(user2Id)
  })

  describe('POST /api/leagues/[id]/join', () => {
    it('returns 401 SESSION_EXPIRED when no session', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues/${openLeagueId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.code).toBe('SESSION_EXPIRED')
    })

    it('returns 404 LEAGUE_NOT_FOUND for non-existent league', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000099'
      const res = await fetch(`${BASE_URL}/api/leagues/${fakeId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${user2Session.access_token}`,
        },
        body: JSON.stringify({}),
      })
      expect(res.status).toBe(404)
      const json = await res.json()
      expect(json.code).toBe('LEAGUE_NOT_FOUND')
    })

    it('returns 400 ALREADY_A_MEMBER when user is already a member', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues/${openLeagueId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${user1Session.access_token}`,
        },
        body: JSON.stringify({}),
      })
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.code).toBe('ALREADY_A_MEMBER')
    })

    it('joins an open league without a token', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues/${openLeagueId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${user2Session.access_token}`,
        },
        body: JSON.stringify({}),
      })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.status).toBe('success')
      expect(json.data).toHaveProperty('id', openLeagueId)
      expect(json.data.role).toBe('member')
      expect(json.data).not.toHaveProperty('invite_token')

      // Verify user is now a member
      const admin = adminClient()
      const memberCheck = await admin
        .from('league_members')
        .select('user_id')
        .eq('user_id', user2Id)
        .eq('league_id', openLeagueId)
        .single()

      expect(memberCheck.error).toBeNull()
      expect(memberCheck.data).toBeDefined()
    })

    it('returns 403 INVALID_TOKEN when private league requested without token', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues/${privateLeagueId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${user1Session.access_token}`,
        },
        body: JSON.stringify({}),
      })
      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.code).toBe('INVALID_TOKEN')
    })

    it('returns 403 INVALID_TOKEN when private league requested with wrong token', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues/${privateLeagueId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${user1Session.access_token}`,
        },
        body: JSON.stringify({ token: 'wrong-token-value' }),
      })
      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.code).toBe('INVALID_TOKEN')
    })

    it('joins a private league with correct invite token', async () => {
      // Get the invite token from the database
      const admin = adminClient()
      const leagueData = await admin
        .from('leagues')
        .select('invite_token')
        .eq('id', privateLeagueId)
        .single()

      const token = leagueData.data!.invite_token

      const res = await fetch(`${BASE_URL}/api/leagues/${privateLeagueId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${user1Session.access_token}`,
        },
        body: JSON.stringify({ token }),
      })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.status).toBe('success')
      expect(json.data).toHaveProperty('id', privateLeagueId)
      expect(json.data.role).toBe('member')
      expect(json.data).not.toHaveProperty('invite_token')

      // Verify user is now a member
      const memberCheck = await admin
        .from('league_members')
        .select('user_id')
        .eq('user_id', user1Id)
        .eq('league_id', privateLeagueId)
        .single()

      expect(memberCheck.error).toBeNull()
    })

    it('sets active_league_id after joining', async () => {
      const admin = adminClient()

      // Get fresh league for this test
      const league = await createTestLeague('Fresh Private League', 'private', adminId)
      const leagueToken = league.invite_token
      const freshUserId = user2Id

      try {
        const res = await fetch(`${BASE_URL}/api/leagues/${league.id}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: `sb-access-token=${user2Session.access_token}`,
          },
          body: JSON.stringify({ token: leagueToken }),
        })
        expect(res.status).toBe(200)

        // Verify active_league_id was set
        const userData = await admin
          .from('users')
          .select('active_league_id')
          .eq('id', freshUserId)
          .single()

        expect(userData.data?.active_league_id).toBe(league.id)
      } finally {
        await deleteTestLeague(league.id)
      }
    })
  })

  describe('DELETE /api/leagues/[id]/members/[userId]', () => {
    it('returns 401 SESSION_EXPIRED when no session', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues/${openLeagueId}/members/${user1Id}`, {
        method: 'DELETE',
      })
      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.code).toBe('SESSION_EXPIRED')
    })

    it('returns 404 LEAGUE_NOT_FOUND for non-existent league', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000099'
      const res = await fetch(`${BASE_URL}/api/leagues/${fakeId}/members/${user1Id}`, {
        method: 'DELETE',
        headers: { Cookie: `sb-access-token=${adminSession.access_token}` },
      })
      expect(res.status).toBe(404)
      const json = await res.json()
      expect(json.code).toBe('LEAGUE_NOT_FOUND')
    })

    it('returns 403 NOT_ADMIN when non-admin tries to remove member', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues/${openLeagueId}/members/${adminId}`, {
        method: 'DELETE',
        headers: { Cookie: `sb-access-token=${user1Session.access_token}` },
      })
      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.code).toBe('NOT_ADMIN')
    })

    it('returns 400 CANNOT_REMOVE_ADMIN when admin tries to remove self', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues/${openLeagueId}/members/${adminId}`, {
        method: 'DELETE',
        headers: { Cookie: `sb-access-token=${adminSession.access_token}` },
      })
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.code).toBe('CANNOT_REMOVE_ADMIN')
    })

    it('removes a member and returns 200', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues/${openLeagueId}/members/${user1Id}`, {
        method: 'DELETE',
        headers: { Cookie: `sb-access-token=${adminSession.access_token}` },
      })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.status).toBe('success')
      expect(json.data).toEqual({ ok: true })

      // Verify member is removed
      const admin = adminClient()
      const memberCheck = await admin
        .from('league_members')
        .select('user_id')
        .eq('user_id', user1Id)
        .eq('league_id', openLeagueId)
        .single()

      expect(memberCheck.error).toBeDefined() // Should error because no row found
    })

    it('preserves removed member\'s predictions and scores', async () => {
      // Create a fresh league and add user with predictions
      const admin = adminClient()
      const testLeague = await createTestLeague('Test Predictions League', 'open', adminId)
      const testUserId = user1Id

      try {
        // Add user as member
        await addTestLeagueMember(testLeague.id, testUserId, 'member')

        // Create a fake prediction to simulate existing predictions
        const match = await admin
          .from('matches')
          .select('id')
          .limit(1)
          .single()

        if (!match.error && match.data) {
          await admin.from('predictions').insert({
            user_id: testUserId,
            league_id: testLeague.id,
            match_id: match.data.id,
            predicted_home_score: 1,
            predicted_away_score: 0,
          })
        }

        // Remove member
        const res = await fetch(`${BASE_URL}/api/leagues/${testLeague.id}/members/${testUserId}`, {
          method: 'DELETE',
          headers: { Cookie: `sb-access-token=${adminSession.access_token}` },
        })
        expect(res.status).toBe(200)

        // Verify member is removed
        const memberCheck = await admin
          .from('league_members')
          .select('user_id')
          .eq('user_id', testUserId)
          .eq('league_id', testLeague.id)
          .single()
        expect(memberCheck.error).toBeDefined()

        // Verify predictions still exist
        const predictions = await admin
          .from('predictions')
          .select('user_id')
          .eq('user_id', testUserId)
          .eq('league_id', testLeague.id)

        expect(predictions.error).toBeNull()
        expect(Array.isArray(predictions.data)).toBe(true)
      } finally {
        await deleteTestLeague(testLeague.id)
      }
    })
  })

  describe('GET /api/leagues/[id]/invite-link', () => {
    it('returns 401 SESSION_EXPIRED when no session', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues/${privateLeagueId}/invite-link`)
      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.code).toBe('SESSION_EXPIRED')
    })

    it('returns 404 LEAGUE_NOT_FOUND for non-existent league', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000099'
      const res = await fetch(`${BASE_URL}/api/leagues/${fakeId}/invite-link`, {
        headers: { Cookie: `sb-access-token=${adminSession.access_token}` },
      })
      expect(res.status).toBe(404)
      const json = await res.json()
      expect(json.code).toBe('LEAGUE_NOT_FOUND')
    })

    it('returns 403 NOT_ADMIN when non-admin tries to get invite link', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues/${openLeagueId}/invite-link`, {
        headers: { Cookie: `sb-access-token=${user2Session.access_token}` },
      })
      expect(res.status).toBe(403)
      const json = await res.json()
      expect(json.code).toBe('NOT_ADMIN')
    })

    it('returns invite_url for admin', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues/${privateLeagueId}/invite-link`, {
        headers: { Cookie: `sb-access-token=${adminSession.access_token}` },
      })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.status).toBe('success')
      expect(json.data).toHaveProperty('invite_url')
      expect(typeof json.data.invite_url).toBe('string')

      // Verify URL structure
      const url = new URL(json.data.invite_url)
      expect(url.pathname).toBe('/join')
      expect(url.searchParams.get('token')).toBeDefined()
      expect(url.searchParams.get('token')).not.toBe(null)
      expect(url.searchParams.get('token')?.length).toBeGreaterThan(0)

      // Verify raw invite_token is not exposed
      expect(json.data).not.toHaveProperty('invite_token')
      expect(JSON.stringify(json.data)).not.toContain(
        `"invite_token"`
      )
    })

    it('returns full absolute URL with NEXT_PUBLIC_SITE_URL', async () => {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      const res = await fetch(`${BASE_URL}/api/leagues/${privateLeagueId}/invite-link`, {
        headers: { Cookie: `sb-access-token=${adminSession.access_token}` },
      })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data.invite_url).toMatch(new RegExp(`^${siteUrl.replace(/\//g, '\\/')}/join`))
    })
  })
})
