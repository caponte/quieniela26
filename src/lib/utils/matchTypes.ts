export interface Team {
  id: string
  name: string
  fifa_code: string
  flag_url: string | null
}

export interface MatchWithTeams {
  id: string
  match_date: string
  stage: string
  match_number: number
  group_name: string | null
  home_score: number | null
  away_score: number | null
  home_score_90: number | null
  away_score_90: number | null
  status: string
  fifa_match_id: string | null
  home_team: Team | null
  away_team: Team | null
}

export interface MatchPredictionRow {
  match_id: string
  home_goals: number
  away_goals: number
  first_team_to_score: string | null
  has_penalty: boolean
  first_goal_scorer: string | null
  first_goal_scorer_id: string | null
}

export interface GoalEvent {
  team_id: string
  player_name: string | null
  minute: number | null
  is_own_goal: boolean
  penalty_scored: boolean | null
  is_first_goal: boolean
}

export interface MatchResultEvents {
  firstGoalScorerName: string | null
  firstGoalTeamId: string | null
  hasPenalty: boolean
  goalEvents?: GoalEvent[]
  matchTime?: string | null
}

export interface PlayerRow {
  id: string
  name: string
  position: string | null
  jersey_number: number | null
  team_id: string
  fifa_player_id: string | null
  picture_url: string | null
}
