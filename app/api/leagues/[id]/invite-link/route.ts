import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { formatSuccess, formatError } from '@/lib/api/responses'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: leagueId } = await params

    // Check if league exists and user is admin
    const leagueResult = await supabase
      .from('leagues')
      .select('id, created_by, invite_token')
      .eq('id', leagueId)
      .single()

    if (leagueResult.error) {
      return NextResponse.json(
        formatError('LEAGUE_NOT_FOUND', 'Liga não encontrada', 404),
        { status: 404 }
      )
    }

    const league = leagueResult.data

    // Check if current user is the league admin
    if (league.created_by !== user.id) {
      return NextResponse.json(
        formatError('NOT_ADMIN', 'Apenas o administrador pode acessar o link de convite', 403),
        { status: 403 }
      )
    }

    // Construct the invite URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const inviteUrl = `${siteUrl}/join?token=${league.invite_token}`

    const duration = Date.now() - start
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        endpoint: '/api/leagues/[id]/invite-link',
        method: 'GET',
        user_id: user.id,
        league_id: leagueId,
        status_code: 200,
        duration_ms: duration,
      })
    )

    return NextResponse.json(
      formatSuccess({
        invite_url: inviteUrl,
      }),
      { status: 200 }
    )
  } catch (err) {
    const duration = Date.now() - start
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        endpoint: '/api/leagues/[id]/invite-link',
        method: 'GET',
        duration_ms: duration,
        error: err instanceof Error ? err.message : 'unknown',
      })
    )
    return NextResponse.json(
      formatError('DATABASE_ERROR', 'Erro ao buscar link de convite', 500),
      { status: 500 }
    )
  }
}
