import type { SupabaseClient, User } from '@supabase/supabase-js'

const DEFAULT_LEAGUE_ID = '00000000-0000-0000-0000-000000000001'

/**
 * Garante que o usuário autenticado existe em public.users e em league_members.
 * Necessário para usuários que autenticaram antes das migrations serem aplicadas
 * (o trigger on_auth_user_created só cobre logins futuros).
 */
export async function ensureUserSynced(supabase: SupabaseClient, authUser: User) {
  await supabase.from('users').upsert(
    {
      id: authUser.id,
      email: authUser.email!,
      full_name: authUser.user_metadata?.full_name ?? null,
      avatar_url: authUser.user_metadata?.avatar_url ?? null,
    },
    { onConflict: 'id', ignoreDuplicates: true }
  )

  await supabase.from('league_members').upsert(
    { league_id: DEFAULT_LEAGUE_ID, user_id: authUser.id, role: 'member' },
    { onConflict: 'league_id,user_id', ignoreDuplicates: true }
  )
}
