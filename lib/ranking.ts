import { scoreGroup, scoreKnockout, scoreChampion } from '@/lib/scoring'
import type { KnockoutPhase } from '@/lib/bracket-skeleton'
import type { RankingFullEntry } from '@/lib/api/types'

export type { RankingFullEntry }

export interface RankingMemberInput {
  user_id: string
  full_name: string | null
  avatar_color: string
  joined_at: string
}

export interface RankingMatchInput {
  id: string
  phase: string
  home_score: number | null
  away_score: number | null
  match_date: string
  home_team?: string
  away_team?: string
}

export interface RankingComputeArgs {
  members: RankingMemberInput[]
  predictions: {
    user_id: string
    match_id: string
    predicted_home_score: number | null
    predicted_away_score: number | null
  }[]
  finishedMatches: RankingMatchInput[]
  championBets: { user_id: string; champion_team: string; runner_up_team: string }[]
}

const KNOCKOUT_PHASES = new Set<string>(['32nd', '16th', '8th', 'semi', '3rd_place', 'final'])

export function computeRanking(args: RankingComputeArgs): RankingFullEntry[] {
  const { members, predictions, finishedMatches, championBets } = args

  const matchMap = new Map(finishedMatches.map((m) => [m.id, m]))

  const predsByUser = new Map<string, typeof predictions>()
  for (const p of predictions) {
    const list = predsByUser.get(p.user_id) ?? []
    list.push(p)
    predsByUser.set(p.user_id, list)
  }

  const champBetByUser = new Map(championBets.map((b) => [b.user_id, b]))

  let realChamp: string | null = null
  let realVice: string | null = null
  for (const m of finishedMatches) {
    if (
      m.phase === 'final' &&
      m.home_score !== null &&
      m.away_score !== null &&
      m.home_team &&
      m.away_team
    ) {
      if (m.home_score > m.away_score) {
        realChamp = m.home_team
        realVice = m.away_team
      } else if (m.away_score > m.home_score) {
        realChamp = m.away_team
        realVice = m.home_team
      }
      break
    }
  }

  interface MemberAccum {
    user_id: string
    full_name: string | null
    avatar_color: string
    points: number
    exact_scores: number
    correct_outcomes: number
    mostRecentExactDate: string | null
    champion_team: string | null
    runner_up_team: string | null
  }

  const accums: MemberAccum[] = members.map((member) => {
    const preds = predsByUser.get(member.user_id) ?? []
    let points = 0
    let exact_scores = 0
    let correct_outcomes = 0
    let mostRecentExactDate: string | null = null

    for (const pred of preds) {
      const match = matchMap.get(pred.match_id)
      if (!match || match.home_score === null || match.away_score === null) continue
      if (pred.predicted_home_score === null || pred.predicted_away_score === null) continue

      const input = {
        ph: pred.predicted_home_score,
        pa: pred.predicted_away_score,
        rh: match.home_score,
        ra: match.away_score,
      }

      let matchPoints: number
      if (match.phase === 'group') {
        matchPoints = scoreGroup(input)
      } else if (KNOCKOUT_PHASES.has(match.phase)) {
        matchPoints = scoreKnockout(input, match.phase as KnockoutPhase)
      } else {
        matchPoints = 0
      }

      points += matchPoints

      const isExact =
        pred.predicted_home_score === match.home_score &&
        pred.predicted_away_score === match.away_score

      if (isExact) {
        exact_scores++
        if (mostRecentExactDate === null || match.match_date > mostRecentExactDate) {
          mostRecentExactDate = match.match_date
        }
      }

      if (matchPoints > 0) {
        correct_outcomes++
      }
    }

    const champBet = champBetByUser.get(member.user_id)
    if (champBet) {
      points += scoreChampion(champBet.champion_team, champBet.runner_up_team, realChamp, realVice)
    }

    return {
      user_id: member.user_id,
      full_name: member.full_name,
      avatar_color: member.avatar_color,
      points,
      exact_scores,
      correct_outcomes,
      mostRecentExactDate,
      champion_team: champBet?.champion_team ?? null,
      runner_up_team: champBet?.runner_up_team ?? null,
    }
  })

  accums.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points

    const aHasExact = a.mostRecentExactDate !== null ? 1 : 0
    const bHasExact = b.mostRecentExactDate !== null ? 1 : 0
    if (bHasExact !== aHasExact) return bHasExact - aHasExact

    if (b.exact_scores !== a.exact_scores) return b.exact_scores - a.exact_scores

    if (a.mostRecentExactDate !== null && b.mostRecentExactDate !== null) {
      if (b.mostRecentExactDate !== a.mostRecentExactDate) {
        return b.mostRecentExactDate > a.mostRecentExactDate ? 1 : -1
      }
    }

    return (a.full_name ?? '').localeCompare(b.full_name ?? '', 'pt-BR')
  })

  return accums.map((a, idx) => ({
    user_id: a.user_id,
    full_name: a.full_name,
    avatar_color: a.avatar_color,
    points: a.points,
    position: idx + 1,
    exact_scores: a.exact_scores,
    correct_outcomes: a.correct_outcomes,
    champion_team: a.champion_team,
    runner_up_team: a.runner_up_team,
  }))
}
