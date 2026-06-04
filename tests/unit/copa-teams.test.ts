import { describe, it, expect } from 'vitest'
import {
  FEATURED_TEAMS,
  ALL_COPA_TEAMS,
  VALID_TEAM_NAMES,
  BET_DEADLINE,
} from '@/lib/copa-teams'

// The six real 2026 qualifiers added when reconciling to seed 020 (ADR-003).
// "Rep. Democrática do Congo" is the seed-020 authoritative PT name for DR Congo
// (the task's shorthand "RD Congo" is only a label); the stored match rows use
// this name, so VALID_TEAM_NAMES / isConfirmedMatchup must match it verbatim.
const ADDED_QUALIFIERS = [
  'Irã',
  'Iraque',
  'Suécia',
  'Turquia',
  'Bósnia e Herzegovina',
  'Rep. Democrática do Congo',
]

// Nations that did NOT qualify for 2026 and must be absent from the roster.
const REMOVED_NON_QUALIFIERS = [
  'Itália',
  'Camarões',
  'Dinamarca',
  'Honduras',
  'Jamaica',
  'Bolívia',
]

describe('copa-teams static data', () => {
  it('ALL_COPA_TEAMS contains exactly 48 teams (the real 2026 draw)', () => {
    expect(ALL_COPA_TEAMS).toHaveLength(48)
  })

  it('ALL_COPA_TEAMS contains no duplicate name values', () => {
    const names = ALL_COPA_TEAMS.map(t => t.name)
    const unique = new Set(names)
    expect(unique.size).toBe(names.length)
  })

  it('ALL_COPA_TEAMS contains no duplicate code values', () => {
    const codes = ALL_COPA_TEAMS.map(t => t.code)
    const unique = new Set(codes)
    expect(unique.size).toBe(codes.length)
  })

  it('FEATURED_TEAMS has exactly 12 entries', () => {
    expect(FEATURED_TEAMS).toHaveLength(12)
  })

  it('FEATURED_TEAMS is a subset of ALL_COPA_TEAMS', () => {
    const allNames = new Set(ALL_COPA_TEAMS.map(t => t.name))
    for (const team of FEATURED_TEAMS) {
      expect(allNames.has(team.name)).toBe(true)
    }
  })

  it('FEATURED_TEAMS appears at the start of ALL_COPA_TEAMS (first 12 entries match)', () => {
    const first12 = ALL_COPA_TEAMS.slice(0, 12)
    expect(first12).toEqual(FEATURED_TEAMS)
  })

  it('VALID_TEAM_NAMES contains every name in ALL_COPA_TEAMS and no extras', () => {
    const allNames = ALL_COPA_TEAMS.map(t => t.name)
    expect(VALID_TEAM_NAMES.size).toBe(allNames.length)
    for (const name of allNames) {
      expect(VALID_TEAM_NAMES.has(name)).toBe(true)
    }
  })

  it('VALID_TEAM_NAMES has exactly 48 unique entries', () => {
    expect(VALID_TEAM_NAMES.size).toBe(48)
  })

  it('BET_DEADLINE equals new Date("2026-06-11T21:00:00.000Z")', () => {
    expect(BET_DEADLINE.getTime()).toBe(new Date('2026-06-11T21:00:00.000Z').getTime())
  })

  it('ALL_COPA_TEAMS entry for "Inglaterra" has code === "gb-eng"', () => {
    const england = ALL_COPA_TEAMS.find(t => t.name === 'Inglaterra')
    expect(england).toBeDefined()
    expect(england!.code).toBe('gb-eng')
  })
})

describe('copa-teams reconciliation to seed 020 (ADR-003)', () => {
  it('includes each of the six real 2026 qualifiers', () => {
    for (const name of ADDED_QUALIFIERS) {
      expect(VALID_TEAM_NAMES.has(name)).toBe(true)
    }
  })

  it('excludes each of the six non-qualified nations', () => {
    for (const name of REMOVED_NON_QUALIFIERS) {
      expect(VALID_TEAM_NAMES.has(name)).toBe(false)
    }
  })

  it('every team carries a non-empty ISO flag code (flag resolution returns a value for all 48)', () => {
    for (const team of ALL_COPA_TEAMS) {
      expect(team.code).toBeTruthy()
      expect(team.code.trim().length).toBeGreaterThan(0)
    }
  })

  it('resolveFlag semantics return a non-null code for each newly added team', () => {
    // Mirrors the sync route's private resolveFlag:
    //   ALL_COPA_TEAMS.find(t => t.name === name)?.code ?? null
    const resolveFlag = (name: string): string | null =>
      ALL_COPA_TEAMS.find(t => t.name === name)?.code ?? null
    for (const name of ADDED_QUALIFIERS) {
      expect(resolveFlag(name)).not.toBeNull()
      expect(resolveFlag(name)).toBeTruthy()
    }
  })

  it('the added qualifiers carry their seed-020 flag codes', () => {
    const expected: Record<string, string> = {
      'Irã': 'ir',
      'Iraque': 'iq',
      'Suécia': 'se',
      'Turquia': 'tr',
      'Bósnia e Herzegovina': 'ba',
      'Rep. Democrática do Congo': 'cd',
    }
    for (const [name, code] of Object.entries(expected)) {
      const team = ALL_COPA_TEAMS.find(t => t.name === name)
      expect(team, `missing roster entry for ${name}`).toBeDefined()
      expect(team!.code).toBe(code)
    }
  })
})
