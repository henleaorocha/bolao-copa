import type { SupabaseClient } from '@supabase/supabase-js'

export interface ScoringPrediction {
  user_id: string
  match_id: string
  predicted_home_score: number | null
  predicted_away_score: number | null
}

// PostgREST caps a single response at 1000 rows by default. A league with enough
// members easily blows past that — 53 members × up to 72 group picks ≈ 1500+
// rows — and a plain `.select()` silently truncates to the first 1000 in an
// unstable (non-ORDER BY) order. The ranking is computed by joining these rows to
// finished matches, so any member whose predictions fell past the cut was scored
// as 0, and the cut shifts between requests as rows are updated (the updated_at
// trigger, autovacuum), making points flap toward 0 for different members each
// load.
//
// Page through every row, ordered by the stable primary key, so the full set
// always reaches computeRanking. On a mid-pagination error the rows gathered so
// far are still returned alongside the error, so a partial failure degrades to
// partial data rather than zeroing everyone.
export async function fetchAllLeaguePredictions(
  client: SupabaseClient,
  leagueId: string
): Promise<{ data: ScoringPrediction[]; error: { message: string } | null }> {
  const PAGE_SIZE = 1000
  const all: ScoringPrediction[] = []

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from('predictions')
      .select('user_id, match_id, predicted_home_score, predicted_away_score')
      .eq('league_id', leagueId)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) return { data: all, error }
    if (!data || data.length === 0) break

    all.push(...(data as ScoringPrediction[]))
    if (data.length < PAGE_SIZE) break
  }

  return { data: all, error: null }
}
