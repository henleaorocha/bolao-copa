import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseServerClient: vi.fn(),
}))

import { requireOperator, OPERATOR_EMAILS } from '@/lib/operator'
import { getSupabaseServerClient } from '@/lib/supabase/client'

function makeSupabase({
  user = null as unknown,
  authError = null as unknown,
} = {}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: authError,
      }),
    },
  }
}

describe('requireOperator()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('exposes exactly the two named operator accounts', () => {
    expect(OPERATOR_EMAILS.has('hen.leao.rocha@gmail.com')).toBe(true)
    expect(OPERATOR_EMAILS.has('henrique.rocha@arkmeds.com')).toBe(true)
    expect(OPERATOR_EMAILS.size).toBe(2)
  })

  it('returns { ok: true } for an allowed operator email', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ user: { id: 'u1', email: 'henrique.rocha@arkmeds.com' } }) as never
    )
    const result = await requireOperator()
    expect(result).toEqual({ ok: true })
  })

  it('is case-insensitive on the operator email', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ user: { id: 'u1', email: 'Henrique.Rocha@Arkmeds.com' } }) as never
    )
    const result = await requireOperator()
    expect(result).toEqual({ ok: true })
  })

  it('returns 403 for an authenticated non-operator email', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ user: { id: 'u2', email: 'participant@example.com' } }) as never
    )
    const result = await requireOperator()
    expect(result).toEqual({ ok: false, status: 403 })
  })

  it('returns 403 when the user has no email', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ user: { id: 'u3' } }) as never
    )
    const result = await requireOperator()
    expect(result).toEqual({ ok: false, status: 403 })
  })

  it('returns 401 when there is no session', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ user: null }) as never
    )
    const result = await requireOperator()
    expect(result).toEqual({ ok: false, status: 401 })
  })

  it('returns 401 on an auth error', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      makeSupabase({ user: null, authError: { message: 'expired' } }) as never
    )
    const result = await requireOperator()
    expect(result).toEqual({ ok: false, status: 401 })
  })
})
