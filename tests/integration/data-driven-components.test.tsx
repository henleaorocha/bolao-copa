/**
 * @vitest-environment jsdom
 *
 * Integration tests for data-driven panel components (StatsRow, PrizesStrip, RankingCard).
 * Verifies composed rendering with realistic data shapes including edge cases.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))
import StatsRow from '@/app/ligas/[id]/components/StatsRow'
import PrizesStrip from '@/app/ligas/[id]/components/PrizesStrip'
import RankingCard from '@/app/ligas/[id]/components/RankingCard'
import type { UserStats, RankingEntry } from '@/lib/api/types'

const zeroStats: UserStats = {
  position: 0,
  points: 0,
  guesses_made: 0,
  guesses_total: 0,
  exact_scores: 0,
}

const makeEntry = (overrides: Partial<RankingEntry> & { user_id: string; position: number }): RankingEntry => ({
  full_name: `Membro ${overrides.position}`,
  avatar_color: '#FFC72C',
  points: 0,
  ...overrides,
})

function PanelComposition({
  prizes,
  ranking,
  currentUserId,
  leagueId = 'test-league',
}: {
  prizes: string | null
  ranking: RankingEntry[]
  currentUserId: string
  leagueId?: string
}) {
  return (
    <div>
      <StatsRow user_stats={zeroStats} member_count={10} />
      <PrizesStrip prizes={prizes} />
      <RankingCard ranking={ranking} currentUserId={currentUserId} leagueId={leagueId} />
    </div>
  )
}

describe('Data-driven components — integration', () => {
  it('PrizesStrip is absent from DOM when prizes is null', () => {
    render(
      <PanelComposition
        prizes={null}
        ranking={[makeEntry({ user_id: 'u1', position: 1 })]}
        currentUserId="u1"
      />,
    )
    expect(screen.queryByText('Premiação')).not.toBeInTheDocument()
    expect(screen.getByText('Sua Posição')).toBeInTheDocument()
    expect(screen.getByText('Ranking')).toBeInTheDocument()
  })

  it('PrizesStrip is absent from DOM when prizes is empty string', () => {
    render(
      <PanelComposition
        prizes=""
        ranking={[makeEntry({ user_id: 'u1', position: 1 })]}
        currentUserId="u1"
      />,
    )
    expect(screen.queryByText('Premiação')).not.toBeInTheDocument()
  })

  it('PrizesStrip is present when prizes is a non-empty string', () => {
    render(
      <PanelComposition
        prizes="R$ 500 pro 1º"
        ranking={[makeEntry({ user_id: 'u1', position: 1 })]}
        currentUserId="u1"
      />,
    )
    expect(screen.getByText('Premiação')).toBeInTheDocument()
    expect(screen.getByText('R$ 500 pro 1º')).toBeInTheDocument()
  })

  it('renders correctly when ranking has only 2 entries (fewer than 5 members)', () => {
    const twoEntries: RankingEntry[] = [
      makeEntry({ user_id: 'u1', position: 1 }),
      makeEntry({ user_id: 'u2', position: 2 }),
    ]
    render(
      <PanelComposition prizes={null} ranking={twoEntries} currentUserId="u1" />,
    )
    expect(screen.getByText('Membro 1')).toBeInTheDocument()
    expect(screen.getByText('Membro 2')).toBeInTheDocument()
    expect(screen.queryByText('Membro 3')).not.toBeInTheDocument()
    expect(screen.getByTestId('gold-badge')).toBeInTheDocument()
    expect(screen.getByTestId('silver-badge')).toBeInTheDocument()
    expect(screen.queryByTestId('bronze-badge')).not.toBeInTheDocument()
  })

  it('full composition renders without throwing in pre-Copa state (all-zero stats)', () => {
    const fiveEntries = [1, 2, 3, 4, 5].map(i => makeEntry({ user_id: `u${i}`, position: i }))
    expect(() =>
      render(
        <PanelComposition prizes={null} ranking={fiveEntries} currentUserId="u3" />,
      ),
    ).not.toThrow()
  })
})
