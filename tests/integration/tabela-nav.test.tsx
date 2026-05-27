/**
 * @vitest-environment jsdom
 *
 * Tests: "Tabela" nav item is an enabled link and shows active state on the Tabela route.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import PainelSidebar from '@/app/ligas/[id]/components/PainelSidebar'
import BottomTabBar from '@/app/ligas/[id]/components/BottomTabBar'

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
    role,
    'aria-selected': ariaSelected,
  }: {
    href: string
    children: React.ReactNode
    className?: string
    role?: string
    'aria-selected'?: boolean
  }) => (
    <a href={href} className={className} role={role} aria-selected={ariaSelected}>
      {children}
    </a>
  ),
}))

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}))

const mockPathname = vi.fn()
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}))

const LEAGUE_ID = 'league-abc'
const TABELA_ROUTE = `/ligas/${LEAGUE_ID}/tabela`

const sidebarProps = {
  leagueId: LEAGUE_ID,
  leagueName: 'Liga Teste',
  leagueLogoUrl: null,
  inviteToken: 'tok-xyz',
  currentUserName: 'Maria Souza',
  currentUserAvatarColor: '#3B82F6',
}

describe('Tabela nav activation — PainelSidebar', () => {
  it('renders "Tabela" as an enabled <a> link to the tabela route', () => {
    mockPathname.mockReturnValue('/ligas/league-abc')
    render(<PainelSidebar {...sidebarProps} />)

    const tabela = screen.getByRole('link', { name: /tabela/i })
    expect(tabela).toHaveAttribute('href', TABELA_ROUTE)
  })

  it('does NOT render "Tabela" as a disabled div/button', () => {
    mockPathname.mockReturnValue('/ligas/league-abc')
    render(<PainelSidebar {...sidebarProps} />)

    const disabledButtons = screen.queryAllByRole('button', { name: /tabela/i })
    expect(disabledButtons).toHaveLength(0)
  })

  it('marks "Tabela" active when pathname is the tabela route', () => {
    mockPathname.mockReturnValue(TABELA_ROUTE)
    render(<PainelSidebar {...sidebarProps} />)

    const tabela = screen.getByRole('link', { name: /tabela/i })
    expect(tabela.className).toMatch(/bg-\[#0097A9\]/)
  })

  it('does NOT mark "Tabela" active on a different route', () => {
    mockPathname.mockReturnValue('/ligas/league-abc/palpites')
    render(<PainelSidebar {...sidebarProps} />)

    const tabela = screen.getByRole('link', { name: /tabela/i })
    expect(tabela.className).not.toMatch(/bg-\[#0097A9\]/)
  })

  it('"Mata-mata" is an enabled link to the mata-mata route', () => {
    mockPathname.mockReturnValue(TABELA_ROUTE)
    render(<PainelSidebar {...sidebarProps} />)

    const mataMata = screen.getByRole('link', { name: /mata-mata/i })
    expect(mataMata).toHaveAttribute('href', `/ligas/${LEAGUE_ID}/mata-mata`)
    expect(mataMata).not.toHaveAttribute('aria-disabled', 'true')
  })
})

describe('Tabela nav activation — BottomTabBar', () => {
  it('renders "TABELA" as an enabled tab link to the tabela route', () => {
    mockPathname.mockReturnValue('/ligas/league-abc')
    render(<BottomTabBar leagueId={LEAGUE_ID} />)

    const tabela = screen.getByRole('tab', { name: /tabela/i })
    expect(tabela).toHaveAttribute('href', TABELA_ROUTE)
    expect(tabela.tagName.toLowerCase()).toBe('a')
  })

  it('does NOT render "TABELA" as a disabled button', () => {
    mockPathname.mockReturnValue('/ligas/league-abc')
    render(<BottomTabBar leagueId={LEAGUE_ID} />)

    const tabelaTab = screen.getByRole('tab', { name: /tabela/i })
    expect(tabelaTab.tagName.toLowerCase()).not.toBe('button')
    expect(tabelaTab).not.toHaveAttribute('aria-disabled')
  })

  it('marks "TABELA" active (aria-selected=true) when pathname is the tabela route', () => {
    mockPathname.mockReturnValue(TABELA_ROUTE)
    render(<BottomTabBar leagueId={LEAGUE_ID} />)

    const tabela = screen.getByRole('tab', { name: /tabela/i })
    expect(tabela).toHaveAttribute('aria-selected', 'true')
  })

  it('does NOT mark "TABELA" active on a different route', () => {
    mockPathname.mockReturnValue('/ligas/league-abc/palpites')
    render(<BottomTabBar leagueId={LEAGUE_ID} />)

    const tabela = screen.getByRole('tab', { name: /tabela/i })
    expect(tabela).toHaveAttribute('aria-selected', 'false')
  })

  it('"RANKING" is an enabled tab link to the ranking route', () => {
    mockPathname.mockReturnValue(TABELA_ROUTE)
    render(<BottomTabBar leagueId={LEAGUE_ID} />)

    const ranking = screen.getByRole('tab', { name: /ranking/i })
    expect(ranking.tagName.toLowerCase()).toBe('a')
    expect(ranking).toHaveAttribute('href', `/ligas/${LEAGUE_ID}/ranking`)
    expect(ranking).not.toHaveAttribute('aria-disabled', 'true')
  })
})
