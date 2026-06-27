import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { type TeamInfo } from "@/lib/utils/bracket"
import { type KnockoutPredictionData, isKnockoutLocked } from "@/lib/utils/knockout-bracket"
import { KnockoutBracketForm } from "./KnockoutBracketForm"

interface R32MatchRow {
  id: string
  match_number: number
  match_date: string
  home_team_id: string
  away_team_id: string
}

export default async function KnockoutBracketPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Load R32 matches (with team info)
  const { data: r32Raw } = await supabase
    .from("matches")
    .select("id, match_number, match_date, home_team_id, away_team_id")
    .eq("stage", "round_of_32")
    .order("match_number", { ascending: true }) as unknown as { data: R32MatchRow[] | null }

  const r32Matches = r32Raw ?? []
  const firstR32Date = r32Matches.length > 0 ? new Date(r32Matches[0].match_date) : null
  const locked = isKnockoutLocked(firstR32Date)

  // Load teams
  const { data: rawTeams } = await supabase
    .from("teams")
    .select("id, name, flag_url, fifa_code, group_name")
    .order("group_name")
    .order("name")

  const teams = (rawTeams ?? []) as TeamInfo[]
  const teamById = Object.fromEntries(teams.map(t => [t.id, t]))

  // Load user's existing knockout prediction
  let existing: KnockoutPredictionData | null = null
  const { data: kpRows } = await supabase
    .from("knockout_predictions")
    .select("picks")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1) as unknown as { data: { picks: unknown }[] | null }

  if (kpRows?.[0]?.picks) {
    existing = kpRows[0].picks as KnockoutPredictionData
  }

  return (
    <KnockoutBracketForm
      teams={teams}
      teamById={teamById}
      r32Matches={r32Matches}
      firstR32Date={firstR32Date?.toISOString() ?? null}
      existing={existing}
      locked={locked}
    />
  )
}
