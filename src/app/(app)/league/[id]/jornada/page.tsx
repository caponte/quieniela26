import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Breadcrumb } from "@/components/Breadcrumb"

interface Props {
  params: Promise<{ id: string }>
}

interface LeagueRow { id: string; name: string }
interface MemberRow { user_id: string }
interface UserRow { id: string; name: string; avatar_url: string | null }
interface JornadaRow { user_id: string; total_points: number }

export default async function LeagueJornadaPage({ params }: Props) {
  const { id: leagueId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: league } = await supabase
    .from("leagues")
    .select("id, name")
    .eq("id", leagueId)
    .maybeSingle() as unknown as { data: LeagueRow | null }

  if (!league) notFound()

  const { data: rawMembers } = await supabase
    .from("league_members")
    .select("user_id")
    .eq("league_id", leagueId) as unknown as { data: MemberRow[] | null }

  const members = rawMembers ?? []
  const memberIds = members.map((m) => m.user_id)

  const myMembership = members.find((m) => m.user_id === user.id)
  if (!myMembership) notFound()

  const [usersResult, jornadaResult] = await Promise.all([
    supabase
      .from("users")
      .select("id, name, avatar_url")
      .in("id", memberIds) as unknown as Promise<{ data: UserRow[] | null }>,

    memberIds.length > 0
      ? (supabase
          .from("leaderboard_jornada")
          .select("user_id, total_points")
          .in("user_id", memberIds) as unknown as Promise<{ data: JornadaRow[] | null }>)
      : Promise.resolve({ data: [] as JornadaRow[] }),
  ])

  const userMap = Object.fromEntries((usersResult.data ?? []).map((u) => [u.id, u]))
  const jornadaMap = (jornadaResult.data ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.user_id] = (acc[r.user_id] ?? 0) + r.total_points
    return acc
  }, {})

  const rows = members
    .map((m) => {
      const u = userMap[m.user_id]
      return {
        userId: m.user_id,
        name: u?.name ?? "—",
        avatarUrl: u?.avatar_url ?? null,
        jornadaPts: jornadaMap[m.user_id] ?? 0,
        isMe: m.user_id === user.id,
      }
    })
    .sort((a, b) => b.jornadaPts - a.jornadaPts)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Breadcrumb crumbs={[
        { label: "Inicio", href: "/dashboard" },
        { label: "Mis ligas", href: "/league" },
        { label: league.name, href: `/league/${leagueId}` },
        { label: "Jornada" },
      ]} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Jornada</h1>
        <p className="text-(--color-muted) text-sm mt-1">{league.name} · {rows.length} participantes</p>
      </div>

      <div className="bg-(--color-surface) border border-(--color-border) rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1.5rem_1fr_3rem_1.5rem] gap-2 px-4 py-2.5 border-b border-(--color-border)">
          <span />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">Jugador</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted) text-right">Pts</span>
          <span />
        </div>

        {rows.map((row, i) => (
          <Link
            key={row.userId}
            href={`/league/${leagueId}/jornada/${row.userId}`}
            className={`grid grid-cols-[1.5rem_1fr_3rem_1.5rem] gap-2 px-4 py-3 items-center border-b border-(--color-border)/50 last:border-0 hover:bg-white/5 transition-colors ${row.isMe ? "bg-(--color-accent)/5" : ""}`}
          >
            <span className={`text-xs font-bold tabular-nums ${i === 0 ? "text-yellow-400" : i === 1 ? "text-zinc-300" : i === 2 ? "text-amber-600" : "text-(--color-muted)"}`}>
              {i + 1}
            </span>
            <div className="flex items-center gap-2 min-w-0">
              {row.avatarUrl ? (
                <Image src={row.avatarUrl} alt={row.name} width={24} height={24} className="w-6 h-6 rounded-full shrink-0 object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-white/10 shrink-0 flex items-center justify-center text-[10px] font-bold">
                  {row.name[0]?.toUpperCase() ?? "?"}
                </div>
              )}
              <span className={`text-sm truncate ${row.isMe ? "font-semibold text-(--color-accent)" : ""}`}>
                {row.name}
              </span>
            </div>
            <span className={`text-sm tabular-nums text-right font-semibold ${row.isMe ? "text-(--color-accent)" : "text-white"}`}>
              {row.jornadaPts}
            </span>
            <span className="text-(--color-muted) text-xs text-right">›</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
