import {
  BRACKET_SKELETON,
  PHASE_ORDER,
  slotForExternalId,
  isConfirmedMatchup,
  type KnockoutPhase,
} from '@/lib/bracket-skeleton'
import type { Match } from '@/lib/api/types'

export type SlotState = 'placeholder' | 'open' | 'locked' | 'finished'

export interface BracketSlotView {
  pos: number
  state: SlotState
  multiplier: number
  homeTeam: string | null
  awayTeam: string | null
  homeFlag: string | null
  awayFlag: string | null
  homeLabel: string
  awayLabel: string
  matchId: string | null
  kickoff: string | null
  homeScore: number | null
  awayScore: number | null
  prediction: { home: number; away: number } | null
}

export interface BracketPhaseView {
  phase: KnockoutPhase
  label: string
  multiplier: number
  slots: BracketSlotView[]
}

export interface BracketResponse {
  phases: BracketPhaseView[]
  newlyUnlockedPhase: KnockoutPhase | null
  // Earliest phase in PHASE_ORDER still in play (any slot not 'finished'); falls
  // back to the last phase ('final') when the whole knockout is finished. Always
  // non-null. Seeds the Mata-mata page's initial selected phase (ADR-004).
  activePhase: KnockoutPhase
}

export const PHASE_MULTIPLIERS: Record<KnockoutPhase, number> = {
  '32nd': 1.5,
  '16th': 2,
  '8th': 2.5,
  semi: 3,
  '3rd_place': 3.5,
  final: 4,
}

export const PHASE_LABELS: Record<KnockoutPhase, string> = {
  '32nd': 'Rodada dos 32',
  '16th': 'Oitavas de Final',
  '8th': 'Quartas de Final',
  semi: 'Semifinais',
  '3rd_place': 'Disputa do 3º Lugar',
  final: 'Final',
}

export type PredictionRow = {
  match_id: string
  predicted_home_score: number
  predicted_away_score: number
}

/**
 * Pure function — no I/O. Merges the static skeleton with live knockout matches
 * by (phase, pos), derives per-slot state and multiplier, attaches user predictions,
 * and computes newlyUnlockedPhase.
 *
 * @param matches      Knockout match rows from the DB (any phase in the knockout set)
 * @param predictions  User's prediction rows for this league
 * @param nowMs        Current timestamp in ms (injectable for testing)
 */
export function buildBracketResponse(
  matches: Match[],
  predictions: PredictionRow[],
  nowMs: number = Date.now()
): BracketResponse {
  // Index matches by their bracket slot, keyed on external_id (= wc2026-<num> /
  // -final / -3rd). openfootball's `ground` is a city, so the old (date, venue)
  // key could never match; external_id is the stable knockout key (ADR-007).
  const matchBySlot = new Map<string, Match>()
  for (const match of matches) {
    if (!match.external_id) continue
    const slot = slotForExternalId(match.external_id)
    if (slot) {
      matchBySlot.set(`${slot.phase}:${slot.pos}`, match)
    }
  }

  // Index predictions by match_id
  const predByMatchId = new Map<string, PredictionRow>()
  for (const pred of predictions) {
    predByMatchId.set(pred.match_id, pred)
  }

  // A slot is locked when match kickoff is within the 1h deadline window
  const deadlineThreshold = new Date(nowMs + 60 * 60 * 1000)

  // newlyUnlockedPhase = most recent phase (last in PHASE_ORDER) with an open un-bet slot
  let newlyUnlockedPhase: KnockoutPhase | null = null

  const phases: BracketPhaseView[] = PHASE_ORDER.map((phase) => {
    const multiplier = PHASE_MULTIPLIERS[phase]
    const label = PHASE_LABELS[phase]

    const skeletonSlots = BRACKET_SKELETON.filter((s) => s.phase === phase).sort(
      (a, b) => a.pos - b.pos
    )

    const slots: BracketSlotView[] = skeletonSlots.map((skeleton) => {
      const match = matchBySlot.get(`${phase}:${skeleton.pos}`) ?? null

      let state: SlotState = 'placeholder'
      let homeTeam: string | null = null
      let awayTeam: string | null = null
      let homeFlag: string | null = null
      let awayFlag: string | null = null
      let matchId: string | null = null
      let kickoff: string | null = null
      let homeScore: number | null = null
      let awayScore: number | null = null
      let prediction: { home: number; away: number } | null = null

      if (match && isConfirmedMatchup(match.home_team, match.away_team)) {
        homeTeam = match.home_team
        awayTeam = match.away_team
        homeFlag = match.home_flag
        awayFlag = match.away_flag
        matchId = match.id
        kickoff = match.match_date
        homeScore = match.home_score
        awayScore = match.away_score

        if (match.status === 'finished') {
          state = 'finished'
        } else if (new Date(match.match_date) < deadlineThreshold) {
          state = 'locked'
        } else {
          state = 'open'
        }

        const pred = predByMatchId.get(match.id)
        if (pred) {
          prediction = {
            home: pred.predicted_home_score,
            away: pred.predicted_away_score,
          }
        }
      }

      return {
        pos: skeleton.pos,
        state,
        multiplier,
        homeTeam,
        awayTeam,
        homeFlag,
        awayFlag,
        homeLabel: skeleton.homeLabel,
        awayLabel: skeleton.awayLabel,
        matchId,
        kickoff,
        homeScore,
        awayScore,
        prediction,
      }
    })

    // Update unlock signal: track the latest phase in PHASE_ORDER with an open un-bet slot
    if (slots.some((s) => s.state === 'open' && s.prediction === null)) {
      newlyUnlockedPhase = phase
    }

    return { phase, label, multiplier, slots }
  })

  // activePhase = first phase in PHASE_ORDER (phases is built in that order) with any
  // non-finished slot; if every phase is fully finished, fall back to 'final'. Never
  // null. Independent of newlyUnlockedPhase, which tracks the latest open un-bet phase.
  const activePhase: KnockoutPhase =
    phases.find((p) => p.slots.some((s) => s.state !== 'finished'))?.phase ??
    PHASE_ORDER[PHASE_ORDER.length - 1]

  return { phases, newlyUnlockedPhase, activePhase }
}
