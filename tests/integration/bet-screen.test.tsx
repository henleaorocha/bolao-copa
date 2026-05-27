/**
 * @vitest-environment jsdom
 *
 * Integration tests for app/ligas/[id]/palpites/[matchId]/page.tsx.
 * Covers full save flow, dirty navigation, and distribution panel toggling.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import type { MatchDetail } from '@/lib/api/types'
import BetDetailPage from '@/app/ligas/[id]/palpites/[matchId]/page'

const LEAGUE_ID = 'int-league'
const MATCH_ID = 'int-match'

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

function setupFetchMock(matchDetail: MatchDetail) {
  vi.spyOn(global, 'fetch').mockImplementation((url, opts) => {
    const urlStr = String(url)
    if (
      urlStr.includes(`/matches/${MATCH_ID}`) &&
      !(opts as RequestInit)?.method
    ) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: matchDetail }),
      } as Response)
    }
    if (urlStr.includes('/predictions/') && (opts as RequestInit)?.method === 'PUT') {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              match_id: MATCH_ID,
              predicted_home_score: 2,
              predicted_away_score: 1,
              updated_at: new Date().toISOString(),
            },
          }),
      } as Response)
    }
    return Promise.reject(new Error(`Unexpected fetch: ${urlStr} ${(opts as RequestInit)?.method ?? 'GET'}`))
  })
}

describe('Bet detail screen — integration', () => {
  beforeEach(() => {
    mockBack.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('full save flow: enter scores → save → "Salvo!" shown → Voltar navigates without modal', async () => {
    setupFetchMock(makeMatchDetail({ prediction: null }))

    render(<BetDetailPage />)

    await waitFor(() => expect(screen.getByTestId('input-home')).toBeInTheDocument())

    // Initially save is disabled
    expect(screen.getByTestId('save-btn')).toBeDisabled()

    // Enter valid scores
    fireEvent.change(screen.getByTestId('input-home'), { target: { value: '2' } })
    fireEvent.change(screen.getByTestId('input-away'), { target: { value: '1' } })
    expect(screen.getByTestId('save-btn')).not.toBeDisabled()

    // Save
    fireEvent.click(screen.getByTestId('save-btn'))

    // Confirmation shown
    await waitFor(() =>
      expect(screen.getByTestId('save-btn')).toHaveTextContent('Salvo!')
    )

    // Verify PUT was called
    const putCall = vi
      .mocked(global.fetch)
      .mock.calls.find(([, opts]) => (opts as RequestInit)?.method === 'PUT')
    expect(putCall).toBeDefined()
    expect(JSON.parse((putCall![1] as RequestInit).body as string)).toEqual({
      home_score: 2,
      away_score: 1,
    })

    // Voltar after save → clean state → no modal → navigates
    fireEvent.click(screen.getByTestId('back-btn'))
    expect(screen.queryByTestId('unsaved-modal')).not.toBeInTheDocument()
    expect(mockBack).toHaveBeenCalledOnce()
  })

  it('dirty navigation: enter scores → Voltar → modal → "Salvar e sair" → PUT called → navigates', async () => {
    setupFetchMock(makeMatchDetail({ prediction: null }))

    render(<BetDetailPage />)

    await waitFor(() => expect(screen.getByTestId('input-home')).toBeInTheDocument())

    // Enter scores without saving
    fireEvent.change(screen.getByTestId('input-home'), { target: { value: '3' } })
    fireEvent.change(screen.getByTestId('input-away'), { target: { value: '2' } })

    // Click Voltar → modal appears
    fireEvent.click(screen.getByTestId('back-btn'))
    expect(screen.getByTestId('unsaved-modal')).toBeInTheDocument()
    expect(mockBack).not.toHaveBeenCalled()

    // Click "Salvar e sair"
    fireEvent.click(screen.getByTestId('save-and-exit-btn'))

    // Wait for navigation
    await waitFor(() => expect(mockBack).toHaveBeenCalledOnce())

    // PUT was called
    const putCalls = vi
      .mocked(global.fetch)
      .mock.calls.filter(([, opts]) => (opts as RequestInit)?.method === 'PUT')
    expect(putCalls).toHaveLength(1)
    expect(JSON.parse((putCalls[0][1] as RequestInit).body as string)).toEqual({
      home_score: 3,
      away_score: 2,
    })
  })

  it('distribution panel is visible when is_deadline_passed is true and distribution is non-null', async () => {
    setupFetchMock(
      makeMatchDetail({
        is_deadline_passed: true,
        distribution: { home_win: 60, draw: 25, away_win: 15, total_predictions: 8 },
      })
    )

    render(<BetDetailPage />)

    await waitFor(() => expect(screen.getByTestId('distribution-chart')).toBeInTheDocument())

    expect(screen.queryByTestId('distribution-locked')).not.toBeInTheDocument()
    expect(screen.getByTestId('distribution-chart')).toHaveTextContent('60%')
    expect(screen.getByTestId('distribution-chart')).toHaveTextContent('25%')
    expect(screen.getByTestId('distribution-chart')).toHaveTextContent('15%')
  })

  it('distribution panel is locked when is_deadline_passed is false', async () => {
    setupFetchMock(
      makeMatchDetail({
        is_deadline_passed: false,
        distribution: null,
      })
    )

    render(<BetDetailPage />)

    await waitFor(() => expect(screen.getByTestId('distribution-locked')).toBeInTheDocument())

    expect(screen.queryByTestId('distribution-chart')).not.toBeInTheDocument()
  })
})
