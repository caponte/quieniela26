import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import SyncPanel from "./SyncPanel"

export interface SyncLog {
  id: string
  triggered_at: string
  source: string
  synced: number | null
  total: number | null
  errors: string[] | null
  payload: object | null
}

async function checkApi(): Promise<boolean> {
  try {
    const res = await fetch(
      "https://api.fifa.com/api/v3/calendar/matches?idCompetition=17&idSeason=285023&count=1&language=en",
      { cache: "no-store" }
    )
    return res.ok
  } catch {
    return false
  }
}

export default async function SyncStatusPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/")

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single() as unknown as { data: { role: string } | null }

  if (profile?.role !== "admin") redirect("/dashboard")

  const [apiOk, { count: total }, { count: mapped }, { data: logs }] = await Promise.all([
    checkApi(),
    supabase.from("matches").select("*", { count: "exact", head: true }) as unknown as Promise<{ count: number }>,
    supabase.from("matches").select("*", { count: "exact", head: true }).not("fifa_match_id", "is", null) as unknown as Promise<{ count: number }>,
    supabase.from("sync_logs").select("id, triggered_at, source, synced, total, errors, payload").order("triggered_at", { ascending: false }).limit(50) as unknown as Promise<{ data: SyncLog[] | null }>,
  ])

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/admin" className="text-sm text-(--color-muted) hover:text-white transition-colors mb-6 inline-flex items-center gap-1">
        ← Volver al panel
      </Link>

      <div className="mt-4 mb-8">
        <h1 className="text-2xl font-bold">Estado del sync</h1>
        <p className="text-(--color-muted) text-sm mt-1">
          Conexión a la API y estado de la sincronización automática
        </p>
      </div>

      <SyncPanel
        initialApiOk={apiOk}
        mapped={mapped ?? 0}
        total={total ?? 0}
        logs={logs ?? []}
      />
    </div>
  )
}
