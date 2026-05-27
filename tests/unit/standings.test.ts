import { describe, it, expect } from 'vitest'
import { computeStandings } from '@/lib/standings'
import type { Match } from '@/lib/api/types'

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: `match-${Math.random().toString(36).slice(2)}`,
    external_id: null,
    home_team: 'Brasil',
    away_team: 'Argentina',
    home_flag: 'br',
    away_flag: 'ar',
    match_date: '2026-06-11T18:00:00Z',
    phase: 'group',
    group: 'A',
    status: 'scheduled',
    home_score: null,
    away_score: null,
    venue: null,
    city: null,
    ...overrides,
  }
}

describe('computeStandings', () => {
  describe('all-scheduled group', () => {
    it('lists all 4 teams with zeros when no finished matches', () => {
      const matches = [
        makeMatch({ home_team: 'Brasil', away_team: 'Argentina', status: 'scheduled' }),
        makeMatch({ home_team: 'Brasil', away_team: 'Marrocos', status: 'scheduled' }),
        makeMatch({ home_team: 'Argentina', away_team: 'Marrocos', status: 'scheduled' }),
        makeMatch({ home_team: 'Brasil', away_team: 'Croácia', status: 'scheduled' }),
        makeMatch({ home_team: 'Argentina', away_team: 'Croácia', status: 'scheduled' }),
        makeMatch({ home_team: 'Marrocos', away_team: 'Croácia', status: 'scheduled' }),
      ]

      const result = computeStandings(matches)
      expect(result).toHaveLength(1)
      const groupA = result[0]
      expect(groupA.group).toBe('A')
      expect(groupA.teams).toHaveLength(4)

      for (const team of groupA.teams) {
        expect(team.played).toBe(0)
        expect(team.won).toBe(0)
        expect(team.drawn).toBe(0)
        expect(team.lost).toBe(0)
        expect(team.goalsFor).toBe(0)
        expect(team.goalsAgainst).toBe(0)
        expect(team.goalDiff).toBe(0)
        expect(team.points).toBe(0)
      }
    })

    it('assigns positions 1–4 even when all teams have 0 points', () => {
      const matches = [
        makeMatch({ home_team: 'T1', away_team: 'T2' }),
        makeMatch({ home_team: 'T3', away_team: 'T4' }),
        makeMatch({ home_team: 'T1', away_team: 'T3' }),
        makeMatch({ home_team: 'T2', away_team: 'T4' }),
      ]

      const result = computeStandings(matches)
      const positions = result[0].teams.map(t => t.position).sort((a, b) => a - b)
      expect(positions).toEqual([1, 2, 3, 4])
    })
  })

  describe('point math', () => {
    it('awards 3 pts to winner and 0 to loser', () => {
      const matches = [
        makeMatch({
          home_team: 'Brasil', away_team: 'Argentina',
          status: 'finished', home_score: 2, away_score: 1,
        }),
        makeMatch({ home_team: 'Marrocos', away_team: 'Croácia', status: 'scheduled' }),
        makeMatch({ home_team: 'Brasil', away_team: 'Marrocos', status: 'scheduled' }),
        makeMatch({ home_team: 'Argentina', away_team: 'Croácia', status: 'scheduled' }),
      ]

      const result = computeStandings(matches)
      const teams = result[0].teams

      const brasil = teams.find(t => t.team === 'Brasil')!
      const argentina = teams.find(t => t.team === 'Argentina')!

      expect(brasil.points).toBe(3)
      expect(brasil.won).toBe(1)
      expect(brasil.lost).toBe(0)
      expect(argentina.points).toBe(0)
      expect(argentina.won).toBe(0)
      expect(argentina.lost).toBe(1)
    })

    it('awards 1 pt each for a draw', () => {
      const matches = [
        makeMatch({
          home_team: 'Brasil', away_team: 'Argentina',
          status: 'finished', home_score: 1, away_score: 1,
        }),
        makeMatch({ home_team: 'Marrocos', away_team: 'Croácia', status: 'scheduled' }),
        makeMatch({ home_team: 'Brasil', away_team: 'Marrocos', status: 'scheduled' }),
        makeMatch({ home_team: 'Argentina', away_team: 'Croácia', status: 'scheduled' }),
      ]

      const result = computeStandings(matches)
      const teams = result[0].teams

      const brasil = teams.find(t => t.team === 'Brasil')!
      const argentina = teams.find(t => t.team === 'Argentina')!

      expect(brasil.points).toBe(1)
      expect(brasil.drawn).toBe(1)
      expect(argentina.points).toBe(1)
      expect(argentina.drawn).toBe(1)
    })

    it('accumulates J/V/E/D/GP/GC/SG across multiple finished matches', () => {
      const matches = [
        makeMatch({
          home_team: 'Brasil', away_team: 'Argentina',
          status: 'finished', home_score: 3, away_score: 1,
        }),
        makeMatch({
          home_team: 'Brasil', away_team: 'Marrocos',
          status: 'finished', home_score: 2, away_score: 2,
        }),
        makeMatch({
          home_team: 'Argentina', away_team: 'Marrocos',
          status: 'finished', home_score: 0, away_score: 1,
        }),
        makeMatch({ home_team: 'Brasil', away_team: 'Croácia', status: 'scheduled' }),
        makeMatch({ home_team: 'Argentina', away_team: 'Croácia', status: 'scheduled' }),
        makeMatch({ home_team: 'Marrocos', away_team: 'Croácia', status: 'scheduled' }),
      ]

      const result = computeStandings(matches)
      const teams = result[0].teams

      const brasil = teams.find(t => t.team === 'Brasil')!
      expect(brasil.played).toBe(2)
      expect(brasil.won).toBe(1)
      expect(brasil.drawn).toBe(1)
      expect(brasil.lost).toBe(0)
      expect(brasil.goalsFor).toBe(5)
      expect(brasil.goalsAgainst).toBe(3)
      expect(brasil.goalDiff).toBe(2)
      expect(brasil.points).toBe(4)

      const argentina = teams.find(t => t.team === 'Argentina')!
      expect(argentina.played).toBe(2)
      expect(argentina.won).toBe(0)
      expect(argentina.drawn).toBe(0)
      expect(argentina.lost).toBe(2)
      expect(argentina.goalsFor).toBe(1)
      expect(argentina.goalsAgainst).toBe(4)
      expect(argentina.goalDiff).toBe(-3)
      expect(argentina.points).toBe(0)

      const marrocos = teams.find(t => t.team === 'Marrocos')!
      expect(marrocos.played).toBe(2)
      expect(marrocos.won).toBe(1)
      expect(marrocos.drawn).toBe(1)
      expect(marrocos.lost).toBe(0)
      expect(marrocos.goalsFor).toBe(3)
      expect(marrocos.goalsAgainst).toBe(2)
      expect(marrocos.goalDiff).toBe(1)
      expect(marrocos.points).toBe(4)
    })
  })

  describe('tie-breaks', () => {
    it('resolves equal points by goalDiff desc', () => {
      // T1 and T2 both 3 pts; T1 has better SG
      const matches = [
        makeMatch({ home_team: 'T1', away_team: 'T2', status: 'finished', home_score: 3, away_score: 0 }),
        makeMatch({ home_team: 'T3', away_team: 'T4', status: 'finished', home_score: 1, away_score: 0 }),
        makeMatch({ home_team: 'T1', away_team: 'T3', status: 'scheduled' }),
        makeMatch({ home_team: 'T2', away_team: 'T4', status: 'scheduled' }),
        makeMatch({ home_team: 'T1', away_team: 'T4', status: 'scheduled' }),
        makeMatch({ home_team: 'T2', away_team: 'T3', status: 'scheduled' }),
      ]

      const result = computeStandings(matches)
      const teams = result[0].teams

      // T1: 3pts, SG=+3; T3: 3pts, SG=+1
      expect(teams[0].team).toBe('T1')
      expect(teams[1].team).toBe('T3')
    })

    it('resolves equal points + SG by goalsFor desc', () => {
      // Both T1 and T2 have same SG but T1 scored more
      const matches = [
        makeMatch({ home_team: 'T1', away_team: 'T3', status: 'finished', home_score: 3, away_score: 1 }),
        makeMatch({ home_team: 'T2', away_team: 'T4', status: 'finished', home_score: 2, away_score: 0 }),
        makeMatch({ home_team: 'T1', away_team: 'T2', status: 'scheduled' }),
        makeMatch({ home_team: 'T3', away_team: 'T4', status: 'scheduled' }),
        makeMatch({ home_team: 'T1', away_team: 'T4', status: 'scheduled' }),
        makeMatch({ home_team: 'T2', away_team: 'T3', status: 'scheduled' }),
      ]

      const result = computeStandings(matches)
      const teams = result[0].teams

      // T1: 3pts, SG=+2, GP=3; T2: 3pts, SG=+2, GP=2
      expect(teams[0].team).toBe('T1')
      expect(teams[1].team).toBe('T2')
    })

    it('resolves equal points + SG + GP by team name ascending', () => {
      // T1 and T2 identical stats, resolved by name: "Alpha" < "Beta"
      const matches = [
        makeMatch({ home_team: 'Alpha', away_team: 'T3', status: 'finished', home_score: 1, away_score: 0 }),
        makeMatch({ home_team: 'Beta', away_team: 'T4', status: 'finished', home_score: 1, away_score: 0 }),
        makeMatch({ home_team: 'Alpha', away_team: 'Beta', status: 'scheduled' }),
        makeMatch({ home_team: 'T3', away_team: 'T4', status: 'scheduled' }),
        makeMatch({ home_team: 'Alpha', away_team: 'T4', status: 'scheduled' }),
        makeMatch({ home_team: 'Beta', away_team: 'T3', status: 'scheduled' }),
      ]

      const result = computeStandings(matches)
      const teams = result[0].teams

      // Alpha and Beta: 3pts, SG=+1, GP=1 each → alphabetical
      expect(teams[0].team).toBe('Alpha')
      expect(teams[1].team).toBe('Beta')
    })
  })

  describe('status filtering', () => {
    it('excludes live matches from totals', () => {
      const matches = [
        makeMatch({
          home_team: 'Brasil', away_team: 'Argentina',
          status: 'live', home_score: 2, away_score: 0,
        }),
        makeMatch({ home_team: 'Marrocos', away_team: 'Croácia', status: 'scheduled' }),
        makeMatch({ home_team: 'Brasil', away_team: 'Marrocos', status: 'scheduled' }),
        makeMatch({ home_team: 'Argentina', away_team: 'Croácia', status: 'scheduled' }),
      ]

      const result = computeStandings(matches)
      const teams = result[0].teams

      for (const team of teams) {
        expect(team.played).toBe(0)
        expect(team.points).toBe(0)
        expect(team.goalsFor).toBe(0)
      }
    })

    it('excludes scheduled matches from totals (even with scores present)', () => {
      const matches = [
        makeMatch({
          home_team: 'Brasil', away_team: 'Argentina',
          status: 'scheduled', home_score: 3, away_score: 0,
        }),
        makeMatch({ home_team: 'Marrocos', away_team: 'Croácia', status: 'scheduled' }),
        makeMatch({ home_team: 'Brasil', away_team: 'Marrocos', status: 'scheduled' }),
        makeMatch({ home_team: 'Argentina', away_team: 'Croácia', status: 'scheduled' }),
      ]

      const result = computeStandings(matches)
      const teams = result[0].teams

      for (const team of teams) {
        expect(team.played).toBe(0)
        expect(team.points).toBe(0)
      }
    })
  })

  describe('flag handling', () => {
    it('carries home_flag and away_flag to TeamStanding', () => {
      const matches = [
        makeMatch({ home_team: 'Brasil', away_team: 'Argentina', home_flag: 'br', away_flag: 'ar', status: 'scheduled' }),
        makeMatch({ home_team: 'Marrocos', away_team: 'Croácia', home_flag: 'ma', away_flag: 'hr', status: 'scheduled' }),
        makeMatch({ home_team: 'Brasil', away_team: 'Marrocos', status: 'scheduled' }),
        makeMatch({ home_team: 'Argentina', away_team: 'Croácia', status: 'scheduled' }),
      ]

      const result = computeStandings(matches)
      const teams = result[0].teams

      expect(teams.find(t => t.team === 'Brasil')!.flag).toBe('br')
      expect(teams.find(t => t.team === 'Argentina')!.flag).toBe('ar')
      expect(teams.find(t => t.team === 'Marrocos')!.flag).toBe('ma')
      expect(teams.find(t => t.team === 'Croácia')!.flag).toBe('hr')
    })

    it('sets flag to null when home_flag is null and does not throw', () => {
      const matches = [
        makeMatch({ home_team: 'T1', away_team: 'T2', home_flag: null, away_flag: null, status: 'scheduled' }),
        makeMatch({ home_team: 'T3', away_team: 'T4', status: 'scheduled' }),
        makeMatch({ home_team: 'T1', away_team: 'T3', status: 'scheduled' }),
        makeMatch({ home_team: 'T2', away_team: 'T4', status: 'scheduled' }),
      ]

      expect(() => computeStandings(matches)).not.toThrow()
      const result = computeStandings(matches)
      const t1 = result[0].teams.find(t => t.team === 'T1')!
      const t2 = result[0].teams.find(t => t.team === 'T2')!
      expect(t1.flag).toBeNull()
      expect(t2.flag).toBeNull()
    })
  })

  describe('phase and group filtering', () => {
    it('ignores non-group phase rows', () => {
      const matches = [
        makeMatch({ phase: '16th', group: null }),
        makeMatch({ phase: 'semi', group: null }),
        makeMatch({ phase: 'final', group: null }),
        makeMatch({ home_team: 'T1', away_team: 'T2', phase: 'group', group: 'A' }),
        makeMatch({ home_team: 'T3', away_team: 'T4', phase: 'group', group: 'A' }),
        makeMatch({ home_team: 'T1', away_team: 'T3', phase: 'group', group: 'A' }),
        makeMatch({ home_team: 'T2', away_team: 'T4', phase: 'group', group: 'A' }),
      ]

      const result = computeStandings(matches)
      expect(result).toHaveLength(1)
      expect(result[0].group).toBe('A')
      expect(result[0].teams).toHaveLength(4)
    })

    it('ignores group-phase rows with null group', () => {
      const matches = [
        makeMatch({ phase: 'group', group: null }),
        makeMatch({ home_team: 'T1', away_team: 'T2', phase: 'group', group: 'B' }),
        makeMatch({ home_team: 'T3', away_team: 'T4', phase: 'group', group: 'B' }),
        makeMatch({ home_team: 'T1', away_team: 'T3', phase: 'group', group: 'B' }),
        makeMatch({ home_team: 'T2', away_team: 'T4', phase: 'group', group: 'B' }),
      ]

      const result = computeStandings(matches)
      expect(result).toHaveLength(1)
      expect(result[0].group).toBe('B')
    })

    it('returns groups in A→L alphabetical order', () => {
      const groupTeams: Record<string, [string, string, string, string]> = {
        C: ['C1', 'C2', 'C3', 'C4'],
        A: ['A1', 'A2', 'A3', 'A4'],
        B: ['B1', 'B2', 'B3', 'B4'],
      }

      const matches: Match[] = []
      for (const [grp, [t1, t2, t3, t4]] of Object.entries(groupTeams)) {
        matches.push(makeMatch({ home_team: t1, away_team: t2, group: grp }))
        matches.push(makeMatch({ home_team: t3, away_team: t4, group: grp }))
        matches.push(makeMatch({ home_team: t1, away_team: t3, group: grp }))
        matches.push(makeMatch({ home_team: t2, away_team: t4, group: grp }))
      }

      const result = computeStandings(matches)
      expect(result.map(g => g.group)).toEqual(['A', 'B', 'C'])
    })

    it('returns empty array when no group-phase matches', () => {
      const matches = [
        makeMatch({ phase: 'final', group: null }),
        makeMatch({ phase: 'semi', group: null }),
      ]

      const result = computeStandings(matches)
      expect(result).toEqual([])
    })
  })

  describe('null score handling in finished matches', () => {
    it('treats null scores as 0 and computes a draw without throwing', () => {
      const matches = [
        makeMatch({
          home_team: 'T1', away_team: 'T2',
          status: 'finished', home_score: null, away_score: null,
        }),
        makeMatch({ home_team: 'T3', away_team: 'T4', status: 'scheduled' }),
        makeMatch({ home_team: 'T1', away_team: 'T3', status: 'scheduled' }),
        makeMatch({ home_team: 'T2', away_team: 'T4', status: 'scheduled' }),
      ]

      expect(() => computeStandings(matches)).not.toThrow()
      const result = computeStandings(matches)
      const t1 = result[0].teams.find(t => t.team === 'T1')!
      const t2 = result[0].teams.find(t => t.team === 'T2')!
      expect(t1.drawn).toBe(1)
      expect(t1.points).toBe(1)
      expect(t1.goalsFor).toBe(0)
      expect(t1.goalsAgainst).toBe(0)
      expect(t2.drawn).toBe(1)
      expect(t2.points).toBe(1)
    })
  })

  describe('position assignment', () => {
    it('assigns position 1 to the top team and 4 to the last', () => {
      const matches = [
        makeMatch({
          home_team: 'Brasil', away_team: 'Argentina',
          status: 'finished', home_score: 3, away_score: 0,
        }),
        makeMatch({
          home_team: 'Brasil', away_team: 'Marrocos',
          status: 'finished', home_score: 2, away_score: 0,
        }),
        makeMatch({
          home_team: 'Croácia', away_team: 'Argentina',
          status: 'finished', home_score: 1, away_score: 0,
        }),
        makeMatch({ home_team: 'Marrocos', away_team: 'Croácia', status: 'scheduled' }),
        makeMatch({ home_team: 'Argentina', away_team: 'Marrocos', status: 'scheduled' }),
        makeMatch({ home_team: 'Brasil', away_team: 'Croácia', status: 'scheduled' }),
      ]

      const result = computeStandings(matches)
      const teams = result[0].teams

      // Brasil: 6pts first; Croácia: 3pts second; Argentina/Marrocos: 0pts
      expect(teams[0].team).toBe('Brasil')
      expect(teams[0].position).toBe(1)
      expect(teams[1].team).toBe('Croácia')
      expect(teams[1].position).toBe(2)
      expect(teams[2].position).toBe(3)
      expect(teams[3].position).toBe(4)
    })
  })
})
