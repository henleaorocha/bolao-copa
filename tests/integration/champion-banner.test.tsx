/**
 * @vitest-environment jsdom
 *
 * Integration tests for ChampionBanner banner state transitions.
 * No live server needed — component is rendered with jsdom.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ChampionBanner from '@/app/ligas/[id]/components/ChampionBanner'

vi.mock('@/components/PreCopaBetModal', () => ({
  default: ({ onComplete }: { onComplete: () => void }) => (
    <div data-testid="pre-copa-bet-modal">
      <button onClick={onComplete}>Confirmar</button>
    </div>
  ),
}))

const baseProps = {
  has_champion_bet: false,
  leagueId: 'league-integration-test',
  onBetComplete: vi.fn(),
}

describe('ChampionBanner — banner state transitions', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('banner is not present in the rendered page when the date is past BET_DEADLINE', () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2030-01-01T00:00:00.000Z').getTime())
    const { container } = render(<ChampionBanner {...baseProps} />)
    expect(container.firstChild).toBeNull()
    expect(screen.queryByText('ATENÇÃO')).not.toBeInTheDocument()
    expect(screen.queryByText('PALPITE DE CAMPEÃO FECHA EM')).not.toBeInTheDocument()
  })

  it('banner is present when the date is before BET_DEADLINE', () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-01-01T00:00:00.000Z').getTime())
    render(<ChampionBanner {...baseProps} />)
    expect(screen.getByText('ATENÇÃO')).toBeInTheDocument()
    expect(screen.getByText('PALPITE DE CAMPEÃO FECHA EM')).toBeInTheDocument()
  })

  it('CTA label transitions from "Apostar Agora" to "Revisar Aposta" when has_champion_bet changes', () => {
    const { rerender } = render(<ChampionBanner {...baseProps} has_champion_bet={false} />)
    expect(screen.getByRole('button', { name: 'Apostar Agora' })).toBeInTheDocument()

    rerender(<ChampionBanner {...baseProps} has_champion_bet={true} />)
    expect(screen.getByRole('button', { name: 'Revisar Aposta' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apostar Agora' })).not.toBeInTheDocument()
  })
})
