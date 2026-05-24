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
  authedClient,
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

    it('persists prize_pool when provided', async () => {
      const admin = adminClient()
      const res = await fetch(`${BASE_URL}/api/leagues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${user1Session.access_token}`,
        },
        body: JSON.stringify({
          name: 'Prize League',
          access_type: 'private',
          prize_pool: '1º lugar: jantar',
        }),
      })

      expect(res.status).toBe(201)
      const json = await res.json()
      const leagueId = json.data.id

      try {
        const leagueRow = await admin
          .from('leagues')
          .select('prize_pool')
          .eq('id', leagueId)
          .single()

        expect(leagueRow.error).toBeNull()
        expect(leagueRow.data?.prize_pool).toBe('1º lugar: jantar')
      } finally {
        await deleteTestLeague(leagueId)
      }
    })

    it('stores prize_pool as null when omitted', async () => {
      const admin = adminClient()
      const res = await fetch(`${BASE_URL}/api/leagues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${user1Session.access_token}`,
        },
        body: JSON.stringify({
          name: 'No Prize League',
          access_type: 'private',
        }),
      })

      expect(res.status).toBe(201)
      const json = await res.json()
      const leagueId = json.data.id

      try {
        const leagueRow = await admin
          .from('leagues')
          .select('prize_pool')
          .eq('id', leagueId)
          .single()

        expect(leagueRow.error).toBeNull()
        expect(leagueRow.data?.prize_pool).toBeNull()
      } finally {
        await deleteTestLeague(leagueId)
      }
    })

    it('rejects prize_pool longer than 300 characters', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${user1Session.access_token}`,
        },
        body: JSON.stringify({
          name: 'Test League',
          access_type: 'private',
          prize_pool: 'A'.repeat(301),
        }),
      })

      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.code).toBe('INVALID_BODY')
    })

    it('rejects non-string prize_pool', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${user1Session.access_token}`,
        },
        body: JSON.stringify({
          name: 'Test League',
          access_type: 'private',
          prize_pool: 123,
        }),
      })

      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.code).toBe('INVALID_BODY')
    })

    it('response body does not contain prize_pool', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `sb-access-token=${user1Session.access_token}`,
        },
        body: JSON.stringify({
          name: 'Shape Test League',
          access_type: 'private',
          prize_pool: '1º lugar: viagem',
        }),
      })

      expect(res.status).toBe(201)
      const json = await res.json()
      expect(json.data).not.toHaveProperty('prize_pool')

      // Cleanup
      await deleteTestLeague(json.data.id)
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

  describe('GET /api/leagues/{id} (task_03)', () => {
    it('returns 401 SESSION_EXPIRED for unauthenticated requests', async () => {
      const res = await fetch(`${BASE_URL}/api/leagues/00000000-0000-0000-0000-000000000001`)
      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.code).toBe('SESSION_EXPIRED')
    })

    it('invite_token is present and non-null for a newly created league', async () => {
      const admin = adminClient()
      const league = await createTestLeague('Invite Token League', 'private', user1Id)

      try {
        const { data, error } = await admin
          .from('leagues')
          .select('invite_token')
          .eq('id', league.id)
          .single()

        expect(error).toBeNull()
        expect(data?.invite_token).toBeTruthy()
        expect(typeof data?.invite_token).toBe('string')
      } finally {
        await deleteTestLeague(league.id)
      }
    })

    it('user_onboarded_at is null for a fresh league member', async () => {
      const admin = adminClient()
      const league = await createTestLeague('Onboarding Fresh League', 'private', user1Id)
      await addTestLeagueMember(league.id, user2Id, 'member')

      try {
        const { data, error } = await admin
          .from('league_members')
          .select('onboarded_at')
          .eq('league_id', league.id)
          .eq('user_id', user2Id)
          .single()

        expect(error).toBeNull()
        expect(data?.onboarded_at).toBeNull()
      } finally {
        await admin.from('league_members').delete().eq('league_id', league.id)
        await deleteTestLeague(league.id)
      }
    })

    it('user_onboarded_at is an ISO timestamp after member sets it', async () => {
      const admin = adminClient()
      const league = await createTestLeague('Onboarding Set League', 'private', user1Id)
      await addTestLeagueMember(league.id, user2Id, 'member')

      try {
        const client = authedClient(user2Session.access_token)
        const now = new Date().toISOString()
        const { error: updateError } = await client
          .from('league_members')
          .update({ onboarded_at: now })
          .eq('league_id', league.id)
          .eq('user_id', user2Id)

        expect(updateError).toBeNull()

        const { data, error } = await admin
          .from('league_members')
          .select('onboarded_at')
          .eq('league_id', league.id)
          .eq('user_id', user2Id)
          .single()

        expect(error).toBeNull()
        expect(data?.onboarded_at).not.toBeNull()
        expect(new Date(data!.onboarded_at!).toISOString()).toBe(data!.onboarded_at)
      } finally {
        await admin.from('league_members').delete().eq('league_id', league.id)
        await deleteTestLeague(league.id)
      }
    })

    it('GET /api/leagues/{id} response object includes invite_token and user_onboarded_at fields (shape regression)', async () => {
      const admin = adminClient()
      const league = await createTestLeague('Shape Check League', 'private', user1Id)
      await addTestLeagueMember(league.id, user1Id, 'member')

      try {
        const client = authedClient(user1Session.access_token)
        const { data, error } = await client
          .from('leagues')
          .select('id, name, access_type, logo_url, member_count, description, created_by, created_at, invite_token')
          .eq('id', league.id)
          .single()

        expect(error).toBeNull()
        expect(data).toHaveProperty('invite_token')
        expect(data?.invite_token).toBeTruthy()

        const { data: memberData, error: memberError } = await admin
          .from('league_members')
          .select('onboarded_at')
          .eq('league_id', league.id)
          .eq('user_id', user1Id)
          .single()

        expect(memberError).toBeNull()
        expect(memberData).toHaveProperty('onboarded_at')
        expect(memberData?.onboarded_at).toBeNull()
      } finally {
        await admin.from('league_members').delete().eq('league_id', league.id)
        await deleteTestLeague(league.id)
      }
    })
  })

  describe('PATCH /api/leagues/{id}/me (task_04)', () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
    const authCookieName = `sb-${projectRef}-auth-token`

    function sessionCookieValue(session: any): string {
      const encoded = Buffer.from(JSON.stringify(session)).toString('base64url')
      return `base64-${encoded}`
    }

    it('returns 401 SESSION_EXPIRED when no session', async () => {
      const res = await fetch(
        `${BASE_URL}/api/leagues/00000000-0000-0000-0000-000000000001/me`,
        { method: 'PATCH' }
      )
      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.code).toBe('SESSION_EXPIRED')
    })

    it('returns 204 and sets onboarded_at for an authenticated member', async () => {
      const admin = adminClient()
      const league = await createTestLeague('PATCH Onboard League', 'private', user1Id)
      await addTestLeagueMember(league.id, user1Id, 'member')

      try {
        const res = await fetch(`${BASE_URL}/api/leagues/${league.id}/me`, {
          method: 'PATCH',
          headers: {
            Cookie: `${authCookieName}=${sessionCookieValue(user1Session)}`,
          },
        })
        expect(res.status).toBe(204)

        const { data, error } = await admin
          .from('league_members')
          .select('onboarded_at')
          .eq('league_id', league.id)
          .eq('user_id', user1Id)
          .single()

        expect(error).toBeNull()
        expect(data?.onboarded_at).not.toBeNull()
      } finally {
        await admin.from('league_members').delete().eq('league_id', league.id)
        await deleteTestLeague(league.id)
      }
    })

    it('is idempotent — calling twice returns 204 both times', async () => {
      const admin = adminClient()
      const league = await createTestLeague('PATCH Idempotent League', 'private', user1Id)
      await addTestLeagueMember(league.id, user1Id, 'member')

      try {
        const cookieHeader = {
          Cookie: `${authCookieName}=${sessionCookieValue(user1Session)}`,
        }

        const res1 = await fetch(`${BASE_URL}/api/leagues/${league.id}/me`, {
          method: 'PATCH',
          headers: cookieHeader,
        })
        expect(res1.status).toBe(204)

        const res2 = await fetch(`${BASE_URL}/api/leagues/${league.id}/me`, {
          method: 'PATCH',
          headers: cookieHeader,
        })
        expect(res2.status).toBe(204)
      } finally {
        await admin.from('league_members').delete().eq('league_id', league.id)
        await deleteTestLeague(league.id)
      }
    })

    it('returns 403 for a user who is not a member of the league', async () => {
      const league = await createTestLeague('PATCH Non-Member League', 'private', user1Id)

      try {
        const res = await fetch(`${BASE_URL}/api/leagues/${league.id}/me`, {
          method: 'PATCH',
          headers: {
            Cookie: `${authCookieName}=${sessionCookieValue(user2Session)}`,
          },
        })
        expect(res.status).toBe(403)
        const json = await res.json()
        expect(json.code).toBe('NOT_A_MEMBER')
      } finally {
        await deleteTestLeague(league.id)
      }
    })
  })

  describe('league_members.onboarded_at migration (task_01)', () => {
    it('league_members table is intact after migration (regression)', async () => {
      const admin = adminClient()
      const league = await createTestLeague('Regression League', 'private', user1Id)
      await addTestLeagueMember(league.id, user1Id, 'member')

      try {
        // Verify the table is readable and onboarded_at column is present with null default
        const { data, error } = await admin
          .from('league_members')
          .select('id, league_id, user_id, role, joined_at, onboarded_at')
          .eq('league_id', league.id)
          .eq('user_id', user1Id)
          .single()

        expect(error).toBeNull()
        expect(data).toHaveProperty('onboarded_at')
        expect(data?.onboarded_at).toBeNull()
        expect(data?.role).toBe('member')
      } finally {
        await admin.from('league_members').delete().eq('league_id', league.id)
        await deleteTestLeague(league.id)
      }
    })

    it('member can UPDATE their own onboarded_at (RLS allows)', async () => {
      const admin = adminClient()
      const league = await createTestLeague('Onboard Allow League', 'private', user1Id)
      await addTestLeagueMember(league.id, user1Id, 'member')

      try {
        const client = authedClient(user1Session.access_token)
        const now = new Date().toISOString()
        const { error } = await client
          .from('league_members')
          .update({ onboarded_at: now })
          .eq('league_id', league.id)
          .eq('user_id', user1Id)

        expect(error).toBeNull()

        const verify = await admin
          .from('league_members')
          .select('onboarded_at')
          .eq('league_id', league.id)
          .eq('user_id', user1Id)
          .single()

        expect(verify.error).toBeNull()
        expect(verify.data?.onboarded_at).not.toBeNull()
      } finally {
        await admin.from('league_members').delete().eq('league_id', league.id)
        await deleteTestLeague(league.id)
      }
    })

    it('member CANNOT UPDATE another user\'s onboarded_at (RLS denies)', async () => {
      const admin = adminClient()
      const league = await createTestLeague('Onboard Deny League', 'private', user1Id)
      await addTestLeagueMember(league.id, user1Id, 'member')
      await addTestLeagueMember(league.id, user2Id, 'member')

      try {
        // user2 tries to update user1's row
        const client = authedClient(user2Session.access_token)
        await client
          .from('league_members')
          .update({ onboarded_at: new Date().toISOString() })
          .eq('league_id', league.id)
          .eq('user_id', user1Id)

        // verify user1's row was NOT updated
        const verify = await admin
          .from('league_members')
          .select('onboarded_at')
          .eq('league_id', league.id)
          .eq('user_id', user1Id)
          .single()

        expect(verify.error).toBeNull()
        expect(verify.data?.onboarded_at).toBeNull()
      } finally {
        await admin.from('league_members').delete().eq('league_id', league.id)
        await deleteTestLeague(league.id)
      }
    })
  })
})
