/**
 * Integration tests for GET /api/leagues/hub.
 * Requires a running local Next.js server and Supabase instance with SUPABASE_SERVICE_ROLE_KEY set.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestUser, deleteTestUser, signInTestUser } from '../fixtures/factories'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
const HAS_SERVICE_KEY = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

describe.skipIf(!HAS_SERVICE_KEY)('GET /api/leagues/hub', () => {
  let userEmail: string
  let userId: string
  let userSession: { access_token: string; refresh_token: string }

  beforeAll(async () => {
    userEmail = `test-hub-api-${Date.now()}@example.com`
    const user = await createTestUser(userEmail)
    userId = user.id
    const result = await signInTestUser(userEmail)
    userSession = result.session
  })

  afterAll(async () => {
    await deleteTestUser(userId)
  })

  it('returns 401 when no session cookie is provided', async () => {
    const res = await fetch(`${BASE_URL}/api/leagues/hub`)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.status).toBe('error')
    expect(json.code).toBe('SESSION_EXPIRED')
  })

  it('returns 200 with correct shape for authenticated session', async () => {
    const res = await fetch(`${BASE_URL}/api/leagues/hub`, {
      headers: { Cookie: `sb-access-token=${userSession.access_token}` },
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('success')
    expect(json).toHaveProperty('timestamp')
    expect(json.data).toHaveProperty('leagues')
    expect(json.data).toHaveProperty('user')
    expect(json.data).toHaveProperty('countdown')
    expect(Array.isArray(json.data.leagues)).toBe(true)
    expect(typeof json.data.user.first_name).toBe('string')
    expect(typeof json.data.countdown.days).toBe('number')
    expect(typeof json.data.countdown.isUnderway).toBe('boolean')
  })

  it('response body matches ApiSuccessResponse wrapper shape', async () => {
    const res = await fetch(`${BASE_URL}/api/leagues/hub`, {
      headers: { Cookie: `sb-access-token=${userSession.access_token}` },
    })
    const json = await res.json()
    expect(json.status).toBe('success')
    expect(json).toHaveProperty('data')
    expect(json).toHaveProperty('timestamp')
    expect(new Date(json.timestamp).toISOString()).toBe(json.timestamp)
  })

  it('leagues items have the expected LeagueHubItem shape when leagues are present', async () => {
    const res = await fetch(`${BASE_URL}/api/leagues/hub`, {
      headers: { Cookie: `sb-access-token=${userSession.access_token}` },
    })
    const json = await res.json()
    for (const league of json.data.leagues) {
      expect(league).toHaveProperty('id')
      expect(league).toHaveProperty('name')
      expect(league).toHaveProperty('access_type')
      expect(league).toHaveProperty('logo_url')
      expect(league).toHaveProperty('member_count')
      expect(league).toHaveProperty('is_member')
      expect(league).toHaveProperty('is_main')
      expect(['open', 'private']).toContain(league.access_type)
      expect(typeof league.is_member).toBe('boolean')
      expect(typeof league.is_main).toBe('boolean')
    }
  })
})
