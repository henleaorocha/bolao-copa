import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { computeStandings } from '@/lib/standings'
import StandingsGrid from '@/app/ligas/[id]/components/StandingsGrid'
import type { Match } from '@/lib/api/types'

export default async function TabelaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: leagueId } = await params
  const supabase = await getSupabaseServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/ligas')
  }

  const leagueResult = await supabase
    .from('leagues')
    .select('id')
    .eq('id', leagueId)
    .single()

  if (leagueResult.error) {
    redirect('/ligas')
  }

  const membershipCheck = await supabase
    .from('league_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('league_id', leagueId)
    .single()

  if (membershipCheck.error) {
    redirect('/ligas')
  }

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .eq('phase', 'group')

  const matchList: Match[] = (matches ?? []) as Match[]
  const standings = computeStandings(matchList)

  return (
    <div>
      <div className="px-6 py-6">
        <p className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-1">
          FASE DE GRUPOS
        </p>
        <h1 className="text-2xl font-bold text-slate-900">Tabela da Copa</h1>
        <p className="text-sm text-slate-500 mt-1">
          Classificação oficial — 12 grupos, 48 seleções
        </p>
      </div>
      <StandingsGrid standings={standings} />
    </div>
  )
}
