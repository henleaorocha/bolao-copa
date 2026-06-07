/**
 * Integration tests for the POST /api/leagues permission gate (task_04, ADR-004).
 * Require a running local Supabase instance with SUPABASE_SERVICE_ROLE_KEY set
 * (depends on task_01 migration 20260601000025 + task_02 migration 20260601000026).
 *
 * Exercises the real POST handler against the real database by mocking
 * getSupabaseServerClient() to return a per-user authed client (anon key + RLS).
 * A default user (can_create_league = false) is blocked with 403 and creates no
 * rows; a granted user (can_create_league = true) gets 201 with the league + admin
 * membership.
 *
 * Both users use RANDOM e-mails and the grant is applied by user id (not by the
 * fixed operator e-mail) so this suite never collides with the operator-email
 * suite in tests/integration/can-create-league.test.ts when vitest runs files in
 * parallel. public.users has no ON DELETE CASCADE from auth.users, so we delete
 * both layers explicitly.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseServerClient: vi.fn(),
}))

import { POST } from '@/app/api/leagues/route'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import {
  createTestUser,
  deleteTestUser,
  signInTestUser,
  authedClient,
  adminClient,
} from '../fixtures/factories'

const HAS_SERVICE_KEY = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/leagues', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe.skipIf(!HAS_SERVICE_KEY)('POST /api/leagues — permission gate (integration)', () => {
  const admin = adminClient()
  const authUserIds: string[] = []
  const createdLeagueIds: string[] = []
  const password = 'Test1234!'

  let defaultUserId: string
  let defaultUserEmail: string
  let defaultToken: string
  let operatorUserId: string
  let operatorEmail: string
  let operatorToken: string

  beforeAll(async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    // Default user: born can_create_league = false (column default, task_01).
    defaultUserEmail = `post-gate-default-${Date.now()}@example.com`
    const defaultUser = await createTestUser(defaultUserEmail, password)
    defaultUserId = defaultUser.id
    authUserIds.push(defaultUserId)
    defaultToken = (await signInTestUser(defaultUserEmail, password)).session.access_token

    // Granted user: random e-mail, flag set by id (mirrors the migration grant
    // without reusing the fixed operator e-mail, so this suite is collision-free).
    operatorEmail = `post-gate-operator-${Date.now()}@example.com`
    const operatorUser = await createTestUser(operatorEmail, password)
    operatorUserId = operatorUser.id
    authUserIds.push(operatorUserId)
    const { error: grantErr } = await admin
      .from('users')
      .update({ can_create_league: true })
      .eq('id', operatorUserId)
    expect(grantErr).toBeNull()
    operatorToken = (await signInTestUser(operatorEmail, password)).session.access_token
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

  it('blocks a default user with 403 and creates zero rows', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      authedClient(defaultToken) as never
    )

    const leagueName = `Blocked League ${Date.now()}`
    const res = await POST(makeRequest({ name: leagueName, access_type: 'private' }))

    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('FORBIDDEN')
    expect(json.error).toBe('Você não tem permissão para criar ligas')

    // No league row was inserted for this name.
    const { data: leagues, error } = await admin
      .from('leagues')
      .select('id')
      .eq('name', leagueName)
    expect(error).toBeNull()
    expect(leagues ?? []).toHaveLength(0)

    // The default user has no league memberships either.
    const { data: memberships } = await admin
      .from('league_members')
      .select('league_id')
      .eq('user_id', defaultUserId)
    expect(memberships ?? []).toHaveLength(0)
  })

  it('allows an operator user with 201 and creates the league + admin membership', async () => {
    vi.mocked(getSupabaseServerClient).mockResolvedValue(
      authedClient(operatorToken) as never
    )

    const leagueName = `Operator League ${Date.now()}`
    const res = await POST(makeRequest({ name: leagueName, access_type: 'private' }))

    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.status).toBe('success')
    expect(json.data).toHaveProperty('id')
    expect(json.data.name).toBe(leagueName)
    expect(json.data.role).toBe('admin')

    const leagueId = json.data.id as string
    createdLeagueIds.push(leagueId)

    // The league exists and is owned by the operator.
    const { data: league, error: leagueErr } = await admin
      .from('leagues')
      .select('id, name, created_by')
      .eq('id', leagueId)
      .single()
    expect(leagueErr).toBeNull()
    expect(league?.created_by).toBe(operatorUserId)

    // The operator is an admin member of the new league.
    const { data: member, error: memberErr } = await admin
      .from('league_members')
      .select('role')
      .eq('league_id', leagueId)
      .eq('user_id', operatorUserId)
      .single()
    expect(memberErr).toBeNull()
    expect(member?.role).toBe('admin')
  })
})
