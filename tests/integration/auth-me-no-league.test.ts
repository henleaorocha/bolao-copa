/**
 * Integration tests for GET /api/auth/me no-league handling + the
 * can_create_league flag (task_06, ADR-001 + ADR-005).
 *
 * Require a running local Supabase instance with SUPABASE_SERVICE_ROLE_KEY set
 * (depends on task_01 migration 20260601000025 + task_02 migration 20260601000026,
 * which stops auto-enrolling new users into the test league).
 *
 * Exercises the real GET handler against the real database by mocking
 * getSupabaseServerClient() to return a per-user authed client (anon key + RLS).
 *
 * Uses RANDOM e-mails and grants the flag by user id (not by the fixed operator
 * e-mail) so this suite never collides with the operator-email suites when vitest
 * runs files in parallel. public.users has no ON DELETE CASCADE from auth.users, so
 * we delete both layers explicitly.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseServerClient: vi.fn(),
}))

import { GET } from '@/app/api/auth/me/route'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import {
  createTestUser,
  deleteTestUser,
  signInTestUser,
  authedClient,
  adminClient,
  createTestLeague,
} from '../fixtures/factories'

const HAS_SERVICE_KEY = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost/api/auth/me')
}

describe.skipIf(!HAS_SERVICE_KEY)('GET /api/auth/me — no-league + flag (integration)', () => {
  const admin = adminClient()
  const authUserIds: string[] = []
  const createdLeagueIds: string[] = []
  const password = 'Test1234!'

  // No-league user, granted can_create_league = true (asserts both the null-league
  // path and a true flag in one user).
  let noLeagueUserId: string
  let noLeagueToken: string
  // Member user, default can_create_league = false (asserts a populated league and
  // a false flag).
  let memberUserId: string
  let memberToken: string
  let memberLeagueId: string

  beforeAll(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const noLeagueEmail = `me-noleague-${Date.now()}@example.com`
    const noLeagueUser = await createTestUser(noLeagueEmail, password)
    noLeagueUserId = noLeagueUser.id
    authUserIds.push(noLeagueUserId)
    const { error: grantErr } = await admin
      .from('users')
      .update({ can_create_league: true })
      .eq('id', noLeagueUserId)
    expect(grantErr).toBeNull()
    noLeagueToken = (await signInTestUser(noLeagueEmail, password)).session.access_token

    const memberEmail = `me-member-${Date.now()}@example.com`
    const memberUser = await createTestUser(memberEmail, password)
    memberUserId = memberUser.id
    authUserIds.push(memberUserId)

    const league = await createTestLeague(`Me Liga ${Date.now()}`, 'private', memberUserId)
    memberLeagueId = league.id
    createdLeagueIds.push(memberLeagueId)
    const { error: memberErr } = await admin
      .from('league_members')
      .insert({ league_id: memberLeagueId, user_id: memberUserId, role: 'admin' })
    expect(memberErr).toBeNull()
    memberToken = (await signInTestUser(memberEmail, password)).session.access_token
  })

  afterAll(async () => {
    for (const id of createdLeagueIds) {
      await admin.from('league_members').delete().eq('league_id', id)
      await admin.from('leagues').delete().eq('id', id)
    }
    for (const id of authUserIds) {
      await deleteTestUser(id)
      await admin.from('users').delete().eq('id', id)
    }
    vi.restoreAllMocks()
  })

  it('returns 200 + league: null for a freshly created (no-league) user', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      authedClient(noLeagueToken) as never
    )

    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('success')
    expect(json.data.league).toBeNull()
    expect(json.data.user.id).toBe(noLeagueUserId)
    expect(json.data.user.can_create_league).toBe(true)
  })

  it('returns 200 + populated league and can_create_league: false for a member user', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      authedClient(memberToken) as never
    )

    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('success')
    expect(json.data.league).not.toBeNull()
    expect(json.data.league.id).toBe(memberLeagueId)
    expect(json.data.league.role).toBe('admin')
    expect(json.data.user.id).toBe(memberUserId)
    expect(json.data.user.can_create_league).toBe(false)
  })
})
