import { describe, it, expect } from 'vitest'
import openfootballTeams from '@/tests/fixtures/openfootball-wc2026-teams.json'
import { OPENFOOTBALL_TO_PT, toPtName } from '@/lib/team-names'
import { ALL_COPA_TEAMS, VALID_TEAM_NAMES } from '@/lib/copa-teams'
import { isConfirmedMatchup } from '@/lib/bracket-skeleton'

// openfootball emits ENGLISH team names ("South Korea", "Czech Republic",
// "USA", "Ivory Coast"); the app stores/validates PORTUGUESE names. Without
// normalization a synced match loses its flag AND the knockout slot can never
// confirm → the bracket stays empty forever. lib/team-names.ts (ADR-006) maps
// every openfootball string to the seed-020 PT roster so flags resolve and
// isConfirmedMatchup passes. This spec drives that seam with the REAL strings
// from the pinned fixture (was skipped against the dropped legacy provider shape).

// Mirrors the sync route's private resolveFlag (app/api/admin/sync-matches):
//   ALL_COPA_TEAMS.find(t => t.name === name)?.code ?? null
const resolveFlag = (name: string): string | null =>
  ALL_COPA_TEAMS.find(t => t.name === name)?.code ?? null

// Exact EN strings openfootball pins in the fixture, kept here as the
// authoritative key set the map must cover.
const OPENFOOTBALL_EN_NAMES = openfootballTeams.map(t => t.name)

describe('team name normalization (openfootball EN → PT app names)', () => {
  describe('toPtName — tricky reconciled cases', () => {
    it('maps "South Korea" → "Coreia do Sul"', () => {
      expect(toPtName('South Korea')).toBe('Coreia do Sul')
    })

    it('maps "Czech Republic" → "República Tcheca"', () => {
      expect(toPtName('Czech Republic')).toBe('República Tcheca')
    })

    it('maps "USA" → "EUA"', () => {
      expect(toPtName('USA')).toBe('EUA')
    })

    it('maps "Ivory Coast" → "Costa do Marfim"', () => {
      expect(toPtName('Ivory Coast')).toBe('Costa do Marfim')
    })

    it('maps "Bosnia & Herzegovina" → "Bósnia e Herzegovina"', () => {
      expect(toPtName('Bosnia & Herzegovina')).toBe('Bósnia e Herzegovina')
    })

    it('maps "DR Congo" → "Rep. Democrática do Congo" (seed-020 canonical)', () => {
      expect(toPtName('DR Congo')).toBe('Rep. Democrática do Congo')
    })
  })

  describe('toPtName — placeholders and unknowns pass through unchanged', () => {
    it.each(['2A', '1L', 'W74', 'L101', 'W100', '3A/B/C/D/F'])(
      'leaves placeholder %s untouched',
      (placeholder) => {
        expect(toPtName(placeholder)).toBe(placeholder)
      }
    )

    it('leaves a fully unknown string untouched', () => {
      expect(toPtName('Atlantis')).toBe('Atlantis')
    })

    it('leaves an already-PT name untouched (not a known EN key)', () => {
      expect(toPtName('Brasil')).toBe('Brasil')
    })
  })

  describe('OPENFOOTBALL_TO_PT map integrity', () => {
    it('has exactly 48 entries', () => {
      expect(Object.keys(OPENFOOTBALL_TO_PT)).toHaveLength(48)
    })

    it('keys are exactly the 48 openfootball fixture EN names', () => {
      expect(new Set(Object.keys(OPENFOOTBALL_TO_PT))).toEqual(
        new Set(OPENFOOTBALL_EN_NAMES)
      )
    })

    it('every value is a member of VALID_TEAM_NAMES', () => {
      for (const pt of Object.values(OPENFOOTBALL_TO_PT)) {
        expect(VALID_TEAM_NAMES.has(pt)).toBe(true)
      }
    })

    it('every fixture EN name normalizes to a valid roster name', () => {
      for (const en of OPENFOOTBALL_EN_NAMES) {
        expect(VALID_TEAM_NAMES.has(toPtName(en))).toBe(true)
      }
    })

    it('maps the 48 EN names onto 48 distinct PT names', () => {
      expect(new Set(Object.values(OPENFOOTBALL_TO_PT)).size).toBe(48)
    })
  })

  describe('integration — a normalized matchup resolves flags and confirms', () => {
    it('resolves a flag for a normalized English knockout team name', () => {
      const home = toPtName('Mexico')
      const away = toPtName('Brazil')
      expect(resolveFlag(home)).toBe('mx')
      expect(resolveFlag(away)).toBe('br')
    })

    it('produces a confirmable matchup for normalized English team names', () => {
      const home = toPtName('South Korea')
      const away = toPtName('USA')
      expect(isConfirmedMatchup(home, away)).toBe(true)
    })

    it.each([
      ['Mexico', 'mx'],
      ['South Korea', 'kr'],
      ['England', 'gb-eng'],
      ['Germany', 'de'],
      ['Spain', 'es'],
      ['Ivory Coast', 'ci'],
      ['DR Congo', 'cd'],
    ])('resolves a flag for normalized %s', (enName, expectedCode) => {
      expect(resolveFlag(toPtName(enName))).toBe(expectedCode)
    })

    it('confirms a matchup for every fixture EN name paired with a known team', () => {
      const reference = toPtName('Brazil') // 'Brasil'
      for (const en of OPENFOOTBALL_EN_NAMES) {
        expect(isConfirmedMatchup(toPtName(en), reference)).toBe(true)
      }
    })
  })
})
