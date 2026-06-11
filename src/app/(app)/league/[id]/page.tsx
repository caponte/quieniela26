import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import LeagueActions from "./LeagueActions"
import { Breadcrumb } from "@/components/Breadcrumb"
import { BRACKET_LOCK_TIME } from "@/lib/utils/bracket"

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

interface TodayMatch {
  id: string
  match_number: number
  stage: string
  group_name: string | null
  match_date: string
  home_team: { name: string; fifa_code: string } | null
  away_team: { name: string; fifa_code: string } | null
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function LeagueDetailPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const isBracketLocked = Date.now() >= BRACKET_LOCK_TIME.getTime()

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

  const myMembership = members.find((m) => m.user_id === user.id)
  if (!myMembership) notFound()

  const isOwner = myMembership.role === "owner"

  // Today's date bounds (UTC)
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const todayEnd = new Date(todayStart)
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1)

  // Parallel: leaderboard data + bracket status + today's matches
  const [usersResult, jornadaResult, bracketResult, bracketPredsResult, todayMatchesResult] = await Promise.all([
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

    memberIds.length > 0
      ? (supabase
          .from("bracket_predictions")
          .select("user_id")
          .in("user_id", memberIds) as unknown as Promise<{ data: { user_id: string }[] | null }>)
      : Promise.resolve({ data: [] as { user_id: string }[] }),

    supabase
      .from("matches")
      .select(`id, match_number, stage, group_name, match_date,
        home_team:teams!matches_home_team_id_fkey(name, fifa_code),
        away_team:teams!matches_away_team_id_fkey(name, fifa_code)`)
      .gte("match_date", todayStart.toISOString())
      .lt("match_date", todayEnd.toISOString())
      .not("status", "eq", "finished")
      .order("match_date") as unknown as Promise<{ data: TodayMatch[] | null }>,
  ])

  const userMap = Object.fromEntries((usersResult.data ?? []).map((u) => [u.id, u]))
  const jornadaMap = Object.fromEntries((jornadaResult.data ?? []).map((r) => [r.user_id, r.total_points]))
  const bracketMap = Object.fromEntries((bracketResult.data ?? []).map((r) => [r.user_id, r.total_points]))
  const bracketPredictors = new Set((bracketPredsResult.data ?? []).map((r) => r.user_id))
  const todayMatches = todayMatchesResult.data ?? []
  const todayMatchIds = todayMatches.map((m) => m.id)

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
        hasBracket: bracketPredictors.has(m.user_id),
      }
    })

  const rowsByTotal   = [...rows].sort((a, b) => b.totalPts   - a.totalPts   || b.jornadaPts - a.jornadaPts)
  const rowsByJornada = [...rows].sort((a, b) => b.jornadaPts - a.jornadaPts || b.totalPts   - a.totalPts)
  const rowsByBracket = [...rows].sort((a, b) => b.bracketPts - a.bracketPts || b.totalPts   - a.totalPts)

  // Today's match predictions per member
  let todayPredByMatch: Record<string, Set<string>> = {}
  if (todayMatchIds.length > 0 && memberIds.length > 0) {
    const { data: todayPreds } = await supabase
      .from("match_predictions")
      .select("match_id, user_id")
      .in("match_id", todayMatchIds)
      .in("user_id", memberIds) as unknown as { data: { match_id: string; user_id: string }[] | null }

    for (const p of todayPreds ?? []) {
      if (!todayPredByMatch[p.match_id]) todayPredByMatch[p.match_id] = new Set()
      todayPredByMatch[p.match_id].add(p.user_id)
    }
  }

  // Members missing bracket
  const missingBracket = rows.filter((r) => !r.hasBracket)
  // Members who submitted bracket
  const hasBracketCount = rows.filter((r) => r.hasBracket).length

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Breadcrumb crumbs={[
        { label: "Inicio", href: "/dashboard" },
        { label: "Mis ligas", href: "/league" },
        { label: rawLeague.name },
      ]} />

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

      {/* Leaderboard — 3 tablas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

        {/* Jornada */}
        <div className="bg-(--color-surface) border border-(--color-border) rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1.25rem_1fr_2.5rem] gap-1 px-3 py-2 border-b border-(--color-border)">
            <span />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">Jornada</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted) text-right">Pts</span>
          </div>
          {rowsByJornada.map((row, i) => {
            const isMe = row.userId === user.id
            return (
              <div key={row.userId} className={`grid grid-cols-[1.25rem_1fr_2.5rem] gap-1 px-3 py-2.5 items-center border-b border-(--color-border)/50 last:border-0 ${isMe ? "bg-(--color-accent)/5" : ""}`}>
                <span className={`text-xs font-bold tabular-nums ${i === 0 ? "text-yellow-400" : i === 1 ? "text-zinc-300" : i === 2 ? "text-amber-600" : "text-(--color-muted)"}`}>{i + 1}</span>
                <div className="flex items-center gap-1.5 min-w-0">
                  {row.avatarUrl ? (
                    <Image src={row.avatarUrl} alt={row.name} width={20} height={20} className="w-5 h-5 rounded-full shrink-0 object-cover" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-white/10 shrink-0 flex items-center justify-center text-[9px] font-bold">{row.name[0]?.toUpperCase() ?? "?"}</div>
                  )}
                  <span className={`text-xs truncate ${isMe ? "font-semibold text-(--color-accent)" : ""}`}>{row.name}</span>
                </div>
                <span className={`text-xs tabular-nums text-right font-semibold ${isMe ? "text-(--color-accent)" : "text-white"}`}>{row.jornadaPts}</span>
              </div>
            )
          })}
        </div>

        {/* Bracket */}
        <div className="bg-(--color-surface) border border-(--color-border) rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1.25rem_1fr_2.5rem] gap-1 px-3 py-2 border-b border-(--color-border)">
            <span />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">Bracket</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted) text-right">Pts</span>
          </div>
          {rowsByBracket.map((row, i) => {
            const isMe = row.userId === user.id
            return (
              <div key={row.userId} className={`grid grid-cols-[1.25rem_1fr_2.5rem] gap-1 px-3 py-2.5 items-center border-b border-(--color-border)/50 last:border-0 ${isMe ? "bg-(--color-accent)/5" : ""}`}>
                <span className={`text-xs font-bold tabular-nums ${i === 0 ? "text-yellow-400" : i === 1 ? "text-zinc-300" : i === 2 ? "text-amber-600" : "text-(--color-muted)"}`}>{i + 1}</span>
                <div className="flex items-center gap-1.5 min-w-0">
                  {row.avatarUrl ? (
                    <Image src={row.avatarUrl} alt={row.name} width={20} height={20} className="w-5 h-5 rounded-full shrink-0 object-cover" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-white/10 shrink-0 flex items-center justify-center text-[9px] font-bold">{row.name[0]?.toUpperCase() ?? "?"}</div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className={`text-xs truncate ${isMe ? "font-semibold text-(--color-accent)" : ""}`}>{row.name}</span>
                    {isBracketLocked && (
                      <Link href={`/league/${rawLeague.id}/bracket/${row.userId}`} className="text-[9px] text-(--color-muted) hover:text-white underline-offset-2 hover:underline transition-colors leading-tight">
                        ver bracket
                      </Link>
                    )}
                  </div>
                </div>
                <span className={`text-xs tabular-nums text-right font-semibold ${isMe ? "text-(--color-accent)" : "text-white"}`}>{row.bracketPts}</span>
              </div>
            )
          })}
        </div>

        {/* Total */}
        <div className="bg-(--color-surface) border border-(--color-border) rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1.25rem_1fr_2.5rem] gap-1 px-3 py-2 border-b border-(--color-border)">
            <span />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">Total</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted) text-right">Pts</span>
          </div>
          {rowsByTotal.map((row, i) => {
            const isMe = row.userId === user.id
            return (
              <div key={row.userId} className={`grid grid-cols-[1.25rem_1fr_2.5rem] gap-1 px-3 py-2.5 items-center border-b border-(--color-border)/50 last:border-0 ${isMe ? "bg-(--color-accent)/5" : ""}`}>
                <span className={`text-xs font-bold tabular-nums ${i === 0 ? "text-yellow-400" : i === 1 ? "text-zinc-300" : i === 2 ? "text-amber-600" : "text-(--color-muted)"}`}>{i + 1}</span>
                <div className="flex items-center gap-1.5 min-w-0">
                  {row.avatarUrl ? (
                    <Image src={row.avatarUrl} alt={row.name} width={20} height={20} className="w-5 h-5 rounded-full shrink-0 object-cover" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-white/10 shrink-0 flex items-center justify-center text-[9px] font-bold">{row.name[0]?.toUpperCase() ?? "?"}</div>
                  )}
                  <span className={`text-xs truncate ${isMe ? "font-semibold text-(--color-accent)" : ""}`}>{row.name}</span>
                </div>
                <span className={`text-xs tabular-nums text-right font-semibold ${isMe ? "text-(--color-accent)" : "text-white"}`}>{row.totalPts}</span>
              </div>
            )
          })}
        </div>

      </div>

      {/* Pendientes section */}
      <div className="mt-8 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-(--color-muted)">Pendientes</h2>

        {/* Bracket status */}
        <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Bracket</span>
            <span className={`text-xs font-semibold tabular-nums ${
              hasBracketCount === members.length ? "text-emerald-400" : "text-amber-400"
            }`}>
              {hasBracketCount}/{members.length} enviados
            </span>
          </div>
          {missingBracket.length === 0 ? (
            <p className="text-xs text-emerald-400">Todos han enviado su bracket.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {missingBracket.map((r) => (
                <div key={r.userId} className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2.5 py-1.5">
                  {r.avatarUrl ? (
                    <Image src={r.avatarUrl} alt={r.name} width={18} height={18} className="rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-white/10 shrink-0 flex items-center justify-center text-[9px] font-bold">
                      {r.name[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <span className="text-xs text-(--color-muted)">{r.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's match predictions */}
        {todayMatches.length > 0 ? (
          <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-4 space-y-3">
            <span className="text-sm font-medium">Partidos de hoy</span>
            {todayMatches.map((match) => {
              const predicted = todayPredByMatch[match.id] ?? new Set<string>()
              const missing = rowsByTotal.filter((r) => !predicted.has(r.userId))
              const predictedCount = rowsByTotal.length - missing.length
              return (
                <div key={match.id} className="pt-3 border-t border-(--color-border)/50 first:border-0 first:pt-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium">
                      {match.home_team?.fifa_code ?? "?"} vs {match.away_team?.fifa_code ?? "?"}{" "}
                      <span className="text-(--color-muted) font-normal">· M{match.match_number}</span>
                    </span>
                    <span className={`text-xs font-semibold tabular-nums ${
                      predictedCount === members.length ? "text-emerald-400" : "text-amber-400"
                    }`}>
                      {predictedCount}/{members.length}
                    </span>
                  </div>
                  {missing.length === 0 ? (
                    <p className="text-xs text-emerald-400">Todos han predicho este partido.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {missing.map((r) => (
                        <div key={r.userId} className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1">
                          {r.avatarUrl ? (
                            <Image src={r.avatarUrl} alt={r.name} width={16} height={16} className="rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full bg-white/10 shrink-0 flex items-center justify-center text-[8px] font-bold">
                              {r.name[0]?.toUpperCase() ?? "?"}
                            </div>
                          )}
                          <span className="text-[11px] text-(--color-muted)">{r.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-4">
            <span className="text-sm font-medium block mb-1">Partidos de hoy</span>
            <p className="text-xs text-(--color-muted)">No hay partidos programados para hoy.</p>
          </div>
        )}
      </div>

      {/* Owner: kick members */}
      {isOwner && members.length > 1 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-(--color-muted) mb-3">Gestionar miembros</h2>
          <div className="flex flex-col gap-2">
            {rowsByTotal
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
