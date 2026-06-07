import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const DEFAULT_LEAGUE_ID = '00000000-0000-0000-0000-000000000001'

export function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export function anonClient() {
  return createClient(
    SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function createTestUser(email: string, password = 'Test1234!') {
  const admin = adminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) throw new Error(`createTestUser: ${error.message}`)
  return data.user
}

export async function deleteTestUser(userId: string) {
  const admin = adminClient()
  await admin.auth.admin.deleteUser(userId)
}

export async function signInTestUser(email: string, password = 'Test1234!') {
  const client = anonClient()
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`signInTestUser: ${error.message}`)
  return { session: data.session!, client }
}

export async function createTestMatch(
  homeTeam: string,
  awayTeam: string,
  matchDate: Date = new Date('2026-06-15T18:00:00Z')
) {
  const admin = adminClient()
  const { data, error } = await admin
    .from('matches')
    .insert({
      home_team: homeTeam,
      away_team: awayTeam,
      match_date: matchDate.toISOString(),
      phase: 'group',
      status: 'scheduled',
    })
    .select()
    .single()
  if (error) throw new Error(`createTestMatch: ${error.message}`)
  return data
}

export async function deleteTestMatch(matchId: string) {
  const admin = adminClient()
  await admin.from('matches').delete().eq('id', matchId)
}

export async function createTestPrediction(
  userId: string,
  leagueId: string,
  matchId: string,
  predictedHome: number,
  predictedAway: number
) {
  const admin = adminClient()
  const { data, error } = await admin
    .from('predictions')
    .insert({
      user_id: userId,
      league_id: leagueId,
      match_id: matchId,
      predicted_home_score: predictedHome,
      predicted_away_score: predictedAway,
    })
    .select()
    .single()
  if (error) throw new Error(`createTestPrediction: ${error.message}`)
  return data
}

export async function createTestLeague(
  name: string,
  accessType: 'open' | 'private',
  createdBy: string | null = null
) {
  const admin = adminClient()
  const { data, error } = await admin
    .from('leagues')
    .insert({ name, access_type: accessType, created_by: createdBy })
    .select('id, name, access_type, member_count, created_by, invite_token')
    .single()
  if (error) throw new Error(`createTestLeague: ${error.message}`)
  return data
}

export async function deleteTestLeague(leagueId: string) {
  const admin = adminClient()
  await admin.from('leagues').delete().eq('id', leagueId)
}

export async function addTestLeagueMember(
  leagueId: string,
  userId: string,
  role: 'admin' | 'member' = 'member'
) {
  const admin = adminClient()
  const { data, error } = await admin
    .from('league_members')
    .insert({ league_id: leagueId, user_id: userId, role })
    .select()
    .single()
  if (error) throw new Error(`addTestLeagueMember: ${error.message}`)
  return data
}

/**
 * Convenience wrapper to add a user to the fixed test/default league
 * (`DEFAULT_LEAGUE_ID`). The `handle_new_user()` trigger no longer auto-enrolls
 * new accounts into the test league (PRD league-permissions, ADR-002), so suites
 * that need a user to be a member of it must add the membership explicitly.
 */
export async function addDefaultLeagueMember(
  userId: string,
  role: 'admin' | 'member' = 'member'
) {
  return addTestLeagueMember(DEFAULT_LEAGUE_ID, userId, role)
}

export function authedClient(accessToken: string) {
  return createClient(
    SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    }
  )
}

export { DEFAULT_LEAGUE_ID }
