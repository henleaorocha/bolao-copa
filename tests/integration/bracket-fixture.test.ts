import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { mapOpenfootballMatch, type OpenfootballMatch } from '@/lib/football-api'
import { buildBracketResponse } from '@/lib/bracket'
import { BRACKET_SKELETON } from '@/lib/bracket-skeleton'
import type { Match } from '@/lib/api/types'

// Drive buildBracketResponse end-to-end over the pinned openfootball sample:
// adapter (mapOpenfootballMatch) → external_id → bracket slot. This proves the
// re-key works against the real source shape, offline (ADR-007).
const FIXTURE = JSON.parse(
  readFileSync(join(__dirname, '../fixtures/openfootball-wc2026.json'), 'utf-8')
) as { matches: OpenfootballMatch[] }

// Knockout matches are the ones the adapter places into a knockout phase.
const KNOCKOUT_PHASES = new Set(['32nd', '16th', '8th', 'semi', '3rd_place', 'final'])

function knockoutRows(): Match[] {
  return FIXTURE.matches
    .map(mapOpenfootballMatch)
    .filter((row) => KNOCKOUT_PHASES.has(row.phase))
    .map((row, i) => ({
      id: `m-${i}`,
      external_id: row.external_id,
      home_team: row.home_team,
      away_team: row.away_team,
      home_flag: row.home_flag,
      away_flag: row.away_flag,
      match_date: row.match_date,
      phase: row.phase as Match['phase'],
      group: row.group,
      status: row.status,
      home_score: row.home_score,
      away_score: row.away_score,
      venue: row.venue,
      city: row.city,
    }))
}

describe('buildBracketResponse over fixture-derived knockout matches', () => {
  it('maps every knockout slot by external_id (32 slots covered)', () => {
    const rows = knockoutRows()
    // The fixture carries 32 knockout games (R32..SF = 30, + Final + 3rd place).
    expect(rows).toHaveLength(32)
    const ids = new Set(rows.map((r) => r.external_id))
    for (const slot of BRACKET_SKELETON) {
      expect(ids.has(slot.externalId)).toBe(true)
    }
  })

  it('leaves all slots as placeholders while teams are still W##/#A codes', () => {
    // Pre-tournament: knockout team1/team2 are placeholder codes, not real teams,
    // so isConfirmedMatchup is false everywhere.
    const result = buildBracketResponse(knockoutRows(), [])
    const slots = result.phases.flatMap((p) => p.slots)
    expect(slots.every((s) => s.state === 'placeholder')).toBe(true)
  })

  it('fills a slot when its match has confirmed real teams, others stay placeholder', () => {
    const rows = knockoutRows()
    // Confirm the matchup behind external_id wc2026-73 (R32 pos 1).
    const r32 = rows.find((r) => r.external_id === 'wc2026-73')!
    r32.home_team = 'Brasil'
    r32.away_team = 'Argentina'
    r32.home_flag = 'br'
    r32.away_flag = 'ar'

    const nowMs = new Date('2026-06-01T00:00:00Z').getTime() // before all kickoffs
    const result = buildBracketResponse(rows, [], nowMs)

    const r32Phase = result.phases.find((p) => p.phase === '32nd')!
    const filled = r32Phase.slots.find((s) => s.pos === 1)!
    expect(filled.state).toBe('open')
    expect(filled.homeTeam).toBe('Brasil')
    expect(filled.awayTeam).toBe('Argentina')

    // Exactly one slot is non-placeholder; every other slot is still a
    // placeholder (their teams are unknown W##/#A codes).
    const nonPlaceholder = result.phases
      .flatMap((p) => p.slots)
      .filter((s) => s.state !== 'placeholder')
    expect(nonPlaceholder).toHaveLength(1)
    expect(nonPlaceholder[0].homeTeam).toBe('Brasil')
  })

  it('fills the Final and 3rd-place slots via wc2026-final / wc2026-3rd', () => {
    const rows = knockoutRows()
    const final = rows.find((r) => r.external_id === 'wc2026-final')!
    final.home_team = 'Brasil'
    final.away_team = 'França'
    const third = rows.find((r) => r.external_id === 'wc2026-3rd')!
    third.home_team = 'Argentina'
    third.away_team = 'Espanha'

    const nowMs = new Date('2026-06-01T00:00:00Z').getTime()
    const result = buildBracketResponse(rows, [], nowMs)

    const finalSlot = result.phases.find((p) => p.phase === 'final')!.slots[0]
    expect(finalSlot.homeTeam).toBe('Brasil')
    expect(finalSlot.awayTeam).toBe('França')

    const thirdSlot = result.phases.find((p) => p.phase === '3rd_place')!.slots[0]
    expect(thirdSlot.homeTeam).toBe('Argentina')
    expect(thirdSlot.awayTeam).toBe('Espanha')
  })

  it('derives slot state open/locked/finished from kickoff vs the 1h deadline', () => {
    const rows = knockoutRows()
    const r32 = rows.find((r) => r.external_id === 'wc2026-73')!
    r32.home_team = 'Brasil'
    r32.away_team = 'Argentina'
    const kickoff = new Date(r32.match_date).getTime()

    // > 1h before kickoff → open
    const open = buildBracketResponse(rows, [], kickoff - 2 * 60 * 60 * 1000)
    expect(open.phases.find((p) => p.phase === '32nd')!.slots[0].state).toBe('open')

    // within 1h of kickoff → locked
    const locked = buildBracketResponse(rows, [], kickoff - 30 * 60 * 1000)
    expect(locked.phases.find((p) => p.phase === '32nd')!.slots[0].state).toBe('locked')

    // finished status → finished
    r32.status = 'finished'
    r32.home_score = 2
    r32.away_score = 1
    const finished = buildBracketResponse(rows, [], kickoff - 2 * 60 * 60 * 1000)
    const slot = finished.phases.find((p) => p.phase === '32nd')!.slots[0]
    expect(slot.state).toBe('finished')
    expect(slot.homeScore).toBe(2)
    expect(slot.awayScore).toBe(1)
  })
})
