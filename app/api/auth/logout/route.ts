import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { formatSuccess, formatError } from '@/lib/api/responses'

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
]

export async function POST(request: NextRequest) {
  const start = Date.now()

  // Basic CSRF: validate Origin header
  const origin = request.headers.get('origin')
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json(
      formatError('FORBIDDEN', 'Origem não permitida', 403),
      { status: 403 }
    )
  }

  // Reject non-JSON content types
  const contentType = request.headers.get('content-type')
  if (contentType && !contentType.includes('application/json')) {
    return NextResponse.json(
      formatError('INVALID_CONTENT_TYPE', 'Content-Type deve ser application/json', 400),
      { status: 400 }
    )
  }

  try {
    const supabase = await getSupabaseServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        formatError('SESSION_EXPIRED', 'Sessão expirada', 401),
        { status: 401 }
      )
    }

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('[api/auth/logout] Erro ao fazer logout:', error.message)
      return NextResponse.json(
        formatError('LOGOUT_FAILED', 'Erro ao fazer logout', 500),
        { status: 500 }
      )
    }

    const duration = Date.now() - start
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        endpoint: '/api/auth/logout',
        user_id: user.id,
        status_code: 200,
        duration_ms: duration,
      })
    )

    return NextResponse.json(formatSuccess({ ok: true }))
  } catch (err) {
    const duration = Date.now() - start
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        endpoint: '/api/auth/logout',
        duration_ms: duration,
        error: err instanceof Error ? err.message : 'unknown',
      })
    )
    return NextResponse.json(
      formatError('LOGOUT_FAILED', 'Erro ao fazer logout', 500),
      { status: 500 }
    )
  }
}
