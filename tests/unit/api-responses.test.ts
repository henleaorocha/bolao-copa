import { describe, it, expect } from 'vitest'
import { formatSuccess, formatError } from '@/lib/api/responses'

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
