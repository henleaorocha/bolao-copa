import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { formatSuccess, formatError } from '@/lib/api/responses'
import type { Match, MatchDetail, OutcomeDistribution } from '@/lib/api/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  const start = Date.now()

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

    const { id: leagueId, matchId } = await params

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

    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single()

    if (matchError || !match) {
      return NextResponse.json(
        formatError('MATCH_NOT_FOUND', 'Partida não encontrada', 404),
        { status: 404 }
      )
    }

    const { data: predictionRow } = await supabase
      .from('predictions')
      .select('predicted_home_score, predicted_away_score')
      .eq('user_id', user.id)
      .eq('league_id', leagueId)
      .eq('match_id', matchId)
      .single()

    const prediction = predictionRow
      ? {
          predicted_home_score: predictionRow.predicted_home_score,
          predicted_away_score: predictionRow.predicted_away_score,
        }
      : null

    const deadlineThreshold = new Date(Date.now() + 60 * 60 * 1000)
    const is_deadline_passed = new Date((match as Match).match_date) < deadlineThreshold

    let distribution: OutcomeDistribution | null = null

    if (is_deadline_passed) {
      // Aggregate every member's prediction with the service role. Under the
      // viewer's RLS, predictions_select_league_peers only exposes co-members'
      // picks once the match is 'finished' (to avoid leaking picks before
      // kickoff), so the viewer's own client would count only their own bet and
      // report a bogus 100%. Membership and the deadline are already enforced
      // above, and only aggregate percentages (never individual picks) are
      // returned, so reading all rows here doesn't leak anyone's pick.
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )
      const { data: allPredictions } = await adminClient
        .from('predictions')
        .select('predicted_home_score, predicted_away_score')
        .eq('league_id', leagueId)
        .eq('match_id', matchId)

      const preds = (allPredictions ?? []) as Array<{
        predicted_home_score: number
        predicted_away_score: number
      }>
      const total = preds.length

      if (total > 0) {
        const homeWins = preds.filter((p) => p.predicted_home_score > p.predicted_away_score).length
        const draws = preds.filter((p) => p.predicted_home_score === p.predicted_away_score).length
        const awayWins = preds.filter((p) => p.predicted_home_score < p.predicted_away_score).length
        distribution = {
          home_win: Math.round((homeWins / total) * 100),
          draw: Math.round((draws / total) * 100),
          away_win: Math.round((awayWins / total) * 100),
          total_predictions: total,
        }
      } else {
        distribution = {
          home_win: 0,
          draw: 0,
          away_win: 0,
          total_predictions: 0,
        }
      }
    }

    const matchDetail: MatchDetail = {
      ...(match as Match),
      prediction,
      is_deadline_passed,
      distribution,
    }

    const duration = Date.now() - start
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        endpoint: '/api/leagues/[id]/matches/[matchId]',
        method: 'GET',
        user_id: user.id,
        league_id: leagueId,
        match_id: matchId,
        status_code: 200,
        duration_ms: duration,
      })
    )

    return NextResponse.json(formatSuccess(matchDetail), { status: 200 })
  } catch (err) {
    const duration = Date.now() - start
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        endpoint: '/api/leagues/[id]/matches/[matchId]',
        method: 'GET',
        duration_ms: duration,
        error: err instanceof Error ? err.message : 'unknown',
      })
    )
    return NextResponse.json(
      formatError('DATABASE_ERROR', 'Erro ao buscar partida', 500),
      { status: 500 }
    )
  }
}
