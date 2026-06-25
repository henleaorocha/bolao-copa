import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  fetchWorldCupFixtures,
  mapOpenfootballMatch,
} from '@/lib/football-api'
import type { OpenfootballMatch } from '@/lib/football-api'

const FIXTURE_PATH = join(
  process.cwd(),
  'tests/fixtures/openfootball-wc2026.json'
)
const PINNED: { matches: OpenfootballMatch[] } = JSON.parse(
  readFileSync(FIXTURE_PATH, 'utf-8')
)

function makeMatch(overrides: Partial<OpenfootballMatch> = {}): OpenfootballMatch {
  return {
    round: 'Matchday 1',
    date: '2026-06-11',
    time: '13:00 UTC-6',
    team1: 'Mexico',
    team2: 'South Africa',
    group: 'Group A',
    ground: 'Mexico City',
    ...overrides,
  }
}

// ── mapOpenfootballMatch ────────────────────────────────────────────────────

describe('mapOpenfootballMatch — status & scores', () => {
  it('derives status=finished and sets scores when score.ft is present', () => {
    const row = mapOpenfootballMatch(makeMatch({ score: { ft: [2, 1] } }))
    expect(row.status).toBe('finished')
    expect(row.home_score).toBe(2)
    expect(row.away_score).toBe(1)
  })

  it('derives status=scheduled with null scores when score is absent', () => {
    const row = mapOpenfootballMatch(makeMatch())
    expect(row.status).toBe('scheduled')
    expect(row.home_score).toBeNull()
    expect(row.away_score).toBeNull()
  })

  it('falls back to scheduled when score has an unknown shape', () => {
    const row = mapOpenfootballMatch(
      makeMatch({ score: {} as OpenfootballMatch['score'] })
    )
    expect(row.status).toBe('scheduled')
    expect(row.home_score).toBeNull()
    expect(row.away_score).toBeNull()
  })

  it('falls back to scheduled when score.ft is not a 2-number tuple', () => {
    const row = mapOpenfootballMatch(
      makeMatch({ score: { ft: [1] as unknown as [number, number] } })
    )
    expect(row.status).toBe('scheduled')
  })
})

describe('mapOpenfootballMatch — date + offset → ISO', () => {
  it('applies a UTC-4 offset for "17:00 UTC-4"', () => {
    const row = mapOpenfootballMatch(
      makeMatch({ date: '2026-07-18', time: '17:00 UTC-4' })
    )
    expect(row.match_date).toBe('2026-07-18T21:00:00.000Z')
  })

  it('applies a UTC-6 offset for "13:00 UTC-6"', () => {
    const row = mapOpenfootballMatch(
      makeMatch({ date: '2026-06-11', time: '13:00 UTC-6' })
    )
    expect(row.match_date).toBe('2026-06-11T19:00:00.000Z')
  })

  it('falls back to UTC midnight for malformed time', () => {
    const row = mapOpenfootballMatch(
      makeMatch({ date: '2026-06-11', time: 'garbage' })
    )
    expect(row.match_date).toBe('2026-06-11T00:00:00.000Z')
  })
})

describe('mapOpenfootballMatch — external_id & phase', () => {
  it('builds wc2026-<num> and phase from a knockout round name (num 73)', () => {
    const row = mapOpenfootballMatch(
      makeMatch({
        round: 'Round of 32',
        num: 73,
        group: undefined,
        team1: '2A',
        team2: '2B',
      })
    )
    expect(row.external_id).toBe('wc2026-73')
    expect(row.phase).toBe('32nd')
    expect(row.group).toBeNull()
  })

  it.each([
    ['Round of 16', '16th'],
    ['Quarter-final', '8th'],
    ['Semi-final', 'semi'],
  ] as const)('maps round %s to phase %s', (round, phase) => {
    const row = mapOpenfootballMatch(
      makeMatch({ round, num: 90, group: undefined, team1: 'W1', team2: 'W2' })
    )
    expect(row.phase).toBe(phase)
  })

  it('builds wc2026-final for the Final (no num)', () => {
    const row = mapOpenfootballMatch(
      makeMatch({
        round: 'Final',
        num: undefined,
        group: undefined,
        team1: 'W101',
        team2: 'W102',
      })
    )
    expect(row.external_id).toBe('wc2026-final')
    expect(row.phase).toBe('final')
  })

  it('builds wc2026-3rd for the third-place match (no num)', () => {
    const row = mapOpenfootballMatch(
      makeMatch({
        round: 'Match for third place',
        num: undefined,
        group: undefined,
        team1: 'L101',
        team2: 'L102',
      })
    )
    expect(row.external_id).toBe('wc2026-3rd')
    expect(row.phase).toBe('3rd_place')
  })

  it('builds wc2026-104 for the Final when the feed carries a num', () => {
    // The live 2026 feed numbers the Final (104); buildExternalId keys it by num
    // and the bracket aliases wc2026-104 onto the final slot (regression).
    const row = mapOpenfootballMatch(
      makeMatch({
        round: 'Final',
        num: 104,
        group: undefined,
        team1: 'W101',
        team2: 'W102',
      })
    )
    expect(row.external_id).toBe('wc2026-104')
    expect(row.phase).toBe('final')
  })

  it('builds wc2026-103 for the third-place match when the feed carries a num', () => {
    const row = mapOpenfootballMatch(
      makeMatch({
        round: 'Match for third place',
        num: 103,
        group: undefined,
        team1: 'L101',
        team2: 'L102',
      })
    )
    expect(row.external_id).toBe('wc2026-103')
    expect(row.phase).toBe('3rd_place')
  })

  it('builds a group external_id with PT names, phase=group, and the group letter', () => {
    const row = mapOpenfootballMatch(
      makeMatch({
        round: 'Matchday 1',
        team1: 'Mexico',
        team2: 'South Africa',
        group: 'Group A',
      })
    )
    expect(row.external_id).toBe('wc2026-A-México-África do Sul')
    expect(row.phase).toBe('group')
    expect(row.group).toBe('A')
  })
})

describe('mapOpenfootballMatch — EN→PT names & flags', () => {
  it('normalizes EN names to PT and resolves flags', () => {
    const row = mapOpenfootballMatch(
      makeMatch({ team1: 'South Korea', team2: 'Czech Republic' })
    )
    expect(row.home_team).toBe('Coreia do Sul')
    expect(row.away_team).toBe('República Tcheca')
    expect(row.home_flag).toBe('kr')
    expect(row.away_flag).toBe('cz')
  })

  it('leaves knockout placeholders as-is with null flags and does not log them', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const row = mapOpenfootballMatch(
      makeMatch({
        round: 'Round of 32',
        num: 73,
        group: undefined,
        team1: '2A',
        team2: 'W74',
      })
    )
    expect(row.home_team).toBe('2A')
    expect(row.away_team).toBe('W74')
    expect(row.home_flag).toBeNull()
    expect(row.away_flag).toBeNull()
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('logs an unmapped real team string structurally and leaves it as-is', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const row = mapOpenfootballMatch(makeMatch({ team1: 'Atlantis' }))

    expect(row.home_team).toBe('Atlantis')
    expect(row.home_flag).toBeNull()
    expect(warn).toHaveBeenCalledTimes(1)
    const logged = JSON.parse(warn.mock.calls[0][0] as string)
    expect(logged.event).toBe('ingestion_unmapped_team')
    expect(logged.team).toBe('Atlantis')
    warn.mockRestore()
  })
})

describe('mapOpenfootballMatch — pinned fixture coverage', () => {
  it('maps every group match to a known PT team, group letter, and flag', () => {
    const groups = PINNED.matches.filter((m) => m.round.startsWith('Matchday'))
    expect(groups.length).toBe(72)

    for (const m of groups) {
      const row = mapOpenfootballMatch(m)
      expect(row.phase).toBe('group')
      expect(row.group).toMatch(/^[A-L]$/)
      expect(row.external_id).toBe(
        `wc2026-${row.group}-${row.home_team}-${row.away_team}`
      )
      // Real group teams resolve to a flag.
      expect(row.home_flag).not.toBeNull()
      expect(row.away_flag).not.toBeNull()
    }
  })

  it('maps every numbered knockout match to wc2026-<num>', () => {
    const numbered = PINNED.matches.filter((m) => m.num != null)
    expect(numbered.length).toBe(30)
    for (const m of numbered) {
      const row = mapOpenfootballMatch(m)
      expect(row.external_id).toBe(`wc2026-${m.num}`)
    }
  })

  it('maps the Final and third-place matches by round', () => {
    const final = PINNED.matches.find((m) => m.round === 'Final')!
    const third = PINNED.matches.find(
      (m) => m.round === 'Match for third place'
    )!
    expect(mapOpenfootballMatch(final).external_id).toBe('wc2026-final')
    expect(mapOpenfootballMatch(third).external_id).toBe('wc2026-3rd')
  })
})

// ── fetchWorldCupFixtures ───────────────────────────────────────────────────

describe('fetchWorldCupFixtures', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    mockFetch.mockReset()
  })

  it('returns the matches array from a well-formed openfootball body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: 'World Cup 2026', matches: [makeMatch(), makeMatch()] }),
    })

    const result = await fetchWorldCupFixtures()

    expect(result).toHaveLength(2)
    expect(result[0].team1).toBe('Mexico')
  })

  it('fetches the openfootball raw URL with the preserved cache contract and no api key', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ matches: [makeMatch()] }),
    })

    await fetchWorldCupFixtures()

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toContain('raw.githubusercontent.com/openfootball')
    expect(init).toEqual({ next: { revalidate: 3600, tags: ['fixtures'] } })
    // No auth key header is sent (openfootball is a public, key-less source).
    expect(init.headers).toBeUndefined()
  })

  it('throws when fetch returns a non-ok status', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 })
    await expect(fetchWorldCupFixtures()).rejects.toThrow('429')
  })

  it('throws when the body is missing the matches array', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: 'World Cup 2026' }),
    })
    await expect(fetchWorldCupFixtures()).rejects.toThrow(/malformed/)
  })

  it('throws when the body is a non-array', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => 'not-an-object',
    })
    await expect(fetchWorldCupFixtures()).rejects.toThrow(/malformed/)
  })
})
