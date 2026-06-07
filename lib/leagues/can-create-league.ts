import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Returns whether the given user is allowed to create leagues.
 * Reads users.can_create_league; defaults to false on any missing row or query error.
 */
export async function canCreateLeague(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .select('can_create_league')
    .eq('id', userId)
    .single()

  if (error || !data) return false
  return data.can_create_league === true
}
