/**
 * @vitest-environment jsdom
 *
 * Tests for the bet completion flow in the rewritten LeagueDetailPage.
 * The bet modal is now managed by ChampionBanner and YourBetCard (not page.tsx directly).
 * This file tests the onBetComplete callback and related page-level behavior.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { useParams } from 'next/navigation'
import LeagueDetailPage from '@/app/ligas/[id]/page'

vi.mock('next/navigation')
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

vi.mock('@/components/LeagueWelcomeModal', () => ({
  default: ({ onComplete }: { onComplete: () => void }) => (
    <div data-testid="welcome-modal">
      <button data-testid="welcome-complete-btn" onClick={onComplete}>Complete Welcome</button>
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
  default: ({ has_champion_bet, onBetComplete }: { has_champion_bet: boolean; onBetComplete: () => void }) =>
    has_champion_bet ? (
      <div data-testid="your-bet-card">
        <button data-testid="your-bet-complete-btn" onClick={onBetComplete}>Update Bet</button>
      </div>
    ) : null,
}))

vi.mock('@/app/ligas/[id]/components/PrizesStrip', () => ({ default: () => null }))
vi.mock('@/app/ligas/[id]/components/StatsRow', () => ({ default: () => null }))
vi.mock('@/app/ligas/[id]/components/UpcomingMatchesCard', () => ({ default: () => null }))
vi.mock('@/app/ligas/[id]/components/RankingCard', () => ({ default: () => null }))
vi.mock('@/app/ligas/[id]/components/ScoringSchemeCard', () => ({ default: () => null }))

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  full_name: 'Test User',
  avatar_url: null,
  avatar_color: '#FFC72C',
  created_at: '2026-01-01T00:00:00Z',
}

const baseMockLeague = {
  id: 'league-123',
  name: 'Bolão Copa',
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
  user_stats: { position: 0, points: 0, guesses_made: 0, guesses_total: 0, exact_scores: 0 },
  ranking: [],
  members: [
    {
      user_id: 'user-123',
      full_name: 'Test User',
      avatar_url: null,
      avatar_color: '#FFC72C',
      role: 'admin' as const,
      joined_at: '2026-01-01T00:00:00Z',
    },
  ],
}

describe('LeagueDetailPage — bet flow', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  function makeLeagueFetch(overrides: Record<string, unknown> = {}) {
    fetchSpy.mockImplementation((url: string | Request) => {
      const urlStr = typeof url === 'string' ? url : url.url
      if (urlStr.includes('/api/auth/me') && !urlStr.includes('leagues')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: { user: mockUser } }),
        } as Response)
      }
      if (urlStr.includes('/api/leagues/league-123')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: { ...baseMockLeague, ...overrides } }),
        } as Response)
      }
      return Promise.reject(new Error(`Unexpected URL: ${urlStr}`))
    })
  }

  beforeEach(() => {
    vi.mocked(useParams as ReturnType<typeof vi.fn>).mockReturnValue({ id: 'league-123' })
    fetchSpy = vi.spyOn(global, 'fetch')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ─── ChampionBanner onBetComplete ────────────────────────────────────────────

  describe('ChampionBanner onBetComplete triggers re-fetch', () => {
    it('re-fetches league data when ChampionBanner calls onBetComplete', async () => {
      makeLeagueFetch({ has_champion_bet: false })
      render(<LeagueDetailPage />)

      await waitFor(() => expect(screen.getByTestId('champion-banner')).toBeInTheDocument())

      const before = fetchSpy.mock.calls.filter(([url]: Parameters<typeof fetch>) => {
        const u = typeof url === 'string' ? url : (url as Request).url
        return u.includes('/api/leagues/league-123') && !u.includes('/me')
      }).length

      await act(async () => {
        screen.getByTestId('bet-complete-btn').click()
      })

      await waitFor(() => {
        const after = fetchSpy.mock.calls.filter(([url]: Parameters<typeof fetch>) => {
          const u = typeof url === 'string' ? url : (url as Request).url
          return u.includes('/api/leagues/league-123') && !u.includes('/me')
        }).length
        expect(after).toBe(before + 1)
      })
    })

    it('shows YourBetCard after onBetComplete updates has_champion_bet to true', async () => {
      let callCount = 0
      fetchSpy.mockImplementation((url: string | Request) => {
        const urlStr = typeof url === 'string' ? url : url.url
        if (urlStr.includes('/api/auth/me') && !urlStr.includes('leagues')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: { user: mockUser } }),
          } as Response)
        }
        if (urlStr.includes('/api/leagues/league-123')) {
          callCount++
          const hasChampionBet = callCount > 1
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({ data: { ...baseMockLeague, has_champion_bet: hasChampionBet } }),
          } as Response)
        }
        return Promise.reject(new Error(`Unexpected URL: ${urlStr}`))
      })

      render(<LeagueDetailPage />)

      await waitFor(() => expect(screen.getByTestId('champion-banner')).toBeInTheDocument())
      expect(screen.queryByTestId('your-bet-card')).not.toBeInTheDocument()

      await act(async () => {
        screen.getByTestId('bet-complete-btn').click()
      })

      await waitFor(() => {
        expect(screen.getByTestId('your-bet-card')).toBeInTheDocument()
      })
    })
  })

  // ─── YourBetCard onBetComplete ────────────────────────────────────────────────

  describe('YourBetCard onBetComplete triggers re-fetch', () => {
    it('re-fetches league data when YourBetCard calls onBetComplete', async () => {
      makeLeagueFetch({ has_champion_bet: true })
      render(<LeagueDetailPage />)

      await waitFor(() => expect(screen.getByTestId('your-bet-card')).toBeInTheDocument())

      const before = fetchSpy.mock.calls.filter(([url]: Parameters<typeof fetch>) => {
        const u = typeof url === 'string' ? url : (url as Request).url
        return u.includes('/api/leagues/league-123') && !u.includes('/me')
      }).length

      await act(async () => {
        screen.getByTestId('your-bet-complete-btn').click()
      })

      await waitFor(() => {
        const after = fetchSpy.mock.calls.filter(([url]: Parameters<typeof fetch>) => {
          const u = typeof url === 'string' ? url : (url as Request).url
          return u.includes('/api/leagues/league-123') && !u.includes('/me')
        }).length
        expect(after).toBe(before + 1)
      })
    })
  })

  // ─── Welcome modal ────────────────────────────────────────────────────────────

  describe('Welcome modal behavior', () => {
    it('shows welcome modal when user_onboarded_at is null', async () => {
      makeLeagueFetch({ user_onboarded_at: null, has_champion_bet: false })
      render(<LeagueDetailPage />)

      await waitFor(() => expect(screen.getByTestId('welcome-modal')).toBeInTheDocument())
      // Bet modal is not managed at page level — ChampionBanner handles it
    })

    it('dismisses welcome modal on onComplete', async () => {
      makeLeagueFetch({ user_onboarded_at: null, has_champion_bet: false })
      render(<LeagueDetailPage />)

      await waitFor(() => expect(screen.getByTestId('welcome-modal')).toBeInTheDocument())

      await act(async () => {
        screen.getByTestId('welcome-complete-btn').click()
      })

      await waitFor(() => {
        expect(screen.queryByTestId('welcome-modal')).not.toBeInTheDocument()
      })
    })

    it('does not show welcome modal when already onboarded', async () => {
      makeLeagueFetch({ user_onboarded_at: '2026-05-01T00:00:00Z', has_champion_bet: false })
      render(<LeagueDetailPage />)

      await waitFor(() => expect(screen.getByTestId('champion-banner')).toBeInTheDocument())
      expect(screen.queryByTestId('welcome-modal')).not.toBeInTheDocument()
    })
  })
})
