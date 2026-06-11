import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { formatSuccess, formatError } from '@/lib/api/responses'
import type { Match, MatchWithPrediction } from '@/lib/api/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const start = Date.now()

  const sp = request.nextUrl.searchParams
  const nextParam = sp.get('next')
  const phaseParam = sp.get('phase')
  const dateParam = sp.get('date')
  const groupParam = sp.get('group')

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

    let matchesQuery = supabase
      .from('matches')
      .select('*')
      .order('match_date', { ascending: true })

    if (phaseParam === 'group') {
      matchesQuery = matchesQuery.eq('phase', 'group')
    }

    if (groupParam) {
      matchesQuery = matchesQuery.eq('group', groupParam)
    }

    if (dateParam === 'today' || dateParam === 'tomorrow') {
      const now = new Date()
      const dayOffset = dateParam === 'tomorrow' ? 1 : 0
      const rangeStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayOffset)
      )
      const rangeEnd = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayOffset + 1)
      )
      matchesQuery = matchesQuery
        .gte('match_date', rangeStart.toISOString())
        .lt('match_date', rangeEnd.toISOString())
    }

    if (nextParam) {
      // Próximos jogos a partir do dia de hoje (horário de Brasília, UTC-3 fixo):
      // um jogo de hoje continua aparecendo mesmo após começar/terminar; ao virar
      // o dia em Brasília ele some e entram os jogos do novo dia atual.
      const todaySP = new Date().toLocaleDateString('sv-SE', {
        timeZone: 'America/Sao_Paulo',
      })
      const startOfTodaySP = new Date(`${todaySP}T00:00:00-03:00`)
      matchesQuery = matchesQuery.gte('match_date', startOfTodaySP.toISOString())

      const limit = parseInt(nextParam, 10)
      if (!isNaN(limit) && limit > 0) {
        matchesQuery = matchesQuery.limit(limit)
      }
    }

    const { data: matches, error: matchesError } = await matchesQuery

    if (matchesError) {
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          endpoint: '/api/leagues/[id]/matches',
          method: 'GET',
          user_id: user.id,
          league_id: leagueId,
          error: matchesError.message,
        })
      )
      return NextResponse.json(
        formatError('DATABASE_ERROR', 'Erro ao buscar partidas', 500),
        { status: 500 }
      )
    }

    const matchList: Match[] = (matches ?? []) as Match[]

    const matchIds = matchList.map((m) => m.id)
    const predictionsMap: Record<string, { predicted_home_score: number; predicted_away_score: number }> = {}

    if (matchIds.length > 0) {
      const { data: predictions } = await supabase
        .from('predictions')
        .select('match_id, predicted_home_score, predicted_away_score')
        .eq('user_id', user.id)
        .eq('league_id', leagueId)
        .in('match_id', matchIds)

      if (predictions) {
        for (const pred of predictions) {
          predictionsMap[pred.match_id] = {
            predicted_home_score: pred.predicted_home_score,
            predicted_away_score: pred.predicted_away_score,
          }
        }
      }
    }

    const deadlineThreshold = new Date(Date.now() + 60 * 60 * 1000)
    const matchesWithPredictions: MatchWithPrediction[] = matchList.map((match) => ({
      ...match,
      prediction: predictionsMap[match.id] ?? null,
      is_deadline_passed: new Date(match.match_date) < deadlineThreshold,
    }))

    const duration = Date.now() - start
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        endpoint: '/api/leagues/[id]/matches',
        method: 'GET',
        user_id: user.id,
        league_id: leagueId,
        status_code: 200,
        duration_ms: duration,
      })
    )

    return NextResponse.json(
      formatSuccess({ matches: matchesWithPredictions, total: matchesWithPredictions.length }),
      { status: 200 }
    )
  } catch (err) {
    const duration = Date.now() - start
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        endpoint: '/api/leagues/[id]/matches',
        method: 'GET',
        duration_ms: duration,
        error: err instanceof Error ? err.message : 'unknown',
      })
    )
    return NextResponse.json(
      formatError('DATABASE_ERROR', 'Erro ao buscar partidas', 500),
      { status: 500 }
    )
  }
}
