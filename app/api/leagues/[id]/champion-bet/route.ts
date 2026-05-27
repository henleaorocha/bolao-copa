import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { formatSuccess, formatError } from '@/lib/api/responses'
import type { ChampionBet } from '@/lib/api/types'
import { VALID_TEAM_NAMES, BET_DEADLINE } from '@/lib/copa-teams'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: leagueId } = await params

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

    // Guard 3: Deadline
    if (new Date() > BET_DEADLINE) {
      const duration = Date.now() - start
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'info',
          endpoint: '/api/leagues/[id]/champion-bet',
          method: 'PUT',
          user_id: user.id,
          league_id: leagueId,
          status_code: 409,
          duration_ms: duration,
        })
      )
      return NextResponse.json(
        formatError('BET_DEADLINE_PASSED', 'Prazo para apostas encerrado', 409),
        { status: 409 }
      )
    }

    // Guard 4: Body params present and non-empty
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        formatError('INVALID_PARAMS', 'Parâmetros inválidos', 400),
        { status: 400 }
      )
    }

    const { champion_team, runner_up_team } = (body ?? {}) as {
      champion_team?: unknown
      runner_up_team?: unknown
    }

    if (
      !champion_team ||
      typeof champion_team !== 'string' ||
      champion_team.trim() === ''
    ) {
      return NextResponse.json(
        formatError('INVALID_PARAMS', 'champion_team é obrigatório', 400),
        { status: 400 }
      )
    }

    if (
      !runner_up_team ||
      typeof runner_up_team !== 'string' ||
      runner_up_team.trim() === ''
    ) {
      return NextResponse.json(
        formatError('INVALID_PARAMS', 'runner_up_team é obrigatório', 400),
        { status: 400 }
      )
    }

    // Guard 5: Team name validity
    if (!VALID_TEAM_NAMES.has(champion_team)) {
      return NextResponse.json(
        formatError('INVALID_TEAM', 'Time campeão inválido', 400),
        { status: 400 }
      )
    }

    if (!VALID_TEAM_NAMES.has(runner_up_team)) {
      return NextResponse.json(
        formatError('INVALID_TEAM', 'Time vice-campeão inválido', 400),
        { status: 400 }
      )
    }

    // Guard 6: Distinct teams
    if (champion_team === runner_up_team) {
      return NextResponse.json(
        formatError('SAME_TEAM', 'Campeão e vice-campeão devem ser times diferentes', 400),
        { status: 400 }
      )
    }

    // Upsert into champion_bets
    const { data: betData, error: betError } = await supabase
      .from('champion_bets')
      .upsert(
        {
          user_id: user.id,
          league_id: leagueId,
          champion_team,
          runner_up_team,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,league_id' }
      )
      .select()
      .single()

    if (betError) {
      const duration = Date.now() - start
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          endpoint: '/api/leagues/[id]/champion-bet',
          method: 'PUT',
          user_id: user.id,
          league_id: leagueId,
          status_code: 500,
          duration_ms: duration,
          error: betError.message,
        })
      )
      return NextResponse.json(
        formatError('DATABASE_ERROR', 'Erro ao salvar aposta', 500),
        { status: 500 }
      )
    }

    const duration = Date.now() - start
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        endpoint: '/api/leagues/[id]/champion-bet',
        method: 'PUT',
        user_id: user.id,
        league_id: leagueId,
        status_code: 200,
        duration_ms: duration,
      })
    )

    return NextResponse.json(formatSuccess(betData as ChampionBet), { status: 200 })
  } catch (err) {
    const duration = Date.now() - start
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        endpoint: '/api/leagues/[id]/champion-bet',
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
