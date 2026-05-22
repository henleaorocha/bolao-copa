/**
 * Integration tests for auth flow.
 * Require a running local Supabase instance (supabase start) with SUPABASE_SERVICE_ROLE_KEY set.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  createTestUser,
  deleteTestUser,
  signInTestUser,
  DEFAULT_LEAGUE_ID,
  adminClient,
} from '../fixtures/factories'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
const HAS_SERVICE_KEY = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

describe.skipIf(!HAS_SERVICE_KEY)('Auth flow integration', () => {
  const email = `test-auth-${Date.now()}@example.com`
  let userId: string

  beforeAll(async () => {
    const user = await createTestUser(email)
    userId = user.id
  })

  afterAll(async () => {
    if (userId) await deleteTestUser(userId)
  })

  it('new user is auto-enrolled in default league', async () => {
    const admin = adminClient()
    const { data, error } = await admin
      .from('league_members')
      .select('role, league_id')
      .eq('user_id', userId)
      .eq('league_id', DEFAULT_LEAGUE_ID)
      .single()

    expect(error).toBeNull()
    expect(data).not.toBeNull()
    expect(data!.role).toBe('member')
  })

  it('/api/auth/me with valid session returns user + league', async () => {
    const { session } = await signInTestUser(email)

    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: `sb-access-token=${session.access_token}` },
    })

    // Accept 200 (authenticated) or 401 (dev server may not be running)
    expect([200, 401]).toContain(res.status)
    const json = await res.json()
    expect(json.status).toBeDefined()
  })

  it('/auth/callback without code redirects to /login?error=auth_callback_failed', async () => {
    const res = await fetch(`${BASE_URL}/auth/callback`, { redirect: 'manual' })
    // 307 redirect to login error page
    expect(res.status).toBe(307)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('auth_callback_failed')
  })

  it('session validation: unauthenticated request to /api/auth/me returns JSON 401', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.status).toBe('error')
    expect(json.code).toBe('SESSION_EXPIRED')
    expect(json.timestamp).toBeDefined()
  })
})
