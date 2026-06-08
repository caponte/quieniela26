import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"

interface LeagueRow {
  league_id: string
  role: string
  leagues: { id: string; name: string; invite_code: string } | null
}

export default async function LeaguesOverviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: raw } = await supabase
    .from("league_members")
    .select("league_id, role, leagues(id, name, invite_code)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false }) as unknown as { data: LeagueRow[] | null }

  const memberships = (raw ?? []).filter((r) => r.leagues !== null)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Mis ligas</h1>
          <p className="text-(--color-muted) text-sm mt-1">Compite con tus amigos en ligas privadas.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/league/join"
            className="text-sm border border-(--color-border) hover:border-white/30 px-4 py-2 rounded-lg transition"
          >
            Unirse
          </Link>
          <Link
            href="/league/create"
            className="text-sm bg-(--color-accent) text-black font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition"
          >
            + Crear liga
          </Link>
        </div>
      </div>

      {memberships.length === 0 ? (
        <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-10 text-center">
          <p className="text-3xl mb-3">🏆</p>
          <p className="font-semibold mb-1">No perteneces a ninguna liga aún</p>
          <p className="text-(--color-muted) text-sm mb-6">
            Crea una liga y comparte el código con tus amigos, o únete con el código de alguien.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/league/create"
              className="text-sm bg-(--color-accent) text-black font-semibold px-5 py-2.5 rounded-lg hover:opacity-90 transition"
            >
              Crear liga
            </Link>
            <Link
              href="/league/join"
              className="text-sm border border-(--color-border) hover:border-white/30 px-5 py-2.5 rounded-lg transition"
            >
              Unirse con código
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {memberships.map((m) => {
            const league = m.leagues!
            return (
              <Link
                key={league.id}
                href={`/league/${league.id}`}
                className="flex items-center justify-between bg-(--color-surface) border border-(--color-border) rounded-xl px-4 py-4 hover:border-(--color-accent)/40 hover:bg-white/3 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center text-base">
                    🏆
                  </div>
                  <div>
                    <p className="font-semibold">{league.name}</p>
                    <p className="text-xs text-(--color-muted) mt-0.5">
                      {m.role === "owner" ? "Dueño · " : ""}Código: {league.invite_code}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-(--color-muted) group-hover:text-white transition">
                  Ver ranking →
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
