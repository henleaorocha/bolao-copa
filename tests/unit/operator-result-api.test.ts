import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/operator', () => ({
  requireOperator: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseServerClient: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

// O handler invalida o cache de ranking ao salvar um resultado; fora de um
// request scope do Next, revalidateTag real lançaria. unstable_cache é
// pass-through (o helper de ranking o chama no load do módulo).
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}))

import { PATCH } from '@/app/api/admin/matches/[id]/result/route'
import { requireOperator } from '@/lib/operator'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import { createClient } from '@supabase/supabase-js'

const MATCH_ID = 'match-xyz'
const OPERATOR_EMAIL = 'henrique.rocha@arkmeds.com'

const UPDATED_ROW = {
  id: MATCH_ID,
  home_team: 'Brasil',
  away_team: 'Argentina',
  home_score: 2,
  away_score: 1,
  status: 'finished',
  is_manual: true,
  manual_updated_at: '2026-06-20T18:00:00.000Z',
}

function makeRequest(body?: unknown): NextRequest {
  return new NextRequest(
    `http://localhost/api/admin/matches/${MATCH_ID}/result`,
    {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : 'not-json',
      headers: { 'Content-Type': 'application/json' },
    }
  )
}

function makeParams(): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id: MATCH_ID }) }
}

// Service-role client mock: first `from('matches')` is the existence check
// (select→eq→single); the second is the write (update→eq→select→single).
function makeServiceClient({
  matchResult = { data: { id: MATCH_ID }, error: null } as { data: unknown; error: unknown },
  updateResult = { data: UPDATED_ROW, error: null } as { data: unknown; error: unknown },
} = {}) {
  const updateSpy = vi.fn((update: Record<string, unknown>) => {
    void update
    const single = vi.fn().mockResolvedValue(updateResult)
    const select = vi.fn(() => ({ single }))
    const eq = vi.fn(() => ({ select }))
    return { eq }
  })

  const from = vi.fn(() => {
    const singleSelect = vi.fn().mockResolvedValue(matchResult)
    const eqSelect = vi.fn(() => ({ single: singleSelect }))
    const select = vi.fn(() => ({ eq: eqSelect }))
    return { select, update: updateSpy }
  })

  return { from, updateSpy }
}

function makeSessionClient(email: string | undefined = OPERATOR_EMAIL) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: email ? { id: 'op-1', email } : null },
        error: null,
      }),
    },
  }
}

describe('PATCH /api/admin/matches/[id]/result', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test-supabase.local'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    // Default: an allowed operator session.
    vi.mocked(requireOperator).mockResolvedValue({ ok: true })
    vi.mocked(getSupabaseServerClient).mockResolvedValue(makeSessionClient() as never)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  // ─── Gate ──────────────────────────────────────────────────────────────

  it('returns 401 when there is no session', async () => {
    vi.mocked(requireOperator).mockResolvedValue({ ok: false, status: 401 })
    const res = await PATCH(
      makeRequest({ home_score: 2, away_score: 1, status: 'finished' }),
      makeParams()
    )
    expect(res.status).toBe(401)
    expect((await res.json()).code).toBe('SESSION_EXPIRED')
  })

  it('returns 403 for an authenticated non-operator', async () => {
    vi.mocked(requireOperator).mockResolvedValue({ ok: false, status: 403 })
    const res = await PATCH(
      makeRequest({ home_score: 2, away_score: 1, status: 'finished' }),
      makeParams()
    )
    expect(res.status).toBe(403)
    expect((await res.json()).code).toBe('FORBIDDEN')
  })

  // ─── Set path ──────────────────────────────────────────────────────────

  it('sets scores/status, is_manual=true and manual_updated_at on a valid body', async () => {
    const { from, updateSpy } = makeServiceClient()
    vi.mocked(createClient).mockReturnValue({ from } as never)

    const res = await PATCH(
      makeRequest({ home_score: 2, away_score: 1, status: 'finished' }),
      makeParams()
    )

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('success')
    expect(json.data).toMatchObject({ id: MATCH_ID, is_manual: true })

    const update = updateSpy.mock.calls[0][0] as Record<string, unknown>
    expect(update.home_score).toBe(2)
    expect(update.away_score).toBe(1)
    expect(update.status).toBe('finished')
    expect(update.is_manual).toBe(true)
    expect(typeof update.manual_updated_at).toBe('string')
  })

  it('accepts a score exactly at the upper bound (99)', async () => {
    const { from } = makeServiceClient()
    vi.mocked(createClient).mockReturnValue({ from } as never)
    const res = await PATCH(
      makeRequest({ home_score: 99, away_score: 99, status: 'finished' }),
      makeParams()
    )
    expect(res.status).toBe(200)
  })

  // ─── Release path ──────────────────────────────────────────────────────

  it('sets is_manual=false on release: true', async () => {
    const { from, updateSpy } = makeServiceClient({
      updateResult: { data: { ...UPDATED_ROW, is_manual: false }, error: null },
    })
    vi.mocked(createClient).mockReturnValue({ from } as never)

    const res = await PATCH(makeRequest({ release: true }), makeParams())

    expect(res.status).toBe(200)
    const update = updateSpy.mock.calls[0][0] as Record<string, unknown>
    expect(update).toEqual({ is_manual: false })
  })

  // ─── Body validation (set path) ──────────────────────────────────────────

  it('returns 400 when home_score exceeds the upper bound', async () => {
    const { from } = makeServiceClient()
    vi.mocked(createClient).mockReturnValue({ from } as never)
    const res = await PATCH(
      makeRequest({ home_score: 100, away_score: 0, status: 'finished' }),
      makeParams()
    )
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('INVALID_BODY')
  })

  it('returns 400 when home_score is a non-integer float', async () => {
    const { from } = makeServiceClient()
    vi.mocked(createClient).mockReturnValue({ from } as never)
    const res = await PATCH(
      makeRequest({ home_score: 1.5, away_score: 0, status: 'finished' }),
      makeParams()
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 when status is not a valid enum value', async () => {
    const { from } = makeServiceClient()
    vi.mocked(createClient).mockReturnValue({ from } as never)
    const res = await PATCH(
      makeRequest({ home_score: 1, away_score: 0, status: 'cancelled' }),
      makeParams()
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 when the body is not valid JSON', async () => {
    const { from } = makeServiceClient()
    vi.mocked(createClient).mockReturnValue({ from } as never)
    const res = await PATCH(makeRequest(undefined), makeParams())
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('INVALID_BODY')
  })

  // ─── Not found ───────────────────────────────────────────────────────────

  it('returns 404 when the match does not exist', async () => {
    const { from } = makeServiceClient({
      matchResult: { data: null, error: { message: 'no rows' } },
    })
    vi.mocked(createClient).mockReturnValue({ from } as never)
    const res = await PATCH(
      makeRequest({ home_score: 2, away_score: 1, status: 'finished' }),
      makeParams()
    )
    expect(res.status).toBe(404)
    expect((await res.json()).code).toBe('MATCH_NOT_FOUND')
  })

  it('returns 500 when the update fails', async () => {
    const { from } = makeServiceClient({
      updateResult: { data: null, error: { message: 'db write error' } },
    })
    vi.mocked(createClient).mockReturnValue({ from } as never)
    const res = await PATCH(
      makeRequest({ home_score: 2, away_score: 1, status: 'finished' }),
      makeParams()
    )
    expect(res.status).toBe(500)
    expect((await res.json()).code).toBe('DATABASE_ERROR')
  })

  // ─── Structured logs ─────────────────────────────────────────────────────

  it('logs operator_result_set with match_id, set_by and status_code', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { from } = makeServiceClient()
    vi.mocked(createClient).mockReturnValue({ from } as never)

    await PATCH(
      makeRequest({ home_score: 2, away_score: 1, status: 'finished' }),
      makeParams()
    )

    const event = logSpy.mock.calls
      .map((args) => {
        try { return JSON.parse(args[0] as string) } catch { return null }
      })
      .find((o) => o?.event === 'operator_result_set')
    expect(event).toBeTruthy()
    expect(event.match_id).toBe(MATCH_ID)
    expect(event.set_by).toBe(OPERATOR_EMAIL)
    expect(event.status_code).toBe(200)
  })

  it('logs operator_result_released on release', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { from } = makeServiceClient({
      updateResult: { data: { ...UPDATED_ROW, is_manual: false }, error: null },
    })
    vi.mocked(createClient).mockReturnValue({ from } as never)

    await PATCH(makeRequest({ release: true }), makeParams())

    const event = logSpy.mock.calls
      .map((args) => {
        try { return JSON.parse(args[0] as string) } catch { return null }
      })
      .find((o) => o?.event === 'operator_result_released')
    expect(event).toBeTruthy()
    expect(event.match_id).toBe(MATCH_ID)
    expect(event.set_by).toBe(OPERATOR_EMAIL)
    expect(event.status_code).toBe(200)
  })
})
