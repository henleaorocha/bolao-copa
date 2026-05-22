/**
 * DB-level tests for migration 11 (invite_token, member_count, trigger)
 * and migration 12 (active_league_id FK).
 * Require a running local Supabase instance with SUPABASE_SERVICE_ROLE_KEY set.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestUser,
  deleteTestUser,
  createTestLeague,
  deleteTestLeague,
  addTestLeagueMember,
  adminClient,
} from '../fixtures/factories'

const HAS_SERVICE_KEY = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

describe.skipIf(!HAS_SERVICE_KEY)('leagues migration: invite_token & member_count', () => {
  const email = `test-leagues-mig-${Date.now()}@example.com`
  let userId: string
  let leagueId: string

  beforeAll(async () => {
    const user = await createTestUser(email)
    userId = user.id
  })

  afterAll(async () => {
    if (leagueId) await deleteTestLeague(leagueId)
    await deleteTestUser(userId)
  })

  it('invite_token is auto-populated on league INSERT (non-null, 32-char hex)', async () => {
    const league = await createTestLeague('Teste Token', 'open', userId)
    leagueId = league.id
    expect(league.invite_token).toBeTruthy()
    expect(league.invite_token).toHaveLength(32)
    expect(league.invite_token).toMatch(/^[0-9a-f]{32}$/)
  })

  it('member_count is 0 on league creation before any member rows', async () => {
    const admin = adminClient()
    const { data } = await admin
      .from('leagues')
      .select('member_count')
      .eq('id', leagueId)
      .single()
    expect(data!.member_count).toBe(0)
  })

  it('member_count increments by 1 after INSERT into league_members', async () => {
    await addTestLeagueMember(leagueId, userId, 'admin')

    const admin = adminClient()
    const { data } = await admin
      .from('leagues')
      .select('member_count')
      .eq('id', leagueId)
      .single()
    expect(data!.member_count).toBe(1)
  })

  it('member_count decrements by 1 after DELETE from league_members', async () => {
    const admin = adminClient()
    await admin
      .from('league_members')
      .delete()
      .eq('league_id', leagueId)
      .eq('user_id', userId)

    const { data } = await admin
      .from('leagues')
      .select('member_count')
      .eq('id', leagueId)
      .single()
    expect(data!.member_count).toBe(0)
  })
})

describe.skipIf(!HAS_SERVICE_KEY)('leagues migration: active_league_id FK on users', () => {
  const emailA = `test-active-league-${Date.now()}@example.com`
  let userId: string
  let leagueId: string

  beforeAll(async () => {
    const user = await createTestUser(emailA)
    userId = user.id
    const league = await createTestLeague('Liga Ativa Test', 'open', userId)
    leagueId = league.id
  })

  afterAll(async () => {
    await deleteTestUser(userId)
    // League is deleted via cascade when user is deleted, or explicitly below
    const admin = adminClient()
    await admin.from('leagues').delete().eq('id', leagueId)
  })

  it('active_league_id accepts NULL (default state)', async () => {
    const admin = adminClient()
    const { data, error } = await admin
      .from('users')
      .select('active_league_id')
      .eq('id', userId)
      .single()
    expect(error).toBeNull()
    expect(data!.active_league_id).toBeNull()
  })

  it('active_league_id accepts a valid leagues.id', async () => {
    const admin = adminClient()
    const { error } = await admin
      .from('users')
      .update({ active_league_id: leagueId })
      .eq('id', userId)
    expect(error).toBeNull()

    const { data } = await admin
      .from('users')
      .select('active_league_id')
      .eq('id', userId)
      .single()
    expect(data!.active_league_id).toBe(leagueId)
  })

  it('active_league_id is set to NULL via FK ON DELETE SET NULL when the league is deleted', async () => {
    const admin = adminClient()
    await admin.from('leagues').delete().eq('id', leagueId)
    leagueId = '' // already deleted

    const { data, error } = await admin
      .from('users')
      .select('active_league_id')
      .eq('id', userId)
      .single()
    expect(error).toBeNull()
    expect(data!.active_league_id).toBeNull()
  })
})
