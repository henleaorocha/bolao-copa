/**
 * @vitest-environment jsdom
 *
 * Unit and integration tests for the Ranking page — fetch-on-mount and screen composition.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { useParams } from 'next/navigation'
import { useLeaguePanel } from '@/app/ligas/[id]/league-panel-context'
import type { RankingFullEntry, AuthUser, LeagueDetail } from '@/lib/api/types'

vi.mock('next/navigation')
vi.mock('@/app/ligas/[id]/league-panel-context', () => ({
  useLeaguePanel: vi.fn(),
}))
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
    ...rest
  }: {
    href: string
    children: React.ReactNode
    className?: string
    [key: string]: unknown
  }) => (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  ),
}))

const LEAGUE_ID = 'test-league'

function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'user-1',
    email: 'ana@example.com',
    full_name: 'Ana Silva',
    avatar_url: null,
    avatar_color: '#FF5733',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeLeague(overrides: Partial<LeagueDetail> = {}): LeagueDetail {
  return {
    id: LEAGUE_ID,
    name: 'Bolão da Família',
    access_type: 'open',
    logo_url: null,
    role: 'member',
    member_count: 3,
    description: null,
    created_by: 'user-1',
    created_at: '2024-01-01T00:00:00Z',
    invite_token: 'abc123',
    user_onboarded_at: null,
    members: [],
    has_champion_bet: false,
    champion_bet: null,
    prizes: null,
    user_stats: {
      position: 1,
      points: 100,
      guesses_made: 5,
      guesses_total: 10,
      exact_scores: 2,
    },
    ranking: [],
    ...overrides,
  }
}

function makeEntry(overrides: Partial<RankingFullEntry> = {}): RankingFullEntry {
  return {
    user_id: 'user-1',
    full_name: 'Ana Silva',
    avatar_color: '#FF5733',
    points: 100,
    position: 1,
    exact_scores: 3,
    correct_outcomes: 8,
    ...overrides,
  }
}

const SAMPLE_RANKING: RankingFullEntry[] = [
  makeEntry({ user_id: 'user-1', full_name: 'Ana Silva', position: 1, points: 100 }),
  makeEntry({
    user_id: 'user-2',
    full_name: 'Bruno Costa',
    position: 2,
    points: 80,
    avatar_color: '#33C1FF',
    exact_scores: 2,
    correct_outcomes: 6,
  }),
  makeEntry({
    user_id: 'user-3',
    full_name: 'Carla Rocha',
    position: 3,
    points: 60,
    avatar_color: '#6BFF33',
    exact_scores: 1,
    correct_outcomes: 4,
  }),
]

function buildDefaultCtx() {
  return {
    currentUser: makeUser(),
    league: makeLeague({ prizes: null }),
    isLoading: false,
    error: null,
    refetchLeague: vi.fn(),
    mataMataUnlock: null,
    setMataMataUnlock: vi.fn(),
  }
}

function mockRankingFetch(ranking: RankingFullEntry[] = SAMPLE_RANKING) {
  vi.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: true,
    json: () =>
      Promise.resolve({
        status: 'success',
        data: { ranking },
        timestamp: '',
      }),
  } as Response)
}

async function importRankingPage() {
  const m = await import('@/app/ligas/[id]/ranking/page')
  return m.default
}

// ── Loading state ─────────────────────────────────────────────────────────────

describe('RankingPage — loading state', () => {
  beforeEach(() => {
    vi.mocked(useParams as ReturnType<typeof vi.fn>).mockReturnValue({ id: LEAGUE_ID })
    vi.mocked(useLeaguePanel).mockReturnValue(buildDefaultCtx())
  })
  afterEach(() => vi.restoreAllMocks())

  it('shows loading indicator while fetch is pending', async () => {
    vi.spyOn(global, 'fetch').mockReturnValue(new Promise(() => {}))
    const RankingPage = await importRankingPage()
    render(<RankingPage />)

    expect(screen.getByTestId('loading-state')).toBeInTheDocument()
    expect(screen.queryByTestId('podium-section')).not.toBeInTheDocument()
  })

  it('hides loading indicator and renders the composed screen after fetch resolves', async () => {
    mockRankingFetch()
    const RankingPage = await importRankingPage()
    render(<RankingPage />)

    await waitFor(() =>
      expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument()
    )
    expect(screen.getByTestId('podium-section')).toBeInTheDocument()
  })
})

// ── Error state ───────────────────────────────────────────────────────────────

describe('RankingPage — error state', () => {
  beforeEach(() => {
    vi.mocked(useParams as ReturnType<typeof vi.fn>).mockReturnValue({ id: LEAGUE_ID })
    vi.mocked(useLeaguePanel).mockReturnValue(buildDefaultCtx())
  })
  afterEach(() => vi.restoreAllMocks())

  it('shows error message when fetch rejects with a non-AbortError', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network Error'))
    const RankingPage = await importRankingPage()
    render(<RankingPage />)

    await waitFor(() =>
      expect(screen.getByTestId('error-state')).toBeInTheDocument()
    )
    expect(screen.queryByTestId('podium-section')).not.toBeInTheDocument()
  })

  it('does not show error state for an AbortError', async () => {
    const abortErr = new Error('Aborted')
    abortErr.name = 'AbortError'
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(abortErr)
    const RankingPage = await importRankingPage()
    render(<RankingPage />)

    // AbortError keeps the loading state rather than showing an error
    await waitFor(() => {
      expect(screen.queryByTestId('error-state')).not.toBeInTheDocument()
    })
    expect(screen.getByTestId('loading-state')).toBeInTheDocument()
  })
})

// ── Composition order ─────────────────────────────────────────────────────────

describe('RankingPage — composition order', () => {
  beforeEach(() => {
    vi.mocked(useParams as ReturnType<typeof vi.fn>).mockReturnValue({ id: LEAGUE_ID })
    vi.mocked(useLeaguePanel).mockReturnValue(buildDefaultCtx())
  })
  afterEach(() => vi.restoreAllMocks())

  it('renders Podium before sua-posicao-card, which is before the RankingTable', async () => {
    mockRankingFetch()
    const RankingPage = await importRankingPage()
    render(<RankingPage />)

    await waitFor(() =>
      expect(screen.getByTestId('podium-section')).toBeInTheDocument()
    )

    const podiumSection = screen.getByTestId('podium-section')
    const suaPosicaoCard = screen.getByTestId('sua-posicao-card')
    const table = screen.getByRole('table')

    const elements = Array.from(
      document.body.querySelectorAll(
        '[data-testid="podium-section"], [data-testid="sua-posicao-card"], table'
      )
    )

    expect(elements.indexOf(podiumSection)).toBeLessThan(
      elements.indexOf(suaPosicaoCard)
    )
    expect(elements.indexOf(suaPosicaoCard)).toBeLessThan(
      elements.indexOf(table)
    )
  })
})

// ── PrizesStrip conditional rendering ────────────────────────────────────────

describe('RankingPage — PrizesStrip', () => {
  beforeEach(() => {
    vi.mocked(useParams as ReturnType<typeof vi.fn>).mockReturnValue({ id: LEAGUE_ID })
  })
  afterEach(() => vi.restoreAllMocks())

  it('renders PrizesStrip when league.prizes is set', async () => {
    vi.mocked(useLeaguePanel).mockReturnValue({
      ...buildDefaultCtx(),
      league: makeLeague({ prizes: '1º: R$ 500' }),
    })
    mockRankingFetch()
    const RankingPage = await importRankingPage()
    render(<RankingPage />)

    await waitFor(() =>
      expect(screen.getByText('Premiação')).toBeInTheDocument()
    )
    expect(screen.getByText('1º: R$ 500')).toBeInTheDocument()
  })

  it('does not render PrizesStrip when league.prizes is null', async () => {
    vi.mocked(useLeaguePanel).mockReturnValue({
      ...buildDefaultCtx(),
      league: makeLeague({ prizes: null }),
    })
    mockRankingFetch()
    const RankingPage = await importRankingPage()
    render(<RankingPage />)

    await waitFor(() =>
      expect(screen.getByTestId('podium-section')).toBeInTheDocument()
    )
    expect(screen.queryByText('Premiação')).not.toBeInTheDocument()
  })
})

// ── Sua posição card ─────────────────────────────────────────────────────────

describe('RankingPage — Sua posição card', () => {
  beforeEach(() => {
    vi.mocked(useParams as ReturnType<typeof vi.fn>).mockReturnValue({ id: LEAGUE_ID })
  })
  afterEach(() => vi.restoreAllMocks())

  it('shows rank, full name, points, and exact-score count for the current user', async () => {
    vi.mocked(useLeaguePanel).mockReturnValue({
      ...buildDefaultCtx(),
      currentUser: makeUser({ id: 'user-1', full_name: 'Ana Silva' }),
    })
    mockRankingFetch(SAMPLE_RANKING)
    const RankingPage = await importRankingPage()
    render(<RankingPage />)

    await waitFor(() =>
      expect(screen.getByTestId('sua-posicao-card')).toBeInTheDocument()
    )

    expect(screen.getByTestId('sua-posicao-rank')).toHaveTextContent('1º')
    expect(screen.getByTestId('sua-posicao-name')).toHaveTextContent('Ana Silva')
    expect(screen.getByTestId('sua-posicao-points')).toHaveTextContent('100')
    expect(screen.getByTestId('sua-posicao-exatos')).toHaveTextContent('3 exatos')
  })

  it('hides the card when the current user is not in the ranking', async () => {
    vi.mocked(useLeaguePanel).mockReturnValue({
      ...buildDefaultCtx(),
      currentUser: makeUser({ id: 'user-999' }),
    })
    mockRankingFetch(SAMPLE_RANKING)
    const RankingPage = await importRankingPage()
    render(<RankingPage />)

    await waitFor(() =>
      expect(screen.getByTestId('podium-section')).toBeInTheDocument()
    )
    expect(screen.queryByTestId('sua-posicao-card')).not.toBeInTheDocument()
  })

  it('hides the card when currentUser is null', async () => {
    vi.mocked(useLeaguePanel).mockReturnValue({
      ...buildDefaultCtx(),
      currentUser: null,
    })
    mockRankingFetch(SAMPLE_RANKING)
    const RankingPage = await importRankingPage()
    render(<RankingPage />)

    await waitFor(() =>
      expect(screen.getByTestId('podium-section')).toBeInTheDocument()
    )
    expect(screen.queryByTestId('sua-posicao-card')).not.toBeInTheDocument()
  })
})

// ── Integration: full member list ─────────────────────────────────────────────

describe('RankingPage — integration: full member list', () => {
  beforeEach(() => {
    vi.mocked(useParams as ReturnType<typeof vi.fn>).mockReturnValue({ id: LEAGUE_ID })
    vi.mocked(useLeaguePanel).mockReturnValue(buildDefaultCtx())
  })
  afterEach(() => vi.restoreAllMocks())

  it('renders every member from data.ranking in the classification table', async () => {
    const ranking: RankingFullEntry[] = [
      makeEntry({ user_id: 'user-1', full_name: 'Ana Silva', position: 1, points: 100 }),
      makeEntry({
        user_id: 'user-2',
        full_name: 'Bruno Costa',
        position: 2,
        points: 80,
        avatar_color: '#33C1FF',
      }),
      makeEntry({
        user_id: 'user-3',
        full_name: 'Carla Rocha',
        position: 3,
        points: 60,
        avatar_color: '#6BFF33',
      }),
      makeEntry({
        user_id: 'user-4',
        full_name: 'Diego Lima',
        position: 4,
        points: 40,
        avatar_color: '#FF33B5',
      }),
    ]
    mockRankingFetch(ranking)
    const RankingPage = await importRankingPage()
    render(<RankingPage />)

    await waitFor(() =>
      expect(screen.getByText('Bruno Costa')).toBeInTheDocument()
    )
    expect(screen.getByText('Carla Rocha')).toBeInTheDocument()
    expect(screen.getByText('Diego Lima')).toBeInTheDocument()

    const rows = screen.getAllByTestId(/^(self|member)-row$/)
    expect(rows).toHaveLength(4)
  })

  it('shows the player count subtitle with the correct number', async () => {
    mockRankingFetch(SAMPLE_RANKING)
    const RankingPage = await importRankingPage()
    render(<RankingPage />)

    await waitFor(() =>
      expect(screen.getByTestId('player-count-subtitle')).toBeInTheDocument()
    )
    expect(screen.getByTestId('player-count-subtitle')).toHaveTextContent(
      '3 jogadores'
    )
  })

  it('shows "jogador" (singular) when ranking has exactly 1 member', async () => {
    mockRankingFetch([makeEntry({ user_id: 'user-1', position: 1, points: 0 })])
    const RankingPage = await importRankingPage()
    render(<RankingPage />)

    await waitFor(() =>
      expect(screen.getByTestId('player-count-subtitle')).toBeInTheDocument()
    )
    expect(screen.getByTestId('player-count-subtitle')).toHaveTextContent(
      '1 jogador'
    )
  })
})
