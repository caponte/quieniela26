import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import SyncPanel from "./SyncPanel"

async function checkApi(): Promise<boolean> {
  try {
    const res = await fetch(
      "https://api.football-data.org/v4/competitions/WC/matches?season=2026&limit=1",
      {
        headers: { "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY! },
        cache: "no-store",
      }
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

  const [apiOk, { count: total }, { count: mapped }] = await Promise.all([
    checkApi(),
    supabase.from("matches").select("*", { count: "exact", head: true }) as unknown as Promise<{ count: number }>,
    supabase.from("matches").select("*", { count: "exact", head: true }).not("api_fixture_id", "is", null) as unknown as Promise<{ count: number }>,
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
      />
    </div>
  )
}
