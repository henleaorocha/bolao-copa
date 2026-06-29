import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidateTag } from 'next/cache'
import { fetchWorldCupFixtures, mapOpenfootballMatch } from '@/lib/football-api'
import { RANKINGS_CACHE_TAG } from '@/lib/leagues/get-league-ranking'
import { formatSuccess, formatError } from '@/lib/api/responses'

export async function POST(request: NextRequest) {
  const start = Date.now()

  const authHeader = request.headers.get('Authorization')
  if (!authHeader || authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return NextResponse.json(
      formatError('UNAUTHORIZED', 'Invalid or missing service key', 401),
      { status: 401 }
    )
  }

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      endpoint: '/api/admin/sync-matches',
      method: 'POST',
      event: 'sync_start',
    })
  )

  try {
    const fixtures = await fetchWorldCupFixtures()

    const rows = fixtures.map(mapOpenfootballMatch)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Manually-controlled matches (ADR-008/ADR-004) are protected from automatic
    // overwrite. Read their external_ids and exclude those rows from the upsert
    // set so an operator's correction survives the hourly run untouched.
    const { data: manualRows, error: manualError } = await supabase
      .from('matches')
      .select('external_id')
      .eq('is_manual', true)

    if (manualError) {
      throw new Error(`DB manual read failed: ${manualError.message}`)
    }

    const manualIds = new Set(
      (manualRows ?? [])
        .map((r) => r.external_id as string | null)
        .filter((id): id is string => id != null)
    )

    const rowsToUpsert = rows.filter((r) => !manualIds.has(r.external_id))
    const skipped = rows.length - rowsToUpsert.length

    const { error: upsertError } = await supabase
      .from('matches')
      .upsert(rowsToUpsert, { onConflict: 'external_id' })

    if (upsertError) {
      throw new Error(`DB upsert failed: ${upsertError.message}`)
    }

    const { error: deleteError } = await supabase
      .from('matches')
      .delete()
      .is('external_id', null)

    if (deleteError) {
      throw new Error(`DB delete failed: ${deleteError.message}`)
    }

    const finishedCount = rowsToUpsert.filter((r) => r.status === 'finished').length
    const scoredMatches = rowsToUpsert.filter(
      (r) => r.home_score !== null && r.away_score !== null
    ).length
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        endpoint: '/api/admin/sync-matches',
        method: 'POST',
        event: 'sync_result_ingested',
        finished_count: finishedCount,
        scored_matches: scoredMatches,
        skipped_manual: skipped,
      })
    )

    revalidateTag('fixtures', { expire: 0 })
    // Resultados ingeridos podem ter finalizado partidas → invalida os rankings.
    revalidateTag(RANKINGS_CACHE_TAG, { expire: 0 })

    const duration = Date.now() - start
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        endpoint: '/api/admin/sync-matches',
        method: 'POST',
        event: 'sync_complete',
        upserted: rowsToUpsert.length,
        skipped_manual: skipped,
        duration_ms: duration,
      })
    )

    return NextResponse.json(
      formatSuccess({ upserted: rowsToUpsert.length, skipped }),
      { status: 200 }
    )
  } catch (err) {
    const duration = Date.now() - start
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        endpoint: '/api/admin/sync-matches',
        method: 'POST',
        event: 'ingestion_error',
        duration_ms: duration,
        error: err instanceof Error ? err.message : 'unknown',
      })
    )
    return NextResponse.json(
      formatError(
        'SYNC_FAILED',
        err instanceof Error ? err.message : 'Sync failed',
        500
      ),
      { status: 500 }
    )
  }
}
