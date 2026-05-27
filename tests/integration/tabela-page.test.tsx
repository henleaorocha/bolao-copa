/**
 * @vitest-environment jsdom
 *
 * Integration tests for app/ligas/[id]/tabela/page.tsx.
 * Mocks getSupabaseServerClient to control auth + membership + match data.
 * Mocks next/navigation redirect to verify guard behaviour.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Match } from '@/lib/api/types'

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseServerClient: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn().mockImplementation((path: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { redirectPath: path })
  }),
}))

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}))

import TabelaPage from '@/app/ligas/[id]/tabela/page'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { redirect } from 'next/navigation'

const LEAGUE_ID = 'league-tabela-test'
const MOCK_USER = { id: 'user-tabela-test' }

const ALL_GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

function makeMatch(overrides: Partial<Match>): Match {
  return {
    id: `match-${Math.random().toString(36).slice(2)}`,
    external_id: null,
    home_team: 'TeamA',
    away_team: 'TeamB',
    home_flag: null,
    away_flag: null,
    match_date: '2026-06-15T14:00:00Z',
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

function makeAllGroupMatches(): Match[] {
  return ALL_GROUPS.flatMap((group) => [
    makeMatch({ group, home_team: `${group}Team1`, away_team: `${group}Team2`, home_flag: null, away_flag: null }),
    makeMatch({ group, home_team: `${group}Team3`, away_team: `${group}Team4`, home_flag: null, away_flag: null }),
    makeMatch({ group, home_team: `${group}Team1`, away_team: `${group}Team3`, home_flag: null, away_flag: null }),
    makeMatch({ group, home_team: `${group}Team2`, away_team: `${group}Team4`, home_flag: null, away_flag: null }),
    makeMatch({ group, home_team: `${group}Team1`, away_team: `${group}Team4`, home_flag: null, away_flag: null }),
    makeMatch({ group, home_team: `${group}Team2`, away_team: `${group}Team3`, home_flag: null, away_flag: null }),
  ])
}

function makeChainableQuery<T>(result: { data: T; error: unknown }) {
  const q: Record<string, unknown> = {}
  const methods = ['select', 'order', 'eq', 'neq', 'gte', 'gt', 'lte', 'lt', 'limit', 'in', 'is', 'filter']
  for (const method of methods) {
    q[method] = vi.fn(() => q)
  }
  const promise = Promise.resolve(result)
  q.then = promise.then.bind(promise)
  q.catch = promise.catch.bind(promise)
  return q
}

function makeSupabase({
  user = MOCK_USER as typeof MOCK_USER | null,
  authError = null as unknown,
  leagueResult = { data: { id: LEAGUE_ID }, error: null } as { data: unknown; error: unknown },
  membershipResult = { data: { role: 'member' }, error: null } as { data: unknown; error: unknown },
  matchesResult = { data: makeAllGroupMatches(), error: null } as { data: unknown; error: unknown },
} = {}) {
  const matchesQuery = makeChainableQuery(matchesResult)

  const from = vi.fn((table: string) => {
    if (table === 'leagues') {
      const single = vi.fn().mockResolvedValue(leagueResult)
      const eq = vi.fn(() => ({ single }))
      const select = vi.fn(() => ({ eq }))
      return { select }
    }

    if (table === 'league_members') {
      const single = vi.fn().mockResolvedValue(membershipResult)
      const eq2 = vi.fn(() => ({ single }))
      const eq1 = vi.fn(() => ({ eq: eq2 }))
      const select = vi.fn(() => ({ eq: eq1 }))
      return { select }
    }

    if (table === 'matches') {
      return matchesQuery
    }

    return makeChainableQuery({ data: null, error: null })
  })

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: authError,
      }),
    },
    from,
  }
}

function makeParams(id = LEAGUE_ID): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

describe('TabelaPage — integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders 12 group cards in A→L order', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)

    const jsx = await TabelaPage(makeParams())
    render(jsx)

    ALL_GROUPS.forEach((letter) => {
      expect(screen.getByTestId(`group-card-${letter}`)).toBeInTheDocument()
    })

    const grid = screen.getByTestId('standings-grid')
    const cardElements = grid.querySelectorAll('[data-testid^="group-card-"]')
    const cardLetters = Array.from(cardElements).map((el) =>
      el.getAttribute('data-testid')?.replace('group-card-', '')
    )
    expect(cardLetters).toEqual(ALL_GROUPS)
  })

  it('renders the page header copy', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)

    const jsx = await TabelaPage(makeParams())
    render(jsx)

    expect(screen.getByText('FASE DE GRUPOS')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tabela da Copa' })).toBeInTheDocument()
    expect(screen.getByText('Classificação oficial — 12 grupos, 48 seleções')).toBeInTheDocument()
  })

  it('group with finished matches renders teams sorted correctly with positions 1–2 qualifying', async () => {
    const finishedMatches: Match[] = [
      // Brasil beat Argentina 2-1
      makeMatch({
        group: 'A',
        home_team: 'Brasil',
        away_team: 'Argentina',
        home_flag: 'br',
        away_flag: 'ar',
        status: 'finished',
        home_score: 2,
        away_score: 1,
      }),
      // USA beat Mexico 1-0
      makeMatch({
        group: 'A',
        home_team: 'USA',
        away_team: 'Mexico',
        home_flag: 'us',
        away_flag: 'mx',
        status: 'finished',
        home_score: 1,
        away_score: 0,
      }),
      // Scheduled matches to register all 4 teams
      makeMatch({ group: 'A', home_team: 'Brasil', away_team: 'USA', status: 'scheduled' }),
      makeMatch({ group: 'A', home_team: 'Argentina', away_team: 'Mexico', status: 'scheduled' }),
    ]

    // Add scheduled-only matches for the other 11 groups so all 12 appear
    const otherGroupMatches = ALL_GROUPS.filter((g) => g !== 'A').flatMap((group) => [
      makeMatch({ group, home_team: `${group}T1`, away_team: `${group}T2` }),
      makeMatch({ group, home_team: `${group}T3`, away_team: `${group}T4` }),
      makeMatch({ group, home_team: `${group}T1`, away_team: `${group}T3` }),
      makeMatch({ group, home_team: `${group}T2`, away_team: `${group}T4` }),
    ])

    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ matchesResult: { data: [...finishedMatches, ...otherGroupMatches], error: null } }) as never
    )

    const jsx = await TabelaPage(makeParams())
    render(jsx)

    const groupACard = screen.getByTestId('group-card-A')
    const rows = groupACard.querySelectorAll('[data-testid="standings-row"]')

    expect(rows).toHaveLength(4)

    // Row 0 and 1 must be qualifying (Brasil 3pts, USA 3pts — Brasil first by GP)
    expect(rows[0]).toHaveAttribute('data-qualifying', 'true')
    expect(rows[1]).toHaveAttribute('data-qualifying', 'true')
    expect(rows[2]).toHaveAttribute('data-qualifying', 'false')
    expect(rows[3]).toHaveAttribute('data-qualifying', 'false')

    // Brasil (3pts, GP2) should be position 1
    expect(rows[0].querySelector('[data-testid="col-team"]')?.textContent).toBe('Brasil')
    // USA (3pts, GP1) should be position 2
    expect(rows[1].querySelector('[data-testid="col-team"]')?.textContent).toBe('USA')
  })

  it('GP/GC columns have hidden class while SG does not (mobile breakpoint)', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)

    const jsx = await TabelaPage(makeParams())
    render(jsx)

    const gpCols = screen.getAllByTestId('col-gp')
    const gcCols = screen.getAllByTestId('col-gc')
    const sgCols = screen.getAllByTestId('col-sg')

    gpCols.forEach((el) => expect(el.className).toContain('hidden'))
    gcCols.forEach((el) => expect(el.className).toContain('hidden'))
    sgCols.forEach((el) => expect(el.className).not.toContain('hidden'))
  })

  it('redirects unauthenticated user to /ligas', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ user: null, authError: { message: 'No session' } }) as never
    )

    await expect(TabelaPage(makeParams())).rejects.toThrow('NEXT_REDIRECT')
    expect(vi.mocked(redirect)).toHaveBeenCalledWith('/ligas')
  })

  it('redirects non-member to /ligas', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        membershipResult: { data: null, error: { message: 'Not a member' } },
      }) as never
    )

    await expect(TabelaPage(makeParams())).rejects.toThrow('NEXT_REDIRECT')
    expect(vi.mocked(redirect)).toHaveBeenCalledWith('/ligas')
  })

  it('redirects when league does not exist', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({
        leagueResult: { data: null, error: { message: 'Not found' } },
      }) as never
    )

    await expect(TabelaPage(makeParams())).rejects.toThrow('NEXT_REDIRECT')
    expect(vi.mocked(redirect)).toHaveBeenCalledWith('/ligas')
  })

  it('renders empty standings without throwing when matches table returns empty', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ matchesResult: { data: [], error: null } }) as never
    )

    const jsx = await TabelaPage(makeParams())
    render(jsx)

    // With no matches, StandingsGrid renders with no group cards
    expect(screen.getByTestId('standings-grid')).toBeInTheDocument()
    expect(screen.queryByTestId('group-card-A')).not.toBeInTheDocument()
  })
})
