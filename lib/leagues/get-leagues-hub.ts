import type { SupabaseClient } from '@supabase/supabase-js'
import type { LeagueHubItem } from '@/lib/api/types'

interface LeagueRecord {
  id: string
  name: string
  access_type: 'open' | 'private'
  logo_url: string | null
  member_count: number
  created_by: string | null
}

interface MembershipRow {
  joined_at: string
  leagues: LeagueRecord | null
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
          member_count,
          created_by
        )
      `
      )
      .eq('user_id', userId),
    supabase
      .from('leagues')
      .select('id, name, access_type, logo_url, member_count, created_by')
      .eq('access_type', 'open'),
  ])

  if (membershipsResult.error) {
    throw new Error(`Failed to fetch memberships: ${membershipsResult.error.message}`)
  }

  if (publicLeaguesResult.error) {
    throw new Error(`Failed to fetch public leagues: ${publicLeaguesResult.error.message}`)
  }

  const memberLeagues: MemberLeague[] = (membershipsResult.data as unknown as MembershipRow[])
    .filter((row) => row.leagues !== null)
    .map((row) => {
      const league = row.leagues as LeagueRecord
      return {
        id: league.id,
        name: league.name,
        access_type: league.access_type,
        logo_url: league.logo_url,
        member_count: league.member_count,
        is_member: true,
        is_main: mainLeagueId ? league.id === mainLeagueId : false,
        owner_name: null,
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
      owner_name: null,
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
    owner_name: null,
  })

  const result: LeagueHubItem[] = [
    ...mainFromMembers.map(toHubItem),
    ...mainFromPublic,
    ...memberGroup.map(toHubItem),
    ...publicGroup,
  ]

  // Resolve league owner (created_by) display names in a single query.
  // RLS only exposes users you share a league with, so owners outside your
  // leagues resolve to null and the card simply omits the owner line.
  const createdByById = new Map<string, string | null>()
  for (const row of membershipsResult.data as unknown as MembershipRow[]) {
    if (row.leagues) createdByById.set(row.leagues.id, row.leagues.created_by)
  }
  for (const league of publicLeaguesResult.data as LeagueRecord[]) {
    createdByById.set(league.id, league.created_by)
  }

  const ownerIds = [...new Set([...createdByById.values()].filter((v): v is string => !!v))]
  if (ownerIds.length > 0) {
    const { data: owners } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', ownerIds)

    const ownerNameById = new Map<string, string>()
    for (const owner of (owners ?? []) as { id: string; full_name: string | null }[]) {
      if (owner.full_name) ownerNameById.set(owner.id, owner.full_name)
    }

    for (const item of result) {
      const createdBy = createdByById.get(item.id) ?? null
      item.owner_name = createdBy ? ownerNameById.get(createdBy) ?? null : null
    }
  }

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
