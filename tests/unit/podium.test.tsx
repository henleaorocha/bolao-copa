/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import Podium from '@/app/ligas/[id]/ranking/Podium'
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
    ...overrides,
  }
}

const THREE_ENTRIES: RankingFullEntry[] = [
  makeEntry({ user_id: 'user-1', full_name: 'Ana Silva', position: 1, points: 100, avatar_color: '#FF5733' }),
  makeEntry({ user_id: 'user-2', full_name: 'Bruno Costa', position: 2, points: 80, avatar_color: '#33C1FF' }),
  makeEntry({ user_id: 'user-3', full_name: 'Carla Rocha', position: 3, points: 60, avatar_color: '#6BFF33' }),
]

describe('Podium', () => {
  it('renders three entries in DOM order 2nd, 1st, 3rd', () => {
    render(<Podium entries={THREE_ENTRIES} />)
    const entries = screen.getAllByTestId(/^podium-entry-/)
    expect(entries).toHaveLength(3)
    expect(entries[0]).toHaveAttribute('data-testid', 'podium-entry-2')
    expect(entries[1]).toHaveAttribute('data-testid', 'podium-entry-1')
    expect(entries[2]).toHaveAttribute('data-testid', 'podium-entry-3')
  })

  it('shows crown icon only on first-place entry', () => {
    render(<Podium entries={THREE_ENTRIES} />)
    const crown = screen.getByTestId('crown')
    const firstEntry = screen.getByTestId('podium-entry-1')
    expect(firstEntry).toContainElement(crown)
    expect(screen.getByTestId('podium-entry-2')).not.toContainElement(crown)
    expect(screen.getByTestId('podium-entry-3')).not.toContainElement(crown)
  })

  it('shows avatar initial, first name, family name, rank number, and points for each entry', () => {
    render(<Podium entries={THREE_ENTRIES} />)

    const entry1 = screen.getByTestId('podium-entry-1')
    expect(within(entry1).getByText('A')).toBeInTheDocument()
    expect(within(entry1).getByText('Ana')).toBeInTheDocument()
    expect(within(entry1).getByText('Silva')).toBeInTheDocument()
    expect(within(entry1).getByText('1º')).toBeInTheDocument()
    expect(within(entry1).getByText('100 pts')).toBeInTheDocument()

    const entry2 = screen.getByTestId('podium-entry-2')
    expect(within(entry2).getByText('B')).toBeInTheDocument()
    expect(within(entry2).getByText('Bruno')).toBeInTheDocument()
    expect(within(entry2).getByText('Costa')).toBeInTheDocument()
    expect(within(entry2).getByText('2º')).toBeInTheDocument()
    expect(within(entry2).getByText('80 pts')).toBeInTheDocument()

    const entry3 = screen.getByTestId('podium-entry-3')
    expect(within(entry3).getByText('C')).toBeInTheDocument()
    expect(within(entry3).getByText('Carla')).toBeInTheDocument()
    expect(within(entry3).getByText('Rocha')).toBeInTheDocument()
    expect(within(entry3).getByText('3º')).toBeInTheDocument()
    expect(within(entry3).getByText('60 pts')).toBeInTheDocument()
  })

  it('renders only 1st and 2nd when league has 2 members', () => {
    const two = THREE_ENTRIES.slice(0, 2)
    render(<Podium entries={two} />)
    expect(screen.getByTestId('podium-entry-1')).toBeInTheDocument()
    expect(screen.getByTestId('podium-entry-2')).toBeInTheDocument()
    expect(screen.queryByTestId('podium-entry-3')).not.toBeInTheDocument()
  })

  it('renders only 1st place when league has 1 member', () => {
    const one = THREE_ENTRIES.slice(0, 1)
    render(<Podium entries={one} />)
    expect(screen.getByTestId('podium-entry-1')).toBeInTheDocument()
    expect(screen.queryByTestId('podium-entry-2')).not.toBeInTheDocument()
    expect(screen.queryByTestId('podium-entry-3')).not.toBeInTheDocument()
  })

  it('renders empty-state message instead of podium when all entries have 0 points', () => {
    const allZero = THREE_ENTRIES.map((e) => ({ ...e, points: 0 }))
    render(<Podium entries={allZero} />)
    expect(
      screen.getByText('A pontuação começa quando os jogos rolarem'),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('podium-entry-1')).not.toBeInTheDocument()
    expect(screen.queryByTestId('podium-entry-2')).not.toBeInTheDocument()
    expect(screen.queryByTestId('podium-entry-3')).not.toBeInTheDocument()
  })

  it('renders empty-state when only 2 members both have 0 points', () => {
    const twoZero = THREE_ENTRIES.slice(0, 2).map((e) => ({ ...e, points: 0 }))
    render(<Podium entries={twoZero} />)
    expect(
      screen.getByText('A pontuação começa quando os jogos rolarem'),
    ).toBeInTheDocument()
    expect(screen.getByTestId('podium-empty-state')).toBeInTheDocument()
  })
})
