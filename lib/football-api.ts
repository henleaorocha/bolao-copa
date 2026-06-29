// openfootball ingestion adapter.
//
// Replaces the previous third-party paid API integration (ADR-006). Keeps the exported seam
// `fetchWorldCupFixtures()` so the sync route, hourly cron, upsert-by-
// `external_id`, and test mocks are preserved, but consumes openfootball's free
// 2026 JSON instead. openfootball's schema differs structurally: English names,
// split `date`/`time` with a local UTC offset, `ground` is a city (not a
// stadium), there is no status enum or live concept, no numeric fixture id, and
// `score` is absent until a match is played. The knockout topology is encoded
// as a stable game `num` (73..102 on R32..SF; the 2026 feed also numbers 3rd
// place 103 and the Final 104, though older editions omit those two) plus
// `W##`/`#A`/`L##` placeholders.

import { ALL_COPA_TEAMS, VALID_TEAM_NAMES } from '@/lib/copa-teams'
import { OPENFOOTBALL_TO_PT, toPtName } from '@/lib/team-names'

// Fonte real (produção). Pode ser sobrescrita por OPENFOOTBALL_URL para apontar
// a ingestão a um mock local em validação manual (ver scripts/gen-mock.mjs +
// scripts/serve-mock.mjs). Sem a env, o comportamento é idêntico ao de produção.
const OPENFOOTBALL_MOCK_URL = process.env.OPENFOOTBALL_URL
const OPENFOOTBALL_URL =
  OPENFOOTBALL_MOCK_URL ??
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'

export type MatchPhase =
  | 'group'
  | '32nd'
  | '16th'
  | '8th'
  | 'semi'
  | '3rd_place'
  | 'final'

// Raw openfootball match shape (mirrors the pinned fixture
// tests/fixtures/openfootball-wc2026.json).
export interface OpenfootballMatch {
  round: string // "Matchday 1" | "Round of 32" | "Quarter-final" | "Final" | ...
  num?: number // 73..102 on R32..SF; the 2026 feed also numbers 3rd place (103) and the Final (104), though some editions omit those two
  date: string // "2026-07-04"
  time: string // "17:00 UTC-4"
  team1: string // EN name OR placeholder ("Mexico" | "2A" | "W74" | "L101")
  team2: string
  group?: string // "Group A" (group matches only)
  ground: string // city, e.g. "Los Angeles (Inglewood)"
  score?: { ft?: [number, number]; et?: [number, number] } // et present only if extra time was played
}

// Internal row shape consumed by the sync route (one `matches` table row).
export interface MatchRow {
  external_id: string // "wc2026-73" | "wc2026-final" | "wc2026-A-Brasil-..."
  home_team: string
  away_team: string
  home_flag: string | null
  away_flag: string | null
  match_date: string // ISO timestamptz (date + offset combined)
  phase: MatchPhase
  group: string | null
  venue: string
  city: string
  status: 'scheduled' | 'finished'
  home_score: number | null
  away_score: number | null
}

// openfootball round names → internal phase. Group matches use "Matchday N"
// and are handled separately. Knockout names are matched verbatim (both the
// singular forms in the captured fixture and tolerant plural aliases).
const ROUND_TO_PHASE: Record<string, MatchPhase> = {
  'Round of 32': '32nd',
  'Round of 16': '16th',
  'Quarter-final': '8th',
  'Quarter-finals': '8th',
  'Semi-final': 'semi',
  'Semi-finals': 'semi',
  'Match for third place': '3rd_place',
  '3rd Place': '3rd_place',
  Final: 'final',
}

function resolveFlag(teamName: string): string | null {
  return ALL_COPA_TEAMS.find((t) => t.name === teamName)?.code ?? null
}

// Knockout slot placeholders ("2A", "1E", "3A/B/C/D/F", "W74", "L101") rather
// than real teams. Used so the adapter only logs genuinely unmapped real names,
// not the expected pre-fill placeholders. No real team name starts with a digit
// or with W/L followed by a digit.
function isPlaceholder(name: string): boolean {
  return /^\d/.test(name) || /^[WL]\d/.test(name)
}

// Log an unmapped real team string structurally without failing the run, so the
// gap is visible and the row still upserts with the original string left as-is.
function logUnmappedTeam(name: string): void {
  console.warn(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warn',
      source: 'openfootball',
      event: 'ingestion_unmapped_team',
      team: name,
    })
  )
}

function normalizeTeam(raw: string): string {
  if (
    !isPlaceholder(raw) &&
    !(raw in OPENFOOTBALL_TO_PT) &&
    !VALID_TEAM_NAMES.has(raw)
  ) {
    logUnmappedTeam(raw)
  }
  return toPtName(raw)
}

// Combine an openfootball date ("2026-06-11") and time-with-offset
// ("13:00 UTC-6") into an ISO timestamptz instant. The UTC±N offset is applied
// so the stored instant is correct regardless of viewer timezone. Unknown time
// shapes fall back to midnight UTC rather than throwing.
function toIsoTimestamp(date: string, time: string): string {
  const [hm = '00:00', tz = ''] = time.trim().split(/\s+/)
  let offset = '+00:00'
  const m = tz.match(/^UTC([+-])(\d{1,2})(?::?(\d{2}))?$/)
  if (m) {
    const sign = m[1]
    const hh = m[2].padStart(2, '0')
    const mm = (m[3] ?? '00').padStart(2, '0')
    offset = `${sign}${hh}:${mm}`
  }
  const instant = new Date(`${date}T${hm}:00${offset}`)
  if (Number.isNaN(instant.getTime())) {
    // Malformed date/time: preserve the calendar day at UTC midnight.
    return new Date(`${date}T00:00:00Z`).toISOString()
  }
  return instant.toISOString()
}

function parsePhaseAndGroup(m: OpenfootballMatch): {
  phase: MatchPhase
  group: string | null
} {
  if (m.round.startsWith('Matchday')) {
    return {
      phase: 'group',
      group: m.group ? m.group.replace(/^Group /, '') : null,
    }
  }
  return { phase: ROUND_TO_PHASE[m.round] ?? 'group', group: null }
}

// Synthesize a stable external_id:
//   knockout with a num → `wc2026-<num>` (R32..SF = 73..102; the 2026 feed also
//                          numbers 3rd place 103 and the Final 104)
//   Final  without num  → `wc2026-final` (older feeds that omit the num)
//   3rd    without num  → `wc2026-3rd`
//   group               → `wc2026-<group>-<team1>-<team2>` (PT names, stable per draw)
// The bracket resolves the Final/3rd slot by both forms (see SLOT_BY_EXTERNAL_ID
// aliases in bracket-skeleton.ts), so a num on those two is non-breaking.
function buildExternalId(
  m: OpenfootballMatch,
  phase: MatchPhase,
  group: string | null,
  homeTeam: string,
  awayTeam: string
): string {
  if (m.num != null) return `wc2026-${m.num}`
  if (phase === 'final') return 'wc2026-final'
  if (phase === '3rd_place') return 'wc2026-3rd'
  if (phase === 'group') return `wc2026-${group}-${homeTeam}-${awayTeam}`
  // Knockout match without a num and not Final/3rd (not expected in the source):
  // fall back to a round-derived key so the row still has a stable id.
  return `wc2026-${m.round}-${homeTeam}-${awayTeam}`
}

// Derive status and scores from the optional `score` object.
// Prefers `score.et` (tempo normal + prorrogação) over `score.ft` when extra
// time was played — penalties are excluded per bolão rules. Falls back to
// scheduled with null scores when no valid score tuple is present.
function deriveResult(score: OpenfootballMatch['score']): {
  status: MatchRow['status']
  home_score: number | null
  away_score: number | null
} {
  const isValidTuple = (t: unknown): t is [number, number] =>
    Array.isArray(t) && t.length === 2 && typeof t[0] === 'number' && typeof t[1] === 'number'

  const effective = isValidTuple(score?.et) ? score!.et : score?.ft
  if (isValidTuple(effective)) {
    return { status: 'finished', home_score: effective[0], away_score: effective[1] }
  }
  return { status: 'scheduled', home_score: null, away_score: null }
}

// Map a single openfootball match to the internal `matches` row shape.
export function mapOpenfootballMatch(m: OpenfootballMatch): MatchRow {
  const { phase, group } = parsePhaseAndGroup(m)
  const homeTeam = normalizeTeam(m.team1)
  const awayTeam = normalizeTeam(m.team2)
  const { status, home_score, away_score } = deriveResult(m.score)

  return {
    external_id: buildExternalId(m, phase, group, homeTeam, awayTeam),
    home_team: homeTeam,
    away_team: awayTeam,
    home_flag: resolveFlag(homeTeam),
    away_flag: resolveFlag(awayTeam),
    match_date: toIsoTimestamp(m.date, m.time),
    phase,
    group,
    venue: m.ground,
    city: m.ground,
    status,
    home_score,
    away_score,
  }
}

// Fetch the openfootball 2026 schedule. No api key. Preserves the existing cache
// contract (`next: { revalidate: 3600, tags: ['fixtures'] }`). Defensive parse:
// a non-array / `matches`-less body throws so the sync route reports the failure
// rather than upserting garbage.
export async function fetchWorldCupFixtures(): Promise<OpenfootballMatch[]> {
  // No modo mock desliga o cache para que cada regeneração do snapshot seja
  // refletida no próximo sync sem reiniciar o dev. Em produção mantém o cache de
  // 1h com a tag 'fixtures' (invalidada ao final do sync).
  const res = await fetch(
    OPENFOOTBALL_URL,
    OPENFOOTBALL_MOCK_URL
      ? { cache: 'no-store' }
      : { next: { revalidate: 3600, tags: ['fixtures'] } }
  )

  if (!res.ok) {
    throw new Error(`openfootball responded with ${res.status}`)
  }

  const json: unknown = await res.json()
  const matches = (json as { matches?: unknown } | null)?.matches

  if (!Array.isArray(matches)) {
    throw new Error('openfootball response is malformed: expected matches array')
  }

  return matches as OpenfootballMatch[]
}
