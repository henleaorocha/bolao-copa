/**
 * API error handling integration tests.
 * Require the dev server to be running (npm run dev).
 */
import { describe, it, expect } from 'vitest'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
const HAS_DEV_SERVER = Boolean(process.env.TEST_DEV_SERVER)

describe.skipIf(!HAS_DEV_SERVER)('API error handling', () => {
  it('GET /api/auth/me without session returns 401 SESSION_EXPIRED', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.status).toBe('error')
    expect(json.code).toBe('SESSION_EXPIRED')
    expect(json.statusCode).toBe(401)
    expect(json.timestamp).toBeDefined()
    expect(res.headers.get('content-type')).toContain('application/json')
  })

  it('GET /api/auth/me error messages are in PT-BR', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`)
    const json = await res.json()
    expect(json.error).toBe('Sessão expirada')
  })

  it('POST /api/auth/logout without session returns 401', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(401)
  })

  it('GET /api/health is accessible without auth and returns 200', async () => {
    const res = await fetch(`${BASE_URL}/api/health`)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('success')
    expect(json.data.database).toBe('connected')
    expect(json.timestamp).toBeDefined()
  })

  it('all error responses include timestamp', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`)
    const json = await res.json()
    expect(new Date(json.timestamp).toISOString()).toBe(json.timestamp)
  })

  it('POST /api/auth/logout with wrong origin returns 403', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://evil.com',
      },
    })
    expect(res.status).toBe(403)
  })
})
