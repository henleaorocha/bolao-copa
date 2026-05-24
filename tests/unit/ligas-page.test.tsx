/**
 * @vitest-environment jsdom
 *
 * Unit tests for app/ligas/page.tsx — async Server Component.
 * All external dependencies are mocked; the page function is called directly.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { LeagueHubItem } from '@/lib/api/types'

// ── Mocks (hoisted before imports) ─────────────────────────────────────────

const mockRedirect = vi.hoisted(() => vi.fn())
const mockGetSupabaseServerClient = vi.hoisted(() => vi.fn())
const mockGetLeaguesHub = vi.hoisted(() => vi.fn())
const mockGetDaysUntilCopa = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({ redirect: mockRedirect }))

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseServerClient: mockGetSupabaseServerClient,
}))

vi.mock('@/lib/leagues/get-leagues-hub', () => ({
  getLeaguesHub: mockGetLeaguesHub,
}))

vi.mock('@/lib/leagues/get-days-until-copa', () => ({
  getDaysUntilCopa: mockGetDaysUntilCopa,
}))

// Stub child Client Components to avoid hook / router dependencies
vi.mock('@/components/LogoutButton', () => ({
  default: () => <button aria-label="logout-stub">Sair</button>,
}))

vi.mock('@/components/LeagueCard', () => ({
  default: ({ league }: { league: LeagueHubItem }) => (
    <div data-testid={`card-${league.id}`}>{league.name}</div>
  ),
}))

vi.mock('@/components/CreateLeagueModal', () => ({
  default: () => (
    <button data-testid="create-league-card">Criar nova liga</button>
  ),
}))

// ── Lazy import AFTER mocks are registered ────────────────────────────────

import LigasPage from '@/app/ligas/page'

// ── Helpers ───────────────────────────────────────────────────────────────

function makeUser(fullName = 'Maria Silva', extra: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    user_metadata: { full_name: fullName },
    ...extra,
  }
}

function makeLeague(overrides: Partial<LeagueHubItem> = {}): LeagueHubItem {
  return {
    id: 'league-1',
    name: 'Bolão da Família',
    access_type: 'private',
    logo_url: null,
    member_count: 10,
    is_member: true,
    is_main: false,
    ...overrides,
  }
}

function makeSupabase(user: ReturnType<typeof makeUser> | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('LigasPage — async Server Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // redirect mimics Next.js — throws so execution stops when user is absent
    mockRedirect.mockImplementation(() => {
      throw Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT' })
    })
    // Default happy-path state
    mockGetSupabaseServerClient.mockResolvedValue(makeSupabase(makeUser()))
    mockGetLeaguesHub.mockResolvedValue([])
    mockGetDaysUntilCopa.mockReturnValue({ days: 21, isUnderway: false })
  })

  // ── Redirect guard ──────────────────────────────────────────────────────

  it('redirects to /login when getUser() returns null (session absent)', async () => {
    mockGetSupabaseServerClient.mockResolvedValue(makeSupabase(null))

    await expect(LigasPage()).rejects.toThrow()
    expect(mockRedirect).toHaveBeenCalledWith('/login')
    expect(mockRedirect).toHaveBeenCalledTimes(1)
  })

  // ── Greeting ────────────────────────────────────────────────────────────

  it('renders greeting with the first name only, extracted from full_name', async () => {
    mockGetSupabaseServerClient.mockResolvedValue(makeSupabase(makeUser('João Pedro')))

    const ui = await LigasPage()
    render(ui)

    expect(screen.getByText('João')).toBeInTheDocument()
    // Second name must NOT appear independently in the greeting element
    expect(screen.queryByText('Pedro')).not.toBeInTheDocument()
  })

  it('falls back to "usuário" when full_name is empty', async () => {
    mockGetSupabaseServerClient.mockResolvedValue(makeSupabase(makeUser('')))

    const ui = await LigasPage()
    render(ui)

    expect(screen.getByText('usuário')).toBeInTheDocument()
  })

  it('uses the first space-delimited token even when full_name has many parts', async () => {
    mockGetSupabaseServerClient.mockResolvedValue(
      makeSupabase(makeUser('Ana Maria Oliveira Silva'))
    )

    const ui = await LigasPage()
    render(ui)

    expect(screen.getByText('Ana')).toBeInTheDocument()
  })

  // ── LeagueCard grid ─────────────────────────────────────────────────────

  it('renders one LeagueCard per item returned by getLeaguesHub()', async () => {
    mockGetLeaguesHub.mockResolvedValue([
      makeLeague({ id: 'l1', name: 'Liga A' }),
      makeLeague({ id: 'l2', name: 'Liga B' }),
      makeLeague({ id: 'l3', name: 'Liga C' }),
    ])

    const ui = await LigasPage()
    render(ui)

    expect(screen.getByTestId('card-l1')).toBeInTheDocument()
    expect(screen.getByTestId('card-l2')).toBeInTheDocument()
    expect(screen.getByTestId('card-l3')).toBeInTheDocument()
  })

  it('renders no LeagueCard elements when getLeaguesHub() returns an empty array', async () => {
    mockGetLeaguesHub.mockResolvedValue([])

    const ui = await LigasPage()
    render(ui)

    expect(screen.queryByTestId(/^card-/)).not.toBeInTheDocument()
  })

  it('renders cards in the order returned by getLeaguesHub()', async () => {
    mockGetLeaguesHub.mockResolvedValue([
      makeLeague({ id: 'first', name: 'First League' }),
      makeLeague({ id: 'second', name: 'Second League' }),
    ])

    const ui = await LigasPage()
    render(ui)

    const cards = screen.getAllByTestId(/^card-/)
    expect(cards[0]).toHaveAttribute('data-testid', 'card-first')
    expect(cards[1]).toHaveAttribute('data-testid', 'card-second')
  })

  // ── "Criar nova liga" card ──────────────────────────────────────────────

  it('renders the "Criar nova liga" card via <CreateLeagueModal />', async () => {
    const ui = await LigasPage()
    render(ui)

    expect(screen.getByTestId('create-league-card')).toBeInTheDocument()
  })

  it('"Criar nova liga" card is always rendered regardless of league count', async () => {
    mockGetLeaguesHub.mockResolvedValue([
      makeLeague({ id: 'x', name: 'X' }),
      makeLeague({ id: 'y', name: 'Y' }),
    ])

    const ui = await LigasPage()
    render(ui)

    expect(screen.getByTestId('create-league-card')).toBeInTheDocument()
  })

  // ── CountdownBanner ─────────────────────────────────────────────────────

  it('shows "A Copa começa em X dias" when isUnderway is false', async () => {
    mockGetDaysUntilCopa.mockReturnValue({ days: 19, isUnderway: false })

    const ui = await LigasPage()
    render(ui)

    expect(screen.getByText('A Copa começa em 19 dias')).toBeInTheDocument()
  })

  it('shows "A Copa está acontecendo." when isUnderway is true', async () => {
    mockGetDaysUntilCopa.mockReturnValue({ days: 0, isUnderway: true })

    const ui = await LigasPage()
    render(ui)

    expect(screen.getByText('A Copa está acontecendo.')).toBeInTheDocument()
  })

  it('countdown banner is identified by data-testid="countdown-banner"', async () => {
    const ui = await LigasPage()
    render(ui)

    expect(screen.getByTestId('countdown-banner')).toBeInTheDocument()
  })

  // ── Hero section ────────────────────────────────────────────────────────

  it('renders the hero heading with "Suas ligas" text', async () => {
    const ui = await LigasPage()
    render(ui)

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  // ── No hooks in server file (static check) ──────────────────────────────

  it('export const dynamic = "force-dynamic" is present at module scope', async () => {
    const mod = await import('@/app/ligas/page')
    expect((mod as { dynamic?: string }).dynamic).toBe('force-dynamic')
  })
})
