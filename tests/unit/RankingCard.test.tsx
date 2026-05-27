/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import RankingCard from '@/app/ligas/[id]/components/RankingCard'
import type { RankingEntry } from '@/lib/api/types'

const makeEntry = (overrides: Partial<RankingEntry> & { user_id: string; position: number }): RankingEntry => ({
  full_name: `User ${overrides.position}`,
  avatar_color: '#244C5A',
  points: 0,
  ...overrides,
})

const fiveEntries: RankingEntry[] = [
  makeEntry({ user_id: 'u1', position: 1 }),
  makeEntry({ user_id: 'u2', position: 2 }),
  makeEntry({ user_id: 'u3', position: 3 }),
  makeEntry({ user_id: 'u4', position: 4 }),
  makeEntry({ user_id: 'u5', position: 5 }),
]

describe('RankingCard', () => {
  it('renders 5 rows for a 5-entry ranking', () => {
    render(<RankingCard ranking={fiveEntries} currentUserId="u99" />)
    expect(screen.getByText('User 1')).toBeInTheDocument()
    expect(screen.getByText('User 2')).toBeInTheDocument()
    expect(screen.getByText('User 3')).toBeInTheDocument()
    expect(screen.getByText('User 4')).toBeInTheDocument()
    expect(screen.getByText('User 5')).toBeInTheDocument()
  })

  it('current-user row has a highlight CSS class distinct from other rows', () => {
    const { container } = render(<RankingCard ranking={fiveEntries} currentUserId="u3" />)
    const rows = container.querySelectorAll('[class*="flex items-center gap-3 px-4 py-3"]')
    const highlighted = Array.from(rows).filter(row =>
      row.className.includes('bg-yellow-50'),
    )
    const plain = Array.from(rows).filter(row =>
      !row.className.includes('bg-yellow-50'),
    )
    expect(highlighted.length).toBe(1)
    expect(plain.length).toBe(4)
  })

  it('first-place row contains the gold badge element', () => {
    render(<RankingCard ranking={fiveEntries} currentUserId="u99" />)
    expect(screen.getByTestId('gold-badge')).toBeInTheDocument()
  })

  it('second-place row contains the silver badge element', () => {
    render(<RankingCard ranking={fiveEntries} currentUserId="u99" />)
    expect(screen.getByTestId('silver-badge')).toBeInTheDocument()
  })

  it('third-place row contains the bronze badge element', () => {
    render(<RankingCard ranking={fiveEntries} currentUserId="u99" />)
    expect(screen.getByTestId('bronze-badge')).toBeInTheDocument()
  })

  it('"Ver tudo" link has aria-disabled="true"', () => {
    render(<RankingCard ranking={fiveEntries} currentUserId="u99" />)
    const link = screen.getByText(/Ver tudo/)
    expect(link).toHaveAttribute('aria-disabled', 'true')
  })

  it('renders avatar initial from full_name', () => {
    render(<RankingCard ranking={[makeEntry({ user_id: 'u1', position: 1, full_name: 'Ana Silva' })]} currentUserId="u99" />)
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('renders "U" initial when full_name is null', () => {
    render(<RankingCard ranking={[makeEntry({ user_id: 'u1', position: 1, full_name: null })]} currentUserId="u99" />)
    expect(screen.getByText('U')).toBeInTheDocument()
  })

  it('renders correctly with fewer than 5 entries', () => {
    const twoEntries = fiveEntries.slice(0, 2)
    const { container } = render(<RankingCard ranking={twoEntries} currentUserId="u99" />)
    expect(screen.getByText('User 1')).toBeInTheDocument()
    expect(screen.getByText('User 2')).toBeInTheDocument()
    expect(screen.queryByText('User 3')).not.toBeInTheDocument()
    expect(container).toBeTruthy()
  })
})
