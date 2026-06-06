/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { useParams } from 'next/navigation'
import LeagueDetailPage from '@/app/ligas/[id]/page'

vi.mock('next/navigation')
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}))

vi.mock('@/components/LeagueWelcomeModal', () => ({
  default: ({ onComplete }: { onComplete: () => void }) => (
    <div data-testid="welcome-modal">
      <button data-testid="welcome-complete-btn" onClick={onComplete}>Complete</button>
    </div>
  ),
}))

vi.mock('@/app/ligas/[id]/components/PainelSidebar', () => ({
  default: () => <div data-testid="painel-sidebar" />,
}))

vi.mock('@/app/ligas/[id]/components/PainelTopBar', () => ({
  default: () => <div data-testid="painel-topbar" />,
}))

vi.mock('@/app/ligas/[id]/components/BottomTabBar', () => ({
  default: () => <div data-testid="bottom-tab-bar" />,
}))

vi.mock('@/app/ligas/[id]/components/ChampionBanner', () => ({
  default: ({ onBetComplete }: { onBetComplete: () => void }) => (
    <div data-testid="champion-banner">
      <button data-testid="bet-complete-btn" onClick={onBetComplete}>Complete Bet</button>
    </div>
  ),
}))

vi.mock('@/app/ligas/[id]/components/YourBetCard', () => ({
  default: ({ has_champion_bet }: { has_champion_bet: boolean }) =>
    has_champion_bet ? <div data-testid="your-bet-card" /> : null,
}))

vi.mock('@/app/ligas/[id]/components/PrizesStrip', () => ({
  default: () => <div data-testid="prizes-strip" />,
}))

vi.mock('@/app/ligas/[id]/components/StatsRow', () => ({
  default: () => <div data-testid="stats-row" />,
}))

vi.mock('@/app/ligas/[id]/components/UpcomingMatchesCard', () => ({
  default: () => <div data-testid="upcoming-matches-card" />,
}))

vi.mock('@/app/ligas/[id]/components/RankingCard', () => ({
  default: () => <div data-testid="ranking-card" />,
}))

vi.mock('@/app/ligas/[id]/components/ScoringSchemeCard', () => ({
  default: () => <div data-testid="scoring-scheme-card" />,
}))

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  full_name: 'João Silva',
  avatar_url: null,
  avatar_color: '#FFC72C',
  created_at: '2026-01-01T00:00:00Z',
}

const mockLeague = {
  id: 'league-123',
  name: 'Bolão da Copa',
  description: null,
  access_type: 'private' as const,
  logo_url: null,
  role: 'admin' as const,
  member_count: 1,
  created_by: 'user-123',
  created_at: '2026-01-01T00:00:00Z',
  invite_token: 'tok-abc',
  user_onboarded_at: '2026-05-01T00:00:00Z',
  has_champion_bet: false,
  prizes: null,
  user_stats: { position: 0, points: 0, exact_scores: 0 },
  matches_played: 0,
  ranking: [],
  members: [
    {
      user_id: 'user-123',
      full_name: 'João Silva',
      avatar_url: null,
      avatar_color: '#FFC72C',
      role: 'admin' as const,
      joined_at: '2026-01-01T00:00:00Z',
    },
  ],
}

describe('LeagueDetailPage', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  function makeSuccessfulFetch(leagueOverrides: Record<string, unknown> = {}) {
    fetchSpy.mockImplementation((url: string | Request) => {
      const urlStr = typeof url === 'string' ? url : url.url
      if (urlStr.includes('/api/auth/me') && !urlStr.includes('leagues')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: { user: mockUser } }),
        } as Response)
      }
      if (urlStr.includes(`/api/leagues/${mockLeague.id}`)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: { ...mockLeague, ...leagueOverrides } }),
        } as Response)
      }
      return Promise.reject(new Error(`Unexpected URL: ${urlStr}`))
    })
  }

  beforeEach(() => {
    vi.mocked(useParams as ReturnType<typeof vi.fn>).mockReturnValue({ id: mockLeague.id })
    fetchSpy = vi.spyOn(global, 'fetch')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ─── Loading state ───────────────────────────────────────────────────────────

  describe('Loading state', () => {
    it('renders "Carregando..." while fetch is pending', () => {
      fetchSpy.mockImplementation(() => new Promise(() => {}))
      render(<LeagueDetailPage />)
      expect(screen.getByText('Carregando...')).toBeInTheDocument()
    })
  })

  // ─── Error state ─────────────────────────────────────────────────────────────

  describe('Error state', () => {
    function makeFailedLeagueFetch() {
      fetchSpy.mockImplementation((url: string | Request) => {
        const urlStr = typeof url === 'string' ? url : url.url
        if (urlStr.includes('/api/auth/me') && !urlStr.includes('leagues')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: { user: mockUser } }),
          } as Response)
        }
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Liga não encontrada' }),
        } as Response)
      })
    }

    it('renders "Voltar para Ligas" link when GET /api/leagues/[id] returns non-OK', async () => {
      makeFailedLeagueFetch()
      render(<LeagueDetailPage />)
      await waitFor(() => {
        expect(screen.getByText('Voltar para Ligas')).toBeInTheDocument()
      })
    })

    it('"Voltar para Ligas" link points to /ligas', async () => {
      makeFailedLeagueFetch()
      render(<LeagueDetailPage />)
      await waitFor(() => {
        const link = screen.getByText('Voltar para Ligas')
        expect(link.closest('a')).toHaveAttribute('href', '/ligas')
      })
    })

    it('renders error state when GET /api/auth/me returns non-OK', async () => {
      fetchSpy.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Unauthorized' }),
        } as Response),
      )
      render(<LeagueDetailPage />)
      await waitFor(() => {
        expect(screen.getByText('Voltar para Ligas')).toBeInTheDocument()
      })
    })

    it('shows fallback error message when league response has no error field', async () => {
      fetchSpy.mockImplementation((url: string | Request) => {
        const urlStr = typeof url === 'string' ? url : url.url
        if (urlStr.includes('/api/auth/me') && !urlStr.includes('leagues')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: { user: mockUser } }),
          } as Response)
        }
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({}),
        } as Response)
      })
      render(<LeagueDetailPage />)
      await waitFor(() => {
        expect(screen.getByText('Voltar para Ligas')).toBeInTheDocument()
      })
    })
  })

  // ─── Section components ──────────────────────────────────────────────────────

  describe('Section components', () => {
    it('renders ChampionBanner when has_champion_bet=false and before deadline', async () => {
      makeSuccessfulFetch({ has_champion_bet: false })
      render(<LeagueDetailPage />)
      await waitFor(() => {
        expect(screen.getByTestId('champion-banner')).toBeInTheDocument()
      })
    })

    it('renders YourBetCard when has_champion_bet=true', async () => {
      makeSuccessfulFetch({ has_champion_bet: true })
      render(<LeagueDetailPage />)
      await waitFor(() => {
        expect(screen.getByTestId('your-bet-card')).toBeInTheDocument()
      })
    })

    it('does NOT render YourBetCard when has_champion_bet=false', async () => {
      makeSuccessfulFetch({ has_champion_bet: false })
      render(<LeagueDetailPage />)
      await waitFor(() => {
        expect(screen.getByTestId('champion-banner')).toBeInTheDocument()
      })
      expect(screen.queryByTestId('your-bet-card')).not.toBeInTheDocument()
    })

    it('renders StatsRow, UpcomingMatchesCard, RankingCard, ScoringSchemeCard', async () => {
      makeSuccessfulFetch()
      render(<LeagueDetailPage />)
      await waitFor(() => {
        expect(screen.getByTestId('stats-row')).toBeInTheDocument()
        expect(screen.getByTestId('upcoming-matches-card')).toBeInTheDocument()
        expect(screen.getByTestId('ranking-card')).toBeInTheDocument()
        expect(screen.getByTestId('scoring-scheme-card')).toBeInTheDocument()
      })
    })

    it('greeting falls back to "Você" when full_name is null', async () => {
      const nullNameUser = { ...mockUser, full_name: null }
      fetchSpy.mockImplementation((url: string | Request) => {
        const urlStr = typeof url === 'string' ? url : url.url
        if (urlStr.includes('/api/auth/me') && !urlStr.includes('leagues')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: { user: nullNameUser } }),
          } as Response)
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockLeague }),
        } as Response)
      })
      render(<LeagueDetailPage />)
      await waitFor(() => {
        expect(screen.getByText(/Olá, Você!/)).toBeInTheDocument()
      })
    })
  })

  // ─── onBetComplete re-fetch ──────────────────────────────────────────────────

  describe('onBetComplete callback', () => {
    it('re-fetches GET /api/leagues/[id] after onBetComplete fires', async () => {
      makeSuccessfulFetch()
      render(<LeagueDetailPage />)

      await waitFor(() => {
        expect(screen.getByTestId('champion-banner')).toBeInTheDocument()
      })

      const leagueFetchCountBefore = fetchSpy.mock.calls.filter(([url]: [string | Request]) => {
        const u = typeof url === 'string' ? url : (url as Request).url
        return u.includes(`/api/leagues/${mockLeague.id}`) && !u.includes('me')
      }).length

      await act(async () => {
        screen.getByTestId('bet-complete-btn').click()
      })

      await waitFor(() => {
        const leagueFetchCountAfter = fetchSpy.mock.calls.filter(([url]: [string | Request]) => {
          const u = typeof url === 'string' ? url : (url as Request).url
          return u.includes(`/api/leagues/${mockLeague.id}`) && !u.includes('me')
        }).length
        expect(leagueFetchCountAfter).toBe(leagueFetchCountBefore + 1)
      })
    })
  })

  // ─── Responsive layout containers ────────────────────────────────────────────

  describe('Responsive layout containers', () => {
    it('PainelSidebar container has class "hidden lg:flex"', async () => {
      makeSuccessfulFetch()
      render(<LeagueDetailPage />)
      await waitFor(() => {
        expect(screen.getByTestId('painel-sidebar')).toBeInTheDocument()
      })
      const container = screen.getByTestId('painel-sidebar').parentElement
      expect(container?.className).toContain('hidden')
      expect(container?.className).toContain('lg:flex')
    })

    it('BottomTabBar container has class "flex lg:hidden"', async () => {
      makeSuccessfulFetch()
      render(<LeagueDetailPage />)
      await waitFor(() => {
        expect(screen.getByTestId('bottom-tab-bar')).toBeInTheDocument()
      })
      const container = screen.getByTestId('bottom-tab-bar').parentElement
      expect(container?.className).toContain('flex')
      expect(container?.className).toContain('lg:hidden')
    })

    it('PainelTopBar container has class "flex lg:hidden"', async () => {
      makeSuccessfulFetch()
      render(<LeagueDetailPage />)
      await waitFor(() => {
        expect(screen.getByTestId('painel-topbar')).toBeInTheDocument()
      })
      const container = screen.getByTestId('painel-topbar').parentElement
      expect(container?.className).toContain('flex')
      expect(container?.className).toContain('lg:hidden')
    })
  })

  // ─── Admin features absent ───────────────────────────────────────────────────

  describe('Admin features absent', () => {
    it('does not render "Configurar" button', async () => {
      makeSuccessfulFetch()
      render(<LeagueDetailPage />)
      await waitFor(() => {
        expect(screen.getByTestId('champion-banner')).toBeInTheDocument()
      })
      expect(screen.queryByText('Configurar')).not.toBeInTheDocument()
      expect(screen.queryByText('Configurações')).not.toBeInTheDocument()
    })

    it('does not render "Remover membro" or "Remover" button', async () => {
      makeSuccessfulFetch()
      render(<LeagueDetailPage />)
      await waitFor(() => {
        expect(screen.getByTestId('champion-banner')).toBeInTheDocument()
      })
      expect(screen.queryByText('Remover membro')).not.toBeInTheDocument()
      expect(screen.queryByText('Remover')).not.toBeInTheDocument()
    })

    it('does not render "Excluir liga" or "Excluir Liga" button', async () => {
      makeSuccessfulFetch()
      render(<LeagueDetailPage />)
      await waitFor(() => {
        expect(screen.getByTestId('champion-banner')).toBeInTheDocument()
      })
      expect(screen.queryByText('Excluir liga')).not.toBeInTheDocument()
      expect(screen.queryByText('Excluir Liga')).not.toBeInTheDocument()
    })
  })

  // ─── Welcome modal ────────────────────────────────────────────────────────────

  describe('Welcome modal', () => {
    it('shows welcome modal when user_onboarded_at is null', async () => {
      makeSuccessfulFetch({ user_onboarded_at: null })
      render(<LeagueDetailPage />)
      await waitFor(() => {
        expect(screen.getByTestId('welcome-modal')).toBeInTheDocument()
      })
    })

    it('does not show welcome modal when user_onboarded_at is set', async () => {
      makeSuccessfulFetch({ user_onboarded_at: '2026-05-01T00:00:00Z' })
      render(<LeagueDetailPage />)
      await waitFor(() => {
        expect(screen.getByTestId('champion-banner')).toBeInTheDocument()
      })
      expect(screen.queryByTestId('welcome-modal')).not.toBeInTheDocument()
    })

    it('dismisses welcome modal on onComplete without re-fetching league', async () => {
      makeSuccessfulFetch({ user_onboarded_at: null })
      render(<LeagueDetailPage />)

      await waitFor(() => {
        expect(screen.getByTestId('welcome-modal')).toBeInTheDocument()
      })

      const leagueFetchCountBefore = fetchSpy.mock.calls.filter(([url]: Parameters<typeof fetch>) => {
        const u = typeof url === 'string' ? url : (url as Request).url
        return u.includes(`/api/leagues/${mockLeague.id}`) && !u.includes('me')
      }).length

      await act(async () => {
        screen.getByTestId('welcome-complete-btn').click()
      })

      await waitFor(() => {
        expect(screen.queryByTestId('welcome-modal')).not.toBeInTheDocument()
      })

      // League data not re-fetched (PATCH to /me is fire-and-forget)
      const leagueFetchCountAfter = fetchSpy.mock.calls.filter(([url]: Parameters<typeof fetch>) => {
        const u = typeof url === 'string' ? url : (url as Request).url
        return u.includes(`/api/leagues/${mockLeague.id}`) && !u.includes('me')
      }).length
      expect(leagueFetchCountAfter).toBe(leagueFetchCountBefore)
    })
  })
})
