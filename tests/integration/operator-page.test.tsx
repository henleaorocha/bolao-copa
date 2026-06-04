/**
 * @vitest-environment jsdom
 *
 * Integration tests for app/(operator)/controle-resultados/page.tsx.
 * Verifies the unlisted page is gated by the SAME requireOperator() guard used
 * by the API: operators see the control table; non-operators are refused.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/lib/operator', () => ({
  requireOperator: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn().mockImplementation((path: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { redirectPath: path })
  }),
  notFound: vi.fn().mockImplementation(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

import ControleResultadosPage from '@/app/(operator)/controle-resultados/page'
import { requireOperator } from '@/lib/operator'
import { createClient } from '@supabase/supabase-js'
import { redirect, notFound } from 'next/navigation'

const SAMPLE_MATCHES = [
  {
    id: 'm1',
    home_team: 'Brasil',
    away_team: 'Argentina',
    match_date: '2026-06-20T18:00:00Z',
    phase: 'group',
    status: 'scheduled',
    home_score: null,
    away_score: null,
    is_manual: false,
    manual_updated_at: null,
  },
]

function makeServiceClient(
  result: { data: unknown; error: unknown } = { data: SAMPLE_MATCHES, error: null }
) {
  const order = vi.fn().mockResolvedValue(result)
  const select = vi.fn(() => ({ order }))
  const from = vi.fn(() => ({ select }))
  return { from }
}

describe('ControleResultadosPage — gating', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test-supabase.local'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
    vi.clearAllMocks()
  })

  it('renders the control table for an authenticated operator', async () => {
    vi.mocked(requireOperator).mockResolvedValue({ ok: true })
    vi.mocked(createClient).mockReturnValue(makeServiceClient() as never)

    const jsx = await ControleResultadosPage()
    render(jsx)

    expect(
      screen.getByRole('heading', { name: 'Controle de Resultados' })
    ).toBeInTheDocument()
    expect(screen.getByTestId('operator-result-table')).toBeInTheDocument()
    expect(screen.getByText('Brasil × Argentina')).toBeInTheDocument()
    expect(redirect).not.toHaveBeenCalled()
    expect(notFound).not.toHaveBeenCalled()
  })

  it('calls notFound() for an authenticated non-operator (403)', async () => {
    vi.mocked(requireOperator).mockResolvedValue({ ok: false, status: 403 })

    await expect(ControleResultadosPage()).rejects.toThrow('NEXT_NOT_FOUND')
    expect(notFound).toHaveBeenCalled()
    expect(createClient).not.toHaveBeenCalled()
  })

  it('redirects to /login when there is no session (401)', async () => {
    vi.mocked(requireOperator).mockResolvedValue({ ok: false, status: 401 })

    await expect(ControleResultadosPage()).rejects.toThrow('NEXT_REDIRECT')
    expect(redirect).toHaveBeenCalledWith('/login')
    expect(createClient).not.toHaveBeenCalled()
  })
})
