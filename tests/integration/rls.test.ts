/**
 * SECURITY-CRITICAL: RLS enforcement tests.
 * Require a running local Supabase instance with SUPABASE_SERVICE_ROLE_KEY set.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestUser,
  deleteTestUser,
  signInTestUser,
  createTestMatch,
  deleteTestMatch,
  createTestPrediction,
  DEFAULT_LEAGUE_ID,
} from '../fixtures/factories'
import { createClient } from '@supabase/supabase-js'

const HAS_SERVICE_KEY = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

describe.skipIf(!HAS_SERVICE_KEY)('RLS enforcement', () => {
  const emailA = `test-rls-a-${Date.now()}@example.com`
  const emailB = `test-rls-b-${Date.now()}@example.com`
  let userAId: string
  let userBId: string
  let matchId: string

  beforeAll(async () => {
    const [userA, userB, match] = await Promise.all([
      createTestUser(emailA),
      createTestUser(emailB),
      createTestMatch('Brasil', 'Argentina'),
    ])
    userAId = userA.id
    userBId = userB.id
    matchId = match.id
  })

  afterAll(async () => {
    await deleteTestMatch(matchId)
    await Promise.all([deleteTestUser(userAId), deleteTestUser(userBId)])
  })

  it('user A can read their own predictions', async () => {
    const { session } = await signInTestUser(emailA)
    const predA = await createTestPrediction(userAId, DEFAULT_LEAGUE_ID, matchId, 2, 1)

    const clientA = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${session.access_token}` } },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    )

    const { data, error } = await clientA
      .from('predictions')
      .select('*')
      .eq('id', predA.id)

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0].id).toBe(predA.id)
  })

  it('user A cannot read user B predictions', async () => {
    const { session: sessionA } = await signInTestUser(emailA)
    const { session: sessionB } = await signInTestUser(emailB)

    // Create a second match to avoid unique constraint conflicts
    const match2 = await createTestMatch('França', 'Alemanha')
    const predB = await createTestPrediction(userBId, DEFAULT_LEAGUE_ID, match2.id, 1, 0)

    const clientA = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${sessionA.access_token}` } },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    )

    const { data } = await clientA
      .from('predictions')
      .select('*')
      .eq('id', predB.id)

    // RLS: user A should get no rows
    expect(data).toHaveLength(0)

    await deleteTestMatch(match2.id)
    void sessionB // suppress unused warning
  })

  it('user A cannot read user B champion_bets', async () => {
    const { session: sessionA } = await signInTestUser(emailA)
    const { session: sessionB } = await signInTestUser(emailB)
    const admin = (await import('../fixtures/factories')).adminClient()

    const { data: betB } = await admin
      .from('champion_bets')
      .insert({ user_id: userBId, league_id: DEFAULT_LEAGUE_ID, champion_team: 'Brasil' })
      .select()
      .single()

    const clientA = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${sessionA.access_token}` } },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    )

    const { data } = await clientA
      .from('champion_bets')
      .select('*')
      .eq('id', betB!.id)

    expect(data).toHaveLength(0)
    void sessionB
  })
})
