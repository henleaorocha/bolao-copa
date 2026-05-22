/**
 * Database constraint tests.
 * Require a running local Supabase instance with SUPABASE_SERVICE_ROLE_KEY set.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestUser,
  deleteTestUser,
  createTestMatch,
  deleteTestMatch,
  createTestPrediction,
  adminClient,
  DEFAULT_LEAGUE_ID,
} from '../fixtures/factories'

const HAS_SERVICE_KEY = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

describe.skipIf(!HAS_SERVICE_KEY)('Database constraints', () => {
  let userId: string
  let matchId: string

  beforeAll(async () => {
    const email = `test-db-${Date.now()}@example.com`
    const [user, match] = await Promise.all([
      createTestUser(email),
      createTestMatch('Espanha', 'Portugal'),
    ])
    userId = user.id
    matchId = match.id
  })

  afterAll(async () => {
    await deleteTestMatch(matchId)
    await deleteTestUser(userId)
  })

  it('new user is auto-enrolled in default league via trigger', async () => {
    const admin = adminClient()
    const { data, error } = await admin
      .from('league_members')
      .select('*')
      .eq('user_id', userId)
      .eq('league_id', DEFAULT_LEAGUE_ID)

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0].role).toBe('member')
  })

  it('FK violation: prediction with invalid match_id fails', async () => {
    const admin = adminClient()
    const { error } = await admin.from('predictions').insert({
      user_id: userId,
      league_id: DEFAULT_LEAGUE_ID,
      match_id: '00000000-0000-0000-0000-000000000000', // non-existent
      predicted_home_score: 1,
      predicted_away_score: 0,
    })
    expect(error).not.toBeNull()
  })

  it('unique constraint: duplicate prediction for same (user, league, match) fails', async () => {
    await createTestPrediction(userId, DEFAULT_LEAGUE_ID, matchId, 2, 1)

    const admin = adminClient()
    const { error } = await admin.from('predictions').insert({
      user_id: userId,
      league_id: DEFAULT_LEAGUE_ID,
      match_id: matchId,
      predicted_home_score: 3,
      predicted_away_score: 0,
    })

    expect(error).not.toBeNull()
    expect(error!.code).toBe('23505') // unique_violation
  })

  it('FK violation: champion_bet with invalid league_id fails', async () => {
    const admin = adminClient()
    const { error } = await admin.from('champion_bets').insert({
      user_id: userId,
      league_id: '00000000-0000-0000-0000-000000000999', // non-existent
      champion_team: 'Brasil',
    })
    expect(error).not.toBeNull()
  })
})
