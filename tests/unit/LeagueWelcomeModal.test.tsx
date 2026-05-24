/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LeagueWelcomeModal from '@/components/LeagueWelcomeModal'

const DEFAULT_PROPS = {
  leagueName: 'Bolão da Família',
  inviteToken: 'abc123token',
  role: 'admin' as const,
  onComplete: vi.fn(),
}

async function navigateToScreen4(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Próximo/ }))
  await waitFor(() => expect(screen.getByText('Atenção aos horários')).toBeInTheDocument())
  await user.click(screen.getByRole('button', { name: /Próximo/ }))
  await waitFor(() => expect(screen.getByText('Quanto vale cada acerto')).toBeInTheDocument())
  await user.click(screen.getByRole('button', { name: /Convidar amigos/ }))
  await waitFor(() => expect(screen.getByText('Chama a galera pra jogar')).toBeInTheDocument())
}

describe('LeagueWelcomeModal', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    vi.clearAllMocks()
    fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }))

    process.env.NEXT_PUBLIC_SITE_URL = 'https://bolao.test'

    // Provide a baseline clipboard mock so handleCopy doesn't throw
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Screen 1 renders on mount with "Próximo" button and no "Voltar" button', () => {
    render(<LeagueWelcomeModal {...DEFAULT_PROPS} />)

    expect(screen.getByRole('button', { name: /Próximo/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Voltar/ })).not.toBeInTheDocument()
  })

  it('clicking "Próximo" on Screen 1 renders Screen 2', async () => {
    const user = userEvent.setup()
    render(<LeagueWelcomeModal {...DEFAULT_PROPS} />)

    await user.click(screen.getByRole('button', { name: /Próximo/ }))

    await waitFor(() => {
      expect(screen.getByText('Atenção aos horários')).toBeInTheDocument()
    })
  })

  it('clicking "Voltar" on Screen 2 renders Screen 1', async () => {
    const user = userEvent.setup()
    render(<LeagueWelcomeModal {...DEFAULT_PROPS} />)

    await user.click(screen.getByRole('button', { name: /Próximo/ }))
    await waitFor(() => expect(screen.getByText('Atenção aos horários')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Voltar/ }))

    await waitFor(() => {
      expect(screen.getByText(`Bem-vindo ao ${DEFAULT_PROPS.leagueName}!`)).toBeInTheDocument()
    })
  })

  it('clicking "Próximo" on Screen 2 renders Screen 3', async () => {
    const user = userEvent.setup()
    render(<LeagueWelcomeModal {...DEFAULT_PROPS} />)

    await user.click(screen.getByRole('button', { name: /Próximo/ }))
    await waitFor(() => expect(screen.getByText('Atenção aos horários')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Próximo/ }))

    await waitFor(() => {
      expect(screen.getByText('Quanto vale cada acerto')).toBeInTheDocument()
    })
  })

  it('Screen 3 renders the scoring table with 5 rows and the footer note', async () => {
    const user = userEvent.setup()
    render(<LeagueWelcomeModal {...DEFAULT_PROPS} />)

    await user.click(screen.getByRole('button', { name: /Próximo/ }))
    await user.click(screen.getByRole('button', { name: /Próximo/ }))
    await waitFor(() => expect(screen.getByText('Quanto vale cada acerto')).toBeInTheDocument())

    expect(screen.getByText('Palpite de Campeão')).toBeInTheDocument()
    expect(screen.getByText('Palpite de Vice-Campeão')).toBeInTheDocument()
    expect(screen.getByText('Placar Exato (Grupos)')).toBeInTheDocument()
    expect(screen.getByText('Vencedor/Empate (Grupos)')).toBeInTheDocument()
    expect(screen.getByText('Multiplicador 32 avos')).toBeInTheDocument()
    expect(screen.getByText(/Eliminatórias valem mais/)).toBeInTheDocument()
  })

  it('clicking "Convidar amigos" on Screen 3 renders Screen 4', async () => {
    const user = userEvent.setup()
    render(<LeagueWelcomeModal {...DEFAULT_PROPS} />)

    await user.click(screen.getByRole('button', { name: /Próximo/ }))
    await user.click(screen.getByRole('button', { name: /Próximo/ }))
    await waitFor(() => expect(screen.getByText('Quanto vale cada acerto')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Convidar amigos/ }))

    await waitFor(() => {
      expect(screen.getByText('Chama a galera pra jogar')).toBeInTheDocument()
    })
  })

  it('Screen 4 with role="admin" renders "Sua liga foi criada!" in body copy', async () => {
    const user = userEvent.setup()
    render(<LeagueWelcomeModal {...DEFAULT_PROPS} role="admin" />)

    await navigateToScreen4(user)

    expect(screen.getByText(/Sua liga foi criada!/)).toBeInTheDocument()
  })

  it('Screen 4 with role="member" renders "Você entrou em" in body copy', async () => {
    const user = userEvent.setup()
    render(<LeagueWelcomeModal {...DEFAULT_PROPS} role="member" />)

    await navigateToScreen4(user)

    expect(screen.getByText(/Você entrou em/)).toBeInTheDocument()
  })

  it('"Copiar" button calls navigator.clipboard.writeText with the correct invite URL', async () => {
    // userEvent.setup() installs its own Clipboard stub on navigator.clipboard,
    // so we must define our spy AFTER setup() to override that stub.
    const user = userEvent.setup()
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: writeTextMock },
    })

    render(<LeagueWelcomeModal {...DEFAULT_PROPS} />)

    await navigateToScreen4(user)
    await waitFor(() => expect(screen.getByRole('button', { name: /Copiar/ })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Copiar/ }))

    expect(writeTextMock).toHaveBeenCalledWith('https://bolao.test/join?token=abc123token')
  })

  it('after "Copiar" is clicked, button text changes to "Copiado!"', async () => {
    const user = userEvent.setup()
    render(<LeagueWelcomeModal {...DEFAULT_PROPS} />)

    await navigateToScreen4(user)
    await waitFor(() => expect(screen.getByRole('button', { name: /Copiar/ })).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Copiar/ }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Copiado!/ })).toBeInTheDocument()
    })
  })

  it('WhatsApp anchor href contains wa.me/?text= with the encoded invite URL', async () => {
    const user = userEvent.setup()
    render(<LeagueWelcomeModal {...DEFAULT_PROPS} />)

    await navigateToScreen4(user)

    const waLink = screen.getByTestId('whatsapp-link')
    expect(waLink).toHaveAttribute('href', expect.stringContaining('wa.me/?text='))
    expect(waLink).toHaveAttribute(
      'href',
      expect.stringContaining(
        encodeURIComponent('https://bolao.test/join?token=abc123token')
      )
    )
  })

  it('"Pronto, bora jogar!" button calls onComplete()', async () => {
    const onComplete = vi.fn()
    const user = userEvent.setup()
    render(<LeagueWelcomeModal {...DEFAULT_PROPS} onComplete={onComplete} />)

    await navigateToScreen4(user)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Pronto, bora jogar!/ })).toBeInTheDocument()
    )

    await user.click(screen.getByRole('button', { name: /Pronto, bora jogar!/ }))

    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('does NOT call fetch on component mount (PATCH is deferred to onComplete in parent)', () => {
    render(<LeagueWelcomeModal {...DEFAULT_PROPS} />)

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('backdrop click does NOT call onComplete() and does NOT unmount the modal', async () => {
    const onComplete = vi.fn()
    const user = userEvent.setup()
    render(<LeagueWelcomeModal {...DEFAULT_PROPS} onComplete={onComplete} />)

    const backdrop = screen.getByTestId('welcome-modal-backdrop')
    await user.click(backdrop)

    expect(onComplete).not.toHaveBeenCalled()
    expect(screen.getByText('COMO FUNCIONA')).toBeInTheDocument()
  })
})
