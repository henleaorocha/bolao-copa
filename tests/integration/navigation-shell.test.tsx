/**
 * @vitest-environment jsdom
 *
 * Integration smoke tests: navigation shell components render and back CTA resolves.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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
  usePathname: () => '/ligas/test-league-01',
}))

const sharedProps = {
  leagueId: 'test-league-01',
  leagueName: 'Liga Teste',
  leagueLogoUrl: null,
  inviteToken: 'tok-xyz',
  currentUserName: 'Maria Souza',
  currentUserAvatarColor: '#3B82F6',
}

describe('Navigation shell — integration smoke tests', () => {
  it('PainelSidebar renders without throwing', () => {
    expect(() => render(<PainelSidebar {...sharedProps} />)).not.toThrow()
  })

  it('PainelTopBar renders without throwing', () => {
    expect(() => render(<PainelTopBar {...sharedProps} />)).not.toThrow()
  })

  it('PainelSidebar has a "Ligas" nav link pointing to /ligas', () => {
    render(<PainelSidebar {...sharedProps} />)
    const links = screen.getAllByRole('link')
    const ligasLink = links.find(l => l.getAttribute('href') === '/ligas')
    expect(ligasLink).toBeDefined()
    expect(ligasLink).toHaveAttribute('href', '/ligas')
  })

  it('PainelTopBar back CTA links to /ligas', () => {
    render(<PainelTopBar {...sharedProps} />)
    const backLink = screen.getByRole('link', { name: /Liga Teste/i })
    expect(backLink).toHaveAttribute('href', '/ligas')
  })
})
