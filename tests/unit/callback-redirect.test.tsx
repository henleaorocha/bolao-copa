/**
 * @vitest-environment jsdom
 *
 * Unit tests for app/auth/callback-redirect/page.tsx — Client Component.
 * Tests both the fallback path (/ligas) and the invite-redirect preservation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'

// ── Mocks (hoisted before imports) ───────────────────────────────────────────

const mockPush = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// ── Lazy import AFTER mocks are registered ────────────────────────────────────

import CallbackRedirectPage from '@/app/auth/callback-redirect/page'

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CallbackRedirectPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  it('renders without throwing (smoke test)', () => {
    expect(() => render(<CallbackRedirectPage />)).not.toThrow()
  })

  it('shows the loading state while redirecting', () => {
    const { getByText } = render(<CallbackRedirectPage />)
    expect(getByText('Carregando...')).toBeInTheDocument()
  })

  it('navigates to /ligas when sessionStorage has no inviteRedirect', async () => {
    await act(async () => {
      render(<CallbackRedirectPage />)
    })

    expect(mockPush).toHaveBeenCalledWith('/ligas')
    expect(mockPush).not.toHaveBeenCalledWith('/dashboard')
  })

  it('navigates to the invite redirect URL when sessionStorage.inviteRedirect is set', async () => {
    sessionStorage.setItem('inviteRedirect', '/join/abc123')

    await act(async () => {
      render(<CallbackRedirectPage />)
    })

    expect(mockPush).toHaveBeenCalledWith('/join/abc123')
    expect(mockPush).not.toHaveBeenCalledWith('/ligas')
    expect(mockPush).not.toHaveBeenCalledWith('/dashboard')
  })

  it('clears sessionStorage.inviteRedirect after consuming it', async () => {
    sessionStorage.setItem('inviteRedirect', '/join/abc123')

    await act(async () => {
      render(<CallbackRedirectPage />)
    })

    expect(sessionStorage.getItem('inviteRedirect')).toBeNull()
  })

  it('does not clear sessionStorage when there is no inviteRedirect', async () => {
    sessionStorage.setItem('otherKey', 'should-survive')

    await act(async () => {
      render(<CallbackRedirectPage />)
    })

    expect(sessionStorage.getItem('otherKey')).toBe('should-survive')
  })
})
