import { redirect } from 'next/navigation'
import Image from 'next/image'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { ensureUserSynced } from '@/lib/user-sync'
import LogoutButton from '@/components/LogoutButton'

const DEFAULT_LEAGUE_ID = '00000000-0000-0000-0000-000000000001'

export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Garante que o usuário existe em public.users e league_members
  // (necessário se autenticou antes das migrations serem aplicadas)
  await ensureUserSynced(supabase, user)

  const [userResult, memberResult, leagueResult] = await Promise.all([
    supabase
      .from('users')
      .select('id, email, full_name, avatar_url, avatar_color, created_at')
      .eq('id', user.id)
      .single(),
    supabase
      .from('league_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('league_id', DEFAULT_LEAGUE_ID)
      .single(),
    supabase
      .from('leagues')
      .select('id, name, access_type, logo_url')
      .eq('id', DEFAULT_LEAGUE_ID)
      .single(),
  ])

  if (userResult.error || memberResult.error || leagueResult.error) {
    const failedQuery = userResult.error
      ? `users: ${userResult.error.message}`
      : memberResult.error
        ? `league_members: ${memberResult.error.message}`
        : `leagues: ${leagueResult.error!.message}`
    console.error('[dashboard] Query falhou:', failedQuery)
    throw new Error('Erro ao carregar dados do usuário')
  }

  const userData = userResult.data
  const league = { ...leagueResult.data, role: memberResult.data.role }
  const displayName = userData.full_name ?? 'Usuário'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-semibold text-gray-900">
            Bolão da Copa 2026
          </h1>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            {userData.avatar_url ? (
              <Image
                src={userData.avatar_url}
                alt={`Avatar de ${displayName}`}
                width={56}
                height={56}
                className="rounded-full"
              />
            ) : (
              <div
                aria-hidden="true"
                style={{ backgroundColor: userData.avatar_color ?? '#FFC72C' }}
                className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white"
              >
                {displayName[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-base font-semibold text-gray-900">
                {displayName}
              </p>
              <p className="text-sm text-gray-500">{userData.email}</p>
            </div>
          </div>

          <hr className="my-6 border-gray-100" />

          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
              Liga
            </p>
            <p className="text-base font-semibold text-gray-900">
              {league.name}
            </p>
            <p className="text-sm text-gray-500 capitalize">{league.role}</p>
          </div>
        </div>
      </main>
    </div>
  )
}
