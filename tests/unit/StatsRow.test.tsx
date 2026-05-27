/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatsRow from '@/app/ligas/[id]/components/StatsRow'
import type { UserStats } from '@/lib/api/types'

const zeroStats: UserStats = {
  position: 0,
  points: 0,
  guesses_made: 0,
  guesses_total: 0,
  exact_scores: 0,
}

describe('StatsRow', () => {
  it('renders four stat cards without throwing when all stats are zero', () => {
    expect(() => render(<StatsRow user_stats={zeroStats} member_count={10} />)).not.toThrow()
    expect(screen.getByText('Sua Posição')).toBeInTheDocument()
    expect(screen.getByText('Pontos')).toBeInTheDocument()
    expect(screen.getByText('Palpites')).toBeInTheDocument()
    expect(screen.getByText('Acertos Exatos')).toBeInTheDocument()
  })

  it('displays "0" for all stat values when user_stats has all-zero values', () => {
    render(<StatsRow user_stats={zeroStats} member_count={10} />)
    const zeros = screen.getAllByText('0')
    expect(zeros.length).toBeGreaterThanOrEqual(3)
  })

  it('displays "0/0" for Palpites when guesses_made and guesses_total are both zero', () => {
    render(<StatsRow user_stats={zeroStats} member_count={10} />)
    expect(screen.getByText('0/0')).toBeInTheDocument()
  })

  it('displays "5/10" for Palpites when guesses_made=5 and guesses_total=10', () => {
    render(<StatsRow user_stats={{ ...zeroStats, guesses_made: 5, guesses_total: 10 }} member_count={10} />)
    expect(screen.getByText('5/10')).toBeInTheDocument()
  })

  it('displays the correct Pontos value when non-zero', () => {
    render(<StatsRow user_stats={{ ...zeroStats, points: 42 }} member_count={10} />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('displays the correct Sua Posição value when non-zero', () => {
    render(<StatsRow user_stats={{ ...zeroStats, position: 3 }} member_count={10} />)
    expect(screen.getByText('3°')).toBeInTheDocument()
  })

  it('displays the correct Acertos Exatos value when non-zero', () => {
    render(<StatsRow user_stats={{ ...zeroStats, exact_scores: 7 }} member_count={10} />)
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('displays member_count in "de N" subtitle', () => {
    render(<StatsRow user_stats={zeroStats} member_count={87} />)
    expect(screen.getByText('de 87')).toBeInTheDocument()
  })
})
