import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { formatSuccess, formatError } from '@/lib/api/responses'
import { scoreGroup, scoreKnockout } from '@/lib/scoring'
import type { KnockoutPhase } from '@/lib/bracket-skeleton'
import type { MatchPlayerPrediction, MatchPlayerPredictions } from '@/lib/api/types'

// Mirror lib/ranking.ts: only these six phases carry a knockout multiplier; any
// other phase scores via scoreGroup (or 0), so per-match points here match the
// ranking exactly.
const KNOCKOUT_PHASES = new Set<string>(['32nd', '16th', '8th', 'semi', '3rd_place', 'final'])

interface UserEmbed {
  full_name: string | null
  avatar_color: string
}

interface MemberRow {
  user_id: string
  joined_at: string
  // PostgREST returns the to-one users join as an object; older generated types
  // model it as an array — accept both so full_name always resolves.
  users: UserEmbed | UserEmbed[] | null
}

interface MatchRow {
  id: string
  phase: string
  status: 'scheduled' | 'live' | 'finished'
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  match_date: string
}

interface PredictionRow {
  user_id: string
  predicted_home_score: number | null
  predicted_away_score: number | null
}

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

    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .select('id, phase, status, home_team, away_team, home_score, away_score, match_date')
      .eq('id', matchId)
      .single()

    if (matchError || !matchData) {
      return NextResponse.json(
        formatError('MATCH_NOT_FOUND', 'Partida não encontrada', 404),
        { status: 404 }
      )
    }

    const match = matchData as MatchRow

    const deadlineThreshold = new Date(Date.now() + 60 * 60 * 1000)
    const is_deadline_passed = new Date(match.match_date) < deadlineThreshold
    const is_finished =
      match.status === 'finished' && match.home_score !== null && match.away_score !== null

    // Before the betting deadline, individual picks must stay hidden so members
    // can't copy each other. Return a locked payload (no players); the UI gates
    // the entry button on the same condition, this is defense in depth.
    if (!is_deadline_passed) {
      const locked: MatchPlayerPredictions = {
        is_deadline_passed: false,
        is_finished,
        home_team: match.home_team,
        away_team: match.away_team,
        home_score: match.home_score,
        away_score: match.away_score,
        players: [],
      }
      return NextResponse.json(formatSuccess(locked), { status: 200 })
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
          endpoint: '/api/leagues/[id]/matches/[matchId]/predictions',
          method: 'GET',
          user_id: user.id,
          league_id: leagueId,
          match_id: matchId,
          error: membersResult.error.message,
        })
      )
      return NextResponse.json(
        formatError('DATABASE_ERROR', 'Erro ao buscar membros da liga', 500),
        { status: 500 }
      )
    }

    // Read every member's pick with the service role. Under the viewer's RLS,
    // predictions_select_league_peers only exposes co-members' picks once the
    // match is 'finished'; the deadline has already passed (picks are locked) and
    // membership is enforced above, so revealing them now leaks nothing.
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data: allPredictions } = await adminClient
      .from('predictions')
      .select('user_id, predicted_home_score, predicted_away_score')
      .eq('league_id', leagueId)
      .eq('match_id', matchId)

    const predByUser = new Map<string, PredictionRow>()
    for (const p of (allPredictions ?? []) as PredictionRow[]) {
      predByUser.set(p.user_id, p)
    }

    const players: MatchPlayerPrediction[] = (membersResult.data as MemberRow[]).map((row) => {
      const u = Array.isArray(row.users) ? row.users[0] : row.users
      const pred = predByUser.get(row.user_id)
      const ph = pred?.predicted_home_score ?? null
      const pa = pred?.predicted_away_score ?? null

      let points: number | null = null
      let is_exact = false

      if (is_finished && ph !== null && pa !== null) {
        const input = { ph, pa, rh: match.home_score as number, ra: match.away_score as number }
        if (match.phase === 'group') {
          points = scoreGroup(input)
        } else if (KNOCKOUT_PHASES.has(match.phase)) {
          points = scoreKnockout(input, match.phase as KnockoutPhase)
        } else {
          points = 0
        }
        is_exact = ph === match.home_score && pa === match.away_score
      }

      return {
        user_id: row.user_id,
        full_name: u?.full_name ?? null,
        avatar_color: u?.avatar_color || '#FFC72C',
        predicted_home_score: ph,
        predicted_away_score: pa,
        points,
        is_exact,
        is_current_user: row.user_id === user.id,
      }
    })

    // Members who predicted come first; "sem palpite" sink to the bottom. Among
    // predictors, once the match is finished sort by points (then exact) so the
    // best picks lead; otherwise alphabetical.
    const hasPick = (p: MatchPlayerPrediction) =>
      p.predicted_home_score !== null && p.predicted_away_score !== null
    const byName = (a: MatchPlayerPrediction, b: MatchPlayerPrediction) =>
      (a.full_name ?? '').localeCompare(b.full_name ?? '', 'pt-BR')

    players.sort((a, b) => {
      const aPick = hasPick(a)
      const bPick = hasPick(b)
      if (aPick !== bPick) return aPick ? -1 : 1
      if (!aPick) return byName(a, b)
      if (is_finished) {
        const ap = a.points ?? 0
        const bp = b.points ?? 0
        if (bp !== ap) return bp - ap
        if (a.is_exact !== b.is_exact) return a.is_exact ? -1 : 1
      }
      return byName(a, b)
    })

    const payload: MatchPlayerPredictions = {
      is_deadline_passed: true,
      is_finished,
      home_team: match.home_team,
      away_team: match.away_team,
      home_score: match.home_score,
      away_score: match.away_score,
      players,
    }

    const duration = Date.now() - start
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        endpoint: '/api/leagues/[id]/matches/[matchId]/predictions',
        method: 'GET',
        user_id: user.id,
        league_id: leagueId,
        match_id: matchId,
        status_code: 200,
        duration_ms: duration,
      })
    )

    return NextResponse.json(formatSuccess(payload), { status: 200 })
  } catch (err) {
    const duration = Date.now() - start
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        endpoint: '/api/leagues/[id]/matches/[matchId]/predictions',
        method: 'GET',
        duration_ms: duration,
        error: err instanceof Error ? err.message : 'unknown',
      })
    )
    return NextResponse.json(
      formatError('DATABASE_ERROR', 'Erro ao buscar palpites dos jogadores', 500),
      { status: 500 }
    )
  }
}
