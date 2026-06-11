"use client"

import type { LivePointsBreakdown } from "@/lib/utils/livePoints"

interface Props {
  breakdown: LivePointsBreakdown
  totalAccum: number  // points already accumulated before this match
}

const ROWS: { key: keyof Omit<LivePointsBreakdown, "total">; label: string }[] = [
  { key: "exactScore",       label: "Marcador exacto"      },
  { key: "correctWinner",    label: "Ganador / empate"      },
  { key: "homeGoalsExact",   label: "Goles local exactos"  },
  { key: "awayGoalsExact",   label: "Goles visita exactos" },
  { key: "firstTeamToScore", label: "Primer equipo en marcar" },
  { key: "firstGoalScorer",  label: "Primer goleador"      },
]

export function LivePointsTooltip({ breakdown, totalAccum }: Props) {
  const active = ROWS.filter((r) => breakdown[r.key] > 0)
  const pending = ROWS.filter((r) => breakdown[r.key] === 0)
  const matchTotal = breakdown.total

  return (
    <div className="absolute bottom-full right-0 mb-2 z-50 w-52 rounded-xl border border-white/12 bg-[#1a1f2e] shadow-2xl text-xs pointer-events-none" style={{ filter: "drop-shadow(0 4px 24px rgba(0,0,0,0.6))" }}>
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/8">
        <p className="font-semibold text-white">Puntos este partido</p>
        <p className="text-(--color-muted) mt-0.5">
          {totalAccum} acumulados + <span className="text-green-400 font-bold">{matchTotal}</span> en vivo
          {" = "}
          <span className="text-white font-bold">{totalAccum + matchTotal}</span>
        </p>
      </div>

      {/* Earned */}
      {active.length > 0 && (
        <div className="px-3 py-2 space-y-1">
          {active.map((r) => (
            <div key={r.key} className="flex justify-between gap-2">
              <span className="text-emerald-400">✓ {r.label}</span>
              <span className="font-bold text-emerald-400">+{breakdown[r.key]}</span>
            </div>
          ))}
        </div>
      )}

      {/* Not earned */}
      {pending.length > 0 && (
        <div className={`px-3 py-2 space-y-1 ${active.length > 0 ? "border-t border-white/6" : ""}`}>
          {pending.map((r) => (
            <div key={r.key} className="flex justify-between gap-2">
              <span className="text-white/30">✗ {r.label}</span>
              <span className="text-white/20">+0</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
