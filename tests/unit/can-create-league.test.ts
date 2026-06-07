import { describe, it, expect, vi } from 'vitest'
import { canCreateLeague } from '@/lib/leagues/can-create-league'

const USER_ID = 'user-abc'

// Builds a Supabase-like chain mock for `from('users').select(...).eq(...).single()`.
// .select() and .eq() keep the chain alive; .single() resolves to { data, error }.
function createMockSupabase(
  data: { can_create_league: boolean } | null,
  error: { message: string } | null = null
) {
  const single = vi.fn().mockResolvedValue({ data, error })
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single,
  }
  return {
    from: vi.fn().mockReturnValue(chain),
    __chain: chain,
  }
}

describe('canCreateLeague', () => {
  it('returns true when the row has can_create_league === true', async () => {
    const supabase = createMockSupabase({ can_create_league: true })
    await expect(canCreateLeague(supabase as never, USER_ID)).resolves.toBe(true)
  })

  it('returns false when the row has can_create_league === false', async () => {
    const supabase = createMockSupabase({ can_create_league: false })
    await expect(canCreateLeague(supabase as never, USER_ID)).resolves.toBe(false)
  })

  it('returns false when no row is found for the userId', async () => {
    const supabase = createMockSupabase(null)
    await expect(canCreateLeague(supabase as never, USER_ID)).resolves.toBe(false)
  })

  it('returns false when the query returns an error', async () => {
    const supabase = createMockSupabase(null, { message: 'PGRST116: no rows' })
    await expect(canCreateLeague(supabase as never, USER_ID)).resolves.toBe(false)
  })

  it('returns false when an error is present even if data is somehow non-null', async () => {
    const supabase = createMockSupabase({ can_create_league: true }, { message: 'DB error' })
    await expect(canCreateLeague(supabase as never, USER_ID)).resolves.toBe(false)
  })

  it('queries users.can_create_league filtered by the given userId', async () => {
    const supabase = createMockSupabase({ can_create_league: true })
    await canCreateLeague(supabase as never, USER_ID)

    expect(supabase.from).toHaveBeenCalledWith('users')
    expect(supabase.__chain.select).toHaveBeenCalledWith('can_create_league')
    expect(supabase.__chain.eq).toHaveBeenCalledWith('id', USER_ID)
    expect(supabase.__chain.single).toHaveBeenCalledTimes(1)
  })

  it('returns false (not truthy coercion) when can_create_league is a truthy non-true value', async () => {
    // Guards the strict `=== true` check against accidental truthiness bugs.
    const supabase = createMockSupabase({ can_create_league: 1 as unknown as boolean })
    await expect(canCreateLeague(supabase as never, USER_ID)).resolves.toBe(false)
  })
})
