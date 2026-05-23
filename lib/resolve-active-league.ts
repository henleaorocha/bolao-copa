import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Resolves the user's active league from the database.
 * 1. If active_league_id is set and user is still a member, use it.
 * 2. If active_league_id is not set or user is no longer a member, fall back to the first league by joined_at ASC.
 * 3. If user has no leagues, returns null.
 *
 * When active_league_id points to a league the user is no longer a member of,
 * this function resets active_league_id to NULL in the database.
 */
export async function resolveActiveLeague(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  // Fetch the user's current active_league_id
  const userResult = await supabase
    .from('users')
    .select('active_league_id')
    .eq('id', userId)
    .single()

  if (userResult.error) {
    throw new Error(`Failed to fetch user: ${userResult.error.message}`)
  }

  let activeLeagueId = userResult.data.active_league_id
  let effectiveLeagueId: string | null = null

  // If active_league_id is set, verify the user is still a member
  if (activeLeagueId) {
    const membershipCheck = await supabase
      .from('league_members')
      .select('user_id')
      .eq('user_id', userId)
      .eq('league_id', activeLeagueId)
      .single()

    if (!membershipCheck.error) {
      // User is still a member; use this league
      effectiveLeagueId = activeLeagueId
    } else {
      // User is no longer a member; reset active_league_id to NULL
      const updateResult = await supabase
        .from('users')
        .update({ active_league_id: null })
        .eq('id', userId)

      if (updateResult.error) {
        console.error(`Failed to reset active_league_id: ${updateResult.error.message}`)
      }
      activeLeagueId = null
    }
  }

  // If no effective league yet, fall back to the first league_members row by joined_at ASC
  if (!effectiveLeagueId) {
    const fallbackResult = await supabase
      .from('league_members')
      .select('league_id')
      .eq('user_id', userId)
      .order('joined_at', { ascending: true })
      .limit(1)
      .single()

    if (fallbackResult.error) {
      // User has no leagues
      return null
    }

    effectiveLeagueId = fallbackResult.data.league_id
  }

  return effectiveLeagueId
}
