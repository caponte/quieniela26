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
  } | null
  jornadaSlug: string
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("es-MX", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
    timeZone: "America/Mexico_City",
  })
}

export default function UpcomingMatchCard({ match }: { match: MatchCardData }) {
  const [open, setOpen] = useState(false)
  const pred = match.prediction
  const isLive = match.status === "live"
  const isFinished = match.status === "finished"

  const firstScorerTeam = pred?.first_team_to_score
    ? pred.first_team_to_score === match.home_team?.id
      ? match.home_team?.name
      : match.away_team?.name
    : null

  return (
    <div className="bg-(--color-surface) border border-(--color-border) rounded-xl overflow-hidden transition-colors hover:border-white/20">
      {/* Main row */}
      <button
        className="w-full text-left px-4 py-3 flex items-center gap-3"
        onClick={() => setOpen((o) => !o)}
      >
        {/* Home team */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <TeamFlag team={match.home_team} />
          <span className="font-medium text-sm truncate">{match.home_team?.name ?? "—"}</span>
        </div>

        {/* Center: always real result or "vs", plus meta */}
        <div className="flex flex-col items-center shrink-0 gap-0.5 min-w-[110px]">
          {/* Real score or vs */}
          {isLive ? (
            <span className="text-base font-bold tabular-nums text-red-400">
              {match.home_score} – {match.away_score}
            </span>
          ) : isFinished ? (
            <span className="text-base font-bold tabular-nums text-white/60">
              {match.home_score} – {match.away_score}
            </span>
          ) : (
            <span className="text-xs font-semibold text-(--color-muted) tracking-widest">vs</span>
          )}

          {/* Stage · match number */}
          <span className="text-[10px] text-(--color-muted) leading-tight text-center">
            {isLive && <span className="text-red-400 font-semibold">EN VIVO · </span>}
            {match.group_name ? `Grupo ${match.group_name}` : stageLabel(match.stage)}
            {" · "}M{match.match_number}
          </span>

          {/* Date */}
          <span className="text-[10px] text-(--color-muted)">{formatDate(match.match_date)}</span>

          {/* Prediction indicator */}
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
        </div>

        {/* Away team */}
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="font-medium text-sm truncate text-right">{match.away_team?.name ?? "—"}</span>
          <TeamFlag team={match.away_team} />
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
        <div className="border-t border-(--color-border) px-4 py-3 space-y-3">
          {pred ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest text-(--color-muted)">Tu pronóstico</p>

              {/* Score big */}
              <div className="flex items-center justify-center gap-4">
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

              {/* Details grid */}
              <div className="grid grid-cols-3 gap-2">
                <DetailCell
                  label="Primer gol"
                  value={firstScorerTeam ?? "Ninguno"}
                />
                <DetailCell
                  label="Penales"
                  value={pred.has_penalty ? "Sí" : "No"}
                />
                <DetailCell
                  label="Goleador"
                  value={pred.first_goal_scorer ?? "—"}
                />
              </div>

              <Link
                href={`/predict/match/${match.jornadaSlug}`}
                className="block text-center text-xs text-(--color-accent) hover:underline pt-1"
                onClick={(e) => e.stopPropagation()}
              >
                Editar predicción →
              </Link>
            </>
          ) : (
            <div className="text-center py-1">
              <p className="text-sm text-(--color-muted) mb-2">Aún no has predicho este partido.</p>
              <Link
                href={`/predict/match/${match.jornadaSlug}`}
                className="inline-block text-sm bg-(--color-accent) text-black font-semibold px-4 py-1.5 rounded-lg hover:opacity-90 transition"
                onClick={(e) => e.stopPropagation()}
              >
                Predecir ahora →
              </Link>
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

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/4 rounded-lg px-2 py-2 text-center">
      <p className="text-[10px] text-(--color-muted) uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-xs font-semibold truncate">{value}</p>
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
