import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { formatSuccess, formatError } from '@/lib/api/responses'
import { ensureUserSynced } from '@/lib/user-sync'

const DEFAULT_LEAGUE_ID = '00000000-0000-0000-0000-000000000001'

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

    const [userResult, memberResult, leagueResult] = await Promise.all([
      supabase
        .from('users')
        .select('id, email, full_name, avatar_url, avatar_color, created_at')
        .eq('id', user.id)
        .single(),
      supabase
        .from('league_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('league_id', DEFAULT_LEAGUE_ID)
        .single(),
      supabase
        .from('leagues')
        .select('id, name, access_type, logo_url')
        .eq('id', DEFAULT_LEAGUE_ID)
        .single(),
    ])

    if (userResult.error || memberResult.error || leagueResult.error) {
      const err = userResult.error ?? memberResult.error ?? leagueResult.error
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
        user: userResult.data,
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
