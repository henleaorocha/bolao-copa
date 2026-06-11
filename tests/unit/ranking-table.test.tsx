/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import RankingTable from '@/app/ligas/[id]/ranking/RankingTable'
import type { RankingFullEntry } from '@/lib/api/types'

function makeEntry(overrides: Partial<RankingFullEntry> = {}): RankingFullEntry {
  return {
    user_id: 'user-1',
    full_name: 'Ana Silva',
    avatar_color: '#FF5733',
    points: 100,
    position: 1,
    exact_scores: 3,
    correct_outcomes: 8,
    champion_team: null,
    runner_up_team: null,
    ...overrides,
  }
}

const EIGHT_MEMBERS: RankingFullEntry[] = [
  makeEntry({ user_id: 'user-1', full_name: 'Ana Silva', position: 1, points: 100 }),
  makeEntry({ user_id: 'user-2', full_name: 'Bruno Costa', position: 2, points: 90, avatar_color: '#33C1FF' }),
  makeEntry({ user_id: 'user-3', full_name: 'Carla Rocha', position: 3, points: 80, avatar_color: '#6BFF33' }),
  makeEntry({ user_id: 'user-4', full_name: 'Diego Lima', position: 4, points: 70, avatar_color: '#FF33B5' }),
  makeEntry({ user_id: 'user-5', full_name: 'Eva Santos', position: 5, points: 60, avatar_color: '#33FF6B' }),
  makeEntry({ user_id: 'user-6', full_name: 'Fábio Torres', position: 6, points: 50, avatar_color: '#B533FF' }),
  makeEntry({ user_id: 'user-7', full_name: 'Gabi Melo', position: 7, points: 40, avatar_color: '#FF8C33' }),
  makeEntry({ user_id: 'user-8', full_name: 'Hugo Dias', position: 8, points: 30, avatar_color: '#33B5FF' }),
]

describe('RankingTable', () => {
  it('renders one row per provided member in the given order', () => {
    render(<RankingTable ranking={EIGHT_MEMBERS} currentUserId="other-user" />)
    const rows = screen.getAllByTestId(/^(self|member)-row$/)
    expect(rows).toHaveLength(8)
    expect(within(rows[0]).getByText('Ana Silva')).toBeInTheDocument()
    expect(within(rows[7]).getByText('Hugo Dias')).toBeInTheDocument()
  })

  it('highlights the self row with bg-yellow-50 and renders Você badge', () => {
    render(<RankingTable ranking={EIGHT_MEMBERS} currentUserId="user-3" />)
    const selfRow = screen.getByTestId('self-row')
    expect(selfRow).toHaveClass('bg-yellow-50')
    expect(within(selfRow).getByTestId('voce-badge')).toBeInTheDocument()
    expect(within(selfRow).getByText('Você')).toBeInTheDocument()
  })

  it('does not render Você badge or bg-yellow-50 on rows that are not the current user', () => {
    render(<RankingTable ranking={EIGHT_MEMBERS} currentUserId="user-3" />)
    const memberRows = screen.getAllByTestId('member-row')
    memberRows.forEach((row) => {
      expect(within(row).queryByTestId('voce-badge')).not.toBeInTheDocument()
      expect(row).not.toHaveClass('bg-yellow-50')
    })
  })

  it('applies gold badge for position 1, silver for 2, bronze for 3, neutral for 4', () => {
    const fourMembers = EIGHT_MEMBERS.slice(0, 4)
    render(<RankingTable ranking={fourMembers} currentUserId="other-user" />)

    const goldBadge = screen.getByTestId('gold-badge')
    expect(goldBadge).toHaveClass('bg-yellow-400')
    expect(goldBadge).toHaveClass('text-yellow-900')

    const silverBadge = screen.getByTestId('silver-badge')
    expect(silverBadge).toHaveClass('bg-slate-300')
    expect(silverBadge).toHaveClass('text-slate-700')

    const bronzeBadge = screen.getByTestId('bronze-badge')
    expect(bronzeBadge).toHaveClass('bg-orange-300')
    expect(bronzeBadge).toHaveClass('text-orange-900')

    const neutralBadge = screen.getByTestId('neutral-badge')
    expect(neutralBadge).toHaveClass('bg-slate-100')
  })

  it('desktop columns (Exatos/Acertos) are present in DOM with correct values', () => {
    const entry = makeEntry({ exact_scores: 5, correct_outcomes: 12 })
    render(<RankingTable ranking={[entry]} currentUserId="other-user" />)

    const exatosHeader = screen.getByTestId('exatos-header')
    expect(exatosHeader).toBeInTheDocument()
    expect(exatosHeader).toHaveClass('hidden')

    const acertosHeader = screen.getByTestId('acertos-header')
    expect(acertosHeader).toBeInTheDocument()
    expect(acertosHeader).toHaveClass('hidden')

    const exactCell = screen.getByTestId('desktop-exact-cell')
    expect(exactCell).toHaveTextContent('5')

    const outcomeCell = screen.getByTestId('desktop-outcome-cell')
    expect(outcomeCell).toHaveTextContent('12')
  })

  it('mobile sub-text carries the exact and outcome counts', () => {
    const entry = makeEntry({ exact_scores: 5, correct_outcomes: 12 })
    render(<RankingTable ranking={[entry]} currentUserId="other-user" />)

    const mobileSubtext = screen.getByTestId('mobile-subtext')
    expect(mobileSubtext).toBeInTheDocument()
    expect(mobileSubtext).toHaveClass('lg:hidden')

    expect(within(mobileSubtext).getByTestId('mobile-exact-count')).toHaveTextContent('5')
    expect(within(mobileSubtext).getByTestId('mobile-outcome-count')).toHaveTextContent('12')
  })

  it('renders points column for every row', () => {
    render(<RankingTable ranking={EIGHT_MEMBERS.slice(0, 3)} currentUserId="other-user" />)
    expect(screen.getByText('100 pts')).toBeInTheDocument()
    expect(screen.getByText('90 pts')).toBeInTheDocument()
    expect(screen.getByText('80 pts')).toBeInTheDocument()
  })

  it('falls back to "Usuário" name when full_name is null', () => {
    const entry = makeEntry({ full_name: null })
    render(<RankingTable ranking={[entry]} currentUserId="other-user" />)
    expect(screen.getByText('Usuário')).toBeInTheDocument()
  })
})
