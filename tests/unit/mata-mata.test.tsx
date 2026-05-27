/**
 * @vitest-environment jsdom
 *
 * Unit/component tests for the Mata-mata screen.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { useParams } from 'next/navigation'
import type { BracketSlotView, BracketResponse, BracketPhaseView } from '@/lib/bracket'
import type { KnockoutPhase } from '@/lib/bracket-skeleton'
import { PHASE_ORDER } from '@/lib/bracket-skeleton'
import { PHASE_MULTIPLIERS, PHASE_LABELS } from '@/lib/bracket'

vi.mock('next/navigation')
vi.mock('@/app/ligas/[id]/league-panel-context', () => {
  const setMataMataUnlock = vi.fn()
  return { useLeaguePanel: () => ({ setMataMataUnlock }) }
})
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

function makeSlot(overrides: Partial<BracketSlotView> = {}): BracketSlotView {
  return {
    pos: 1,
    state: 'placeholder',
    multiplier: 1.5,
    homeTeam: null,
    awayTeam: null,
    homeFlag: null,
    awayFlag: null,
    homeLabel: 'Vencedor 1º Grupo A',
    awayLabel: 'Vencedor 2º Grupo B',
    matchId: null,
    kickoff: null,
    homeScore: null,
    awayScore: null,
    prediction: null,
    ...overrides,
  }
}

function makePhase(
  phase: KnockoutPhase,
  slots: BracketSlotView[] = []
): BracketPhaseView {
  return {
    phase,
    label: PHASE_LABELS[phase],
    multiplier: PHASE_MULTIPLIERS[phase],
    slots,
  }
}

function makeBracketResponse(
  slotsByPhase: Partial<Record<KnockoutPhase, BracketSlotView[]>> = {}
): BracketResponse {
  return {
    phases: PHASE_ORDER.map((phase) =>
      makePhase(phase, slotsByPhase[phase] ?? [makeSlot({ pos: 1, multiplier: PHASE_MULTIPLIERS[phase] })])
    ),
    newlyUnlockedPhase: null,
  }
}

function mockBracketFetch(data: BracketResponse) {
  vi.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ status: 'success', data, timestamp: '' }),
  } as Response)
}

// ── Component imports ─────────────────────────────────────────────────────────
// Lazy imports to allow mocks to resolve first
async function importMatchCard() {
  const m = await import('@/app/ligas/[id]/mata-mata/components/MatchCard')
  return m.default
}
async function importPhaseSelector() {
  const m = await import('@/app/ligas/[id]/mata-mata/components/PhaseSelector')
  return m.default
}
async function importStatusBanner() {
  const m = await import('@/app/ligas/[id]/mata-mata/components/StatusBanner')
  return m.default
}
async function importUnlockBanner() {
  const m = await import('@/app/ligas/[id]/mata-mata/components/UnlockBanner')
  return m.default
}
async function importMataMataPage() {
  const m = await import('@/app/ligas/[id]/mata-mata/page')
  return m.default
}

// ── MatchCard unit tests ───────────────────────────────────────────────────────

describe('MatchCard — placeholder state', () => {
  afterEach(() => vi.restoreAllMocks())

  it('renders placeholder labels for home and away', async () => {
    const MatchCard = await importMatchCard()
    const slot = makeSlot({
      state: 'placeholder',
      homeLabel: 'Vencedor 1º Grupo A',
      awayLabel: 'Vencedor 2º Grupo B',
    })
    render(
      <MatchCard
        slot={slot}
        homeInput=""
        awayInput=""
        onInputChange={vi.fn()}
      />
    )
    expect(screen.getByTestId('home-display')).toHaveTextContent('Vencedor 1º Grupo A')
    expect(screen.getByTestId('away-display')).toHaveTextContent('Vencedor 2º Grupo B')
  })

  it('shows A DEFINIR badge for placeholder state', async () => {
    const MatchCard = await importMatchCard()
    render(
      <MatchCard
        slot={makeSlot({ state: 'placeholder' })}
        homeInput=""
        awayInput=""
        onInputChange={vi.fn()}
      />
    )
    expect(screen.getByTestId('badge-placeholder')).toBeInTheDocument()
  })

  it('shows no bet affordance (no inputs) for placeholder state', async () => {
    const MatchCard = await importMatchCard()
    const slot = makeSlot({ state: 'placeholder', matchId: null })
    render(
      <MatchCard
        slot={slot}
        homeInput=""
        awayInput=""
        onInputChange={vi.fn()}
      />
    )
    expect(screen.queryByTestId('prediction-inputs')).not.toBeInTheDocument()
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
  })
})

describe('MatchCard — open state', () => {
  afterEach(() => vi.restoreAllMocks())

  it('renders real team names', async () => {
    const MatchCard = await importMatchCard()
    const slot = makeSlot({
      state: 'open',
      matchId: 'match-1',
      homeTeam: 'Brasil',
      awayTeam: 'Argentina',
      homeFlag: 'br',
      awayFlag: 'ar',
      kickoff: '2026-06-28T21:00:00Z',
    })
    render(
      <MatchCard
        slot={slot}
        homeInput=""
        awayInput=""
        onInputChange={vi.fn()}
      />
    )
    expect(screen.getByTestId('home-display')).toHaveTextContent('Brasil')
    expect(screen.getByTestId('away-display')).toHaveTextContent('Argentina')
  })

  it('shows ABERTO badge', async () => {
    const MatchCard = await importMatchCard()
    render(
      <MatchCard
        slot={makeSlot({ state: 'open', matchId: 'match-1', homeTeam: 'Brasil', awayTeam: 'Argentina' })}
        homeInput=""
        awayInput=""
        onInputChange={vi.fn()}
      />
    )
    expect(screen.getByTestId('badge-open')).toBeInTheDocument()
  })

  it('renders editable score inputs for open matches', async () => {
    const MatchCard = await importMatchCard()
    const slot = makeSlot({
      state: 'open',
      matchId: 'match-1',
      homeTeam: 'Brasil',
      awayTeam: 'Argentina',
    })
    render(
      <MatchCard
        slot={slot}
        homeInput="2"
        awayInput="1"
        onInputChange={vi.fn()}
      />
    )
    const homeInput = screen.getByTestId('input-home-match-1') as HTMLInputElement
    const awayInput = screen.getByTestId('input-away-match-1') as HTMLInputElement
    expect(homeInput).toBeInTheDocument()
    expect(awayInput).toBeInTheDocument()
    expect(homeInput.value).toBe('2')
    expect(awayInput.value).toBe('1')
    expect(homeInput).not.toBeDisabled()
    expect(awayInput).not.toBeDisabled()
  })

  it('calls onInputChange when home input changes', async () => {
    const MatchCard = await importMatchCard()
    const onInputChange = vi.fn()
    render(
      <MatchCard
        slot={makeSlot({ state: 'open', matchId: 'match-1', homeTeam: 'Brasil', awayTeam: 'Argentina' })}
        homeInput=""
        awayInput=""
        onInputChange={onInputChange}
      />
    )
    fireEvent.change(screen.getByTestId('input-home-match-1'), { target: { value: '3' } })
    expect(onInputChange).toHaveBeenCalledWith('match-1', 'home', '3')
  })

  it('calls onInputChange when away input changes', async () => {
    const MatchCard = await importMatchCard()
    const onInputChange = vi.fn()
    render(
      <MatchCard
        slot={makeSlot({ state: 'open', matchId: 'match-1', homeTeam: 'Brasil', awayTeam: 'Argentina' })}
        homeInput=""
        awayInput=""
        onInputChange={onInputChange}
      />
    )
    fireEvent.change(screen.getByTestId('input-away-match-1'), { target: { value: '0' } })
    expect(onInputChange).toHaveBeenCalledWith('match-1', 'away', '0')
  })
})

describe('MatchCard — locked state', () => {
  afterEach(() => vi.restoreAllMocks())

  it('renders real teams but no prediction inputs', async () => {
    const MatchCard = await importMatchCard()
    render(
      <MatchCard
        slot={makeSlot({
          state: 'locked',
          matchId: 'match-1',
          homeTeam: 'França',
          awayTeam: 'Alemanha',
          homeFlag: 'fr',
          awayFlag: 'de',
          kickoff: '2026-07-07T18:00:00Z',
        })}
        homeInput=""
        awayInput=""
        onInputChange={vi.fn()}
      />
    )
    expect(screen.getByTestId('home-display')).toHaveTextContent('França')
    expect(screen.getByTestId('away-display')).toHaveTextContent('Alemanha')
    expect(screen.queryByTestId('prediction-inputs')).not.toBeInTheDocument()
    expect(screen.getByTestId('badge-locked')).toBeInTheDocument()
  })

  it('shows saved prediction read-only when locked and prediction exists', async () => {
    const MatchCard = await importMatchCard()
    render(
      <MatchCard
        slot={makeSlot({
          state: 'locked',
          matchId: 'match-1',
          homeTeam: 'França',
          awayTeam: 'Alemanha',
          prediction: { home: 2, away: 1 },
        })}
        homeInput="2"
        awayInput="1"
        onInputChange={vi.fn()}
      />
    )
    expect(screen.getByTestId('locked-prediction')).toBeInTheDocument()
    expect(screen.getByTestId('locked-prediction-score')).toHaveTextContent('2 × 1')
  })
})

describe('MatchCard — finished state', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows ENCERRADO badge and final scores', async () => {
    const MatchCard = await importMatchCard()
    render(
      <MatchCard
        slot={makeSlot({
          state: 'finished',
          matchId: 'match-1',
          homeTeam: 'Espanha',
          awayTeam: 'Portugal',
          homeFlag: 'es',
          awayFlag: 'pt',
          homeScore: 2,
          awayScore: 1,
        })}
        homeInput=""
        awayInput=""
        onInputChange={vi.fn()}
      />
    )
    expect(screen.getByTestId('badge-finished')).toBeInTheDocument()
    expect(screen.getByTestId('finished-scores')).toBeInTheDocument()
    expect(screen.getByTestId('final-score')).toHaveTextContent('2 × 1')
  })

  it('shows no prediction inputs for finished matches', async () => {
    const MatchCard = await importMatchCard()
    render(
      <MatchCard
        slot={makeSlot({
          state: 'finished',
          matchId: 'match-1',
          homeTeam: 'Brasil',
          awayTeam: 'França',
          homeScore: 1,
          awayScore: 0,
        })}
        homeInput=""
        awayInput=""
        onInputChange={vi.fn()}
      />
    )
    expect(screen.queryByTestId('prediction-inputs')).not.toBeInTheDocument()
  })

  it('shows user prediction alongside final score when available', async () => {
    const MatchCard = await importMatchCard()
    render(
      <MatchCard
        slot={makeSlot({
          state: 'finished',
          matchId: 'match-1',
          homeTeam: 'Brasil',
          awayTeam: 'França',
          homeScore: 2,
          awayScore: 0,
          prediction: { home: 2, away: 0 },
        })}
        homeInput=""
        awayInput=""
        onInputChange={vi.fn()}
      />
    )
    expect(screen.getByTestId('finished-prediction')).toHaveTextContent('2 × 0')
  })
})

// ── PhaseSelector unit tests ──────────────────────────────────────────────────

describe('PhaseSelector', () => {
  afterEach(() => vi.restoreAllMocks())

  it('renders all 6 phase chips', async () => {
    const PhaseSelector = await importPhaseSelector()
    const phases = PHASE_ORDER.map((phase) => makePhase(phase))
    render(
      <PhaseSelector phases={phases} selectedPhase="32nd" onPhaseChange={vi.fn()} />
    )
    for (const phase of PHASE_ORDER) {
      expect(screen.getByTestId(`phase-chip-${phase}`)).toBeInTheDocument()
    }
  })

  it('32nd phase chip is active by default', async () => {
    const PhaseSelector = await importPhaseSelector()
    const phases = PHASE_ORDER.map((phase) => makePhase(phase))
    render(
      <PhaseSelector phases={phases} selectedPhase="32nd" onPhaseChange={vi.fn()} />
    )
    const chip = screen.getByTestId('phase-chip-32nd')
    expect(chip).toHaveAttribute('aria-selected', 'true')
    // Other chips are not selected
    expect(screen.getByTestId('phase-chip-16th')).toHaveAttribute('aria-selected', 'false')
  })

  it('shows "32 avos" label in chip for the 32nd phase', async () => {
    const PhaseSelector = await importPhaseSelector()
    const phases = PHASE_ORDER.map((phase) => makePhase(phase))
    render(
      <PhaseSelector phases={phases} selectedPhase="32nd" onPhaseChange={vi.fn()} />
    )
    expect(screen.getByTestId('phase-chip-32nd')).toHaveTextContent('32 avos')
  })

  it('calls onPhaseChange with the selected phase when a chip is clicked', async () => {
    const PhaseSelector = await importPhaseSelector()
    const onPhaseChange = vi.fn()
    const phases = PHASE_ORDER.map((phase) => makePhase(phase))
    render(
      <PhaseSelector phases={phases} selectedPhase="32nd" onPhaseChange={onPhaseChange} />
    )
    fireEvent.click(screen.getByTestId('phase-chip-16th'))
    expect(onPhaseChange).toHaveBeenCalledWith('16th')
  })

  it('switching phase chip updates aria-selected', async () => {
    const PhaseSelector = await importPhaseSelector()
    const phases = PHASE_ORDER.map((phase) => makePhase(phase))
    const { rerender } = render(
      <PhaseSelector phases={phases} selectedPhase="32nd" onPhaseChange={vi.fn()} />
    )
    expect(screen.getByTestId('phase-chip-32nd')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('phase-chip-8th')).toHaveAttribute('aria-selected', 'false')

    rerender(
      <PhaseSelector phases={phases} selectedPhase="8th" onPhaseChange={vi.fn()} />
    )
    expect(screen.getByTestId('phase-chip-32nd')).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByTestId('phase-chip-8th')).toHaveAttribute('aria-selected', 'true')
  })

  it('has role=tablist on the container', async () => {
    const PhaseSelector = await importPhaseSelector()
    const phases = PHASE_ORDER.map((phase) => makePhase(phase))
    render(
      <PhaseSelector phases={phases} selectedPhase="32nd" onPhaseChange={vi.fn()} />
    )
    expect(screen.getByTestId('phase-selector')).toHaveAttribute('role', 'tablist')
  })
})

// ── StatusBanner unit tests ───────────────────────────────────────────────────

describe('StatusBanner', () => {
  it('renders the exact PRD pre-launch copy', async () => {
    const StatusBanner = await importStatusBanner()
    render(<StatusBanner />)
    const banner = screen.getByTestId('status-banner-text')
    expect(banner).toHaveTextContent(
      'Mata-mata começa em 28 de junho — Os confrontos são definidos após a fase de grupos. Você poderá palpitar conforme cada fase libera.'
    )
  })

  it('has role=status for screen-reader accessibility', async () => {
    const StatusBanner = await importStatusBanner()
    render(<StatusBanner />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})

// ── MataMataPage integration tests ───────────────────────────────────────────

describe('MataMataPage — header + banner', () => {
  beforeEach(() => {
    vi.mocked(useParams as ReturnType<typeof vi.fn>).mockReturnValue({ id: LEAGUE_ID })
  })
  afterEach(() => vi.restoreAllMocks())

  it('renders the exact header label, title, and subtitle from the PRD', async () => {
    mockBracketFetch(makeBracketResponse())
    const MataMataPage = await importMataMataPage()
    render(<MataMataPage />)

    await waitFor(() => expect(screen.getByTestId('header-label')).toBeInTheDocument())

    expect(screen.getByTestId('header-label')).toHaveTextContent('ELIMINATÓRIAS · 6 FASES')
    expect(screen.getByTestId('header-title')).toHaveTextContent('Chaveamento')
    expect(screen.getByTestId('header-subtitle')).toHaveTextContent(
      'A partir das eliminatórias, cada palpite vale mais pontos'
    )
  })

  it('renders the pre-launch status banner', async () => {
    mockBracketFetch(makeBracketResponse())
    const MataMataPage = await importMataMataPage()
    render(<MataMataPage />)

    await waitFor(() => expect(screen.getByTestId('status-banner')).toBeInTheDocument())
    expect(screen.getByTestId('status-banner-text')).toHaveTextContent(
      'Mata-mata começa em 28 de junho'
    )
  })
})

describe('MataMataPage — phase selector', () => {
  beforeEach(() => {
    vi.mocked(useParams as ReturnType<typeof vi.fn>).mockReturnValue({ id: LEAGUE_ID })
  })
  afterEach(() => vi.restoreAllMocks())

  it('defaults to 32nd phase on load', async () => {
    mockBracketFetch(makeBracketResponse())
    const MataMataPage = await importMataMataPage()
    render(<MataMataPage />)

    await waitFor(() => expect(screen.getByTestId('phase-chip-32nd')).toBeInTheDocument())
    expect(screen.getByTestId('phase-chip-32nd')).toHaveAttribute('aria-selected', 'true')
  })

  it('switches to the clicked phase', async () => {
    const bracket = makeBracketResponse({
      '16th': [
        makeSlot({
          pos: 1,
          state: 'placeholder',
          multiplier: 2,
          homeLabel: 'Vencedor 1/32 #1',
          awayLabel: 'Vencedor 1/32 #2',
        }),
      ],
    })
    mockBracketFetch(bracket)
    const MataMataPage = await importMataMataPage()
    render(<MataMataPage />)

    await waitFor(() => expect(screen.getByTestId('phase-chip-16th')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('phase-chip-16th'))

    expect(screen.getByTestId('phase-chip-16th')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('phase-chip-32nd')).toHaveAttribute('aria-selected', 'false')
  })
})

describe('MataMataPage — prediction submission', () => {
  beforeEach(() => {
    vi.mocked(useParams as ReturnType<typeof vi.fn>).mockReturnValue({ id: LEAGUE_ID })
  })
  afterEach(() => vi.restoreAllMocks())

  it('calls PUT /predictions/[matchId] when saving an open match and reflects the saved value', async () => {
    const openSlot = makeSlot({
      pos: 1,
      state: 'open',
      matchId: 'match-open-1',
      homeTeam: 'Brasil',
      awayTeam: 'México',
      homeFlag: 'br',
      awayFlag: 'mx',
      kickoff: '2026-06-28T21:00:00Z',
      multiplier: 1.5,
      prediction: null,
    })

    const bracket = makeBracketResponse({ '32nd': [openSlot] })

    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      const urlStr = String(url)
      if (urlStr.includes('/bracket')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'success', data: bracket, timestamp: '' }),
        } as Response)
      }
      if (urlStr.includes('/predictions/match-open-1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: 'success', data: {} }),
        } as Response)
      }
      return Promise.reject(new Error(`Unexpected fetch: ${urlStr}`))
    })

    const MataMataPage = await importMataMataPage()
    render(<MataMataPage />)

    await waitFor(() => expect(screen.getByTestId('input-home-match-open-1')).toBeInTheDocument())

    // Initially save button is disabled
    expect(screen.getByTestId('save-all-btn')).toBeDisabled()

    // Enter scores
    fireEvent.change(screen.getByTestId('input-home-match-open-1'), { target: { value: '2' } })
    fireEvent.change(screen.getByTestId('input-away-match-open-1'), { target: { value: '1' } })

    expect(screen.getByTestId('save-all-btn')).not.toBeDisabled()

    // Save
    fireEvent.click(screen.getByTestId('save-all-btn'))

    await waitFor(() => {
      const calls = vi.mocked(global.fetch).mock.calls.map(([url]) => String(url))
      expect(calls.some((u) => u.includes('/predictions/match-open-1'))).toBe(true)
    })

    // Verify PUT payload
    const putCall = vi.mocked(global.fetch).mock.calls.find(([url]) =>
      String(url).includes('/predictions/match-open-1')
    )!
    expect(putCall[1]?.method).toBe('PUT')
    expect(JSON.parse(putCall[1]?.body as string)).toEqual({
      home_score: 2,
      away_score: 1,
    })
  })

  it('save button is disabled when no open match inputs have been modified', async () => {
    const bracket = makeBracketResponse({
      '32nd': [makeSlot({ pos: 1, state: 'placeholder' })],
    })
    mockBracketFetch(bracket)
    const MataMataPage = await importMataMataPage()
    render(<MataMataPage />)

    await waitFor(() => expect(screen.getByTestId('save-all-btn')).toBeInTheDocument())
    expect(screen.getByTestId('save-all-btn')).toBeDisabled()
  })
})

// ── UnlockBanner unit tests ───────────────────────────────────────────────────

describe('UnlockBanner', () => {
  afterEach(() => vi.restoreAllMocks())

  it('renders nothing when newlyUnlockedPhase is null', async () => {
    const UnlockBanner = await importUnlockBanner()
    const { container } = render(<UnlockBanner newlyUnlockedPhase={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the banner when newlyUnlockedPhase is set', async () => {
    const UnlockBanner = await importUnlockBanner()
    render(<UnlockBanner newlyUnlockedPhase="32nd" />)
    expect(screen.getByTestId('unlock-banner')).toBeInTheDocument()
  })

  it('renders "32 avos liberado!" for the 32nd phase', async () => {
    const UnlockBanner = await importUnlockBanner()
    render(<UnlockBanner newlyUnlockedPhase="32nd" />)
    expect(screen.getByTestId('unlock-banner-text')).toHaveTextContent('32 avos liberado!')
  })

  it('renders "Oitavas liberado!" for the 16th phase', async () => {
    const UnlockBanner = await importUnlockBanner()
    render(<UnlockBanner newlyUnlockedPhase="16th" />)
    expect(screen.getByTestId('unlock-banner-text')).toHaveTextContent('Oitavas liberado!')
  })

  it('renders "Quartas liberado!" for the 8th phase', async () => {
    const UnlockBanner = await importUnlockBanner()
    render(<UnlockBanner newlyUnlockedPhase="8th" />)
    expect(screen.getByTestId('unlock-banner-text')).toHaveTextContent('Quartas liberado!')
  })

  it('renders "Final liberado!" for the final phase', async () => {
    const UnlockBanner = await importUnlockBanner()
    render(<UnlockBanner newlyUnlockedPhase="final" />)
    expect(screen.getByTestId('unlock-banner-text')).toHaveTextContent('Final liberado!')
  })

  it('has role=alert for screen-reader accessibility', async () => {
    const UnlockBanner = await importUnlockBanner()
    render(<UnlockBanner newlyUnlockedPhase="semi" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('clears (renders nothing) when newlyUnlockedPhase transitions from set to null', async () => {
    const UnlockBanner = await importUnlockBanner()
    const { rerender } = render(<UnlockBanner newlyUnlockedPhase="32nd" />)
    expect(screen.getByTestId('unlock-banner')).toBeInTheDocument()
    rerender(<UnlockBanner newlyUnlockedPhase={null} />)
    expect(screen.queryByTestId('unlock-banner')).not.toBeInTheDocument()
  })
})

// ── MataMataPage — unlock banner integration ──────────────────────────────────

describe('MataMataPage — unlock banner', () => {
  beforeEach(() => {
    vi.mocked(useParams as ReturnType<typeof vi.fn>).mockReturnValue({ id: LEAGUE_ID })
  })
  afterEach(() => vi.restoreAllMocks())

  it('shows the unlock banner when newlyUnlockedPhase is "32nd"', async () => {
    const bracket: BracketResponse = { ...makeBracketResponse(), newlyUnlockedPhase: '32nd' }
    mockBracketFetch(bracket)
    const MataMataPage = await importMataMataPage()
    render(<MataMataPage />)

    await waitFor(() => expect(screen.getByTestId('unlock-banner')).toBeInTheDocument())
    expect(screen.getByTestId('unlock-banner-text')).toHaveTextContent('32 avos liberado!')
  })

  it('does not show the unlock banner when newlyUnlockedPhase is null', async () => {
    mockBracketFetch(makeBracketResponse())
    const MataMataPage = await importMataMataPage()
    render(<MataMataPage />)

    await waitFor(() => expect(screen.getByTestId('header-label')).toBeInTheDocument())
    expect(screen.queryByTestId('unlock-banner')).not.toBeInTheDocument()
  })

  it('shows unlock banner with correct phase name for "semi"', async () => {
    const bracket: BracketResponse = { ...makeBracketResponse(), newlyUnlockedPhase: 'semi' }
    mockBracketFetch(bracket)
    const MataMataPage = await importMataMataPage()
    render(<MataMataPage />)

    await waitFor(() => expect(screen.getByTestId('unlock-banner')).toBeInTheDocument())
    expect(screen.getByTestId('unlock-banner-text')).toHaveTextContent('Semifinal liberado!')
  })
})
