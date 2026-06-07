/**
 * @vitest-environment jsdom
 *
 * Integration tests for app/ligas/page.tsx capability gating (task_05, ADR-001/005).
 * Require a running local Supabase instance with SUPABASE_SERVICE_ROLE_KEY set
 * (depends on task_01 migration 20260601000025 + task_02 migration 20260601000026,
 * and the task_03 canCreateLeague helper).
 *
 * Renders the real async Server Component against the real database by mocking
 * getSupabaseServerClient() to return a per-user authed client (anon key + RLS).
 * The leaf Client Components are stubbed so the assertions target the page's own
 * gating logic (which control renders) rather than their internals.
 *
 *  - default user (can_create_league = false), member of a league -> league grid,
 *    NO create control;
 *  - operator user (can_create_league = true), member of a league -> create card present;
 *  - default user with zero leagues -> the no-league empty state.
 *
 * All users use RANDOM e-mails and the grant is applied by user id (not by the
 * fixed operator e-mail) so this suite never collides with the operator-email
 * suite when vitest runs files in parallel. public.users has no ON DELETE CASCADE
 * from auth.users, so we delete both layers explicitly.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { LeagueHubItem } from '@/lib/api/types'

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseServerClient: vi.fn(),
}))

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

// Stub leaf Client Components — they need router/hook context that jsdom lacks,
// and they are not under test here. Each exposes a stable test hook.
vi.mock('@/components/LogoutButton', () => ({
  default: () => <button aria-label="logout-stub">Sair</button>,
}))
vi.mock('@/components/LeagueCard', () => ({
  default: ({ league }: { league: LeagueHubItem }) => (
    <div data-testid={`card-${league.id}`}>{league.name}</div>
  ),
}))
vi.mock('@/components/CreateLeagueModal', () => ({
  default: () => <button data-testid="create-league-card">Criar nova liga</button>,
}))

import LigasPage from '@/app/ligas/page'
import { getSupabaseServerClient } from '@/lib/supabase/client'
import {
  createTestUser,
  deleteTestUser,
  signInTestUser,
  createTestLeague,
  addTestLeagueMember,
  authedClient,
  adminClient,
} from '../fixtures/factories'

const HAS_SERVICE_KEY = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

async function renderAs(token: string) {
  vi.mocked(getSupabaseServerClient).mockResolvedValue(authedClient(token) as never)
  const ui = await LigasPage()
  render(ui)
}

describe.skipIf(!HAS_SERVICE_KEY)('app/ligas/page.tsx — capability gating (integration)', () => {
  const admin = adminClient()
  const password = 'Test1234!'
  const authUserIds: string[] = []
  const createdLeagueIds: string[] = []

  let defaultToken: string
  let operatorToken: string
  let leaglessToken: string

  beforeAll(async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Default user (born can_create_league = false), member of a private league.
    const defaultEmail = `ligas-default-${Date.now()}@example.com`
    const defaultUser = await createTestUser(defaultEmail, password)
    authUserIds.push(defaultUser.id)
    const defaultLeague = await createTestLeague('Liga do Default', 'private', defaultUser.id)
    createdLeagueIds.push(defaultLeague.id)
    await addTestLeagueMember(defaultLeague.id, defaultUser.id, 'admin')
    defaultToken = (await signInTestUser(defaultEmail, password)).session.access_token

    // Operator user (granted by id), member of a private league.
    const operatorEmail = `ligas-operator-${Date.now()}@example.com`
    const operatorUser = await createTestUser(operatorEmail, password)
    authUserIds.push(operatorUser.id)
    const { error: grantErr } = await admin
      .from('users')
      .update({ can_create_league: true })
      .eq('id', operatorUser.id)
    expect(grantErr).toBeNull()
    const operatorLeague = await createTestLeague('Liga do Operator', 'private', operatorUser.id)
    createdLeagueIds.push(operatorLeague.id)
    await addTestLeagueMember(operatorLeague.id, operatorUser.id, 'admin')
    operatorToken = (await signInTestUser(operatorEmail, password)).session.access_token

    // League-less default user (no auto-enroll trigger -> zero memberships).
    const leaglessEmail = `ligas-leagless-${Date.now()}@example.com`
    const leaglessUser = await createTestUser(leaglessEmail, password)
    authUserIds.push(leaglessUser.id)
    leaglessToken = (await signInTestUser(leaglessEmail, password)).session.access_token
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

  it('default user: shows their league but NO create control', async () => {
    await renderAs(defaultToken)

    expect(screen.getByText('Liga do Default')).toBeInTheDocument()
    expect(screen.queryByTestId('create-league-card')).not.toBeInTheDocument()
    expect(screen.queryByTestId('no-league-empty-state')).not.toBeInTheDocument()
  })

  it('operator user: shows the create card', async () => {
    await renderAs(operatorToken)

    expect(screen.getByTestId('create-league-card')).toBeInTheDocument()
    expect(screen.getByText('Liga do Operator')).toBeInTheDocument()
  })

  it('league-less default user: shows the no-league empty state and no create control', async () => {
    await renderAs(leaglessToken)

    expect(screen.getByTestId('no-league-empty-state')).toBeInTheDocument()
    expect(screen.getByText(/link de convite/i)).toBeInTheDocument()
    expect(screen.queryByTestId('create-league-card')).not.toBeInTheDocument()
  })
})
