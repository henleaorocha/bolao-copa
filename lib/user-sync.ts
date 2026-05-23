import type { SupabaseClient, User } from '@supabase/supabase-js'

/**
 * Garante que o usuário autenticado existe em public.users.
 * Necessário para usuários que autenticaram antes das migrations serem aplicadas
 * (o trigger on_auth_user_created só cobre logins futuros).
 * League enrollment é agora manipulado apenas pelo DB trigger handle_new_user.
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
}
