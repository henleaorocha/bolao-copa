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
  can_create_league: boolean
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

export interface ChampionBet {
  id: string
  user_id: string
  league_id: string
  champion_team: string
  runner_up_team: string
  created_at: string
  updated_at: string
}

export interface UserStats {
  position: number
  points: number
  exact_scores: number
}

export interface RankingEntry {
  user_id: string
  full_name: string | null
  avatar_color: string
  points: number
  position: number
}

export interface RankingFullEntry {
  user_id: string
  full_name: string | null
  avatar_color: string
  points: number
  position: number
  exact_scores: number
  correct_outcomes: number
  champion_team: string | null
  runner_up_team: string | null
}

export interface LeagueDetail extends LeagueSummary {
  description: string | null
  created_by: string
  created_at: string
  invite_token: string
  user_onboarded_at: string | null
  members: LeagueMember[]
  has_champion_bet: boolean
  champion_bet: ChampionBet | null
  prizes: string | null
  user_stats: UserStats
  // Tournament-wide count of finished matches (group + knockout), out of
  // TOTAL_MATCH_COUNT (104). Identical for every league member.
  matches_played: number
  ranking: RankingEntry[]
}

export interface AuthMeResponse {
  user: AuthUser
  // `null` when the caller has no active league — a valid state since new
  // users are no longer auto-enrolled into any league (ADR-005).
  league: LeagueSummary | null
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
  owner_name: string | null
}

export type LeagueHubResponse = ApiSuccessResponse<{
  leagues: LeagueHubItem[]
  user: { first_name: string }
  countdown: CopaCountdown
}>

export interface Match {
  id: string
  external_id: string | null
  home_team: string
  away_team: string
  home_flag: string | null
  away_flag: string | null
  match_date: string
  phase: 'group' | '32nd' | '16th' | '8th' | '4th' | 'semi' | '3rd_place' | 'final'
  group: string | null
  status: 'scheduled' | 'live' | 'finished'
  home_score: number | null
  away_score: number | null
  venue: string | null
  city: string | null
}

export interface Prediction {
  id: string
  match_id: string
  predicted_home_score: number
  predicted_away_score: number
  updated_at: string
}

export interface MatchWithPrediction extends Match {
  prediction: Pick<Prediction, 'predicted_home_score' | 'predicted_away_score'> | null
  is_deadline_passed: boolean
}

export interface OutcomeDistribution {
  home_win: number
  draw: number
  away_win: number
  total_predictions: number
}

export interface MatchDetail extends MatchWithPrediction {
  distribution: OutcomeDistribution | null
}

// One row per league member in the "palpites dos jogadores" modal. Revealed
// once the betting deadline has passed (picks are locked by then); `points`
// stays null until the match is finished and a result is published.
export interface MatchPlayerPrediction {
  user_id: string
  full_name: string | null
  avatar_color: string
  predicted_home_score: number | null
  predicted_away_score: number | null
  points: number | null
  is_exact: boolean
  is_current_user: boolean
}

export interface MatchPlayerPredictions {
  is_deadline_passed: boolean
  is_finished: boolean
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  players: MatchPlayerPrediction[]
}
