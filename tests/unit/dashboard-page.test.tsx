/**
 * @vitest-environment jsdom
 *
 * Unit tests for app/dashboard/page.tsx — the dashboard screen was
 * descontinuada and is now a thin redirect:
 *  - autenticado    -> redirect('/ligas')
 *  - não autenticado -> redirect('/login')
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks (hoisted before imports) ─────────────────────────────────────────

const mockRedirect = vi.hoisted(() => vi.fn())
const mockGetSupabaseServerClient = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({ redirect: mockRedirect }))

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseServerClient: mockGetSupabaseServerClient,
}))

// ── Lazy import AFTER mocks are registered ────────────────────────────────

import DashboardPage from '@/app/dashboard/page'

// ── Helpers ───────────────────────────────────────────────────────────────

function makeSupabase(user: { id: string } | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('DashboardPage — redirect descontinuado', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // redirect mimics Next.js — throws so execution stops at the call site.
    mockRedirect.mockImplementation(() => {
      throw Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT' })
    })
  })

  it('redireciona para /login quando não há sessão', async () => {
    mockGetSupabaseServerClient.mockResolvedValue(makeSupabase(null))

    await expect(DashboardPage()).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/login')
    expect(mockRedirect).not.toHaveBeenCalledWith('/ligas')
  })

  it('redireciona para /ligas quando autenticado', async () => {
    mockGetSupabaseServerClient.mockResolvedValue(makeSupabase({ id: 'user-1' }))

    await expect(DashboardPage()).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/ligas')
    expect(mockRedirect).not.toHaveBeenCalledWith('/login')
  })
})
