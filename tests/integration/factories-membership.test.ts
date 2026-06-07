/**
 * Fixture-level contract: explicit league membership.
 *
 * The `handle_new_user()` trigger no longer auto-enrolls new accounts into the
 * test league (PRD league-permissions, ADR-002 / task_02). This suite pins the
 * new default: a freshly created test user has ZERO `league_members` rows until
 * a membership is added explicitly via the factories.
 *
 * Requires a running local Supabase instance with SUPABASE_SERVICE_ROLE_KEY set.
 */
import { describe, it, expect, afterEach } from 'vitest'
import {
  createTestUser,
  deleteTestUser,
  adminClient,
  addDefaultLeagueMember,
  DEFAULT_LEAGUE_ID,
} from '../fixtures/factories'

const HAS_SERVICE_KEY = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

describe.skipIf(!HAS_SERVICE_KEY)('factories — explicit league membership', () => {
  let createdUserId: string | undefined

  afterEach(async () => {
    if (createdUserId) {
      await deleteTestUser(createdUserId)
      // public.users has no ON DELETE CASCADE from auth.users; drop the orphan.
      await adminClient().from('users').delete().eq('id', createdUserId)
      createdUserId = undefined
    }
  })

  it('a user created via createTestUser() has zero league_members rows', async () => {
    const user = await createTestUser(`test-factory-empty-${Date.now()}@example.com`)
    createdUserId = user.id

    const { data, error } = await adminClient()
      .from('league_members')
      .select('league_id, role')
      .eq('user_id', user.id)

    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('addDefaultLeagueMember() makes the user a member of the test league', async () => {
    const user = await createTestUser(`test-factory-member-${Date.now()}@example.com`)
    createdUserId = user.id

    await addDefaultLeagueMember(user.id, 'member')

    const { data, error } = await adminClient()
      .from('league_members')
      .select('league_id, role')
      .eq('user_id', user.id)
      .eq('league_id', DEFAULT_LEAGUE_ID)
      .single()

    expect(error).toBeNull()
    expect(data).not.toBeNull()
    expect(data!.league_id).toBe(DEFAULT_LEAGUE_ID)
    expect(data!.role).toBe('member')
  })
})
