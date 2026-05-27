import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchWorldCupFixtures } from '@/lib/football-api'
import type { ApiFootballFixture } from '@/lib/football-api'

function makeFixture(id: number): ApiFootballFixture {
  return {
    fixture: {
      id,
      date: '2026-06-14T18:00:00Z',
      venue: { name: 'MetLife Stadium', city: 'East Rutherford' },
      status: { short: 'NS' },
    },
    league: { round: 'Group Stage - 1', group: 'Group A' },
    teams: {
      home: { name: 'Brazil', logo: 'https://media.api-sports.io/flags/br.svg' },
      away: { name: 'Argentina', logo: 'https://media.api-sports.io/flags/ar.svg' },
    },
    goals: { home: null, away: null },
  }
}

describe('fetchWorldCupFixtures', () => {
  const mockFetch = vi.fn()
  const savedKey = process.env.API_FOOTBALL_KEY

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    process.env.API_FOOTBALL_KEY = 'test-key-123'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    process.env.API_FOOTBALL_KEY = savedKey
    mockFetch.mockReset()
  })

  it('returns an array of 3 fixtures with correct field mapping when fetch succeeds', async () => {
    const fixtures = [makeFixture(1), makeFixture(2), makeFixture(3)]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: fixtures }),
    })

    const result = await fetchWorldCupFixtures()

    expect(result).toHaveLength(3)
    expect(result[0].fixture.id).toBe(1)
    expect(result[1].fixture.id).toBe(2)
    expect(result[2].fixture.id).toBe(3)
    expect(result[0].teams.home.name).toBe('Brazil')
    expect(result[0].teams.away.name).toBe('Argentina')
    expect(result[0].league.group).toBe('Group A')
  })

  it('throws when fetch returns HTTP 429', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    })

    await expect(fetchWorldCupFixtures()).rejects.toThrow('429')
  })

  it('throws when response is malformed (non-array data)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: 'not-an-array' }),
    })

    await expect(fetchWorldCupFixtures()).rejects.toThrow()
  })

  it('calls fetch with x-apisports-key header equal to process.env.API_FOOTBALL_KEY', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: [makeFixture(1)] }),
    })

    await fetchWorldCupFixtures()

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-apisports-key': 'test-key-123' }),
      })
    )
  })

  it('calls fetch with next: { revalidate: 3600, tags: ["fixtures"] }', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: [makeFixture(1)] }),
    })

    await fetchWorldCupFixtures()

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        next: { revalidate: 3600, tags: ['fixtures'] },
      })
    )
  })
})
