import { describe, it, expectTypeOf } from 'vitest'
import type {
  LeagueHubItem,
  CopaCountdown,
  LeagueHubResponse,
  ApiSuccessResponse,
} from '@/lib/api/types'

describe('LeagueHubItem', () => {
  it('accepts a valid object with all required fields', () => {
    const item: LeagueHubItem = {
      id: 'abc',
      name: 'Test League',
      access_type: 'open',
      logo_url: null,
      member_count: 5,
      is_member: true,
      is_main: false,
      owner_name: null,
    }
    expectTypeOf(item).toMatchTypeOf<LeagueHubItem>()
  })

  it('rejects an object missing the is_member field', () => {
    // @ts-expect-error - is_member is required
    const item: LeagueHubItem = {
      id: 'abc',
      name: 'Test League',
      access_type: 'open',
      logo_url: null,
      member_count: 5,
      is_main: false,
    }
    void item
  })

  it('access_type is limited to open | private union', () => {
    expectTypeOf<LeagueHubItem['access_type']>().toEqualTypeOf<'open' | 'private'>()
  })
})

describe('CopaCountdown', () => {
  it('accepts { days: 0, isUnderway: true }', () => {
    const countdown: CopaCountdown = { days: 0, isUnderway: true }
    expectTypeOf(countdown).toMatchTypeOf<CopaCountdown>()
  })

  it('accepts { days: 19, isUnderway: false }', () => {
    const countdown: CopaCountdown = { days: 19, isUnderway: false }
    expectTypeOf(countdown).toMatchTypeOf<CopaCountdown>()
  })
})

describe('LeagueHubResponse', () => {
  it('is assignable to ApiSuccessResponse wrapping the hub data shape', () => {
    type ExpectedData = {
      leagues: LeagueHubItem[]
      user: { first_name: string }
      countdown: CopaCountdown
    }
    expectTypeOf<LeagueHubResponse>().toMatchTypeOf<ApiSuccessResponse<ExpectedData>>()
  })

  it('data.leagues is LeagueHubItem[]', () => {
    expectTypeOf<LeagueHubResponse['data']['leagues']>().toEqualTypeOf<LeagueHubItem[]>()
  })

  it('data.user has first_name string field', () => {
    expectTypeOf<LeagueHubResponse['data']['user']>().toMatchTypeOf<{ first_name: string }>()
  })

  it('data.countdown is CopaCountdown', () => {
    expectTypeOf<LeagueHubResponse['data']['countdown']>().toEqualTypeOf<CopaCountdown>()
  })
})
