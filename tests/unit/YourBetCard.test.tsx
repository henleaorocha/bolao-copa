/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import YourBetCard from '@/app/ligas/[id]/components/YourBetCard'
import type { ChampionBet } from '@/lib/api/types'

vi.mock('next/image', () => ({
  default: function MockImage({ src, alt }: { src: string; alt: string }) {
    return <img src={src} alt={alt} />
  },
}))

vi.mock('@/components/PreCopaBetModal', () => ({
  default: ({ onComplete }: { onComplete: () => void }) => (
    <div data-testid="pre-copa-bet-modal">
      <button onClick={onComplete}>Confirmar</button>
    </div>
  ),
}))

const mockBet: ChampionBet = {
  id: 'bet-1',
  user_id: 'user-1',
  league_id: 'league-123',
  champion_team: 'Brasil',
  runner_up_team: 'Argentina',
  created_at: '2026-05-01T00:00:00Z',
  updated_at: '2026-05-01T00:00:00Z',
}

const defaultProps = {
  has_champion_bet: true,
  champion_bet: mockBet,
  leagueId: 'league-123',
  onBetComplete: vi.fn(),
}

describe('YourBetCard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders nothing when has_champion_bet is false', () => {
    const { container } = render(
      <YourBetCard {...defaultProps} has_champion_bet={false} champion_bet={null} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders champion team name when has_champion_bet is true', () => {
    render(<YourBetCard {...defaultProps} />)
    expect(screen.getByText('Brasil')).toBeInTheDocument()
  })

  it('renders runner-up team name when has_champion_bet is true', () => {
    render(<YourBetCard {...defaultProps} />)
    expect(screen.getByText('Argentina')).toBeInTheDocument()
  })

  it('renders "+50 PTS" badge when has_champion_bet is true', () => {
    render(<YourBetCard {...defaultProps} />)
    expect(screen.getByText('+50 PTS')).toBeInTheDocument()
  })

  it('renders flag images using flagcdn.com pattern', () => {
    render(<YourBetCard {...defaultProps} />)
    const imgs = screen.getAllByRole('img')
    expect(imgs.some(img => img.getAttribute('src')?.includes('flagcdn.com/w80/br.png'))).toBe(true)
    expect(imgs.some(img => img.getAttribute('src')?.includes('flagcdn.com/w80/ar.png'))).toBe(true)
  })

  it('renders "Alterar aposta" button when current date is before BET_DEADLINE', () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-01-01T00:00:00.000Z').getTime())
    render(<YourBetCard {...defaultProps} />)
    expect(screen.getByRole('button', { name: /Alterar aposta/ })).toBeInTheDocument()
  })

  it('does not render "Alterar aposta" button when current date is after BET_DEADLINE', () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2030-01-01T00:00:00.000Z').getTime())
    render(<YourBetCard {...defaultProps} />)
    expect(screen.queryByRole('button', { name: /Alterar aposta/ })).not.toBeInTheDocument()
  })

  it('clicking "Alterar aposta" opens PreCopaBetModal', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-01-01T00:00:00.000Z').getTime())
    const user = userEvent.setup()
    render(<YourBetCard {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Alterar aposta/ }))
    expect(screen.getByTestId('pre-copa-bet-modal')).toBeInTheDocument()
  })

  it('calls onBetComplete after PreCopaBetModal completes', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-01-01T00:00:00.000Z').getTime())
    const onBetComplete = vi.fn()
    const user = userEvent.setup()
    render(<YourBetCard {...defaultProps} onBetComplete={onBetComplete} />)
    await user.click(screen.getByRole('button', { name: /Alterar aposta/ }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(onBetComplete).toHaveBeenCalledOnce()
  })

  it('closes PreCopaBetModal after onComplete is called', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-01-01T00:00:00.000Z').getTime())
    const user = userEvent.setup()
    render(<YourBetCard {...defaultProps} />)
    await user.click(screen.getByRole('button', { name: /Alterar aposta/ }))
    expect(screen.getByTestId('pre-copa-bet-modal')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(screen.queryByTestId('pre-copa-bet-modal')).not.toBeInTheDocument()
  })
})
