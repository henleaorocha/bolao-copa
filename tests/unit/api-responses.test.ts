import { describe, it, expect } from 'vitest'
import { formatSuccess, formatError } from '@/lib/api/responses'
import type { LeagueDetail, LeagueSummary, LeagueMember } from '@/lib/api/types'

describe('formatSuccess', () => {
  it('returns envelope with status success', () => {
    const res = formatSuccess({ id: 1 })
    expect(res.status).toBe('success')
  })

  it('preserves all data fields', () => {
    const data = { id: 'uuid', email: 'a@b.com', name: 'Test' }
    const res = formatSuccess(data)
    expect(res.data).toEqual(data)
  })

  it('includes a valid ISO 8601 timestamp', () => {
    const res = formatSuccess(null)
    expect(res.timestamp).toBeDefined()
    expect(new Date(res.timestamp).toISOString()).toBe(res.timestamp)
  })

  it('works with null data', () => {
    const res = formatSuccess(null)
    expect(res.data).toBeNull()
  })

  it('works with array data', () => {
    const res = formatSuccess([1, 2, 3])
    expect(res.data).toHaveLength(3)
  })
})

describe('formatError', () => {
  it('returns envelope with status error', () => {
    const res = formatError('SESSION_EXPIRED', 'Sessão expirada', 401)
    expect(res.status).toBe('error')
  })

  it('includes the provided error code', () => {
    const res = formatError('DATABASE_ERROR', 'Erro interno', 500)
    expect(res.code).toBe('DATABASE_ERROR')
  })

  it('includes the http status code', () => {
    const res = formatError('DATABASE_UNAVAILABLE', 'Banco indisponível', 503)
    expect(res.statusCode).toBe(503)
  })

  it('includes the user-facing error message', () => {
    const msg = 'Sessão expirada'
    const res = formatError('SESSION_EXPIRED', msg, 401)
    expect(res.error).toBe(msg)
  })

  it('includes a valid ISO 8601 timestamp', () => {
    const res = formatError('TEST', 'teste', 400)
    expect(new Date(res.timestamp).toISOString()).toBe(res.timestamp)
  })

  it('encodes SESSION_EXPIRED correctly', () => {
    const res = formatError('SESSION_EXPIRED', 'Sessão expirada', 401)
    expect(res.code).toBe('SESSION_EXPIRED')
    expect(res.statusCode).toBe(401)
  })

  it('encodes DATABASE_ERROR correctly', () => {
    const res = formatError('DATABASE_ERROR', 'Erro ao buscar dados do usuário', 500)
    expect(res.code).toBe('DATABASE_ERROR')
    expect(res.statusCode).toBe(500)
  })

  it('encodes DATABASE_UNAVAILABLE correctly', () => {
    const res = formatError('DATABASE_UNAVAILABLE', 'Banco de dados indisponível', 503)
    expect(res.code).toBe('DATABASE_UNAVAILABLE')
    expect(res.statusCode).toBe(503)
  })
})

describe('LeagueDetail type shape', () => {
  const leagueDetailFixture = {
    id: 'league-1',
    name: 'Test League',
    access_type: 'private',
    logo_url: null,
    role: 'admin',
    member_count: 1,
    description: null,
    created_by: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    invite_token: 'tok-abc123',
    user_onboarded_at: null,
    members: [],
  } satisfies LeagueDetail

  it('includes invite_token field', () => {
    expect(leagueDetailFixture).toHaveProperty('invite_token')
    expect(typeof leagueDetailFixture.invite_token).toBe('string')
  })

  it('includes user_onboarded_at field as string or null', () => {
    expect(leagueDetailFixture).toHaveProperty('user_onboarded_at')
    const val = leagueDetailFixture.user_onboarded_at
    expect(val === null || typeof val === 'string').toBe(true)
  })

  it('accepts a non-null user_onboarded_at timestamp', () => {
    const withTimestamp = {
      ...leagueDetailFixture,
      user_onboarded_at: '2026-05-23T10:00:00Z',
    } satisfies LeagueDetail
    expect(typeof withTimestamp.user_onboarded_at).toBe('string')
  })
})

describe('LeagueSummary type shape (regression)', () => {
  const summaryFixture = {
    id: 'league-1',
    name: 'Test League',
    access_type: 'open',
    logo_url: null,
    role: 'member',
    member_count: 5,
  } satisfies LeagueSummary

  it('does not include invite_token', () => {
    expect(summaryFixture).not.toHaveProperty('invite_token')
  })

  it('does not include user_onboarded_at', () => {
    expect(summaryFixture).not.toHaveProperty('user_onboarded_at')
  })
})

describe('LeagueMember type shape (regression)', () => {
  const memberFixture = {
    user_id: 'user-1',
    full_name: 'João',
    avatar_url: null,
    avatar_color: '#FF0000',
    role: 'member',
    joined_at: '2026-01-01T00:00:00Z',
  } satisfies LeagueMember

  it('does not include invite_token', () => {
    expect(memberFixture).not.toHaveProperty('invite_token')
  })

  it('does not include user_onboarded_at', () => {
    expect(memberFixture).not.toHaveProperty('user_onboarded_at')
  })
})
