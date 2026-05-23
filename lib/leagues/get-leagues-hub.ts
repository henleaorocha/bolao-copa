import type { SupabaseClient } from '@supabase/supabase-js'
import type { LeagueHubItem } from '@/lib/api/types'

interface LeagueRecord {
  id: string
  name: string
  access_type: 'open' | 'private'
  logo_url: string | null
  member_count: number
}

interface MembershipRow {
  joined_at: string
  leagues: LeagueRecord[]
}

type MemberLeague = LeagueHubItem & { joined_at: string }

export async function getLeaguesHub(
  supabase: SupabaseClient,
  userId: string
): Promise<LeagueHubItem[]> {
  const mainLeagueId = process.env.MAIN_LEAGUE_ID

  if (!mainLeagueId) {
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: 'MAIN_LEAGUE_ID env var is not set — is_main will be false for all leagues',
      })
    )
  }

  const [membershipsResult, publicLeaguesResult] = await Promise.all([
    supabase
      .from('league_members')
      .select(
        `
        joined_at,
        leagues (
          id,
          name,
          access_type,
          logo_url,
          member_count
        )
      `
      )
      .eq('user_id', userId),
    supabase
      .from('leagues')
      .select('id, name, access_type, logo_url, member_count')
      .eq('access_type', 'open'),
  ])

  if (membershipsResult.error) {
    throw new Error(`Failed to fetch memberships: ${membershipsResult.error.message}`)
  }

  if (publicLeaguesResult.error) {
    throw new Error(`Failed to fetch public leagues: ${publicLeaguesResult.error.message}`)
  }

  const memberLeagues: MemberLeague[] = (membershipsResult.data as MembershipRow[])
    .filter((row) => row.leagues && row.leagues.length > 0)
    .map((row) => {
      const league = row.leagues[0]
      return {
        id: league.id,
        name: league.name,
        access_type: league.access_type,
        logo_url: league.logo_url,
        member_count: league.member_count,
        is_member: true,
        is_main: mainLeagueId ? league.id === mainLeagueId : false,
        joined_at: row.joined_at,
      }
    })

  const memberLeagueIds = new Set(memberLeagues.map((l) => l.id))

  const publicNonMemberLeagues: LeagueHubItem[] = (publicLeaguesResult.data as LeagueRecord[])
    .filter((league) => !memberLeagueIds.has(league.id))
    .map((league) => ({
      id: league.id,
      name: league.name,
      access_type: league.access_type,
      logo_url: league.logo_url,
      member_count: league.member_count,
      is_member: false,
      is_main: mainLeagueId ? league.id === mainLeagueId : false,
    }))

  // Group 1: main league (may come from member or public source)
  const mainFromMembers = memberLeagues.filter((l) => l.is_main)
  const mainFromPublic = publicNonMemberLeagues.filter((l) => l.is_main)

  // Group 2: member leagues that are not the main league, sorted by joined_at DESC
  // Public leagues the user has joined also go here (not in group 3) to prevent duplication.
  const memberGroup = memberLeagues
    .filter((l) => !l.is_main)
    .sort((a, b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime())

  // Group 3: public non-member leagues that are not the main league, sorted by member_count DESC
  const publicGroup = publicNonMemberLeagues
    .filter((l) => !l.is_main)
    .sort((a, b) => b.member_count - a.member_count)

  const toHubItem = (league: MemberLeague): LeagueHubItem => ({
    id: league.id,
    name: league.name,
    access_type: league.access_type,
    logo_url: league.logo_url,
    member_count: league.member_count,
    is_member: league.is_member,
    is_main: league.is_main,
  })

  const result: LeagueHubItem[] = [
    ...mainFromMembers.map(toHubItem),
    ...mainFromPublic,
    ...memberGroup.map(toHubItem),
    ...publicGroup,
  ]

  if (result.length === 0) {
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: 'getLeaguesHub returned zero leagues',
        user_id: userId,
      })
    )
  }

  return result
}
