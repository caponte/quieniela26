import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import AdminMatchList from "./AdminMatchList"
import type { MatchWithTeams } from "@/lib/utils/matchTypes"

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/")

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single() as unknown as { data: { role: string } | null }

  if (profile?.role !== "admin") redirect("/dashboard")

  const { data: matches } = await supabase
    .from("matches")
    .select("id, match_number, match_date, stage, group_name, home_score, away_score, status, home_team_id, away_team_id")
    .order("match_date", { ascending: true }) as unknown as { data: (MatchWithTeams & { home_team_id: string; away_team_id: string })[] | null }

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, fifa_code, flag_url") as unknown as { data: { id: string; name: string; fifa_code: string; flag_url: string | null }[] | null }

  const teamsById = Object.fromEntries((teams ?? []).map(t => [t.id, t]))

  const enriched: MatchWithTeams[] = (matches ?? []).map(m => ({
    ...m,
    home_team: teamsById[m.home_team_id] ?? null,
    away_team: teamsById[m.away_team_id] ?? null,
  }))

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Panel Admin</h1>
          <p className="text-(--color-muted) text-sm mt-1">Administra resultados y eventos de los partidos</p>
        </div>
        <a
          href="/admin/status"
          className="text-sm px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          Estado del sync
        </a>
      </div>
      <AdminMatchList matches={enriched} />
    </div>
  )
}
