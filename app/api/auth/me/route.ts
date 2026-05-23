import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { formatSuccess, formatError } from '@/lib/api/responses'
import { ensureUserSynced } from '@/lib/user-sync'
import { resolveActiveLeague } from '@/lib/resolve-active-league'

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

    await ensureUserSynced(supabase, user)

    const userResult = await supabase
      .from('users')
      .select('id, email, full_name, avatar_url, avatar_color, created_at')
      .eq('id', user.id)
      .single()

    if (userResult.error) {
      console.error('[api/auth/me] Erro de banco ao buscar usuário:', userResult.error?.message)
      return NextResponse.json(
        formatError('DATABASE_ERROR', 'Erro ao buscar dados do usuário', 500),
        { status: 500 }
      )
    }

    const userData = userResult.data

    // Resolve the effective league ID using shared utility
    const effectiveLeagueId = await resolveActiveLeague(supabase, user.id)

    if (!effectiveLeagueId) {
      console.error('[api/auth/me] Usuário não tem nenhuma liga')
      return NextResponse.json(
        formatError('DATABASE_ERROR', 'Erro ao buscar dados do usuário', 500),
        { status: 500 }
      )
    }

    // Fetch league and membership details
    const [leagueResult, memberResult] = await Promise.all([
      supabase
        .from('leagues')
        .select('id, name, access_type, logo_url, member_count')
        .eq('id', effectiveLeagueId)
        .single(),
      supabase
        .from('league_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('league_id', effectiveLeagueId)
        .single(),
    ])

    if (leagueResult.error || memberResult.error) {
      const err = leagueResult.error ?? memberResult.error
      console.error('[api/auth/me] Erro de banco:', err?.message)
      return NextResponse.json(
        formatError('DATABASE_ERROR', 'Erro ao buscar dados do usuário', 500),
        { status: 500 }
      )
    }

    const duration = Date.now() - start
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        endpoint: '/api/auth/me',
        user_id: user.id,
        status_code: 200,
        duration_ms: duration,
      })
    )

    return NextResponse.json(
      formatSuccess({
        user: {
          id: userData.id,
          email: userData.email,
          full_name: userData.full_name,
          avatar_url: userData.avatar_url,
          avatar_color: userData.avatar_color,
          created_at: userData.created_at,
        },
        league: {
          ...leagueResult.data,
          role: memberResult.data.role,
        },
      })
    )
  } catch (err) {
    const duration = Date.now() - start
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        endpoint: '/api/auth/me',
        duration_ms: duration,
        error: err instanceof Error ? err.message : 'unknown',
      })
    )
    return NextResponse.json(
      formatError('DATABASE_ERROR', 'Erro ao buscar dados do usuário', 500),
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
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

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        formatError('INVALID_BODY', 'Corpo da requisição inválido', 400),
        { status: 400 }
      )
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        formatError('INVALID_BODY', 'Corpo da requisição inválido', 400),
        { status: 400 }
      )
    }

    const { active_league_id } = body as { active_league_id?: unknown }

    if (!active_league_id || typeof active_league_id !== 'string') {
      return NextResponse.json(
        formatError('INVALID_BODY', 'Corpo da requisição inválido', 400),
        { status: 400 }
      )
    }

    // Verify user is a member of the target league
    const membershipCheck = await supabase
      .from('league_members')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('league_id', active_league_id)
      .single()

    if (membershipCheck.error) {
      return NextResponse.json(
        formatError('NOT_A_MEMBER', 'Usuário não é membro desta liga', 403),
        { status: 403 }
      )
    }

    // Update the user's active_league_id
    const updateResult = await supabase
      .from('users')
      .update({ active_league_id })
      .eq('id', user.id)
      .select('id, email, full_name, avatar_url, avatar_color, created_at')
      .single()

    if (updateResult.error) {
      console.error('[api/auth/me PATCH] Erro ao atualizar active_league_id:', updateResult.error?.message)
      return NextResponse.json(
        formatError('DATABASE_ERROR', 'Erro ao atualizar liga ativa', 500),
        { status: 500 }
      )
    }

    // Fetch league and membership details
    const [leagueResult, memberResult] = await Promise.all([
      supabase
        .from('leagues')
        .select('id, name, access_type, logo_url, member_count')
        .eq('id', active_league_id)
        .single(),
      supabase
        .from('league_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('league_id', active_league_id)
        .single(),
    ])

    if (leagueResult.error || memberResult.error) {
      const err = leagueResult.error ?? memberResult.error
      console.error('[api/auth/me PATCH] Erro de banco:', err?.message)
      return NextResponse.json(
        formatError('DATABASE_ERROR', 'Erro ao buscar dados da liga', 500),
        { status: 500 }
      )
    }

    const duration = Date.now() - start
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        endpoint: '/api/auth/me',
        method: 'PATCH',
        user_id: user.id,
        status_code: 200,
        duration_ms: duration,
      })
    )

    return NextResponse.json(
      formatSuccess({
        user: updateResult.data,
        league: {
          ...leagueResult.data,
          role: memberResult.data.role,
        },
      })
    )
  } catch (err) {
    const duration = Date.now() - start
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        endpoint: '/api/auth/me',
        method: 'PATCH',
        duration_ms: duration,
        error: err instanceof Error ? err.message : 'unknown',
      })
    )
    return NextResponse.json(
      formatError('DATABASE_ERROR', 'Erro ao atualizar liga ativa', 500),
      { status: 500 }
    )
  }
}
