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
  canCreate?: boolean | null
  canCreateError?: unknown
  insertLeague?: { data: unknown; error: unknown }
  insertMember?: { data: unknown; error: unknown }
  updateUser?: { error: unknown }
}) {
  const opts = {
    user: MOCK_USER,
    authError: null,
    // Permission gate (task_04). Default: caller is allowed, so existing
    // success-path tests reach the insert and respond 201.
    canCreate: true as boolean | null,
    canCreateError: null,
    insertLeague: { data: MOCK_LEAGUE, error: null },
    insertMember: { data: { role: 'admin' }, error: null },
    updateUser: { error: null },
    ...overrides,
  }

  const single = vi.fn()
  const select = vi.fn(() => ({ single }))
  const insert = vi.fn(() => ({ select }))

  // users branch: serves both canCreateLeague()'s select chain
  // (.select('can_create_league').eq('id', id).single()) and the
  // active_league_id update (.update(...).eq('id', id)).
  const canCreateSingle = vi.fn().mockResolvedValue({
    data: opts.canCreate === null ? null : { can_create_league: opts.canCreate },
    error: opts.canCreateError,
  })
  const usersSelect = vi.fn(() => ({ eq: vi.fn(() => ({ single: canCreateSingle })) }))
  const usersUpdate = vi.fn(() => ({ eq: vi.fn(() => opts.updateUser) }))

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
      return { select: usersSelect, update: usersUpdate }
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

// Finds the argument passed to .insert() on the `leagues` from() call,
// regardless of how many other from() calls (e.g. the users permission
// read) precede it.
function leagueInsertArg(supabase: ReturnType<typeof makeSupabase>) {
  const idx = supabase.from.mock.calls.findIndex((c) => c[0] === 'leagues')
  return supabase.from.mock.results[idx]?.value?.insert?.mock?.calls[0]?.[0]
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
    const insertCall = leagueInsertArg(supabase)
    expect(insertCall?.prize_pool).toBe('1º lugar: jantar')
  })

  it('passes prize_pool as null to insert when omitted', async () => {
    const supabase = makeSupabase()
    vi.mocked(getSupabaseServerClient).mockResolvedValue(supabase as never)
    await POST(makeRequest({ name: 'Liga', access_type: 'private' }))
    const insertCall = leagueInsertArg(supabase)
    expect(insertCall?.prize_pool).toBeNull()
  })
})

describe('POST /api/leagues — name HTML/markup rejection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 INVALID_BODY when name contains an HTML tag', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await POST(
      makeRequest({ name: '<img src=x onerror=alert(1)>', access_type: 'open' })
    )
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('INVALID_BODY')
  })

  it('returns 400 INVALID_BODY when name contains a lone angle bracket', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await POST(makeRequest({ name: 'Liga 1 < Liga 2', access_type: 'open' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('INVALID_BODY')
  })

  it('accepts a normal name without angle brackets', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await POST(makeRequest({ name: 'Bolão da Firma', access_type: 'open' }))
    expect(res.status).toBe(201)
  })
})

describe('POST /api/leagues — can_create_league permission gate (task_04)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 403 FORBIDDEN with the Portuguese message when the user cannot create leagues', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ canCreate: false }) as never
    )
    const res = await POST(makeRequest({ name: 'Liga', access_type: 'private' }))
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('FORBIDDEN')
    expect(json.error).toBe('Você não tem permissão para criar ligas')
  })

  it('does not attempt the league insert when the user cannot create leagues', async () => {
    const supabase = makeSupabase({ canCreate: false })
    vi.mocked(getSupabaseServerClient).mockResolvedValue(supabase as never)
    await POST(makeRequest({ name: 'Liga', access_type: 'private' }))
    // No insert path should be reached: leagues / league_members never queried.
    const tablesTouched = supabase.from.mock.calls.map((c) => c[0])
    expect(tablesTouched).not.toContain('leagues')
    expect(tablesTouched).not.toContain('league_members')
  })

  it('treats a missing users row as not permitted and returns 403', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ canCreate: null }) as never
    )
    const res = await POST(makeRequest({ name: 'Liga', access_type: 'private' }))
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('FORBIDDEN')
  })

  it('logs reason: cannot_create_league with the user_id on the block', async () => {
    const warnSpy = vi.spyOn(console, 'warn')
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ canCreate: false }) as never
    )
    await POST(makeRequest({ name: 'Liga', access_type: 'private' }))

    const logged = warnSpy.mock.calls
      .map((c) => c[0])
      .find((line) => typeof line === 'string' && line.includes('cannot_create_league'))
    expect(logged).toBeTruthy()
    const parsed = JSON.parse(logged as string)
    expect(parsed.reason).toBe('cannot_create_league')
    expect(parsed.user_id).toBe(MOCK_USER.id)
    expect(parsed.status_code).toBe(403)
  })

  it('proceeds to insert and returns 201 when the user is permitted', async () => {
    const supabase = makeSupabase({ canCreate: true })
    vi.mocked(getSupabaseServerClient).mockResolvedValue(supabase as never)
    const res = await POST(makeRequest({ name: 'Liga', access_type: 'private' }))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.status).toBe('success')
    expect(supabase.from.mock.calls.map((c) => c[0])).toContain('leagues')
  })
})
