/**
 * Integration tests for migration 20260601000026_league_permissions_policies.sql.
 * Require a running local Supabase instance with SUPABASE_SERVICE_ROLE_KEY set
 * (PRD league-permissions, task_02; ADR-002, ADR-003, ADR-004).
 *
 * Exercises the three security objects at the real RLS/trigger layer:
 *   1. leagues_insert     — INSERT gated on users.can_create_league.
 *   2. leagues_select_open — test league hidden from non-members, visible to members.
 *   3. handle_new_user()  — new signups get one public.users row and zero
 *                           league_members rows (no auto-enroll).
 *
 * Note: public.users has no ON DELETE CASCADE from auth.users, so deleting an auth
 * user leaves its public.users row behind. These tests delete the public.users rows
 * they touch explicitly and use random e-mails so the suite is re-runnable.
 */
import { describe, it, expect, afterAll } from 'vitest'
import {
  createTestUser,
  deleteTestUser,
  signInTestUser,
  authedClient,
  adminClient,
  DEFAULT_LEAGUE_ID,
} from '../fixtures/factories'

const HAS_SERVICE_KEY = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

const rnd = () => Math.random().toString(36).slice(2, 8)

describe.skipIf(!HAS_SERVICE_KEY)('league-permissions policies — migration 20260601000026', () => {
  const admin = adminClient()
  const authUserIds: string[] = []
  const createdLeagueIds: string[] = []

  /** Create an auth user (fires handle_new_user) and track it for cleanup. */
  async function newUser(prefix: string) {
    const email = `${prefix}-${Date.now()}-${rnd()}@example.com`
    const user = await createTestUser(email)
    authUserIds.push(user.id)
    return { ...user, email }
  }

  async function setCanCreate(userId: string, value: boolean) {
    const { error } = await admin
      .from('users')
      .update({ can_create_league: value })
      .eq('id', userId)
    expect(error).toBeNull()
  }

  afterAll(async () => {
    if (createdLeagueIds.length) {
      await admin.from('leagues').delete().in('id', createdLeagueIds)
    }
    // Remove any test-league memberships these users gained.
    if (authUserIds.length) {
      await admin.from('league_members').delete().in('user_id', authUserIds)
    }
    for (const id of authUserIds) {
      await deleteTestUser(id)
      await admin.from('users').delete().eq('id', id) // no cascade — clean explicitly
    }
  })

  // ── handle_new_user(): upsert + no auto-enroll ──────────────────────────────

  it('a new signup creates exactly one public.users row (trigger upsert)', async () => {
    const user = await newUser('lpp-signup')

    const { data, error } = await admin
      .from('users')
      .select('id, email')
      .eq('id', user.id)

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0].email).toBe(user.email)
  })

  it('the users upsert is idempotent on conflict (ON CONFLICT (id) DO NOTHING)', async () => {
    const user = await newUser('lpp-idem')

    // The trigger already inserted the row. A second insert with the same id and
    // different data must be a no-op (mirrors the trigger's ON CONFLICT DO NOTHING).
    const { error } = await admin
      .from('users')
      .upsert({ id: user.id, email: 'overwritten@example.com' }, { onConflict: 'id', ignoreDuplicates: true })
    expect(error).toBeNull()

    const { data } = await admin.from('users').select('email').eq('id', user.id).single()
    expect(data!.email).toBe(user.email) // unchanged
  })

  it('a freshly created user has zero league_members rows (no auto-enroll)', async () => {
    const user = await newUser('lpp-noenroll')

    const { data, error } = await admin
      .from('league_members')
      .select('id')
      .eq('user_id', user.id)

    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  // ── leagues_insert: creation gate ───────────────────────────────────────────

  it('a user with can_create_league = false is rejected by RLS on INSERT; no row created', async () => {
    const user = await newUser('lpp-cannot')
    await setCanCreate(user.id, false)

    const { session } = await signInTestUser(user.email)
    const client = authedClient(session.access_token)

    const { data, error } = await client
      .from('leagues')
      .insert({ name: `Blocked ${rnd()}`, access_type: 'open', created_by: user.id })
      .select('id')

    expect(error).not.toBeNull() // RLS WITH CHECK violation
    expect(data).toBeNull()

    // Confirm nothing was persisted for this creator.
    const { data: rows } = await admin
      .from('leagues')
      .select('id')
      .eq('created_by', user.id)
    expect(rows).toHaveLength(0)
  })

  it('a user with can_create_league = true can INSERT a league via their session', async () => {
    const user = await newUser('lpp-can')
    await setCanCreate(user.id, true)

    const { session } = await signInTestUser(user.email)
    const client = authedClient(session.access_token)

    const { data, error } = await client
      .from('leagues')
      .insert({ name: `Allowed ${rnd()}`, access_type: 'open', created_by: user.id })
      .select('id')
      .single()

    expect(error).toBeNull()
    expect(data).toBeTruthy()
    createdLeagueIds.push(data!.id)
  })

  // ── leagues_select_open: test-league hiding ─────────────────────────────────

  it("a non-member's SELECT does not return the test league", async () => {
    const user = await newUser('lpp-outsider')
    const { session } = await signInTestUser(user.email)
    const client = authedClient(session.access_token)

    // Direct lookup by id.
    const byId = await client.from('leagues').select('id').eq('id', DEFAULT_LEAGUE_ID)
    expect(byId.data).toHaveLength(0)

    // And it must not appear in an open-league listing either.
    const open = await client.from('leagues').select('id').eq('access_type', 'open')
    expect((open.data ?? []).some((r) => r.id === DEFAULT_LEAGUE_ID)).toBe(false)
  })

  it('a member of the test league still receives it in a SELECT', async () => {
    const user = await newUser('lpp-tester')

    // Add them to the test league out of band (as testers are added manually).
    const { error: memErr } = await admin
      .from('league_members')
      .insert({ league_id: DEFAULT_LEAGUE_ID, user_id: user.id, role: 'member' })
    expect(memErr).toBeNull()

    const { session } = await signInTestUser(user.email)
    const client = authedClient(session.access_token)

    const { data } = await client.from('leagues').select('id').eq('id', DEFAULT_LEAGUE_ID)
    expect(data).toHaveLength(1)
    expect(data![0].id).toBe(DEFAULT_LEAGUE_ID)
  })
})
