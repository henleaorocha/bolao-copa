/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import GroupChips from '@/app/ligas/[id]/components/GroupChips'

const ALL_GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

describe('GroupChips', () => {
  beforeEach(() => {
    vi.spyOn(document, 'getElementById').mockReturnValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders exactly one chip per provided group letter (12 chips for A–L)', () => {
    render(<GroupChips groups={ALL_GROUPS} />)
    ALL_GROUPS.forEach((letter) => {
      expect(screen.getByTestId(`group-chip-${letter}`)).toBeInTheDocument()
    })
    expect(screen.getAllByRole('button')).toHaveLength(12)
  })

  it('tapping chip "C" resolves and scrolls element #grupo-c into view', () => {
    const mockScrollIntoView = vi.fn()
    const mockEl = { scrollIntoView: mockScrollIntoView } as unknown as HTMLElement
    vi.spyOn(document, 'getElementById').mockImplementation((id) =>
      id === 'grupo-c' ? mockEl : null
    )

    render(<GroupChips groups={ALL_GROUPS} />)
    fireEvent.click(screen.getByTestId('group-chip-C'))

    expect(document.getElementById).toHaveBeenCalledWith('grupo-c')
    expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
  })

  it('the tapped chip becomes active; previously active chip is no longer marked active', () => {
    render(<GroupChips groups={ALL_GROUPS} />)

    fireEvent.click(screen.getByTestId('group-chip-A'))
    expect(screen.getByTestId('group-chip-A')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('group-chip-B')).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(screen.getByTestId('group-chip-B'))
    expect(screen.getByTestId('group-chip-A')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByTestId('group-chip-B')).toHaveAttribute('aria-pressed', 'true')
  })

  it('tapping a chip whose anchor is absent does not throw', () => {
    vi.spyOn(document, 'getElementById').mockReturnValue(null)

    render(<GroupChips groups={ALL_GROUPS} />)
    expect(() => {
      fireEvent.click(screen.getByTestId('group-chip-A'))
    }).not.toThrow()
  })
})
