/**
 * @vitest-environment jsdom
 *
 * Unit tests for app/dashboard/page.tsx — async Server Component (task_07, ADR-005).
 * All external dependencies are mocked; the page function is called directly.
 *
 * Behaviours under test:
 *  - unauthenticated  -> redirect('/login')
 *  - no active league -> redirect('/ligas') (must NOT throw)
 *  - active league     -> renders the dashboard normally
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// ── Mocks (hoisted before imports) ─────────────────────────────────────────

const mockRedirect = vi.hoisted(() => vi.fn())
const mockGetSupabaseServerClient = vi.hoisted(() => vi.fn())
const mockEnsureUserSynced = vi.hoisted(() => vi.fn())
const mockResolveActiveLeague = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({ redirect: mockRedirect }))

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseServerClient: mockGetSupabaseServerClient,
}))

vi.mock('@/lib/user-sync', () => ({ ensureUserSynced: mockEnsureUserSynced }))

vi.mock('@/lib/resolve-active-league', () => ({
  resolveActiveLeague: mockResolveActiveLeague,
}))

// Stub leaf Client Component (needs router/hook context jsdom lacks).
vi.mock('@/components/LogoutButton', () => ({
  default: () => <button aria-label="logout-stub">Sair</button>,
}))

// next/image renders an <img> in jsdom without optimization config.
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />
  },
}))

// ── Lazy import AFTER mocks are registered ────────────────────────────────

import DashboardPage from '@/app/dashboard/page'

// ── Helpers ───────────────────────────────────────────────────────────────

const USER_ID = 'user-1'

function makeUser() {
  return { id: USER_ID, email: 'maria@example.com' }
}

const USER_ROW = {
  id: USER_ID,
  email: 'maria@example.com',
  full_name: 'Maria Silva',
  avatar_url: null,
  avatar_color: '#FFC72C',
  created_at: '2026-01-01T00:00:00Z',
}

const LEAGUE_ROW = {
  id: 'league-1',
  name: 'Bolão da Família',
  access_type: 'private',
  logo_url: null,
}

/**
 * Supabase stub: auth.getUser() returns `user`; from(table).…single()
 * resolves per-table data for the dashboard's Promise.all queries.
 */
function makeSupabase(user: ReturnType<typeof makeUser> | null) {
  const byTable: Record<string, { data: unknown; error: unknown }> = {
    users: { data: USER_ROW, error: null },
    league_members: { data: { role: 'admin' }, error: null },
    leagues: { data: LEAGUE_ROW, error: null },
  }
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: vi.fn((table: string) => {
      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        single: vi.fn().mockResolvedValue(byTable[table]),
      }
      return builder
    }),
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('DashboardPage — async Server Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // redirect mimics Next.js — throws so execution stops at the call site.
    mockRedirect.mockImplementation(() => {
      throw Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT' })
    })
    mockGetSupabaseServerClient.mockResolvedValue(makeSupabase(makeUser()))
    mockEnsureUserSynced.mockResolvedValue(undefined)
    mockResolveActiveLeague.mockResolvedValue('league-1')
  })

  it('redirects to /login when getUser() returns null (session absent)', async () => {
    mockGetSupabaseServerClient.mockResolvedValue(makeSupabase(null))

    await expect(DashboardPage()).rejects.toThrow()
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('redirects to /ligas (without throwing an error) when there is no active league', async () => {
    mockResolveActiveLeague.mockResolvedValue(null)

    // The only throw is the redirect signal itself — never the old
    // "Usuário não tem nenhuma liga" Error.
    await expect(DashboardPage()).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/ligas')
    expect(mockRedirect).not.toHaveBeenCalledWith('/login')
  })

  it('renders the dashboard normally when an active league exists', async () => {
    const ui = await DashboardPage()
    render(ui)

    expect(mockRedirect).not.toHaveBeenCalled()
    expect(screen.getByText('Maria Silva')).toBeInTheDocument()
    expect(screen.getByText('maria@example.com')).toBeInTheDocument()
    expect(screen.getByText('Bolão da Família')).toBeInTheDocument()
    expect(screen.getByText('admin')).toBeInTheDocument()
  })

  it('does not call resolveActiveLeague for an unauthenticated request', async () => {
    mockGetSupabaseServerClient.mockResolvedValue(makeSupabase(null))

    await expect(DashboardPage()).rejects.toThrow()
    expect(mockResolveActiveLeague).not.toHaveBeenCalled()
  })
})
