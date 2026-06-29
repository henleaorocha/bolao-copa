import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { formatSuccess, formatError } from '@/lib/api/responses'
import { getCachedLeagueRanking } from '@/lib/leagues/get-league-ranking'
import { BET_DEADLINE } from '@/lib/copa-teams'
import type { RankingFullEntry } from '@/lib/api/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const start = Date.now()

  const allowedParams: string[] = []
  for (const key of request.nextUrl.searchParams.keys()) {
    if (!allowedParams.includes(key)) {
      return NextResponse.json(
        formatError('INVALID_PARAMS', 'Parâmetros inválidos na requisição', 400),
        { status: 400 }
      )
    }
  }

  try {
    const supabase = await getSupabaseServerClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        formatError('SESSION_EXPIRED', 'Sessão expirada', 401),
        { status: 401 }
      )
    }

    const { id: leagueId } = await params

    const leagueResult = await supabase
      .from('leagues')
      .select('id')
      .eq('id', leagueId)
      .single()

    if (leagueResult.error) {
      return NextResponse.json(
        formatError('LEAGUE_NOT_FOUND', 'Liga não encontrada', 404),
        { status: 404 }
      )
    }

    const membershipCheck = await supabase
      .from('league_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('league_id', leagueId)
      .single()

    if (membershipCheck.error) {
      return NextResponse.json(
        formatError('NOT_A_MEMBER', 'Usuário não é membro desta liga', 403),
        { status: 403 }
      )
    }

    // Cálculo pesado (todos os palpites + membros + partidas + computeRanking)
    // memoizado por liga e compartilhado por todos os membros. Invalidado por tag
    // em eventos de resultado (sync, lançamento manual) e em novas entradas.
    // Inclui os campos de campeão/vice; a visibilidade é decidida abaixo.
    const fullRanking = await getCachedLeagueRanking(leagueId)

    // Champion/runner-up picks are private until betting closes, so members
    // can't copy each other's votes. Strip them from the payload entirely
    // before the deadline; afterwards every member's picks are public.
    // Não mutamos os objetos do cache: geramos cópias por request.
    const ranking: RankingFullEntry[] =
      Date.now() < BET_DEADLINE.getTime()
        ? fullRanking.map((entry) => ({
            ...entry,
            champion_team: null,
            runner_up_team: null,
          }))
        : fullRanking

    const duration = Date.now() - start
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        endpoint: '/api/leagues/[id]/ranking',
        method: 'GET',
        user_id: user.id,
        league_id: leagueId,
        status_code: 200,
        duration_ms: duration,
      })
    )

    return NextResponse.json(formatSuccess({ ranking }), { status: 200 })
  } catch (err) {
    const duration = Date.now() - start
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        endpoint: '/api/leagues/[id]/ranking',
        method: 'GET',
        duration_ms: duration,
        error: err instanceof Error ? err.message : 'unknown',
      })
    )
    return NextResponse.json(
      formatError('DATABASE_ERROR', 'Erro ao buscar ranking', 500),
      { status: 500 }
    )
  }
}
