import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { formatSuccess, formatError } from '@/lib/api/responses'
import { buildBracketResponse, type PredictionRow } from '@/lib/bracket'
import type { Match } from '@/lib/api/types'

const KNOCKOUT_PHASES = ['32nd', '16th', '8th', 'semi', '3rd_place', 'final'] as const

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { data: matchRows, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .in('phase', KNOCKOUT_PHASES)

    if (matchesError) {
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          endpoint: '/api/leagues/[id]/bracket',
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

    const matches: Match[] = (matchRows ?? []) as Match[]

    const matchIds = matches.map((m) => m.id)
    let predictions: PredictionRow[] = []

    if (matchIds.length > 0) {
      const { data: predRows } = await supabase
        .from('predictions')
        .select('match_id, predicted_home_score, predicted_away_score')
        .eq('user_id', user.id)
        .eq('league_id', leagueId)
        .in('match_id', matchIds)

      if (predRows) {
        predictions = predRows as PredictionRow[]
      }
    }

    const bracketResponse = buildBracketResponse(matches, predictions)

    const confirmedSlots = bracketResponse.phases
      .flatMap((p) => p.slots)
      .filter((s) => s.state !== 'placeholder').length

    const duration = Date.now() - start
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        event: 'bracket_viewed',
        endpoint: '/api/leagues/[id]/bracket',
        method: 'GET',
        user_id: user.id,
        league_id: leagueId,
        confirmed_slots: confirmedSlots,
        status_code: 200,
        duration_ms: duration,
      })
    )

    return NextResponse.json(formatSuccess(bracketResponse), { status: 200 })
  } catch (err) {
    const duration = Date.now() - start
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        endpoint: '/api/leagues/[id]/bracket',
        method: 'GET',
        duration_ms: duration,
        error: err instanceof Error ? err.message : 'unknown',
      })
    )
    return NextResponse.json(
      formatError('DATABASE_ERROR', 'Erro ao buscar bracket', 500),
      { status: 500 }
    )
  }
}
