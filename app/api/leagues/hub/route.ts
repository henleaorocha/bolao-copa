import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { formatSuccess, formatError } from '@/lib/api/responses'
import { getLeaguesHub } from '@/lib/leagues/get-leagues-hub'
import { getDaysUntilCopa } from '@/lib/leagues/get-days-until-copa'

export async function GET() {
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

    const leagues = await getLeaguesHub(supabase, user.id)
    const countdown = getDaysUntilCopa()
    const fullName: string = (user.user_metadata?.full_name as string) ?? ''
    const firstName = fullName.split(' ')[0] ?? ''

    const duration = Date.now() - start
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        endpoint: '/api/leagues/hub',
        user_id: user.id,
        status_code: 200,
        duration_ms: duration,
      })
    )

    return NextResponse.json(
      formatSuccess({
        leagues,
        user: { first_name: firstName },
        countdown,
      })
    )
  } catch (err) {
    const duration = Date.now() - start
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        endpoint: '/api/leagues/hub',
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
