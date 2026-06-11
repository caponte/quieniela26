import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Breadcrumb } from "@/components/Breadcrumb"
import {
  BRACKET_LOCK_TIME,
  GROUPS,
  type BracketPredictionData,
  type TeamInfo,
} from "@/lib/utils/bracket"

interface Props {
  params: Promise<{ id: string; userId: string }>
}

interface UserRow { id: string; name: string; avatar_url: string | null }
interface LeagueRow { id: string; name: string }

function Flag({ team, size = 24 }: { team: TeamInfo | null | undefined; size?: number }) {
  if (!team?.flag_url) {
    return (
      <div
        style={{ width: size, height: Math.round(size * 0.67) }}
        className="rounded-sm bg-white/10 shrink-0"
      />
    )
  }
  return (
    <Image
      src={team.flag_url}
      alt={team.name}
      width={size}
      height={Math.round(size * 0.67)}
      className="rounded-sm object-cover shrink-0"
    />
  )
}

function TeamChip({ team, size = 20 }: { team: TeamInfo | null | undefined; size?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <Flag team={team} size={size} />
      <span className="text-sm font-medium">{team?.name ?? "—"}</span>
    </div>
  )
}

export default async function MemberBracketPage({ params }: Props) {
  const { id: leagueId, userId: targetUserId } = await params

  if (Date.now() < BRACKET_LOCK_TIME.getTime()) {
    redirect(`/league/${leagueId}`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Verify current user is member of this league
  const { data: myMembership } = await supabase
    .from("league_members")
    .select("user_id")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .maybeSingle() as unknown as { data: { user_id: string } | null }

  if (!myMembership) notFound()

  const [leagueRes, targetUserRes, bracketRes, teamsRes] = await Promise.all([
    supabase.from("leagues").select("id, name").eq("id", leagueId).maybeSingle() as unknown as Promise<{ data: LeagueRow | null }>,
    supabase.from("users").select("id, name, avatar_url").eq("id", targetUserId).maybeSingle() as unknown as Promise<{ data: UserRow | null }>,
    supabase.from("bracket_predictions").select("predictions").eq("user_id", targetUserId).order("league_id", { nullsFirst: true }).limit(1) as unknown as Promise<{ data: { predictions: BracketPredictionData }[] | null }>,
    supabase.from("teams").select("id, name, flag_url, fifa_code, group_name").order("group_name").order("name") as unknown as Promise<{ data: TeamInfo[] | null }>,
  ])

  const league = leagueRes.data
  const targetUser = targetUserRes.data
  const bracket = (bracketRes.data?.[0])?.predictions ?? null
  const teams = teamsRes.data ?? []

  if (!league || !targetUser) notFound()

  const teamById = Object.fromEntries(teams.map((t) => [t.id, t]))

  const t = (id: string | null | undefined): TeamInfo | null =>
    id ? (teamById[id] ?? null) : null

  const champion = t(bracket?.champion)
  const third = t(bracket?.third)
  const finalist1 = t(bracket?.sf?.[0])
  const finalist2 = t(bracket?.sf?.[1])
  const sf = [t(bracket?.qf?.[0]), t(bracket?.qf?.[1]), t(bracket?.qf?.[2]), t(bracket?.qf?.[3])]
  const qf = [
    t(bracket?.r16?.[0]), t(bracket?.r16?.[1]),
    t(bracket?.r16?.[2]), t(bracket?.r16?.[3]),
    t(bracket?.r16?.[4]), t(bracket?.r16?.[5]),
    t(bracket?.r16?.[6]), t(bracket?.r16?.[7]),
  ]

  const isMe = targetUserId === user.id

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Breadcrumb crumbs={[
        { label: "Inicio", href: "/dashboard" },
        { label: "Mis ligas", href: "/league" },
        { label: league.name, href: `/league/${leagueId}` },
        { label: isMe ? "Mi bracket" : `Bracket de ${targetUser.name.split(" ")[0]}` },
      ]} />

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        {targetUser.avatar_url ? (
          <Image
            src={targetUser.avatar_url}
            alt={targetUser.name}
            width={44}
            height={44}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-base font-bold">
            {targetUser.name[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold">
            {isMe ? "Mi bracket" : `Bracket de ${targetUser.name}`}
          </h1>
          <p className="text-(--color-muted) text-sm">{league.name}</p>
        </div>
      </div>

      {!bracket ? (
        <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-8 text-center">
          <p className="text-(--color-muted)">
            {isMe ? "No enviaste tu bracket." : `${targetUser.name.split(" ")[0]} no envió su bracket.`}
          </p>
          {isMe && (
            <Link
              href="/predict/bracket"
              className="mt-3 inline-block text-sm text-(--color-accent) hover:underline"
            >
              Ver bracket →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">

          {/* Champion */}
          <div className="relative bg-linear-to-br from-yellow-500/15 via-yellow-400/5 to-transparent border border-yellow-500/30 rounded-2xl p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-yellow-400/70 mb-3">Campeón</p>
            <div className="flex flex-col items-center gap-3">
              <Flag team={champion} size={64} />
              <p className="text-2xl font-bold">{champion?.name ?? "Sin elegir"}</p>
              {champion && (
                <span className="text-xs font-mono text-(--color-muted) bg-white/5 px-2 py-0.5 rounded">
                  {champion.fifa_code}
                </span>
              )}
            </div>
          </div>

          {/* Final: finalists + 3rd */}
          <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-(--color-muted) mb-3">Gran Final</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1">
                <TeamChip team={finalist1} />
              </div>
              <span className="text-xs text-(--color-muted) font-semibold">vs</span>
              <div className="flex-1 flex justify-end">
                <TeamChip team={finalist2} />
              </div>
            </div>
            <div className="border-t border-(--color-border)/50 pt-3 flex items-center gap-2">
              <span className="text-xs text-(--color-muted) shrink-0">3er lugar:</span>
              <TeamChip team={third} size={16} />
            </div>
          </div>

          {/* Semifinals */}
          <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-(--color-muted) mb-3">Semifinales</p>
            <div className="grid grid-cols-2 gap-3">
              {sf.map((team, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/4 rounded-lg px-3 py-2">
                  <Flag team={team} size={20} />
                  <span className="text-sm truncate">{team?.name ?? "—"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quarterfinals */}
          <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-(--color-muted) mb-3">Cuartos de Final</p>
            <div className="grid grid-cols-2 gap-2">
              {qf.map((team, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/4 rounded-lg px-3 py-2">
                  <Flag team={team} size={18} />
                  <span className="text-xs truncate">{team?.name ?? "—"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Groups */}
          <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-(--color-muted) mb-4">Grupos</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {GROUPS.map((g) => {
                const gp = bracket.groups?.[g]
                const first = t(gp?.first)
                const second = t(gp?.second)
                return (
                  <div key={g} className="bg-white/4 rounded-lg p-2.5">
                    <p className="text-[10px] font-bold text-(--color-muted) uppercase mb-2">Grupo {g}</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-(--color-muted) w-3 shrink-0">1°</span>
                        <Flag team={first} size={16} />
                        <span className="text-xs truncate">{first?.fifa_code ?? "—"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-(--color-muted) w-3 shrink-0">2°</span>
                        <Flag team={second} size={16} />
                        <span className="text-xs truncate">{second?.fifa_code ?? "—"}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
