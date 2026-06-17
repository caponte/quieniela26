import { createClient } from "@/lib/supabase/server"
import { getGroupRoundMatchIds, JORNADA_INFO } from "@/lib/utils/jornada"
import { notFound, redirect } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Breadcrumb } from "@/components/Breadcrumb"

interface WrapMatch {
  id: string
  home_score: number | null
  away_score: number | null
  home_team: { name: string; fifa_code: string; flag_url: string | null } | null
  away_team: { name: string; fifa_code: string; flag_url: string | null } | null
}

interface WrapPred {
  user_id: string
  match_id: string
  home_goals: number
  away_goals: number
  first_goal_scorer: string | null
  has_penalty: boolean
  match_points: { total_points: number } | null
}

interface WrapEvent {
  match_id: string
  player_name: string | null
  is_first_goal: boolean
  type: string
}

interface UserStat {
  userId: string
  name: string
  avatarUrl: string | null
  exactScores: number
  goalScorers: number
  penaltyHits: number
  points: number
  predCount: number
}

interface MatchStat {
  match: WrapMatch
  predCount: number
  exactCount: number
  topScore: string
  topScoreCount: number
}

interface GoalScorerHit {
  userId: string
  matchId: string
  scorerName: string
}

type Props = { params: Promise<{ jornada: string }> }

const MEDAL = ["🥇", "🥈", "🥉"]

function Avatar({ name, avatarUrl, size = 28 }: { name: string; avatarUrl: string | null; size?: number }) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={name}
        width={size}
        height={size}
        className="rounded-full shrink-0 object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="rounded-full bg-white/10 flex items-center justify-center text-xs font-bold shrink-0"
      style={{ width: size, height: size }}
    >
      {name[0]?.toUpperCase() ?? "?"}
    </div>
  )
}

export default async function WrapPage({ params }: Props) {
  const { jornada } = await params

  const roundMap: Record<string, 1 | 2 | 3> = { j1: 1, j2: 2, j3: 3 }
  const round = roundMap[jornada]
  if (!round) return notFound()

  const jornadaInfo = JORNADA_INFO[jornada as "j1" | "j2" | "j3"]

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Step 1: compute jornada match IDs
  const { data: allGroupMatches } = await supabase
    .from("matches")
    .select("id, match_date, group_name")
    .eq("stage", "group")

  const jMatchIds = getGroupRoundMatchIds(allGroupMatches ?? [], round)
  if (jMatchIds.size === 0) return notFound()
  const ids = Array.from(jMatchIds)

  // Step 2: matches + predictions + events in parallel
  const [matchesRes, predsRes, eventsRes] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "id, home_score, away_score, home_team:teams!matches_home_team_id_fkey(name, fifa_code, flag_url), away_team:teams!matches_away_team_id_fkey(name, fifa_code, flag_url)"
      )
      .in("id", ids)
      .eq("status", "finished") as unknown as Promise<{ data: WrapMatch[] | null }>,

    supabase
      .from("match_predictions")
      .select("user_id, match_id, home_goals, away_goals, first_goal_scorer, has_penalty, match_points(total_points)")
      .in("match_id", ids)
      .is("league_id", null) as unknown as Promise<{ data: WrapPred[] | null }>,

    supabase
      .from("match_events")
      .select("match_id, player_name, is_first_goal, type")
      .in("match_id", ids)
      .eq("is_own_goal", false)
      .or("is_first_goal.eq.true,type.eq.penalty") as unknown as Promise<{ data: WrapEvent[] | null }>,
  ])

  const finishedMatches = matchesRes.data ?? []
  const finishedIds = new Set(finishedMatches.map((m) => m.id))

  // Step 3: user profiles
  const rawPreds = (predsRes.data ?? []).filter((p) => finishedIds.has(p.match_id))
  const seenKey = new Set<string>()
  const preds: WrapPred[] = []
  for (const p of rawPreds) {
    const key = `${p.user_id}:${p.match_id}`
    if (!seenKey.has(key)) { seenKey.add(key); preds.push(p) }
  }

  const allUserIds = [...new Set(preds.map((p) => p.user_id))]
  const { data: usersData } = await supabase
    .from("users")
    .select("id, name, avatar_url")
    .in("id", allUserIds)

  const nameMap = Object.fromEntries((usersData ?? []).map((u) => [u.id, { name: u.name as string, avatarUrl: u.avatar_url as string | null }]))

  // Build event maps
  const events = eventsRes.data ?? []
  const firstGoalMap: Record<string, string> = {}
  const hasPenaltyMap: Record<string, boolean> = {}
  for (const e of events) {
    if (e.type === "penalty") hasPenaltyMap[e.match_id] = true
    if (e.is_first_goal && e.player_name) firstGoalMap[e.match_id] = e.player_name
  }

  const matchMap = Object.fromEntries(finishedMatches.map((m) => [m.id, m]))

  // Per-user stats
  const userStatMap: Record<string, Omit<UserStat, "userId" | "name" | "avatarUrl">> = {}
  const goalScorerHits: GoalScorerHit[] = []

  for (const p of preds) {
    const m = matchMap[p.match_id]
    if (!m) continue
    if (!userStatMap[p.user_id]) userStatMap[p.user_id] = { exactScores: 0, goalScorers: 0, penaltyHits: 0, points: 0, predCount: 0 }
    const s = userStatMap[p.user_id]
    s.predCount++
    s.points += p.match_points?.total_points ?? 0

    if (p.home_goals === m.home_score && p.away_goals === m.away_score) s.exactScores++

    const actualScorer = firstGoalMap[p.match_id]
    if (actualScorer && p.first_goal_scorer &&
        actualScorer.trim().toLowerCase() === p.first_goal_scorer.trim().toLowerCase()) {
      s.goalScorers++
      goalScorerHits.push({ userId: p.user_id, matchId: p.match_id, scorerName: actualScorer })
    }

    const actualPenalty = hasPenaltyMap[p.match_id] ?? false
    if (p.has_penalty === actualPenalty) s.penaltyHits++
  }

  const userStats: UserStat[] = allUserIds.map((id) => ({
    userId: id,
    name: nameMap[id]?.name ?? "?",
    avatarUrl: nameMap[id]?.avatarUrl ?? null,
    ...(userStatMap[id] ?? { exactScores: 0, goalScorers: 0, penaltyHits: 0, points: 0, predCount: 0 }),
  }))

  const byPoints   = [...userStats].sort((a, b) => b.points   - a.points   || b.exactScores - a.exactScores)
  const byExact    = [...userStats].sort((a, b) => b.exactScores - a.exactScores || b.points - a.points).filter((u) => u.exactScores > 0)
  const byScorers  = [...userStats].sort((a, b) => b.goalScorers - a.goalScorers).filter((u) => u.goalScorers > 0)

  // Per-match stats
  const matchStats: MatchStat[] = finishedMatches.map((match) => {
    const matchPreds = preds.filter((p) => p.match_id === match.id)
    const scoreCounts: Record<string, number> = {}
    let exactCount = 0
    for (const p of matchPreds) {
      const key = `${p.home_goals}-${p.away_goals}`
      scoreCounts[key] = (scoreCounts[key] ?? 0) + 1
      if (p.home_goals === match.home_score && p.away_goals === match.away_score) exactCount++
    }
    const topEntry = Object.entries(scoreCounts).sort((a, b) => b[1] - a[1])[0]
    return {
      match,
      predCount: matchPreds.length,
      exactCount,
      topScore: topEntry?.[0] ?? "—",
      topScoreCount: topEntry?.[1] ?? 0,
    }
  }).sort((a, b) => {
    // Sort by match order (using team names as stable order)
    const nameA = a.match.home_team?.fifa_code ?? ""
    const nameB = b.match.home_team?.fifa_code ?? ""
    return nameA.localeCompare(nameB)
  })

  // Global curiosidades
  const hardestMatch = [...matchStats].filter((ms) => ms.predCount > 0)
    .sort((a, b) => (a.exactCount / a.predCount) - (b.exactCount / b.predCount))[0]
  const easiestMatch = [...matchStats].filter((ms) => ms.predCount > 0)
    .sort((a, b) => (b.exactCount / b.predCount) - (a.exactCount / a.predCount))[0]

  // Most predicted first goal scorer (regardless of correctness)
  const scorerCounts: Record<string, number> = {}
  for (const p of preds) {
    if (p.first_goal_scorer) {
      const key = p.first_goal_scorer.trim()
      scorerCounts[key] = (scorerCounts[key] ?? 0) + 1
    }
  }
  const topPredictedScorer = Object.entries(scorerCounts).sort((a, b) => b[1] - a[1])[0]

  // Summary numbers
  const totalPreds  = preds.length
  const totalPlayers = allUserIds.length
  const playersWithExact = userStats.filter((u) => u.exactScores > 0).length
  const maxExact = byExact[0]?.exactScores ?? 1

  return (
    <div className="space-y-10">
      <Breadcrumb crumbs={[{ label: "Inicio", href: "/dashboard" }, { label: `${jornadaInfo.label} · Wrap` }]} />

      {/* ── Hero ── */}
      <section className="space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-yellow-500/80 mb-1">⚡ Resumen</p>
          <h1 className="text-3xl font-bold">{jornadaInfo.label} · Wrap</h1>
          <p className="text-(--color-muted) text-sm mt-1">
            {finishedMatches.length} de {ids.length} partido{ids.length !== 1 ? "s" : ""} completado{finishedMatches.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Partidos", value: finishedMatches.length, sub: `de ${ids.length}` },
            { label: "Predicciones", value: totalPreds },
            { label: "Jugadores", value: totalPlayers },
            { label: "Con exacto", value: playersWithExact, sub: `de ${totalPlayers}` },
          ].map((tile) => (
            <div key={tile.label} className="bg-(--color-surface) border border-(--color-border) rounded-xl p-4">
              <p className="text-2xl font-bold tabular-nums">
                {tile.value}
                {tile.sub && <span className="text-sm font-normal text-(--color-muted) ml-1">{tile.sub}</span>}
              </p>
              <p className="text-xs text-(--color-muted) mt-0.5">{tile.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Exactos ── */}
      {byExact.length > 0 && (
        <section>
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <span>🎯</span> Marcadores exactos
          </h2>
          <div className="bg-(--color-surface) border border-(--color-border) rounded-xl overflow-hidden">
            {byExact.slice(0, 10).map((u, i) => (
              <div
                key={u.userId}
                className="flex items-center gap-3 px-4 py-3 border-b border-(--color-border)/40 last:border-0"
              >
                <span className="w-6 shrink-0 text-center">
                  {i < 3 ? <span className="text-base">{MEDAL[i]}</span> : <span className="text-xs text-(--color-muted)">{i + 1}</span>}
                </span>
                <Avatar name={u.name} avatarUrl={u.avatarUrl} />
                <span className="text-sm font-medium flex-1 min-w-0 truncate">{u.name}</span>
                <div className="flex-1 max-w-[100px] hidden sm:block">
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-yellow-500/70 transition-all"
                      style={{ width: `${(u.exactScores / maxExact) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-bold text-yellow-400 shrink-0 tabular-nums">
                  {u.exactScores} exacto{u.exactScores !== 1 ? "s" : ""}
                </span>
                <span className="text-sm text-(--color-muted) shrink-0 tabular-nums hidden sm:block">
                  {u.points} pts
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Goleadores acertados ── */}
      <section>
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <span>⚽</span> Goleadores acertados
        </h2>
        {byScorers.length === 0 ? (
          <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-6 text-center text-(--color-muted) text-sm">
            Nadie acertó un goleador todavía.
          </div>
        ) : (
          <div className="bg-(--color-surface) border border-(--color-border) rounded-xl overflow-hidden">
            {byScorers.map((u) => {
              const hits = goalScorerHits.filter((h) => h.userId === u.userId)
              return (
                <div key={u.userId} className="flex items-start gap-3 px-4 py-3 border-b border-(--color-border)/40 last:border-0">
                  <Avatar name={u.name} avatarUrl={u.avatarUrl} size={32} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{u.name}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                      {hits.map((h, i) => {
                        const m = matchMap[h.matchId]
                        return (
                          <span key={i} className="text-xs text-(--color-muted)">
                            {h.scorerName}
                            {m && (
                              <span className="text-white/30 ml-1">
                                ({m.home_team?.fifa_code} vs {m.away_team?.fifa_code})
                              </span>
                            )}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-green-400 shrink-0 tabular-nums">
                    {u.goalScorers} ✓
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Tabla J1 ── */}
      <section>
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <span>🏆</span> Tabla {jornadaInfo.label}
        </h2>
        <div className="bg-(--color-surface) border border-(--color-border) rounded-xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[2rem_1fr_3.5rem_3.5rem_3.5rem] gap-2 px-4 py-2 border-b border-(--color-border) text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">
            <span>#</span>
            <span>Jugador</span>
            <span className="text-right">Pts</span>
            <span className="text-right hidden sm:block">Exactos</span>
            <span className="text-right hidden sm:block">Goles</span>
          </div>
          {byPoints.map((u, i) => (
            <div
              key={u.userId}
              className={`grid grid-cols-[2rem_1fr_3.5rem_3.5rem_3.5rem] gap-2 items-center px-4 py-2.5 border-b border-(--color-border)/40 last:border-0 ${u.userId === user.id ? "bg-(--color-accent)/5" : ""}`}
            >
              <span className={`text-xs font-bold tabular-nums ${i === 0 ? "text-yellow-400" : i === 1 ? "text-zinc-300" : i === 2 ? "text-amber-600" : "text-(--color-muted)"}`}>
                {i + 1}
              </span>
              <div className="flex items-center gap-2 min-w-0">
                <Avatar name={u.name} avatarUrl={u.avatarUrl} size={22} />
                <span className={`text-sm truncate ${u.userId === user.id ? "font-semibold text-(--color-accent)" : ""}`}>{u.name}</span>
              </div>
              <span className={`text-sm font-bold tabular-nums text-right ${u.userId === user.id ? "text-(--color-accent)" : ""}`}>
                {u.points}
              </span>
              <span className="text-sm tabular-nums text-right text-(--color-muted) hidden sm:block">{u.exactScores}</span>
              <span className="text-sm tabular-nums text-right text-(--color-muted) hidden sm:block">{u.goalScorers}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Por partido ── */}
      {matchStats.length > 0 && (
        <section>
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <span>📊</span> Por partido
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {matchStats.map((ms) => {
              const m = ms.match
              const exactPct = ms.predCount > 0 ? Math.round((ms.exactCount / ms.predCount) * 100) : 0
              return (
                <div key={m.id} className="bg-(--color-surface) border border-(--color-border) rounded-xl p-4 space-y-3">
                  {/* Match result */}
                  <div className="flex items-center gap-2">
                    {m.home_team?.flag_url
                      ? <Image src={m.home_team.flag_url} alt={m.home_team.name} width={22} height={15} className="rounded-sm object-cover shrink-0" />
                      : <div className="w-5.5 h-3.75 bg-white/10 rounded-sm shrink-0" />}
                    <span className="text-xs text-(--color-muted) shrink-0">{m.home_team?.fifa_code}</span>
                    <span className="text-base font-bold tabular-nums">{m.home_score} – {m.away_score}</span>
                    <span className="text-xs text-(--color-muted) shrink-0">{m.away_team?.fifa_code}</span>
                    {m.away_team?.flag_url
                      ? <Image src={m.away_team.flag_url} alt={m.away_team.name} width={22} height={15} className="rounded-sm object-cover shrink-0" />
                      : <div className="w-5.5 h-3.75 bg-white/10 rounded-sm shrink-0" />}
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-(--color-muted)">Exactos </span>
                      <span className="font-semibold text-yellow-400">{ms.exactCount}</span>
                      <span className="text-(--color-muted)">/{ms.predCount}</span>
                      <span className="text-(--color-muted) ml-1">({exactPct}%)</span>
                    </div>
                  </div>

                  {/* Most popular pick */}
                  {ms.predCount > 0 && (
                    <div className="text-xs text-(--color-muted)">
                      + popular:{" "}
                      <span className="font-semibold text-white">{ms.topScore}</span>
                      <span className="ml-1">×{ms.topScoreCount}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Curiosidades ── */}
      <section>
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <span>💡</span> Curiosidades
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {hardestMatch && (
            <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-red-400/80 mb-2">😤 Más difícil de predecir</p>
              <p className="font-bold text-sm">
                {hardestMatch.match.home_team?.fifa_code} {hardestMatch.match.home_score}–{hardestMatch.match.away_score} {hardestMatch.match.away_team?.fifa_code}
              </p>
              <p className="text-xs text-(--color-muted) mt-1">
                Solo {hardestMatch.exactCount} de {hardestMatch.predCount} lo acertaron
              </p>
            </div>
          )}
          {easiestMatch && easiestMatch.match.id !== hardestMatch?.match.id && (
            <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-green-400/80 mb-2">🎯 Más fácil de predecir</p>
              <p className="font-bold text-sm">
                {easiestMatch.match.home_team?.fifa_code} {easiestMatch.match.home_score}–{easiestMatch.match.away_score} {easiestMatch.match.away_team?.fifa_code}
              </p>
              <p className="text-xs text-(--color-muted) mt-1">
                {easiestMatch.exactCount} de {easiestMatch.predCount} lo acertaron ({Math.round((easiestMatch.exactCount / easiestMatch.predCount) * 100)}%)
              </p>
            </div>
          )}
          {topPredictedScorer && (
            <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-400/80 mb-2">⚽ Goleador más predicho</p>
              <p className="font-bold text-sm">{topPredictedScorer[0]}</p>
              <p className="text-xs text-(--color-muted) mt-1">
                {topPredictedScorer[1]} jugadores lo eligieron como primer goleador
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Back link */}
      <div className="pt-2 pb-8">
        <Link href="/dashboard" className="text-sm text-(--color-muted) hover:text-white transition-colors">
          ← Volver al inicio
        </Link>
      </div>
    </div>
  )
}
