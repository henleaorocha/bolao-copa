/**
 * Unit tests for GET /api/auth/me (task_06, ADR-001 + ADR-005).
 *
 * Covers the two behaviours this task adds:
 *  - `can_create_league` (from public.users) is included in the user payload.
 *  - A caller with no active league gets 200 + `league: null` instead of a 500.
 *
 * `resolveActiveLeague` and `ensureUserSynced` are mocked so the handler logic is
 * exercised in isolation; the real league resolution is covered by the integration
 * suite (tests/integration/auth-me-no-league.test.ts).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseServerClient: vi.fn(),
}))
vi.mock('@/lib/user-sync', () => ({
  ensureUserSynced: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/resolve-active-league', () => ({
  resolveActiveLeague: vi.fn(),
}))

import { GET, PATCH } from '@/app/api/auth/me/route'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { resolveActiveLeague } from '@/lib/resolve-active-league'

const MOCK_USER = { id: 'user-123', email: 'me@example.com', user_metadata: {} }

const USER_ROW = {
  id: 'user-123',
  email: 'me@example.com',
  full_name: 'Maria',
  avatar_url: null,
  avatar_color: '#0097A9',
  created_at: '2024-01-01T00:00:00Z',
  can_create_league: true,
}

const LEAGUE_ROW = {
  id: 'league-1',
  name: 'Bolão da Firma',
  access_type: 'private',
  logo_url: null,
  member_count: 3,
}

function makeSupabase(overrides?: {
  user?: unknown
  authError?: unknown
  userRow?: unknown
  userError?: unknown
  league?: unknown
  leagueError?: unknown
  member?: unknown
  memberError?: unknown
}) {
  const o = {
    user: MOCK_USER,
    authError: null,
    userRow: USER_ROW,
    userError: null,
    league: LEAGUE_ROW,
    leagueError: null,
    member: { role: 'member' as const },
    memberError: null,
    ...overrides,
  }

  const from = vi.fn((table: string) => {
    if (table === 'users') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: o.userRow, error: o.userError }),
          })),
        })),
      }
    }
    if (table === 'leagues') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: o.league, error: o.leagueError }),
          })),
        })),
      }
    }
    if (table === 'league_members') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: o.member, error: o.memberError }),
            })),
          })),
        })),
      }
    }
    return {}
  })

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: o.user }, error: o.authError }),
    },
    from,
  }
}

function makeRequest(url = 'http://localhost/api/auth/me'): NextRequest {
  return new NextRequest(url)
}

describe('GET /api/auth/me', () => {
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
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.code).toBe('SESSION_EXPIRED')
  })

  it('returns 400 INVALID_PARAMS for unexpected query params', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await GET(makeRequest('http://localhost/api/auth/me?foo=bar'))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.code).toBe('INVALID_PARAMS')
  })

  it('returns 500 when the users row cannot be read', async () => {
    vi.mocked(resolveActiveLeague).mockResolvedValue('league-1')
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ userRow: null, userError: { message: 'boom' } }) as never
    )
    const res = await GET(makeRequest())
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.code).toBe('DATABASE_ERROR')
  })

  it('includes can_create_league matching the users row (true) with a populated league', async () => {
    vi.mocked(resolveActiveLeague).mockResolvedValue('league-1')
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('success')
    expect(json.data.user.can_create_league).toBe(true)
    expect(json.data.league).not.toBeNull()
    expect(json.data.league.id).toBe('league-1')
    expect(json.data.league.role).toBe('member')
  })

  it('includes can_create_league: false when the users row has the flag false', async () => {
    vi.mocked(resolveActiveLeague).mockResolvedValue('league-1')
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ userRow: { ...USER_ROW, can_create_league: false } }) as never
    )
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.user.can_create_league).toBe(false)
  })

  it('returns 200 + league: null (not 500) when the caller has no active league', async () => {
    vi.mocked(resolveActiveLeague).mockResolvedValue(null)
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase() as never)
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('success')
    expect(json.data.league).toBeNull()
    // The user payload — including the flag — is still returned in the no-league state.
    expect(json.data.user.id).toBe('user-123')
    expect(json.data.user.can_create_league).toBe(true)
  })

  it('returns 500 when the league/membership lookup fails', async () => {
    vi.mocked(resolveActiveLeague).mockResolvedValue('league-1')
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ league: null, leagueError: { message: 'boom' } }) as never
    )
    const res = await GET(makeRequest())
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.code).toBe('DATABASE_ERROR')
  })
})

function makePatchSupabase(overrides?: {
  user?: unknown
  authError?: unknown
  membership?: { data: unknown; error: unknown }
  updatedUser?: unknown
  updateError?: unknown
  league?: unknown
  leagueError?: unknown
  member?: unknown
  memberError?: unknown
}) {
  const o = {
    user: MOCK_USER,
    authError: null,
    membership: { data: { user_id: MOCK_USER.id }, error: null },
    updatedUser: USER_ROW,
    updateError: null,
    league: LEAGUE_ROW,
    leagueError: null,
    member: { role: 'member' as const },
    memberError: null,
    ...overrides,
  }

  const usersUpdateSingle = vi
    .fn()
    .mockResolvedValue({ data: o.updatedUser, error: o.updateError })
  const usersUpdate = vi.fn(() => ({
    eq: vi.fn(() => ({ select: vi.fn(() => ({ single: usersUpdateSingle })) })),
  }))

  const from = vi.fn((table: string) => {
    if (table === 'users') {
      return { update: usersUpdate }
    }
    if (table === 'leagues') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: o.league, error: o.leagueError }),
          })),
        })),
      }
    }
    if (table === 'league_members') {
      // Serves both the membership check ({ user_id }) and the role lookup ({ role });
      // the merged value satisfies each call shape (select → eq → eq → single).
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue(
                table === 'league_members' && o.membership.error
                  ? o.membership
                  : {
                      data: { ...(o.member as Record<string, unknown>), user_id: MOCK_USER.id },
                      error: o.memberError,
                    }
              ),
            })),
          })),
        })),
      }
    }
    return {}
  })

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: o.user }, error: o.authError }),
    },
    from,
  }
}

function makePatchRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/auth/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PATCH /api/auth/me', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makePatchSupabase({ user: null }) as never
    )
    const res = await PATCH(makePatchRequest({ active_league_id: 'league-1' }))
    expect(res.status).toBe(401)
    expect((await res.json()).code).toBe('SESSION_EXPIRED')
  })

  it('returns 400 INVALID_BODY when active_league_id is missing', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makePatchSupabase() as never)
    const res = await PATCH(makePatchRequest({}))
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('INVALID_BODY')
  })

  it('returns 403 NOT_A_MEMBER when the user is not a member of the target league', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makePatchSupabase({ membership: { data: null, error: { message: 'no row' } } }) as never
    )
    const res = await PATCH(makePatchRequest({ active_league_id: 'league-1' }))
    expect(res.status).toBe(403)
    expect((await res.json()).code).toBe('NOT_A_MEMBER')
  })

  it('returns 200 with the updated user (including can_create_league) and league', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makePatchSupabase() as never)
    const res = await PATCH(makePatchRequest({ active_league_id: 'league-1' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('success')
    expect(json.data.user.can_create_league).toBe(true)
    expect(json.data.league.id).toBe('league-1')
    expect(json.data.league.role).toBe('member')
  })
})
