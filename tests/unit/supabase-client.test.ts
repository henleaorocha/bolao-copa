import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/headers before importing the client
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}))

describe('getSupabaseServerClient', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('initializes with NEXT_PUBLIC_SUPABASE_URL env var', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

    const { getSupabaseServerClient } = await import('@/lib/supabase/client')
    const client = await getSupabaseServerClient()
    expect(client).toBeDefined()
  })

  it('returns a client with auth methods', async () => {
    const { getSupabaseServerClient } = await import('@/lib/supabase/client')
    const client = await getSupabaseServerClient()
    expect(typeof client.auth.getUser).toBe('function')
    expect(typeof client.auth.signOut).toBe('function')
    expect(typeof client.auth.exchangeCodeForSession).toBe('function')
  })

  it('returns a client with db query methods', async () => {
    const { getSupabaseServerClient } = await import('@/lib/supabase/client')
    const client = await getSupabaseServerClient()
    expect(typeof client.from).toBe('function')
  })
})
