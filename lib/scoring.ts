import type { KnockoutPhase } from '@/lib/bracket-skeleton'

export const PHASE_MULTIPLIERS: Record<KnockoutPhase, number> = {
  '32nd': 1.5,
  '16th': 2,
  '8th': 2.5,
  semi: 3,
  '3rd_place': 3.5,
  final: 4,
}

export interface ScoreInput {
  ph: number // predicted home
  pa: number // predicted away
  rh: number // real home
  ra: number // real away
}

export function scoreGroup(i: ScoreInput): number {
  if (i.ph === i.rh && i.pa === i.ra) return 10
  if (Math.sign(i.ph - i.pa) === Math.sign(i.rh - i.ra)) return 5
  return 0
}

export function scoreKnockout(i: ScoreInput, phase: KnockoutPhase): number {
  return scoreGroup(i) * PHASE_MULTIPLIERS[phase]
}

export function scoreChampion(
  pickChamp: string,
  pickVice: string,
  realChamp: string | null,
  realVice: string | null
): number {
  if (realChamp === null || realVice === null) return 0
  let points = 0
  if (pickChamp === realChamp) points += 50
  if (pickVice === realVice) points += 25
  return points
}
