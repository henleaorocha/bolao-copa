import { describe, it, expect } from 'vitest'
import {
  BRACKET_SKELETON,
  PHASE_ORDER,
  resolveSlot,
  isConfirmedMatchup,
  type KnockoutPhase,
} from '@/lib/bracket-skeleton'

describe('BRACKET_SKELETON structural validation', () => {
  it('has exactly 32 slots', () => {
    expect(BRACKET_SKELETON).toHaveLength(32)
  })

  it('has correct per-phase counts: 16/8/4/2/1/1', () => {
    const counts = Object.fromEntries(
      PHASE_ORDER.map((phase) => [
        phase,
        BRACKET_SKELETON.filter((s) => s.phase === phase).length,
      ])
    )
    expect(counts['32nd']).toBe(16)
    expect(counts['16th']).toBe(8)
    expect(counts['8th']).toBe(4)
    expect(counts['semi']).toBe(2)
    expect(counts['3rd_place']).toBe(1)
    expect(counts['final']).toBe(1)
  })

  it('has unique (phase, pos) pairs across the skeleton', () => {
    const keys = BRACKET_SKELETON.map((s) => `${s.phase}:${s.pos}`)
    const unique = new Set(keys)
    expect(unique.size).toBe(BRACKET_SKELETON.length)
  })

  it('has unique calendarKey (date, venue) pairs', () => {
    const keys = BRACKET_SKELETON.map((s) => `${s.calendarKey.date}|${s.calendarKey.venue}`)
    const unique = new Set(keys)
    expect(unique.size).toBe(BRACKET_SKELETON.length)
  })

  it('all feeds references resolve to existing (phase, pos) slots', () => {
    const slotKeys = new Set(BRACKET_SKELETON.map((s) => `${s.phase}:${s.pos}`))
    for (const slot of BRACKET_SKELETON) {
      if (slot.feeds) {
        const key = `${slot.feeds.phase}:${slot.feeds.pos}`
        expect(
          slotKeys.has(key),
          `Slot ${slot.phase}#${slot.pos} feeds → ${key} which does not exist`
        ).toBe(true)
      }
    }
  })

  it('PHASE_ORDER contains all 6 phases in render order', () => {
    expect(PHASE_ORDER).toHaveLength(6)
    const phases: KnockoutPhase[] = ['32nd', '16th', '8th', 'semi', '3rd_place', 'final']
    for (const phase of phases) {
      expect(PHASE_ORDER).toContain(phase)
    }
  })

  it('all pos values within each phase are 1-based and contiguous', () => {
    for (const phase of PHASE_ORDER) {
      const positions = BRACKET_SKELETON.filter((s) => s.phase === phase)
        .map((s) => s.pos)
        .sort((a, b) => a - b)
      positions.forEach((pos, idx) => {
        expect(pos).toBe(idx + 1)
      })
    }
  })

  it('every slot has non-empty homeLabel and awayLabel', () => {
    for (const slot of BRACKET_SKELETON) {
      expect(slot.homeLabel.length).toBeGreaterThan(0)
      expect(slot.awayLabel.length).toBeGreaterThan(0)
    }
  })
})

describe('resolveSlot', () => {
  it('returns the correct (phase, pos) for R32 #1 (MetLife Stadium, 2026-06-28T21:00:00Z)', () => {
    const result = resolveSlot('2026-06-28T21:00:00Z', 'MetLife Stadium')
    expect(result).toEqual({ phase: '32nd', pos: 1 })
  })

  it('returns the correct slot for the Final', () => {
    const result = resolveSlot('2026-07-19T21:00:00Z', 'MetLife Stadium')
    expect(result).toEqual({ phase: 'final', pos: 1 })
  })

  it('returns the correct slot for the 3rd-place match', () => {
    const result = resolveSlot('2026-07-18T20:00:00Z', 'SoFi Stadium')
    expect(result).toEqual({ phase: '3rd_place', pos: 1 })
  })

  it('returns null for a completely unknown key', () => {
    expect(resolveSlot('2099-01-01T00:00:00Z', 'Unknown Stadium')).toBeNull()
  })

  it('returns null for correct date but wrong venue', () => {
    expect(resolveSlot('2026-06-28T21:00:00Z', 'Wrong Stadium')).toBeNull()
  })

  it('returns null for correct venue but wrong date', () => {
    expect(resolveSlot('2026-01-01T00:00:00Z', 'MetLife Stadium')).toBeNull()
  })

  it('resolves all 32 slots via their own calendarKey', () => {
    for (const slot of BRACKET_SKELETON) {
      const result = resolveSlot(slot.calendarKey.date, slot.calendarKey.venue)
      expect(result).toEqual({ phase: slot.phase, pos: slot.pos })
    }
  })
})

describe('isConfirmedMatchup', () => {
  it('returns true when both teams are valid Copa team names', () => {
    expect(isConfirmedMatchup('Brasil', 'Argentina')).toBe(true)
  })

  it('returns true for other valid pairs', () => {
    expect(isConfirmedMatchup('França', 'Espanha')).toBe(true)
    expect(isConfirmedMatchup('Alemanha', 'Portugal')).toBe(true)
  })

  it('returns false when home team is a placeholder label', () => {
    expect(isConfirmedMatchup('Vencedor 1º Grupo A', 'Argentina')).toBe(false)
  })

  it('returns false when away team is a placeholder label', () => {
    expect(isConfirmedMatchup('Brasil', 'Vencedor 1/32 #1')).toBe(false)
  })

  it('returns false when both teams are placeholder labels', () => {
    expect(isConfirmedMatchup('Vencedor 1º Grupo A', 'Vencedor 2º Grupo B')).toBe(false)
  })

  it('returns false for real home + 3rd-place placeholder away', () => {
    expect(isConfirmedMatchup('França', '3º Grupos A/B/C/D')).toBe(false)
  })

  it('returns false for empty strings', () => {
    expect(isConfirmedMatchup('', '')).toBe(false)
  })

  it('returns false when one team is real and the other is a later-round placeholder', () => {
    expect(isConfirmedMatchup('Brasil', 'Perdedor SF #1')).toBe(false)
    expect(isConfirmedMatchup('Vencedor SF #2', 'Argentina')).toBe(false)
  })
})
