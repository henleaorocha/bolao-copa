import { describe, it, expect } from 'vitest'
import { computeRanking } from '@/lib/ranking'
import type { RankingMemberInput, RankingMatchInput, RankingComputeArgs } from '@/lib/ranking'
import { scoreGroup, scoreKnockout } from '@/lib/scoring'

function makeMember(overrides: Partial<RankingMemberInput> = {}): RankingMemberInput {
  return {
    user_id: 'user-1',
    full_name: 'Alice',
    avatar_color: '#FF0000',
    joined_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeMatch(overrides: Partial<RankingMatchInput> = {}): RankingMatchInput {
  return {
    id: 'match-1',
    phase: 'group',
    home_score: 2,
    away_score: 1,
    match_date: '2026-06-01T18:00:00Z',
    home_team: 'Brasil',
    away_team: 'Argentina',
    ...overrides,
  }
}

function args(partial: Partial<RankingComputeArgs>): RankingComputeArgs {
  return {
    members: [],
    predictions: [],
    finishedMatches: [],
    championBets: [],
    ...partial,
  }
}

describe('computeRanking', () => {
  describe('points parity', () => {
    it('group exact: scores 10 points matching scoreGroup', () => {
      const member = makeMember()
      const match = makeMatch({ id: 'm1', phase: 'group', home_score: 2, away_score: 1 })
      const pred = { user_id: 'user-1', match_id: 'm1', predicted_home_score: 2, predicted_away_score: 1 }
      const [entry] = computeRanking(args({ members: [member], predictions: [pred], finishedMatches: [match] }))
      expect(entry.points).toBe(scoreGroup({ ph: 2, pa: 1, rh: 2, ra: 1 }))
      expect(entry.points).toBe(10)
    })

    it('knockout exact: applies scoreKnockout phase multiplier', () => {
      const member = makeMember()
      const match = makeMatch({ id: 'm1', phase: 'semi', home_score: 1, away_score: 0 })
      const pred = { user_id: 'user-1', match_id: 'm1', predicted_home_score: 1, predicted_away_score: 0 }
      const [entry] = computeRanking(args({ members: [member], predictions: [pred], finishedMatches: [match] }))
      expect(entry.points).toBe(scoreKnockout({ ph: 1, pa: 0, rh: 1, ra: 0 }, 'semi'))
      expect(entry.points).toBe(30)
    })

    it('mixed group + knockout predictions sum correctly', () => {
      const member = makeMember()
      const gMatch = makeMatch({ id: 'g1', phase: 'group', home_score: 1, away_score: 1 })
      const kMatch = makeMatch({ id: 'k1', phase: '8th', home_score: 2, away_score: 0 })
      const predictions = [
        { user_id: 'user-1', match_id: 'g1', predicted_home_score: 1, predicted_away_score: 1 },
        { user_id: 'user-1', match_id: 'k1', predicted_home_score: 2, predicted_away_score: 0 },
      ]
      const [entry] = computeRanking(
        args({ members: [member], predictions, finishedMatches: [gMatch, kMatch] })
      )
      const expected =
        scoreGroup({ ph: 1, pa: 1, rh: 1, ra: 1 }) +
        scoreKnockout({ ph: 2, pa: 0, rh: 2, ra: 0 }, '8th')
      expect(entry.points).toBe(expected)
    })
  })

  describe('champion bet', () => {
    it('champion-bet points are added to points but NOT to exact_scores or correct_outcomes', () => {
      const member = makeMember()
      const finalMatch = makeMatch({
        id: 'final',
        phase: 'final',
        home_score: 1,
        away_score: 0,
        home_team: 'BRA',
        away_team: 'ARG',
        match_date: '2026-07-13T20:00:00Z',
      })
      const champBet = { user_id: 'user-1', champion_team: 'BRA', runner_up_team: 'ARG' }
      const [entry] = computeRanking(
        args({
          members: [member],
          predictions: [],
          finishedMatches: [finalMatch],
          championBets: [champBet],
        })
      )
      expect(entry.points).toBe(75) // 50 (champ) + 25 (vice)
      expect(entry.exact_scores).toBe(0)
      expect(entry.correct_outcomes).toBe(0)
    })
  })

  describe('correct_outcomes includes exact scores', () => {
    it('2 exact + 1 correct-direction-only → exact_scores:2, correct_outcomes:3', () => {
      const member = makeMember()
      const m1 = makeMatch({ id: 'm1', phase: 'group', home_score: 2, away_score: 1 })
      const m2 = makeMatch({ id: 'm2', phase: 'group', home_score: 3, away_score: 0 })
      const m3 = makeMatch({ id: 'm3', phase: 'group', home_score: 1, away_score: 0 })
      const predictions = [
        { user_id: 'user-1', match_id: 'm1', predicted_home_score: 2, predicted_away_score: 1 }, // exact
        { user_id: 'user-1', match_id: 'm2', predicted_home_score: 3, predicted_away_score: 0 }, // exact
        { user_id: 'user-1', match_id: 'm3', predicted_home_score: 2, predicted_away_score: 0 }, // correct direction, not exact
      ]
      const [entry] = computeRanking(
        args({ members: [member], predictions, finishedMatches: [m1, m2, m3] })
      )
      expect(entry.exact_scores).toBe(2)
      expect(entry.correct_outcomes).toBe(3)
    })
  })

  describe('tiebreaker level 1: has-exact beats no-exact', () => {
    it('member with any exact score ranks above same-points member with no exact', () => {
      // Alice: exact 2-1 on mA → 10pts (exact)
      // Bob: correct-dir on mA (3-1 → still home win → 5pts) + correct-dir on mB (2-0 vs 1-0 → 5pts) = 10pts (no exact)
      const alice = makeMember({ user_id: 'u-alice', full_name: 'Alice' })
      const bob = makeMember({ user_id: 'u-bob', full_name: 'Bob' })
      const mA = makeMatch({ id: 'mA', phase: 'group', home_score: 2, away_score: 1 })
      const mB = makeMatch({ id: 'mB', phase: 'group', home_score: 1, away_score: 0 })
      const predictions = [
        { user_id: 'u-alice', match_id: 'mA', predicted_home_score: 2, predicted_away_score: 1 }, // exact: 10pts
        { user_id: 'u-bob', match_id: 'mA', predicted_home_score: 3, predicted_away_score: 1 },   // correct dir: 5pts
        { user_id: 'u-bob', match_id: 'mB', predicted_home_score: 2, predicted_away_score: 0 },   // correct dir: 5pts
      ]
      const result = computeRanking(
        args({ members: [alice, bob], predictions, finishedMatches: [mA, mB] })
      )
      expect(result[0].points).toBe(result[1].points) // tied at 10
      expect(result[0].user_id).toBe('u-alice')
      expect(result[1].user_id).toBe('u-bob')
    })
  })

  describe('tiebreaker level 2: later match_date wins', () => {
    it('member whose latest exact is on a later match_date ranks higher when points are tied', () => {
      const alice = makeMember({ user_id: 'u-alice', full_name: 'Alice' })
      const bob = makeMember({ user_id: 'u-bob', full_name: 'Bob' })
      const early = makeMatch({ id: 'm-early', phase: 'group', home_score: 1, away_score: 0, match_date: '2026-06-01T18:00:00Z' })
      const late = makeMatch({ id: 'm-late', phase: 'group', home_score: 2, away_score: 1, match_date: '2026-06-15T18:00:00Z' })
      const predictions = [
        // Alice: exact on early (10pts), wrong on late (0pts) → total 10, mostRecentExact = early
        { user_id: 'u-alice', match_id: 'm-early', predicted_home_score: 1, predicted_away_score: 0 },
        { user_id: 'u-alice', match_id: 'm-late', predicted_home_score: 0, predicted_away_score: 1 },
        // Bob: wrong on early (0pts), exact on late (10pts) → total 10, mostRecentExact = late
        { user_id: 'u-bob', match_id: 'm-early', predicted_home_score: 0, predicted_away_score: 1 },
        { user_id: 'u-bob', match_id: 'm-late', predicted_home_score: 2, predicted_away_score: 1 },
      ]
      const result = computeRanking(
        args({ members: [alice, bob], predictions, finishedMatches: [early, late] })
      )
      expect(result[0].points).toBe(result[1].points) // both 10pts
      expect(result[0].user_id).toBe('u-bob')   // Bob's most-recent-exact is on the later match
      expect(result[1].user_id).toBe('u-alice')
    })
  })

  describe('tiebreaker level 3: alphabetical pt-BR', () => {
    it('members tied with same points and same most-recent-exact date are sorted A→Z by full_name', () => {
      const charlie = makeMember({ user_id: 'u-c', full_name: 'Charlie' })
      const alice = makeMember({ user_id: 'u-a', full_name: 'Alice' })
      const bob = makeMember({ user_id: 'u-b', full_name: 'Bob' })
      const m1 = makeMatch({ id: 'm1', phase: 'group', home_score: 1, away_score: 0, match_date: '2026-06-01T18:00:00Z' })
      // All three get exact on the same match → same points, same mostRecentExactDate
      const predictions = [
        { user_id: 'u-c', match_id: 'm1', predicted_home_score: 1, predicted_away_score: 0 },
        { user_id: 'u-a', match_id: 'm1', predicted_home_score: 1, predicted_away_score: 0 },
        { user_id: 'u-b', match_id: 'm1', predicted_home_score: 1, predicted_away_score: 0 },
      ]
      const result = computeRanking(
        args({ members: [charlie, alice, bob], predictions, finishedMatches: [m1] })
      )
      expect(result.map((r) => r.full_name)).toEqual(['Alice', 'Bob', 'Charlie'])
    })
  })

  describe('all-zero pre-tournament league', () => {
    it('when no finished matches exist, every member has 0 points and list is alphabetical', () => {
      const members = [
        makeMember({ user_id: 'u-c', full_name: 'Carlos' }),
        makeMember({ user_id: 'u-a', full_name: 'Ana' }),
        makeMember({ user_id: 'u-b', full_name: 'Bruno' }),
      ]
      const result = computeRanking(args({ members }))
      expect(result.every((r) => r.points === 0)).toBe(true)
      expect(result.map((r) => r.full_name)).toEqual(['Ana', 'Bruno', 'Carlos'])
    })
  })

  describe('fewer than 3 members', () => {
    it('returns a 1-item list correctly ordered for a single member', () => {
      const member = makeMember({ user_id: 'u-1', full_name: 'Solo' })
      const result = computeRanking(args({ members: [member] }))
      expect(result).toHaveLength(1)
      expect(result[0].position).toBe(1)
    })

    it('returns a correctly ordered 2-item list', () => {
      const alice = makeMember({ user_id: 'u-a', full_name: 'Alice' })
      const bob = makeMember({ user_id: 'u-b', full_name: 'Bob' })
      const m1 = makeMatch({ id: 'm1', phase: 'group', home_score: 1, away_score: 0 })
      const predictions = [
        { user_id: 'u-a', match_id: 'm1', predicted_home_score: 1, predicted_away_score: 0 }, // 10pts
        { user_id: 'u-b', match_id: 'm1', predicted_home_score: 0, predicted_away_score: 1 }, // 0pts wrong dir
      ]
      const result = computeRanking(args({ members: [alice, bob], predictions, finishedMatches: [m1] }))
      expect(result).toHaveLength(2)
      expect(result[0].user_id).toBe('u-a')
      expect(result[0].position).toBe(1)
      expect(result[1].position).toBe(2)
    })
  })

  describe('positions', () => {
    it('assigns 1-based positions reflecting final sorted order', () => {
      const members = [
        makeMember({ user_id: 'u-1', full_name: 'Alice' }),
        makeMember({ user_id: 'u-2', full_name: 'Bob' }),
        makeMember({ user_id: 'u-3', full_name: 'Charlie' }),
      ]
      const m1 = makeMatch({ id: 'm1', phase: 'group', home_score: 1, away_score: 0 })
      const predictions = [
        { user_id: 'u-1', match_id: 'm1', predicted_home_score: 1, predicted_away_score: 0 }, // 10pts
        { user_id: 'u-2', match_id: 'm1', predicted_home_score: 2, predicted_away_score: 0 }, // 5pts correct dir
        { user_id: 'u-3', match_id: 'm1', predicted_home_score: 0, predicted_away_score: 1 }, // 0pts
      ]
      const result = computeRanking(args({ members, predictions, finishedMatches: [m1] }))
      expect(result[0].position).toBe(1)
      expect(result[1].position).toBe(2)
      expect(result[2].position).toBe(3)
    })
  })
})
