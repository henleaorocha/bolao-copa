/**
 * @vitest-environment jsdom
 *
 * Render tests for the shared match-presentation subcomponents under components/match/.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import StatusBadge from '@/components/match/StatusBadge'
import FinalResult from '@/components/match/FinalResult'
import TeamRow from '@/components/match/TeamRow'
import ScoreInputs from '@/components/match/ScoreInputs'
import type { MatchStatus } from '@/components/match/matchStatus'

vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    onError,
  }: {
    src: string
    alt: string
    onError?: () => void
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} onError={onError} />
  ),
}))

describe('StatusBadge', () => {
  const cases: Array<{ status: MatchStatus; testId: string; label: string }> = [
    { status: 'placeholder', testId: 'badge-placeholder', label: 'A DEFINIR' },
    { status: 'open', testId: 'badge-open', label: 'ABERTO' },
    { status: 'predicted', testId: 'badge-predicted', label: '✓ PALPITADO' },
    { status: 'locked', testId: 'badge-locked', label: 'FECHADO' },
    { status: 'finished', testId: 'badge-finished', label: 'ENCERRADO' },
  ]

  it.each(cases)('renders $label with data-testid $testId for $status', ({ status, testId, label }) => {
    render(<StatusBadge status={status} />)
    const el = screen.getByTestId(testId)
    expect(el).toHaveTextContent(label)
  })

  it('preserves the amber color for ABERTO', () => {
    render(<StatusBadge status="open" />)
    expect(screen.getByTestId('badge-open')).toHaveStyle({ background: '#FFF3CD', color: '#856404' })
  })

  it('preserves the teal color for PALPITADO and ENCERRADO', () => {
    const { rerender } = render(<StatusBadge status="predicted" />)
    expect(screen.getByTestId('badge-predicted')).toHaveStyle({ background: '#0097A922', color: '#006677' })
    rerender(<StatusBadge status="finished" />)
    expect(screen.getByTestId('badge-finished')).toHaveStyle({ background: '#0097A922', color: '#006677' })
  })

  it('preserves the slate color for FECHADO and A DEFINIR', () => {
    const { rerender } = render(<StatusBadge status="locked" />)
    expect(screen.getByTestId('badge-locked')).toHaveClass('bg-slate-200', 'text-slate-500')
    rerender(<StatusBadge status="placeholder" />)
    expect(screen.getByTestId('badge-placeholder')).toHaveClass('bg-slate-100', 'text-slate-400')
  })

  it('lets a screen override the test id to keep its existing selector', () => {
    render(<StatusBadge status="locked" testId="badge-fechado" />)
    expect(screen.getByTestId('badge-fechado')).toHaveTextContent('FECHADO')
    expect(screen.queryByTestId('badge-locked')).toBeNull()
  })
})

describe('FinalResult', () => {
  it('renders final-score and NOT finished-prediction without a prediction', () => {
    render(<FinalResult homeScore={2} awayScore={1} />)
    expect(screen.getByTestId('final-score')).toHaveTextContent('2 × 1')
    expect(screen.queryByTestId('finished-prediction')).toBeNull()
  })

  it('renders finished-prediction only when a prediction is supplied', () => {
    render(<FinalResult homeScore={3} awayScore={0} prediction={{ home: 1, away: 0 }} />)
    expect(screen.getByTestId('final-score')).toHaveTextContent('3 × 0')
    expect(screen.getByTestId('finished-prediction')).toHaveTextContent('Palpite: 1 × 0')
  })
})

describe('TeamRow', () => {
  it('renders the flag image (flagcdn pattern) and team name', () => {
    render(<TeamRow name="Brasil" flag="br" nameTestId="home-display" />)
    expect(screen.getByTestId('home-display')).toHaveTextContent('Brasil')
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://flagcdn.com/w80/br.png')
  })

  it('falls back to a gray box when no flag code is given', () => {
    render(<TeamRow name="Brasil" flag={null} />)
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('falls back to the gray box when the flag image fails to load', () => {
    render(<TeamRow name="Brasil" flag="br" />)
    const img = screen.getByRole('img')
    fireEvent.error(img)
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('renders placeholder rendering with italic slate text and no flag image', () => {
    render(<TeamRow name="Vencedor do Grupo A" placeholder nameTestId="home-display" />)
    const label = screen.getByTestId('home-display')
    expect(label).toHaveTextContent('Vencedor do Grupo A')
    expect(label).toHaveClass('italic', 'text-slate-400')
    expect(screen.queryByRole('img')).toBeNull()
  })
})

describe('ScoreInputs', () => {
  it('emits the existing input test ids and calls onInputChange(matchId, side, value)', () => {
    const onInputChange = vi.fn()
    render(
      <ScoreInputs matchId="m1" homeInput="" awayInput="" onInputChange={onInputChange} />
    )
    const home = screen.getByTestId('input-home-m1')
    const away = screen.getByTestId('input-away-m1')
    fireEvent.change(home, { target: { value: '2' } })
    fireEvent.change(away, { target: { value: '1' } })
    expect(onInputChange).toHaveBeenNthCalledWith(1, 'm1', 'home', '2')
    expect(onInputChange).toHaveBeenNthCalledWith(2, 'm1', 'away', '1')
  })

  it('disables both inputs when disabled', () => {
    render(
      <ScoreInputs matchId="m2" homeInput="" awayInput="" onInputChange={vi.fn()} disabled />
    )
    expect(screen.getByTestId('input-home-m2')).toBeDisabled()
    expect(screen.getByTestId('input-away-m2')).toBeDisabled()
  })
})
