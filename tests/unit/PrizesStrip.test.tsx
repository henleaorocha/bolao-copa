/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PrizesStrip from '@/app/ligas/[id]/components/PrizesStrip'

describe('PrizesStrip', () => {
  it('renders nothing when prizes is null', () => {
    const { container } = render(<PrizesStrip prizes={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when prizes is an empty string', () => {
    const { container } = render(<PrizesStrip prizes="" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the prizes text when prizes is a non-empty string', () => {
    render(<PrizesStrip prizes="R$ 500 pro 1º" />)
    expect(screen.getByText('R$ 500 pro 1º')).toBeInTheDocument()
  })

  it('renders the "Premiação" label when prizes is provided', () => {
    render(<PrizesStrip prizes="R$ 1000" />)
    expect(screen.getByText('Premiação')).toBeInTheDocument()
  })

  it('does not render the "Premiação" label when prizes is null', () => {
    render(<PrizesStrip prizes={null} />)
    expect(screen.queryByText('Premiação')).not.toBeInTheDocument()
  })
})
