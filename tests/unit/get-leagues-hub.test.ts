import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getLeaguesHub } from '@/lib/leagues/get-leagues-hub'

const MAIN_ID = '00000000-0000-0000-0000-000000000001'
const USER_ID = 'user-abc'

// Builds a thenable Supabase-like chain mock.
// Each call to .select() or .eq() returns the same object, keeping the chain alive.
// When awaited (or used in Promise.all), resolves to { data, error }.
function makeChain(data: unknown, error: { message: string } | null = null) {
  const result = { data, error }
  // Needs to be a real Promise so Promise.all works correctly
  const promise = Promise.resolve(result)
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  }
  return chain
}

function createMockSupabase(
  membershipsData: unknown,
  publicLeaguesData: unknown,
  membershipsError: { message: string } | null = null,
  publicLeaguesError: { message: string } | null = null
) {
  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'league_members') return makeChain(membershipsData, membershipsError)
      if (table === 'leagues') return makeChain(publicLeaguesData, publicLeaguesError)
      return makeChain([])
    }),
  }
}

function makeLeagueRecord(
  id: string,
  name: string,
  access_type: 'open' | 'private' = 'open',
  member_count = 10
) {
  return { id, name, access_type, logo_url: null, member_count }
}

function makeMembership(league: ReturnType<typeof makeLeagueRecord>, joined_at: string) {
  return { joined_at, leagues: [league] }
}

describe('getLeaguesHub', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.MAIN_LEAGUE_ID
  })

  it('returns leagues in correct tri-group order: main, private members, public non-members', async () => {
    process.env.MAIN_LEAGUE_ID = MAIN_ID

    const mainLeague = makeLeagueRecord(MAIN_ID, 'Test Bolão', 'open', 100)
    const priv1 = makeLeagueRecord('priv-1', 'Private A', 'private', 5)
    const priv2 = makeLeagueRecord('priv-2', 'Private B', 'private', 8)
    const pubA = makeLeagueRecord('pub-a', 'Public A', 'open', 50)
    const pubB = makeLeagueRecord('pub-b', 'Public B', 'open', 30)

    const memberships = [
      makeMembership(mainLeague, '2025-01-01T00:00:00Z'),
      makeMembership(priv1, '2026-01-15T00:00:00Z'),
      makeMembership(priv2, '2026-03-10T00:00:00Z'),
    ]
    // Public leagues query returns all open leagues (main + pub-a + pub-b)
    const publicLeagues = [mainLeague, pubA, pubB]

    const supabase = createMockSupabase(memberships, publicLeagues)
    const result = await getLeaguesHub(supabase as never, USER_ID)

    expect(result).toHaveLength(5)
    // Group 1: main league first
    expect(result[0].id).toBe(MAIN_ID)
    expect(result[0].is_main).toBe(true)
    // Group 2: private member leagues sorted by joined_at DESC (priv2 is more recent)
    expect(result[1].id).toBe('priv-2')
    expect(result[2].id).toBe('priv-1')
    // Group 3: public non-member leagues sorted by member_count DESC
    expect(result[3].id).toBe('pub-a') // member_count 50
    expect(result[4].id).toBe('pub-b') // member_count 30
  })

  it('places a public member league in the membership group, not the public group', async () => {
    process.env.MAIN_LEAGUE_ID = MAIN_ID

    const pubA = makeLeagueRecord('pub-a', 'Public A', 'open', 50)
    const pubB = makeLeagueRecord('pub-b', 'Public B', 'open', 30)

    // User is a member of pub-a
    const memberships = [makeMembership(pubA, '2026-02-01T00:00:00Z')]
    // Public leagues query returns both
    const publicLeagues = [pubA, pubB]

    const supabase = createMockSupabase(memberships, publicLeagues)
    const result = await getLeaguesHub(supabase as never, USER_ID)

    // pub-a should appear exactly once
    const pubAItems = result.filter((l) => l.id === 'pub-a')
    expect(pubAItems).toHaveLength(1)
    expect(pubAItems[0].is_member).toBe(true)

    // pub-b should be in the non-member group
    const pubBItems = result.filter((l) => l.id === 'pub-b')
    expect(pubBItems).toHaveLength(1)
    expect(pubBItems[0].is_member).toBe(false)

    // pub-a must come before pub-b (membership group before public group)
    const pubAIndex = result.findIndex((l) => l.id === 'pub-a')
    const pubBIndex = result.findIndex((l) => l.id === 'pub-b')
    expect(pubAIndex).toBeLessThan(pubBIndex)
  })

  it('sets is_main: true only for the league matching MAIN_LEAGUE_ID', async () => {
    process.env.MAIN_LEAGUE_ID = MAIN_ID

    const mainLeague = makeLeagueRecord(MAIN_ID, 'Test Bolão', 'open', 100)
    const other = makeLeagueRecord('other-id', 'Other League', 'open', 20)

    const memberships = [makeMembership(mainLeague, '2025-01-01T00:00:00Z')]
    const publicLeagues = [mainLeague, other]

    const supabase = createMockSupabase(memberships, publicLeagues)
    const result = await getLeaguesHub(supabase as never, USER_ID)

    const mainItems = result.filter((l) => l.is_main)
    expect(mainItems).toHaveLength(1)
    expect(mainItems[0].id).toBe(MAIN_ID)

    const nonMainItems = result.filter((l) => !l.is_main)
    expect(nonMainItems.every((l) => l.is_main === false)).toBe(true)
  })

  it('returns is_main: false for all leagues when MAIN_LEAGUE_ID is unset', async () => {
    delete process.env.MAIN_LEAGUE_ID

    const league1 = makeLeagueRecord('league-1', 'League One', 'open', 10)
    const league2 = makeLeagueRecord('league-2', 'League Two', 'open', 20)

    const memberships = [makeMembership(league1, '2026-01-01T00:00:00Z')]
    const publicLeagues = [league1, league2]

    const supabase = createMockSupabase(memberships, publicLeagues)
    const result = await getLeaguesHub(supabase as never, USER_ID)

    expect(result.length).toBeGreaterThan(0)
    expect(result.every((l) => l.is_main === false)).toBe(true)
  })

  it('logs a structured warning when MAIN_LEAGUE_ID is unset', async () => {
    delete process.env.MAIN_LEAGUE_ID

    const league = makeLeagueRecord('league-1', 'League One', 'open', 10)
    const supabase = createMockSupabase([makeMembership(league, '2026-01-01T00:00:00Z')], [league])
    await getLeaguesHub(supabase as never, USER_ID)

    expect(warnSpy).toHaveBeenCalledTimes(1)
    const warnArg = warnSpy.mock.calls[0][0] as string
    const parsed = JSON.parse(warnArg)
    expect(parsed.level).toBe('warn')
    expect(parsed.message).toMatch(/MAIN_LEAGUE_ID/)
  })

  it('logs a structured warning when zero leagues are returned', async () => {
    process.env.MAIN_LEAGUE_ID = MAIN_ID

    const supabase = createMockSupabase([], [])
    await getLeaguesHub(supabase as never, USER_ID)

    expect(warnSpy).toHaveBeenCalledTimes(1)
    const warnArg = warnSpy.mock.calls[0][0] as string
    const parsed = JSON.parse(warnArg)
    expect(parsed.level).toBe('warn')
    expect(parsed.message).toMatch(/zero leagues/)
    expect(parsed.user_id).toBe(USER_ID)
  })

  it('sorts private member leagues by joined_at DESC (most recent first)', async () => {
    process.env.MAIN_LEAGUE_ID = MAIN_ID

    const priv1 = makeLeagueRecord('priv-1', 'Oldest', 'private', 5)
    const priv2 = makeLeagueRecord('priv-2', 'Middle', 'private', 8)
    const priv3 = makeLeagueRecord('priv-3', 'Newest', 'private', 3)

    const memberships = [
      makeMembership(priv1, '2026-01-01T00:00:00Z'),
      makeMembership(priv2, '2026-02-15T00:00:00Z'),
      makeMembership(priv3, '2026-04-20T00:00:00Z'),
    ]

    const supabase = createMockSupabase(memberships, [])
    const result = await getLeaguesHub(supabase as never, USER_ID)

    expect(result).toHaveLength(3)
    expect(result[0].id).toBe('priv-3') // most recent
    expect(result[1].id).toBe('priv-2')
    expect(result[2].id).toBe('priv-1') // oldest
  })

  it('sorts public non-member leagues by member_count DESC', async () => {
    process.env.MAIN_LEAGUE_ID = MAIN_ID

    const pubA = makeLeagueRecord('pub-a', 'Small', 'open', 10)
    const pubB = makeLeagueRecord('pub-b', 'Large', 'open', 200)
    const pubC = makeLeagueRecord('pub-c', 'Medium', 'open', 75)

    const supabase = createMockSupabase([], [pubA, pubB, pubC])
    const result = await getLeaguesHub(supabase as never, USER_ID)

    expect(result).toHaveLength(3)
    expect(result[0].id).toBe('pub-b') // 200
    expect(result[1].id).toBe('pub-c') // 75
    expect(result[2].id).toBe('pub-a') // 10
  })

  it('throws when the memberships query returns an error', async () => {
    process.env.MAIN_LEAGUE_ID = MAIN_ID

    const supabase = createMockSupabase(null, [], { message: 'DB error' })
    await expect(getLeaguesHub(supabase as never, USER_ID)).rejects.toThrow('DB error')
  })

  it('throws when the public leagues query returns an error', async () => {
    process.env.MAIN_LEAGUE_ID = MAIN_ID

    const supabase = createMockSupabase([], null, null, { message: 'DB error' })
    await expect(getLeaguesHub(supabase as never, USER_ID)).rejects.toThrow('DB error')
  })

  it('handles main league not in memberships (user not yet a member of main league)', async () => {
    process.env.MAIN_LEAGUE_ID = MAIN_ID

    const mainLeague = makeLeagueRecord(MAIN_ID, 'Test Bolão', 'open', 100)
    const pubOther = makeLeagueRecord('pub-other', 'Other', 'open', 20)

    // User is not a member of any league
    const supabase = createMockSupabase([], [mainLeague, pubOther])
    const result = await getLeaguesHub(supabase as never, USER_ID)

    expect(result[0].id).toBe(MAIN_ID)
    expect(result[0].is_main).toBe(true)
    expect(result[0].is_member).toBe(false)
    expect(result[1].id).toBe('pub-other')
  })

  it('does not include joined_at in returned LeagueHubItem objects', async () => {
    process.env.MAIN_LEAGUE_ID = MAIN_ID

    const priv = makeLeagueRecord('priv-1', 'Private', 'private', 5)
    const supabase = createMockSupabase([makeMembership(priv, '2026-01-01T00:00:00Z')], [])
    const result = await getLeaguesHub(supabase as never, USER_ID)

    expect(result).toHaveLength(1)
    expect('joined_at' in result[0]).toBe(false)
  })
})
