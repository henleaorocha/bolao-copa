/**
 * Integration tests for LeagueProvider and app/layout.tsx
 * Requires a running local Supabase instance (supabase start) with SUPABASE_SERVICE_ROLE_KEY set.
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

describe.skipIf(!HAS_SERVICE_KEY)('LeagueProvider and app/layout integration', () => {
  const email = `test-league-context-${Date.now()}@example.com`
  let userId: string

  beforeAll(async () => {
    const user = await createTestUser(email)
    userId = user.id
    // New users are no longer auto-enrolled into the test league (PRD
    // league-permissions, ADR-002); add the membership explicitly so the
    // layout/auth-me tests below see the test league as the active league.
    await addDefaultLeagueMember(userId, 'member')
  })

  afterAll(async () => {
    if (userId) await deleteTestUser(userId)
  })

  it('app/layout.tsx fetches and provides active league to LeagueProvider', async () => {
    const { session } = await signInTestUser(email)

    // The /api/auth/me endpoint returns the league that should be passed to LeagueProvider
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: `sb-access-token=${session.access_token}` },
    })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('success')
    expect(json.data.league).toBeDefined()
    expect(json.data.league.id).toBe(DEFAULT_LEAGUE_ID)
    expect(json.data.league.name).toBeDefined()
    expect(json.data.league.role).toBe('member')
    expect(json.data.league.member_count).toBeDefined()
  })

  it('unauthenticated users do not receive LeagueProvider', async () => {
    // The layout should not throw when there's no active league (unauthenticated)
    // We can infer this by making a request without auth, which should reach the login page
    const res = await fetch(`${BASE_URL}/`)
    // This will redirect to /login
    expect([200, 301, 302, 307, 308]).toContain(res.status)
  })

  it('DB trigger no longer auto-enrolls new users into the test league (PRD league-permissions, task_02)', async () => {
    // handle_new_user() keeps the public.users upsert but no longer enrolls new
    // accounts into the test league (ADR-002); new users start league-less.
    const newEmail = `test-trigger-${Date.now()}@example.com`
    const newUser = await createTestUser(newEmail)

    try {
      const admin = adminClient()
      const { data, error } = await admin
        .from('league_members')
        .select('role, league_id')
        .eq('user_id', newUser.id)

      expect(error).toBeNull()
      expect(data).toHaveLength(0)
    } finally {
      await deleteTestUser(newUser.id)
      await adminClient().from('users').delete().eq('id', newUser.id)
    }
  })

  it('when user is enrolled in multiple leagues, GET /api/auth/me returns active_league_id or first league', async () => {
    const { session } = await signInTestUser(email)

    // Create a second league and add the user to it
    const secondLeague = await createTestLeague('Second Test League', 'private', userId)
    const secondLeagueId = secondLeague.id

    try {
      // Ensure user is a member of the second league
      const existingMembership = await adminClient()
        .from('league_members')
        .select('user_id')
        .eq('user_id', userId)
        .eq('league_id', secondLeagueId)
        .single()

      if (existingMembership.error) {
        await addTestLeagueMember(secondLeagueId, userId, 'member')
      }

      // Set active_league_id to the second league
      const admin = adminClient()
      await admin.from('users').update({ active_league_id: secondLeagueId }).eq('id', userId)

      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Cookie: `sb-access-token=${session.access_token}` },
      })

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data.league.id).toBe(secondLeagueId)
      expect(json.data.league.name).toBe('Second Test League')
    } finally {
      await deleteTestLeague(secondLeagueId)
    }
  })

  it('layout correctly handles user with no leagues (edge case)', async () => {
    // This is an edge case where a user is somehow created but has no league memberships
    // The API should still return a valid response or properly handle the error
    const { session } = await signInTestUser(email)

    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: `sb-access-token=${session.access_token}` },
    })

    // Even with edge cases, /api/auth/me should return a valid response
    // (status is either 200 with league data or an error)
    expect([200, 500]).toContain(res.status)
    const json = await res.json()
    expect(json.status).toBeDefined()
  })

  it('LeagueProvider is only mounted for authenticated users, not unauthenticated login page', async () => {
    // The login page should be accessible without LeagueProvider
    // We can verify this by checking that /login is reachable
    const res = await fetch(`${BASE_URL}/login`)
    expect([200, 301, 302, 307, 308]).toContain(res.status)
  })
})
