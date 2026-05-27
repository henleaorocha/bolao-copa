/**
 * @vitest-environment jsdom
 *
 * Smoke tests: all three static panel components render without throwing
 * in a simulated Next.js page context (jsdom, no SSR).
 */
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import ScoringSchemeCard from '@/app/ligas/[id]/components/ScoringSchemeCard'
import BottomTabBar from '@/app/ligas/[id]/components/BottomTabBar'

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/ligas/test-league',
}))

describe('Static panel components — render smoke tests', () => {
  it('ScoringSchemeCard renders without throwing', () => {
    expect(() => render(<ScoringSchemeCard />)).not.toThrow()
  })

  it('BottomTabBar renders without throwing', () => {
    expect(() => render(<BottomTabBar leagueId="test-league" />)).not.toThrow()
  })
})
