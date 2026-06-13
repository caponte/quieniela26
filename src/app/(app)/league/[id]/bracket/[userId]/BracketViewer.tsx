"use client"

import { useState } from "react"
import { R32_DEFS, GROUPS, type BracketPredictionData, type TeamInfo } from "@/lib/utils/bracket"

// ── Diagram layout constants ───────────────────────────────────────────────────
const CARD_W   = 84
const CARD_H   = 44
const CHAMP_H  = 80
const CHAMP_GAP = 20
const V_GAP    = 48
const DG_W     = 1440  // 16 * 90 — each slot is 90px wide

function lY(level: number) {
  return CHAMP_H + CHAMP_GAP + level * (CARD_H + V_GAP)
}
// Center X of card at (level, idx): parent is always centered between its two children
function ccX(level: number, idx: number) {
  return (idx + 0.5) * (DG_W / (1 << level))
}
function clX(level: number, idx: number) {
  return ccX(level, idx) - CARD_W / 2
}

const DG_H = lY(4) + CARD_H + 24

// Precomputed SVG connector paths (one parent → two children, top-down)
const CONNECTOR_PATHS = (() => {
  const s: string[] = []
  for (let l = 0; l < 4; l++) {
    for (let i = 0; i < 1 << l; i++) {
      const px  = ccX(l, i)
      const py  = lY(l) + CARD_H
      const cx0 = ccX(l + 1, 2 * i)
      const cx1 = ccX(l + 1, 2 * i + 1)
      const cy  = lY(l + 1)
      const my  = (py + cy) / 2
      // drop from parent → horizontal bar → drops to children
      s.push(`M${px},${py} V${my} H${cx0} V${cy} M${cx0},${my} H${cx1} V${cy}`)
    }
  }
  return s.join(" ")
})()

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

function DgCard({
  home, away, winnerId, style,
}: {
  home: TeamInfo | null
  away: TeamInfo | null
  winnerId: string | null | undefined
  style?: React.CSSProperties
}) {
  return (
    <div
      className="absolute flex flex-col overflow-hidden rounded-lg border border-(--color-border) bg-(--color-surface)"
      style={{ width: CARD_W, height: CARD_H, ...style }}
    >
      {[{ team: home }, { team: away }].map(({ team }, i) => {
        const win = !!team && winnerId === team.id
        return (
          <div
            key={i}
            className={`flex items-center gap-1 px-1.5 flex-1 min-w-0 ${
              i === 0 ? "border-b border-(--color-border)" : ""
            } ${win ? "bg-(--color-accent)/10" : ""}`}
          >
            {team ? (
              <>
                <img
                  src={team.flag_url ?? ""}
                  alt={team.fifa_code}
                  className="w-4 h-[11px] object-cover rounded-[2px] shrink-0"
                  onError={e => { (e.target as HTMLImageElement).style.opacity = "0" }}
                />
                <span className={`text-[8.5px] truncate leading-none font-medium ${
                  win ? "text-(--color-accent)" : "text-(--color-foreground)"
                }`}>
                  {team.fifa_code}
                </span>
                {win && <span className="ml-auto text-[7px] text-(--color-accent) shrink-0">▲</span>}
              </>
            ) : (
              <span className="text-[8px] text-(--color-muted) italic leading-none">···</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── BracketViewer ──────────────────────────────────────────────────────────────

interface Props {
  bracket: BracketPredictionData
  teams: TeamInfo[]
  isMe: boolean
}

export function BracketViewer({ bracket, teams }: Props) {
  const [mode, setMode] = useState<"lista" | "diagrama">("lista")

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

  // Get the two participants and winner for a match at (level, idx)
  // level 0 = Final (top), level 4 = R32 (bottom)
  function getMatch(level: number, idx: number) {
    if (level === 4) {
      const def = R32_DEFS[idx]
      return { home: resolveR32(def.home, idx), away: resolveR32(def.away, idx), winnerId: bracket.r32?.[idx] }
    }
    if (level === 3) return { home: t(bracket.r32?.[2 * idx]), away: t(bracket.r32?.[2 * idx + 1]), winnerId: bracket.r16?.[idx] }
    if (level === 2) return { home: t(bracket.r16?.[2 * idx]), away: t(bracket.r16?.[2 * idx + 1]), winnerId: bracket.qf?.[idx] }
    if (level === 1) return { home: t(bracket.qf?.[2 * idx]), away: t(bracket.qf?.[2 * idx + 1]), winnerId: bracket.sf?.[idx] }
    // level 0: Final
    return { home: t(bracket.sf?.[0]), away: t(bracket.sf?.[1]), winnerId: bracket.champion }
  }

  const champion  = t(bracket.champion)
  const third     = t(bracket.third)
  const finalist1 = t(bracket.sf?.[0])
  const finalist2 = t(bracket.sf?.[1])

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex gap-1 p-1 bg-(--color-surface) border border-(--color-border) rounded-lg w-fit">
        {(["lista", "diagrama"] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === m
                ? "bg-(--color-accent) text-(--color-background)"
                : "text-(--color-muted) hover:text-(--color-foreground)"
            }`}
          >
            {m === "lista" ? "Lista" : "Diagrama"}
          </button>
        ))}
      </div>

      {mode === "lista" ? (
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

          {/* Gran Final */}
          <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-(--color-muted) mb-3">Gran Final</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1"><TeamChip team={finalist1} /></div>
              <span className="text-xs text-(--color-muted) font-semibold">vs</span>
              <div className="flex-1 flex justify-end"><TeamChip team={finalist2} /></div>
            </div>
            <div className="border-t border-(--color-border)/50 pt-3 flex items-center gap-2">
              <span className="text-xs text-(--color-muted) shrink-0">3er lugar:</span>
              <TeamChip team={third} size={16} />
            </div>
          </div>

          {/* Semifinales */}
          <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-(--color-muted) mb-3">Semifinales</p>
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map(i => {
                const team = t(bracket.qf?.[i])
                return (
                  <div key={i} className="flex items-center gap-2 bg-white/4 rounded-lg px-3 py-2">
                    <Flag team={team} size={20} />
                    <span className="text-sm truncate">{team?.name ?? "—"}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Cuartos de Final */}
          <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-(--color-muted) mb-3">Cuartos de Final</p>
            <div className="grid grid-cols-2 gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
                const team = t(bracket.r16?.[i])
                return (
                  <div key={i} className="flex items-center gap-2 bg-white/4 rounded-lg px-3 py-2">
                    <Flag team={team} size={18} />
                    <span className="text-xs truncate">{team?.name ?? "—"}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Octavos de Final */}
          <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-(--color-muted) mb-3">Octavos de Final</p>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 16 }, (_, i) => {
                const team = t(bracket.r32?.[i])
                return (
                  <div key={i} className="flex items-center gap-2 bg-white/4 rounded-lg px-3 py-2">
                    <Flag team={team} size={16} />
                    <span className="text-xs truncate">{team?.name ?? "—"}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Ronda de 32 */}
          <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-(--color-muted) mb-3">Ronda de 32</p>
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

          {/* Grupos */}
          <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-(--color-muted) mb-4">Grupos</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {GROUPS.map(g => {
                const gp = bracket.groups?.[g]
                const first  = t(gp?.first)
                const second = t(gp?.second)
                return (
                  <div key={g} className="bg-white/4 rounded-lg p-2.5">
                    <p className="text-[10px] font-bold text-(--color-muted) uppercase mb-2">Grupo {g}</p>
                    <div className="space-y-1.5">
                      {[{ pos: "1°", team: first }, { pos: "2°", team: second }].map(({ pos, team }) => (
                        <div key={pos} className="flex items-center gap-1.5">
                          <span className="text-[10px] text-(--color-muted) w-3 shrink-0">{pos}</span>
                          <Flag team={team} size={16} />
                          <span className="text-xs truncate">{team?.fifa_code ?? "—"}</span>
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
        /* ── Diagram view ─────────────────────────────────────────────────────── */
        <div>
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="relative select-none" style={{ width: DG_W, height: DG_H }}>

              {/* Champion at top center */}
              <div
                className="absolute flex flex-col items-center gap-2 text-center"
                style={{ top: 0, left: DG_W / 2 - 80, width: 160 }}
              >
                <p className="text-[9px] font-bold uppercase tracking-widest text-yellow-400/70">Campeón</p>
                <Flag team={champion} size={48} />
                <p className="text-xs font-bold leading-tight">{champion?.name ?? "—"}</p>
              </div>

              {/* Level labels */}
              {[
                { level: 0, label: "Gran Final" },
                { level: 1, label: "Semifinal" },
                { level: 2, label: "Cuartos" },
                { level: 3, label: "Octavos" },
                { level: 4, label: "R32" },
              ].map(({ level, label }) => (
                <div
                  key={level}
                  className="absolute text-[8px] font-bold uppercase tracking-widest text-(--color-muted)"
                  style={{ top: lY(level) + CARD_H / 2 - 5, left: 0 }}
                >
                  {label}
                </div>
              ))}

              {/* SVG connectors */}
              <svg
                width={DG_W}
                height={DG_H}
                className="absolute inset-0 pointer-events-none"
              >
                <path
                  d={CONNECTOR_PATHS}
                  stroke="var(--color-border)"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              {/* Match cards for all levels */}
              {[0, 1, 2, 3, 4].map(level =>
                Array.from({ length: 1 << level }, (_, idx) => {
                  const { home, away, winnerId } = getMatch(level, idx)
                  return (
                    <DgCard
                      key={`${level}-${idx}`}
                      home={home}
                      away={away}
                      winnerId={winnerId}
                      style={{ top: lY(level), left: clX(level, idx) }}
                    />
                  )
                })
              )}
            </div>
          </div>
          <p className="text-center text-[11px] text-(--color-muted) mt-2 md:hidden">
            ← desliza para ver todo el bracket →
          </p>
        </div>
      )}
    </div>
  )
}
