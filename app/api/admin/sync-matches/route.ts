import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidateTag } from 'next/cache'
import { fetchWorldCupFixtures, mapFixtureStatus } from '@/lib/football-api'
import { ALL_COPA_TEAMS } from '@/lib/copa-teams'
import { formatSuccess, formatError } from '@/lib/api/responses'
import type { Match } from '@/lib/api/types'

type MatchPhase = Match['phase']

const ROUND_TO_PHASE: Record<string, MatchPhase> = {
  'Round of 32': '32nd',
  'Round of 16': '16th',
  'Quarter-finals': '8th',
  'Semi-finals': 'semi',
  '3rd Place Final': '3rd_place',
  '3rd Place': '3rd_place',
  Final: 'final',
}

function resolveFlag(teamName: string): string | null {
  return ALL_COPA_TEAMS.find((t) => t.name === teamName)?.code ?? null
}

function parsePhaseAndGroup(
  round: string,
  group: string | null
): { phase: MatchPhase; group: string | null } {
  if (round.startsWith('Group Stage')) {
    return {
      phase: 'group',
      group: group ? group.replace(/^Group /, '') : null,
    }
  }
  return { phase: ROUND_TO_PHASE[round] ?? 'group', group: null }
}

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

    const rows = fixtures.map((f) => {
      const { phase, group } = parsePhaseAndGroup(f.league.round, f.league.group)
      return {
        external_id: String(f.fixture.id),
        home_team: f.teams.home.name,
        away_team: f.teams.away.name,
        home_flag: resolveFlag(f.teams.home.name),
        away_flag: resolveFlag(f.teams.away.name),
        match_date: f.fixture.date,
        phase,
        group,
        venue: f.fixture.venue.name,
        city: f.fixture.venue.city,
        status: mapFixtureStatus(f.fixture.status.short),
        home_score: f.goals.home ?? null,
        away_score: f.goals.away ?? null,
      }
    })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error: upsertError } = await supabase
      .from('matches')
      .upsert(rows, { onConflict: 'external_id' })

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

    const finishedCount = rows.filter((r) => r.status === 'finished').length
    const scoredMatches = rows.filter((r) => r.home_score !== null && r.away_score !== null).length
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        endpoint: '/api/admin/sync-matches',
        method: 'POST',
        event: 'sync_result_ingested',
        finished_count: finishedCount,
        scored_matches: scoredMatches,
      })
    )

    revalidateTag('fixtures', { expire: 0 })

    const duration = Date.now() - start
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        endpoint: '/api/admin/sync-matches',
        method: 'POST',
        event: 'sync_complete',
        upserted: rows.length,
        duration_ms: duration,
      })
    )

    return NextResponse.json(
      formatSuccess({ upserted: rows.length, skipped: 0 }),
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
        event: 'api_football_error',
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
