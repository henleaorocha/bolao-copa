/**
 * Integration tests for migration 20260601000025_users_can_create_league.sql.
 * Require a running local Supabase instance with SUPABASE_SERVICE_ROLE_KEY set
 * (PRD league-permissions, task_01; ADR-001, ADR-004).
 *
 * Verifies the column default and the idempotent operator-grant behaviour against
 * a real database. The grant mirrors the migration's
 *   UPDATE public.users SET can_create_league = true WHERE email IN (...)
 * via the PostgREST equivalent (update().in('email', ...)).
 *
 * Note: public.users has no ON DELETE CASCADE from auth.users, so deleting an auth
 * user leaves its public.users row behind. These tests therefore delete the
 * public.users rows they touch explicitly, and pre-clean the fixed operator e-mails
 * so the suite is re-runnable.
 */
import { randomUUID } from 'crypto'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestUser, deleteTestUser, adminClient } from '../fixtures/factories'

const HAS_SERVICE_KEY = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

const OPERATOR_EMAILS = ['hen.leao.rocha@gmail.com', 'henrique.rocha@arkmeds.com']

/** Re-runnable grant mirroring the migration UPDATE. Returns the affected rows. */
async function runGrant(emails: string[] = OPERATOR_EMAILS) {
  const admin = adminClient()
  return admin
    .from('users')
    .update({ can_create_league: true })
    .in('email', emails)
    .select('email, can_create_league')
}

describe.skipIf(!HAS_SERVICE_KEY)('users.can_create_league — migration 20260601000025', () => {
  const admin = adminClient()
  const authUserIds: string[] = [] // auth users created via createTestUser
  const rowIds: string[] = [] // public.users rows inserted directly

  beforeAll(async () => {
    // Pre-clean any leftover operator rows so the grant tests start from a known state.
    await admin.from('users').delete().in('email', OPERATOR_EMAILS)
  })

  afterAll(async () => {
    // public.users has no cascade from auth.users — clean both layers explicitly.
    if (rowIds.length) await admin.from('users').delete().in('id', rowIds)
    for (const id of authUserIds) {
      await deleteTestUser(id)
      await admin.from('users').delete().eq('id', id)
    }
    await admin.from('users').delete().in('email', OPERATOR_EMAILS)
  })

  // ── Default value (via createTestUser, per task requirement) ────────────────

  it('a freshly created user (createTestUser) has can_create_league = false', async () => {
    const user = await createTestUser(`can-create-default-${Date.now()}@example.com`)
    authUserIds.push(user.id)

    const { data, error } = await admin
      .from('users')
      .select('can_create_league')
      .eq('id', user.id)
      .single()

    expect(error).toBeNull()
    expect(data!.can_create_league).toBe(false)
  })

  // ── Grant lands on an operator-e-mail row + is idempotent ───────────────────

  it('granting an operator e-mail sets can_create_league = true, and is idempotent', async () => {
    const operatorEmail = OPERATOR_EMAILS[0]
    const id = randomUUID()
    rowIds.push(id)

    // A row whose e-mail matches an operator address, born false (no flag supplied).
    const { error: insErr } = await admin
      .from('users')
      .insert({ id, email: operatorEmail })
    expect(insErr).toBeNull()

    const before = await admin
      .from('users')
      .select('can_create_league')
      .eq('id', id)
      .single()
    expect(before.data!.can_create_league).toBe(false)

    // First grant: flips to true, affects exactly this one row.
    const first = await runGrant([operatorEmail])
    expect(first.error).toBeNull()
    expect(first.data).toHaveLength(1)
    expect(first.data![0].can_create_league).toBe(true)

    // Second grant: idempotent — no error, flag stays true.
    const second = await runGrant([operatorEmail])
    expect(second.error).toBeNull()
    expect(second.data![0].can_create_league).toBe(true)

    const after = await admin
      .from('users')
      .select('can_create_league')
      .eq('id', id)
      .single()
    expect(after.data!.can_create_league).toBe(true)
  })

  // ── Grant against a non-existent operator e-mail ────────────────────────────

  it('granting a non-existent operator e-mail affects zero rows and does not error', async () => {
    const ghost = `nobody-${Date.now()}@nonexistent.invalid`
    const { data, error } = await runGrant([ghost])

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  // ── Non-operator rows stay false ────────────────────────────────────────────

  it('a non-operator user is unaffected by the operator grant', async () => {
    const id = randomUUID()
    rowIds.push(id)
    const { error: insErr } = await admin
      .from('users')
      .insert({ id, email: `non-operator-${Date.now()}@example.com` })
    expect(insErr).toBeNull()

    const grant = await runGrant() // grants only the two operator e-mails
    expect(grant.error).toBeNull()

    const { data } = await admin
      .from('users')
      .select('can_create_league')
      .eq('id', id)
      .single()
    expect(data!.can_create_league).toBe(false)
  })
})
