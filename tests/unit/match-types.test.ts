import { describe, it, expect, expectTypeOf } from 'vitest'
import type {
  Match,
  Prediction,
  MatchWithPrediction,
  MatchDetail,
  OutcomeDistribution,
} from '@/lib/api/types'

const baseMatch: Match = {
  id: 'match-1',
  external_id: '12345',
  home_team: 'Brazil',
  away_team: 'Argentina',
  home_flag: 'br',
  away_flag: 'ar',
  match_date: '2026-06-14T18:00:00Z',
  phase: 'group',
  group: 'A',
  status: 'scheduled',
  home_score: null,
  away_score: null,
  venue: 'MetLife Stadium',
  city: 'East Rutherford',
}

describe('Match interface', () => {
  it('has all required fields', () => {
    expect(baseMatch).toHaveProperty('id')
    expect(baseMatch).toHaveProperty('external_id')
    expect(baseMatch).toHaveProperty('home_team')
    expect(baseMatch).toHaveProperty('away_team')
    expect(baseMatch).toHaveProperty('home_flag')
    expect(baseMatch).toHaveProperty('away_flag')
    expect(baseMatch).toHaveProperty('match_date')
    expect(baseMatch).toHaveProperty('phase')
    expect(baseMatch).toHaveProperty('group')
    expect(baseMatch).toHaveProperty('status')
    expect(baseMatch).toHaveProperty('home_score')
    expect(baseMatch).toHaveProperty('away_score')
    expect(baseMatch).toHaveProperty('venue')
    expect(baseMatch).toHaveProperty('city')
  })

  it('accepts all valid phase values', () => {
    const phases: Match['phase'][] = [
      'group', '32nd', '16th', '8th', '4th', 'semi', '3rd_place', 'final',
    ]
    phases.forEach(phase => {
      const m = { ...baseMatch, phase } satisfies Match
      expect(m.phase).toBe(phase)
    })
  })

  it('rejects an invalid phase value at the type level', () => {
    // @ts-expect-error 'quarter' is not in the phase union
    const m: Match = { ...baseMatch, phase: 'quarter' }
    void m
  })

  it('accepts all valid status values', () => {
    const statuses: Match['status'][] = ['scheduled', 'live', 'finished']
    statuses.forEach(status => {
      const m = { ...baseMatch, status } satisfies Match
      expect(m.status).toBe(status)
    })
  })

  it('allows nullable fields to be null', () => {
    const m = {
      ...baseMatch,
      external_id: null,
      home_flag: null,
      away_flag: null,
      group: null,
      home_score: null,
      away_score: null,
      venue: null,
      city: null,
    } satisfies Match
    expect(m.external_id).toBeNull()
    expect(m.home_flag).toBeNull()
    expect(m.away_flag).toBeNull()
    expect(m.venue).toBeNull()
    expect(m.city).toBeNull()
  })

  it('phase union type is correct', () => {
    expectTypeOf<Match['phase']>().toEqualTypeOf<
      'group' | '32nd' | '16th' | '8th' | '4th' | 'semi' | '3rd_place' | 'final'
    >()
  })

  it('status union type is correct', () => {
    expectTypeOf<Match['status']>().toEqualTypeOf<'scheduled' | 'live' | 'finished'>()
  })
})

describe('Prediction interface', () => {
  it('has all required fields', () => {
    const pred: Prediction = {
      id: 'pred-1',
      match_id: 'match-1',
      predicted_home_score: 2,
      predicted_away_score: 1,
      updated_at: '2026-06-14T17:00:00Z',
    }
    expect(pred).toHaveProperty('id')
    expect(pred).toHaveProperty('match_id')
    expect(pred).toHaveProperty('predicted_home_score')
    expect(pred).toHaveProperty('predicted_away_score')
    expect(pred).toHaveProperty('updated_at')
  })

  it('predicted scores are numbers', () => {
    expectTypeOf<Prediction['predicted_home_score']>().toEqualTypeOf<number>()
    expectTypeOf<Prediction['predicted_away_score']>().toEqualTypeOf<number>()
  })
})

describe('MatchWithPrediction interface', () => {
  it('extends Match and adds prediction and is_deadline_passed', () => {
    const mwp: MatchWithPrediction = {
      ...baseMatch,
      prediction: { predicted_home_score: 2, predicted_away_score: 1 },
      is_deadline_passed: false,
    }
    expect(mwp).toHaveProperty('id')
    expect(mwp).toHaveProperty('home_team')
    expect(mwp).toHaveProperty('prediction')
    expect(mwp).toHaveProperty('is_deadline_passed')
    expect(mwp.is_deadline_passed).toBe(false)
  })

  it('prediction can be null', () => {
    const mwp = {
      ...baseMatch,
      prediction: null,
      is_deadline_passed: false,
    } satisfies MatchWithPrediction
    expect(mwp.prediction).toBeNull()
  })

  it('is_deadline_passed is boolean', () => {
    expectTypeOf<MatchWithPrediction['is_deadline_passed']>().toEqualTypeOf<boolean>()
  })

  it('prediction is Pick<Prediction, scores> or null', () => {
    type PredSlice = Pick<Prediction, 'predicted_home_score' | 'predicted_away_score'> | null
    expectTypeOf<MatchWithPrediction['prediction']>().toEqualTypeOf<PredSlice>()
  })

  it('prediction does not include id or match_id fields', () => {
    const mwp: MatchWithPrediction = {
      ...baseMatch,
      prediction: { predicted_home_score: 0, predicted_away_score: 0 },
      is_deadline_passed: true,
    }
    if (mwp.prediction !== null) {
      // @ts-expect-error 'id' is not in the Pick slice
      void mwp.prediction.id
    }
  })
})

describe('OutcomeDistribution interface', () => {
  it('has all required number fields', () => {
    const dist: OutcomeDistribution = {
      home_win: 50,
      draw: 30,
      away_win: 20,
      total_predictions: 10,
    }
    expect(dist).toHaveProperty('home_win')
    expect(dist).toHaveProperty('draw')
    expect(dist).toHaveProperty('away_win')
    expect(dist).toHaveProperty('total_predictions')
  })

  it('all fields are typed as number', () => {
    expectTypeOf<OutcomeDistribution['home_win']>().toEqualTypeOf<number>()
    expectTypeOf<OutcomeDistribution['draw']>().toEqualTypeOf<number>()
    expectTypeOf<OutcomeDistribution['away_win']>().toEqualTypeOf<number>()
    expectTypeOf<OutcomeDistribution['total_predictions']>().toEqualTypeOf<number>()
  })

  it('accepts percentages in 0–100 range', () => {
    const dist = {
      home_win: 0,
      draw: 100,
      away_win: 0,
      total_predictions: 5,
    } satisfies OutcomeDistribution
    expect(dist.draw).toBe(100)
  })
})

describe('MatchDetail interface', () => {
  it('extends MatchWithPrediction and adds distribution', () => {
    const detail: MatchDetail = {
      ...baseMatch,
      prediction: null,
      is_deadline_passed: true,
      distribution: {
        home_win: 60,
        draw: 20,
        away_win: 20,
        total_predictions: 15,
      },
    }
    expect(detail).toHaveProperty('id')
    expect(detail).toHaveProperty('prediction')
    expect(detail).toHaveProperty('is_deadline_passed')
    expect(detail).toHaveProperty('distribution')
    expect(detail.distribution).not.toBeNull()
  })

  it('distribution can be null', () => {
    const detail = {
      ...baseMatch,
      prediction: null,
      is_deadline_passed: false,
      distribution: null,
    } satisfies MatchDetail
    expect(detail.distribution).toBeNull()
  })

  it('distribution is OutcomeDistribution or null', () => {
    expectTypeOf<MatchDetail['distribution']>().toEqualTypeOf<OutcomeDistribution | null>()
  })
})
