import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseServerClient: vi.fn(),
}))

import { POST } from '@/app/api/leagues/route'
import { getSupabaseServerClient } from '@/lib/supabase/client'

const MOCK_USER = { id: 'user-123' }
const MOCK_LEAGUE = {
  id: 'league-abc',
  name: 'Test League',
  access_type: 'private',
  logo_url: null,
  member_count: 1,
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/leagues', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeSupabase(overrides?: {
  user?: unknown
  authError?: unknown
  insertLeague?: { data: unknown; error: unknown }
  insertMember?: { data: unknown; error: unknown }
  updateUser?: { error: unknown }
}) {
  const opts = {
    user: MOCK_USER,
    authError: null,
    insertLeague: { data: MOCK_LEAGUE, error: null },
    insertMember: { data: { role: 'admin' }, error: null },
    updateUser: { error: null },
    ...overrides,
  }

  const single = vi.fn()
  const select = vi.fn(() => ({ single }))
  const insert = vi.fn(() => ({ select }))
  const eq = vi.fn(() => opts.updateUser)
  const update = vi.fn(() => ({ eq }))
  const from = vi.fn((table: string) => {
    if (table === 'leagues') {
      single.mockResolvedValue(opts.insertLeague)
      return { insert }
    }
    if (table === 'league_members') {
      single.mockResolvedValue(opts.insertMember)
      return { insert }
    }
    if (table === 'users') {
      return { update }
    }
    return { insert }
  })

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: opts.user },
        error: opts.authError,
      }),
    },
    from,
  }
}

describe('POST /api/leagues — prize_pool validation', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ user: null }) as never
    )
    const res = await POST(makeRequest({ name: 'Liga', access_type: 'private' }))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.code).toBe('SESSION_EXPIRED')
  })

  it('accepts request with prize_pool omitted and responds 201', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await POST(makeRequest({ name: 'Liga', access_type: 'private' }))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.status).toBe('success')
    expect(json.data).not.toHaveProperty('prize_pool')
  })

  it('accepts request with prize_pool: null and responds 201', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await POST(makeRequest({ name: 'Liga', access_type: 'private', prize_pool: null }))
    expect(res.status).toBe(201)
  })

  it('accepts request with a valid 300-char prize_pool and responds 201', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await POST(
      makeRequest({ name: 'Liga', access_type: 'private', prize_pool: 'A'.repeat(300) })
    )
    expect(res.status).toBe(201)
  })

  it('returns 400 INVALID_BODY when prize_pool exceeds 300 characters', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await POST(
      makeRequest({ name: 'Liga', access_type: 'private', prize_pool: 'A'.repeat(301) })
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('INVALID_BODY')
  })

  it('returns 400 INVALID_BODY when prize_pool is a number', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await POST(
      makeRequest({ name: 'Liga', access_type: 'private', prize_pool: 123 })
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('INVALID_BODY')
  })

  it('response body does not contain prize_pool field', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await POST(
      makeRequest({ name: 'Liga', access_type: 'private', prize_pool: 'Grande prêmio' })
    )
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data).not.toHaveProperty('prize_pool')
  })

  it('passes prize_pool to the Supabase insert call', async () => {
    const supabase = makeSupabase()
    vi.mocked(getSupabaseServerClient).mockResolvedValue(supabase as never)
    await POST(makeRequest({ name: 'Liga', access_type: 'private', prize_pool: '1º lugar: jantar' }))
    const insertCall = supabase.from.mock.results[0]?.value?.insert?.mock?.calls[0]?.[0]
    expect(insertCall?.prize_pool).toBe('1º lugar: jantar')
  })

  it('passes prize_pool as null to insert when omitted', async () => {
    const supabase = makeSupabase()
    vi.mocked(getSupabaseServerClient).mockResolvedValue(supabase as never)
    await POST(makeRequest({ name: 'Liga', access_type: 'private' }))
    const insertCall = supabase.from.mock.results[0]?.value?.insert?.mock?.calls[0]?.[0]
    expect(insertCall?.prize_pool).toBeNull()
  })
})
