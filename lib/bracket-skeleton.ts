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

export interface BracketSlot {
  phase: KnockoutPhase
  pos: number
  homeLabel: string
  awayLabel: string
  feeds?: { phase: KnockoutPhase; pos: number; side: 'home' | 'away' }
  calendarKey: { date: string; venue: string }
}

// Bracket topology (single-elimination):
// R32 #1-2 → R16 #1 | R32 #3-4 → R16 #2 | ... | R32 #15-16 → R16 #8
// R16 #1-2 → QF #1 | R16 #3-4 → QF #2 | R16 #5-6 → QF #3 | R16 #7-8 → QF #4
// QF #1-2 → SF #1 | QF #3-4 → SF #2
// SF winners → Final; SF losers → 3rd Place
export const BRACKET_SKELETON: readonly BracketSlot[] = [
  // ─── Round of 32 (16 matches) ────────────────────────────────────────────
  {
    phase: '32nd',
    pos: 1,
    homeLabel: 'Vencedor 1º Grupo A',
    awayLabel: 'Vencedor 2º Grupo B',
    feeds: { phase: '16th', pos: 1, side: 'home' },
    calendarKey: { date: '2026-06-28T21:00:00Z', venue: 'MetLife Stadium' },
  },
  {
    phase: '32nd',
    pos: 2,
    homeLabel: 'Vencedor 1º Grupo B',
    awayLabel: 'Vencedor 2º Grupo A',
    feeds: { phase: '16th', pos: 1, side: 'away' },
    calendarKey: { date: '2026-06-28T18:00:00Z', venue: 'Rose Bowl Stadium' },
  },
  {
    phase: '32nd',
    pos: 3,
    homeLabel: 'Vencedor 1º Grupo C',
    awayLabel: 'Vencedor 2º Grupo D',
    feeds: { phase: '16th', pos: 2, side: 'home' },
    calendarKey: { date: '2026-06-29T21:00:00Z', venue: 'AT&T Stadium' },
  },
  {
    phase: '32nd',
    pos: 4,
    homeLabel: 'Vencedor 1º Grupo D',
    awayLabel: 'Vencedor 2º Grupo C',
    feeds: { phase: '16th', pos: 2, side: 'away' },
    calendarKey: { date: '2026-06-29T18:00:00Z', venue: 'Hard Rock Stadium' },
  },
  {
    phase: '32nd',
    pos: 5,
    homeLabel: 'Vencedor 1º Grupo E',
    awayLabel: 'Vencedor 2º Grupo F',
    feeds: { phase: '16th', pos: 3, side: 'home' },
    calendarKey: { date: '2026-06-30T21:00:00Z', venue: 'SoFi Stadium' },
  },
  {
    phase: '32nd',
    pos: 6,
    homeLabel: 'Vencedor 1º Grupo F',
    awayLabel: 'Vencedor 2º Grupo E',
    feeds: { phase: '16th', pos: 3, side: 'away' },
    calendarKey: { date: '2026-06-30T18:00:00Z', venue: 'Estadio Azteca' },
  },
  {
    phase: '32nd',
    pos: 7,
    homeLabel: 'Vencedor 1º Grupo G',
    awayLabel: 'Vencedor 2º Grupo H',
    feeds: { phase: '16th', pos: 4, side: 'home' },
    calendarKey: { date: '2026-07-01T21:00:00Z', venue: 'NRG Stadium' },
  },
  {
    phase: '32nd',
    pos: 8,
    homeLabel: 'Vencedor 1º Grupo H',
    awayLabel: 'Vencedor 2º Grupo G',
    feeds: { phase: '16th', pos: 4, side: 'away' },
    calendarKey: { date: '2026-07-01T18:00:00Z', venue: "Levi's Stadium" },
  },
  {
    phase: '32nd',
    pos: 9,
    homeLabel: 'Vencedor 1º Grupo I',
    awayLabel: '3º Grupos E/F/G/H',
    feeds: { phase: '16th', pos: 5, side: 'home' },
    calendarKey: { date: '2026-07-02T21:00:00Z', venue: 'Lincoln Financial Field' },
  },
  {
    phase: '32nd',
    pos: 10,
    homeLabel: 'Vencedor 1º Grupo J',
    awayLabel: '3º Grupos A/B/C/D',
    feeds: { phase: '16th', pos: 5, side: 'away' },
    calendarKey: { date: '2026-07-02T18:00:00Z', venue: 'BC Place' },
  },
  {
    phase: '32nd',
    pos: 11,
    homeLabel: 'Vencedor 1º Grupo K',
    awayLabel: '3º Grupos I/J/K/L',
    feeds: { phase: '16th', pos: 6, side: 'home' },
    calendarKey: { date: '2026-07-03T21:00:00Z', venue: 'Gillette Stadium' },
  },
  {
    phase: '32nd',
    pos: 12,
    homeLabel: 'Vencedor 1º Grupo L',
    awayLabel: '3º Grupos A/B/C/D',
    feeds: { phase: '16th', pos: 6, side: 'away' },
    calendarKey: { date: '2026-07-03T18:00:00Z', venue: 'Estadio BBVA' },
  },
  {
    phase: '32nd',
    pos: 13,
    homeLabel: 'Vencedor 2º Grupo I',
    awayLabel: '3º Grupos E/F/G/H',
    feeds: { phase: '16th', pos: 7, side: 'home' },
    calendarKey: { date: '2026-07-04T21:00:00Z', venue: 'Arrowhead Stadium' },
  },
  {
    phase: '32nd',
    pos: 14,
    homeLabel: 'Vencedor 2º Grupo J',
    awayLabel: '3º Grupos I/J/K/L',
    feeds: { phase: '16th', pos: 7, side: 'away' },
    calendarKey: { date: '2026-07-04T18:00:00Z', venue: 'BMO Field' },
  },
  {
    phase: '32nd',
    pos: 15,
    homeLabel: 'Vencedor 2º Grupo K',
    awayLabel: '3º Grupos A/B/C/D',
    feeds: { phase: '16th', pos: 8, side: 'home' },
    calendarKey: { date: '2026-07-05T21:00:00Z', venue: 'Estadio Akron' },
  },
  {
    phase: '32nd',
    pos: 16,
    homeLabel: 'Vencedor 2º Grupo L',
    awayLabel: '3º Grupos E/F/G/H',
    feeds: { phase: '16th', pos: 8, side: 'away' },
    calendarKey: { date: '2026-07-05T18:00:00Z', venue: 'Mercedes-Benz Stadium' },
  },

  // ─── Round of 16 (8 matches) ─────────────────────────────────────────────
  {
    phase: '16th',
    pos: 1,
    homeLabel: 'Vencedor 1/32 #1',
    awayLabel: 'Vencedor 1/32 #2',
    feeds: { phase: '8th', pos: 1, side: 'home' },
    calendarKey: { date: '2026-07-07T21:00:00Z', venue: 'MetLife Stadium' },
  },
  {
    phase: '16th',
    pos: 2,
    homeLabel: 'Vencedor 1/32 #3',
    awayLabel: 'Vencedor 1/32 #4',
    feeds: { phase: '8th', pos: 1, side: 'away' },
    calendarKey: { date: '2026-07-07T18:00:00Z', venue: 'AT&T Stadium' },
  },
  {
    phase: '16th',
    pos: 3,
    homeLabel: 'Vencedor 1/32 #5',
    awayLabel: 'Vencedor 1/32 #6',
    feeds: { phase: '8th', pos: 2, side: 'home' },
    calendarKey: { date: '2026-07-08T21:00:00Z', venue: 'SoFi Stadium' },
  },
  {
    phase: '16th',
    pos: 4,
    homeLabel: 'Vencedor 1/32 #7',
    awayLabel: 'Vencedor 1/32 #8',
    feeds: { phase: '8th', pos: 2, side: 'away' },
    calendarKey: { date: '2026-07-08T18:00:00Z', venue: 'Rose Bowl Stadium' },
  },
  {
    phase: '16th',
    pos: 5,
    homeLabel: 'Vencedor 1/32 #9',
    awayLabel: 'Vencedor 1/32 #10',
    feeds: { phase: '8th', pos: 3, side: 'home' },
    calendarKey: { date: '2026-07-09T21:00:00Z', venue: 'NRG Stadium' },
  },
  {
    phase: '16th',
    pos: 6,
    homeLabel: 'Vencedor 1/32 #11',
    awayLabel: 'Vencedor 1/32 #12',
    feeds: { phase: '8th', pos: 3, side: 'away' },
    calendarKey: { date: '2026-07-09T18:00:00Z', venue: "Levi's Stadium" },
  },
  {
    phase: '16th',
    pos: 7,
    homeLabel: 'Vencedor 1/32 #13',
    awayLabel: 'Vencedor 1/32 #14',
    feeds: { phase: '8th', pos: 4, side: 'home' },
    calendarKey: { date: '2026-07-10T21:00:00Z', venue: 'Lincoln Financial Field' },
  },
  {
    phase: '16th',
    pos: 8,
    homeLabel: 'Vencedor 1/32 #15',
    awayLabel: 'Vencedor 1/32 #16',
    feeds: { phase: '8th', pos: 4, side: 'away' },
    calendarKey: { date: '2026-07-10T18:00:00Z', venue: 'BC Place' },
  },

  // ─── Quarter-finals (4 matches) ──────────────────────────────────────────
  {
    phase: '8th',
    pos: 1,
    homeLabel: 'Vencedor 1/16 #1',
    awayLabel: 'Vencedor 1/16 #2',
    feeds: { phase: 'semi', pos: 1, side: 'home' },
    calendarKey: { date: '2026-07-12T21:00:00Z', venue: 'MetLife Stadium' },
  },
  {
    phase: '8th',
    pos: 2,
    homeLabel: 'Vencedor 1/16 #3',
    awayLabel: 'Vencedor 1/16 #4',
    feeds: { phase: 'semi', pos: 1, side: 'away' },
    calendarKey: { date: '2026-07-12T18:00:00Z', venue: 'AT&T Stadium' },
  },
  {
    phase: '8th',
    pos: 3,
    homeLabel: 'Vencedor 1/16 #5',
    awayLabel: 'Vencedor 1/16 #6',
    feeds: { phase: 'semi', pos: 2, side: 'home' },
    calendarKey: { date: '2026-07-13T21:00:00Z', venue: 'SoFi Stadium' },
  },
  {
    phase: '8th',
    pos: 4,
    homeLabel: 'Vencedor 1/16 #7',
    awayLabel: 'Vencedor 1/16 #8',
    feeds: { phase: 'semi', pos: 2, side: 'away' },
    calendarKey: { date: '2026-07-13T18:00:00Z', venue: "Levi's Stadium" },
  },

  // ─── Semi-finals (2 matches) ──────────────────────────────────────────────
  {
    phase: 'semi',
    pos: 1,
    homeLabel: 'Vencedor 1/8 #1',
    awayLabel: 'Vencedor 1/8 #2',
    feeds: { phase: 'final', pos: 1, side: 'home' },
    calendarKey: { date: '2026-07-16T21:00:00Z', venue: 'AT&T Stadium' },
  },
  {
    phase: 'semi',
    pos: 2,
    homeLabel: 'Vencedor 1/8 #3',
    awayLabel: 'Vencedor 1/8 #4',
    feeds: { phase: 'final', pos: 1, side: 'away' },
    calendarKey: { date: '2026-07-17T21:00:00Z', venue: 'MetLife Stadium' },
  },

  // ─── Third-place play-off (1 match) ──────────────────────────────────────
  {
    phase: '3rd_place',
    pos: 1,
    homeLabel: 'Perdedor SF #1',
    awayLabel: 'Perdedor SF #2',
    calendarKey: { date: '2026-07-18T20:00:00Z', venue: 'SoFi Stadium' },
  },

  // ─── Final (1 match) ─────────────────────────────────────────────────────
  {
    phase: 'final',
    pos: 1,
    homeLabel: 'Vencedor SF #1',
    awayLabel: 'Vencedor SF #2',
    calendarKey: { date: '2026-07-19T21:00:00Z', venue: 'MetLife Stadium' },
  },
]

const SLOT_BY_CALENDAR = new Map<string, { phase: KnockoutPhase; pos: number }>(
  BRACKET_SKELETON.map((slot) => [
    `${slot.calendarKey.date}|${slot.calendarKey.venue}`,
    { phase: slot.phase, pos: slot.pos },
  ])
)

export function resolveSlot(
  date: string,
  venue: string
): { phase: KnockoutPhase; pos: number } | null {
  return SLOT_BY_CALENDAR.get(`${date}|${venue}`) ?? null
}

export function isConfirmedMatchup(homeTeam: string, awayTeam: string): boolean {
  return VALID_TEAM_NAMES.has(homeTeam) && VALID_TEAM_NAMES.has(awayTeam)
}
