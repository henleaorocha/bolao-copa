import { getSupabaseServerClient } from '@/lib/supabase/client'
import { JoinButton } from './JoinButton'

interface JoinPageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const { token } = await searchParams

  // Validate token parameter
  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-md">
          <h1 className="mb-4 text-center text-xl font-bold text-gray-900">
            Link de Convite Inválido
          </h1>
          <p className="mb-6 text-center text-sm text-gray-600">
            O link que você está usando não é válido ou expirou. Tente solicitar um novo convite do administrador da liga.
          </p>
          <a
            href="/ligas"
            className="block rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700"
          >
            Voltar para Ligas
          </a>
        </div>
      </div>
    )
  }

  const supabase = await getSupabaseServerClient()

  // Get current user (may be null if unauthenticated)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Query league by invite_token (includes token in SELECT for validation)
  const leagueResult = await supabase
    .from('leagues')
    .select('id, name, access_type, logo_url, member_count, invite_token')
    .eq('invite_token', token.trim())
    .single()

  if (leagueResult.error || !leagueResult.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-md">
          <h1 className="mb-4 text-center text-xl font-bold text-gray-900">
            Liga Não Encontrada
          </h1>
          <p className="mb-6 text-center text-sm text-gray-600">
            Não conseguimos encontrar a liga associada a este link. Verifique se o link está correto e tente novamente.
          </p>
          <a
            href="/ligas"
            className="block rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700"
          >
            Voltar para Ligas
          </a>
        </div>
      </div>
    )
  }

  const league = leagueResult.data

  // If user is authenticated, check if they're already a member
  if (user) {
    const membershipCheck = await supabase
      .from('league_members')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('league_id', league.id)
      .single()

    if (!membershipCheck.error) {
      // User is already a member
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-md">
            <h1 className="mb-4 text-center text-xl font-bold text-gray-900">
              Você já é membro
            </h1>
            <p className="mb-6 text-center text-sm text-gray-600">
              Você já é membro de <strong>{league.name}</strong>.
            </p>
            <a
              href={`/ligas/${league.id}`}
              className="block rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700"
            >
              Ver Liga
            </a>
          </div>
        </div>
      )
    }
  }

  // Show league preview with join button
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-md">
        <div className="mb-6 text-center">
          {league.logo_url ? (
            <img
              src={league.logo_url}
              alt={league.name}
              className="mx-auto mb-4 h-20 w-20 rounded-lg object-cover"
            />
          ) : (
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-blue-600">
              <span className="text-2xl font-bold text-white">
                {league.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            {league.name}
          </h1>
          <p className="text-sm text-gray-600">
            {league.member_count} {league.member_count === 1 ? 'membro' : 'membros'}
          </p>
        </div>

        <JoinButton leagueId={league.id} token={token} />

        {!user && (
          <p className="mt-4 text-center text-xs text-gray-500">
            Você será redirecionado para fazer login se necessário.
          </p>
        )}
      </div>
    </div>
  )
}
