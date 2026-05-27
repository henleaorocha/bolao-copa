import { describe, it, expect } from 'vitest'
import {
  FEATURED_TEAMS,
  ALL_COPA_TEAMS,
  VALID_TEAM_NAMES,
  BET_DEADLINE,
} from '@/lib/copa-teams'

describe('copa-teams static data', () => {
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

  it('BET_DEADLINE equals new Date("2026-06-11T21:00:00.000Z")', () => {
    expect(BET_DEADLINE.getTime()).toBe(new Date('2026-06-11T21:00:00.000Z').getTime())
  })

  it('ALL_COPA_TEAMS entry for "Inglaterra" has code === "gb-eng"', () => {
    const england = ALL_COPA_TEAMS.find(t => t.name === 'Inglaterra')
    expect(england).toBeDefined()
    expect(england!.code).toBe('gb-eng')
  })
})
