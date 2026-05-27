/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import UpcomingMatchesCard from '@/app/ligas/[id]/components/UpcomingMatchesCard'
import type { MatchWithPrediction } from '@/lib/api/types'

vi.mock('next/image', () => ({
  default: function MockImage({ src, alt }: { src: string; alt: string }) {
    return <img src={src} alt={alt} />
  },
}))

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

const LEAGUE_ID = 'league-abc'

function makeMatch(overrides: Partial<MatchWithPrediction> = {}): MatchWithPrediction {
  return {
    id: 'match-1',
    external_id: '100001',
    home_team: 'Brasil',
    away_team: 'Argentina',
    home_flag: 'br',
    away_flag: 'ar',
    match_date: '2026-06-15T18:00:00Z',
    phase: 'group',
    group: 'C',
    status: 'scheduled',
    home_score: null,
    away_score: null,
    venue: 'Estadio Azteca',
    city: 'Cidade do México',
    prediction: null,
    is_deadline_passed: false,
    ...overrides,
  }
}

function mockFetchSuccess(matches: MatchWithPrediction[]) {
  vi.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ data: { matches, total: matches.length } }),
  } as Response)
}

function mockFetchError() {
  vi.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: false,
    json: () => Promise.resolve({ error: 'Internal Server Error' }),
  } as Response)
}

describe('UpcomingMatchesCard', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockImplementation(() => new Promise(() => {}))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ── Loading state ──────────────────────────────────────────────────────────

  it('renders loading skeleton while fetch is pending (no match cards visible)', () => {
    render(<UpcomingMatchesCard leagueId={LEAGUE_ID} />)
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
    expect(screen.queryByTestId('match-card')).not.toBeInTheDocument()
  })

  // ── Match list ─────────────────────────────────────────────────────────────

  it('renders 4 match cards when API returns 4 matches', async () => {
    const matches = [
      makeMatch({ id: 'm1' }),
      makeMatch({ id: 'm2', home_team: 'França', away_team: 'Alemanha' }),
      makeMatch({ id: 'm3', home_team: 'Portugal', away_team: 'Espanha' }),
      makeMatch({ id: 'm4', home_team: 'Inglaterra', away_team: 'Bélgica' }),
    ]
    mockFetchSuccess(matches)

    render(<UpcomingMatchesCard leagueId={LEAGUE_ID} />)
    await waitFor(() => expect(screen.getAllByTestId('match-card')).toHaveLength(4))
  })

  it('each match card shows home team name, away team name, and formatted date', async () => {
    const match = makeMatch({ match_date: '2026-06-15T18:00:00Z' })
    mockFetchSuccess([match])

    render(<UpcomingMatchesCard leagueId={LEAGUE_ID} />)
    await waitFor(() => expect(screen.getByTestId('match-card')).toBeInTheDocument())

    expect(screen.getByText('Brasil')).toBeInTheDocument()
    expect(screen.getByText('Argentina')).toBeInTheDocument()
    // Date should be formatted (contains "15/06" pattern)
    expect(screen.getByText(/15\/06/)).toBeInTheDocument()
  })

  // ── Flag images ────────────────────────────────────────────────────────────

  it('flag images use the flagcdn.com/w80/{code}.png pattern', async () => {
    mockFetchSuccess([makeMatch()])
    render(<UpcomingMatchesCard leagueId={LEAGUE_ID} />)
    await waitFor(() => expect(screen.getByTestId('match-card')).toBeInTheDocument())

    const imgs = screen.getAllByRole('img')
    expect(imgs.some((img) => img.getAttribute('src')?.includes('flagcdn.com/w80/br.png'))).toBe(true)
    expect(imgs.some((img) => img.getAttribute('src')?.includes('flagcdn.com/w80/ar.png'))).toBe(true)
  })

  // ── Prediction display ─────────────────────────────────────────────────────

  it('shows "2 × 1" when prediction is { predicted_home_score: 2, predicted_away_score: 1 }', async () => {
    const match = makeMatch({
      prediction: { predicted_home_score: 2, predicted_away_score: 1 },
    })
    mockFetchSuccess([match])

    render(<UpcomingMatchesCard leagueId={LEAGUE_ID} />)
    await waitFor(() => expect(screen.getByTestId('prediction-display')).toBeInTheDocument())

    expect(screen.getByTestId('prediction-display')).toHaveTextContent('2 × 1')
  })

  it('shows "–" when prediction is null', async () => {
    const match = makeMatch({ prediction: null })
    mockFetchSuccess([match])

    render(<UpcomingMatchesCard leagueId={LEAGUE_ID} />)
    await waitFor(() => expect(screen.getByTestId('prediction-display')).toBeInTheDocument())

    expect(screen.getByTestId('prediction-display')).toHaveTextContent('–')
  })

  // ── Status badges ──────────────────────────────────────────────────────────

  it('shows "FECHADO" badge when is_deadline_passed is true', async () => {
    const match = makeMatch({ is_deadline_passed: true })
    mockFetchSuccess([match])

    render(<UpcomingMatchesCard leagueId={LEAGUE_ID} />)
    await waitFor(() => expect(screen.getByTestId('badge-fechado')).toBeInTheDocument())
    expect(screen.queryByTestId('badge-aberto')).not.toBeInTheDocument()
  })

  it('shows "ABERTO" badge when is_deadline_passed is false', async () => {
    const match = makeMatch({ is_deadline_passed: false })
    mockFetchSuccess([match])

    render(<UpcomingMatchesCard leagueId={LEAGUE_ID} />)
    await waitFor(() => expect(screen.getByTestId('badge-aberto')).toBeInTheDocument())
    expect(screen.queryByTestId('badge-fechado')).not.toBeInTheDocument()
  })

  // ── "Ver Todos" link ───────────────────────────────────────────────────────

  it('"Ver Todos" link points to /ligas/{leagueId}/palpites', () => {
    render(<UpcomingMatchesCard leagueId={LEAGUE_ID} />)
    const link = screen.getByRole('link', { name: /Ver Todos/i })
    expect(link).toHaveAttribute('href', `/ligas/${LEAGUE_ID}/palpites`)
  })

  // ── Error state ────────────────────────────────────────────────────────────

  it('renders error state when fetch returns non-ok response (no crash)', async () => {
    mockFetchError()

    render(<UpcomingMatchesCard leagueId={LEAGUE_ID} />)
    await waitFor(() => expect(screen.getByTestId('error-state')).toBeInTheDocument())
    expect(screen.queryByTestId('match-card')).not.toBeInTheDocument()
    expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument()
  })

  it('renders error state when fetch throws (network failure)', async () => {
    vi.restoreAllMocks()
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'))

    render(<UpcomingMatchesCard leagueId={LEAGUE_ID} />)
    await waitFor(() => expect(screen.getByTestId('error-state')).toBeInTheDocument())
  })

  // ── Fetch call ─────────────────────────────────────────────────────────────

  it('fetches /api/leagues/{leagueId}/matches?next=4 on mount', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { matches: [], total: 0 } }),
    } as Response)

    render(<UpcomingMatchesCard leagueId={LEAGUE_ID} />)
    await waitFor(() => expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument())

    expect(fetchSpy).toHaveBeenCalledWith(
      `/api/leagues/${LEAGUE_ID}/matches?next=4`,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })
})
