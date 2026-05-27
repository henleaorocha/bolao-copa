/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ScoringSchemeCard from '@/app/ligas/[id]/components/ScoringSchemeCard'
import BottomTabBar from '@/app/ligas/[id]/components/BottomTabBar'

vi.mock('next/link', () => ({
  default: ({ href, children, className, role, 'aria-selected': ariaSelected }: {
    href: string; children: React.ReactNode; className?: string; role?: string; 'aria-selected'?: boolean
  }) => (
    <a href={href} className={className} role={role} aria-selected={ariaSelected}>{children}</a>
  ),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/ligas/test-league',
}))

describe('ScoringSchemeCard', () => {
  it('renders "Palpite de Campeão" and "+50 pts"', () => {
    render(<ScoringSchemeCard />)
    expect(screen.getByText('Palpite de Campeão')).toBeInTheDocument()
    expect(screen.getByText('+50 pts')).toBeInTheDocument()
  })

  it('renders all seven scoring rows', () => {
    render(<ScoringSchemeCard />)
    expect(screen.getByText('Palpite de Campeão')).toBeInTheDocument()
    expect(screen.getByText('Palpite de Vice-Campeão')).toBeInTheDocument()
    expect(screen.getByText('Placar Exato')).toBeInTheDocument()
    expect(screen.getByText('Vencedor/Empate')).toBeInTheDocument()
    expect(screen.getByText('Oitavas de Final')).toBeInTheDocument()
    expect(screen.getByText('Quartas de Final')).toBeInTheDocument()
    expect(screen.getByText('Semi e Final')).toBeInTheDocument()
  })

  it('renders elimination phase multiplier rows', () => {
    render(<ScoringSchemeCard />)
    expect(screen.getByText('Oitavas de Final')).toBeInTheDocument()
    expect(screen.getByText('Quartas de Final')).toBeInTheDocument()
    expect(screen.getByText('Semi e Final')).toBeInTheDocument()
  })
})

describe('BottomTabBar', () => {
  it('renders five tab items', () => {
    render(<BottomTabBar leagueId="test-league" />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(5)
  })

  it('PAINEL tab does not have aria-disabled="true"', () => {
    render(<BottomTabBar leagueId="test-league" />)
    const painelTab = screen.getByRole('tab', { name: /PAINEL/i })
    expect(painelTab).not.toHaveAttribute('aria-disabled', 'true')
  })

  it('PALPITES tab links to the palpites page and is not disabled', () => {
    render(<BottomTabBar leagueId="test-league" />)
    const palpitesTab = screen.getByRole('tab', { name: /PALPITES/i })
    expect(palpitesTab).not.toHaveAttribute('aria-disabled', 'true')
    expect(palpitesTab).toHaveAttribute('href', '/ligas/test-league/palpites')
  })

  it('renders with class containing "lg:hidden" (hidden on desktop)', () => {
    const { container } = render(<BottomTabBar leagueId="test-league" />)
    const nav = container.querySelector('nav')
    expect(nav?.className).toContain('lg:hidden')
  })

  it('PAINEL tab has aria-selected="true" when on the league panel route', () => {
    render(<BottomTabBar leagueId="test-league" />)
    const painelTab = screen.getByRole('tab', { name: /PAINEL/i })
    expect(painelTab).toHaveAttribute('aria-selected', 'true')
  })

  it('Ranking tab is enabled with href to the ranking route', () => {
    render(<BottomTabBar leagueId="test-league" />)
    const rankingTab = screen.getByRole('tab', { name: /RANKING/i })
    expect(rankingTab).toHaveAttribute('href', '/ligas/test-league/ranking')
    expect(rankingTab).not.toHaveAttribute('aria-disabled', 'true')
    expect(rankingTab.className).not.toContain('pointer-events-none')
  })
})

describe('BottomTabBar — mata-mata unlock dot (task_06)', () => {
  it('shows unlock dot on MATA-MATA tab when mataMataUnlock is true', () => {
    render(<BottomTabBar leagueId="test-league" mataMataUnlock={true} />)
    expect(screen.getByTestId('mata-mata-unlock-dot')).toBeInTheDocument()
  })

  it('does not show unlock dot when mataMataUnlock is false', () => {
    render(<BottomTabBar leagueId="test-league" mataMataUnlock={false} />)
    expect(screen.queryByTestId('mata-mata-unlock-dot')).not.toBeInTheDocument()
  })

  it('does not show unlock dot when mataMataUnlock is omitted', () => {
    render(<BottomTabBar leagueId="test-league" />)
    expect(screen.queryByTestId('mata-mata-unlock-dot')).not.toBeInTheDocument()
  })

  it('unlock dot is inside the MATA-MATA tab', () => {
    render(<BottomTabBar leagueId="test-league" mataMataUnlock={true} />)
    const dot = screen.getByTestId('mata-mata-unlock-dot')
    const mataMataTab = screen.getByRole('tab', { name: /MATA-MATA/i })
    expect(mataMataTab).toContainElement(dot)
  })
})
