/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LeagueCard, { getShieldColor } from '@/components/LeagueCard'
import type { LeagueHubItem } from '@/lib/api/types'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

global.fetch = vi.fn()

function makeLeague(overrides: Partial<LeagueHubItem> = {}): LeagueHubItem {
  return {
    id: 'league-1',
    name: 'Bolão da Família',
    access_type: 'private',
    logo_url: null,
    member_count: 42,
    is_member: true,
    is_main: false,
    ...overrides,
  }
}

// ─── getShieldColor unit tests ───────────────────────────────────────────────

describe('getShieldColor', () => {
  it('returns #7E4FE3 (index 3) for a name starting with "T"', () => {
    expect(getShieldColor('Test')).toBe('#7E4FE3')
    expect(getShieldColor('Torino FC')).toBe('#7E4FE3')
  })

  it('returns #FFC72C (index 0) for a name starting with "A"', () => {
    expect(getShieldColor('Amigos')).toBe('#FFC72C')
  })

  it('returns #FFC72C (index 0) for a name starting with "E"', () => {
    expect(getShieldColor('Elite')).toBe('#FFC72C')
  })

  it('returns #0097A9 (index 1) for a name starting with "F"', () => {
    expect(getShieldColor('Furacão')).toBe('#0097A9')
  })

  it('returns #7E4FE3 (index 3) for lowercase "t" initial', () => {
    expect(getShieldColor('the league')).toBe('#7E4FE3')
  })

  it('falls back to index 0 for a non-alphabetic first character', () => {
    const color = getShieldColor('1Liga')
    expect(color).toBe('#FFC72C')
  })

  it('falls back to index 0 for an empty string', () => {
    expect(getShieldColor('')).toBe('#FFC72C')
  })
})

// ─── LeagueCard component unit tests ─────────────────────────────────────────

describe('LeagueCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders league name, member count as "{N} participantes", and ENTRAR text', () => {
    render(<LeagueCard league={makeLeague()} />)
    expect(screen.getByText('Bolão da Família')).toBeInTheDocument()
    expect(screen.getByText('42 participantes')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
  })

  it('applies shield background color derived from the league name', () => {
    render(<LeagueCard league={makeLeague({ name: 'Test League' })} />)
    const shield = screen.getByTestId('league-shield')
    // Verify the shield element is rendered with a backgroundColor style
    expect(shield.style.backgroundColor).toBeTruthy()
  })

  it('shield color for "Test League" (starts with T) is #7E4FE3 (index 3)', () => {
    // Direct function test: T maps to alphabet position 19 → floor(19/5)=3
    expect(getShieldColor('Test League')).toBe('#7E4FE3')
  })

  it('shows PRINCIPAL badge with text label when is_main is true', () => {
    render(<LeagueCard league={makeLeague({ is_main: true })} />)
    expect(screen.getByTestId('principal-badge')).toBeInTheDocument()
    expect(screen.getByText('PRINCIPAL')).toBeInTheDocument()
  })

  it('does not show PRINCIPAL badge when is_main is false', () => {
    render(<LeagueCard league={makeLeague({ is_main: false })} />)
    expect(screen.queryByTestId('principal-badge')).not.toBeInTheDocument()
    expect(screen.queryByText('PRINCIPAL')).not.toBeInTheDocument()
  })

  it('disables ENTRAR button while the PATCH request is in flight', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () => resolve({ ok: true, json: async () => ({ status: 'success' }) }),
            200
          )
        )
    )

    render(<LeagueCard league={makeLeague()} />)
    const button = screen.getByRole('button', { name: /entrar/i })

    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeDisabled()
    })
  })

  it('re-enables button and does NOT navigate when PATCH returns non-2xx', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ status: 'error', code: 'NOT_A_MEMBER' }),
    })

    render(<LeagueCard league={makeLeague({ id: 'league-x' })} />)
    const button = screen.getByRole('button', { name: /entrar/i })

    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByRole('button')).not.toBeDisabled()
    })

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('shows error message when PATCH returns non-2xx', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ status: 'error', code: 'NOT_A_MEMBER' }),
    })

    render(<LeagueCard league={makeLeague()} />)
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(screen.getByText(/erro ao entrar/i)).toBeInTheDocument()
    })
  })

  it('navigates to /ligas/{id} after successful PATCH response', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: 'success' }),
    })

    render(<LeagueCard league={makeLeague({ id: 'league-success' })} />)
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/ligas/league-success')
    })
  })

  it('ENTRAR button is keyboard-accessible (rendered as <button>)', () => {
    render(<LeagueCard league={makeLeague()} />)
    const button = screen.getByRole('button', { name: /entrar/i })
    expect(button.tagName).toBe('BUTTON')
    expect(button).not.toHaveAttribute('tabindex', '-1')
  })
})

// ─── Integration tests — ENTRAR flow ─────────────────────────────────────────

describe('LeagueCard integration — ENTRAR flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('full success: PATCH /api/auth/me returns 200 → router.push called with /ligas/${id}', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: 'success' }),
    })

    render(<LeagueCard league={makeLeague({ id: 'liga-abc' })} />)
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active_league_id: 'liga-abc' }),
      })
    })

    expect(mockPush).toHaveBeenCalledWith('/ligas/liga-abc')
    expect(mockPush).toHaveBeenCalledTimes(1)
  })

  it('full failure: PATCH /api/auth/me returns 403 → router.push is NOT called', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ status: 'error', code: 'NOT_A_MEMBER' }),
    })

    render(<LeagueCard league={makeLeague({ id: 'liga-fail' })} />)
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/me',
        expect.objectContaining({ method: 'PATCH' })
      )
    })

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('PATCH is called before navigate — fetch resolves before push', async () => {
    const callOrder: string[] = []

    ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => {
      callOrder.push('fetch')
      return { ok: true, status: 200, json: async () => ({}) }
    })

    mockPush.mockImplementationOnce(() => {
      callOrder.push('push')
    })

    render(<LeagueCard league={makeLeague({ id: 'ordered-league' })} />)
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled()
    })

    expect(callOrder).toEqual(['fetch', 'push'])
  })
})
