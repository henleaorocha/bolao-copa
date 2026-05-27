/**
 * @vitest-environment jsdom
 *
 * Integration tests for StandingsGrid: verifies A→L ordering, GroupChips presence,
 * and anchor id contract between GroupCard and GroupChips.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import StandingsGrid from '@/app/ligas/[id]/components/StandingsGrid'
import type { GroupStanding, TeamStanding } from '@/lib/standings'

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

const ALL_GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

function makeTeamStanding(position: number): TeamStanding {
  return {
    team: `Team ${position}`,
    flag: null,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0,
    points: 0,
    position,
  }
}

function makeAllGroupStandings(): GroupStanding[] {
  return ALL_GROUPS.map((group) => ({
    group,
    teams: [1, 2, 3, 4].map(makeTeamStanding),
  }))
}

describe('StandingsGrid', () => {
  it('renders all 12 group cards', () => {
    render(<StandingsGrid standings={makeAllGroupStandings()} />)
    ALL_GROUPS.forEach((letter) => {
      expect(screen.getByTestId(`group-card-${letter}`)).toBeInTheDocument()
    })
  })

  it('renders groups in A→L order', () => {
    render(<StandingsGrid standings={makeAllGroupStandings()} />)
    const grid = screen.getByTestId('standings-grid')
    const cardElements = grid.querySelectorAll('[data-testid^="group-card-"]')
    const cardLetters = Array.from(cardElements).map((el) =>
      el.getAttribute('data-testid')?.replace('group-card-', '')
    )
    expect(cardLetters).toEqual(ALL_GROUPS)
  })

  it('renders groups in A→L order even when standings are passed in reverse order', () => {
    const reversed = [...makeAllGroupStandings()].reverse()
    render(<StandingsGrid standings={reversed} />)
    const grid = screen.getByTestId('standings-grid')
    const cardElements = grid.querySelectorAll('[data-testid^="group-card-"]')
    const cardLetters = Array.from(cardElements).map((el) =>
      el.getAttribute('data-testid')?.replace('group-card-', '')
    )
    expect(cardLetters).toEqual(ALL_GROUPS)
  })

  it('renders the GroupChips row', () => {
    render(<StandingsGrid standings={makeAllGroupStandings()} />)
    expect(screen.getByTestId('group-chips-row')).toBeInTheDocument()
  })

  it('passes all 12 group letters to GroupChips', () => {
    render(<StandingsGrid standings={makeAllGroupStandings()} />)
    ALL_GROUPS.forEach((letter) => {
      expect(screen.getByTestId(`group-chip-${letter}`)).toBeInTheDocument()
    })
  })

  it('each GroupCard has an anchor id matching the grupo-{letter} contract', () => {
    const { container } = render(<StandingsGrid standings={makeAllGroupStandings()} />)
    ALL_GROUPS.forEach((letter) => {
      const id = `grupo-${letter.toLowerCase()}`
      expect(container.querySelector(`#${id}`)).toBeInTheDocument()
    })
  })
})
