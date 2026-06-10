import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  JORNADA_INFO,
  getGroupRoundMatchIds,
  isValidJornadaSlug,
} from "@/lib/utils/jornada"
import type { JornadaSlug } from "@/lib/utils/jornada"
import MatchdayForm from "./MatchdayForm"
import type { MatchWithTeams, MatchPredictionRow, PlayerRow } from "@/lib/utils/matchTypes"
import { Breadcrumb } from "@/components/Breadcrumb"

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
  let rawMatches: MatchWithTeams[] | null = null

  if (info.isGroup) {
    const round = slug === "j1" ? 1 : slug === "j2" ? 2 : 3

    // Fetch all group matches to derive round membership by group
    const { data: allGroupMatches } = await supabase
      .from("matches")
      .select("id, match_date, group_name")
      .eq("stage", "group") as unknown as { data: { id: string; match_date: string; group_name: string | null }[] | null }

    const roundIds = getGroupRoundMatchIds(allGroupMatches ?? [], round as 1 | 2 | 3)
    const ids = Array.from(roundIds)

    if (ids.length === 0) {
      rawMatches = []
    } else {
      const { data } = await supabase
        .from("matches")
        .select(`
          id, match_date, stage, match_number, group_name, home_score, away_score, status,
          home_team:home_team_id ( id, name, fifa_code, flag_url ),
          away_team:away_team_id ( id, name, fifa_code, flag_url )
        `)
        .in("id", ids)
        .order("match_date", { ascending: true })
        .order("match_number", { ascending: true }) as unknown as { data: MatchWithTeams[] | null }
      rawMatches = data
    }
  } else {
    const { data } = await supabase
      .from("matches")
      .select(`
        id, match_date, stage, match_number, group_name, home_score, away_score, status,
        home_team:home_team_id ( id, name, fifa_code, flag_url ),
        away_team:away_team_id ( id, name, fifa_code, flag_url )
      `)
      .eq("stage", info.stage!)
      .order("match_date", { ascending: true })
      .order("match_number", { ascending: true }) as unknown as { data: MatchWithTeams[] | null }
    rawMatches = data
  }

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

  // Fetch players in chunks of 20 teams to stay well under Supabase's 1000-row default limit
  const teamIds = Array.from(
    new Set(rawMatches.flatMap((m) => [m.home_team?.id, m.away_team?.id].filter(Boolean) as string[]))
  )
  const CHUNK = 20
  const playerChunks = await Promise.all(
    Array.from({ length: Math.ceil(teamIds.length / CHUNK) }, (_, i) =>
      supabase
        .from("players")
        .select("id, name, position, jersey_number, team_id")
        .in("team_id", teamIds.slice(i * CHUNK, (i + 1) * CHUNK))
        .order("jersey_number", { ascending: true })
    )
  )
  const rawPlayers = playerChunks.flatMap((r) => (r as unknown as { data: PlayerRow[] | null }).data ?? [])

  const predictionsByMatchId = Object.fromEntries(
    (rawPredictions ?? []).map((p) => [p.match_id, p])
  )

  return (
    <>
      <div className="max-w-lg mx-auto px-4 pt-6">
        <Breadcrumb crumbs={[
          { label: "Inicio", href: "/dashboard" },
          { label: "Modo Jornada", href: "/predict/match" },
          { label: info.label },
        ]} />
      </div>
      <MatchdayForm
        slug={slug}
        label={info.label}
        matches={rawMatches}
        predictionsByMatchId={predictionsByMatchId}
        players={rawPlayers ?? []}
      />
    </>
  )
}
