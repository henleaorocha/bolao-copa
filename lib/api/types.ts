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

export interface AuthMeResponse {
  user: AuthUser
  league: LeagueContext
}
