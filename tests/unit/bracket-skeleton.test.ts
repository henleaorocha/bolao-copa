import { describe, it, expect } from 'vitest'
import * as skeleton from '@/lib/bracket-skeleton'
import {
  BRACKET_SKELETON,
  PHASE_ORDER,
  SLOT_FEEDS,
  parsePlaceholder,
  slotForExternalId,
  slotForNum,
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
    expect(new Set(keys).size).toBe(BRACKET_SKELETON.length)
  })

  it('has unique external_id per slot', () => {
    const ids = BRACKET_SKELETON.map((s) => s.externalId)
    expect(new Set(ids).size).toBe(BRACKET_SKELETON.length)
  })

  it('carries openfootball num 73..102 on R32..SF and null on Final/3rd', () => {
    const nums = BRACKET_SKELETON.filter((s) => s.num != null)
      .map((s) => s.num as number)
      .sort((a, b) => a - b)
    expect(nums).toHaveLength(30)
    expect(nums[0]).toBe(73)
    expect(nums[nums.length - 1]).toBe(102)

    const noNum = BRACKET_SKELETON.filter((s) => s.num == null)
    expect(noNum.map((s) => s.phase).sort()).toEqual(['3rd_place', 'final'])
  })

  it('derives external_id as wc2026-<num> / -final / -3rd', () => {
    expect(BRACKET_SKELETON.find((s) => s.num === 73)!.externalId).toBe('wc2026-73')
    expect(BRACKET_SKELETON.find((s) => s.phase === 'final')!.externalId).toBe('wc2026-final')
    expect(BRACKET_SKELETON.find((s) => s.phase === '3rd_place')!.externalId).toBe('wc2026-3rd')
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

  it('every slot has parseable home and away sources', () => {
    for (const slot of BRACKET_SKELETON) {
      expect(slot.homeSource).not.toBeNull()
      expect(slot.awaySource).not.toBeNull()
    }
  })

  it('no longer exports resolveSlot, SLOT_BY_CALENDAR, or calendarKey', () => {
    const mod = skeleton as Record<string, unknown>
    expect(mod.resolveSlot).toBeUndefined()
    expect(mod.SLOT_BY_CALENDAR).toBeUndefined()
    expect(mod.calendarKey).toBeUndefined()
    // and no slot carries the old (date, venue) calendar key
    expect(BRACKET_SKELETON.every((s) => !('calendarKey' in s))).toBe(true)
  })
})

describe('parsePlaceholder — tolerant W##/#A/L## parsing', () => {
  it('parses a group winner / runner-up code', () => {
    expect(parsePlaceholder('1A')).toEqual({ kind: 'group', rank: 1, groups: ['A'], raw: '1A' })
    expect(parsePlaceholder('2A')).toEqual({ kind: 'group', rank: 2, groups: ['A'], raw: '2A' })
  })

  it('parses a multi-group 3rd-place code', () => {
    expect(parsePlaceholder('3A/B/C/D/F')).toEqual({
      kind: 'group',
      rank: 3,
      groups: ['A', 'B', 'C', 'D', 'F'],
      raw: '3A/B/C/D/F',
    })
  })

  it('parses winner and loser match codes', () => {
    expect(parsePlaceholder('W74')).toEqual({ kind: 'match', result: 'winner', num: 74, raw: 'W74' })
    expect(parsePlaceholder('L101')).toEqual({
      kind: 'match',
      result: 'loser',
      num: 101,
      raw: 'L101',
    })
  })

  it('tolerates spelling variants (e.g. "Winner 74" vs "W74")', () => {
    expect(parsePlaceholder('Winner 74')).toMatchObject({ kind: 'match', result: 'winner', num: 74 })
    expect(parsePlaceholder('winner74')).toMatchObject({ kind: 'match', result: 'winner', num: 74 })
    expect(parsePlaceholder('Vencedor 74')).toMatchObject({ kind: 'match', result: 'winner', num: 74 })
    expect(parsePlaceholder('Loser 101')).toMatchObject({ kind: 'match', result: 'loser', num: 101 })
    expect(parsePlaceholder('Perdedor 101')).toMatchObject({ kind: 'match', result: 'loser', num: 101 })
    expect(parsePlaceholder(' 2A ')).toMatchObject({ kind: 'group', rank: 2, groups: ['A'] })
  })

  it('returns null for an unrecognized code', () => {
    expect(parsePlaceholder('Brasil')).toBeNull()
    expect(parsePlaceholder('')).toBeNull()
    expect(parsePlaceholder('4Z')).toBeNull()
  })
})

describe('slotForExternalId / slotForNum', () => {
  it('maps wc2026-73 to R32 slot pos 1', () => {
    expect(slotForExternalId('wc2026-73')).toEqual({ phase: '32nd', pos: 1 })
  })

  it('maps Final and 3rd-place external ids', () => {
    expect(slotForExternalId('wc2026-final')).toEqual({ phase: 'final', pos: 1 })
    expect(slotForExternalId('wc2026-3rd')).toEqual({ phase: '3rd_place', pos: 1 })
  })

  it('also resolves Final and 3rd-place via their numeric alias (wc2026-104 / wc2026-103)', () => {
    // openfootball's 2026 feed numbers these two (Final = 104, 3rd place = 103),
    // so a synced row keys them as wc2026-104 / wc2026-103 rather than the
    // semantic id. The bracket must resolve both forms (regression: drift bug).
    expect(slotForExternalId('wc2026-104')).toEqual({ phase: 'final', pos: 1 })
    expect(slotForExternalId('wc2026-103')).toEqual({ phase: '3rd_place', pos: 1 })
  })

  it('returns null for an unknown external_id', () => {
    expect(slotForExternalId('wc2026-A-Brasil-Argentina')).toBeNull()
    expect(slotForExternalId('nope')).toBeNull()
  })

  it('resolves every slot via its own external_id', () => {
    for (const slot of BRACKET_SKELETON) {
      expect(slotForExternalId(slot.externalId)).toEqual({ phase: slot.phase, pos: slot.pos })
    }
  })

  it('maps openfootball num to its slot', () => {
    expect(slotForNum(89)).toEqual({ phase: '16th', pos: 1 })
    expect(slotForNum(101)).toEqual({ phase: 'semi', pos: 1 })
    expect(slotForNum(999)).toBeNull()
  })
})

describe('SLOT_FEEDS — downstream linkage from W##/L## sources', () => {
  it('links winner of 74 to R16 pos 1 home (from W74)', () => {
    expect(SLOT_FEEDS).toContainEqual({
      num: 74,
      result: 'winner',
      phase: '16th',
      pos: 1,
      side: 'home',
    })
  })

  it('links winner of 77 to R16 pos 1 away (from W77)', () => {
    expect(SLOT_FEEDS).toContainEqual({
      num: 77,
      result: 'winner',
      phase: '16th',
      pos: 1,
      side: 'away',
    })
  })

  it('links loser of 101 to the 3rd-place match home side (from L101)', () => {
    expect(SLOT_FEEDS).toContainEqual({
      num: 101,
      result: 'loser',
      phase: '3rd_place',
      pos: 1,
      side: 'home',
    })
  })

  it('a semi-final slot feeds BOTH the final (winner) and 3rd place (loser)', () => {
    // num 101 (semi pos 1) → final pos1 home (W101) AND 3rd place home (L101)
    const fromSf1 = SLOT_FEEDS.filter((f) => f.num === 101)
    expect(fromSf1).toContainEqual({ num: 101, result: 'winner', phase: 'final', pos: 1, side: 'home' })
    expect(fromSf1).toContainEqual({ num: 101, result: 'loser', phase: '3rd_place', pos: 1, side: 'home' })
  })

  it('every match feed points at the slot that the source num resolves to', () => {
    for (const feed of SLOT_FEEDS) {
      // the upstream num must resolve to a real slot
      expect(slotForNum(feed.num)).not.toBeNull()
      // the downstream (phase,pos) the feed names must be a real slot
      const target = BRACKET_SKELETON.find((s) => s.phase === feed.phase && s.pos === feed.pos)
      expect(target).toBeDefined()
    }
  })

  it('the only group (entry) sources are in R32', () => {
    for (const slot of BRACKET_SKELETON) {
      const groupSided =
        slot.homeSource?.kind === 'group' || slot.awaySource?.kind === 'group'
      if (groupSided) expect(slot.phase).toBe('32nd')
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
