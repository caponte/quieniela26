"use client"

import { useState } from "react"
import Link from "next/link"
import type { MatchWithTeams } from "@/lib/utils/matchTypes"
import { formatMatchDate } from "@/lib/utils/date"

const STATUS_TABS = [
  { key: "all", label: "Todos" },
  { key: "live", label: "En vivo" },
  { key: "scheduled", label: "Próximos" },
  { key: "finished", label: "Terminados" },
  { key: "postponed", label: "Postergados" },
] as const

const STAGE_LABELS: Record<string, string> = {
  group: "Grupos",
  round_of_32: "Ronda 32",
  round_of_16: "Octavos",
  quarter_final: "Cuartos",
  semi_final: "Semifinal",
  third_place: "3er Lugar",
  final: "Final",
}

const STATUS_BADGE: Record<string, string> = {
  scheduled: "bg-zinc-700 text-zinc-300",
  live: "bg-green-900 text-green-300",
  finished: "bg-blue-900 text-blue-300",
  postponed: "bg-yellow-900 text-yellow-300",
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Programado",
  live: "En vivo",
  finished: "Terminado",
  postponed: "Postergado",
}

interface Props {
  matches: MatchWithTeams[]
}

export default function AdminMatchList({ matches }: Props) {
  const [filter, setFilter] = useState<string>("all")

  const visible = filter === "all" ? matches : matches.filter(m => m.status === filter)

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === tab.key
                ? "bg-(--color-accent) text-white"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {tab.label}
            {tab.key !== "all" && (
              <span className="ml-1.5 text-xs opacity-70">
                ({matches.filter(m => m.status === tab.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Match list */}
      <div className="space-y-2">
        {visible.length === 0 && (
          <p className="text-(--color-muted) text-sm py-8 text-center">No hay partidos con este filtro.</p>
        )}
        {visible.map(match => (
          <Link
            key={match.id}
            href={`/admin/match/${match.id}`}
            className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors"
          >
            {/* Match number + stage */}
            <div className="w-20 shrink-0 text-center">
              <div className="text-xs text-(--color-muted)">M{match.match_number}</div>
              <div className="text-xs font-medium text-zinc-400">
                {STAGE_LABELS[match.stage] ?? match.stage}
                {match.group_name ? ` ${match.group_name}` : ""}
              </div>
            </div>

            {/* Teams + score */}
            <div className="flex-1 flex items-center gap-3 min-w-0">
              <span className="text-sm font-medium truncate text-right flex-1">
                {match.home_team?.name ?? "?"}
              </span>
              <div className="shrink-0 flex items-center gap-1.5 font-mono text-sm">
                {match.home_score !== null && match.away_score !== null ? (
                  <span className="font-bold text-base">
                    {match.home_score} – {match.away_score}
                  </span>
                ) : (
                  <span className="text-(--color-muted)">vs</span>
                )}
              </div>
              <span className="text-sm font-medium truncate flex-1">
                {match.away_team?.name ?? "?"}
              </span>
            </div>

            {/* Date + status */}
            <div className="shrink-0 text-right hidden sm:block">
              <div className="text-xs text-(--color-muted)">{formatMatchDate(match.match_date)}</div>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[match.status] ?? "bg-zinc-700 text-zinc-300"}`}>
                {STATUS_LABEL[match.status] ?? match.status}
              </span>
            </div>

            <div className="shrink-0 text-zinc-500 text-sm">›</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
