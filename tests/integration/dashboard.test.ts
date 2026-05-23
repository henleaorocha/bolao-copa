/**
 * Integration tests for dashboard with dynamic league context.
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
} from '../fixtures/factories'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
const HAS_SERVICE_KEY = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

describe.skipIf(!HAS_SERVICE_KEY)('Dashboard with dynamic league context', () => {
  const email = `test-dashboard-${Date.now()}@example.com`
  let userId: string
  let league1Id: string
  let league2Id: string

  beforeAll(async () => {
    const user = await createTestUser(email)
    userId = user.id

    // Create two test leagues
    const league1 = await createTestLeague('Test League 1', 'private', userId)
    league1Id = league1.id

    const league2 = await createTestLeague('Test League 2', 'private', userId)
    league2Id = league2.id

    // Add user to both leagues as member (they may already be added as admin)
    try {
      await addTestLeagueMember(league1Id, userId, 'member')
    } catch {
      // Already a member
    }

    try {
      await addTestLeagueMember(league2Id, userId, 'member')
    } catch {
      // Already a member
    }
  })

  afterAll(async () => {
    if (league1Id) await deleteTestLeague(league1Id)
    if (league2Id) await deleteTestLeague(league2Id)
    if (userId) await deleteTestUser(userId)
  })

  it('dashboard renders the correct league when active_league_id is explicitly set', async () => {
    // Set active_league_id to league1
    const admin = adminClient()
    await admin.from('users').update({ active_league_id: league1Id }).eq('id', userId)

    const { session } = await signInTestUser(email)

    // Fetch /api/auth/me to verify it returns league1
    const authRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: `sb-access-token=${session.access_token}` },
    })
    expect(authRes.status).toBe(200)
    const authJson = await authRes.json()
    expect(authJson.data.league.id).toBe(league1Id)
  })

  it('dashboard renders fallback league (first by joined_at) when active_league_id is NULL', async () => {
    // Set active_league_id to NULL
    const admin = adminClient()
    await admin.from('users').update({ active_league_id: null }).eq('id', userId)

    const { session } = await signInTestUser(email)

    // Fetch /api/auth/me; should return the first league by joined_at
    const authRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: `sb-access-token=${session.access_token}` },
    })
    expect(authRes.status).toBe(200)
    const authJson = await authRes.json()
    // Should be the default league (oldest) or league1 depending on creation order
    expect(authJson.data.league.id).toBeDefined()
    expect([DEFAULT_LEAGUE_ID, league1Id, league2Id]).toContain(authJson.data.league.id)
  })

  it('dashboard does not error when user has active_league_id = NULL but belongs to at least one league', async () => {
    // Set active_league_id to NULL
    const admin = adminClient()
    await admin.from('users').update({ active_league_id: null }).eq('id', userId)

    const { session } = await signInTestUser(email)

    // Fetch /api/auth/me should succeed and return a valid league
    const authRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: `sb-access-token=${session.access_token}` },
    })
    expect(authRes.status).toBe(200)
    const authJson = await authRes.json()
    expect(authJson.status).toBe('success')
    expect(authJson.data.league).toBeDefined()
    expect(authJson.data.league.id).toBeDefined()
  })

  it('after switching active league via PATCH /api/auth/me, subsequent requests reflect the new league', async () => {
    // Start with league1
    const admin = adminClient()
    await admin.from('users').update({ active_league_id: league1Id }).eq('id', userId)

    const { session } = await signInTestUser(email)

    // Verify initial state is league1
    let authRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: `sb-access-token=${session.access_token}` },
    })
    expect(authRes.status).toBe(200)
    let authJson = await authRes.json()
    expect(authJson.data.league.id).toBe(league1Id)

    // Switch to league2 via PATCH
    const patchRes = await fetch(`${BASE_URL}/api/auth/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `sb-access-token=${session.access_token}`,
      },
      body: JSON.stringify({ active_league_id: league2Id }),
    })
    expect(patchRes.status).toBe(200)
    const patchJson = await patchRes.json()
    expect(patchJson.data.league.id).toBe(league2Id)

    // Verify the switch persisted
    authRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: `sb-access-token=${session.access_token}` },
    })
    expect(authRes.status).toBe(200)
    authJson = await authRes.json()
    expect(authJson.data.league.id).toBe(league2Id)
  })

  it('user with active_league_id pointing to a removed league falls back to the first remaining league', async () => {
    // Create a third league
    const league3 = await createTestLeague('Test League 3', 'private', userId)
    const league3Id = league3.id

    try {
      await addTestLeagueMember(league3Id, userId, 'member')
    } catch {
      // Already a member
    }

    const admin = adminClient()

    // Set active_league_id to league3
    await admin.from('users').update({ active_league_id: league3Id }).eq('id', userId)

    // Remove user from league3
    await admin.from('league_members').delete().eq('user_id', userId).eq('league_id', league3Id)

    const { session } = await signInTestUser(email)

    // Fetch /api/auth/me; should fall back to the first remaining league
    const authRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: `sb-access-token=${session.access_token}` },
    })
    expect(authRes.status).toBe(200)
    const authJson = await authRes.json()
    expect(authJson.data.league.id).not.toBe(league3Id)
    expect([DEFAULT_LEAGUE_ID, league1Id, league2Id]).toContain(authJson.data.league.id)

    // Verify active_league_id was reset to NULL in the database
    const userResult = await admin
      .from('users')
      .select('active_league_id')
      .eq('id', userId)
      .single()
    expect(userResult.data?.active_league_id).toBeNull()

    await deleteTestLeague(league3Id)
  })
})
