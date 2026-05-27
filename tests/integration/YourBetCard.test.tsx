/**
 * @vitest-environment jsdom
 *
 * Integration tests for YourBetCard visibility and modal integration.
 * No live server needed — component is rendered with jsdom.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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

const validBet: ChampionBet = {
  id: 'bet-integration-1',
  user_id: 'user-integration-1',
  league_id: 'league-integration-1',
  champion_team: 'Brasil',
  runner_up_team: 'Argentina',
  created_at: '2026-05-01T00:00:00Z',
  updated_at: '2026-05-01T00:00:00Z',
}

describe('YourBetCard — integration', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('card is absent from DOM when has_champion_bet is false', () => {
    const { container } = render(
      <YourBetCard
        has_champion_bet={false}
        champion_bet={null}
        leagueId="league-integration-1"
        onBetComplete={vi.fn()}
      />,
    )
    expect(container.firstChild).toBeNull()
    expect(screen.queryByText('+50 PTS')).not.toBeInTheDocument()
    expect(screen.queryByText('SUA APOSTA PRÉ-COPA')).not.toBeInTheDocument()
  })

  it('card renders without error when has_champion_bet is true with valid champion_bet', () => {
    expect(() =>
      render(
        <YourBetCard
          has_champion_bet={true}
          champion_bet={validBet}
          leagueId="league-integration-1"
          onBetComplete={vi.fn()}
        />,
      ),
    ).not.toThrow()
    expect(screen.getByText('Brasil')).toBeInTheDocument()
    expect(screen.getByText('Argentina')).toBeInTheDocument()
    expect(screen.getByText('+50 PTS')).toBeInTheDocument()
  })
})
