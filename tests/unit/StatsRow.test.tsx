/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatsRow from '@/app/ligas/[id]/components/StatsRow'
import type { UserStats } from '@/lib/api/types'
import { TOTAL_MATCH_COUNT } from '@/lib/copa-teams'

const zeroStats: UserStats = {
  position: 0,
  points: 0,
  exact_scores: 0,
}

describe('StatsRow', () => {
  it('renders four stat cards, with the repurposed "JOGOS JÁ REALIZADOS" card', () => {
    expect(() =>
      render(<StatsRow user_stats={zeroStats} member_count={10} matches_played={0} />)
    ).not.toThrow()
    expect(screen.getByText('Sua Posição')).toBeInTheDocument()
    expect(screen.getByText('Pontos')).toBeInTheDocument()
    expect(screen.getByText('JOGOS JÁ REALIZADOS')).toBeInTheDocument()
    expect(screen.getByText('Acertos Exatos')).toBeInTheDocument()
  })

  it('no longer renders the personal "Palpites" / "fase de grupos" card', () => {
    render(<StatsRow user_stats={zeroStats} member_count={10} matches_played={0} />)
    expect(screen.queryByText('Palpites')).not.toBeInTheDocument()
    expect(screen.queryByText('fase de grupos')).not.toBeInTheDocument()
  })

  it('renders the tournament-wide subtitle "fase de grupos + mata-mata"', () => {
    render(<StatsRow user_stats={zeroStats} member_count={10} matches_played={0} />)
    expect(screen.getByText('fase de grupos + mata-mata')).toBeInTheDocument()
  })

  it('shows the finished-match count over the fixed 104 denominator', () => {
    render(<StatsRow user_stats={zeroStats} member_count={10} matches_played={0} />)
    expect(screen.getByText(`0/${TOTAL_MATCH_COUNT}`)).toBeInTheDocument()
  })

  it('uses 104 as the denominator (TOTAL_MATCH_COUNT)', () => {
    expect(TOTAL_MATCH_COUNT).toBe(104)
    render(<StatsRow user_stats={zeroStats} member_count={10} matches_played={37} />)
    expect(screen.getByText('37/104')).toBeInTheDocument()
  })

  it('reflects a non-zero matches_played value', () => {
    render(<StatsRow user_stats={zeroStats} member_count={10} matches_played={12} />)
    expect(screen.getByText('12/104')).toBeInTheDocument()
  })

  it('displays the correct Pontos value when non-zero', () => {
    render(<StatsRow user_stats={{ ...zeroStats, points: 42 }} member_count={10} matches_played={0} />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('displays the correct Sua Posição value when non-zero', () => {
    render(<StatsRow user_stats={{ ...zeroStats, position: 3 }} member_count={10} matches_played={0} />)
    expect(screen.getByText('3°')).toBeInTheDocument()
  })

  it('displays the correct Acertos Exatos value when non-zero', () => {
    render(<StatsRow user_stats={{ ...zeroStats, exact_scores: 7 }} member_count={10} matches_played={0} />)
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('displays member_count in "de N" subtitle', () => {
    render(<StatsRow user_stats={zeroStats} member_count={87} matches_played={0} />)
    expect(screen.getByText('de 87')).toBeInTheDocument()
  })
})
