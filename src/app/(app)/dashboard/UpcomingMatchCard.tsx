"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"

interface Team {
  id: string
  name: string
  flag_url: string | null
  fifa_code: string
}

export interface LeagueFullPred {
  userId: string
  name: string
  avatarUrl: string | null
  homeGoals: number
  awayGoals: number
  firstTeamToScoreId: string | null
  firstGoalScorer: string | null
  isMe: boolean
  totalPoints: number
  livePoints: number | null
  liveBreakdown: import("@/lib/utils/livePoints").LivePointsBreakdown | null
}

export interface GoalEvent {
  team_id: string
  player_name: string | null
  minute: number | null
  is_own_goal: boolean
  penalty_scored: boolean | null
  is_first_goal: boolean
}

export interface MatchCardData {
  id: string
  match_number: number
  match_date: string
  stage: string
  group_name: string | null
  home_score: number | null
  away_score: number | null
  status: string
  home_team: Team | null
  away_team: Team | null
  prediction: {
    home_goals: number
    away_goals: number
    first_team_to_score: string | null
    has_penalty: boolean
    first_goal_scorer: string | null
    isStarterPick: boolean | null
  } | null
  jornadaSlug: string
  leaguePredictors: { name: string; avatarUrl: string | null }[] | null
  leagueTotal: number | null
  leagueFullPreds: LeagueFullPred[] | null
  goalEvents?: GoalEvent[]
}

type LiveBreakdownKey = keyof Omit<import("@/lib/utils/livePoints").LivePointsBreakdown, "total">
const LIVE_BREAKDOWN_ROWS: { key: LiveBreakdownKey; label: string }[] = [
  { key: "exactScore",       label: "Marcador exacto"         },
  { key: "correctWinner",    label: "Ganador / empate"        },
  { key: "homeGoalsExact",   label: "Goles local exactos"     },
  { key: "awayGoalsExact",   label: "Goles visita exactos"    },
  { key: "firstTeamToScore", label: "Primer equipo en marcar" },
  { key: "firstGoalScorer",  label: "Primer goleador"         },
  { key: "hasPenalty",       label: "Penales (sí/no)"         },
]

const DAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"]
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]

function formatDate(iso: string) {
  const d = new Date(iso)
  const day = DAYS[d.getDay()]
  const date = d.getDate()
  const month = MONTHS[d.getMonth()]
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${day} ${date} ${month}, ${hh}:${mm}`
}

export default function UpcomingMatchCard({ match }: { match: MatchCardData }) {
  const [open, setOpen] = useState(false)
  const meId = match.leagueFullPreds?.find(p => p.isMe)?.userId ?? null
  const [openBreakdownId, setOpenBreakdownId] = useState<string | null>(meId)

  const pred = match.prediction
  const isLive = match.status === "live"
  const isFinished = match.status === "finished"

  const firstScorerTeam = pred?.first_team_to_score
    ? pred.first_team_to_score === match.home_team?.id
      ? match.home_team?.name
      : match.away_team?.name
    : null

  const homeGoals = (match.goalEvents ?? []).filter(e => e.team_id === match.home_team?.id)
  const awayGoals = (match.goalEvents ?? []).filter(e => e.team_id === match.away_team?.id)

  return (
    <div className="bg-(--color-surface) border border-(--color-border) rounded-xl transition-colors hover:border-white/20">
      {/* Main row */}
      <button
        className="w-full text-left px-4 py-3 flex items-center gap-3"
        onClick={() => setOpen((o) => !o)}
      >
        {/* Home team */}
        <div className="flex flex-col items-start flex-1 min-w-0 gap-0.5">
          <div className="flex items-center gap-2">
            <TeamFlag team={match.home_team} />
            <span className="font-medium text-sm truncate">{match.home_team?.name ?? "—"}</span>
          </div>
          {isLive && homeGoals.length > 0 && (
            <div className="flex flex-col gap-0 pl-1">
              {homeGoals.map((g, i) => (
                <span key={i} className="text-[10px] text-white/50 leading-tight">
                  ⚽ {g.player_name ?? "—"}{g.minute ? ` ${g.minute}'` : ""}{g.penalty_scored ? " (P)" : ""}{g.is_own_goal ? " (OG)" : ""}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Center: always real result or "vs", plus meta */}
        <div className="flex flex-col items-center shrink-0 gap-0.5 min-w-[110px]">
          {isLive ? (
            <span className="text-base font-bold tabular-nums text-green-400">
              {match.home_score} – {match.away_score}
            </span>
          ) : isFinished ? (
            <span className="text-base font-bold tabular-nums text-white/60">
              {match.home_score} – {match.away_score}
            </span>
          ) : (
            <span className="text-xs font-semibold text-(--color-muted) tracking-widest">vs</span>
          )}

          <span className="text-[10px] text-(--color-muted) leading-tight text-center">
            {isLive && <span className="text-green-400 font-semibold">EN VIVO · </span>}
            {match.group_name ? `Grupo ${match.group_name}` : stageLabel(match.stage)}
            {" · "}M{match.match_number}
          </span>

          <span className="text-[10px] text-(--color-muted)">{formatDate(match.match_date)}</span>

          {pred ? (
            <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              Predicho
            </span>
          ) : (
            <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400/80">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 inline-block" />
              Sin predecir
            </span>
          )}

          {match.leaguePredictors !== null && match.leagueTotal !== null && (
            <div className="flex items-center justify-center gap-1 mt-0.5">
              {match.leaguePredictors.length > 0 && (
                <div className="flex -space-x-1">
                  {match.leaguePredictors.slice(0, 5).map((u, i) =>
                    u.avatarUrl ? (
                      <img key={i} src={u.avatarUrl} alt={u.name} title={u.name}
                        className="w-4 h-4 rounded-full border border-(--color-background) object-cover shrink-0" />
                    ) : (
                      <div key={i} title={u.name}
                        className="w-4 h-4 rounded-full border border-(--color-background) bg-white/10 flex items-center justify-center text-[7px] font-bold shrink-0">
                        {u.name[0]?.toUpperCase() ?? "?"}
                      </div>
                    )
                  )}
                  {match.leaguePredictors.length > 5 && (
                    <div className="w-4 h-4 rounded-full border border-(--color-background) bg-white/10 flex items-center justify-center text-[7px] font-bold text-(--color-muted) shrink-0">
                      +{match.leaguePredictors.length - 5}
                    </div>
                  )}
                </div>
              )}
              <span className="text-[9px] text-(--color-muted) tabular-nums">
                {match.leaguePredictors.length}/{match.leagueTotal}
              </span>
            </div>
          )}
        </div>

        {/* Away team */}
        <div className="flex flex-col items-end flex-1 min-w-0 gap-0.5">
          <div className="flex items-center gap-2 justify-end">
            <span className="font-medium text-sm truncate text-right">{match.away_team?.name ?? "—"}</span>
            <TeamFlag team={match.away_team} />
          </div>
          {isLive && awayGoals.length > 0 && (
            <div className="flex flex-col items-end gap-0 pr-1">
              {awayGoals.map((g, i) => (
                <span key={i} className="text-[10px] text-white/50 leading-tight">
                  {g.penalty_scored ? "(P) " : ""}{g.is_own_goal ? "(OG) " : ""}{g.minute ? `${g.minute}' ` : ""}{g.player_name ?? "—"} ⚽
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Chevron */}
        <svg
          className={`w-4 h-4 shrink-0 text-(--color-muted) transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="border-t border-(--color-border) py-3 space-y-3">
          {pred ? (
            <>
              <div className="px-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-(--color-muted) mb-2">Tu pronóstico</p>
                <div className="flex items-center justify-center gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <TeamFlag team={match.home_team} size={20} />
                    <span className="text-sm text-(--color-muted)">{match.home_team?.fifa_code}</span>
                  </div>
                  <span className="text-2xl font-bold tabular-nums text-(--color-accent)">
                    {pred.home_goals} – {pred.away_goals}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-(--color-muted)">{match.away_team?.fifa_code}</span>
                    <TeamFlag team={match.away_team} size={20} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <DetailCell label="Primer gol" value={firstScorerTeam ?? "Ninguno"} />
                  <DetailCell label="Penales" value={pred.has_penalty ? "Sí" : "No"} />
                  <DetailCell label="Goleador" value={pred.first_goal_scorer ?? "—"} isStarter={pred.isStarterPick} />
                </div>
              </div>

              {!isLive && !isFinished && (
                <div className="px-4 pt-1">
                  <Link
                    href={`/predict/match/${match.jornadaSlug}?match=${match.id}`}
                    className="block text-center text-xs text-(--color-accent) hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Editar predicción →
                  </Link>
                </div>
              )}
            </>
          ) : (
            <div className="px-4 text-center py-1">
              <p className="text-sm text-(--color-muted) mb-2">Aún no has predicho este partido.</p>
              {!isLive && !isFinished && (
                <Link
                  href={`/predict/match/${match.jornadaSlug}?match=${match.id}`}
                  className="inline-block text-sm bg-(--color-accent) text-black font-semibold px-4 py-1.5 rounded-lg hover:opacity-90 transition"
                  onClick={(e) => e.stopPropagation()}
                >
                  Predecir ahora →
                </Link>
              )}
            </div>
          )}

          {/* League predictions table */}
          {(isLive || isFinished) && match.leagueFullPreds && match.leagueFullPreds.length > 0 && (
            <div className="border-t border-(--color-border)">
              <div className="px-4 pt-3 pb-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-(--color-muted)">Liga</p>
              </div>
              <div className="divide-y divide-white/6">
                {[...match.leagueFullPreds].sort((a, b) => {
                  const aScore = a.livePoints !== null ? a.totalPoints + a.livePoints : a.totalPoints
                  const bScore = b.livePoints !== null ? b.totalPoints + b.livePoints : b.totalPoints
                  return bScore - aScore
                }).map((p) => {
                  const firstTeam = p.firstTeamToScoreId === match.home_team?.id
                    ? match.home_team?.fifa_code
                    : p.firstTeamToScoreId === match.away_team?.id
                      ? match.away_team?.fifa_code
                      : null
                  const isBreakdownOpen = openBreakdownId === p.userId
                  return (
                    <div key={p.userId}>
                      <div className={`flex items-center gap-3 px-4 py-2 ${p.isMe ? "bg-accent/5" : ""}`}>
                        {p.avatarUrl ? (
                          <Image src={p.avatarUrl} alt={p.name} width={20} height={20} className="w-5 h-5 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold shrink-0">
                            {p.name[0]?.toUpperCase() ?? "?"}
                          </div>
                        )}
                        <span className={`text-xs flex-1 min-w-0 truncate ${p.isMe ? "font-semibold text-(--color-accent)" : "text-(--color-muted)"}`}>
                          {p.name}
                        </span>
                        <span className="text-xs font-bold tabular-nums shrink-0">
                          {p.homeGoals} – {p.awayGoals}
                        </span>
                        <span className="text-[11px] text-(--color-muted) w-20 text-right truncate shrink-0">
                          {p.firstGoalScorer ?? (firstTeam ?? "—")}
                        </span>
                        {p.livePoints !== null && p.liveBreakdown ? (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setOpenBreakdownId(isBreakdownOpen ? null : p.userId) }}
                            className="flex items-center gap-0.5 text-[11px] font-bold tabular-nums text-green-400 shrink-0 cursor-pointer select-none"
                          >
                            {p.livePoints} pts
                            <span className={`ml-0.5 text-[9px] transition-transform duration-150 ${isBreakdownOpen ? "rotate-180" : ""}`}>▾</span>
                          </button>
                        ) : (
                          <span className="text-[11px] font-bold tabular-nums text-(--color-accent) w-6 text-right shrink-0">
                            {p.totalPoints}
                          </span>
                        )}
                      </div>

                      {/* Live breakdown panel */}
                      {isBreakdownOpen && p.liveBreakdown && (
                        <div className="mx-4 mb-2 px-3 py-2 bg-green-500/5 border border-green-500/20 rounded-lg space-y-1">
                          {LIVE_BREAKDOWN_ROWS.map((row) => {
                            const pts = p.liveBreakdown![row.key]
                            const earned = pts > 0
                            if (row.key === "correctWinner" && (p.liveBreakdown?.exactScore ?? 0) > 0) return null
                            return (
                              <div key={row.key} className="flex justify-between gap-2 text-xs">
                                <span className={earned ? "text-emerald-400" : "text-white/30"}>
                                  {earned ? "✓" : "✗"} {row.label}
                                </span>
                                <span className={`font-bold ${earned ? "text-emerald-400" : "text-white/20"}`}>
                                  {earned ? `+${pts}` : "+0"}
                                </span>
                              </div>
                            )
                          })}
                          <div className="flex justify-between gap-2 text-xs pt-1 border-t border-green-500/20 mt-1">
                            <span className="text-white/60">Total este partido</span>
                            <span className="font-bold text-green-400">{p.livePoints}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TeamFlag({ team, size = 24 }: { team: { flag_url: string | null; name: string } | null; size?: number }) {
  if (!team?.flag_url) return <div style={{ width: size, height: Math.round(size * 0.7) }} className="bg-white/10 rounded-sm shrink-0" />
  return (
    <Image
      src={team.flag_url}
      alt={team.name}
      width={size}
      height={Math.round(size * 0.7)}
      className="rounded-sm object-cover shrink-0"
    />
  )
}

function DetailCell({ label, value, isStarter }: { label: string; value: string; isStarter?: boolean | null }) {
  return (
    <div className="bg-white/4 rounded-lg px-2 py-2 text-center">
      <p className="text-[10px] text-(--color-muted) uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-xs font-semibold truncate">{value}</p>
      {isStarter === true && (
        <span className="text-[9px] font-semibold text-emerald-400/80 uppercase tracking-wide">titular</span>
      )}
    </div>
  )
}

function stageLabel(stage: string): string {
  const map: Record<string, string> = {
    group: "Grupo",
    round_of_32: "R32",
    round_of_16: "Octavos",
    quarter_final: "Cuartos",
    semi_final: "Semis",
    third_place: "3er lugar",
    final: "Final",
  }
  return map[stage] ?? stage
}
