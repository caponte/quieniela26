import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  JORNADA_INFO,
  JORNADA_DATE_BOUNDS,
  isValidJornadaSlug,
} from "@/lib/utils/jornada"
import type { JornadaSlug } from "@/lib/utils/jornada"
import MatchdayForm from "./MatchdayForm"
import type { MatchWithTeams, MatchPredictionRow, PlayerRow } from "@/lib/utils/matchTypes"

interface Props {
  params: Promise<{ jornada: string }>
}

export default async function JornadaPage({ params }: Props) {
  const { jornada } = await params
  if (!isValidJornadaSlug(jornada)) notFound()

  const slug = jornada as JornadaSlug
  const info = JORNADA_INFO[slug]

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Build query for this jornada's matches
  let query = supabase
    .from("matches")
    .select(`
      id, match_date, stage, match_number, group_name, home_score, away_score, status,
      home_team:home_team_id ( id, name, fifa_code, flag_url ),
      away_team:away_team_id ( id, name, fifa_code, flag_url )
    `)
    .order("match_date", { ascending: true })
    .order("match_number", { ascending: true })

  if (info.isGroup) {
    const bounds = JORNADA_DATE_BOUNDS[slug as "j1" | "j2" | "j3"]
    query = query.eq("stage", "group")
    if (bounds.from) query = query.gte("match_date", bounds.from.toISOString())
    if (bounds.to) query = query.lt("match_date", bounds.to.toISOString())
  } else {
    query = query.eq("stage", info.stage!)
  }

  const { data: rawMatches } = await query as unknown as { data: MatchWithTeams[] | null }

  if (!rawMatches || rawMatches.length === 0) {
    return (
      <div className="text-center py-20 text-(--color-muted)">
        <p className="text-4xl mb-4">⏳</p>
        <p className="text-lg font-semibold">Sin partidos todavía</p>
        <p className="text-sm mt-1">Los partidos de {info.label} aún no están programados.</p>
      </div>
    )
  }

  // Fetch existing predictions for these match IDs
  const matchIds = rawMatches.map((m) => m.id)
  const { data: rawPredictions } = await supabase
    .from("match_predictions")
    .select("match_id, home_goals, away_goals, first_team_to_score, has_penalty, first_goal_scorer, first_goal_scorer_id")
    .eq("user_id", user.id)
    .is("league_id", null)
    .in("match_id", matchIds) as unknown as { data: MatchPredictionRow[] | null }

  // Fetch players for all teams involved
  const teamIds = Array.from(
    new Set(rawMatches.flatMap((m) => [m.home_team?.id, m.away_team?.id].filter(Boolean) as string[]))
  )
  const { data: rawPlayers } = await supabase
    .from("players")
    .select("id, name, position, jersey_number, team_id")
    .in("team_id", teamIds)
    .order("jersey_number", { ascending: true }) as unknown as { data: PlayerRow[] | null }

  const predictionsByMatchId = Object.fromEntries(
    (rawPredictions ?? []).map((p) => [p.match_id, p])
  )

  return (
    <MatchdayForm
      slug={slug}
      label={info.label}
      matches={rawMatches}
      predictionsByMatchId={predictionsByMatchId}
      players={rawPlayers ?? []}
    />
  )
}
