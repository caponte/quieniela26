import { createClient } from "@/lib/supabase/server"
import { BRACKET_LOCK_TIME, type BracketPredictionData, type TeamInfo } from "@/lib/utils/bracket"
import { BracketForm } from "./BracketForm"

export default async function BracketPredictPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rawTeams } = await supabase
    .from("teams")
    .select("id, name, flag_url, fifa_code, group_name")
    .order("group_name")
    .order("name")

  const teams = (rawTeams ?? []) as TeamInfo[]

  let existing: BracketPredictionData | null = null
  if (user) {
    const { data: rows } = await supabase
      .from("bracket_predictions")
      .select("predictions")
      .eq("user_id", user.id)
      .is("league_id", null)
      .order("updated_at", { ascending: false })
      .limit(1) as unknown as { data: { predictions: unknown }[] | null }
    const row = rows?.[0]
    if (row?.predictions) {
      existing = row.predictions as BracketPredictionData
    }
  }

  const locked = Date.now() >= BRACKET_LOCK_TIME.getTime()

  return <BracketForm teams={teams} existing={existing} locked={locked} />
}
