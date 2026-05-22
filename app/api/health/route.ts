import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { formatSuccess, formatError } from '@/lib/api/responses'

export async function GET() {
  const start = Date.now()

  try {
    const supabase = await getSupabaseServerClient()

    // Simple connectivity check
    const { error } = await supabase.from('leagues').select('id').limit(1)

    if (error) {
      console.error('[api/health] DB indisponível:', error.message)
      return NextResponse.json(
        formatError(
          'DATABASE_UNAVAILABLE',
          'Banco de dados indisponível',
          503
        ),
        { status: 503 }
      )
    }

    const duration = Date.now() - start
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        endpoint: '/api/health',
        status_code: 200,
        duration_ms: duration,
      })
    )

    return NextResponse.json(
      formatSuccess({ status: 'ok', database: 'connected' })
    )
  } catch (err) {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        endpoint: '/api/health',
        error: err instanceof Error ? err.message : 'unknown',
      })
    )
    return NextResponse.json(
      formatError('DATABASE_UNAVAILABLE', 'Banco de dados indisponível', 503),
      { status: 503 }
    )
  }
}
