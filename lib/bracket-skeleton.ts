import { VALID_TEAM_NAMES } from '@/lib/copa-teams'

export type KnockoutPhase = '32nd' | '16th' | '8th' | 'semi' | '3rd_place' | 'final'

export const PHASE_ORDER: readonly KnockoutPhase[] = [
  '32nd',
  '16th',
  '8th',
  'semi',
  '3rd_place',
  'final',
]

// Where one side of a slot's matchup comes from, parsed from openfootball's
// native placeholder codes (ADR-007):
//   "1A"/"2B"            → group winner / runner-up        (kind: 'group')
//   "3A/B/C/D/F"         → a 3rd place from one of N groups (kind: 'group', rank 3)
//   "W74"                → winner of game 74               (kind: 'match', 'winner')
//   "L101"               → loser of game 101               (kind: 'match', 'loser')
export type SlotSource =
  | { kind: 'group'; rank: 1 | 2 | 3; groups: string[]; raw: string }
  | { kind: 'match'; result: 'winner' | 'loser'; num: number; raw: string }

export interface BracketSlot {
  phase: KnockoutPhase
  pos: number
  // openfootball game number (73..102 on R32..SF); null for Final & 3rd place.
  num: number | null
  // Stable id matching a synced row's external_id (ADR-006/007):
  // `wc2026-<num>` for R32..SF, `wc2026-final`, `wc2026-3rd`.
  externalId: string
  // Portuguese pre-fill labels, shown until the real teams are known. These are
  // decorative; the authoritative topology is `num` + the parsed sources below.
  homeLabel: string
  awayLabel: string
  // Parsed openfootball placeholders for each side (null if unparseable).
  homeSource: SlotSource | null
  awaySource: SlotSource | null
}

// Tolerant placeholder parser. Handles the captured openfootball spellings
// ("W74", "2A", "3A/B/C/D/F", "L101") plus common variants ("Winner 74",
// "Loser 101", PT "Vencedor"/"Perdedor", optional spacing) so the bracket keeps
// working if upstream spelling drifts (ADR-007 risk mitigation).
const WINNER_RE = /^(?:w|winner|vencedor)\s*(\d{1,3})$/i
const LOSER_RE = /^(?:l|loser|perdedor)\s*(\d{1,3})$/i
const GROUP_RE = /^([123])\s*([a-l](?:\/[a-l])*)$/i

export function parsePlaceholder(raw: string): SlotSource | null {
  const s = raw.trim()

  const winner = s.match(WINNER_RE)
  if (winner) return { kind: 'match', result: 'winner', num: Number(winner[1]), raw }

  const loser = s.match(LOSER_RE)
  if (loser) return { kind: 'match', result: 'loser', num: Number(loser[1]), raw }

  const group = s.match(GROUP_RE)
  if (group) {
    return {
      kind: 'group',
      rank: Number(group[1]) as 1 | 2 | 3,
      groups: group[2].toUpperCase().split('/'),
      raw,
    }
  }

  return null
}

// Knockout topology, sourced directly from the openfootball 2026 schedule
// (tests/fixtures/openfootball-wc2026.json): `num`, the W##/#A/L## placeholder
// codes, and positional num↔pos assignment (R32 pos1..16 = num 73..88, etc.).
// `homeLabel`/`awayLabel` are kept verbatim from the prior skeleton.
interface RawSlot {
  phase: KnockoutPhase
  pos: number
  num: number | null
  home: string
  away: string
  homeLabel: string
  awayLabel: string
}

const RAW_SLOTS: readonly RawSlot[] = [
  // ─── Round of 32 (num 73-88) ─────────────────────────────────────────────
  { phase: '32nd', pos: 1, num: 73, home: '2A', away: '2B', homeLabel: 'Vencedor 1º Grupo A', awayLabel: 'Vencedor 2º Grupo B' },
  { phase: '32nd', pos: 2, num: 74, home: '1E', away: '3A/B/C/D/F', homeLabel: 'Vencedor 1º Grupo B', awayLabel: 'Vencedor 2º Grupo A' },
  { phase: '32nd', pos: 3, num: 75, home: '1F', away: '2C', homeLabel: 'Vencedor 1º Grupo C', awayLabel: 'Vencedor 2º Grupo D' },
  { phase: '32nd', pos: 4, num: 76, home: '1C', away: '2F', homeLabel: 'Vencedor 1º Grupo D', awayLabel: 'Vencedor 2º Grupo C' },
  { phase: '32nd', pos: 5, num: 77, home: '1I', away: '3C/D/F/G/H', homeLabel: 'Vencedor 1º Grupo E', awayLabel: 'Vencedor 2º Grupo F' },
  { phase: '32nd', pos: 6, num: 78, home: '2E', away: '2I', homeLabel: 'Vencedor 1º Grupo F', awayLabel: 'Vencedor 2º Grupo E' },
  { phase: '32nd', pos: 7, num: 79, home: '1A', away: '3C/E/F/H/I', homeLabel: 'Vencedor 1º Grupo G', awayLabel: 'Vencedor 2º Grupo H' },
  { phase: '32nd', pos: 8, num: 80, home: '1L', away: '3E/H/I/J/K', homeLabel: 'Vencedor 1º Grupo H', awayLabel: 'Vencedor 2º Grupo G' },
  { phase: '32nd', pos: 9, num: 81, home: '1D', away: '3B/E/F/I/J', homeLabel: 'Vencedor 1º Grupo I', awayLabel: '3º Grupos E/F/G/H' },
  { phase: '32nd', pos: 10, num: 82, home: '1G', away: '3A/E/H/I/J', homeLabel: 'Vencedor 1º Grupo J', awayLabel: '3º Grupos A/B/C/D' },
  { phase: '32nd', pos: 11, num: 83, home: '2K', away: '2L', homeLabel: 'Vencedor 1º Grupo K', awayLabel: '3º Grupos I/J/K/L' },
  { phase: '32nd', pos: 12, num: 84, home: '1H', away: '2J', homeLabel: 'Vencedor 1º Grupo L', awayLabel: '3º Grupos A/B/C/D' },
  { phase: '32nd', pos: 13, num: 85, home: '1B', away: '3E/F/G/I/J', homeLabel: 'Vencedor 2º Grupo I', awayLabel: '3º Grupos E/F/G/H' },
  { phase: '32nd', pos: 14, num: 86, home: '1J', away: '2H', homeLabel: 'Vencedor 2º Grupo J', awayLabel: '3º Grupos I/J/K/L' },
  { phase: '32nd', pos: 15, num: 87, home: '1K', away: '3D/E/I/J/L', homeLabel: 'Vencedor 2º Grupo K', awayLabel: '3º Grupos A/B/C/D' },
  { phase: '32nd', pos: 16, num: 88, home: '2D', away: '2G', homeLabel: 'Vencedor 2º Grupo L', awayLabel: '3º Grupos E/F/G/H' },

  // ─── Round of 16 (num 89-96) ─────────────────────────────────────────────
  { phase: '16th', pos: 1, num: 89, home: 'W74', away: 'W77', homeLabel: 'Vencedor 1/32 #1', awayLabel: 'Vencedor 1/32 #2' },
  { phase: '16th', pos: 2, num: 90, home: 'W73', away: 'W75', homeLabel: 'Vencedor 1/32 #3', awayLabel: 'Vencedor 1/32 #4' },
  { phase: '16th', pos: 3, num: 91, home: 'W76', away: 'W78', homeLabel: 'Vencedor 1/32 #5', awayLabel: 'Vencedor 1/32 #6' },
  { phase: '16th', pos: 4, num: 92, home: 'W79', away: 'W80', homeLabel: 'Vencedor 1/32 #7', awayLabel: 'Vencedor 1/32 #8' },
  { phase: '16th', pos: 5, num: 93, home: 'W83', away: 'W84', homeLabel: 'Vencedor 1/32 #9', awayLabel: 'Vencedor 1/32 #10' },
  { phase: '16th', pos: 6, num: 94, home: 'W81', away: 'W82', homeLabel: 'Vencedor 1/32 #11', awayLabel: 'Vencedor 1/32 #12' },
  { phase: '16th', pos: 7, num: 95, home: 'W86', away: 'W88', homeLabel: 'Vencedor 1/32 #13', awayLabel: 'Vencedor 1/32 #14' },
  { phase: '16th', pos: 8, num: 96, home: 'W85', away: 'W87', homeLabel: 'Vencedor 1/32 #15', awayLabel: 'Vencedor 1/32 #16' },

  // ─── Quarter-finals (num 97-100) ─────────────────────────────────────────
  { phase: '8th', pos: 1, num: 97, home: 'W89', away: 'W90', homeLabel: 'Vencedor 1/16 #1', awayLabel: 'Vencedor 1/16 #2' },
  { phase: '8th', pos: 2, num: 98, home: 'W93', away: 'W94', homeLabel: 'Vencedor 1/16 #3', awayLabel: 'Vencedor 1/16 #4' },
  { phase: '8th', pos: 3, num: 99, home: 'W91', away: 'W92', homeLabel: 'Vencedor 1/16 #5', awayLabel: 'Vencedor 1/16 #6' },
  { phase: '8th', pos: 4, num: 100, home: 'W95', away: 'W96', homeLabel: 'Vencedor 1/16 #7', awayLabel: 'Vencedor 1/16 #8' },

  // ─── Semi-finals (num 101-102) ───────────────────────────────────────────
  { phase: 'semi', pos: 1, num: 101, home: 'W97', away: 'W98', homeLabel: 'Vencedor 1/8 #1', awayLabel: 'Vencedor 1/8 #2' },
  { phase: 'semi', pos: 2, num: 102, home: 'W99', away: 'W100', homeLabel: 'Vencedor 1/8 #3', awayLabel: 'Vencedor 1/8 #4' },

  // ─── Third-place play-off (no num) ───────────────────────────────────────
  { phase: '3rd_place', pos: 1, num: null, home: 'L101', away: 'L102', homeLabel: 'Perdedor SF #1', awayLabel: 'Perdedor SF #2' },

  // ─── Final (no num) ──────────────────────────────────────────────────────
  { phase: 'final', pos: 1, num: null, home: 'W101', away: 'W102', homeLabel: 'Vencedor SF #1', awayLabel: 'Vencedor SF #2' },
]

function externalIdFor(slot: RawSlot): string {
  if (slot.num != null) return `wc2026-${slot.num}`
  return slot.phase === 'final' ? 'wc2026-final' : 'wc2026-3rd'
}

export const BRACKET_SKELETON: readonly BracketSlot[] = RAW_SLOTS.map((slot) => ({
  phase: slot.phase,
  pos: slot.pos,
  num: slot.num,
  externalId: externalIdFor(slot),
  homeLabel: slot.homeLabel,
  awayLabel: slot.awayLabel,
  homeSource: parsePlaceholder(slot.home),
  awaySource: parsePlaceholder(slot.away),
}))

const SLOT_BY_EXTERNAL_ID = new Map<string, { phase: KnockoutPhase; pos: number }>(
  BRACKET_SKELETON.map((slot) => [slot.externalId, { phase: slot.phase, pos: slot.pos }])
)

const SLOT_BY_NUM = new Map<number, { phase: KnockoutPhase; pos: number }>(
  BRACKET_SKELETON.filter((slot) => slot.num != null).map((slot) => [
    slot.num as number,
    { phase: slot.phase, pos: slot.pos },
  ])
)

// Resolve a synced match (by its external_id) to its bracket slot. Replaces the
// removed resolveSlot(date, venue) — openfootball's `ground` is a city, so the
// venue half could never match (ADR-007).
export function slotForExternalId(
  externalId: string
): { phase: KnockoutPhase; pos: number } | null {
  return SLOT_BY_EXTERNAL_ID.get(externalId) ?? null
}

// Resolve an openfootball game `num` to its bracket slot.
export function slotForNum(num: number): { phase: KnockoutPhase; pos: number } | null {
  return SLOT_BY_NUM.get(num) ?? null
}

// Downstream linkage derived from the W##/L## sources: the winner (or loser, for
// the 3rd-place match) of game `num` flows into slot (phase, pos) on `side`.
export interface SlotFeed {
  num: number
  result: 'winner' | 'loser'
  phase: KnockoutPhase
  pos: number
  side: 'home' | 'away'
}

export const SLOT_FEEDS: readonly SlotFeed[] = BRACKET_SKELETON.flatMap((slot) =>
  (['home', 'away'] as const).flatMap<SlotFeed>((side) => {
    const source = side === 'home' ? slot.homeSource : slot.awaySource
    if (source && source.kind === 'match') {
      return [
        { num: source.num, result: source.result, phase: slot.phase, pos: slot.pos, side },
      ]
    }
    return []
  })
)

export function isConfirmedMatchup(homeTeam: string, awayTeam: string): boolean {
  return VALID_TEAM_NAMES.has(homeTeam) && VALID_TEAM_NAMES.has(awayTeam)
}
