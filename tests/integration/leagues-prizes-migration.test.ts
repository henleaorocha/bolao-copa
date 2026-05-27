/**
 * Integration tests for migration 20260525000017_add_leagues_prizes.sql.
 * Verifies that `leagues.prizes TEXT` column exists, is nullable, and accepts text values.
 * Require a running local Supabase instance with SUPABASE_SERVICE_ROLE_KEY set.
 *
 * Unit tests: N/A — this task is a pure SQL migration with no executable code paths.
 * Coverage target: N/A.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestUser,
  deleteTestUser,
  createTestLeague,
  deleteTestLeague,
  adminClient,
} from '../fixtures/factories'

const HAS_SERVICE_KEY = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

describe.skipIf(!HAS_SERVICE_KEY)('leagues.prizes column migration (20260525000017)', () => {
  const email = `test-prizes-migration-${Date.now()}@example.com`
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

  it('SELECT prizes FROM leagues executes without error', async () => {
    const admin = adminClient()
    const { error } = await admin.from('leagues').select('prizes').limit(1)
    expect(error).toBeNull()
  })

  it('existing league row has prizes = null (no default value injected)', async () => {
    const league = await createTestLeague(`Prizes Null Test ${Date.now()}`, 'open', userId)
    leagueId = league.id

    const admin = adminClient()
    const { data, error } = await admin
      .from('leagues')
      .select('prizes')
      .eq('id', leagueId)
      .single()

    expect(error).toBeNull()
    expect((data as any).prizes).toBeNull()
  })

  it('inserting a league row with prizes = null succeeds', async () => {
    const admin = adminClient()
    const { data, error } = await admin
      .from('leagues')
      .insert({ name: `Prizes NULL ${Date.now()}`, access_type: 'open', created_by: userId, prizes: null })
      .select('id, prizes')
      .single()

    expect(error).toBeNull()
    expect((data as any).prizes).toBeNull()

    if (data) await admin.from('leagues').delete().eq('id', (data as any).id)
  })

  it("inserting a league row with prizes = 'R$ 500 pro 1º' succeeds", async () => {
    const admin = adminClient()
    const { data, error } = await admin
      .from('leagues')
      .insert({
        name: `Prizes Text ${Date.now()}`,
        access_type: 'open',
        created_by: userId,
        prizes: 'R$ 500 pro 1º',
      })
      .select('id, prizes')
      .single()

    expect(error).toBeNull()
    expect((data as any).prizes).toBe('R$ 500 pro 1º')

    if (data) await admin.from('leagues').delete().eq('id', (data as any).id)
  })
})
