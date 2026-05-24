import type { CopaCountdown } from '@/lib/leagues/get-days-until-copa'

export type { CopaCountdown }

export type ApiSuccessResponse<T> = {
  status: 'success'
  data: T
  timestamp: string
}

export type ApiErrorResponse = {
  status: 'error'
  error: string
  code: string
  statusCode: number
  timestamp: string
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

export interface AuthUser {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  avatar_color: string
  created_at: string
}

export interface LeagueContext {
  id: string
  name: string
  access_type: 'open' | 'private'
  logo_url: string | null
  role: 'member' | 'admin'
}

export interface LeagueSummary {
  id: string
  name: string
  access_type: 'open' | 'private'
  logo_url: string | null
  role: 'admin' | 'member'
  member_count: number
}

export interface LeagueMember {
  user_id: string
  full_name: string | null
  avatar_url: string | null
  avatar_color: string
  role: 'admin' | 'member'
  joined_at: string
}

export interface LeagueDetail extends LeagueSummary {
  description: string | null
  created_by: string
  created_at: string
  invite_token: string
  user_onboarded_at: string | null
  members: LeagueMember[]
}

export interface AuthMeResponse {
  user: AuthUser
  league: LeagueSummary
}

export interface LeagueMemberWithLeague {
  league_id: string
  joined_at: string
  role: 'admin' | 'member'
  leagues: {
    id: string
    name: string
    access_type: 'open' | 'private'
    logo_url: string | null
    member_count: number
  } | null
}

export interface LeagueHubItem {
  id: string
  name: string
  access_type: 'open' | 'private'
  logo_url: string | null
  member_count: number
  is_member: boolean
  is_main: boolean
}

export type LeagueHubResponse = ApiSuccessResponse<{
  leagues: LeagueHubItem[]
  user: { first_name: string }
  countdown: CopaCountdown
}>
