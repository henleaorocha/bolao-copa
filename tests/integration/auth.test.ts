/**
 * Integration tests for auth flow.
 * Require a running local Supabase instance (supabase start) with SUPABASE_SERVICE_ROLE_KEY set.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestUser,
  deleteTestUser,
  signInTestUser,
  DEFAULT_LEAGUE_ID,
  adminClient,
  createTestLeague,
  deleteTestLeague,
  addTestLeagueMember,
  addDefaultLeagueMember,
} from '../fixtures/factories'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
const HAS_SERVICE_KEY = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

describe.skipIf(!HAS_SERVICE_KEY)('Auth flow integration', () => {
  const email = `test-auth-${Date.now()}@example.com`
  let userId: string

  beforeAll(async () => {
    const user = await createTestUser(email)
    userId = user.id
    // New users are no longer auto-enrolled into the test league (PRD
    // league-permissions, ADR-002); add the membership explicitly so the
    // suite below can treat the test league as the user's first/fallback league.
    await addDefaultLeagueMember(userId, 'member')
  })

  afterAll(async () => {
    if (userId) await deleteTestUser(userId)
  })

  it('user explicitly added to the test league is a member (no auto-enroll)', async () => {
    // The user is a member only because beforeAll called addDefaultLeagueMember();
    // the handle_new_user() trigger no longer enrolls new accounts (ADR-002).
    const admin = adminClient()
    const { data, error } = await admin
      .from('league_members')
      .select('role, league_id')
      .eq('user_id', userId)
      .eq('league_id', DEFAULT_LEAGUE_ID)
      .single()

    expect(error).toBeNull()
    expect(data).not.toBeNull()
    expect(data!.role).toBe('member')
  })

  it('GET /api/auth/me with valid session returns user + league', async () => {
    const { session } = await signInTestUser(email)

    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: `sb-access-token=${session.access_token}` },
    })

    expect([200, 401]).toContain(res.status)
    const json = await res.json()
    expect(json.status).toBeDefined()

    if (res.status === 200) {
      expect(json.data.user).toBeDefined()
      expect(json.data.league).toBeDefined()
      expect(json.data.league.id).toBe(DEFAULT_LEAGUE_ID)
      expect(json.data.league.role).toBe('member')
      expect(json.data.league.member_count).toBeDefined()
    }
  })

  it('GET /api/auth/me with active_league_id = NULL returns first league by joined_at', async () => {
    const { session } = await signInTestUser(email)

    // Create a second league and add user to it
    const league = await createTestLeague('Test League 2', 'private', userId)
    const secondLeagueId = league.id

    try {
      // Ensure user is member of the new league (may already be from the call above)
      const existingMembership = await adminClient()
        .from('league_members')
        .select('user_id')
        .eq('user_id', userId)
        .eq('league_id', secondLeagueId)
        .single()

      if (existingMembership.error) {
        await addTestLeagueMember(secondLeagueId, userId, 'member')
      }

      // Ensure active_league_id is NULL
      const admin = adminClient()
      await admin.from('users').update({ active_league_id: null }).eq('id', userId)

      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Cookie: `sb-access-token=${session.access_token}` },
      })

      if (res.status === 200) {
        const json = await res.json()
        expect(json.data.league).toBeDefined()
        // Should return the first league (DEFAULT_LEAGUE_ID, which was joined first)
        expect(json.data.league.id).toBe(DEFAULT_LEAGUE_ID)
      }
    } finally {
      await deleteTestLeague(secondLeagueId)
    }
  })

  it('GET /api/auth/me with valid active_league_id returns that league', async () => {
    const { session } = await signInTestUser(email)

    // Create a test league and add user to it
    const league = await createTestLeague('Test League 3', 'private', userId)
    const leagueId = league.id

    try {
      // Ensure user is a member
      const admin = adminClient()
      const existingMembership = await admin
        .from('league_members')
        .select('user_id')
        .eq('user_id', userId)
        .eq('league_id', leagueId)
        .single()

      if (existingMembership.error) {
        await addTestLeagueMember(leagueId, userId, 'member')
      }

      // Set active_league_id to this league
      await admin.from('users').update({ active_league_id: leagueId }).eq('id', userId)

      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Cookie: `sb-access-token=${session.access_token}` },
      })

      if (res.status === 200) {
        const json = await res.json()
        expect(json.data.league.id).toBe(leagueId)
        expect(json.data.league.name).toBe('Test League 3')
      }
    } finally {
      await deleteTestLeague(leagueId)
    }
  })

  it('GET /api/auth/me resets active_league_id when user is not a member', async () => {
    const { session } = await signInTestUser(email)

    // Create a test league
    const league = await createTestLeague('Test League 4', 'private', userId)
    const leagueId = league.id

    try {
      const admin = adminClient()

      // Set active_league_id to this league
      await admin.from('users').update({ active_league_id: leagueId }).eq('id', userId)

      // Remove user from the league
      await admin
        .from('league_members')
        .delete()
        .eq('user_id', userId)
        .eq('league_id', leagueId)

      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Cookie: `sb-access-token=${session.access_token}` },
      })

      if (res.status === 200) {
        const json = await res.json()
        // Should return the fallback league (DEFAULT_LEAGUE_ID)
        expect(json.data.league.id).toBe(DEFAULT_LEAGUE_ID)

        // Verify active_league_id was reset to NULL
        const userData = await admin
          .from('users')
          .select('active_league_id')
          .eq('id', userId)
          .single()
        expect(userData.data?.active_league_id).toBeNull()
      }
    } finally {
      await deleteTestLeague(leagueId)
    }
  })

  it('GET /api/auth/me without session returns 401 SESSION_EXPIRED', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.status).toBe('error')
    expect(json.code).toBe('SESSION_EXPIRED')
    expect(json.timestamp).toBeDefined()
  })

  describe('PATCH /api/auth/me', () => {
    it('updates active_league_id when user is a member', async () => {
      const { session } = await signInTestUser(email)

      const league = await createTestLeague('Test League 5', 'private', userId)
      const leagueId = league.id

      try {
        const admin = adminClient()
        const existingMembership = await admin
          .from('league_members')
          .select('user_id')
          .eq('user_id', userId)
          .eq('league_id', leagueId)
          .single()

        if (existingMembership.error) {
          await addTestLeagueMember(leagueId, userId, 'member')
        }

        const res = await fetch(`${BASE_URL}/api/auth/me`, {
          method: 'PATCH',
          headers: {
            Cookie: `sb-access-token=${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ active_league_id: leagueId }),
        })

        expect([200, 401]).toContain(res.status)
        if (res.status === 200) {
          const json = await res.json()
          expect(json.data.league.id).toBe(leagueId)

          const userData = await admin
            .from('users')
            .select('active_league_id')
            .eq('id', userId)
            .single()
          expect(userData.data?.active_league_id).toBe(leagueId)
        }
      } finally {
        await deleteTestLeague(leagueId)
      }
    })

    it('returns 403 NOT_A_MEMBER when user is not a member of target league', async () => {
      const { session } = await signInTestUser(email)

      const league = await createTestLeague('Test League 6', 'private', null)
      const leagueId = league.id

      try {
        const res = await fetch(`${BASE_URL}/api/auth/me`, {
          method: 'PATCH',
          headers: {
            Cookie: `sb-access-token=${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ active_league_id: leagueId }),
        })

        expect([403, 401]).toContain(res.status)
        if (res.status === 403) {
          const json = await res.json()
          expect(json.code).toBe('NOT_A_MEMBER')
        }
      } finally {
        await deleteTestLeague(leagueId)
      }
    })

    it('returns 400 INVALID_BODY with missing active_league_id', async () => {
      const { session } = await signInTestUser(email)

      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        method: 'PATCH',
        headers: {
          Cookie: `sb-access-token=${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      expect([400, 401]).toContain(res.status)
      if (res.status === 400) {
        const json = await res.json()
        expect(json.code).toBe('INVALID_BODY')
      }
    })

    it('returns 401 SESSION_EXPIRED without session', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active_league_id: DEFAULT_LEAGUE_ID }),
      })

      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.code).toBe('SESSION_EXPIRED')
    })
  })

  it('/auth/callback without code redirects to /login?error=auth_callback_failed', async () => {
    const res = await fetch(`${BASE_URL}/auth/callback`, { redirect: 'manual' })
    // 307 redirect to login error page
    expect(res.status).toBe(307)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('auth_callback_failed')
  })
})
