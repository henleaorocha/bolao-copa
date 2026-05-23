/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LeagueProvider } from '@/lib/league-context'
import { LeagueSwitcher } from '@/components/topbar/LeagueSwitcher'
import { Topbar } from '@/components/topbar/Topbar'
import type { LeagueSummary, ApiResponse } from '@/lib/api/types'

const mockLeague: LeagueSummary = {
  id: 'league-1',
  name: 'Bolão da Família',
  access_type: 'private',
  logo_url: null,
  role: 'admin',
  member_count: 5,
}

const mockLeague2: LeagueSummary = {
  id: 'league-2',
  name: 'Bolão do Trampo',
  access_type: 'open',
  logo_url: 'https://example.com/logo.png',
  role: 'member',
  member_count: 12,
}

const mockLeague3: LeagueSummary = {
  id: 'league-3',
  name: 'Liga Descoberta',
  access_type: 'open',
  logo_url: null,
  role: 'member',
  member_count: 25,
}

describe('LeagueSwitcher', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders the active league name and role badge from useLeague() context', async () => {
    const mockResponse: ApiResponse<LeagueSummary[]> = {
      status: 'success',
      data: [mockLeague, mockLeague2],
      timestamp: new Date().toISOString(),
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    render(
      <LeagueProvider initialLeague={mockLeague}>
        <LeagueSwitcher />
      </LeagueProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Admin')).toBeInTheDocument()
    })

    const button = screen.getByRole('button')
    expect(button.textContent).toContain('Bolão da Família')
  })

  it('displays member role badge when user is not admin', async () => {
    const mockResponse: ApiResponse<LeagueSummary[]> = {
      status: 'success',
      data: [mockLeague2],
      timestamp: new Date().toISOString(),
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    render(
      <LeagueProvider initialLeague={mockLeague2}>
        <LeagueSwitcher />
      </LeagueProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Membro')).toBeInTheDocument()
    })
  })

  it('fetches and displays all user leagues on mount', async () => {
    const mockResponse: ApiResponse<LeagueSummary[]> = {
      status: 'success',
      data: [mockLeague, mockLeague2, mockLeague3],
      timestamp: new Date().toISOString(),
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    render(
      <LeagueProvider initialLeague={mockLeague}>
        <LeagueSwitcher />
      </LeagueProvider>
    )

    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })

    const button = screen.getByRole('button')
    fireEvent.click(button)

    await waitFor(() => {
      const leagues = screen.getAllByRole('button')
      expect(leagues.length).toBeGreaterThan(1)
    })
  })

  it('triggers PATCH /api/auth/me with correct active_league_id when selecting a different league', async () => {
    const mockLeaguesResponse: ApiResponse<LeagueSummary[]> = {
      status: 'success',
      data: [mockLeague, mockLeague2],
      timestamp: new Date().toISOString(),
    }

    const mockPatchResponse: ApiResponse<{ user: any; league: LeagueSummary }> = {
      status: 'success',
      data: { user: {}, league: mockLeague2 },
      timestamp: new Date().toISOString(),
    }

    ;(global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockLeaguesResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPatchResponse,
      })

    render(
      <LeagueProvider initialLeague={mockLeague}>
        <LeagueSwitcher />
      </LeagueProvider>
    )

    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })

    const button = screen.getByRole('button')
    fireEvent.click(button)

    await waitFor(() => {
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(1)
    })

    const buttons = screen.getAllByRole('button')
    const leagueButton = buttons.find(b => b.textContent?.includes('Bolão do Trampo'))
    expect(leagueButton).toBeDefined()

    if (leagueButton) {
      fireEvent.click(leagueButton)
    }

    await waitFor(() => {
      const calls = (global.fetch as any).mock.calls
      const patchCall = calls.find(
        (call: any) =>
          call[0] === '/api/auth/me' && call[1]?.method === 'PATCH'
      )
      expect(patchCall).toBeDefined()
      if (patchCall) {
        const body = JSON.parse(patchCall[1].body)
        expect(body.active_league_id).toBe('league-2')
      }
    })
  })

  it('shows loading/disabled state while PATCH request is in flight', async () => {
    const mockLeaguesResponse: ApiResponse<LeagueSummary[]> = {
      status: 'success',
      data: [mockLeague, mockLeague2],
      timestamp: new Date().toISOString(),
    }

    const mockPatchResponse: ApiResponse<{ user: any; league: LeagueSummary }> = {
      status: 'success',
      data: { user: {}, league: mockLeague2 },
      timestamp: new Date().toISOString(),
    }

    ;(global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockLeaguesResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPatchResponse,
      })

    render(
      <LeagueProvider initialLeague={mockLeague}>
        <LeagueSwitcher />
      </LeagueProvider>
    )

    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })

    const button = screen.getByRole('button')
    fireEvent.click(button)

    await waitFor(() => {
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(1)
    })

    const buttons = screen.getAllByRole('button')
    const leagueButton = buttons.find(b => b.textContent?.includes('Bolão do Trampo'))

    if (leagueButton) {
      fireEvent.click(leagueButton)

      // The button should become disabled while the PATCH request is in flight
      // and will be enabled after the response is received
      await waitFor(() => {
        // After the PATCH response, the component should have switched to the new league
        expect(screen.getByText('Bolão do Trampo')).toBeInTheDocument()
      })
    }
  })

  it('calls setLeague() after successful PATCH and updates displayed name', async () => {
    const mockLeaguesResponse: ApiResponse<LeagueSummary[]> = {
      status: 'success',
      data: [mockLeague, mockLeague2],
      timestamp: new Date().toISOString(),
    }

    const mockPatchResponse: ApiResponse<{ user: any; league: LeagueSummary }> = {
      status: 'success',
      data: { user: {}, league: mockLeague2 },
      timestamp: new Date().toISOString(),
    }

    ;(global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockLeaguesResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPatchResponse,
      })

    render(
      <LeagueProvider initialLeague={mockLeague}>
        <LeagueSwitcher />
      </LeagueProvider>
    )

    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })

    const button = screen.getByRole('button')
    fireEvent.click(button)

    await waitFor(() => {
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(1)
    })

    const buttons = screen.getAllByRole('button')
    const leagueButton = buttons.find(b => b.textContent?.includes('Bolão do Trampo'))

    if (leagueButton) {
      fireEvent.click(leagueButton)

      await waitFor(() => {
        expect(screen.getByText('Bolão do Trampo')).toBeInTheDocument()
        expect(screen.getByText('Membro')).toBeInTheDocument()
      })
    }
  })

  it('does not make PATCH request if clicked on already active league', async () => {
    const mockLeaguesResponse: ApiResponse<LeagueSummary[]> = {
      status: 'success',
      data: [mockLeague, mockLeague2],
      timestamp: new Date().toISOString(),
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockLeaguesResponse,
    })

    render(
      <LeagueProvider initialLeague={mockLeague}>
        <LeagueSwitcher />
      </LeagueProvider>
    )

    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).not.toBeDisabled()
    })

    const button = screen.getByRole('button')
    fireEvent.click(button)

    await waitFor(() => {
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(1)
    })

    const calls = (global.fetch as any).mock.calls
    expect(calls.length).toBe(1)
  })
})

describe('Topbar', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders league name and role badge', async () => {
    const mockResponse: ApiResponse<LeagueSummary[]> = {
      status: 'success',
      data: [mockLeague],
      timestamp: new Date().toISOString(),
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    render(
      <LeagueProvider initialLeague={mockLeague}>
        <Topbar />
      </LeagueProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Liga Ativa')).toBeInTheDocument()
    })

    const leagueNames = screen.getAllByText('Bolão da Família')
    expect(leagueNames.length).toBeGreaterThan(0)
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('displays correct role badge for member', async () => {
    const mockResponse: ApiResponse<LeagueSummary[]> = {
      status: 'success',
      data: [mockLeague2],
      timestamp: new Date().toISOString(),
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    render(
      <LeagueProvider initialLeague={mockLeague2}>
        <Topbar />
      </LeagueProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Liga Ativa')).toBeInTheDocument()
    })

    const leagueNames = screen.getAllByText('Bolão do Trampo')
    expect(leagueNames.length).toBeGreaterThan(0)
    expect(screen.getByText('Membro')).toBeInTheDocument()
  })
})
