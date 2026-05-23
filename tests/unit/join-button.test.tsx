/**
 * @vitest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { JoinButton } from '@/app/join/JoinButton'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock fetch globally
global.fetch = vi.fn()

describe('JoinButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPush.mockClear()
    ;(global.fetch as any).mockClear()
  })

  it('should render the button', () => {
    render(<JoinButton leagueId="league-123" token="token123" />)
    expect(screen.getByText('Entrar na Liga')).toBeInTheDocument()
  })

  it('should show loading state while joining', async () => {
    ;(global.fetch as any).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({ status: 'success', data: {} }),
            })
          }, 100)
        )
    )

    render(<JoinButton leagueId="league-123" token="token123" />)

    const button = screen.getByText('Entrar na Liga')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Entrando...')).toBeInTheDocument()
    })
  })

  it('should call API with correct leagueId and token', async () => {
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success', data: {} }),
    })

    render(<JoinButton leagueId="league-123" token="token123" />)

    const button = screen.getByText('Entrar na Liga')
    fireEvent.click(button)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/leagues/league-123/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: 'token123' }),
      })
    })
  })

  it('should navigate to league detail on success', async () => {
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success', data: {} }),
    })

    render(<JoinButton leagueId="league-123" token="token123" />)

    const button = screen.getByText('Entrar na Liga')
    fireEvent.click(button)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/ligas/league-123')
    })
  })

  it('should show error when user is already a member', async () => {
    ;(global.fetch as any).mockResolvedValue({
      ok: false,
      json: async () => ({
        status: 'error',
        code: 'ALREADY_A_MEMBER',
        error: 'Usuário já é membro',
      }),
    })

    render(<JoinButton leagueId="league-123" token="token123" />)

    const button = screen.getByText('Entrar na Liga')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Você já é membro desta liga.')).toBeInTheDocument()
    })
  })

  it('should show error when token is invalid', async () => {
    ;(global.fetch as any).mockResolvedValue({
      ok: false,
      json: async () => ({
        status: 'error',
        code: 'INVALID_TOKEN',
        error: 'Token inválido',
      }),
    })

    render(<JoinButton leagueId="league-123" token="invalid" />)

    const button = screen.getByText('Entrar na Liga')
    fireEvent.click(button)

    await waitFor(() => {
      expect(
        screen.getByText(/Token inválido. Verifique o link/i)
      ).toBeInTheDocument()
    })
  })

  it('should show error when session expired', async () => {
    ;(global.fetch as any).mockResolvedValue({
      ok: false,
      json: async () => ({
        status: 'error',
        code: 'SESSION_EXPIRED',
        error: 'Sessão expirada',
      }),
    })

    render(<JoinButton leagueId="league-123" token="token123" />)

    const button = screen.getByText('Entrar na Liga')
    fireEvent.click(button)

    await waitFor(() => {
      expect(
        screen.getByText(/Sua sessão expirou/i)
      ).toBeInTheDocument()
    })
  })

  it('should show generic error on network failure', async () => {
    ;(global.fetch as any).mockRejectedValue(new Error('Network error'))

    render(<JoinButton leagueId="league-123" token="token123" />)

    const button = screen.getByText('Entrar na Liga')
    fireEvent.click(button)

    await waitFor(() => {
      expect(
        screen.getByText(/Erro ao entrar na liga/i)
      ).toBeInTheDocument()
    })
  })
})
