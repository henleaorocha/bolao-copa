/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InviteShareButton from '@/app/ligas/[id]/components/InviteShareButton'
import PainelSidebar from '@/app/ligas/[id]/components/PainelSidebar'
import PainelTopBar from '@/app/ligas/[id]/components/PainelTopBar'
import BottomTabBar from '@/app/ligas/[id]/components/BottomTabBar'

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

  it('Ranking nav item is a link to the ranking route', () => {
    render(<PainelSidebar {...defaultSidebarProps} />)
    const rankingLink = screen.getByRole('link', { name: /^Ranking$/i })
    expect(rankingLink).toHaveAttribute('href', '/ligas/test-league/ranking')
    expect(rankingLink.className).not.toContain('pointer-events-none')
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

  it('renders all 6 nav items', () => {
    render(<PainelSidebar {...defaultSidebarProps} />)
    expect(screen.getByText('Painel')).toBeInTheDocument()
    expect(screen.getByText('Palpites')).toBeInTheDocument()
    expect(screen.getByText('Tabela')).toBeInTheDocument()
    expect(screen.getByText('Mata-mata')).toBeInTheDocument()
    expect(screen.getByText('Ranking')).toBeInTheDocument()
    expect(screen.getByText('Ligas')).toBeInTheDocument()
  })

  it('does not render a Perfil nav item', () => {
    render(<PainelSidebar {...defaultSidebarProps} />)
    expect(screen.queryByText('Perfil')).not.toBeInTheDocument()
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

describe('PainelSidebar — Mata-mata navigation (task_04)', () => {
  it('Mata-mata nav item links to the mata-mata page', () => {
    render(<PainelSidebar {...defaultSidebarProps} />)
    const link = screen.getByRole('link', { name: /Mata-mata/i })
    expect(link).toHaveAttribute('href', '/ligas/test-league/mata-mata')
  })

  it('Mata-mata nav item is enabled (not pointer-events-none)', () => {
    render(<PainelSidebar {...defaultSidebarProps} />)
    const link = screen.getByRole('link', { name: /Mata-mata/i })
    expect(link.className).not.toContain('pointer-events-none')
  })
})

describe('BottomTabBar (task_04)', () => {
  // Note: the Link mock renders <a> without passing through role/aria-selected,
  // so link-based tabs are accessible as "link"; only the disabled RANKING <button>
  // retains role="tab" explicitly.

  it('renders Mata-mata tab linking to the mata-mata route', () => {
    render(<BottomTabBar leagueId="test-league" />)
    const link = screen.getByRole('link', { name: /MATA-MATA/i })
    expect(link).toHaveAttribute('href', '/ligas/test-league/mata-mata')
  })

  it('does not render a Perfil tab', () => {
    render(<BottomTabBar leagueId="test-league" />)
    expect(screen.queryByText('PERFIL')).not.toBeInTheDocument()
  })

  it('renders exactly 5 tabs', () => {
    render(<BottomTabBar leagueId="test-league" />)
    const nav = screen.getByRole('tablist')
    expect(Array.from(nav.children)).toHaveLength(5)
  })

  it('renders tabs in exact order: Mata-mata · Tabela · Painel · Palpites · Ranking', () => {
    render(<BottomTabBar leagueId="test-league" />)
    const nav = screen.getByRole('tablist')
    const tabs = Array.from(nav.children)
    expect(tabs[0]).toHaveTextContent('MATA-MATA')
    expect(tabs[1]).toHaveTextContent('TABELA')
    expect(tabs[2]).toHaveTextContent('PAINEL')
    expect(tabs[3]).toHaveTextContent('PALPITES')
    expect(tabs[4]).toHaveTextContent('RANKING')
  })

  it('Painel is at index 2 (centered position)', () => {
    render(<BottomTabBar leagueId="test-league" />)
    const nav = screen.getByRole('tablist')
    expect(Array.from(nav.children)[2]).toHaveTextContent('PAINEL')
  })

  it('Ranking tab is enabled and links to the ranking route', () => {
    render(<BottomTabBar leagueId="test-league" />)
    const rankingLink = screen.getByRole('link', { name: /RANKING/i })
    expect(rankingLink).toHaveAttribute('href', '/ligas/test-league/ranking')
    expect(rankingLink.className).not.toContain('pointer-events-none')
    expect(rankingLink).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('Mata-mata tab is not active when on the league root route', () => {
    // pathname mock returns /ligas/test-league, not /ligas/test-league/mata-mata
    render(<BottomTabBar leagueId="test-league" />)
    const link = screen.getByRole('link', { name: /MATA-MATA/i })
    expect(link.className).not.toContain('text-[#0097A9]')
  })

  it('Painel tab is active when on the league root route', () => {
    // pathname mock returns /ligas/test-league which matches Painel href exactly
    render(<BottomTabBar leagueId="test-league" />)
    const painelLink = screen.getByRole('link', { name: /PAINEL/i })
    expect(painelLink.className).toContain('text-[#0097A9]')
  })
})

describe('PainelSidebar — mata-mata unlock dot (task_06)', () => {
  it('shows unlock dot on Mata-mata item when mataMataUnlock is true', () => {
    render(<PainelSidebar {...defaultSidebarProps} mataMataUnlock={true} />)
    expect(screen.getByTestId('mata-mata-unlock-dot')).toBeInTheDocument()
  })

  it('does not show unlock dot when mataMataUnlock is false', () => {
    render(<PainelSidebar {...defaultSidebarProps} mataMataUnlock={false} />)
    expect(screen.queryByTestId('mata-mata-unlock-dot')).not.toBeInTheDocument()
  })

  it('does not show unlock dot when mataMataUnlock is omitted', () => {
    render(<PainelSidebar {...defaultSidebarProps} />)
    expect(screen.queryByTestId('mata-mata-unlock-dot')).not.toBeInTheDocument()
  })

  it('unlock dot is inside the Mata-mata nav link', () => {
    render(<PainelSidebar {...defaultSidebarProps} mataMataUnlock={true} />)
    const dot = screen.getByTestId('mata-mata-unlock-dot')
    const mataMataLink = screen.getByRole('link', { name: /Mata-mata/i })
    expect(mataMataLink).toContainElement(dot)
  })

  it('unlock dot uses the #FFC72C color class', () => {
    render(<PainelSidebar {...defaultSidebarProps} mataMataUnlock={true} />)
    const dot = screen.getByTestId('mata-mata-unlock-dot')
    expect(dot.className).toContain('bg-[#FFC72C]')
  })
})
