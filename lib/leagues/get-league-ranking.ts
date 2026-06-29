import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { computeRanking } from '@/lib/ranking'
import { fetchAllLeaguePredictions } from '@/lib/predictions'
import type { RankingFullEntry } from '@/lib/api/types'

// Tag única compartilhada por TODOS os rankings de liga.
//
// Pontos só vêm de partidas `finished` e do palpite de campeão — e ambos só
// mudam por um EVENTO DE RESULTADO. Como a tabela `matches` é global (uma
// partida pertence a todas as ligas), um resultado novo afeta o ranking de
// qualquer liga, então a invalidação é global por design.
//
// Invalide esta tag (`revalidateTag(RANKINGS_CACHE_TAG)`) em:
//   - lançamento manual de resultado (operador)  → /api/admin/matches/[id]/result
//   - sync horário do openfootball                → /api/admin/sync-matches
//   - entrada de novo membro (aparece no ranking) → /api/leagues/[id]/join
// Salvar palpite/aposta de campeão NÃO precisa invalidar: a pontuação visível só
// muda no evento de resultado, que já invalida. O `revalidate` abaixo é uma rede
// de segurança caso algum caminho seja esquecido.
export const RANKINGS_CACHE_TAG = 'rankings'

// Janela máxima de obsolescência (segundos) caso nenhuma invalidação por tag
// dispare. Curta o suficiente para auto-corrigir durante dias de jogo.
const RANKINGS_REVALIDATE_SECONDS = 300

interface UserEmbed {
  full_name: string | null
  avatar_color: string
}

interface MemberRow {
  user_id: string
  joined_at: string
  // PostgREST retorna o join to-one `users` como objeto; tipos gerados antigos o
  // modelam como array — aceite ambos para que full_name sempre resolva.
  users: UserEmbed | UserEmbed[] | null
}

// Computa o ranking completo (COM os campos de campeão/vice) a partir dos dados
// globais da liga. Roda com o service-role: os dados são idênticos para todos os
// membros e a função precisa ser independente do request para ser cacheável (sem
// cookies/headers). A visibilidade dos picks de campeão é decidida fora daqui,
// por request, com base no BET_DEADLINE.
async function computeLeagueRankingUncached(
  leagueId: string
): Promise<RankingFullEntry[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const [membersResult, champBetsResult, predictionsResult, finishedResult] =
    await Promise.all([
      supabase
        .from('league_members')
        .select(
          `
          user_id,
          joined_at,
          users (
            full_name,
            avatar_color
          )
        `
        )
        .eq('league_id', leagueId)
        .order('joined_at', { ascending: true }),
      supabase
        .from('champion_bets')
        .select('user_id, champion_team, runner_up_team')
        .eq('league_id', leagueId),
      fetchAllLeaguePredictions(supabase, leagueId),
      supabase
        .from('matches')
        .select(
          'id, phase, home_team, away_team, home_score, away_score, match_date'
        )
        .eq('status', 'finished'),
    ])

  if (membersResult.error) {
    throw new Error(`ranking members read failed: ${membersResult.error.message}`)
  }
  // Não cacheie um resultado parcial/errado: se a paginação de palpites falhou no
  // meio, lance para abortar o cache (o handler responde 500 e nada fica preso).
  if (predictionsResult.error) {
    throw new Error(
      `ranking predictions read failed: ${predictionsResult.error.message}`
    )
  }

  const members = (membersResult.data as MemberRow[]).map((row) => {
    const u = Array.isArray(row.users) ? row.users[0] : row.users
    return {
      user_id: row.user_id,
      full_name: u?.full_name ?? null,
      avatar_color: u?.avatar_color ?? '',
      joined_at: row.joined_at,
    }
  })

  return computeRanking({
    members,
    predictions: predictionsResult.data,
    finishedMatches: (finishedResult.data ??
      []) as Parameters<typeof computeRanking>[0]['finishedMatches'],
    championBets: (champBetsResult.data ?? []).map((b) => ({
      user_id: b.user_id,
      champion_team: b.champion_team,
      runner_up_team: b.runner_up_team,
    })),
  })
}

// Versão cacheada. A chave inclui o argumento `leagueId`, então cada liga tem sua
// própria entrada; todas compartilham a tag global `RANKINGS_CACHE_TAG`.
export const getCachedLeagueRanking = unstable_cache(
  computeLeagueRankingUncached,
  ['league-ranking-v1'],
  { revalidate: RANKINGS_REVALIDATE_SECONDS, tags: [RANKINGS_CACHE_TAG] }
)
