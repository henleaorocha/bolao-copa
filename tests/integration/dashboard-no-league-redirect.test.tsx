/**
 * @vitest-environment jsdom
 *
 * Integration test for app/dashboard/page.tsx no-league redirect (task_07, ADR-005).
 * Requires a running local Supabase instance with SUPABASE_SERVICE_ROLE_KEY set
 * (depends on task_02 migration 20260601000026, which stops auto-enrolling new
 * users into the test league, so a freshly created user is genuinely league-less).
 *
 * Drives the real async Server Component against the real database by mocking
 * getSupabaseServerClient() to return a per-user authed client (anon key + RLS).
 * resolveActiveLeague() runs for real and returns null for the league-less user,
 * so the page must redirect to /ligas instead of throwing.
 *
 * Uses a RANDOM e-mail and cleans up both auth.users and public.users (no
 * ON DELETE CASCADE) so the suite never collides with parallel test files.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseServerClient: vi.fn(),
}))

// redirect() throws in real Next.js to halt rendering; mirror that so the page
// stops at the call site, and we can assert the target.
const mockRedirect = vi.hoisted(() =>
  vi.fn(() => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT' })
  })
)
vi.mock('next/navigation', () => ({ redirect: mockRedirect }))

// Stub leaf Client Component — needs router/hook context jsdom lacks.
vi.mock('@/components/LogoutButton', () => ({
  default: () => <button aria-label="logout-stub">Sair</button>,
}))

import DashboardPage from '@/app/dashboard/page'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import {
  createTestUser,
  deleteTestUser,
  signInTestUser,
  authedClient,
  adminClient,
} from '../fixtures/factories'

const HAS_SERVICE_KEY = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

describe.skipIf(!HAS_SERVICE_KEY)(
  'app/dashboard/page.tsx — no-league redirect (integration)',
  () => {
    const admin = adminClient()
    const password = 'Test1234!'
    let userId: string
    let leaglessToken: string

    beforeAll(async () => {
      // A freshly created user: no auto-enroll trigger -> zero memberships.
      const email = `dashboard-leagless-${Date.now()}@example.com`
      const user = await createTestUser(email, password)
      userId = user.id
      leaglessToken = (await signInTestUser(email, password)).session.access_token
    })

    afterAll(async () => {
      if (userId) {
        await deleteTestUser(userId)
        await admin.from('users').delete().eq('id', userId)
      }
      vi.restoreAllMocks()
    })

    it('a freshly created (no-league) user hitting /dashboard is redirected to /ligas', async () => {
      vi.mocked(getSupabaseServerClient).mockResolvedValue(
        authedClient(leaglessToken) as never
      )

      // The only throw is the redirect signal — never the old
      // "Usuário não tem nenhuma liga" Error.
      await expect(DashboardPage()).rejects.toThrow('NEXT_REDIRECT')
      expect(mockRedirect).toHaveBeenCalledWith('/ligas')
      expect(mockRedirect).not.toHaveBeenCalledWith('/login')
    })
  }
)
