/**
 * @vitest-environment jsdom
 *
 * Integration tests for app/ligas/[id]/palpites/page.tsx.
 * Renders the full page with mocked fetch and verifies filter interactions,
 * date grouping, and the "Salvar todos" batch-save flow.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { useParams } from 'next/navigation'
import PalpitesPage from '@/app/ligas/[id]/palpites/page'
import type { MatchWithPrediction } from '@/lib/api/types'

vi.mock('next/navigation')
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

const LEAGUE_ID = 'integration-league'

function makeMatch(
  overrides: Partial<MatchWithPrediction> & { id: string }
): MatchWithPrediction {
  return {
    external_id: null,
    home_team: 'Brasil',
    away_team: 'Argentina',
    home_flag: 'br',
    away_flag: 'ar',
    match_date: '2026-07-10T18:00:00Z',
    phase: 'group',
    group: 'A',
    status: 'scheduled',
    home_score: null,
    away_score: null,
    venue: null,
    city: null,
    prediction: null,
    is_deadline_passed: false,
    ...overrides,
  }
}

function setupFetchMock(
  matches: MatchWithPrediction[],
  putResponse: Record<string, unknown> = {}
) {
  vi.spyOn(global, 'fetch').mockImplementation((url) => {
    const urlStr = String(url)
    if (urlStr.includes('?phase=group')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: { matches, total: matches.length } }),
      } as Response)
    }
    if (urlStr.includes('/predictions/')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: putResponse }),
      } as Response)
    }
    return Promise.reject(new Error(`Unexpected fetch: ${urlStr}`))
  })
}

describe('Palpites page — integration', () => {
  beforeEach(() => {
    vi.mocked(useParams as ReturnType<typeof vi.fn>).mockReturnValue({ id: LEAGUE_ID })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders correctly with 8 group-stage matches across 2 dates', async () => {
    const matches = [
      makeMatch({ id: 'm1', match_date: '2026-07-10T14:00:00Z', group: 'A' }),
      makeMatch({ id: 'm2', match_date: '2026-07-10T17:00:00Z', group: 'B' }),
      makeMatch({ id: 'm3', match_date: '2026-07-10T20:00:00Z', group: 'C' }),
      makeMatch({ id: 'm4', match_date: '2026-07-10T23:00:00Z', group: 'D' }),
      makeMatch({ id: 'm5', match_date: '2026-07-11T14:00:00Z', group: 'E' }),
      makeMatch({ id: 'm6', match_date: '2026-07-11T17:00:00Z', group: 'F' }),
      makeMatch({ id: 'm7', match_date: '2026-07-11T20:00:00Z', group: 'G' }),
      makeMatch({ id: 'm8', match_date: '2026-07-11T23:00:00Z', group: 'H' }),
    ]
    setupFetchMock(matches)

    render(<PalpitesPage />)

    await waitFor(() => expect(screen.getAllByTestId('match-row')).toHaveLength(8))

    // Both date sections rendered
    expect(screen.getByTestId('date-section-2026-07-10')).toBeInTheDocument()
    expect(screen.getByTestId('date-section-2026-07-11')).toBeInTheDocument()

    // Header text
    expect(screen.getByText('Palpites')).toBeInTheDocument()
    expect(screen.getByText(/Chute os placares/i)).toBeInTheDocument()
    expect(screen.getByTestId('date-tab-all')).toHaveTextContent('(8)')
  })

  it('"Todos" tab shows all 8 matches; "Hoje" tab shows only today\'s matches', async () => {
    const today = new Date()
    const notToday = new Date('2026-07-15T18:00:00Z')

    const matches = [
      makeMatch({ id: 'm1', match_date: today.toISOString() }),
      makeMatch({ id: 'm2', match_date: today.toISOString() }),
      makeMatch({ id: 'm3', match_date: today.toISOString() }),
      makeMatch({ id: 'm4', match_date: notToday.toISOString() }),
      makeMatch({ id: 'm5', match_date: notToday.toISOString() }),
      makeMatch({ id: 'm6', match_date: notToday.toISOString() }),
      makeMatch({ id: 'm7', match_date: notToday.toISOString() }),
      makeMatch({ id: 'm8', match_date: notToday.toISOString() }),
    ]
    setupFetchMock(matches)

    render(<PalpitesPage />)
    await waitFor(() => expect(screen.getAllByTestId('match-row')).toHaveLength(8))

    // "Todos" shows all 8
    expect(screen.getByTestId('date-tab-all')).toHaveTextContent('(8)')
    expect(screen.getAllByTestId('match-row')).toHaveLength(8)

    // Switch to "Hoje"
    fireEvent.click(screen.getByTestId('date-tab-today'))
    expect(screen.getAllByTestId('match-row')).toHaveLength(3)
    expect(screen.getByTestId('date-tab-today')).toHaveTextContent('(3)')
  })

  it('group chip "GRUPO B" shows only group-B matches after click', async () => {
    const matches = [
      makeMatch({ id: 'm1', group: 'A' }),
      makeMatch({ id: 'm2', group: 'A' }),
      makeMatch({ id: 'm3', group: 'B' }),
      makeMatch({ id: 'm4', group: 'B' }),
      makeMatch({ id: 'm5', group: 'B' }),
      makeMatch({ id: 'm6', group: 'C' }),
      makeMatch({ id: 'm7', group: 'D' }),
      makeMatch({ id: 'm8', group: 'E' }),
    ]
    setupFetchMock(matches)

    render(<PalpitesPage />)
    await waitFor(() => expect(screen.getAllByTestId('match-row')).toHaveLength(8))

    fireEvent.click(screen.getByTestId('group-chip-B'))
    expect(screen.getAllByTestId('match-row')).toHaveLength(3)
  })

  it('"Salvar todos" calls PUT for each unsaved row and rows update to PALPITADO', async () => {
    const matches = [
      makeMatch({ id: 'int-m1', prediction: null }),
      makeMatch({ id: 'int-m2', prediction: null }),
    ]
    setupFetchMock(matches)

    render(<PalpitesPage />)
    await waitFor(() => expect(screen.getAllByTestId('badge-aberto')).toHaveLength(2))

    // "Salvar todos" should be disabled initially
    expect(screen.getByTestId('save-all-btn')).toBeDisabled()

    // Enter scores for both
    fireEvent.change(screen.getByTestId('input-home-int-m1'), { target: { value: '2' } })
    fireEvent.change(screen.getByTestId('input-away-int-m1'), { target: { value: '0' } })
    fireEvent.change(screen.getByTestId('input-home-int-m2'), { target: { value: '1' } })
    fireEvent.change(screen.getByTestId('input-away-int-m2'), { target: { value: '1' } })

    // Now enabled
    expect(screen.getByTestId('save-all-btn')).not.toBeDisabled()

    fireEvent.click(screen.getByTestId('save-all-btn'))

    await waitFor(() => {
      expect(screen.getAllByTestId('badge-palpitado')).toHaveLength(2)
    })

    // Verify correct PUT calls were made
    const fetchCalls = vi.mocked(global.fetch).mock.calls.map(([url]) => String(url))
    expect(fetchCalls.some((u) => u.includes('/predictions/int-m1'))).toBe(true)
    expect(fetchCalls.some((u) => u.includes('/predictions/int-m2'))).toBe(true)

    // PUTs should include correct JSON bodies
    const putCalls = vi.mocked(global.fetch).mock.calls.filter(([url]) =>
      String(url).includes('/predictions/')
    )
    expect(putCalls).toHaveLength(2)
    putCalls.forEach(([, options]) => {
      expect((options as RequestInit).method).toBe('PUT')
    })
  })

  it('rows past deadline show "FECHADO" badge and disabled inputs', async () => {
    const matches = [
      makeMatch({ id: 'open-m', is_deadline_passed: false }),
      makeMatch({ id: 'closed-m', is_deadline_passed: true }),
    ]
    setupFetchMock(matches)

    render(<PalpitesPage />)
    await waitFor(() => expect(screen.getAllByTestId('match-row')).toHaveLength(2))

    expect(screen.getByTestId('badge-aberto')).toBeInTheDocument()
    expect(screen.getByTestId('badge-fechado')).toBeInTheDocument()

    expect(screen.getByTestId('input-home-open-m')).not.toBeDisabled()
    expect(screen.getByTestId('input-home-closed-m')).toBeDisabled()
  })

  it('combining date and group filters shows the intersection of matches', async () => {
    const today = new Date()
    const matches = [
      makeMatch({ id: 'm1', match_date: today.toISOString(), group: 'A' }),
      makeMatch({ id: 'm2', match_date: today.toISOString(), group: 'B' }),
      makeMatch({ id: 'm3', match_date: '2026-08-01T18:00:00Z', group: 'A' }),
      makeMatch({ id: 'm4', match_date: '2026-08-01T18:00:00Z', group: 'B' }),
    ]
    setupFetchMock(matches)

    render(<PalpitesPage />)
    await waitFor(() => expect(screen.getAllByTestId('match-row')).toHaveLength(4))

    // Filter by today
    fireEvent.click(screen.getByTestId('date-tab-today'))
    expect(screen.getAllByTestId('match-row')).toHaveLength(2)

    // Additionally filter by Group A
    fireEvent.click(screen.getByTestId('group-chip-A'))
    expect(screen.getAllByTestId('match-row')).toHaveLength(1)
  })
})
