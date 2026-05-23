/**
 * Unit tests for resolveActiveLeague utility function.
 * Requires a running local Supabase instance.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { resolveActiveLeague } from '@/lib/resolve-active-league'
import {
  createTestUser,
  deleteTestUser,
  adminClient,
  createTestLeague,
  deleteTestLeague,
  addTestLeagueMember,
} from '../fixtures/factories'

const HAS_SERVICE_KEY = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

describe.skipIf(!HAS_SERVICE_KEY)('resolveActiveLeague', () => {
  const email = `test-resolve-${Date.now()}@example.com`
  let userId: string
  let league1Id: string
  let league2Id: string

  beforeAll(async () => {
    const user = await createTestUser(email)
    userId = user.id

    // Create two test leagues
    const league1 = await createTestLeague('League 1', 'private', userId)
    league1Id = league1.id

    const league2 = await createTestLeague('League 2', 'private', userId)
    league2Id = league2.id

    // Add user to both
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

  it('returns active_league_id when user is still a member', async () => {
    const admin = adminClient()

    // Set active_league_id to league1
    await admin.from('users').update({ active_league_id: league1Id }).eq('id', userId)

    const result = await resolveActiveLeague(admin, userId)

    expect(result).toBe(league1Id)
  })

  it('returns fallback league when active_league_id is NULL', async () => {
    const admin = adminClient()

    // Set active_league_id to NULL
    await admin.from('users').update({ active_league_id: null }).eq('id', userId)

    const result = await resolveActiveLeague(admin, userId)

    // Should return the first league by joined_at
    expect([league1Id, league2Id]).toContain(result)
  })

  it('resets active_league_id to NULL when user is not a member of the active league', async () => {
    const admin = adminClient()

    // Set active_league_id to league1
    await admin.from('users').update({ active_league_id: league1Id }).eq('id', userId)

    // Remove user from league1
    await admin.from('league_members').delete().eq('user_id', userId).eq('league_id', league1Id)

    // Call resolveActiveLeague
    const result = await resolveActiveLeague(admin, userId)

    // Should return league2 (the fallback)
    expect(result).toBe(league2Id)

    // Verify active_league_id was reset
    const userResult = await admin
      .from('users')
      .select('active_league_id')
      .eq('id', userId)
      .single()
    expect(userResult.data?.active_league_id).toBeNull()

    // Re-add user to league1 for next tests
    await addTestLeagueMember(league1Id, userId, 'member')
  })

  it('returns null when user has no leagues', async () => {
    const admin = adminClient()

    // Create a second user with no leagues
    const testUser = await createTestUser(`test-no-leagues-${Date.now()}@example.com`)
    const testUserId = testUser.id

    try {
      const result = await resolveActiveLeague(admin, testUserId)
      expect(result).toBeNull()
    } finally {
      await deleteTestUser(testUserId)
    }
  })
})
