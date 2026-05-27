/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InviteShareButton from '@/app/ligas/[id]/components/InviteShareButton'
import PainelSidebar from '@/app/ligas/[id]/components/PainelSidebar'
import PainelTopBar from '@/app/ligas/[id]/components/PainelTopBar'

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/ligas/test-league',
}))

// Stable clipboard mock — defined once, writeText replaced per test
const mockClipboard = { writeText: vi.fn().mockResolvedValue(undefined) }
const mockExecCommand = vi.fn().mockReturnValue(true)

beforeAll(() => {
  Object.defineProperty(navigator, 'clipboard', {
    value: mockClipboard,
    configurable: true,
    writable: true,
  })
  Object.defineProperty(document, 'execCommand', {
    value: mockExecCommand,
    configurable: true,
    writable: true,
  })
})

beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000'
  mockClipboard.writeText = vi.fn().mockResolvedValue(undefined)
  mockExecCommand.mockReturnValue(true)
})

afterEach(() => {
  vi.clearAllMocks()
})

const defaultSidebarProps = {
  leagueId: 'test-league',
  leagueName: 'Bolão da Família',
  leagueLogoUrl: null,
  inviteToken: 'abc123',
  currentUserName: 'João Silva',
  currentUserAvatarColor: '#FF5733',
}

const defaultTopBarProps = {
  leagueName: 'Bolão da Família',
  leagueLogoUrl: null,
  inviteToken: 'abc123',
  currentUserName: 'João Silva',
  currentUserAvatarColor: '#FF5733',
}

describe('InviteShareButton', () => {
  it('calls navigator.clipboard.writeText with the correct invite URL', async () => {
    const inviteUrl = 'http://localhost:3000/join?token=abc123'
    render(<InviteShareButton inviteUrl={inviteUrl} variant="sidebar" />)

    // Open popover
    fireEvent.click(screen.getByRole('button'))

    // Click copy button
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Copiar link/i }))
    })

    expect(mockClipboard.writeText).toHaveBeenCalledWith(inviteUrl)
  })

  it('WhatsApp anchor href contains api.whatsapp.com/send?text= and the URL-encoded invite URL', async () => {
    const user = userEvent.setup()
    const inviteUrl = 'http://localhost:3000/join?token=abc123'
    render(<InviteShareButton inviteUrl={inviteUrl} variant="sidebar" />)

    await user.click(screen.getByRole('button'))

    const whatsappLink = screen.getByRole('link', { name: /WhatsApp/i })
    const href = whatsappLink.getAttribute('href') ?? ''
    expect(href).toContain('api.whatsapp.com/send?text=')
    expect(href).toContain(encodeURIComponent(inviteUrl))
  })

  it('shows success feedback element after clicking copy', async () => {
    const inviteUrl = 'http://localhost:3000/join?token=abc123'
    render(<InviteShareButton inviteUrl={inviteUrl} variant="sidebar" />)

    fireEvent.click(screen.getByRole('button'))

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Copiar link/i }))
    })

    await waitFor(() => {
      expect(screen.getByTestId('copy-success')).toBeInTheDocument()
    })
  })

  it('shows copy-success feedback even when clipboard API rejects (fallback path)', async () => {
    mockClipboard.writeText = vi.fn().mockRejectedValue(new Error('no clipboard'))

    const inviteUrl = 'http://localhost:3000/join?token=abc123'
    render(<InviteShareButton inviteUrl={inviteUrl} variant="sidebar" />)

    fireEvent.click(screen.getByRole('button'))

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Copiar link/i }))
    })

    await waitFor(() => {
      expect(screen.getByTestId('copy-success')).toBeInTheDocument()
    })
  })
})

describe('PainelSidebar', () => {
  it('nav item "Palpites" links to the palpites page', () => {
    render(<PainelSidebar {...defaultSidebarProps} />)
    const palpitesLink = screen.getByRole('link', { name: /Palpites/i })
    expect(palpitesLink).toHaveAttribute('href', '/ligas/test-league/palpites')
  })

  it('nav item "Painel" links to the league panel page', () => {
    render(<PainelSidebar {...defaultSidebarProps} />)
    const painelLink = screen.getByRole('link', { name: /^Painel$/i })
    expect(painelLink).toHaveAttribute('href', '/ligas/test-league')
  })

  it('renders with a class containing "lg:flex" (visible on desktop)', () => {
    const { container } = render(<PainelSidebar {...defaultSidebarProps} />)
    const aside = container.querySelector('aside')
    expect(aside?.className).toContain('lg:flex')
  })

  it('inert nav items have pointer-events-none', () => {
    render(<PainelSidebar {...defaultSidebarProps} />)
    const tabela = screen.getByText('Tabela').closest('[role="button"]')
    expect(tabela?.className).toContain('pointer-events-none')
  })

  it('contains a nav link to /ligas', () => {
    render(<PainelSidebar {...defaultSidebarProps} />)
    const ligasLink = screen.getByRole('link', { name: /^Ligas$/i })
    expect(ligasLink).toHaveAttribute('href', '/ligas')
  })

  it('renders the league name', () => {
    render(<PainelSidebar {...defaultSidebarProps} />)
    expect(screen.getByText('Bolão da Família')).toBeInTheDocument()
  })

  it('renders user first name', () => {
    render(<PainelSidebar {...defaultSidebarProps} />)
    expect(screen.getByText('João')).toBeInTheDocument()
  })

  it('renders all 7 nav items', () => {
    render(<PainelSidebar {...defaultSidebarProps} />)
    expect(screen.getByText('Painel')).toBeInTheDocument()
    expect(screen.getByText('Palpites')).toBeInTheDocument()
    expect(screen.getByText('Tabela')).toBeInTheDocument()
    expect(screen.getByText('Mata-mata')).toBeInTheDocument()
    expect(screen.getByText('Ranking')).toBeInTheDocument()
    expect(screen.getByText('Ligas')).toBeInTheDocument()
    expect(screen.getByText('Perfil')).toBeInTheDocument()
  })
})

describe('PainelTopBar', () => {
  it('contains a Link with href="/ligas" for the back CTA', () => {
    render(<PainelTopBar {...defaultTopBarProps} />)
    const backLink = screen.getByRole('link', { name: /Bolão da Família/i })
    expect(backLink).toHaveAttribute('href', '/ligas')
  })

  it('renders with a class containing "lg:hidden" (hidden on desktop)', () => {
    const { container } = render(<PainelTopBar {...defaultTopBarProps} />)
    const header = container.querySelector('header')
    expect(header?.className).toContain('lg:hidden')
  })

  it('renders the league name', () => {
    render(<PainelTopBar {...defaultTopBarProps} />)
    expect(screen.getByText('Bolão da Família')).toBeInTheDocument()
  })

  it('renders a share button', () => {
    render(<PainelTopBar {...defaultTopBarProps} />)
    expect(screen.getByRole('button', { name: /Compartilhar liga/i })).toBeInTheDocument()
  })
})
