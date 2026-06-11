// Points config mirrors the DB seed in points_config table
const PTS = {
  exact_score: 3,
  correct_winner: 1,
  home_goals_exact: 1,
  away_goals_exact: 1,
  first_team_to_score: 1,
  first_goal_scorer: 3,
}

export interface LiveMatchState {
  homeScore: number
  awayScore: number
  firstGoalTeamId: string | null   // null = no goals yet
  firstGoalScorerName: string | null
}

interface PredData {
  homeGoals: number
  awayGoals: number
  firstTeamToScoreId: string | null
  firstGoalScorer: string | null
}

export interface LivePointsBreakdown {
  total: number
  exactScore: number       // 3 or 0
  correctWinner: number    // 1 or 0
  homeGoalsExact: number   // 1 or 0
  awayGoalsExact: number   // 1 or 0
  firstTeamToScore: number // 1 or 0
  firstGoalScorer: number  // 3 or 0
}

export function calculateLivePoints(pred: PredData, match: LiveMatchState): LivePointsBreakdown {
  const { homeScore, awayScore } = match

  const exactScore = homeScore === pred.homeGoals && awayScore === pred.awayGoals ? PTS.exact_score : 0
  const actualDir = homeScore > awayScore ? 1 : awayScore > homeScore ? -1 : 0
  const predDir   = pred.homeGoals > pred.awayGoals ? 1 : pred.awayGoals > pred.homeGoals ? -1 : 0
  const correctWinner = exactScore === 0 && actualDir === predDir ? PTS.correct_winner : 0

  const homeGoalsExact = homeScore === pred.homeGoals ? PTS.home_goals_exact : 0
  const awayGoalsExact = awayScore === pred.awayGoals ? PTS.away_goals_exact : 0

  const firstTeamToScore =
    match.firstGoalTeamId !== null && pred.firstTeamToScoreId === match.firstGoalTeamId
      ? PTS.first_team_to_score
      : 0

  const firstGoalScorer =
    match.firstGoalScorerName &&
    pred.firstGoalScorer &&
    match.firstGoalScorerName.trim().toLowerCase() === pred.firstGoalScorer.trim().toLowerCase()
      ? PTS.first_goal_scorer
      : 0

  const total = exactScore + correctWinner + homeGoalsExact + awayGoalsExact + firstTeamToScore + firstGoalScorer

  return { total, exactScore, correctWinner, homeGoalsExact, awayGoalsExact, firstTeamToScore, firstGoalScorer }
}
