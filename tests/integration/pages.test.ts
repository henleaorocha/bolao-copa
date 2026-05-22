/**
 * Page rendering integration tests.
 * Require the dev server running (npm run dev).
 */
import { describe, it, expect } from 'vitest'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
const HAS_DEV_SERVER = Boolean(process.env.TEST_DEV_SERVER)

describe.skipIf(!HAS_DEV_SERVER)('Page rendering', () => {
  it('/login renders the Sign in with Google button text', async () => {
    const res = await fetch(`${BASE_URL}/login`)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('Entrar com Google')
  })

  it('/login is accessible without auth (does not redirect)', async () => {
    const res = await fetch(`${BASE_URL}/login`, { redirect: 'manual' })
    expect(res.status).toBe(200)
  })

  it('unauthenticated access to /dashboard redirects to /login', async () => {
    const res = await fetch(`${BASE_URL}/dashboard`, { redirect: 'manual' })
    expect([301, 302, 307, 308]).toContain(res.status)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('/login')
  })

  it('/ redirects to /login when unauthenticated', async () => {
    const res = await fetch(`${BASE_URL}/`, { redirect: 'manual' })
    expect([301, 302, 307, 308]).toContain(res.status)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('/login')
  })
})
