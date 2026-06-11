import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { formatSuccess, formatError } from '@/lib/api/responses'
import { computeRanking } from '@/lib/ranking'
import { BET_DEADLINE } from '@/lib/copa-teams'
import type { RankingFullEntry } from '@/lib/api/types'

interface UserEmbed {
  full_name: string | null
  avatar_color: string
}

interface MemberRow {
  user_id: string
  joined_at: string
  // PostgREST returns the to-one users join as an object; older generated
  // types model it as an array — accept both so full_name always resolves.
  users: UserEmbed | UserEmbed[] | null
}

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

    const membersResult = await supabase
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
      .order('joined_at', { ascending: true })

    if (membersResult.error) {
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          endpoint: '/api/leagues/[id]/ranking',
          method: 'GET',
          user_id: user.id,
          league_id: leagueId,
          error: membersResult.error.message,
        })
      )
      return NextResponse.json(
        formatError('DATABASE_ERROR', 'Erro ao buscar membros da liga', 500),
        { status: 500 }
      )
    }

    // Read every member's champion/runner-up pick with a service-role client to
    // bypass the per-row owner filter in RLS (champion_bets_select_league_peers
    // only reveals peers' bets after the final is finished). The membership
    // guard above already proved the caller belongs to this league, and the
    // reveal is gated in app code by BET_DEADLINE below — so we read all picks
    // here and decide visibility centrally.
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: allChampBets } = await adminSupabase
      .from('champion_bets')
      .select('user_id, champion_team, runner_up_team')
      .eq('league_id', leagueId)

    const { data: allPredictions } = await supabase
      .from('predictions')
      .select('user_id, match_id, predicted_home_score, predicted_away_score')
      .eq('league_id', leagueId)

    const { data: finishedMatches } = await supabase
      .from('matches')
      .select('id, phase, home_team, away_team, home_score, away_score, match_date')
      .eq('status', 'finished')

    const members = (membersResult.data as MemberRow[]).map((row) => {
      const u = Array.isArray(row.users) ? row.users[0] : row.users
      return {
        user_id: row.user_id,
        full_name: u?.full_name ?? null,
        avatar_color: u?.avatar_color ?? '',
        joined_at: row.joined_at,
      }
    })

    const ranking: RankingFullEntry[] = computeRanking({
      members,
      predictions: allPredictions ?? [],
      finishedMatches: (finishedMatches ?? []) as Parameters<typeof computeRanking>[0]['finishedMatches'],
      championBets: (allChampBets ?? []).map((b) => ({
        user_id: b.user_id,
        champion_team: b.champion_team,
        runner_up_team: b.runner_up_team,
      })),
    })

    // Champion/runner-up picks are private until betting closes, so members
    // can't copy each other's votes. Strip them from the payload entirely
    // before the deadline; afterwards every member's picks are public.
    if (Date.now() < BET_DEADLINE.getTime()) {
      for (const entry of ranking) {
        entry.champion_team = null
        entry.runner_up_team = null
      }
    }

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
