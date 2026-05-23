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
  members: LeagueMember[]
}

export interface AuthMeResponse {
  user: AuthUser
  league: LeagueSummary
}
