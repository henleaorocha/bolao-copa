/**
 * Integration tests for the canCreateLeague() server helper (lib/leagues/can-create-league.ts).
 * Require a running local Supabase instance with SUPABASE_SERVICE_ROLE_KEY set
 * (PRD league-permissions, task_03; depends on task_01 migration 20260601000025; ADR-001, ADR-004).
 *
 * Exercises the helper against a real session/database: a default user reads `false`,
 * a granted operator user reads `true`. The grant mirrors the migration's
 *   UPDATE public.users SET can_create_league = true WHERE email IN (...)
 *
 * Note: public.users has no ON DELETE CASCADE from auth.users, so deleting an auth user
 * leaves its public.users row behind. These tests delete both layers explicitly and
 * pre-clean the fixed operator e-mail so the suite is re-runnable.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { canCreateLeague } from '@/lib/leagues/can-create-league'
import {
  createTestUser,
  deleteTestUser,
  signInTestUser,
  authedClient,
  adminClient,
} from '../fixtures/factories'

const HAS_SERVICE_KEY = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
const OPERATOR_EMAIL = 'henrique.rocha@arkmeds.com'

describe.skipIf(!HAS_SERVICE_KEY)('canCreateLeague() — integration', () => {
  const admin = adminClient()
  const authUserIds: string[] = []
  const password = 'Test1234!'

  let defaultUserId: string
  let defaultUserEmail: string
  let operatorUserId: string

  beforeAll(async () => {
    // Default user: born can_create_league = false (column default from task_01).
    defaultUserEmail = `can-create-default-${Date.now()}@example.com`
    const defaultUser = await createTestUser(defaultUserEmail, password)
    defaultUserId = defaultUser.id
    authUserIds.push(defaultUserId)

    // Operator user: created under the operator e-mail, then granted via the migration UPDATE.
    await admin.from('users').delete().eq('email', OPERATOR_EMAIL)
    const operatorUser = await createTestUser(OPERATOR_EMAIL, password)
    operatorUserId = operatorUser.id
    authUserIds.push(operatorUserId)
    const { error: grantErr } = await admin
      .from('users')
      .update({ can_create_league: true })
      .eq('email', OPERATOR_EMAIL)
    expect(grantErr).toBeNull()
  })

  afterAll(async () => {
    for (const id of authUserIds) {
      await deleteTestUser(id)
      await admin.from('users').delete().eq('id', id)
    }
    await admin.from('users').delete().eq('email', OPERATOR_EMAIL)
  })

  it('returns false for a default user, against their own session', async () => {
    const { session } = await signInTestUser(defaultUserEmail, password)
    const client = authedClient(session.access_token)

    await expect(canCreateLeague(client as never, defaultUserId)).resolves.toBe(false)
  })

  it('returns true for a granted operator user, against their own session', async () => {
    const { session } = await signInTestUser(OPERATOR_EMAIL, password)
    const client = authedClient(session.access_token)

    await expect(canCreateLeague(client as never, operatorUserId)).resolves.toBe(true)
  })

  it('returns false via the helper when the userId has no matching row', async () => {
    // Admin client (bypasses RLS); a random UUID has no users row → safe false fallback.
    await expect(
      canCreateLeague(admin as never, '00000000-0000-0000-0000-0000000000ff')
    ).resolves.toBe(false)
  })
})
