/**
 * @vitest-environment jsdom
 *
 * Unit tests for the Palpites list page and its child components.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { useParams } from 'next/navigation'
import PalpitesPage from '@/app/ligas/[id]/palpites/page'
import MatchRow from '@/app/ligas/[id]/palpites/components/MatchRow'
import PalpitesFilters from '@/app/ligas/[id]/palpites/components/PalpitesFilters'
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

const LEAGUE_ID = 'test-league'

function makeMatch(
  overrides: Partial<MatchWithPrediction> & { id: string }
): MatchWithPrediction {
  return {
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
    venue: null,
    city: null,
    prediction: null,
    is_deadline_passed: false,
    ...overrides,
  }
}

function mockFetchMatches(matches: MatchWithPrediction[]) {
  vi.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ data: { matches, total: matches.length } }),
  } as Response)
}

// ── MatchRow unit tests ──────────────────────────────────────────────────────

describe('MatchRow', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows "ABERTO" badge when deadline not passed and no prediction', () => {
    render(
      <MatchRow
        match={makeMatch({ id: 'm1', is_deadline_passed: false, prediction: null })}
        leagueId={LEAGUE_ID}
        homeInput=""
        awayInput=""
        onInputChange={vi.fn()}
      />
    )
    expect(screen.getByTestId('badge-aberto')).toBeInTheDocument()
    expect(screen.queryByTestId('badge-palpitado')).not.toBeInTheDocument()
    expect(screen.queryByTestId('badge-fechado')).not.toBeInTheDocument()
  })

  it('shows "PALPITADO" badge and pre-filled inputs when prediction exists', () => {
    render(
      <MatchRow
        match={makeMatch({
          id: 'm1',
          is_deadline_passed: false,
          prediction: { predicted_home_score: 2, predicted_away_score: 0 },
        })}
        leagueId={LEAGUE_ID}
        homeInput="2"
        awayInput="0"
        onInputChange={vi.fn()}
      />
    )
    expect(screen.getByTestId('badge-palpitado')).toBeInTheDocument()
    expect(screen.queryByTestId('badge-aberto')).not.toBeInTheDocument()

    const homeInput = screen.getByTestId('input-home-m1') as HTMLInputElement
    const awayInput = screen.getByTestId('input-away-m1') as HTMLInputElement
    expect(homeInput.value).toBe('2')
    expect(awayInput.value).toBe('0')
  })

  it('shows "FECHADO" badge and disabled inputs when deadline is passed', () => {
    render(
      <MatchRow
        match={makeMatch({ id: 'm1', is_deadline_passed: true })}
        leagueId={LEAGUE_ID}
        homeInput=""
        awayInput=""
        onInputChange={vi.fn()}
      />
    )
    expect(screen.getByTestId('badge-fechado')).toBeInTheDocument()
    expect(screen.queryByTestId('badge-aberto')).not.toBeInTheDocument()
    expect(screen.queryByTestId('badge-palpitado')).not.toBeInTheDocument()

    const homeInput = screen.getByTestId('input-home-m1') as HTMLInputElement
    const awayInput = screen.getByTestId('input-away-m1') as HTMLInputElement
    expect(homeInput).toBeDisabled()
    expect(awayInput).toBeDisabled()
  })

  it('score inputs have type="number", min="0", step="1" for numeric-only entry', () => {
    render(
      <MatchRow
        match={makeMatch({ id: 'm1' })}
        leagueId={LEAGUE_ID}
        homeInput=""
        awayInput=""
        onInputChange={vi.fn()}
      />
    )
    const homeInput = screen.getByTestId('input-home-m1') as HTMLInputElement
    const awayInput = screen.getByTestId('input-away-m1') as HTMLInputElement
    expect(homeInput.type).toBe('number')
    expect(homeInput.min).toBe('0')
    expect(homeInput.step).toBe('1')
    expect(awayInput.type).toBe('number')
    expect(awayInput.min).toBe('0')
    expect(awayInput.step).toBe('1')
  })

  it('"Detalhes →" link points to /ligas/{leagueId}/palpites/{matchId}', () => {
    render(
      <MatchRow
        match={makeMatch({ id: 'match-xyz' })}
        leagueId={LEAGUE_ID}
        homeInput=""
        awayInput=""
        onInputChange={vi.fn()}
      />
    )
    const link = screen.getByTestId('details-link') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe(`/ligas/${LEAGUE_ID}/palpites/match-xyz`)
  })

  it('calls onInputChange with correct args when home input changes', () => {
    const onInputChange = vi.fn()
    render(
      <MatchRow
        match={makeMatch({ id: 'm1' })}
        leagueId={LEAGUE_ID}
        homeInput=""
        awayInput=""
        onInputChange={onInputChange}
      />
    )
    fireEvent.change(screen.getByTestId('input-home-m1'), { target: { value: '2' } })
    expect(onInputChange).toHaveBeenCalledWith('m1', 'home', '2')
  })

  it('calls onInputChange with correct args when away input changes', () => {
    const onInputChange = vi.fn()
    render(
      <MatchRow
        match={makeMatch({ id: 'm1' })}
        leagueId={LEAGUE_ID}
        homeInput=""
        awayInput=""
        onInputChange={onInputChange}
      />
    )
    fireEvent.change(screen.getByTestId('input-away-m1'), { target: { value: '3' } })
    expect(onInputChange).toHaveBeenCalledWith('m1', 'away', '3')
  })

  it('inputs are NOT disabled when is_deadline_passed is false', () => {
    render(
      <MatchRow
        match={makeMatch({ id: 'm1', is_deadline_passed: false })}
        leagueId={LEAGUE_ID}
        homeInput=""
        awayInput=""
        onInputChange={vi.fn()}
      />
    )
    expect(screen.getByTestId('input-home-m1')).not.toBeDisabled()
    expect(screen.getByTestId('input-away-m1')).not.toBeDisabled()
  })
})

// ── PalpitesFilters unit tests ────────────────────────────────────────────────

describe('PalpitesFilters', () => {
  afterEach(() => vi.restoreAllMocks())

  it('renders date tabs for Todos, Hoje, Amanhã with correct counts', () => {
    render(
      <PalpitesFilters
        activeDate="all"
        onDateChange={vi.fn()}
        activeGroup="all"
        onGroupChange={vi.fn()}
        dateCounts={{ all: 8, today: 3, tomorrow: 2 }}
      />
    )
    expect(screen.getByTestId('date-tab-all')).toHaveTextContent('Todos')
    expect(screen.getByTestId('date-tab-all')).toHaveTextContent('(8)')
    expect(screen.getByTestId('date-tab-today')).toHaveTextContent('Hoje')
    expect(screen.getByTestId('date-tab-today')).toHaveTextContent('(3)')
    expect(screen.getByTestId('date-tab-tomorrow')).toHaveTextContent('Amanhã')
    expect(screen.getByTestId('date-tab-tomorrow')).toHaveTextContent('(2)')
  })

  it('renders group chips TODOS, GRUPO A through GRUPO L', () => {
    render(
      <PalpitesFilters
        activeDate="all"
        onDateChange={vi.fn()}
        activeGroup="all"
        onGroupChange={vi.fn()}
        dateCounts={{ all: 72, today: 0, tomorrow: 0 }}
      />
    )
    expect(screen.getByTestId('group-chip-all')).toHaveTextContent('TODOS')
    for (const g of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']) {
      expect(screen.getByTestId(`group-chip-${g}`)).toHaveTextContent(`GRUPO ${g}`)
    }
  })

  it('calls onDateChange with correct filter when a date tab is clicked', () => {
    const onDateChange = vi.fn()
    render(
      <PalpitesFilters
        activeDate="all"
        onDateChange={onDateChange}
        activeGroup="all"
        onGroupChange={vi.fn()}
        dateCounts={{ all: 8, today: 3, tomorrow: 2 }}
      />
    )
    fireEvent.click(screen.getByTestId('date-tab-today'))
    expect(onDateChange).toHaveBeenCalledWith('today')
  })

  it('calls onGroupChange with correct group when a chip is clicked', () => {
    const onGroupChange = vi.fn()
    render(
      <PalpitesFilters
        activeDate="all"
        onDateChange={vi.fn()}
        activeGroup="all"
        onGroupChange={onGroupChange}
        dateCounts={{ all: 8, today: 0, tomorrow: 0 }}
      />
    )
    fireEvent.click(screen.getByTestId('group-chip-A'))
    expect(onGroupChange).toHaveBeenCalledWith('A')
  })
})

// ── PalpitesPage unit tests ──────────────────────────────────────────────────

describe('PalpitesPage', () => {
  beforeEach(() => {
    vi.mocked(useParams as ReturnType<typeof vi.fn>).mockReturnValue({ id: LEAGUE_ID })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders date-tab pills with correct counts from mocked API', async () => {
    const today = new Date()
    const tomorrow = new Date(Date.now() + 86400000)
    const matches = [
      makeMatch({ id: 'm1', match_date: today.toISOString(), group: 'A' }),
      makeMatch({ id: 'm2', match_date: today.toISOString(), group: 'B' }),
      makeMatch({ id: 'm3', match_date: tomorrow.toISOString(), group: 'A' }),
      makeMatch({ id: 'm4', match_date: '2026-08-01T18:00:00Z', group: 'C' }),
    ]
    mockFetchMatches(matches)

    render(<PalpitesPage />)
    await waitFor(() => expect(screen.getAllByTestId('match-row')).toHaveLength(4))

    expect(screen.getByTestId('date-tab-all')).toHaveTextContent('(4)')
    expect(screen.getByTestId('date-tab-today')).toHaveTextContent('(2)')
    expect(screen.getByTestId('date-tab-tomorrow')).toHaveTextContent('(1)')
  })

  it('clicking "Hoje" tab filters displayed list to today\'s matches only', async () => {
    const today = new Date()
    const matches = [
      makeMatch({ id: 'm1', match_date: today.toISOString() }),
      makeMatch({ id: 'm2', match_date: today.toISOString() }),
      makeMatch({ id: 'm3', match_date: '2026-08-01T18:00:00Z' }),
    ]
    mockFetchMatches(matches)

    render(<PalpitesPage />)
    await waitFor(() => expect(screen.getAllByTestId('match-row')).toHaveLength(3))

    fireEvent.click(screen.getByTestId('date-tab-today'))
    expect(screen.getAllByTestId('match-row')).toHaveLength(2)
  })

  it('clicking "GRUPO A" chip filters displayed list to group-A matches only', async () => {
    const matches = [
      makeMatch({ id: 'm1', group: 'A' }),
      makeMatch({ id: 'm2', group: 'A' }),
      makeMatch({ id: 'm3', group: 'B' }),
      makeMatch({ id: 'm4', group: 'C' }),
    ]
    mockFetchMatches(matches)

    render(<PalpitesPage />)
    await waitFor(() => expect(screen.getAllByTestId('match-row')).toHaveLength(4))

    fireEvent.click(screen.getByTestId('group-chip-A'))
    expect(screen.getAllByTestId('match-row')).toHaveLength(2)
  })

  it('matches are grouped by date with section headers showing formatted date and count', async () => {
    const matches = [
      makeMatch({ id: 'm1', match_date: '2026-06-15T14:00:00Z' }),
      makeMatch({ id: 'm2', match_date: '2026-06-15T17:00:00Z' }),
      makeMatch({ id: 'm3', match_date: '2026-06-16T14:00:00Z' }),
    ]
    mockFetchMatches(matches)

    render(<PalpitesPage />)
    await waitFor(() => expect(screen.getAllByTestId('match-row')).toHaveLength(3))

    const section15 = screen.getByTestId('date-section-2026-06-15')
    const section16 = screen.getByTestId('date-section-2026-06-16')
    expect(section15).toBeInTheDocument()
    expect(section16).toBeInTheDocument()
    expect(section15).toHaveTextContent('2 jogos')
    expect(section16).toHaveTextContent('1 jogo')
  })

  it('"Salvar todos" button is disabled when no inputs have been modified', async () => {
    mockFetchMatches([makeMatch({ id: 'm1', prediction: null })])

    render(<PalpitesPage />)
    await waitFor(() => expect(screen.getByTestId('save-all-btn')).toBeInTheDocument())

    expect(screen.getByTestId('save-all-btn')).toBeDisabled()
  })

  it('"Salvar todos" is disabled when only one of two inputs is filled', async () => {
    mockFetchMatches([makeMatch({ id: 'm1', prediction: null })])

    render(<PalpitesPage />)
    await waitFor(() => expect(screen.getByTestId('input-home-m1')).toBeInTheDocument())

    fireEvent.change(screen.getByTestId('input-home-m1'), { target: { value: '2' } })
    // away input still empty
    expect(screen.getByTestId('save-all-btn')).toBeDisabled()
  })

  it('"Salvar todos" is enabled after user enters scores that differ from saved prediction', async () => {
    mockFetchMatches([
      makeMatch({
        id: 'm1',
        prediction: { predicted_home_score: 1, predicted_away_score: 0 },
      }),
    ])

    render(<PalpitesPage />)
    await waitFor(() => expect(screen.getByTestId('input-home-m1')).toBeInTheDocument())

    expect(screen.getByTestId('save-all-btn')).toBeDisabled()

    // Change home score to differ from saved
    fireEvent.change(screen.getByTestId('input-home-m1'), { target: { value: '2' } })
    expect(screen.getByTestId('save-all-btn')).not.toBeDisabled()
  })

  it('"Salvar todos" is enabled when no prediction saved and both inputs are filled', async () => {
    mockFetchMatches([makeMatch({ id: 'm1', prediction: null })])

    render(<PalpitesPage />)
    await waitFor(() => expect(screen.getByTestId('input-home-m1')).toBeInTheDocument())

    fireEvent.change(screen.getByTestId('input-home-m1'), { target: { value: '1' } })
    fireEvent.change(screen.getByTestId('input-away-m1'), { target: { value: '0' } })
    expect(screen.getByTestId('save-all-btn')).not.toBeDisabled()
  })

  it('"Salvar todos" triggers PUT for each unsaved row and rows transition to PALPITADO', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      const urlStr = String(url)
      if (urlStr.includes('?phase=group')) {
        const matches = [
          makeMatch({ id: 'm1', prediction: null }),
          makeMatch({ id: 'm2', prediction: null }),
        ]
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: { matches, total: 2 } }),
        } as Response)
      }
      if (urlStr.includes('/predictions/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: { predicted_home_score: 1, predicted_away_score: 0 } }),
        } as Response)
      }
      return Promise.reject(new Error(`Unexpected fetch: ${urlStr}`))
    })

    render(<PalpitesPage />)
    await waitFor(() => expect(screen.getAllByTestId('badge-aberto')).toHaveLength(2))

    // Enter scores for both matches
    fireEvent.change(screen.getByTestId('input-home-m1'), { target: { value: '1' } })
    fireEvent.change(screen.getByTestId('input-away-m1'), { target: { value: '0' } })
    fireEvent.change(screen.getByTestId('input-home-m2'), { target: { value: '2' } })
    fireEvent.change(screen.getByTestId('input-away-m2'), { target: { value: '1' } })

    expect(screen.getByTestId('save-all-btn')).not.toBeDisabled()

    fireEvent.click(screen.getByTestId('save-all-btn'))

    await waitFor(() => {
      expect(screen.getAllByTestId('badge-palpitado')).toHaveLength(2)
    })

    // Verify PUT was called for both matches
    const fetchCalls = vi
      .mocked(global.fetch)
      .mock.calls.map(([url]) => String(url))
    expect(fetchCalls.some((u) => u.includes('/predictions/m1'))).toBe(true)
    expect(fetchCalls.some((u) => u.includes('/predictions/m2'))).toBe(true)
  })

  it('deadline-passed match has "FECHADO" badge and disabled inputs in the page', async () => {
    mockFetchMatches([
      makeMatch({ id: 'm1', is_deadline_passed: true }),
    ])

    render(<PalpitesPage />)
    await waitFor(() => expect(screen.getByTestId('badge-fechado')).toBeInTheDocument())

    const homeInput = screen.getByTestId('input-home-m1') as HTMLInputElement
    expect(homeInput).toBeDisabled()
    // Deadline-passed match does not count as unsaved even if inputs change
    fireEvent.change(homeInput, { target: { value: '5' } })
    expect(screen.getByTestId('save-all-btn')).toBeDisabled()
  })

  it('shows empty state message when no matches match the current filter', async () => {
    const today = new Date()
    mockFetchMatches([
      makeMatch({ id: 'm1', match_date: today.toISOString() }),
    ])

    render(<PalpitesPage />)
    await waitFor(() => expect(screen.getAllByTestId('match-row')).toHaveLength(1))

    // Switch to "Amanhã" — no matches tomorrow
    fireEvent.click(screen.getByTestId('date-tab-tomorrow'))
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.queryByTestId('match-row')).not.toBeInTheDocument()
  })

  it('initialises score inputs from saved prediction values', async () => {
    mockFetchMatches([
      makeMatch({
        id: 'm1',
        prediction: { predicted_home_score: 3, predicted_away_score: 1 },
      }),
    ])

    render(<PalpitesPage />)
    await waitFor(() => expect(screen.getByTestId('input-home-m1')).toBeInTheDocument())

    const homeInput = screen.getByTestId('input-home-m1') as HTMLInputElement
    const awayInput = screen.getByTestId('input-away-m1') as HTMLInputElement
    expect(homeInput.value).toBe('3')
    expect(awayInput.value).toBe('1')
  })
})
