import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { formatSuccess, formatError } from '@/lib/api/responses'
import type { LeagueSummary } from '@/lib/api/types'

export async function GET(request: NextRequest) {
  const start = Date.now()

  // Reject unexpected query params
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

    // Get user's current league memberships
    const userLeaguesResult = await supabase
      .from('league_members')
      .select('league_id')
      .eq('user_id', user.id)

    if (userLeaguesResult.error) {
      console.error('[api/leagues/discover GET] Erro ao buscar ligas do usuário:', userLeaguesResult.error?.message)
      return NextResponse.json(
        formatError('DATABASE_ERROR', 'Erro ao buscar ligas', 500),
        { status: 500 }
      )
    }

    const userLeagueIds = userLeaguesResult.data.map((row: any) => row.league_id)

    // Get all open leagues, ordered by member_count DESC, created_at DESC
    const result = await supabase
      .from('leagues')
      .select('id, name, access_type, logo_url, member_count, created_at')
      .eq('access_type', 'open')
      .order('member_count', { ascending: false })
      .order('created_at', { ascending: false })

    if (result.error) {
      console.error('[api/leagues/discover GET] Erro de banco:', result.error?.message)
      return NextResponse.json(
        formatError('DATABASE_ERROR', 'Erro ao buscar ligas', 500),
        { status: 500 }
      )
    }

    // Filter out leagues the user is already a member of
    const leagues: LeagueSummary[] = result.data
      .filter((league: any) => !userLeagueIds.includes(league.id))
      .map((league: any) => ({
        id: league.id,
        name: league.name,
        access_type: league.access_type,
        logo_url: league.logo_url,
        role: 'member' as const, // User is not a member yet, but if they join they'd be a member
        member_count: league.member_count,
      }))

    const duration = Date.now() - start
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        endpoint: '/api/leagues/discover',
        user_id: user.id,
        status_code: 200,
        duration_ms: duration,
      })
    )

    return NextResponse.json(formatSuccess(leagues))
  } catch (err) {
    const duration = Date.now() - start
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        endpoint: '/api/leagues/discover',
        duration_ms: duration,
        error: err instanceof Error ? err.message : 'unknown',
      })
    )
    return NextResponse.json(
      formatError('DATABASE_ERROR', 'Erro ao buscar ligas', 500),
      { status: 500 }
    )
  }
}
