import type { SupabaseClient, User } from '@supabase/supabase-js'

/**
 * Garante que o usuário autenticado existe em public.users.
 * Necessário para usuários que autenticaram antes das migrations serem aplicadas
 * (o trigger on_auth_user_created só cobre logins futuros).
 * League enrollment é agora manipulado apenas pelo DB trigger handle_new_user.
 */
export async function ensureUserSynced(supabase: SupabaseClient, authUser: User) {
  const { error } = await supabase.from('users').upsert(
    {
      id: authUser.id,
      email: authUser.email!,
      full_name: authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? null,
      avatar_url: authUser.user_metadata?.avatar_url ?? authUser.user_metadata?.picture ?? null,
    },
    { onConflict: 'id', ignoreDuplicates: true }
  )

  // Don't throw: callers treat a present-or-created row as best-effort. But a
  // silent failure here is what causes the downstream FK 500 on join, so make it
  // visible in logs instead of swallowing it entirely.
  if (error) {
    console.error('[ensureUserSynced] Falha ao garantir public.users:', error.message)
  }
}
