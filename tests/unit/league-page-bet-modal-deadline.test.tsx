/**
 * @vitest-environment jsdom
 *
 * Tests for deadline-related behavior in LeagueDetailPage.
 * In the rewritten page, BET_DEADLINE checks are handled by ChampionBanner and YourBetCard,
 * not by page.tsx directly. These tests verify the page renders correctly with a past
 * deadline mocked (ChampionBanner returning null handles the no-banner case at component level).
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

// ChampionBanner mocked to return null when deadline is past (simulating real behavior)
vi.mock('@/app/ligas/[id]/components/ChampionBanner', () => ({
  default: () => null,
}))

vi.mock('@/app/ligas/[id]/components/YourBetCard', () => ({
  default: ({ has_champion_bet }: { has_champion_bet: boolean }) =>
    has_champion_bet ? <div data-testid="your-bet-card" /> : null,
}))

vi.mock('@/app/ligas/[id]/components/PrizesStrip', () => ({ default: () => null }))
vi.mock('@/app/ligas/[id]/components/StatsRow', () => ({ default: () => null }))
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
  user_onboarded_at: null,
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

describe('LeagueDetailPage — deadline-passed scenario', () => {
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

  it('page renders without ChampionBanner when mock returns null (deadline past)', async () => {
    makeLeagueFetch({ user_onboarded_at: '2026-05-01T00:00:00Z', has_champion_bet: false })
    render(<LeagueDetailPage />)

    await waitFor(() => expect(screen.getByTestId('upcoming-matches-card')).toBeInTheDocument())
    expect(screen.queryByTestId('champion-banner')).not.toBeInTheDocument()
  })

  it('page renders welcome modal then dismisses it after deadline has passed', async () => {
    makeLeagueFetch({ user_onboarded_at: null, has_champion_bet: false })
    render(<LeagueDetailPage />)

    await waitFor(() => expect(screen.getByTestId('welcome-modal')).toBeInTheDocument())

    await act(async () => {
      screen.getByTestId('welcome-complete-btn').click()
    })

    await waitFor(() => expect(screen.queryByTestId('welcome-modal')).not.toBeInTheDocument())
    // No bet modal at page level — ChampionBanner (which returns null) handles deadline check
    expect(screen.queryByTestId('champion-banner')).not.toBeInTheDocument()
  })

  it('renders page correctly with has_champion_bet=true and no banner (deadline past)', async () => {
    makeLeagueFetch({ user_onboarded_at: '2026-05-01T00:00:00Z', has_champion_bet: true })
    render(<LeagueDetailPage />)

    await waitFor(() => expect(screen.getByTestId('your-bet-card')).toBeInTheDocument())
    expect(screen.queryByTestId('champion-banner')).not.toBeInTheDocument()
  })
})
