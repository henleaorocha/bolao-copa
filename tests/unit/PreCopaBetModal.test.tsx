/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PreCopaBetModal from '@/components/PreCopaBetModal'
import { FEATURED_TEAMS, ALL_COPA_TEAMS, BET_DEADLINE } from '@/lib/copa-teams'

vi.mock('next/image', () => ({
  default: function MockImage({ src, alt }: { src: string; alt: string }) {
    return <img src={src} alt={alt} />
  },
}))

const LEAGUE_ID = 'league-test-123'
const OTHER_TEAMS = ALL_COPA_TEAMS.slice(FEATURED_TEAMS.length)

function renderModal(onComplete = vi.fn()) {
  return render(<PreCopaBetModal leagueId={LEAGUE_ID} onComplete={onComplete} />)
}

async function selectTeam(user: ReturnType<typeof userEvent.setup>, code: string) {
  await user.click(screen.getByTestId(`team-card-${code}`))
}

async function navigateToStep2(
  user: ReturnType<typeof userEvent.setup>,
  champCode = 'br',
) {
  await selectTeam(user, champCode)
  await user.click(screen.getByRole('button', { name: /Escolher Vice/ }))
  await waitFor(() => expect(screen.getByText('E o vice-campeão?')).toBeInTheDocument())
}

async function navigateToStep3(
  user: ReturnType<typeof userEvent.setup>,
  champCode = 'br',
  viceCode = 'ar',
) {
  await navigateToStep2(user, champCode)
  await selectTeam(user, viceCode)
  await user.click(screen.getByRole('button', { name: /Revisar aposta/ }))
  await waitFor(() => expect(screen.getByText('Confirme sua aposta')).toBeInTheDocument())
}

describe('PreCopaBetModal', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    fetchSpy = vi.spyOn(global, 'fetch')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  // ─── Step 1 ───────────────────────────────────────────────────────────────

  it('step 1 renders "Quem leva a taça?" headline', () => {
    renderModal()
    expect(screen.getByText('Quem leva a taça?')).toBeInTheDocument()
  })

  it('step 1 renders all 12 featured team cards', () => {
    renderModal()
    expect(FEATURED_TEAMS).toHaveLength(12)
    for (const team of FEATURED_TEAMS) {
      expect(screen.getByTestId(`team-card-${team.code}`)).toBeInTheDocument()
    }
  })

  it('step 1 renders "Outras seleções" section with remaining non-featured teams', () => {
    renderModal()
    expect(screen.getByText('Outras seleções')).toBeInTheDocument()
    for (const team of OTHER_TEAMS) {
      expect(screen.getByTestId(`team-card-${team.code}`)).toBeInTheDocument()
    }
  })

  it('"Escolher Vice →" is disabled when no champion selected on step 1', () => {
    renderModal()
    expect(screen.getByRole('button', { name: /Escolher Vice/ })).toBeDisabled()
  })

  it('clicking a team card selects it and enables "Escolher Vice →"', async () => {
    const user = userEvent.setup()
    renderModal()
    expect(screen.getByRole('button', { name: /Escolher Vice/ })).toBeDisabled()
    await selectTeam(user, 'br')
    expect(screen.getByRole('button', { name: /Escolher Vice/ })).not.toBeDisabled()
  })

  // ─── Step 2 ───────────────────────────────────────────────────────────────

  it('after selecting champion and clicking CTA, step 2 renders "E o vice-campeão?"', async () => {
    const user = userEvent.setup()
    renderModal()
    await navigateToStep2(user)
    expect(screen.getByText('E o vice-campeão?')).toBeInTheDocument()
  })

  it('on step 2, the champion card is disabled and shows "CAMPEÃO" overlay', async () => {
    const user = userEvent.setup()
    renderModal()
    await navigateToStep2(user, 'br')
    const champCard = screen.getByTestId('team-card-br')
    expect(champCard).toBeDisabled()
    expect(champCard).toHaveTextContent('CAMPEÃO')
  })

  it('on step 2, clicking the disabled champion card does not select it as vice', async () => {
    const user = userEvent.setup()
    renderModal()
    await navigateToStep2(user, 'br')
    // Try clicking the disabled champion card — should be a no-op
    await user.click(screen.getByTestId('team-card-br'))
    // "Revisar aposta →" should remain disabled because no valid vice was selected
    expect(screen.getByRole('button', { name: /Revisar aposta/ })).toBeDisabled()
  })

  it('"Revisar aposta →" is disabled until a vice is selected on step 2', async () => {
    const user = userEvent.setup()
    renderModal()
    await navigateToStep2(user)
    expect(screen.getByRole('button', { name: /Revisar aposta/ })).toBeDisabled()
    await selectTeam(user, 'ar')
    expect(screen.getByRole('button', { name: /Revisar aposta/ })).not.toBeDisabled()
  })

  it('"← Voltar" on step 2 returns to step 1 with the champion still selected', async () => {
    const user = userEvent.setup()
    renderModal()
    await navigateToStep2(user, 'br')
    await user.click(screen.getByRole('button', { name: /Voltar/ }))
    await waitFor(() => expect(screen.getByText('Quem leva a taça?')).toBeInTheDocument())
    // Champion (Brasil) is still selected — the CTA must not be disabled
    expect(screen.getByRole('button', { name: /Escolher Vice/ })).not.toBeDisabled()
  })

  // ─── Step 3 ───────────────────────────────────────────────────────────────

  it('after selecting vice and clicking CTA, step 3 renders the confirmation summary', async () => {
    const user = userEvent.setup()
    renderModal()
    await navigateToStep3(user)
    expect(screen.getByText('Confirme sua aposta')).toBeInTheDocument()
  })

  it('step 3 shows champion name with "CAMPEÃO · +50 PTS"', async () => {
    const user = userEvent.setup()
    renderModal()
    await navigateToStep3(user, 'br', 'ar')
    expect(screen.getByText('CAMPEÃO · +50 PTS')).toBeInTheDocument()
    const label = screen.getByText('CAMPEÃO · +50 PTS')
    expect(label.closest('div')?.parentElement).toHaveTextContent('Brasil')
  })

  it('step 3 shows vice name with "VICE · +25 PTS"', async () => {
    const user = userEvent.setup()
    renderModal()
    await navigateToStep3(user, 'br', 'ar')
    expect(screen.getByText('VICE · +25 PTS')).toBeInTheDocument()
    const label = screen.getByText('VICE · +25 PTS')
    expect(label.closest('div')?.parentElement).toHaveTextContent('Argentina')
  })

  it('step 3 shows "Fecha em X dias" with the correct days until BET_DEADLINE', async () => {
    // Compute expected days at real-time; BET_DEADLINE is far enough in the future
    // that this calculation is stable within a single test run.
    const expectedDays = Math.ceil((BET_DEADLINE.getTime() - Date.now()) / 86400000)

    const user = userEvent.setup()
    renderModal()
    await navigateToStep3(user)

    const deadlineEl = screen.getByText(/Fecha em/)
    expect(deadlineEl.textContent).toContain(expectedDays.toString())
  })

  // ─── API call ─────────────────────────────────────────────────────────────

  it('"Confirmar aposta" calls PUT /api/leagues/{leagueId}/champion-bet with correct body', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success', data: {} }),
    } as Response)

    const user = userEvent.setup()
    renderModal()
    await navigateToStep3(user, 'br', 'ar')
    await user.click(screen.getByRole('button', { name: /Confirmar aposta/ }))

    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        `/api/leagues/${LEAGUE_ID}/champion-bet`,
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ champion_team: 'Brasil', runner_up_team: 'Argentina' }),
        }),
      ),
    )
  })

  it('while PUT is in flight, "Confirmar aposta" shows loading state and is not clickable', async () => {
    let resolveFetch!: () => void
    fetchSpy.mockReturnValue(
      new Promise<Response>(resolve => {
        resolveFetch = () =>
          resolve(
            new Response(JSON.stringify({ status: 'success', data: {} }), { status: 200 }),
          )
      }),
    )

    const user = userEvent.setup()
    renderModal()
    await navigateToStep3(user, 'br', 'ar')
    await user.click(screen.getByRole('button', { name: /Confirmar aposta/ }))

    await waitFor(() => expect(screen.getByText('Salvando...')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Salvando/ })).toBeDisabled()

    // Resolve so the test can clean up
    resolveFetch()
  })

  it('on successful PUT, onComplete() is called', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success', data: {} }),
    } as Response)

    const onComplete = vi.fn()
    const user = userEvent.setup()
    render(<PreCopaBetModal leagueId={LEAGUE_ID} onComplete={onComplete} />)
    await navigateToStep3(user, 'br', 'ar')
    await user.click(screen.getByRole('button', { name: /Confirmar aposta/ }))

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
  })

  it('on PUT failure, error message is shown and the button is re-enabled', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Erro ao salvar aposta. Tente novamente.' }),
    } as Response)

    const user = userEvent.setup()
    renderModal()
    await navigateToStep3(user, 'br', 'ar')
    await user.click(screen.getByRole('button', { name: /Confirmar aposta/ }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByRole('alert')).toHaveTextContent('Erro ao salvar aposta. Tente novamente.')
    expect(screen.getByRole('button', { name: /Confirmar aposta/ })).not.toBeDisabled()
  })

  // ─── Progress indicator ───────────────────────────────────────────────────
  // jsdom normalizes inline styles: #FFC72C → rgb(255, 199, 44)
  //                                rgba(255,255,255,0.4) → rgba(255, 255, 255, 0.4)
  const YELLOW = 'rgb(255, 199, 44)'
  const MUTED = 'rgba(255, 255, 255, 0.4)'

  it('progress indicator: on step 1, dash 1 is yellow and dashes 2–3 are muted', () => {
    renderModal()
    expect(screen.getByTestId('progress-dash-1').style.background).toBe(YELLOW)
    expect(screen.getByTestId('progress-dash-2').style.background).toBe(MUTED)
    expect(screen.getByTestId('progress-dash-3').style.background).toBe(MUTED)
  })

  it('progress indicator: on step 2, dash 2 is yellow', async () => {
    const user = userEvent.setup()
    renderModal()
    await navigateToStep2(user)
    expect(screen.getByTestId('progress-dash-1').style.background).toBe(MUTED)
    expect(screen.getByTestId('progress-dash-2').style.background).toBe(YELLOW)
    expect(screen.getByTestId('progress-dash-3').style.background).toBe(MUTED)
  })

  it('progress indicator: on step 3, dash 3 is yellow', async () => {
    const user = userEvent.setup()
    renderModal()
    await navigateToStep3(user)
    expect(screen.getByTestId('progress-dash-1').style.background).toBe(MUTED)
    expect(screen.getByTestId('progress-dash-2').style.background).toBe(MUTED)
    expect(screen.getByTestId('progress-dash-3').style.background).toBe(YELLOW)
  })
})
