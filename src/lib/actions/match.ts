"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { isMatchLocked } from "@/lib/utils/jornada"

export interface MatchPredictionInput {
  matchId: string
  homeGoals: number
  awayGoals: number
  firstTeamToScore: string | null  // team uuid or null (no score)
  hasPenalty: boolean
  firstGoalScorerName: string | null
  firstGoalScorerId: string | null
  jornadaSlug: string
}

export async function saveMatchPrediction(input: MatchPredictionInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado." }

  // Fetch match to check lock
  const { data: match } = await supabase
    .from("matches")
    .select("match_date, status")
    .eq("id", input.matchId)
    .single() as unknown as { data: { match_date: string; status: string } | null }

  if (!match) return { error: "Partido no encontrado." }
  if (match.status === "live" || match.status === "finished" || match.status === "postponed") {
    return { error: "Este partido ya está bloqueado." }
  }
  if (isMatchLocked(new Date(match.match_date))) {
    return { error: "Este partido ya está bloqueado." }
  }

  // Upsert prediction (unique on user_id, match_id, league_id)
  const { error } = await (supabase
    .from("match_predictions")
    .upsert as unknown as (v: unknown, opts: unknown) => Promise<{ error: { message: string } | null }>)(
    {
      user_id: user.id,
      match_id: input.matchId,
      league_id: null,
      home_goals: input.homeGoals,
      away_goals: input.awayGoals,
      first_team_to_score: input.firstTeamToScore,
      has_penalty: input.hasPenalty,
      first_goal_scorer: input.firstGoalScorerName,
      first_goal_scorer_id: input.firstGoalScorerId,
    },
    { onConflict: "user_id,match_id,league_id" }
  )

  if (error) return { error: error.message }

  revalidatePath(`/predict/match/${input.jornadaSlug}`)
  return { success: true }
}
