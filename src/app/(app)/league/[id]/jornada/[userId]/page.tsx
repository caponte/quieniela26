import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import Image from "next/image"
import { Breadcrumb } from "@/components/Breadcrumb"

interface Props {
  params: Promise<{ id: string; userId: string }>
}

interface LeagueRow { id: string; name: string }
interface UserRow { id: string; name: string; avatar_url: string | null }

interface TeamInfo { name: string; fifa_code: string }

interface MatchInfo {
  id: string
  match_number: number
  stage: string
  match_date: string
  home_score: number | null
  away_score: number | null
  home_team: TeamInfo | null
  away_team: TeamInfo | null
}

interface PointsRow {
  total_points: number
  base_points: number
  bonus_points: number
  breakdown: Record<string, boolean>
}

interface PredictionRow {
  id: string
  home_goals: number
  away_goals: number
  first_team_to_score: string | null
  first_goal_scorer: string | null
  has_penalty: boolean
  match: MatchInfo | null
  match_points: PointsRow | null
}

const STAGE_LABELS: Record<string, string> = {
  group: "Fase de Grupos",
  round_of_32: "Ronda de 32",
  round_of_16: "Octavos de Final",
  quarter_final: "Cuartos de Final",
  semi_final: "Semifinales",
  third_place: "Tercer Puesto",
  final: "Gran Final",
}

const BREAKDOWN_CONFIG: Record<string, { label: string; pts: number }> = {
  exact_score: { label: "Marcador exacto", pts: 3 },
  correct_winner: { label: "Resultado correcto", pts: 1 },
  home_goals_exact: { label: "Goles local", pts: 1 },
  away_goals_exact: { label: "Goles visitante", pts: 1 },
  first_team_to_score: { label: "1er equipo en marcar", pts: 1 },
  first_goal_scorer: { label: "1er goleador", pts: 3 },
  has_penalty: { label: "Penales", pts: 1 },
}

function getBreakdownEntries(breakdown: Record<string, boolean>) {
  return Object.entries(breakdown)
    .filter(([, val]) => val === true)
    .filter(([key, ]) => {
      if (breakdown.exact_score && (key === "home_goals_exact" || key === "away_goals_exact")) return false
      return true
    })
}

export default async function PlayerJornadaDetailPage({ params }: Props) {
  const { id: leagueId, userId: targetUserId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: myMembership } = await supabase
    .from("league_members")
    .select("user_id")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .maybeSingle() as unknown as { data: { user_id: string } | null }

  if (!myMembership) notFound()

  const [leagueRes, targetUserRes, predsRes] = await Promise.all([
    supabase
      .from("leagues")
      .select("id, name")
      .eq("id", leagueId)
      .maybeSingle() as unknown as Promise<{ data: LeagueRow | null }>,

    supabase
      .from("users")
      .select("id, name, avatar_url")
      .eq("id", targetUserId)
      .maybeSingle() as unknown as Promise<{ data: UserRow | null }>,

    supabase
      .from("match_predictions")
      .select(`
        id, home_goals, away_goals, first_team_to_score, first_goal_scorer, has_penalty,
        match:matches!match_predictions_match_id_fkey(
          id, match_number, stage, match_date, home_score, away_score,
          home_team:teams!matches_home_team_id_fkey(name, fifa_code),
          away_team:teams!matches_away_team_id_fkey(name, fifa_code)
        ),
        match_points(total_points, base_points, bonus_points, breakdown)
      `)
      .eq("user_id", targetUserId) as unknown as Promise<{ data: PredictionRow[] | null }>,
  ])

  const league = leagueRes.data
  const targetUser = targetUserRes.data

  if (!league || !targetUser) notFound()

  const isMe = targetUserId === user.id

  const predictions = (predsRes.data ?? [])
    .filter((p) => p.match !== null)
    .sort((a, b) => {
      const dateA = a.match?.match_date ?? ""
      const dateB = b.match?.match_date ?? ""
      return dateA.localeCompare(dateB)
    })

  const totalJornadaPts = predictions.reduce((sum, p) => sum + (p.match_points?.total_points ?? 0), 0)

  // Running total per prediction (only counting finished matches)
  const runningMap = new Map<string, { before: number; earned: number }>()
  let accumulated = 0
  for (const pred of predictions) {
    const earned = pred.match_points?.total_points ?? 0
    if (pred.match_points !== null) {
      runningMap.set(pred.id, { before: accumulated, earned })
      accumulated += earned
    }
  }

  // Group by stage
  const byStage = new Map<string, PredictionRow[]>()
  for (const pred of predictions) {
    const stage = pred.match?.stage ?? "group"
    if (!byStage.has(stage)) byStage.set(stage, [])
    byStage.get(stage)!.push(pred)
  }

  const stageOrder = ["group", "round_of_32", "round_of_16", "quarter_final", "semi_final", "third_place", "final"]
  const sortedStages = [...byStage.keys()].sort((a, b) => stageOrder.indexOf(a) - stageOrder.indexOf(b))

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Breadcrumb crumbs={[
        { label: "Inicio", href: "/dashboard" },
        { label: "Mis ligas", href: "/league" },
        { label: league.name, href: `/league/${leagueId}` },
        { label: "Jornada", href: `/league/${leagueId}/jornada` },
        { label: isMe ? "Mis puntos" : targetUser.name.split(" ")[0] },
      ]} />

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        {targetUser.avatar_url ? (
          <Image src={targetUser.avatar_url} alt={targetUser.name} width={44} height={44} className="rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-base font-bold shrink-0">
            {targetUser.name[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold">{isMe ? "Mis puntos de jornada" : `Jornada de ${targetUser.name}`}</h1>
          <p className="text-(--color-muted) text-sm">{league.name}</p>
        </div>
        <div className="ml-auto text-right">
          <span className="text-2xl font-bold tabular-nums">{totalJornadaPts}</span>
          <p className="text-[10px] text-(--color-muted) uppercase tracking-widest">
            pts · {predictions.filter(p => p.match_points !== null).length} partidos
          </p>
        </div>
      </div>

      {predictions.length === 0 ? (
        <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-8 text-center">
          <p className="text-(--color-muted) text-sm">No hay predicciones registradas.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedStages.map((stage) => {
            const stagePreds = byStage.get(stage)!
            const stagePts = stagePreds.reduce((sum, p) => sum + (p.match_points?.total_points ?? 0), 0)
            return (
              <div key={stage}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-(--color-muted)">
                    {STAGE_LABELS[stage] ?? stage}
                  </h2>
                  <span className="text-xs font-semibold tabular-nums text-(--color-muted)">{stagePts} pts</span>
                </div>

                <div className="space-y-2">
                  {stagePreds.map((pred) => {
                    const match = pred.match!
                    const pts = pred.match_points ?? null
                    const isFinished = pts !== null
                    const breakdown = (pts?.breakdown ?? {}) as Record<string, boolean>
                    const activeEntries = getBreakdownEntries(breakdown)
                    const matchDate = new Date(match.match_date)
                    const running = runningMap.get(pred.id)

                    return (
                      <div key={pred.id} className="bg-(--color-surface) border border-(--color-border) rounded-xl overflow-hidden">
                        {/* Match result row */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-(--color-border)/50">
                          <div>
                            <div className="flex items-center gap-1.5 text-sm font-medium">
                              <span>{match.home_team?.fifa_code ?? "?"}</span>
                              {isFinished ? (
                                <span className="text-(--color-muted) tabular-nums">{match.home_score ?? "?"}&ndash;{match.away_score ?? "?"}</span>
                              ) : (
                                <span className="text-(--color-muted)">vs</span>
                              )}
                              <span>{match.away_team?.fifa_code ?? "?"}</span>
                            </div>
                            <p className="text-[10px] text-(--color-muted) mt-0.5">
                              M{match.match_number} · {matchDate.toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" })}
                            </p>
                          </div>
                          <div className="text-right">
                            {isFinished && running ? (
                              <>
                                <div className="flex items-baseline gap-1 justify-end">
                                  <span className="text-xs tabular-nums text-(--color-muted)">{running.before}</span>
                                  <span className={`text-base font-bold tabular-nums ${running.earned > 0 ? "text-emerald-400" : "text-(--color-muted)"}`}>
                                    +{running.earned}
                                  </span>
                                </div>
                                <p className="text-[10px] text-(--color-muted)">{running.before + running.earned} pts acum.</p>
                              </>
                            ) : (
                              <span className="text-xs text-(--color-muted)">Pendiente</span>
                            )}
                          </div>
                        </div>

                        {/* Prediction row */}
                        <div className="px-4 py-2.5">
                          <div className="flex items-start gap-4 flex-wrap">
                            <div>
                              <p className="text-[10px] text-(--color-muted) uppercase tracking-widest mb-0.5">Tu predicción</p>
                              <div className="flex items-center gap-1 text-sm font-medium">
                                <span>{match.home_team?.fifa_code ?? "?"}</span>
                                <span className="tabular-nums text-(--color-muted)">{pred.home_goals}&ndash;{pred.away_goals}</span>
                                <span>{match.away_team?.fifa_code ?? "?"}</span>
                              </div>
                            </div>
                            {pred.first_goal_scorer && (
                              <div>
                                <p className="text-[10px] text-(--color-muted) uppercase tracking-widest mb-0.5">1er goleador</p>
                                <span className="text-sm">{pred.first_goal_scorer}</span>
                              </div>
                            )}
                            <div>
                              <p className="text-[10px] text-(--color-muted) uppercase tracking-widest mb-0.5">Penales</p>
                              <span className="text-sm">{pred.has_penalty ? "Sí" : "No"}</span>
                            </div>
                          </div>

                          {/* Breakdown tags */}
                          {isFinished && activeEntries.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2.5">
                              {activeEntries.map(([key]) => {
                                const cfg = BREAKDOWN_CONFIG[key]
                                if (!cfg) return null
                                return (
                                  <span key={key} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400">
                                    {cfg.label}
                                    <span className="font-bold">+{cfg.pts}</span>
                                  </span>
                                )
                              })}
                            </div>
                          )}
                          {isFinished && pts.total_points === 0 && (
                            <p className="text-[10px] text-(--color-muted) mt-2">Sin puntos en este partido.</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
