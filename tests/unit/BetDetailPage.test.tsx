/**
 * @vitest-environment jsdom
 *
 * Unit tests for the Bet Detail page and its child components.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import type { MatchDetail } from '@/lib/api/types'
import BetDetailPage from '@/app/ligas/[id]/palpites/[matchId]/page'
import ScoringCard from '@/app/ligas/[id]/palpites/[matchId]/components/ScoringCard'
import DistributionCard from '@/app/ligas/[id]/palpites/[matchId]/components/DistributionCard'

const LEAGUE_ID = 'test-league'
const MATCH_ID = 'test-match'

const mockBack = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mockBack }),
  useParams: () => ({ id: LEAGUE_ID, matchId: MATCH_ID }),
}))

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
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

function makeMatchDetail(overrides: Partial<MatchDetail> = {}): MatchDetail {
  return {
    id: MATCH_ID,
    external_id: null,
    home_team: 'Brasil',
    away_team: 'Argentina',
    home_flag: 'br',
    away_flag: 'ar',
    match_date: '2026-06-15T18:00:00Z',
    phase: 'group',
    group: 'A',
    status: 'scheduled',
    home_score: null,
    away_score: null,
    venue: 'Estádio Nacional',
    city: 'Brasília',
    prediction: null,
    is_deadline_passed: false,
    distribution: null,
    ...overrides,
  }
}

function mockFetchDetail(matchDetail: MatchDetail) {
  vi.spyOn(global, 'fetch').mockImplementation((url) => {
    const urlStr = String(url)
    if (urlStr.includes(`/matches/${MATCH_ID}`)) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: matchDetail }),
      } as Response)
    }
    if (urlStr.includes('/predictions/')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              predicted_home_score: parseInt(urlStr, 10) || 2,
              predicted_away_score: 1,
            },
          }),
      } as Response)
    }
    return Promise.reject(new Error(`Unexpected fetch: ${urlStr}`))
  })
}

// ── BetDetailPage unit tests ─────────────────────────────────────────────────

describe('BetDetailPage', () => {
  beforeEach(() => {
    mockBack.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders loading skeleton while fetching; no score inputs visible', () => {
    vi.spyOn(global, 'fetch').mockReturnValue(new Promise(() => {}))

    render(<BetDetailPage />)

    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
    expect(screen.queryByTestId('input-home')).not.toBeInTheDocument()
    expect(screen.queryByTestId('input-away')).not.toBeInTheDocument()
  })

  it('renders empty inputs and disabled save button when no prediction and deadline is open', async () => {
    mockFetchDetail(makeMatchDetail({ prediction: null, is_deadline_passed: false }))

    render(<BetDetailPage />)

    await waitFor(() => expect(screen.getByTestId('input-home')).toBeInTheDocument())

    const homeInput = screen.getByTestId('input-home') as HTMLInputElement
    const awayInput = screen.getByTestId('input-away') as HTMLInputElement
    expect(homeInput.value).toBe('')
    expect(awayInput.value).toBe('')
    expect(screen.getByTestId('save-btn')).toBeDisabled()
  })

  it('pre-fills inputs "2" and "1" with existing prediction and enables save button', async () => {
    mockFetchDetail(
      makeMatchDetail({
        prediction: { predicted_home_score: 2, predicted_away_score: 1 },
      })
    )

    render(<BetDetailPage />)

    await waitFor(() => expect(screen.getByTestId('input-home')).toBeInTheDocument())

    const homeInput = screen.getByTestId('input-home') as HTMLInputElement
    const awayInput = screen.getByTestId('input-away') as HTMLInputElement
    expect(homeInput.value).toBe('2')
    expect(awayInput.value).toBe('1')
    expect(screen.getByTestId('save-btn')).not.toBeDisabled()
  })

  it('enables save button after entering "3" home and "0" away from null prediction', async () => {
    mockFetchDetail(makeMatchDetail({ prediction: null }))

    render(<BetDetailPage />)

    await waitFor(() => expect(screen.getByTestId('input-home')).toBeInTheDocument())
    expect(screen.getByTestId('save-btn')).toBeDisabled()

    fireEvent.change(screen.getByTestId('input-home'), { target: { value: '3' } })
    fireEvent.change(screen.getByTestId('input-away'), { target: { value: '0' } })

    expect(screen.getByTestId('save-btn')).not.toBeDisabled()
  })

  it('clicking save calls PUT /api/leagues/[id]/predictions/[matchId] with correct body', async () => {
    mockFetchDetail(makeMatchDetail({ prediction: null }))

    render(<BetDetailPage />)

    await waitFor(() => expect(screen.getByTestId('input-home')).toBeInTheDocument())

    fireEvent.change(screen.getByTestId('input-home'), { target: { value: '2' } })
    fireEvent.change(screen.getByTestId('input-away'), { target: { value: '1' } })
    fireEvent.click(screen.getByTestId('save-btn'))

    await waitFor(() => {
      const calls = vi.mocked(global.fetch).mock.calls
      const putCall = calls.find(
        ([url, opts]) =>
          String(url).includes('/predictions/') && (opts as RequestInit).method === 'PUT'
      )
      expect(putCall).toBeDefined()
      expect(JSON.parse((putCall![1] as RequestInit).body as string)).toEqual({
        home_score: 2,
        away_score: 1,
      })
    })
  })

  it('shows "Salvo!" text on save button after successful PUT', async () => {
    mockFetchDetail(makeMatchDetail({ prediction: null }))

    render(<BetDetailPage />)

    await waitFor(() => expect(screen.getByTestId('input-home')).toBeInTheDocument())

    fireEvent.change(screen.getByTestId('input-home'), { target: { value: '2' } })
    fireEvent.change(screen.getByTestId('input-away'), { target: { value: '1' } })
    fireEvent.click(screen.getByTestId('save-btn'))

    await waitFor(() =>
      expect(screen.getByTestId('save-btn')).toHaveTextContent('Salvo!')
    )
  })

  it('"Voltar" with inputs matching saved prediction (clean state) navigates without modal', async () => {
    mockFetchDetail(
      makeMatchDetail({
        prediction: { predicted_home_score: 2, predicted_away_score: 1 },
      })
    )

    render(<BetDetailPage />)

    await waitFor(() => expect(screen.getByTestId('input-home')).toBeInTheDocument())

    // Inputs match saved prediction → clean state
    fireEvent.click(screen.getByTestId('back-btn'))

    expect(screen.queryByTestId('unsaved-modal')).not.toBeInTheDocument()
    expect(mockBack).toHaveBeenCalledOnce()
  })

  it('"Voltar" after changing inputs (dirty state) shows UnsavedModal', async () => {
    mockFetchDetail(
      makeMatchDetail({
        prediction: { predicted_home_score: 2, predicted_away_score: 1 },
      })
    )

    render(<BetDetailPage />)

    await waitFor(() => expect(screen.getByTestId('input-home')).toBeInTheDocument())

    fireEvent.change(screen.getByTestId('input-home'), { target: { value: '3' } })
    fireEvent.click(screen.getByTestId('back-btn'))

    expect(screen.getByTestId('unsaved-modal')).toBeInTheDocument()
    expect(mockBack).not.toHaveBeenCalled()
  })

  it('"Sair sem salvar" navigates without calling PUT', async () => {
    mockFetchDetail(makeMatchDetail({ prediction: null }))

    render(<BetDetailPage />)

    await waitFor(() => expect(screen.getByTestId('input-home')).toBeInTheDocument())

    fireEvent.change(screen.getByTestId('input-home'), { target: { value: '1' } })
    fireEvent.change(screen.getByTestId('input-away'), { target: { value: '0' } })
    fireEvent.click(screen.getByTestId('back-btn'))

    expect(screen.getByTestId('unsaved-modal')).toBeInTheDocument()

    const fetchBefore = vi.mocked(global.fetch).mock.calls.length
    fireEvent.click(screen.getByTestId('exit-without-saving-btn'))

    expect(mockBack).toHaveBeenCalledOnce()
    // No additional PUT call made
    const putCalls = vi
      .mocked(global.fetch)
      .mock.calls.slice(fetchBefore)
      .filter(([, opts]) => (opts as RequestInit)?.method === 'PUT')
    expect(putCalls).toHaveLength(0)
  })

  it('"Salvar e sair" calls PUT then navigates', async () => {
    mockFetchDetail(makeMatchDetail({ prediction: null }))

    render(<BetDetailPage />)

    await waitFor(() => expect(screen.getByTestId('input-home')).toBeInTheDocument())

    fireEvent.change(screen.getByTestId('input-home'), { target: { value: '2' } })
    fireEvent.change(screen.getByTestId('input-away'), { target: { value: '0' } })
    fireEvent.click(screen.getByTestId('back-btn'))

    expect(screen.getByTestId('unsaved-modal')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('save-and-exit-btn'))

    await waitFor(() => expect(mockBack).toHaveBeenCalledOnce())

    const putCalls = vi
      .mocked(global.fetch)
      .mock.calls.filter(([, opts]) => (opts as RequestInit)?.method === 'PUT')
    expect(putCalls).toHaveLength(1)
  })

  it('clicking outside modal (overlay) closes modal without navigation', async () => {
    mockFetchDetail(makeMatchDetail({ prediction: null }))

    render(<BetDetailPage />)

    await waitFor(() => expect(screen.getByTestId('input-home')).toBeInTheDocument())

    fireEvent.change(screen.getByTestId('input-home'), { target: { value: '1' } })
    fireEvent.change(screen.getByTestId('input-away'), { target: { value: '0' } })
    fireEvent.click(screen.getByTestId('back-btn'))

    expect(screen.getByTestId('unsaved-modal')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('unsaved-modal-overlay'))

    expect(screen.queryByTestId('unsaved-modal')).not.toBeInTheDocument()
    expect(mockBack).not.toHaveBeenCalled()
  })

  it('deadline-passed match: inputs are disabled and "FECHADO" badge is shown', async () => {
    mockFetchDetail(makeMatchDetail({ is_deadline_passed: true }))

    render(<BetDetailPage />)

    await waitFor(() => expect(screen.getByTestId('input-home')).toBeInTheDocument())

    expect(screen.getByTestId('input-home')).toBeDisabled()
    expect(screen.getByTestId('input-away')).toBeDisabled()
    expect(screen.getByTestId('status-badge-fechado')).toBeInTheDocument()
    expect(screen.queryByTestId('status-badge-open')).not.toBeInTheDocument()
  })
})

// ── DistributionCard unit tests ──────────────────────────────────────────────

describe('DistributionCard', () => {
  it('renders locked placeholder when distribution is null', () => {
    render(
      <DistributionCard
        homeTeam="Brasil"
        awayTeam="Argentina"
        distribution={null}
        isDeadlinePassed={false}
      />
    )
    expect(screen.getByTestId('distribution-locked')).toBeInTheDocument()
    expect(screen.queryByTestId('distribution-chart')).not.toBeInTheDocument()
  })

  it('renders locked placeholder when is_deadline_passed is false even with distribution data', () => {
    render(
      <DistributionCard
        homeTeam="Brasil"
        awayTeam="Argentina"
        distribution={{ home_win: 50, draw: 30, away_win: 20, total_predictions: 10 }}
        isDeadlinePassed={false}
      />
    )
    expect(screen.getByTestId('distribution-locked')).toBeInTheDocument()
    expect(screen.queryByTestId('distribution-chart')).not.toBeInTheDocument()
  })

  it('renders bar chart when is_deadline_passed is true and distribution is provided', () => {
    render(
      <DistributionCard
        homeTeam="Brasil"
        awayTeam="Argentina"
        distribution={{ home_win: 50, draw: 30, away_win: 20, total_predictions: 10 }}
        isDeadlinePassed={true}
      />
    )
    expect(screen.getByTestId('distribution-chart')).toBeInTheDocument()
    expect(screen.queryByTestId('distribution-locked')).not.toBeInTheDocument()
    expect(screen.getByTestId('distribution-chart')).toHaveTextContent('50%')
    expect(screen.getByTestId('distribution-chart')).toHaveTextContent('30%')
    expect(screen.getByTestId('distribution-chart')).toHaveTextContent('20%')
  })
})

// ── ScoringCard unit tests ────────────────────────────────────────────────────

describe('ScoringCard', () => {
  it('shows "+10 pts" for exact score and "+5 pts" for correct outcome', () => {
    render(<ScoringCard />)

    expect(screen.getByTestId('scoring-exact')).toHaveTextContent('+10 pts')
    expect(screen.getByTestId('scoring-outcome')).toHaveTextContent('+5 pts')
    expect(screen.getByText('Placar exato')).toBeInTheDocument()
    expect(screen.getByText('Apenas vencedor/empate')).toBeInTheDocument()
  })
})
