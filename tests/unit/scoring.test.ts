import { describe, it, expect } from 'vitest'
import {
  PHASE_MULTIPLIERS,
  scoreGroup,
  scoreKnockout,
  scoreChampion,
  type ScoreInput,
} from '@/lib/scoring'
import type { KnockoutPhase } from '@/lib/bracket-skeleton'

describe('PHASE_MULTIPLIERS', () => {
  it('has all six phases with correct multipliers', () => {
    expect(PHASE_MULTIPLIERS).toEqual({
      '32nd': 1.5,
      '16th': 2,
      '8th': 2.5,
      semi: 3,
      '3rd_place': 3.5,
      final: 4,
    })
  })

  it('covers exactly the six KnockoutPhase values', () => {
    const keys = Object.keys(PHASE_MULTIPLIERS)
    expect(keys).toHaveLength(6)
    expect(keys).toContain('32nd')
    expect(keys).toContain('16th')
    expect(keys).toContain('8th')
    expect(keys).toContain('semi')
    expect(keys).toContain('3rd_place')
    expect(keys).toContain('final')
  })
})

describe('scoreGroup', () => {
  it('exact score home win (2-1 vs 2-1) → 10', () => {
    expect(scoreGroup({ ph: 2, pa: 1, rh: 2, ra: 1 })).toBe(10)
  })

  it('exact score draw (0-0 vs 0-0) → 10', () => {
    expect(scoreGroup({ ph: 0, pa: 0, rh: 0, ra: 0 })).toBe(10)
  })

  it('exact score away win (1-3 vs 1-3) → 10', () => {
    expect(scoreGroup({ ph: 1, pa: 3, rh: 1, ra: 3 })).toBe(10)
  })

  it('exact score large score (4-2 vs 4-2) → 10', () => {
    expect(scoreGroup({ ph: 4, pa: 2, rh: 4, ra: 2 })).toBe(10)
  })

  it('correct outcome non-exact, home win (2-1 vs 3-1) → 5', () => {
    expect(scoreGroup({ ph: 2, pa: 1, rh: 3, ra: 1 })).toBe(5)
  })

  it('correct outcome non-exact, away win (0-2 vs 1-4) → 5', () => {
    expect(scoreGroup({ ph: 0, pa: 2, rh: 1, ra: 4 })).toBe(5)
  })

  it('correct draw outcome, non-exact (0-0 vs 1-1) → 5', () => {
    expect(scoreGroup({ ph: 0, pa: 0, rh: 1, ra: 1 })).toBe(5)
  })

  it('correct draw outcome, non-exact (2-2 vs 3-3) → 5', () => {
    expect(scoreGroup({ ph: 2, pa: 2, rh: 3, ra: 3 })).toBe(5)
  })

  it('wrong outcome: predicted home win, real away win (2-1 vs 1-2) → 0', () => {
    expect(scoreGroup({ ph: 2, pa: 1, rh: 1, ra: 2 })).toBe(0)
  })

  it('wrong outcome: predicted draw, real home win (1-1 vs 2-1) → 0', () => {
    expect(scoreGroup({ ph: 1, pa: 1, rh: 2, ra: 1 })).toBe(0)
  })

  it('wrong outcome: predicted home win, real draw (1-0 vs 1-1) → 0', () => {
    expect(scoreGroup({ ph: 1, pa: 0, rh: 1, ra: 1 })).toBe(0)
  })

  it('wrong outcome: predicted away win, real draw (0-1 vs 2-2) → 0', () => {
    expect(scoreGroup({ ph: 0, pa: 1, rh: 2, ra: 2 })).toBe(0)
  })
})

describe('scoreKnockout — exact base (+10)', () => {
  const exactInput: ScoreInput = { ph: 2, pa: 1, rh: 2, ra: 1 }

  it.each<[KnockoutPhase, number]>([
    ['32nd', 15],
    ['16th', 20],
    ['8th', 25],
    ['semi', 30],
    ['3rd_place', 35],
    ['final', 40],
  ])('%s: 10 × multiplier → %d', (phase, expected) => {
    expect(scoreKnockout(exactInput, phase)).toBe(expected)
  })
})

describe('scoreKnockout — outcome base (+5)', () => {
  const outcomeInput: ScoreInput = { ph: 2, pa: 1, rh: 3, ra: 1 }

  it.each<[KnockoutPhase, number]>([
    ['32nd', 7.5],
    ['16th', 10],
    ['8th', 12.5],
    ['semi', 15],
    ['3rd_place', 17.5],
    ['final', 20],
  ])('%s: 5 × multiplier → %s (asserts non-integer representation)', (phase, expected) => {
    expect(scoreKnockout(outcomeInput, phase)).toBe(expected)
  })
})

describe('scoreKnockout — miss base (0)', () => {
  const missInput: ScoreInput = { ph: 2, pa: 1, rh: 1, ra: 2 }

  it.each<KnockoutPhase>(['32nd', '16th', '8th', 'semi', '3rd_place', 'final'])(
    '%s: 0 × multiplier → 0',
    (phase) => {
      expect(scoreKnockout(missInput, phase)).toBe(0)
    }
  )
})

describe('scoreChampion', () => {
  it('champion hit only → 50', () => {
    expect(scoreChampion('Brasil', 'Argentina', 'Brasil', 'França')).toBe(50)
  })

  it('vice hit only → 25', () => {
    expect(scoreChampion('França', 'Argentina', 'Brasil', 'Argentina')).toBe(25)
  })

  it('both champion and vice hit → 75', () => {
    expect(scoreChampion('Brasil', 'Argentina', 'Brasil', 'Argentina')).toBe(75)
  })

  it('neither champion nor vice matched → 0', () => {
    expect(scoreChampion('França', 'Alemanha', 'Brasil', 'Argentina')).toBe(0)
  })

  it('real champion is null (unresolved) → 0', () => {
    expect(scoreChampion('Brasil', 'Argentina', null, 'Argentina')).toBe(0)
  })

  it('real vice is null (unresolved) → 0', () => {
    expect(scoreChampion('Brasil', 'Argentina', 'Brasil', null)).toBe(0)
  })

  it('both real champion and vice are null → 0', () => {
    expect(scoreChampion('Brasil', 'Argentina', null, null)).toBe(0)
  })
})

describe('purity — same input, same output, no side effects', () => {
  it('scoreGroup returns identical result on repeated calls', () => {
    const input: ScoreInput = { ph: 2, pa: 1, rh: 2, ra: 1 }
    const first = scoreGroup(input)
    const second = scoreGroup(input)
    expect(first).toBe(10)
    expect(second).toBe(10)
    expect(first).toBe(second)
  })

  it('scoreKnockout returns identical result on repeated calls', () => {
    const input: ScoreInput = { ph: 2, pa: 1, rh: 2, ra: 1 }
    const first = scoreKnockout(input, 'semi')
    const second = scoreKnockout(input, 'semi')
    expect(first).toBe(30)
    expect(second).toBe(30)
    expect(first).toBe(second)
  })

  it('scoreChampion returns identical result on repeated calls', () => {
    const first = scoreChampion('Brasil', 'Argentina', 'Brasil', 'Argentina')
    const second = scoreChampion('Brasil', 'Argentina', 'Brasil', 'Argentina')
    expect(first).toBe(75)
    expect(second).toBe(75)
    expect(first).toBe(second)
  })

  it('scoreGroup does not mutate input', () => {
    const input: ScoreInput = { ph: 2, pa: 1, rh: 2, ra: 1 }
    const copy = { ...input }
    scoreGroup(input)
    expect(input).toEqual(copy)
  })
})
