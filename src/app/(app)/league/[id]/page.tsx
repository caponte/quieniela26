import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import LeagueActions from "./LeagueActions"

interface LeagueRow {
  id: string
  name: string
  invite_code: string
  created_by: string
}

interface MemberRow {
  user_id: string
  role: string
}

interface JornadaRow {
  user_id: string
  total_points: number
}

interface BracketRow {
  user_id: string
  total_points: number
}

interface UserRow {
  id: string
  name: string
  avatar_url: string | null
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function LeagueDetailPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // League info
  const { data: rawLeague } = await supabase
    .from("leagues")
    .select("id, name, invite_code, created_by")
    .eq("id", id)
    .maybeSingle() as unknown as { data: LeagueRow | null }

  if (!rawLeague) notFound()

  // Members
  const { data: rawMembers } = await supabase
    .from("league_members")
    .select("user_id, role")
    .eq("league_id", id) as unknown as { data: MemberRow[] | null }

  const members = rawMembers ?? []
  const memberIds = members.map((m) => m.user_id)

  // Check if current user is a member
  const myMembership = members.find((m) => m.user_id === user.id)
  if (!myMembership) notFound()

  const isOwner = myMembership.role === "owner"

  // Fetch in parallel: user profiles + jornada points + bracket points
  const [usersResult, jornadaResult, bracketResult] = await Promise.all([
    supabase
      .from("users")
      .select("id, name, avatar_url")
      .in("id", memberIds) as unknown as Promise<{ data: UserRow[] | null }>,

    memberIds.length > 0
      ? (supabase
          .from("leaderboard_jornada")
          .select("user_id, total_points")
          .is("league_id", null)
          .in("user_id", memberIds) as unknown as Promise<{ data: JornadaRow[] | null }>)
      : Promise.resolve({ data: [] as JornadaRow[] }),

    memberIds.length > 0
      ? (supabase
          .from("leaderboard_bracket")
          .select("user_id, total_points")
          .is("league_id", null)
          .in("user_id", memberIds) as unknown as Promise<{ data: BracketRow[] | null }>)
      : Promise.resolve({ data: [] as BracketRow[] }),
  ])

  const userMap = Object.fromEntries((usersResult.data ?? []).map((u) => [u.id, u]))
  const jornadaMap = Object.fromEntries((jornadaResult.data ?? []).map((r) => [r.user_id, r.total_points]))
  const bracketMap = Object.fromEntries((bracketResult.data ?? []).map((r) => [r.user_id, r.total_points]))

  const rows = members
    .map((m) => {
      const u = userMap[m.user_id]
      const jornada = jornadaMap[m.user_id] ?? 0
      const bracket = bracketMap[m.user_id] ?? 0
      return {
        userId: m.user_id,
        role: m.role,
        name: u?.name ?? "—",
        avatarUrl: u?.avatar_url ?? null,
        jornadaPts: jornada,
        bracketPts: bracket,
        totalPts: jornada + bracket,
      }
    })
    .sort((a, b) => b.totalPts - a.totalPts || b.jornadaPts - a.jornadaPts)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link href="/league" className="text-sm text-(--color-muted) hover:text-white transition flex items-center gap-1 mb-8">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Mis ligas
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">{rawLeague.name}</h1>
          <p className="text-(--color-muted) text-sm mt-1">
            {members.length} {members.length === 1 ? "participante" : "participantes"}
          </p>
        </div>
        <LeagueActions
          leagueId={rawLeague.id}
          inviteCode={rawLeague.invite_code}
          isOwner={isOwner}
          currentUserId={user.id}
        />
      </div>

      {/* Leaderboard */}
      <div className="bg-(--color-surface) border border-(--color-border) rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[2rem_1fr_5rem_5rem_5rem] gap-2 px-4 py-2 border-b border-(--color-border)">
          <span className="text-xs font-semibold uppercase tracking-widest text-(--color-muted)">#</span>
          <span className="text-xs font-semibold uppercase tracking-widest text-(--color-muted)">Jugador</span>
          <span className="text-xs font-semibold uppercase tracking-widest text-(--color-muted) text-right">Jornada</span>
          <span className="text-xs font-semibold uppercase tracking-widest text-(--color-muted) text-right">Bracket</span>
          <span className="text-xs font-semibold uppercase tracking-widest text-(--color-muted) text-right">Total</span>
        </div>

        {rows.map((row, i) => {
          const isMe = row.userId === user.id
          return (
            <div
              key={row.userId}
              className={`grid grid-cols-[2rem_1fr_5rem_5rem_5rem] gap-2 px-4 py-3 items-center border-b border-(--color-border)/50 last:border-0 ${
                isMe ? "bg-accent/5" : ""
              }`}
            >
              {/* Rank */}
              <span className={`text-sm font-bold tabular-nums ${
                i === 0 ? "text-yellow-400" : i === 1 ? "text-zinc-300" : i === 2 ? "text-amber-600" : "text-(--color-muted)"
              }`}>
                {i + 1}
              </span>

              {/* Player */}
              <div className="flex items-center gap-2 min-w-0">
                {row.avatarUrl ? (
                  <Image
                    src={row.avatarUrl}
                    alt={row.name}
                    width={28}
                    height={28}
                    className="rounded-full shrink-0 object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-white/10 shrink-0 flex items-center justify-center text-xs font-bold">
                    {row.name[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <span className={`text-sm truncate ${isMe ? "font-semibold text-(--color-accent)" : ""}`}>
                  {row.name}{isMe && " (tú)"}
                </span>
                {row.role === "owner" && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/8 text-(--color-muted) shrink-0">owner</span>
                )}
              </div>

              {/* Points */}
              <span className="text-sm tabular-nums text-right text-(--color-muted)">{row.jornadaPts}</span>
              <span className="text-sm tabular-nums text-right text-(--color-muted)">{row.bracketPts}</span>
              <span className={`text-sm tabular-nums text-right font-semibold ${isMe ? "text-(--color-accent)" : "text-white"}`}>
                {row.totalPts}
              </span>
            </div>
          )
        })}
      </div>

      {/* Owner: kick members */}
      {isOwner && members.length > 1 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-(--color-muted) mb-3">Gestionar miembros</h2>
          <div className="flex flex-col gap-2">
            {rows
              .filter((r) => r.userId !== user.id)
              .map((r) => (
                <div key={r.userId} className="flex items-center justify-between bg-(--color-surface) border border-(--color-border) rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    {r.avatarUrl ? (
                      <Image src={r.avatarUrl} alt={r.name} width={24} height={24} className="rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">
                        {r.name[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                    <span className="text-sm">{r.name}</span>
                  </div>
                  <LeagueActions
                    leagueId={rawLeague.id}
                    isOwner={isOwner}
                    currentUserId={user.id}
                    kickTargetId={r.userId}
                    kickTargetName={r.name}
                  />
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
