import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { requireOperator } from '@/lib/operator'
import { formatSuccess, formatError } from '@/lib/api/responses'

// Same defensive cap as the predictions route — no real match approaches it, and
// the bound protects scoring math / UI layout from absurd values.
const MAX_SCORE = 99

const VALID_STATUSES = new Set(['scheduled', 'live', 'finished'])

function isValidScore(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_SCORE
  )
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const start = Date.now()
  const { id: matchId } = await params

  try {
    // Guard 1: operator email gate (shared with the unlisted page)
    const gate = await requireOperator()
    if (!gate.ok) {
      return NextResponse.json(
        gate.status === 401
          ? formatError('SESSION_EXPIRED', 'Sessão expirada', 401)
          : formatError('FORBIDDEN', 'Acesso restrito ao operador', 403),
        { status: gate.status }
      )
    }

    // Operator identity for the audit log (set_by). The gate already confirmed
    // an allowed session exists; this just reads the email back.
    const sessionClient = await getSupabaseServerClient()
    const {
      data: { user },
    } = await sessionClient.auth.getUser()
    const setBy = user?.email ?? 'unknown'

    // Guard 2: body parse
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        formatError('INVALID_BODY', 'Corpo da requisição inválido', 400),
        { status: 400 }
      )
    }

    const { home_score, away_score, status, release } = (body ?? {}) as {
      home_score?: unknown
      away_score?: unknown
      status?: unknown
      release?: unknown
    }

    const isRelease = release === true

    // Guard 3: body validation (set path only — release carries no scores)
    if (!isRelease) {
      if (
        !isValidScore(home_score) ||
        !isValidScore(away_score) ||
        typeof status !== 'string' ||
        !VALID_STATUSES.has(status)
      ) {
        return NextResponse.json(
          formatError(
            'INVALID_BODY',
            `home_score e away_score devem ser inteiros entre 0 e ${MAX_SCORE}; status deve ser scheduled, live ou finished`,
            400
          ),
          { status: 400 }
        )
      }
    }

    // Writes use the service-role client, consistent with the sync route — an
    // authenticated operator account is not granted RLS write on `matches`.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Guard 4: match existence
    const matchResult = await supabase
      .from('matches')
      .select('id')
      .eq('id', matchId)
      .single()

    if (matchResult.error || !matchResult.data) {
      return NextResponse.json(
        formatError('MATCH_NOT_FOUND', 'Partida não encontrada', 404),
        { status: 404 }
      )
    }

    // release: return the match to automatic control (ADR-004).
    // otherwise: set scores/status and lock the match from automatic overwrite.
    const update = isRelease
      ? { is_manual: false }
      : {
          home_score: home_score as number,
          away_score: away_score as number,
          status: status as string,
          is_manual: true,
          manual_updated_at: new Date().toISOString(),
        }

    const { data: updated, error: updateError } = await supabase
      .from('matches')
      .update(update)
      .eq('id', matchId)
      .select('*')
      .single()

    if (updateError || !updated) {
      const duration = Date.now() - start
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          endpoint: '/api/admin/matches/[id]/result',
          method: 'PATCH',
          match_id: matchId,
          set_by: setBy,
          status_code: 500,
          duration_ms: duration,
          error: updateError?.message ?? 'update returned no row',
        })
      )
      return NextResponse.json(
        formatError('DATABASE_ERROR', 'Erro ao salvar resultado', 500),
        { status: 500 }
      )
    }

    const duration = Date.now() - start
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        endpoint: '/api/admin/matches/[id]/result',
        method: 'PATCH',
        event: isRelease ? 'operator_result_released' : 'operator_result_set',
        match_id: matchId,
        set_by: setBy,
        status_code: 200,
        duration_ms: duration,
      })
    )

    return NextResponse.json(formatSuccess(updated), { status: 200 })
  } catch (err) {
    const duration = Date.now() - start
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        endpoint: '/api/admin/matches/[id]/result',
        method: 'PATCH',
        match_id: matchId,
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
