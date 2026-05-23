import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseServerClient: vi.fn(),
}))
vi.mock('@/lib/leagues/get-leagues-hub', () => ({
  getLeaguesHub: vi.fn(),
}))
vi.mock('@/lib/leagues/get-days-until-copa', () => ({
  getDaysUntilCopa: vi.fn(),
}))

import { GET } from '@/app/api/leagues/hub/route'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { getLeaguesHub } from '@/lib/leagues/get-leagues-hub'
import { getDaysUntilCopa } from '@/lib/leagues/get-days-until-copa'

function makeSupabase(user: unknown, authError: unknown = null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: authError }),
    },
  }
}

describe('GET /api/leagues/hub', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 401 when user is null (no session)', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase(null) as never)

    const response = await GET()
    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.status).toBe('error')
    expect(json.code).toBe('SESSION_EXPIRED')
  })

  it('returns 401 when auth returns an error', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase(null, { message: 'JWT expired' }) as never
    )

    const response = await GET()
    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.code).toBe('SESSION_EXPIRED')
  })

  it('returns 500 with DATABASE_ERROR when getLeaguesHub throws', async () => {
    const mockUser = { id: 'user-123', user_metadata: { full_name: 'Test User' } }
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase(mockUser) as never)
    vi.mocked(getLeaguesHub).mockRejectedValue(new Error('DB connection failed'))

    const response = await GET()
    expect(response.status).toBe(500)
    const json = await response.json()
    expect(json.status).toBe('error')
    expect(json.code).toBe('DATABASE_ERROR')
  })

  it('returns 200 with correct payload shape on success', async () => {
    const mockUser = { id: 'user-123', user_metadata: { full_name: 'João Silva' } }
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase(mockUser) as never)
    vi.mocked(getLeaguesHub).mockResolvedValue([])
    vi.mocked(getDaysUntilCopa).mockReturnValue({ days: 19, isUnderway: false })

    const response = await GET()
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.status).toBe('success')
    expect(json.data).toHaveProperty('leagues')
    expect(json.data).toHaveProperty('user')
    expect(json.data).toHaveProperty('countdown')
    expect(json.data.user.first_name).toBe('João')
    expect(json.data.countdown).toEqual({ days: 19, isUnderway: false })
    expect(json).toHaveProperty('timestamp')
  })

  it('extracts first_name from the first word of user_metadata.full_name', async () => {
    const mockUser = { id: 'user-456', user_metadata: { full_name: 'Maria Fernanda Costa' } }
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase(mockUser) as never)
    vi.mocked(getLeaguesHub).mockResolvedValue([])
    vi.mocked(getDaysUntilCopa).mockReturnValue({ days: 5, isUnderway: false })

    const response = await GET()
    const json = await response.json()
    expect(json.data.user.first_name).toBe('Maria')
  })

  it('uses empty string for first_name when full_name is absent', async () => {
    const mockUser = { id: 'user-789', user_metadata: {} }
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase(mockUser) as never)
    vi.mocked(getLeaguesHub).mockResolvedValue([])
    vi.mocked(getDaysUntilCopa).mockReturnValue({ days: 0, isUnderway: true })

    const response = await GET()
    const json = await response.json()
    expect(json.status).toBe('success')
    expect(json.data.user.first_name).toBe('')
  })

  it('passes the leagues array from getLeaguesHub into the response', async () => {
    const mockLeague = {
      id: 'league-1',
      name: 'Test League',
      access_type: 'open' as const,
      logo_url: null,
      member_count: 10,
      is_member: true,
      is_main: false,
    }
    const mockUser = { id: 'user-123', user_metadata: { full_name: 'Test User' } }
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSupabase(mockUser) as never)
    vi.mocked(getLeaguesHub).mockResolvedValue([mockLeague])
    vi.mocked(getDaysUntilCopa).mockReturnValue({ days: 10, isUnderway: false })

    const response = await GET()
    const json = await response.json()
    expect(json.data.leagues).toHaveLength(1)
    expect(json.data.leagues[0].id).toBe('league-1')
  })
})
