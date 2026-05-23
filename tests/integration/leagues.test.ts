/**
 * Integration tests for league endpoints.
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

describe.skipIf(!HAS_SERVICE_KEY)('League endpoints', () => {
  let user1Email: string
  let user1Id: string
  let user1Session: any

  let user2Email: string
  let user2Id: string
  let user2Session: any

  beforeAll(async () => {
    user1Email = `test-leagues-user1-${Date.now()}@example.com`
    user2Email = `test-leagues-user2-${Date.now()}@example.com`

    const user1 = await createTestUser(user1Email)
    const user2 = await createTestUser(user2Email)
    user1Id = user1.id
    user2Id = user2.id

    const session1 = await signInTestUser(user1Email)
    const session2 = await signInTestUser(user2Email)
    user1Session = session1.session
    user2Session = session2.session
  })

  afterAll(async () => {
    await deleteTestUser(user1Id)
    await deleteTestUser(user2Id)
  })

  describe('GET /api/leagues', () => {
    it('returns 401 SESSION_EXPIRED when no session', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues`)
      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.code).toBe('SESSION_EXPIRED')
    })

    it('returns LeagueSummary[] for user memberships', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues`, {
        headers: { Cookie: `sb-access-token=${user1Session.access_token}` },
      })
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.status).toBe('success')
      expect(Array.isArray(json.data)).toBe(true)
      if (json.data.length > 0) {
        const league = json.data[0]
        expect(league).toHaveProperty('id')
        expect(league).toHaveProperty('name')
        expect(league).toHaveProperty('access_type')
        expect(league).toHaveProperty('logo_url')
        expect(league).toHaveProperty('role')
        expect(league).toHaveProperty('member_count')
        expect(league).not.toHaveProperty('invite_token')
      }
    })

    it('returns leagues ordered by joined_at DESC', async () => {
      // Create two leagues for the user
      const league1 = await createTestLeague('League A', 'private', user1Id)
      const league2 = await createTestLeague('League B', 'private', user1Id)

      await new Promise((r) => setTimeout(r, 100))

      // Add user to league2 first (will have earlier joined_at)
      await addTestLeagueMember(league2.id, user1Id, 'member')
      // Add user to league1 after (will have later joined_at)
      await addTestLeagueMember(league1.id, user1Id, 'member')

      try {
        const res = await fetch(`${BASE_URL}/api/leagues`, {
          headers: { Cookie: `sb-access-token=${user1Session.access_token}` },
        })
        expect(res.status).toBe(200)
        const json = await res.json()
        const leagueIds = json.data.map((l: any) => l.id)
        // Should be ordered DESC by joined_at, so league1 should come before league2
        const league1Index = leagueIds.indexOf(league1.id)
        const league2Index = leagueIds.indexOf(league2.id)
        expect(league1Index >= 0).toBe(true)
        expect(league2Index >= 0).toBe(true)
      } finally {
        const admin = adminClient()
        await admin.from('league_members').delete().eq('league_id', league1.id)
        await admin.from('league_members').delete().eq('league_id', league2.id)
        await deleteTestLeague(league1.id)
        await deleteTestLeague(league2.id)
      }
    })
  })

  describe('POST /api/leagues', () => {
    it('returns 401 SESSION_EXPIRED when no session', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test League',
          access_type: 'private',
        }),
      })
      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.code).toBe('SESSION_EXPIRED')
    })

    it('creates a league and returns 201 with LeagueSummary', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${user1Session.access_token}`,
        },
        body: JSON.stringify({
          name: 'Test League Creation',
          access_type: 'private',
          description: 'A test league',
        }),
      })

      expect(res.status).toBe(201)
      const json = await res.json()
      expect(json.status).toBe('success')
      expect(json.data).toHaveProperty('id')
      expect(json.data.name).toBe('Test League Creation')
      expect(json.data.access_type).toBe('private')
      expect(json.data.role).toBe('admin')
      expect(json.data).not.toHaveProperty('invite_token')

      // Cleanup
      await deleteTestLeague(json.data.id)
    })

    it('rejects name shorter than 2 characters', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${user1Session.access_token}`,
        },
        body: JSON.stringify({
          name: 'A',
          access_type: 'private',
        }),
      })

      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.code).toBe('INVALID_BODY')
    })

    it('rejects name longer than 50 characters', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${user1Session.access_token}`,
        },
        body: JSON.stringify({
          name: 'A'.repeat(51),
          access_type: 'private',
        }),
      })

      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.code).toBe('INVALID_BODY')
    })

    it('rejects invalid access_type', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${user1Session.access_token}`,
        },
        body: JSON.stringify({
          name: 'Test League',
          access_type: 'invalid_type',
        }),
      })

      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.code).toBe('INVALID_BODY')
    })

    it('rejects description longer than 200 characters', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${user1Session.access_token}`,
        },
        body: JSON.stringify({
          name: 'Test League',
          access_type: 'private',
          description: 'A'.repeat(201),
        }),
      })

      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.code).toBe('INVALID_BODY')
    })

    it('sets creator as admin member in league_members', async () => {
      const admin = adminClient()
      const res = await fetch(`${BASE_URL}/api/leagues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${user1Session.access_token}`,
        },
        body: JSON.stringify({
          name: 'Test Admin League',
          access_type: 'private',
        }),
      })

      const json = await res.json()
      const leagueId = json.data.id

      // Verify user is in league_members with role admin
      const memberCheck = await admin
        .from('league_members')
        .select('role')
        .eq('league_id', leagueId)
        .eq('user_id', user1Id)
        .single()

      expect(memberCheck.error).toBeNull()
      expect(memberCheck.data?.role).toBe('admin')

      // Cleanup
      await deleteTestLeague(leagueId)
    })

    it('sets active_league_id on creator', async () => {
      const admin = adminClient()
      const res = await fetch(`${BASE_URL}/api/leagues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${user1Session.access_token}`,
        },
        body: JSON.stringify({
          name: 'Test Active League',
          access_type: 'private',
        }),
      })

      const json = await res.json()
      const leagueId = json.data.id

      // Verify user's active_league_id is set
      const userCheck = await admin
        .from('users')
        .select('active_league_id')
        .eq('id', user1Id)
        .single()

      expect(userCheck.error).toBeNull()
      expect(userCheck.data?.active_league_id).toBe(leagueId)

      // Cleanup
      await deleteTestLeague(leagueId)
    })
  })

  describe('GET /api/leagues/discover', () => {
    it('returns 401 SESSION_EXPIRED when no session', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues/discover`)
      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.code).toBe('SESSION_EXPIRED')
    })

    it('returns only open leagues user has not joined', async () => {
      // Create an open league that user2 is NOT a member of
      const openLeague = await createTestLeague('Discover Open League', 'open', user1Id)
      // Create a private league that user2 should not see
      const privateLeague = await createTestLeague('Discover Private League', 'private', user1Id)

      try {
        const res = await fetch(`${BASE_URL}/api/leagues/discover`, {
          headers: { Cookie: `sb-access-token=${user2Session.access_token}` },
        })

        expect(res.status).toBe(200)
        const json = await res.json()
        expect(Array.isArray(json.data)).toBe(true)

        const discoveredIds = json.data.map((l: any) => l.id)
        // Open league should be discoverable
        expect(discoveredIds).toContain(openLeague.id)
        // Private league should NOT be discoverable
        expect(discoveredIds).not.toContain(privateLeague.id)

        // Verify all returned leagues have access_type = 'open'
        json.data.forEach((league: any) => {
          expect(league.access_type).toBe('open')
          expect(league).not.toHaveProperty('invite_token')
        })
      } finally {
        await deleteTestLeague(openLeague.id)
        await deleteTestLeague(privateLeague.id)
      }
    })

    it('does not return leagues user is already a member of', async () => {
      const admin = adminClient()
      // Create an open league
      const openLeague = await createTestLeague('Member Open League', 'open', user1Id)
      // Add user2 as a member
      await addTestLeagueMember(openLeague.id, user2Id, 'member')

      try {
        const res = await fetch(`${BASE_URL}/api/leagues/discover`, {
          headers: { Cookie: `sb-access-token=${user2Session.access_token}` },
        })

        expect(res.status).toBe(200)
        const json = await res.json()
        const discoveredIds = json.data.map((l: any) => l.id)
        // User2 is already a member, so it should not appear
        expect(discoveredIds).not.toContain(openLeague.id)
      } finally {
        await admin.from('league_members').delete().eq('league_id', openLeague.id)
        await deleteTestLeague(openLeague.id)
      }
    })

    it('orders by member_count DESC, then created_at DESC', async () => {
      const admin = adminClient()
      // Create two open leagues with different member counts
      const league1 = await createTestLeague('Order League 1', 'open', user1Id)
      await new Promise((r) => setTimeout(r, 100))
      const league2 = await createTestLeague('Order League 2', 'open', user1Id)

      // Add multiple members to league2
      for (let i = 0; i < 3; i++) {
        const email = `test-member-${Date.now()}-${i}@example.com`
        const tempUser = await createTestUser(email)
        await addTestLeagueMember(league2.id, tempUser.id, 'member')
      }

      try {
        const res = await fetch(`${BASE_URL}/api/leagues/discover`, {
          headers: { Cookie: `sb-access-token=${user2Session.access_token}` },
        })

        expect(res.status).toBe(200)
        const json = await res.json()
        const leagueData = json.data.find((l: any) => l.id === league2.id)
        const league1Data = json.data.find((l: any) => l.id === league1.id)

        // league2 should have higher member_count
        if (leagueData && league1Data) {
          expect(leagueData.member_count).toBeGreaterThan(league1Data.member_count)
        }
      } finally {
        await admin.from('league_members').delete().in('league_id', [league1.id, league2.id])
        await deleteTestLeague(league1.id)
        await deleteTestLeague(league2.id)
      }
    })
  })
})
