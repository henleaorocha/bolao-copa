/**
 * SECURITY-CRITICAL: RLS enforcement tests for the 5 new league policies
 * introduced in migration 12, plus private league visibility.
 * Require a running local Supabase instance with SUPABASE_SERVICE_ROLE_KEY set.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestUser,
  deleteTestUser,
  signInTestUser,
  createTestLeague,
  deleteTestLeague,
  addTestLeagueMember,
  authedClient,
  adminClient,
} from '../fixtures/factories'

const HAS_SERVICE_KEY = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

describe.skipIf(!HAS_SERVICE_KEY)('RLS: leagues policies', () => {
  const emailAdmin = `test-rls-leagues-admin-${Date.now()}@example.com`
  const emailMember = `test-rls-leagues-member-${Date.now()}@example.com`
  let adminUserId: string
  let memberUserId: string
  let leagueId: string

  beforeAll(async () => {
    const [adminUser, memberUser] = await Promise.all([
      createTestUser(emailAdmin),
      createTestUser(emailMember),
    ])
    adminUserId = adminUser.id
    memberUserId = memberUser.id

    const league = await createTestLeague('RLS Test League', 'open', adminUserId)
    leagueId = league.id
    await addTestLeagueMember(leagueId, adminUserId, 'admin')
    await addTestLeagueMember(leagueId, memberUserId, 'member')
  })

  afterAll(async () => {
    if (leagueId) await deleteTestLeague(leagueId)
    await Promise.all([deleteTestUser(adminUserId), deleteTestUser(memberUserId)])
  })

  describe('leagues_insert policy', () => {
    let newLeagueId: string

    afterAll(async () => {
      if (newLeagueId) await deleteTestLeague(newLeagueId)
    })

    it('authenticated user can INSERT a league where created_by = auth.uid()', async () => {
      const { session } = await signInTestUser(emailAdmin)
      const client = authedClient(session.access_token)

      const { data, error } = await client
        .from('leagues')
        .insert({ name: 'My New League', access_type: 'open', created_by: adminUserId })
        .select('id')
        .single()

      expect(error).toBeNull()
      expect(data).toBeTruthy()
      newLeagueId = data!.id
    })

    it('authenticated user cannot INSERT a league for a different created_by', async () => {
      const { session } = await signInTestUser(emailMember)
      const client = authedClient(session.access_token)

      const { error } = await client
        .from('leagues')
        .insert({ name: 'Sneaky League', access_type: 'open', created_by: adminUserId })
        .select('id')

      expect(error).not.toBeNull()
    })

    it('anonymous user cannot INSERT a league', async () => {
      const { createClient } = await import('@supabase/supabase-js')
      const anonCl = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )

      const { error } = await anonCl
        .from('leagues')
        .insert({ name: 'Anon League', access_type: 'open', created_by: adminUserId })
        .select('id')

      expect(error).not.toBeNull()
    })
  })

  describe('leagues_admin_update policy', () => {
    it('admin (created_by) can UPDATE their own league', async () => {
      const { session } = await signInTestUser(emailAdmin)
      const client = authedClient(session.access_token)

      const { error } = await client
        .from('leagues')
        .update({ name: 'Updated League Name' })
        .eq('id', leagueId)

      expect(error).toBeNull()

      const { data: afterUpdate } = await adminClient()
        .from('leagues')
        .select('name')
        .eq('id', leagueId)
        .single()
      expect(afterUpdate!.name).toBe('Updated League Name')

      // Restore name
      await adminClient().from('leagues').update({ name: 'RLS Test League' }).eq('id', leagueId)
    })

    it('non-admin member cannot UPDATE the league', async () => {
      const { session } = await signInTestUser(emailMember)
      const client = authedClient(session.access_token)

      const { error } = await client
        .from('leagues')
        .update({ name: 'Hijacked' })
        .eq('id', leagueId)

      // RLS silently blocks the UPDATE (0 rows affected, no error from PostgREST)
      // Verify name was NOT changed
      const { data } = await adminClient()
        .from('leagues')
        .select('name')
        .eq('id', leagueId)
        .single()

      expect(data!.name).toBe('RLS Test League')
      void error
    })
  })

  describe('leagues_admin_delete policy', () => {
    it('admin can DELETE their own league', async () => {
      const adminLeague = await createTestLeague('Admin Delete Test', 'open', adminUserId)
      const { session } = await signInTestUser(emailAdmin)
      const client = authedClient(session.access_token)

      const { error } = await client
        .from('leagues')
        .delete()
        .eq('id', adminLeague.id)

      expect(error).toBeNull()

      const { data } = await adminClient()
        .from('leagues')
        .select('id')
        .eq('id', adminLeague.id)
      expect(data).toHaveLength(0)
    })

    it('non-admin member cannot DELETE the league', async () => {
      const { session } = await signInTestUser(emailMember)
      const client = authedClient(session.access_token)

      await client.from('leagues').delete().eq('id', leagueId)

      // League should still exist
      const { data } = await adminClient()
        .from('leagues')
        .select('id')
        .eq('id', leagueId)
      expect(data).toHaveLength(1)
    })
  })

  describe('league_members_self_insert policy', () => {
    const emailC = `test-rls-member-c-${Date.now()}@example.com`
    let userCId: string

    beforeAll(async () => {
      const userC = await createTestUser(emailC)
      userCId = userC.id
    })

    afterAll(async () => {
      await adminClient().from('league_members').delete().eq('user_id', userCId)
      await deleteTestUser(userCId)
    })

    it('authenticated user can INSERT themselves as a member', async () => {
      const { session } = await signInTestUser(emailC)
      const client = authedClient(session.access_token)

      const { error } = await client
        .from('league_members')
        .insert({ league_id: leagueId, user_id: userCId, role: 'member' })

      expect(error).toBeNull()
    })

    it('authenticated user cannot INSERT a row for another user_id', async () => {
      const { session } = await signInTestUser(emailMember)
      const client = authedClient(session.access_token)

      const { error } = await client
        .from('league_members')
        .insert({ league_id: leagueId, user_id: adminUserId, role: 'member' })

      expect(error).not.toBeNull()
    })
  })

  describe('league_members_admin_delete policy', () => {
    const emailD = `test-rls-member-d-${Date.now()}@example.com`
    let userDId: string
    let memberRowId: string

    beforeAll(async () => {
      const userD = await createTestUser(emailD)
      userDId = userD.id
      const row = await addTestLeagueMember(leagueId, userDId, 'member')
      memberRowId = row.id
    })

    afterAll(async () => {
      await adminClient().from('league_members').delete().eq('user_id', userDId)
      await deleteTestUser(userDId)
    })

    it('league admin can DELETE any member row in their league', async () => {
      const { session } = await signInTestUser(emailAdmin)
      const client = authedClient(session.access_token)

      const { error } = await client
        .from('league_members')
        .delete()
        .eq('id', memberRowId)

      expect(error).toBeNull()

      const { data } = await adminClient()
        .from('league_members')
        .select('id')
        .eq('id', memberRowId)
      expect(data).toHaveLength(0)
    })

    it('non-admin member cannot DELETE another member row', async () => {
      // Re-add userD so there's a row to try to delete
      const row = await addTestLeagueMember(leagueId, userDId, 'member')
      memberRowId = row.id

      const { session } = await signInTestUser(emailMember)
      const client = authedClient(session.access_token)

      await client.from('league_members').delete().eq('id', memberRowId)

      // Row should still exist
      const { data } = await adminClient()
        .from('league_members')
        .select('id')
        .eq('id', memberRowId)
      expect(data).toHaveLength(1)
    })
  })

  describe('private league visibility (leagues_select_open policy)', () => {
    const emailE = `test-rls-outsider-${Date.now()}@example.com`
    let userEId: string
    let privateLeagueId: string

    beforeAll(async () => {
      const userE = await createTestUser(emailE)
      userEId = userE.id
      const league = await createTestLeague('Private League', 'private', adminUserId)
      privateLeagueId = league.id
    })

    afterAll(async () => {
      if (privateLeagueId) await deleteTestLeague(privateLeagueId)
      await deleteTestUser(userEId)
    })

    it('non-member cannot SELECT a private league', async () => {
      const { session } = await signInTestUser(emailE)
      const client = authedClient(session.access_token)

      const { data } = await client
        .from('leagues')
        .select('id')
        .eq('id', privateLeagueId)

      expect(data).toHaveLength(0)
    })

    it('member CAN SELECT the private league they belong to', async () => {
      await addTestLeagueMember(privateLeagueId, adminUserId, 'admin')

      const { session } = await signInTestUser(emailAdmin)
      const client = authedClient(session.access_token)

      const { data } = await client
        .from('leagues')
        .select('id')
        .eq('id', privateLeagueId)

      expect(data).toHaveLength(1)
    })
  })
})
