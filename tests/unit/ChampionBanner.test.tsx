/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChampionBanner from '@/app/ligas/[id]/components/ChampionBanner'

vi.mock('@/components/PreCopaBetModal', () => ({
  default: ({ onComplete }: { onComplete: () => void }) => (
    <div data-testid="pre-copa-bet-modal">
      <button onClick={onComplete}>Confirmar</button>
    </div>
  ),
}))

const defaultProps = {
  has_champion_bet: false,
  leagueId: 'league-123',
  onBetComplete: vi.fn(),
}

describe('ChampionBanner', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders "Apostar Agora" button when has_champion_bet is false and before deadline', () => {
    render(<ChampionBanner {...defaultProps} has_champion_bet={false} />)
    expect(screen.getByRole('button', { name: 'Apostar Agora' })).toBeInTheDocument()
  })

  it('renders "Revisar Aposta" button when has_champion_bet is true and before deadline', () => {
    render(<ChampionBanner {...defaultProps} has_champion_bet={true} />)
    expect(screen.getByRole('button', { name: 'Revisar Aposta' })).toBeInTheDocument()
  })

  it('returns null (nothing rendered) when Date.now() is after BET_DEADLINE', () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2030-01-01T00:00:00.000Z').getTime())
    const { container } = render(<ChampionBanner {...defaultProps} />)
    expect(container.firstChild).toBeNull()
  })

  it('clicking CTA button renders PreCopaBetModal', async () => {
    const user = userEvent.setup()
    render(<ChampionBanner {...defaultProps} has_champion_bet={false} />)
    await user.click(screen.getByRole('button', { name: 'Apostar Agora' }))
    expect(screen.getByTestId('pre-copa-bet-modal')).toBeInTheDocument()
  })

  it('renders "ATENÇÃO" text in the banner', () => {
    render(<ChampionBanner {...defaultProps} />)
    expect(screen.getByText('ATENÇÃO')).toBeInTheDocument()
  })

  it('renders "PALPITE DE CAMPEÃO FECHA EM" text in the banner', () => {
    render(<ChampionBanner {...defaultProps} />)
    expect(screen.getByText('PALPITE DE CAMPEÃO FECHA EM')).toBeInTheDocument()
  })

  it('renders "México × África do Sul" text in the banner', () => {
    render(<ChampionBanner {...defaultProps} />)
    expect(screen.getByText(/México × África do Sul/)).toBeInTheDocument()
  })

  it('calls onBetComplete after PreCopaBetModal completes', async () => {
    const onBetComplete = vi.fn()
    const user = userEvent.setup()
    render(<ChampionBanner {...defaultProps} onBetComplete={onBetComplete} />)
    await user.click(screen.getByRole('button', { name: 'Apostar Agora' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(onBetComplete).toHaveBeenCalledOnce()
  })

  it('closes PreCopaBetModal after onComplete is called', async () => {
    const user = userEvent.setup()
    render(<ChampionBanner {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: 'Apostar Agora' }))
    expect(screen.getByTestId('pre-copa-bet-modal')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(screen.queryByTestId('pre-copa-bet-modal')).not.toBeInTheDocument()
  })
})
