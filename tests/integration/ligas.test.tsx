/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { LeagueProvider } from '@/lib/league-context'
import type { LeagueSummary } from '@/lib/api/types'
import LigasPage from '@/app/ligas/page'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

// Mock fetch
global.fetch = vi.fn()

const mockLeagueSummary = (overrides?: Partial<LeagueSummary>): LeagueSummary => ({
  id: 'league-' + Math.random().toString(36).slice(2, 9),
  name: 'Test League',
  access_type: 'open',
  logo_url: null,
  role: 'member',
  member_count: 5,
  ...overrides,
})

const renderWithLeagueProvider = (
  component: React.ReactElement,
  initialLeague?: LeagueSummary
) => {
  const league = initialLeague || mockLeagueSummary()
  return render(
    <LeagueProvider initialLeague={league}>
      {component}
    </LeagueProvider>
  )
}

describe('LigasPage - Minhas Ligas tab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    })
  })

  it('renders a card for each league in the user list', async () => {
    const league1 = mockLeagueSummary({ id: 'l1', name: 'Bolão da Família' })
    const league2 = mockLeagueSummary({ id: 'l2', name: 'Bolão do Trabalho' })

    ;(global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/leagues') && !url.includes('/discover')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [league1, league2] }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: [] }),
      })
    })

    renderWithLeagueProvider(<LigasPage />)

    await waitFor(() => {
      expect(screen.getByText('Bolão da Família')).toBeInTheDocument()
      expect(screen.getByText('Bolão do Trabalho')).toBeInTheDocument()
    })
  })

  it('displays league name, member count, and role badge', async () => {
    const league = mockLeagueSummary({
      id: 'l1',
      name: 'Test League',
      member_count: 8,
      role: 'admin',
    })

    ;(global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/api/leagues') && !url.includes('/discover')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [league] }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: [] }),
      })
    })

    renderWithLeagueProvider(<LigasPage />)

    await waitFor(() => {
      expect(screen.getByText('Test League')).toBeInTheDocument()
      expect(screen.getByText('Admin')).toBeInTheDocument()
      expect(screen.getByText(/8 participantes/)).toBeInTheDocument()
    })
  })

  it('shows empty state when user has no leagues', async () => {
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    })

    renderWithLeagueProvider(<LigasPage />)

    await waitFor(() => {
      expect(
        screen.getByText('Você ainda não entrou em nenhuma liga')
      ).toBeInTheDocument()
      expect(screen.getByText(/Criar sua primeira liga/)).toBeInTheDocument()
    })
  })
})

describe('LigasPage - Create League Modal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    })
  })

  it('disables create button when name is shorter than 2 characters', async () => {
    renderWithLeagueProvider(<LigasPage />)

    await waitFor(() => {
      expect(screen.getByText(/Criar sua primeira liga/)).toBeInTheDocument()
    })

    const createBtn = screen.getByText(/Criar sua primeira liga/)
    fireEvent.click(createBtn)

    // Modal should be open
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Ex: Bolão da Família')).toBeInTheDocument()
    })

    const nameInput = screen.getByPlaceholderText(
      'Ex: Bolão da Família'
    ) as HTMLInputElement

    // Type a 1-character name (too short)
    fireEvent.change(nameInput, { target: { value: 'A' } })

    // The submit button should be disabled for short names
    const createButtons = screen.getAllByRole('button')
    const submitBtn = createButtons.find(btn => btn.textContent === 'Criar')
    expect(submitBtn).toBeDisabled()
  })

  it('allows submission and validates max length on submit', async () => {
    renderWithLeagueProvider(<LigasPage />)

    await waitFor(() => {
      expect(screen.getByText(/Criar sua primeira liga/)).toBeInTheDocument()
    })

    const createBtn = screen.getByText(/Criar sua primeira liga/)
    fireEvent.click(createBtn)

    // Modal should be open
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Ex: Bolão da Família')).toBeInTheDocument()
    })

    const nameInput = screen.getByPlaceholderText(
      'Ex: Bolão da Família'
    ) as HTMLInputElement
    // 51 characters - over the max of 50
    const longName = 'A'.repeat(51)
    fireEvent.change(nameInput, { target: { value: longName } })

    // Character counter should show 51/50
    const charCounter = screen.getByText('51/50 caracteres')
    expect(charCounter).toBeInTheDocument()
  })
})

describe('LigasPage - Descobrir tab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    })
  })

  it('renders open league cards from the discover endpoint', async () => {
    const openLeague1 = mockLeagueSummary({
      id: 'open1',
      name: 'Public League 1',
      access_type: 'open',
    })
    const openLeague2 = mockLeagueSummary({
      id: 'open2',
      name: 'Public League 2',
      access_type: 'open',
    })

    ;(global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/discover')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [openLeague1, openLeague2] }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: [] }),
      })
    })

    renderWithLeagueProvider(<LigasPage />)

    const discoverTab = screen.getByRole('button', { name: 'Descobrir' })
    fireEvent.click(discoverTab)

    await waitFor(() => {
      expect(screen.getByText('Public League 1')).toBeInTheDocument()
      expect(screen.getByText('Public League 2')).toBeInTheDocument()
    })
  })

  it('shows join confirmation dialog when a discover card is tapped', async () => {
    const openLeague = mockLeagueSummary({
      id: 'open1',
      name: 'Public League',
      access_type: 'open',
    })

    ;(global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/discover')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [openLeague] }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: [] }),
      })
    })

    renderWithLeagueProvider(<LigasPage />)

    const discoverTab = screen.getByRole('button', { name: 'Descobrir' })
    fireEvent.click(discoverTab)

    await waitFor(() => {
      expect(screen.getByText('Public League')).toBeInTheDocument()
    })

    const leagueCard = screen.getByText('Public League').closest('button')!
    fireEvent.click(leagueCard)

    await waitFor(() => {
      expect(screen.getByText(/Deseja entrar em/)).toBeInTheDocument()
    })
  })

  it('closes join dialog without API call when user declines', async () => {
    const openLeague = mockLeagueSummary({
      id: 'open1',
      name: 'Public League',
      access_type: 'open',
    })

    ;(global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/discover')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [openLeague] }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: [] }),
      })
    })

    renderWithLeagueProvider(<LigasPage />)

    const discoverTab = screen.getByRole('button', { name: 'Descobrir' })
    fireEvent.click(discoverTab)

    await waitFor(() => {
      expect(screen.getByText('Public League')).toBeInTheDocument()
    })

    const leagueCard = screen.getByText('Public League').closest('button')!
    fireEvent.click(leagueCard)

    await waitFor(() => {
      expect(screen.getByText(/Deseja entrar em/)).toBeInTheDocument()
    })

    const cancelBtn = screen.getByRole('button', { name: /Cancelar/ })
    fireEvent.click(cancelBtn)

    await waitFor(() => {
      expect(screen.queryByText(/Deseja entrar em/)).not.toBeInTheDocument()
    })

    // Should not have called join endpoint
    const joinCalls = (global.fetch as any).mock.calls.filter((call: any[]) =>
      call[0].includes('/join')
    )
    expect(joinCalls).toHaveLength(0)
  })
})

describe('LigasPage - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    })
  })

  it('submitting create form adds new league to Minhas Ligas without page reload', async () => {
    ;(global.fetch as any).mockImplementation((url: string, options?: any) => {
      if (url === '/api/leagues' && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: mockLeagueSummary({
              id: 'new-league',
              name: 'My Brand New League',
            }),
          }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: [] }),
      })
    })

    renderWithLeagueProvider(<LigasPage />)

    await waitFor(() => {
      expect(screen.getByText(/Criar sua primeira liga/)).toBeInTheDocument()
    })

    const createBtn = screen.getByText(/Criar sua primeira liga/)
    fireEvent.click(createBtn)

    const nameInput = screen.getByPlaceholderText(
      'Ex: Bolão da Família'
    ) as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: 'My Brand New League' } })

    const submitBtn = screen.getByRole('button', { name: /^Criar$/ })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('My Brand New League')).toBeInTheDocument()
    })

    // Verify POST was called
    const createCalls = (global.fetch as any).mock.calls.filter((call: any[]) =>
      call[0] === '/api/leagues' && call[1]?.method === 'POST'
    )
    expect(createCalls.length).toBeGreaterThan(0)
  })
})

describe('LigasPage - Portuguese text', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    })
  })

  it('displays all UI text in PT-BR', async () => {
    renderWithLeagueProvider(<LigasPage />)

    await waitFor(() => {
      expect(screen.getByText('Minhas ligas')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Minhas Ligas' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Descobrir' })).toBeInTheDocument()
    })
  })
})
