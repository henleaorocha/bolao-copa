/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StandingsRow } from '@/app/ligas/[id]/components/StandingsRow'
import type { TeamStanding } from '@/lib/standings'

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

function makeTeamStanding(overrides: Partial<TeamStanding> = {}): TeamStanding {
  return {
    team: 'Brasil',
    flag: 'br',
    played: 3,
    won: 2,
    drawn: 1,
    lost: 0,
    goalsFor: 6,
    goalsAgainst: 2,
    goalDiff: 4,
    points: 7,
    position: 1,
    ...overrides,
  }
}

describe('StandingsRow', () => {
  it('renders qualification highlight for position 1', () => {
    render(<StandingsRow standing={makeTeamStanding({ position: 1 })} />)
    const row = screen.getByTestId('standings-row')
    expect(row).toHaveAttribute('data-qualifying', 'true')
    expect(row.className).toContain('border-[#0097A9]')
  })

  it('renders qualification highlight for position 2', () => {
    render(<StandingsRow standing={makeTeamStanding({ position: 2 })} />)
    const row = screen.getByTestId('standings-row')
    expect(row).toHaveAttribute('data-qualifying', 'true')
    expect(row.className).toContain('border-[#0097A9]')
  })

  it('does NOT render qualification highlight for position 3', () => {
    render(<StandingsRow standing={makeTeamStanding({ position: 3 })} />)
    const row = screen.getByTestId('standings-row')
    expect(row).toHaveAttribute('data-qualifying', 'false')
    expect(row.className).not.toContain('bg-[#0097A9]')
  })

  it('does NOT render qualification highlight for position 4', () => {
    render(<StandingsRow standing={makeTeamStanding({ position: 4 })} />)
    const row = screen.getByTestId('standings-row')
    expect(row).toHaveAttribute('data-qualifying', 'false')
  })

  it('renders all column values (Pts/J/V/E/D/GP/GC/SG)', () => {
    render(
      <StandingsRow
        standing={makeTeamStanding({
          points: 7,
          played: 3,
          won: 2,
          drawn: 1,
          lost: 0,
          goalsFor: 6,
          goalsAgainst: 2,
          goalDiff: 4,
        })}
      />
    )
    expect(screen.getByTestId('col-pts')).toHaveTextContent('7')
    expect(screen.getByTestId('col-j')).toHaveTextContent('3')
    expect(screen.getByTestId('col-v')).toHaveTextContent('2')
    expect(screen.getByTestId('col-e')).toHaveTextContent('1')
    expect(screen.getByTestId('col-d')).toHaveTextContent('0')
    expect(screen.getByTestId('col-gp')).toHaveTextContent('6')
    expect(screen.getByTestId('col-gc')).toHaveTextContent('2')
    expect(screen.getByTestId('col-sg')).toHaveTextContent('+4')
  })

  it('renders negative SG without leading plus', () => {
    render(<StandingsRow standing={makeTeamStanding({ goalDiff: -3 })} />)
    expect(screen.getByTestId('col-sg')).toHaveTextContent('-3')
  })

  it('renders zero SG as 0', () => {
    render(<StandingsRow standing={makeTeamStanding({ goalDiff: 0 })} />)
    expect(screen.getByTestId('col-sg')).toHaveTextContent('0')
  })

  it('GP and GC have mobile-hidden class; SG does not', () => {
    render(<StandingsRow standing={makeTeamStanding()} />)
    const gp = screen.getByTestId('col-gp')
    const gc = screen.getByTestId('col-gc')
    const sg = screen.getByTestId('col-sg')
    expect(gp.className).toContain('hidden')
    expect(gc.className).toContain('hidden')
    expect(sg.className).not.toContain('hidden')
  })

  it('renders flagcdn image for a valid flag code', () => {
    render(<StandingsRow standing={makeTeamStanding({ flag: 'br', team: 'Brasil' })} />)
    const img = screen.getByRole('img', { name: 'Brasil' })
    expect(img).toHaveAttribute('src', 'https://flagcdn.com/w80/br.png')
  })

  it('renders grey placeholder when flag is null, with no img element', () => {
    render(<StandingsRow standing={makeTeamStanding({ flag: null })} />)
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getByTestId('flag-placeholder')).toBeInTheDocument()
  })

  it('renders team name', () => {
    render(<StandingsRow standing={makeTeamStanding({ team: 'Argentina' })} />)
    expect(screen.getByTestId('col-team')).toHaveTextContent('Argentina')
  })
})
