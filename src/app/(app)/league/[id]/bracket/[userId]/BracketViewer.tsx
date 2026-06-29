"use client"

import { useState } from "react"
import { R32_DEFS, GROUPS, type BracketPredictionData, type TeamInfo } from "@/lib/utils/bracket"

// ── Exported types ─────────────────────────────────────────────────────────────

export interface PtsConfig {
  groups: number
  groupsThird: number
  r32: number
  r16: number
  qf: number
  sf: number
  champion: number
}

export interface GroupPredDetail {
  group: string
  predictedFirst: string | null
  predictedSecond: string | null
  actualFirst: string | null
  actualSecond: string | null
}

export interface SlotPredDetail {
  matchId?: string
  predictedId: string | null
  actualId: string | null
}

export interface BracketBreakdown {
  groups: number
  r32: number
  r16: number
  qf: number
  sf: number
  champion: number
}

export interface BracketDetail {
  groups: GroupPredDetail[]
  r32Thirds: SlotPredDetail[]
  r32: SlotPredDetail[]
  r16: SlotPredDetail[]
  qf: SlotPredDetail[]
  sf: SlotPredDetail[]
  champion: SlotPredDetail
}

export interface KoMatchPrediction {
  dbMatchId: string
  matchId: string
  stage: string
  homeTeamId: string | null
  awayTeamId: string | null
  homeScore: number | null
  awayScore: number | null
  status: string
  winnerId: string | null
  predictedWinnerId: string | null
  pointsPerPick: number
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Flag({ team, size = 20 }: { team: TeamInfo | null | undefined; size?: number }) {
  const h = Math.round(size * 0.67)
  if (!team?.flag_url) {
    return <div style={{ width: size, height: h }} className="rounded-sm bg-white/10 shrink-0" />
  }
  return (
    <img
      src={team.flag_url}
      alt={team.fifa_code}
      style={{ width: size, height: h }}
      className="rounded-sm object-cover shrink-0"
      onError={e => { (e.target as HTMLImageElement).style.opacity = "0" }}
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

function PtsBadge({ points }: { points: number }) {
  return (
    <span className="ml-auto text-[10px] font-semibold text-emerald-400 shrink-0 tabular-nums">
      +{points}
    </span>
  )
}

function SectionHeader({ label, earned }: { label: string; earned?: number }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-(--color-muted)">{label}</p>
      {!!earned && earned > 0 && (
        <span className="text-xs font-semibold text-emerald-400 tabular-nums">+{earned} pts</span>
      )}
    </div>
  )
}

// ── KO stage config ────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  round_of_32:   "Ronda de 32",
  round_of_16:   "Octavos de Final",
  quarter_final: "Cuartos de Final",
  semi_final:    "Semifinales",
  third_place:   "Tercer Lugar",
  final:         "Final",
}

const STAGE_ORDER = ["round_of_32", "round_of_16", "quarter_final", "semi_final", "third_place", "final"]

function calcKoEarned(match: KoMatchPrediction): number | null {
  if (match.status !== "finished") return null
  if (!match.predictedWinnerId) return null
  if (!match.winnerId) return null
  return match.predictedWinnerId === match.winnerId ? match.pointsPerPick : 0
}

// ── BracketViewer ──────────────────────────────────────────────────────────────

interface Props {
  bracket: BracketPredictionData
  teams: TeamInfo[]
  isMe: boolean
  bracketDetail: BracketDetail | null
  bracketBreakdown: BracketBreakdown | null
  bracketPts: PtsConfig
  finishedGroups: Set<string>
  koPredictions: KoMatchPrediction[]
  defaultMode?: "bracket" | "ko"
}

export function BracketViewer({
  bracket, teams, bracketDetail, bracketBreakdown, bracketPts, finishedGroups, koPredictions, defaultMode = "bracket",
}: Props) {
  const [mode, setMode] = useState<"bracket" | "ko">(defaultMode)

  const teamById = Object.fromEntries(teams.map(tm => [tm.id, tm]))
  const t = (id: string | null | undefined): TeamInfo | null =>
    id ? (teamById[id] ?? null) : null

  function resolveR32(slot: typeof R32_DEFS[0]["home"], matchIdx: number): TeamInfo | null {
    if (slot.type === "group") {
      const gp = bracket.groups?.[slot.group]
      return t(slot.pos === 1 ? gp?.first : gp?.second)
    }
    return t(bracket.r32_third?.[matchIdx])
  }

  const champion  = t(bracket.champion)
  const third     = t(bracket.third)
  const finalist1 = t(bracket.sf?.[0])
  const finalist2 = t(bracket.sf?.[1])

  // Split groups total into 1st/2nd picks vs terceros (both live in bracketBreakdown.groups)
  const tercerosPts = (bracketDetail?.r32Thirds ?? [])
    .filter(s => s.predictedId && s.predictedId === s.actualId)
    .length * bracketPts.groupsThird
  const groupsOnlyPts = (bracketBreakdown?.groups ?? 0) - tercerosPts

  // Total bracket points for summary
  const totalBracketPts = bracketBreakdown
    ? Object.values(bracketBreakdown).reduce((a, b) => a + b, 0)
    : null

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex gap-1 p-1 bg-(--color-surface) border border-(--color-border) rounded-lg w-fit">
        {(["bracket", "ko"] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === m
                ? "bg-(--color-accent) text-(--color-background)"
                : "text-(--color-muted) hover:text-(--color-foreground)"
            }`}
          >
            {m === "bracket" ? "Bracket" : "KO"}
          </button>
        ))}
      </div>

      {mode === "bracket" ? (
        <div className="space-y-6">
          {/* Points summary */}
          {totalBracketPts !== null && totalBracketPts > 0 && (
            <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-300 uppercase tracking-widest">Puntos de bracket</span>
              <span className="text-lg font-bold text-emerald-400 tabular-nums">+{totalBracketPts}</span>
            </div>
          )}

          {/* Campeón */}
          <div className="relative bg-linear-to-br from-yellow-500/15 via-yellow-400/5 to-transparent border border-yellow-500/30 rounded-2xl p-6 text-center">
            {bracketDetail?.champion.actualId !== null && bracketDetail?.champion.predictedId === bracketDetail?.champion.actualId && (
              <span className="absolute top-3 right-4 text-sm font-bold text-emerald-400 tabular-nums">+{bracketPts.champion}</span>
            )}
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

          {/* Gran Final */}
          <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-4">
            <SectionHeader label="Gran Final" earned={bracketBreakdown?.sf} />
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 flex items-center gap-1.5">
                <TeamChip team={finalist1} />
                {bracketDetail?.sf[0]?.actualId !== null && bracketDetail?.sf[0]?.predictedId === bracketDetail?.sf[0]?.actualId && (
                  <PtsBadge points={bracketPts.sf} />
                )}
              </div>
              <span className="text-xs text-(--color-muted) font-semibold">vs</span>
              <div className="flex-1 flex justify-end items-center gap-1.5">
                {bracketDetail?.sf[1]?.actualId !== null && bracketDetail?.sf[1]?.predictedId === bracketDetail?.sf[1]?.actualId && (
                  <PtsBadge points={bracketPts.sf} />
                )}
                <TeamChip team={finalist2} />
              </div>
            </div>
            <div className="border-t border-(--color-border)/50 pt-3 flex items-center gap-2">
              <span className="text-xs text-(--color-muted) shrink-0">3er lugar:</span>
              <TeamChip team={third} size={16} />
            </div>
          </div>

          {/* Semifinales */}
          <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-4">
            <SectionHeader label="Semifinales" earned={bracketBreakdown?.qf} />
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map(i => {
                const team = t(bracket.qf?.[i])
                const detail = bracketDetail?.qf[i]
                const correct = detail?.actualId !== null && detail?.predictedId === detail?.actualId
                return (
                  <div key={i} className="flex items-center gap-2 bg-white/4 rounded-lg px-3 py-2">
                    <Flag team={team} size={20} />
                    <span className="text-sm truncate">{team?.name ?? "—"}</span>
                    {correct && <PtsBadge points={bracketPts.qf} />}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Cuartos de Final */}
          <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-4">
            <SectionHeader label="Cuartos de Final" earned={bracketBreakdown?.r16} />
            <div className="grid grid-cols-2 gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
                const team = t(bracket.r16?.[i])
                const detail = bracketDetail?.r16[i]
                const correct = detail?.actualId !== null && detail?.predictedId === detail?.actualId
                return (
                  <div key={i} className="flex items-center gap-2 bg-white/4 rounded-lg px-3 py-2">
                    <Flag team={team} size={18} />
                    <span className="text-xs truncate">{team?.name ?? "—"}</span>
                    {correct && <PtsBadge points={bracketPts.r16} />}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Octavos de Final */}
          <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-4">
            <SectionHeader label="Octavos de Final" earned={bracketBreakdown?.r32} />
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 16 }, (_, i) => {
                const team = t(bracket.r32?.[i])
                const detail = bracketDetail?.r32[i]
                const correct = detail?.actualId !== null && detail?.predictedId === detail?.actualId
                return (
                  <div key={i} className="flex items-center gap-2 bg-white/4 rounded-lg px-3 py-2">
                    <Flag team={team} size={16} />
                    <span className="text-xs truncate">{team?.name ?? "—"}</span>
                    {correct && <PtsBadge points={bracketPts.r32} />}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Ronda de 32 */}
          <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-4">
            <SectionHeader label="Ronda de 32" />
            <div className="space-y-1.5">
              {R32_DEFS.map((def, i) => {
                const home = resolveR32(def.home, i)
                const away = resolveR32(def.away, i)
                return (
                  <div key={i} className="flex items-center gap-2 bg-white/4 rounded-lg px-3 py-2">
                    <span className="text-[10px] text-(--color-muted) font-mono w-8 shrink-0">{def.matchId}</span>
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <Flag team={home} size={16} />
                      <span className="text-xs truncate">{home?.name ?? "—"}</span>
                    </div>
                    <span className="text-[10px] text-(--color-muted) shrink-0">vs</span>
                    <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                      <span className="text-xs truncate text-right">{away?.name ?? "—"}</span>
                      <Flag team={away} size={16} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Terceros que pasan */}
          {bracketDetail?.r32Thirds.some(s => s.predictedId) && (
              <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-4">
                <SectionHeader label="Terceros que pasan" earned={tercerosPts > 0 ? tercerosPts : undefined} />
                <div className="flex flex-wrap gap-1.5">
                  {bracketDetail.r32Thirds.map((slot, i) => {
                    if (!slot.predictedId) return null
                    const team = teamById[slot.predictedId] ?? null
                    const hasResult = slot.actualId !== null
                    const correct = hasResult && slot.predictedId === slot.actualId
                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border ${
                          hasResult
                            ? correct
                              ? "bg-emerald-500/10 border-emerald-500/20"
                              : "bg-red-500/10 border-red-500/20"
                            : "bg-white/4 border-(--color-border)"
                        }`}
                      >
                        <Flag team={team} size={16} />
                        <span className={`text-xs font-medium ${
                          hasResult ? (correct ? "text-emerald-400" : "text-red-400") : ""
                        }`}>
                          {team?.fifa_code ?? "?"}
                        </span>
                        {correct && (
                          <span className="text-[9px] font-semibold text-emerald-400">+{bracketPts.groupsThird}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
          )}

          {/* Grupos */}
          <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-4">
            <SectionHeader label="Grupos" earned={groupsOnlyPts > 0 ? groupsOnlyPts : undefined} />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {GROUPS.map(g => {
                const gp = bracket.groups?.[g]
                const first  = t(gp?.first)
                const second = t(gp?.second)
                const detail = bracketDetail?.groups.find(d => d.group === g)
                const c1 = detail?.actualFirst  !== null && detail?.predictedFirst  === detail?.actualFirst
                const c2 = detail?.actualSecond !== null && detail?.predictedSecond === detail?.actualSecond
                const isLocked = finishedGroups.has(g)
                return (
                  <div key={g} className="bg-white/4 rounded-lg p-2.5">
                    <div className="flex items-center gap-0.5 mb-2">
                      <p className="text-[10px] font-bold text-(--color-muted) uppercase">Grupo {g}</p>
                      {isLocked && <span className="text-[8px] text-emerald-400 ml-0.5">✓</span>}
                    </div>
                    <div className="space-y-1.5">
                      {[
                        { pos: "1°", team: first, correct: c1 },
                        { pos: "2°", team: second, correct: c2 },
                      ].map(({ pos, team, correct }) => (
                        <div key={pos} className="flex items-center gap-1.5">
                          <span className="text-[10px] text-(--color-muted) w-3 shrink-0">{pos}</span>
                          <Flag team={team} size={16} />
                          <span className={`text-xs truncate ${correct ? "text-emerald-400" : ""}`}>
                            {team?.fifa_code ?? "—"}
                          </span>
                          {correct && <span className="text-[9px] font-semibold text-emerald-400 ml-auto">+{bracketPts.groups}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ── KO tab ─────────────────────────────────────────────────────────── */
        <div className="space-y-6">
          {STAGE_ORDER.map(stage => {
            const matches = koPredictions.filter(p => p.stage === stage)
            if (matches.length === 0) return null
            const stagePts = matches.reduce((sum, m) => sum + (calcKoEarned(m) ?? 0), 0)
            const stagePossible = matches[0]?.pointsPerPick ?? 1
            return (
              <div key={stage} className="bg-(--color-surface) border border-(--color-border) rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-(--color-muted)">
                      {STAGE_LABELS[stage] ?? stage}
                    </p>
                    <p className="text-[9px] text-muted/60 mt-0.5">+{stagePossible} pts por ganador</p>
                  </div>
                  {stagePts > 0 && (
                    <span className="text-xs font-semibold text-emerald-400 tabular-nums">+{stagePts} pts</span>
                  )}
                </div>
                <div className="space-y-2">
                  {matches.map(match => {
                    const home      = match.homeTeamId ? (teamById[match.homeTeamId] ?? null) : null
                    const away      = match.awayTeamId ? (teamById[match.awayTeamId] ?? null) : null
                    const predTeam  = match.predictedWinnerId ? (teamById[match.predictedWinnerId] ?? null) : null
                    const hasResult = match.status === "finished"
                    const homeWon   = hasResult && match.winnerId === match.homeTeamId
                    const awayWon   = hasResult && match.winnerId === match.awayTeamId
                    const earned    = calcKoEarned(match)
                    const correct   = earned !== null && earned > 0

                    return (
                      <div key={match.dbMatchId} className="flex items-center gap-2 bg-white/4 rounded-lg px-3 py-2.5">
                        <span className="text-[10px] text-(--color-muted) font-mono w-8 shrink-0">{match.matchId}</span>

                        {/* Home team */}
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <Flag team={home} size={16} />
                          <span className={`text-xs truncate font-medium ${homeWon ? "text-(--color-accent)" : ""}`}>
                            {home?.name ?? "···"}
                          </span>
                        </div>

                        {/* Center: score + predicted winner */}
                        <div className="flex flex-col items-center gap-0.5 shrink-0 min-w-12">
                          <span className={`text-xs font-bold tabular-nums ${
                            hasResult ? "text-(--color-foreground)" :
                            match.status === "live" ? "text-emerald-400" : "text-(--color-muted)"
                          }`}>
                            {hasResult
                              ? `${match.homeScore}-${match.awayScore}`
                              : match.status === "live" ? "EN VIVO" : "vs"}
                          </span>
                          {predTeam ? (
                            <div className={`flex items-center gap-0.5 ${correct ? "text-emerald-400" : earned === 0 ? "text-red-400/70" : "text-(--color-muted)"}`}>
                              <Flag team={predTeam} size={12} />
                              <span className="text-[8px] font-medium">{predTeam.fifa_code}</span>
                            </div>
                          ) : (
                            <span className="text-[9px] text-(--color-muted) italic">—</span>
                          )}
                        </div>

                        {/* Away team */}
                        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                          <span className={`text-xs truncate text-right font-medium ${awayWon ? "text-(--color-accent)" : ""}`}>
                            {away?.name ?? "···"}
                          </span>
                          <Flag team={away} size={16} />
                        </div>

                        {/* Points */}
                        {correct && (
                          <span className="text-[10px] font-semibold text-emerald-400 shrink-0 tabular-nums">+{earned}</span>
                        )}
                        {earned === 0 && predTeam && (
                          <span className="text-[10px] text-red-400/70 shrink-0">0</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {koPredictions.length === 0 && (
            <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-8 text-center">
              <p className="text-(--color-muted) text-sm">Sin pronósticos de partidos KO</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
