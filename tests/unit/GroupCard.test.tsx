/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GroupCard } from '@/app/ligas/[id]/components/GroupCard'
import type { GroupStanding, TeamStanding } from '@/lib/standings'

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

function makeTeamStanding(position: number): TeamStanding {
  return {
    team: `Team ${position}`,
    flag: 'br',
    played: 3,
    won: 1,
    drawn: 1,
    lost: 1,
    goalsFor: 3,
    goalsAgainst: 3,
    goalDiff: 0,
    points: 4,
    position,
  }
}

function makeGroupStanding(group: string): GroupStanding {
  return {
    group,
    teams: [1, 2, 3, 4].map(makeTeamStanding),
  }
}

describe('GroupCard', () => {
  it('renders GRUPO A in the header', () => {
    render(<GroupCard standing={makeGroupStanding('A')} />)
    expect(screen.getByTestId('group-label')).toHaveTextContent('GRUPO A')
  })

  it('renders GRUPO L in the header for group L', () => {
    render(<GroupCard standing={makeGroupStanding('L')} />)
    expect(screen.getByTestId('group-label')).toHaveTextContent('GRUPO L')
  })

  it('renders the 4 SELEÇÕES badge', () => {
    render(<GroupCard standing={makeGroupStanding('B')} />)
    expect(screen.getByTestId('team-count-badge')).toHaveTextContent('4 SELEÇÕES')
  })

  it('has id="grupo-a" (lowercase) for the GroupChips anchor contract', () => {
    const { container } = render(<GroupCard standing={makeGroupStanding('A')} />)
    expect(container.querySelector('#grupo-a')).toBeInTheDocument()
  })

  it('has id="grupo-l" for group L', () => {
    const { container } = render(<GroupCard standing={makeGroupStanding('L')} />)
    expect(container.querySelector('#grupo-l')).toBeInTheDocument()
  })

  it('anchor id uses lowercase group letter', () => {
    const { container } = render(<GroupCard standing={makeGroupStanding('C')} />)
    expect(container.querySelector('#grupo-c')).toBeInTheDocument()
    expect(container.querySelector('#grupo-C')).toBeNull()
  })

  it('renders 4 standings rows for the 4 teams', () => {
    render(<GroupCard standing={makeGroupStanding('D')} />)
    expect(screen.getAllByTestId('standings-row')).toHaveLength(4)
  })

  it('positions 1 and 2 are highlighted; positions 3 and 4 are not', () => {
    render(<GroupCard standing={makeGroupStanding('E')} />)
    const rows = screen.getAllByTestId('standings-row')
    expect(rows[0]).toHaveAttribute('data-qualifying', 'true')
    expect(rows[1]).toHaveAttribute('data-qualifying', 'true')
    expect(rows[2]).toHaveAttribute('data-qualifying', 'false')
    expect(rows[3]).toHaveAttribute('data-qualifying', 'false')
  })
})
