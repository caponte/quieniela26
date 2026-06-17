import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { formatMatchDate } from "@/lib/utils/date"
import type { MatchWithTeams, Team } from "@/lib/utils/matchTypes"
import type { EventType } from "@/lib/supabase/database.types"
import MatchAdminPanel from "./MatchAdminPanel"

export interface Player {
  id: string
  team_id: string
  name: string
  position: string
  jersey_number: number | null
}

export interface MatchEvent {
  id: string
  match_id: string
  type: EventType
  team_id: string
  player_name: string | null
  minute: number | null
  is_first_goal: boolean
  is_own_goal: boolean
  penalty_scored: boolean | null
  created_at: string
}

const STAGE_LABELS: Record<string, string> = {
  group: "Grupos",
  round_of_32: "Ronda 32",
  round_of_16: "Octavos",
  quarter_final: "Cuartos",
  semi_final: "Semifinal",
  third_place: "3er Lugar",
  final: "Final",
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminMatchPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/")

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single() as unknown as { data: { role: string } | null }

  if (profile?.role !== "admin") redirect("/dashboard")

  const { data: match } = await supabase
    .from("matches")
    .select("id, match_number, match_date, stage, group_name, home_score, away_score, status, home_team_id, away_team_id, fifa_match_id")
    .eq("id", id)
    .single() as unknown as { data: (MatchWithTeams & { home_team_id: string; away_team_id: string; fifa_match_id: string | null }) | null }

  if (!match) notFound()

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, fifa_code, flag_url")
    .in("id", [match.home_team_id, match.away_team_id]) as unknown as { data: Team[] | null }

  const teamsById = Object.fromEntries((teams ?? []).map(t => [t.id, t]))
  const homeTeam = teamsById[match.home_team_id] ?? null
  const awayTeam = teamsById[match.away_team_id] ?? null

  const { data: events } = await supabase
    .from("match_events")
    .select("*")
    .eq("match_id", id)
    .order("minute", { ascending: true }) as unknown as { data: MatchEvent[] | null }

  const { data: players } = await supabase
    .from("players")
    .select("id, team_id, name, position, jersey_number")
    .in("team_id", [match.home_team_id, match.away_team_id])
    .order("jersey_number", { ascending: true }) as unknown as { data: Player[] | null }

  const stageLabel = STAGE_LABELS[match.stage] ?? match.stage
  const groupSuffix = match.group_name ? ` — Grupo ${match.group_name}` : ""

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/admin" className="text-sm text-(--color-muted) hover:text-white transition-colors mb-6 inline-flex items-center gap-1">
        ← Volver al panel
      </Link>

      <div className="mt-4 mb-8">
        <div className="text-sm text-(--color-muted) mb-1">
          M{match.match_number} · {stageLabel}{groupSuffix} · {formatMatchDate(match.match_date)}
        </div>
        <h1 className="text-2xl font-bold">
          {homeTeam?.name ?? "?"} vs {awayTeam?.name ?? "?"}
        </h1>
      </div>

      <MatchAdminPanel
        match={{ ...match, home_team: homeTeam, away_team: awayTeam }}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        events={events ?? []}
        players={players ?? []}
        fifaMatchId={match.fifa_match_id}
      />
    </div>
  )
}
