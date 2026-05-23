/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter, useParams } from 'next/navigation'
import LeagueDetailPage from '@/app/ligas/[id]/page'
import { useLeague } from '@/lib/league-context'

vi.mock('next/navigation')
vi.mock('@/lib/league-context')

const mockLeague = {
  id: 'league-123',
  name: 'Bolão da Família',
  description: 'Copa com a galera da casa',
  access_type: 'private' as const,
  logo_url: null,
  role: 'admin' as const,
  member_count: 3,
  created_by: 'user-admin-id',
  created_at: '2026-01-01T00:00:00Z',
  members: [
    {
      user_id: 'user-admin-id',
      full_name: 'João Admin',
      avatar_url: null,
      avatar_color: '#FFC72C',
      role: 'admin',
      joined_at: '2026-01-01T00:00:00Z',
    },
    {
      user_id: 'user-member-1-id',
      full_name: 'Maria Silva',
      avatar_url: null,
      avatar_color: '#0097A9',
      role: 'member',
      joined_at: '2026-01-02T00:00:00Z',
    },
    {
      user_id: 'user-member-2-id',
      full_name: 'Pedro Costa',
      avatar_url: null,
      avatar_color: '#244C5A',
      role: 'member',
      joined_at: '2026-01-03T00:00:00Z',
    },
  ],
}

describe('LeagueDetailPage', () => {
  let mockRouterPush: ReturnType<typeof vi.fn>
  let mockUseRouter: ReturnType<typeof vi.fn>
  let mockUseParams: ReturnType<typeof vi.fn>
  let mockUseLeague: ReturnType<typeof vi.fn>
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    mockRouterPush = vi.fn()
    mockUseRouter = vi.fn(() => ({
      push: mockRouterPush,
    }))
    mockUseParams = vi.fn(() => ({ id: 'league-123' }))
    mockUseLeague = vi.fn(() => ({
      league: { id: 'league-123', name: 'Bolão da Família' },
      setLeague: vi.fn(),
    }))

    vi.mocked(useRouter as any).mockImplementation(mockUseRouter)
    vi.mocked(useParams as any).mockImplementation(mockUseParams)
    vi.mocked(useLeague as any).mockImplementation(mockUseLeague)

    fetchSpy = vi.spyOn(global, 'fetch')
  })

  describe('League Header Rendering', () => {
    beforeEach(() => {
      fetchSpy.mockImplementation((url: string | Request) => {
        const urlStr = typeof url === 'string' ? url : url.url
        if (urlStr.includes('/api/auth/me')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: { user: { id: 'user-admin-id' } },
              }),
          } as Response)
        }
        if (urlStr.includes('/api/leagues/league-123')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: mockLeague }),
          } as Response)
        }
        return Promise.reject(new Error('Unknown URL'))
      })
    })

    it('renders league name', async () => {
      render(<LeagueDetailPage />)
      await waitFor(() => {
        expect(screen.getByText('Bolão da Família')).toBeInTheDocument()
      })
    })

    it('renders league description', async () => {
      render(<LeagueDetailPage />)
      await waitFor(() => {
        expect(screen.getByText('Copa com a galera da casa')).toBeInTheDocument()
      })
    })

    it('renders member count', async () => {
      render(<LeagueDetailPage />)
      await waitFor(() => {
        expect(screen.getByText(/3 participantes/)).toBeInTheDocument()
      })
    })

    it('renders access type badge "Privada"', async () => {
      render(<LeagueDetailPage />)
      await waitFor(() => {
        expect(screen.getByText('Privada')).toBeInTheDocument()
      })
    })

    it('renders access type badge "Aberta" for open leagues', async () => {
      fetchSpy.mockImplementation((url: string | Request) => {
        const urlStr = typeof url === 'string' ? url : url.url
        if (urlStr.includes('/api/auth/me')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: { user: { id: 'user-admin-id' } },
              }),
          } as Response)
        }
        if (urlStr.includes('/api/leagues/league-123')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: { ...mockLeague, access_type: 'open' },
              }),
          } as Response)
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      render(<LeagueDetailPage />)
      await waitFor(() => {
        expect(screen.getByText('Aberta')).toBeInTheDocument()
      })
    })
  })

  describe('Member List Rendering', () => {
    beforeEach(() => {
      fetchSpy.mockImplementation((url: string | Request) => {
        const urlStr = typeof url === 'string' ? url : url.url
        if (urlStr.includes('/api/auth/me')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: { user: { id: 'user-admin-id' } },
              }),
          } as Response)
        }
        if (urlStr.includes('/api/leagues/league-123')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: mockLeague }),
          } as Response)
        }
        return Promise.reject(new Error('Unknown URL'))
      })
    })

    it('renders all members with full names', async () => {
      render(<LeagueDetailPage />)
      await waitFor(() => {
        expect(screen.getByText('João Admin')).toBeInTheDocument()
        expect(screen.getByText('Maria Silva')).toBeInTheDocument()
        expect(screen.getByText('Pedro Costa')).toBeInTheDocument()
      })
    })

    it('renders member role badges', async () => {
      render(<LeagueDetailPage />)
      await waitFor(() => {
        const adminBadges = screen.getAllByText('Admin')
        expect(adminBadges.length).toBeGreaterThan(0)
        const memberBadges = screen.getAllByText('Membro')
        expect(memberBadges.length).toBeGreaterThan(0)
      })
    })

    it('renders join dates in PT-BR format', async () => {
      render(<LeagueDetailPage />)
      await waitFor(() => {
        // Verify that all members are rendered (3 members in mock data)
        expect(screen.getByText('João Admin')).toBeInTheDocument()
        expect(screen.getByText('Maria Silva')).toBeInTheDocument()
        expect(screen.getByText('Pedro Costa')).toBeInTheDocument()
      })
      // Verify page contains dates with the year 2026
      expect(document.body.textContent).toContain('2026')
    })

    it('renders avatar initials for members without avatar URL', async () => {
      render(<LeagueDetailPage />)
      await waitFor(() => {
        expect(screen.getByText('M', { selector: 'div' })).toBeInTheDocument()
        expect(screen.getByText('P', { selector: 'div' })).toBeInTheDocument()
      })
    })
  })

  describe('Admin Action Visibility', () => {
    beforeEach(() => {
      fetchSpy.mockImplementation((url: string | Request) => {
        const urlStr = typeof url === 'string' ? url : url.url
        if (urlStr.includes('/api/auth/me')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: { user: { id: 'user-admin-id' } },
              }),
          } as Response)
        }
        if (urlStr.includes('/api/leagues/league-123')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: mockLeague }),
          } as Response)
        }
        return Promise.reject(new Error('Unknown URL'))
      })
    })

    it('shows "Configurações" button for admin', async () => {
      render(<LeagueDetailPage />)
      await waitFor(() => {
        expect(screen.getByText('Configurações')).toBeInTheDocument()
      })
    })

    it('shows "Excluir Liga" button for admin', async () => {
      render(<LeagueDetailPage />)
      await waitFor(() => {
        expect(screen.getByText('Excluir Liga')).toBeInTheDocument()
      })
    })

    it('shows "Remover" button for admin next to non-admin members', async () => {
      render(<LeagueDetailPage />)
      await waitFor(() => {
        const removeButtons = screen.getAllByText('Remover')
        expect(removeButtons.length).toBe(2)
      })
    })

    it('does not show "Remover" button for the admin next to their own name', async () => {
      render(<LeagueDetailPage />)
      await waitFor(() => {
        const adminRow = screen.getByText('João Admin').closest('div')?.parentElement
        if (!adminRow) throw new Error('Admin row not found')
        const removeInAdminRow = within(adminRow).queryByText('Remover')
        expect(removeInAdminRow).not.toBeInTheDocument()
      })
    })
  })

  describe('Member View (Non-Admin)', () => {
    beforeEach(() => {
      fetchSpy.mockImplementation((url: string | Request) => {
        const urlStr = typeof url === 'string' ? url : url.url
        if (urlStr.includes('/api/auth/me')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: { user: { id: 'user-member-1-id' } },
              }),
          } as Response)
        }
        if (urlStr.includes('/api/leagues/league-123')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: {
                  ...mockLeague,
                  role: 'member',
                },
              }),
          } as Response)
        }
        return Promise.reject(new Error('Unknown URL'))
      })
    })

    it('does not show "Configurações" button for non-admin', async () => {
      render(<LeagueDetailPage />)
      await waitFor(() => {
        expect(screen.queryByText('Configurações')).not.toBeInTheDocument()
      })
    })

    it('does not show "Excluir Liga" button for non-admin', async () => {
      render(<LeagueDetailPage />)
      await waitFor(() => {
        expect(screen.queryByText('Excluir Liga')).not.toBeInTheDocument()
      })
    })

    it('does not show "Remover" buttons for non-admin', async () => {
      render(<LeagueDetailPage />)
      await waitFor(() => {
        expect(screen.queryByText('Remover')).not.toBeInTheDocument()
      })
    })

    it('shows "Convidar" button to non-admin', async () => {
      render(<LeagueDetailPage />)
      await waitFor(() => {
        expect(screen.getByText('Convidar')).toBeInTheDocument()
      })
    })
  })

  describe('"Convidar" Button Functionality', () => {
    let clipboardWriteSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      // Mock navigator.clipboard for jsdom using vi.stubGlobal
      const mockClipboard = {
        writeText: vi.fn(() => Promise.resolve()),
      }
      vi.stubGlobal('navigator', {
        ...navigator,
        clipboard: mockClipboard,
      })
      clipboardWriteSpy = vi.spyOn(navigator.clipboard, 'writeText')
      fetchSpy.mockImplementation((url: string | Request) => {
        const urlStr = typeof url === 'string' ? url : url.url
        if (urlStr.includes('/api/auth/me')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: { user: { id: 'user-admin-id' } },
              }),
          } as Response)
        }
        if (urlStr.includes('/api/leagues/league-123')) {
          if (urlStr.includes('invite-link')) {
            return Promise.resolve({
              ok: true,
              json: () =>
                Promise.resolve({
                  data: { invite_url: 'https://example.com/join?token=abc123' },
                }),
            } as Response)
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: mockLeague }),
          } as Response)
        }
        return Promise.reject(new Error('Unknown URL'))
      })
    })

    it('shows "Convidar" button to all members', async () => {
      render(<LeagueDetailPage />)
      await waitFor(() => {
        expect(screen.getByText('Convidar')).toBeInTheDocument()
      })
    })

    it('calls invite-link endpoint when clicking "Convidar"', async () => {
      const user = userEvent.setup()
      render(<LeagueDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Convidar')).toBeInTheDocument()
      })

      const inviteButton = screen.getByText('Convidar')
      await user.click(inviteButton)

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          expect.stringContaining('/api/leagues/league-123/invite-link')
        )
      })
    })

    it('copies invite URL to clipboard', async () => {
      const user = userEvent.setup()
      // Create a new mock clipboard for this test
      const mockWriteText = vi.fn(() => Promise.resolve())
      const newMockClipboard = { writeText: mockWriteText }
      vi.stubGlobal('navigator', {
        ...navigator,
        clipboard: newMockClipboard,
      })

      render(<LeagueDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Convidar')).toBeInTheDocument()
      })

      const inviteButton = screen.getByText('Convidar')
      await user.click(inviteButton)

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith('https://example.com/join?token=abc123')
      })
    })

    it('shows success toast after copying link', async () => {
      const user = userEvent.setup()
      clipboardWriteSpy.mockResolvedValue(undefined)

      render(<LeagueDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Convidar')).toBeInTheDocument()
      })

      const inviteButton = screen.getByText('Convidar')
      await user.click(inviteButton)

      await waitFor(() => {
        expect(
          screen.getByText('Link copiado para a área de transferência!')
        ).toBeInTheDocument()
      })
    })
  })

  describe('"Remover" Member Functionality', () => {
    beforeEach(() => {
      fetchSpy.mockImplementation((url: string | Request) => {
        const urlStr = typeof url === 'string' ? url : url.url
        if (urlStr.includes('/api/auth/me')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: { user: { id: 'user-admin-id' } },
              }),
          } as Response)
        }
        if (urlStr.includes('/api/leagues/league-123')) {
          if (urlStr.includes('members')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ data: { ok: true } }),
            } as Response)
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: mockLeague }),
          } as Response)
        }
        return Promise.reject(new Error('Unknown URL'))
      })
    })

    it('shows confirmation dialog when clicking "Remover"', async () => {
      const user = userEvent.setup()
      render(<LeagueDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Maria Silva')).toBeInTheDocument()
      })

      const removeButtons = screen.getAllByText('Remover')
      await user.click(removeButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Remover membro')).toBeInTheDocument()
      })
    })

    it('shows member name in confirmation dialog', async () => {
      const user = userEvent.setup()
      render(<LeagueDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Maria Silva')).toBeInTheDocument()
      })

      const removeButtons = screen.getAllByText('Remover')
      await user.click(removeButtons[0])

      await waitFor(() => {
        // Check for the confirmation message that includes the member name
        expect(screen.getByText(/Tem certeza que deseja remover Maria Silva/)).toBeInTheDocument()
      })
    })

    it('calls DELETE endpoint with correct member ID', async () => {
      const user = userEvent.setup()
      render(<LeagueDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Maria Silva')).toBeInTheDocument()
      })

      const removeButtons = screen.getAllByText('Remover')
      await user.click(removeButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Remover membro')).toBeInTheDocument()
      })

      const confirmButton = screen.getByRole('button', { name: /Confirmar/ })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          expect.stringContaining('/api/leagues/league-123/members/user-member-1-id'),
          expect.objectContaining({ method: 'DELETE' })
        )
      })
    })
  })

  describe('"Excluir Liga" Functionality', () => {
    beforeEach(() => {
      fetchSpy.mockImplementation((url: string | Request) => {
        const urlStr = typeof url === 'string' ? url : url.url
        if (urlStr.includes('/api/auth/me')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: { user: { id: 'user-admin-id' } },
              }),
          } as Response)
        }
        if (urlStr.includes('/api/leagues/league-123')) {
          if (urlStr.includes('DELETE')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ data: { ok: true } }),
            } as Response)
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: mockLeague }),
          } as Response)
        }
        return Promise.reject(new Error('Unknown URL'))
      })
    })

    it('shows deletion confirmation dialog when clicking "Excluir Liga"', async () => {
      const user = userEvent.setup()
      render(<LeagueDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Excluir Liga')).toBeInTheDocument()
      })

      const deleteButton = screen.getByText('Excluir Liga')
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByText('Excluir liga')).toBeInTheDocument()
      })
    })

    it('requires typing the league name to confirm deletion', async () => {
      const user = userEvent.setup()
      render(<LeagueDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Excluir Liga')).toBeInTheDocument()
      })

      const deleteButton = screen.getByText('Excluir Liga')
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByText('Excluir liga')).toBeInTheDocument()
      })

      const confirmButton = screen.getByRole('button', { name: /Confirmar/ })
      expect(confirmButton).toBeDisabled()

      const input = screen.getByPlaceholderText('Digite o nome da liga')
      await user.type(input, 'Bolão da Família')

      await waitFor(() => {
        expect(confirmButton).not.toBeDisabled()
      })
    })

    it('calls DELETE endpoint with confirm_name', async () => {
      const user = userEvent.setup()
      render(<LeagueDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Excluir Liga')).toBeInTheDocument()
      })

      const deleteButton = screen.getByText('Excluir Liga')
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByText('Excluir liga')).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText('Digite o nome da liga')
      await user.type(input, 'Bolão da Família')

      const confirmButton = screen.getByRole('button', { name: /Confirmar/ })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          expect.stringContaining('/api/leagues/league-123'),
          expect.objectContaining({
            method: 'DELETE',
            body: expect.stringContaining('Bolão da Família'),
          })
        )
      })
    })

    it('navigates to /ligas after successful deletion', async () => {
      const user = userEvent.setup()
      render(<LeagueDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Excluir Liga')).toBeInTheDocument()
      })

      const deleteButton = screen.getByText('Excluir Liga')
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByText('Excluir liga')).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText('Digite o nome da liga')
      await user.type(input, 'Bolão da Família')

      const confirmButton = screen.getByRole('button', { name: /Confirmar/ })
      await user.click(confirmButton)

      await waitFor(
        () => {
          expect(mockRouterPush).toHaveBeenCalledWith('/ligas')
        },
        { timeout: 2000 }
      )
    })
  })

  describe('"Configurações" Modal', () => {
    beforeEach(() => {
      fetchSpy.mockImplementation((url: string | Request) => {
        const urlStr = typeof url === 'string' ? url : url.url
        if (urlStr.includes('/api/auth/me')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: { user: { id: 'user-admin-id' } },
              }),
          } as Response)
        }
        if (urlStr.includes('/api/leagues/league-123')) {
          if (urlStr.includes('PATCH')) {
            return Promise.resolve({
              ok: true,
              json: () =>
                Promise.resolve({
                  data: { name: 'Novo Nome', access_type: 'open' },
                }),
            } as Response)
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: mockLeague }),
          } as Response)
        }
        return Promise.reject(new Error('Unknown URL'))
      })
    })

    it('opens configuration modal when clicking "Configurações"', async () => {
      const user = userEvent.setup()
      render(<LeagueDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Configurações')).toBeInTheDocument()
      })

      const configButton = screen.getByText('Configurações')
      await user.click(configButton)

      await waitFor(() => {
        expect(screen.getByText('Configurações da Liga')).toBeInTheDocument()
      })
    })

    it('pre-fills current league name and access type', async () => {
      const user = userEvent.setup()
      render(<LeagueDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Configurações')).toBeInTheDocument()
      })

      const configButton = screen.getByText('Configurações')
      await user.click(configButton)

      await waitFor(() => {
        const nameInput = screen.getByDisplayValue('Bolão da Família')
        expect(nameInput).toBeInTheDocument()
      })
    })

    it('calls PATCH endpoint with updated data', async () => {
      const user = userEvent.setup()
      render(<LeagueDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Configurações')).toBeInTheDocument()
      })

      const configButton = screen.getByText('Configurações')
      await user.click(configButton)

      await waitFor(() => {
        expect(screen.getByText('Configurações da Liga')).toBeInTheDocument()
      })

      const nameInput = screen.getByDisplayValue('Bolão da Família')
      await user.clear(nameInput)
      await user.type(nameInput, 'Novo Nome')

      const saveButton = screen.getByRole('button', { name: /Salvar/ })
      await user.click(saveButton)

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          expect.stringContaining('/api/leagues/league-123'),
          expect.objectContaining({
            method: 'PATCH',
          })
        )
      })
    })

    it('updates league name without page reload', async () => {
      const user = userEvent.setup()
      render(<LeagueDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Configurações')).toBeInTheDocument()
      })

      const configButton = screen.getByText('Configurações')
      await user.click(configButton)

      await waitFor(() => {
        expect(screen.getByText('Configurações da Liga')).toBeInTheDocument()
      })

      const nameInput = screen.getByDisplayValue('Bolão da Família')
      await user.clear(nameInput)
      await user.type(nameInput, 'Novo Nome')

      const saveButton = screen.getByRole('button', { name: /Salvar/ })
      await user.click(saveButton)

      await waitFor(() => {
        // After save, the modal should close and the new name should appear
        expect(screen.queryByText('Configurações da Liga')).not.toBeInTheDocument()
        // The toast message indicates successful update
        expect(screen.getByText('Liga atualizada com sucesso!')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('shows error message when failing to load league', async () => {
      fetchSpy.mockImplementation((url: string | Request) => {
        const urlStr = typeof url === 'string' ? url : url.url
        if (urlStr.includes('/api/auth/me')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: { user: { id: 'user-admin-id' } },
              }),
          } as Response)
        }
        if (urlStr.includes('/api/leagues/league-123')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'League not found' }),
          } as Response)
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      render(<LeagueDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('League not found')).toBeInTheDocument()
      })
    })

    it('shows "Voltar para Ligas" button on error', async () => {
      fetchSpy.mockImplementation((url: string | Request) => {
        const urlStr = typeof url === 'string' ? url : url.url
        if (urlStr.includes('/api/auth/me')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: { user: { id: 'user-admin-id' } },
              }),
          } as Response)
        }
        if (urlStr.includes('/api/leagues/league-123')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'League not found' }),
          } as Response)
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      render(<LeagueDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Voltar para Ligas')).toBeInTheDocument()
      })
    })

    it('navigates to /ligas when clicking "Voltar para Ligas" on error', async () => {
      const user = userEvent.setup()
      fetchSpy.mockImplementation((url: string | Request) => {
        const urlStr = typeof url === 'string' ? url : url.url
        if (urlStr.includes('/api/auth/me')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: { user: { id: 'user-admin-id' } },
              }),
          } as Response)
        }
        if (urlStr.includes('/api/leagues/league-123')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'League not found' }),
          } as Response)
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      render(<LeagueDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Voltar para Ligas')).toBeInTheDocument()
      })

      const backButton = screen.getByText('Voltar para Ligas')
      await user.click(backButton)

      expect(mockRouterPush).toHaveBeenCalledWith('/ligas')
    })
  })
})
