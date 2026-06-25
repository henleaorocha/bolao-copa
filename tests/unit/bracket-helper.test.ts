import { describe, it, expect } from 'vitest'
import { buildBracketResponse, PHASE_MULTIPLIERS, PHASE_LABELS } from '@/lib/bracket'
import { BRACKET_SKELETON, PHASE_ORDER } from '@/lib/bracket-skeleton'
import type { Match } from '@/lib/api/types'

// R32 slot #1 keys to openfootball num 73 → external_id wc2026-73 (ADR-007).
const R32_SLOT1_EXTERNAL_ID = 'wc2026-73'
const R32_SLOT1_DATE = '2026-06-28T21:00:00Z'
const R32_SLOT1_VENUE = 'Los Angeles (Inglewood)' // openfootball ground (a city)

// nowMs values for deterministic state control
// "long before": 24h before R32 slot #1 kickoff → slot is open
const NOW_OPEN = new Date('2026-06-28T19:59:00Z').getTime() // >1h before kickoff
// "within 1h": 30 min before kickoff → slot is locked
const NOW_LOCKED = new Date('2026-06-28T20:31:00Z').getTime()

function makeMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match-1',
    external_id: R32_SLOT1_EXTERNAL_ID,
    home_team: 'Brasil',
    away_team: 'Argentina',
    home_flag: 'br',
    away_flag: 'ar',
    match_date: R32_SLOT1_DATE,
    phase: '32nd',
    group: null,
    status: 'scheduled',
    home_score: null,
    away_score: null,
    venue: R32_SLOT1_VENUE,
    city: null,
    ...overrides,
  }
}

describe('buildBracketResponse — pre-Copa (no matches)', () => {
  it('all slots are placeholder when no matches are provided', () => {
    const result = buildBracketResponse([], [])
    for (const phase of result.phases) {
      for (const slot of phase.slots) {
        expect(slot.state).toBe('placeholder')
        expect(slot.matchId).toBeNull()
        expect(slot.homeTeam).toBeNull()
        expect(slot.awayTeam).toBeNull()
        expect(slot.prediction).toBeNull()
      }
    }
  })

  it('newlyUnlockedPhase is null when there are no open slots', () => {
    const result = buildBracketResponse([], [])
    expect(result.newlyUnlockedPhase).toBeNull()
  })

  it('returns 6 phases in PHASE_ORDER', () => {
    const result = buildBracketResponse([], [])
    expect(result.phases).toHaveLength(6)
    result.phases.forEach((p, i) => {
      expect(p.phase).toBe(PHASE_ORDER[i])
    })
  })

  it('all slots have correct per-phase multiplier', () => {
    const result = buildBracketResponse([], [])
    for (const phase of result.phases) {
      for (const slot of phase.slots) {
        expect(slot.multiplier).toBe(PHASE_MULTIPLIERS[phase.phase])
      }
    }
  })
})

describe('buildBracketResponse — confirmed match before lock window', () => {
  it('slot is open when match has real teams and kickoff is > 1h away', () => {
    const match = makeMatch()

    const result = buildBracketResponse([match], [], NOW_OPEN)
    const r32 = result.phases.find((p) => p.phase === '32nd')!
    const slot1 = r32.slots.find((s) => s.pos === 1)!

    expect(slot1.state).toBe('open')
    expect(slot1.homeTeam).toBe('Brasil')
    expect(slot1.awayTeam).toBe('Argentina')
    expect(slot1.homeFlag).toBe('br')
    expect(slot1.awayFlag).toBe('ar')
    expect(slot1.matchId).toBe('match-1')
    expect(slot1.kickoff).toBe(R32_SLOT1_DATE)
  })

  it('slot carries the user prediction when one exists', () => {
    const match = makeMatch()
    const predictions = [
      { match_id: 'match-1', predicted_home_score: 2, predicted_away_score: 1 },
    ]

    const result = buildBracketResponse([match], predictions, NOW_OPEN)
    const slot = result.phases.find((p) => p.phase === '32nd')!.slots.find((s) => s.pos === 1)!

    expect(slot.prediction).toEqual({ home: 2, away: 1 })
  })
})

describe('buildBracketResponse — match within 1h of kickoff → locked', () => {
  it('slot state is locked when match_date is within the 1h window', () => {
    const match = makeMatch()

    const result = buildBracketResponse([match], [], NOW_LOCKED)
    const slot = result.phases.find((p) => p.phase === '32nd')!.slots.find((s) => s.pos === 1)!

    expect(slot.state).toBe('locked')
  })

  it('slot state is finished when match status is finished', () => {
    const match = makeMatch({
      status: 'finished',
      home_score: 3,
      away_score: 1,
    })

    const result = buildBracketResponse([match], [], NOW_LOCKED)
    const slot = result.phases.find((p) => p.phase === '32nd')!.slots.find((s) => s.pos === 1)!

    expect(slot.state).toBe('finished')
    expect(slot.homeScore).toBe(3)
    expect(slot.awayScore).toBe(1)
  })
})

describe('buildBracketResponse — TBD/placeholder team strings stay placeholder', () => {
  it('slot stays placeholder when home team is not a valid Copa team', () => {
    const match = makeMatch({ home_team: 'Vencedor 1º Grupo A' })
    const result = buildBracketResponse([match], [], NOW_OPEN)
    const slot = result.phases.find((p) => p.phase === '32nd')!.slots.find((s) => s.pos === 1)!

    expect(slot.state).toBe('placeholder')
    expect(slot.homeTeam).toBeNull()
  })

  it('slot stays placeholder when away team is a placeholder label', () => {
    const match = makeMatch({ away_team: 'Vencedor 2º Grupo B' })
    const result = buildBracketResponse([match], [], NOW_OPEN)
    const slot = result.phases.find((p) => p.phase === '32nd')!.slots.find((s) => s.pos === 1)!

    expect(slot.state).toBe('placeholder')
    expect(slot.awayTeam).toBeNull()
  })

  it('slot stays placeholder when external_id does not resolve to any slot', () => {
    const match = makeMatch({ external_id: 'wc2026-A-Brasil-Argentina' })
    const result = buildBracketResponse([match], [], NOW_OPEN)
    const allSlots = result.phases.flatMap((p) => p.slots)
    expect(allSlots.every((s) => s.state === 'placeholder')).toBe(true)
  })

  it('slot stays placeholder when external_id is null', () => {
    const match = makeMatch({ external_id: null })
    const result = buildBracketResponse([match], [], NOW_OPEN)
    const allSlots = result.phases.flatMap((p) => p.slots)
    expect(allSlots.every((s) => s.state === 'placeholder')).toBe(true)
  })
})

describe('buildBracketResponse — newlyUnlockedPhase logic', () => {
  it('newlyUnlockedPhase is set when an open slot has no prediction', () => {
    const match = makeMatch()
    const result = buildBracketResponse([match], [], NOW_OPEN)
    expect(result.newlyUnlockedPhase).toBe('32nd')
  })

  it('newlyUnlockedPhase is null when the user has bet all open slots', () => {
    const match = makeMatch()
    const predictions = [
      { match_id: 'match-1', predicted_home_score: 1, predicted_away_score: 0 },
    ]
    const result = buildBracketResponse([match], predictions, NOW_OPEN)
    expect(result.newlyUnlockedPhase).toBeNull()
  })

  it('newlyUnlockedPhase names the latest phase in PHASE_ORDER with an open un-bet match', () => {
    // R32 slot #1: external_id wc2026-73 ; Semi slot #2: external_id wc2026-102
    const SEMI_SLOT2_DATE = '2026-07-17T21:00:00Z'
    const nowMs = new Date('2026-06-01T00:00:00Z').getTime() // well before both kickoffs

    const r32Match: Match = makeMatch({ id: 'match-r32' })
    const semiMatch: Match = makeMatch({
      id: 'match-semi',
      external_id: 'wc2026-102',
      match_date: SEMI_SLOT2_DATE,
      phase: 'semi',
    })

    // R32 slot #1 has a prediction; semi slot #2 has none
    const predictions = [
      { match_id: 'match-r32', predicted_home_score: 1, predicted_away_score: 0 },
    ]

    const result = buildBracketResponse([r32Match, semiMatch], predictions, nowMs)
    expect(result.newlyUnlockedPhase).toBe('semi')
  })
})

describe('buildBracketResponse — activePhase', () => {
  // Build a finished knockout match for a given skeleton slot (by external_id),
  // with valid Copa teams so the slot resolves to 'finished'.
  function finishedMatchForExternalId(externalId: string, idx: number): Match {
    return makeMatch({
      id: `m-${idx}`,
      external_id: externalId,
      status: 'finished',
      home_score: 1,
      away_score: 0,
    })
  }

  function finishedMatchesForPhases(phases: string[]): Match[] {
    return BRACKET_SKELETON.filter((s) => phases.includes(s.phase)).map((s, i) =>
      finishedMatchForExternalId(s.externalId, i)
    )
  }

  it('is always non-null and is "32nd" pre-tournament (all placeholder)', () => {
    const result = buildBracketResponse([], [])
    expect(result.activePhase).toBe('32nd')
  })

  it('is "32nd" while the round of 32 has any non-finished slot (partial finish)', () => {
    // Only R32 slot #1 is finished; the rest of R32 stays placeholder (non-finished).
    const result = buildBracketResponse(
      [finishedMatchForExternalId('wc2026-73', 0)],
      [],
      NOW_OPEN
    )
    expect(result.activePhase).toBe('32nd')
  })

  it('is "16th" when the entire round of 32 is finished and the rest is open/placeholder', () => {
    const matches = finishedMatchesForPhases(['32nd'])
    const result = buildBracketResponse(matches, [], NOW_OPEN)
    expect(result.activePhase).toBe('16th')
  })

  it('is the earliest non-finished phase across mixed phases', () => {
    // R32 and R16 fully finished; quarter-finals onward are still placeholder.
    const matches = finishedMatchesForPhases(['32nd', '16th'])
    const result = buildBracketResponse(matches, [], NOW_OPEN)
    expect(result.activePhase).toBe('8th')
  })

  it('falls back to "final" when the entire knockout is finished', () => {
    const matches = finishedMatchesForPhases([
      '32nd',
      '16th',
      '8th',
      'semi',
      '3rd_place',
      'final',
    ])
    const result = buildBracketResponse(matches, [], NOW_OPEN)
    expect(result.activePhase).toBe('final')
  })

  it('does not change newlyUnlockedPhase (regression guard, differs from activePhase)', () => {
    // R32 slot #1 open WITH a prediction, semi slot #2 open WITHOUT one. This yields
    // activePhase '32nd' (earliest non-finished) but newlyUnlockedPhase 'semi'
    // (latest open un-bet) — proving the two fields are computed independently.
    const SEMI_SLOT2_DATE = '2026-07-17T21:00:00Z'
    const nowMs = new Date('2026-06-01T00:00:00Z').getTime()

    const r32Match = makeMatch({ id: 'match-r32' })
    const semiMatch = makeMatch({
      id: 'match-semi',
      external_id: 'wc2026-102',
      match_date: SEMI_SLOT2_DATE,
      phase: 'semi',
    })
    const predictions = [
      { match_id: 'match-r32', predicted_home_score: 1, predicted_away_score: 0 },
    ]

    const result = buildBracketResponse([r32Match, semiMatch], predictions, nowMs)
    expect(result.newlyUnlockedPhase).toBe('semi')
    expect(result.activePhase).toBe('32nd')
  })
})

describe('buildBracketResponse — phase structure correctness', () => {
  it('returns phases in PHASE_ORDER with correct multipliers', () => {
    const result = buildBracketResponse([], [])
    expect(result.phases.map((p) => p.phase)).toEqual([...PHASE_ORDER])
    for (const phase of result.phases) {
      expect(phase.multiplier).toBe(PHASE_MULTIPLIERS[phase.phase])
    }
  })

  it('each phase has the correct slot count matching the skeleton', () => {
    const result = buildBracketResponse([], [])
    const expectedCounts: Record<string, number> = {
      '32nd': 16,
      '16th': 8,
      '8th': 4,
      semi: 2,
      '3rd_place': 1,
      final: 1,
    }
    for (const phase of result.phases) {
      expect(phase.slots).toHaveLength(expectedCounts[phase.phase])
    }
  })

  it('placeholder slots carry homeLabel and awayLabel from the skeleton', () => {
    const result = buildBracketResponse([], [])
    const r32 = result.phases.find((p) => p.phase === '32nd')!
    const slot1 = r32.slots.find((s) => s.pos === 1)!
    const skeleton = BRACKET_SKELETON.find((s) => s.phase === '32nd' && s.pos === 1)!

    expect(slot1.homeLabel).toBe(skeleton.homeLabel)
    expect(slot1.awayLabel).toBe(skeleton.awayLabel)
  })

  it('returns correct phase labels', () => {
    const result = buildBracketResponse([], [])
    for (const phase of result.phases) {
      expect(phase.label).toBe(PHASE_LABELS[phase.phase])
    }
  })
})

describe('buildBracketResponse — Final / 3rd-place via openfootball 2026 numeric ids', () => {
  // Regression: the live 2026 feed numbers the Final (104) and 3rd place (103),
  // so synced rows key them as wc2026-104 / wc2026-103 rather than the semantic
  // wc2026-final / wc2026-3rd. The bracket must still fill those two slots.
  it('fills the Final slot from a synced wc2026-104 row', () => {
    const finalMatch = makeMatch({
      id: 'match-final',
      external_id: 'wc2026-104',
      home_team: 'Brasil',
      away_team: 'França',
      home_flag: 'br',
      away_flag: 'fr',
      phase: 'final',
      match_date: '2026-07-19T19:00:00Z',
      status: 'finished',
      home_score: 2,
      away_score: 1,
    })

    const result = buildBracketResponse([finalMatch], [], NOW_OPEN)
    const finalSlot = result.phases.find((p) => p.phase === 'final')!.slots[0]

    expect(finalSlot.homeTeam).toBe('Brasil')
    expect(finalSlot.awayTeam).toBe('França')
    expect(finalSlot.state).toBe('finished')
    expect(finalSlot.homeScore).toBe(2)
    expect(finalSlot.awayScore).toBe(1)
    expect(finalSlot.matchId).toBe('match-final')
  })

  it('fills the 3rd-place slot from a synced wc2026-103 row', () => {
    const thirdMatch = makeMatch({
      id: 'match-3rd',
      external_id: 'wc2026-103',
      home_team: 'Portugal',
      away_team: 'Espanha',
      home_flag: 'pt',
      away_flag: 'es',
      phase: '3rd_place',
      match_date: '2026-07-18T19:00:00Z',
      status: 'finished',
      home_score: 3,
      away_score: 0,
    })

    const result = buildBracketResponse([thirdMatch], [], NOW_OPEN)
    const thirdSlot = result.phases.find((p) => p.phase === '3rd_place')!.slots[0]

    expect(thirdSlot.homeTeam).toBe('Portugal')
    expect(thirdSlot.awayTeam).toBe('Espanha')
    expect(thirdSlot.state).toBe('finished')
    expect(thirdSlot.matchId).toBe('match-3rd')
  })
})
