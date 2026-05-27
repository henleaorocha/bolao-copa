import type { Match } from '@/lib/api/types'

export interface TeamStanding {
  team: string
  flag: string | null
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
  position: number
}

export interface GroupStanding {
  group: string
  teams: TeamStanding[]
}

interface TeamAccumulator {
  flag: string | null
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
}

export function computeStandings(matches: Match[]): GroupStanding[] {
  const groupMatches = matches.filter(m => m.phase === 'group' && m.group !== null)

  const groupMap = new Map<string, Map<string, TeamAccumulator>>()

  for (const m of groupMatches) {
    const g = m.group!
    if (!groupMap.has(g)) groupMap.set(g, new Map())
    const teams = groupMap.get(g)!

    if (!teams.has(m.home_team)) {
      teams.set(m.home_team, { flag: m.home_flag ?? null, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 })
    }
    if (!teams.has(m.away_team)) {
      teams.set(m.away_team, { flag: m.away_flag ?? null, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 })
    }
  }

  for (const m of groupMatches) {
    if (m.status !== 'finished') continue
    const teams = groupMap.get(m.group!)!

    const hs = m.home_score ?? 0
    const as_ = m.away_score ?? 0
    const home = teams.get(m.home_team)!
    const away = teams.get(m.away_team)!

    home.played++
    away.played++
    home.goalsFor += hs
    home.goalsAgainst += as_
    away.goalsFor += as_
    away.goalsAgainst += hs

    if (hs > as_) {
      home.won++
      away.lost++
    } else if (hs < as_) {
      away.won++
      home.lost++
    } else {
      home.drawn++
      away.drawn++
    }
  }

  return Array.from(groupMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, teams]) => {
      const sorted = Array.from(teams.entries())
        .map(([team, s]): TeamStanding => ({
          team,
          flag: s.flag,
          played: s.played,
          won: s.won,
          drawn: s.drawn,
          lost: s.lost,
          goalsFor: s.goalsFor,
          goalsAgainst: s.goalsAgainst,
          goalDiff: s.goalsFor - s.goalsAgainst,
          points: s.won * 3 + s.drawn,
          position: 0,
        }))
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points
          if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff
          if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
          return a.team.localeCompare(b.team)
        })

      sorted.forEach((t, i) => { t.position = i + 1 })

      return { group, teams: sorted }
    })
}
