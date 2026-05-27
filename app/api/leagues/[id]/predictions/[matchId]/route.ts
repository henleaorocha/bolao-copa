import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { formatSuccess, formatError } from '@/lib/api/responses'
import { isConfirmedMatchup } from '@/lib/bracket-skeleton'

const KNOCKOUT_PHASES = new Set(['32nd', '16th', '8th', 'semi', '3rd_place', 'final'])

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  const start = Date.now()

  try {
    const supabase = await getSupabaseServerClient()

    // Guard 1: Auth
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

    const { id: leagueId, matchId } = await params

    // Guard 2: Membership
    const membershipResult = await supabase
      .from('league_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('league_id', leagueId)
      .single()

    if (membershipResult.error) {
      return NextResponse.json(
        formatError('NOT_A_MEMBER', 'Usuário não é membro desta liga', 403),
        { status: 403 }
      )
    }

    // Guard 3: Body validation
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        formatError('INVALID_BODY', 'Corpo da requisição inválido', 400),
        { status: 400 }
      )
    }

    const { home_score, away_score } = (body ?? {}) as {
      home_score?: unknown
      away_score?: unknown
    }

    if (
      home_score === undefined ||
      home_score === null ||
      away_score === undefined ||
      away_score === null ||
      typeof home_score !== 'number' ||
      typeof away_score !== 'number' ||
      !Number.isInteger(home_score) ||
      !Number.isInteger(away_score) ||
      home_score < 0 ||
      away_score < 0
    ) {
      return NextResponse.json(
        formatError('INVALID_BODY', 'home_score e away_score devem ser inteiros não-negativos', 400),
        { status: 400 }
      )
    }

    // Guard 4: Match existence
    const matchResult = await supabase
      .from('matches')
      .select('id, match_date, phase, home_team, away_team')
      .eq('id', matchId)
      .single()

    if (matchResult.error || !matchResult.data) {
      return NextResponse.json(
        formatError('MATCH_NOT_FOUND', 'Partida não encontrada', 404),
        { status: 404 }
      )
    }

    // Guard 5: Confirmed teams — knockout matches require both teams to be real
    if (
      KNOCKOUT_PHASES.has(matchResult.data.phase) &&
      !isConfirmedMatchup(matchResult.data.home_team, matchResult.data.away_team)
    ) {
      const duration = Date.now() - start
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'info',
          event: 'prediction_rejected_unconfirmed',
          endpoint: '/api/leagues/[id]/predictions/[matchId]',
          method: 'PUT',
          user_id: user.id,
          match_id: matchId,
          status_code: 409,
          duration_ms: duration,
        })
      )
      return NextResponse.json(
        formatError('MATCH_NOT_CONFIRMED', 'Partida ainda não confirmada para palpites', 409),
        { status: 409 }
      )
    }

    // Guard 6: Deadline — match_date - 1h < now() means deadline passed
    const deadlineThreshold = new Date(Date.now() + 60 * 60 * 1000)
    if (new Date(matchResult.data.match_date) < deadlineThreshold) {
      const duration = Date.now() - start
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'info',
          event: 'prediction_rejected_deadline',
          endpoint: '/api/leagues/[id]/predictions/[matchId]',
          method: 'PUT',
          user_id: user.id,
          match_id: matchId,
          status_code: 403,
          duration_ms: duration,
        })
      )
      return NextResponse.json(
        formatError('DEADLINE_PASSED', 'Prazo para palpites encerrado', 403),
        { status: 403 }
      )
    }

    // Check if updating an existing prediction (for log event)
    const { data: existingPrediction } = await supabase
      .from('predictions')
      .select('id')
      .eq('user_id', user.id)
      .eq('league_id', leagueId)
      .eq('match_id', matchId)
      .maybeSingle()

    const isUpdate = existingPrediction !== null

    // Upsert prediction
    const { data: predictionData, error: predictionError } = await supabase
      .from('predictions')
      .upsert(
        {
          user_id: user.id,
          league_id: leagueId,
          match_id: matchId,
          predicted_home_score: home_score,
          predicted_away_score: away_score,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,league_id,match_id' }
      )
      .select('match_id, predicted_home_score, predicted_away_score, updated_at')
      .single()

    if (predictionError) {
      const duration = Date.now() - start
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          endpoint: '/api/leagues/[id]/predictions/[matchId]',
          method: 'PUT',
          user_id: user.id,
          league_id: leagueId,
          match_id: matchId,
          status_code: 500,
          duration_ms: duration,
          error: predictionError.message,
        })
      )
      return NextResponse.json(
        formatError('DATABASE_ERROR', 'Erro ao salvar palpite', 500),
        { status: 500 }
      )
    }

    const duration = Date.now() - start
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        event: 'prediction_saved',
        endpoint: '/api/leagues/[id]/predictions/[matchId]',
        method: 'PUT',
        user_id: user.id,
        match_id: matchId,
        league_id: leagueId,
        is_update: isUpdate,
        status_code: 200,
        duration_ms: duration,
      })
    )

    return NextResponse.json(formatSuccess(predictionData), { status: 200 })
  } catch (err) {
    const duration = Date.now() - start
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        endpoint: '/api/leagues/[id]/predictions/[matchId]',
        method: 'PUT',
        duration_ms: duration,
        error: err instanceof Error ? err.message : 'unknown',
      })
    )
    return NextResponse.json(
      formatError('DATABASE_ERROR', 'Erro interno', 500),
      { status: 500 }
    )
  }
}
