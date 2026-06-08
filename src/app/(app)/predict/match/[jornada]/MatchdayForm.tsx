"use client"

import { useState, useTransition, useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { saveMatchPrediction } from "@/lib/actions/match"
import { isMatchLocked } from "@/lib/utils/jornada"
import type { JornadaSlug } from "@/lib/utils/jornada"
import type { MatchWithTeams, MatchPredictionRow, PlayerRow, Team } from "@/lib/utils/matchTypes"

type Match = MatchWithTeams
type Player = PlayerRow
type Prediction = MatchPredictionRow

interface MatchState {
  homeGoals: number
  awayGoals: number
  firstTeamToScore: string | null
  hasPenalty: boolean
  scorerId: string | null
  scorerName: string | null
}

// ── Props ──────────────────────────────────────────────────────────────────

interface Props {
  slug: JornadaSlug
  label: string
  matches: Match[]
  predictionsByMatchId: Record<string, Prediction>
  players: Player[]
}

// ── Helpers ────────────────────────────────────────────────────────────────

function initState(match: Match, pred: Prediction | undefined): MatchState {
  return {
    homeGoals: pred?.home_goals ?? 0,
    awayGoals: pred?.away_goals ?? 0,
    firstTeamToScore: pred?.first_team_to_score ?? null,
    hasPenalty: pred?.has_penalty ?? false,
    scorerId: pred?.first_goal_scorer_id ?? null,
    scorerName: pred?.first_goal_scorer ?? null,
  }
}

function formatMatchDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString("es-MX", {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

// ── Main component ─────────────────────────────────────────────────────────

export default function MatchdayForm({ slug, label, matches, predictionsByMatchId, players }: Props) {
  const [current, setCurrent] = useState(0)
  const [states, setStates] = useState<MatchState[]>(() =>
    matches.map((m) => initState(m, predictionsByMatchId[m.id]))
  )
  const [saved, setSaved] = useState<Set<number>>(() => {
    const s = new Set<number>()
    matches.forEach((m, i) => { if (predictionsByMatchId[m.id]) s.add(i) })
    return s
  })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [scorerSearch, setScorerSearch] = useState("")

  const match = matches[current]
  const state = states[current]
  const locked = isMatchLocked(new Date(match.match_date))
    || match.status === "live"
    || match.status === "finished"
    || match.status === "postponed"
  const alreadyFinished = match.status === "finished"

  const matchPlayers = useMemo(() => {
    const homeId = match.home_team?.id
    const awayId = match.away_team?.id
    return players.filter((p) => p.team_id === homeId || p.team_id === awayId)
  }, [match, players])

  const filteredPlayers = useMemo(() => {
    if (!scorerSearch.trim()) return matchPlayers
    const q = scorerSearch.toLowerCase()
    return matchPlayers.filter(
      (p) => p.name.toLowerCase().includes(q) || String(p.jersey_number ?? "").includes(q)
    )
  }, [matchPlayers, scorerSearch])

  function updateState(patch: Partial<MatchState>) {
    setStates((prev) => prev.map((s, i) => i === current ? { ...s, ...patch } : s))
  }

  function goTo(index: number) {
    setError(null)
    setScorerSearch("")
    setCurrent(index)
  }

  function handleSaveAndNext() {
    setError(null)
    startTransition(async () => {
      const res = await saveMatchPrediction({
        matchId: match.id,
        homeGoals: state.homeGoals,
        awayGoals: state.awayGoals,
        firstTeamToScore: state.firstTeamToScore,
        hasPenalty: state.hasPenalty,
        firstGoalScorerName: state.scorerName,
        firstGoalScorerId: state.scorerId,
        jornadaSlug: slug,
      })
      if (res.error) {
        setError(res.error)
        return
      }
      setSaved((prev) => new Set(prev).add(current))
      if (current < matches.length - 1) {
        goTo(current + 1)
      }
    })
  }

  const progress = Math.round((saved.size / matches.length) * 100)

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => current > 0 ? goTo(current - 1) : undefined}
          className={`text-(--color-muted) hover:text-white transition-colors ${current === 0 ? "invisible" : ""}`}
          aria-label="Partido anterior"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <Link
          href="/predict/match"
          className="flex flex-col items-center gap-0.5 group"
        >
          <span className="text-xs text-(--color-muted) group-hover:text-white transition-colors flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Jornadas
          </span>
          <span className="text-sm font-medium text-white">
            {label} · Partido {current + 1} de {matches.length}
          </span>
        </Link>
        <button
          onClick={() => current < matches.length - 1 && goTo(current + 1)}
          disabled={current >= matches.length - 1}
          className="text-(--color-muted) hover:text-white transition-colors disabled:opacity-30"
          aria-label="Siguiente"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-white/8 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-(--color-accent) rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Match header */}
      <div className="text-center mb-6">
        <p className="text-xs text-(--color-muted) mb-3">
          M{match.match_number} · {formatMatchDate(match.match_date)}
          {match.group_name && ` · Grupo ${match.group_name}`}
        </p>

        <div className="flex items-center justify-center gap-6">
          <TeamDisplay team={match.home_team} side="home" />
          <span className="text-2xl font-bold text-(--color-muted)">vs</span>
          <TeamDisplay team={match.away_team} side="away" />
        </div>

        {alreadyFinished && match.home_score !== null && (
          <p className="text-sm mt-3 text-(--color-muted)">
            Resultado: {match.home_score} – {match.away_score}
          </p>
        )}

        {locked && (
          <p className="text-xs mt-2 text-amber-400 font-medium">
            Este partido ya está bloqueado — solo lectura
          </p>
        )}
      </div>

      {/* Prediction form */}
      <div className="flex flex-col gap-5">

        {/* Score picker */}
        <Section title="Resultado">
          <div className="flex items-center justify-center gap-6">
            <GoalPicker
              value={state.homeGoals}
              disabled={locked}
              onChange={(v) => updateState({ homeGoals: v })}
              label={match.home_team?.fifa_code ?? "LOC"}
            />
            <span className="text-2xl font-bold">:</span>
            <GoalPicker
              value={state.awayGoals}
              disabled={locked}
              onChange={(v) => updateState({ awayGoals: v })}
              label={match.away_team?.fifa_code ?? "VIS"}
            />
          </div>
        </Section>

        {/* First team to score */}
        <Section title="Primer equipo en marcar">
          <div className="flex gap-2">
            {[
              { id: match.home_team?.id ?? "home", label: match.home_team?.name ?? "Local" },
              { id: null, label: "Ninguno" },
              { id: match.away_team?.id ?? "away", label: match.away_team?.name ?? "Visitante" },
            ].map((opt) => (
              <button
                key={String(opt.id)}
                disabled={locked}
                onClick={() => updateState({ firstTeamToScore: opt.id })}
                className={`flex-1 py-2 px-1 rounded-lg text-sm font-medium border transition-colors ${
                  state.firstTeamToScore === opt.id
                    ? "border-(--color-accent) bg-accent/10 text-(--color-accent)"
                    : "border-white/10 text-(--color-muted) hover:border-white/20 hover:text-white"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Section>

        {/* Penalty */}
        <Section title="¿Habrá penales?">
          <div className="flex gap-2">
            {[false, true].map((val) => (
              <button
                key={String(val)}
                disabled={locked}
                onClick={() => updateState({ hasPenalty: val })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  state.hasPenalty === val
                    ? "border-(--color-accent) bg-accent/10 text-(--color-accent)"
                    : "border-white/10 text-(--color-muted) hover:border-white/20 hover:text-white"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {val ? "Sí" : "No"}
              </button>
            ))}
          </div>
        </Section>

        {/* First goal scorer */}
        <Section title="Primer goleador">
          {matchPlayers.length === 0 ? (
            <p className="text-sm text-(--color-muted) text-center py-2">Sin convocados disponibles</p>
          ) : (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Buscar jugador..."
                value={scorerSearch}
                disabled={locked}
                onChange={(e) => setScorerSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm placeholder:text-(--color-muted) focus:outline-none focus:border-accent/50 disabled:opacity-50"
              />
              <div className="max-h-48 overflow-y-auto scrollbar-thin flex flex-col gap-1">
                <button
                  disabled={locked}
                  onClick={() => updateState({ scorerId: null, scorerName: null })}
                  className={`text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    state.scorerId === null
                      ? "bg-accent/10 text-(--color-accent)"
                      : "text-(--color-muted) hover:bg-white/5 hover:text-white"
                  } disabled:opacity-50`}
                >
                  — Ninguno / No sé
                </button>
                <ScorerGroup
                  team={match.home_team}
                  players={filteredPlayers.filter((p) => p.team_id === match.home_team?.id)}
                  selectedId={state.scorerId}
                  locked={locked}
                  onSelect={(p) => updateState({ scorerId: p.id, scorerName: p.name })}
                />
                <ScorerGroup
                  team={match.away_team}
                  players={filteredPlayers.filter((p) => p.team_id === match.away_team?.id)}
                  selectedId={state.scorerId}
                  locked={locked}
                  onSelect={(p) => updateState({ scorerId: p.id, scorerName: p.name })}
                />
                {filteredPlayers.length === 0 && scorerSearch && (
                  <p className="text-xs text-(--color-muted) px-3 py-2">Sin resultados</p>
                )}
              </div>
            </div>
          )}
        </Section>

        {error && (
          <p className="text-sm text-red-400 text-center">{error}</p>
        )}

        {/* Actions */}
        {!locked && (
          <button
            onClick={handleSaveAndNext}
            disabled={isPending}
            className="w-full py-3 rounded-xl font-semibold text-sm bg-(--color-accent) text-black hover:opacity-90 active:scale-98 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending
              ? "Guardando..."
              : current < matches.length - 1
                ? "Guardar y siguiente →"
                : "Guardar predicción ✓"
            }
          </button>
        )}

        {saved.has(current) && !isPending && (
          <p className="text-xs text-emerald-400 text-center">
            ✓ Predicción guardada
          </p>
        )}
      </div>

      {/* Match navigation with flags */}
      <div className="flex flex-wrap justify-center gap-1.5 mt-8">
        {matches.map((m, i) => {
          const isSaved = saved.has(i)
          const isLocked = isMatchLocked(new Date(m.match_date)) || m.status === "live" || m.status === "finished" || m.status === "postponed"
          return (
            <button
              key={m.id}
              onClick={() => goTo(i)}
              title={`M${m.match_number} · ${m.home_team?.name ?? "?"} vs ${m.away_team?.name ?? "?"}`}
              className={`flex items-center gap-0.5 rounded-md p-0.5 border transition-all ${
                i === current
                  ? "border-(--color-accent) scale-110 shadow-[0_0_0_1px_var(--color-accent)]"
                  : isSaved
                    ? "border-emerald-500/60 hover:border-emerald-400"
                    : isLocked
                      ? "border-white/8 opacity-40"
                      : "border-white/15 hover:border-white/35"
              }`}
            >
              <MiniFlag url={m.home_team?.flag_url ?? null} name={m.home_team?.name ?? ""} />
              <MiniFlag url={m.away_team?.flag_url ?? null} name={m.away_team?.name ?? ""} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function TeamDisplay({ team, side }: { team: Team | null; side: "home" | "away" }) {
  return (
    <div className={`flex flex-col items-center gap-1 w-24 ${side === "away" ? "items-center" : "items-center"}`}>
      {team?.flag_url ? (
        <Image src={team.flag_url} alt={team.name} width={40} height={28} className="rounded-sm object-cover" />
      ) : (
        <div className="w-10 h-7 bg-white/10 rounded-sm" />
      )}
      <span className="text-sm font-semibold text-center leading-tight">{team?.name ?? "—"}</span>
    </div>
  )
}

function GoalPicker({ value, disabled, onChange, label }: {
  value: number
  disabled: boolean
  onChange: (v: number) => void
  label: string
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-(--color-muted)">{label}</span>
      <div className="flex items-center gap-3">
        <button
          disabled={disabled || value <= 0}
          onClick={() => onChange(value - 1)}
          className="w-8 h-8 rounded-full border border-white/15 flex items-center justify-center text-lg font-bold text-(--color-muted) hover:border-white/30 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          −
        </button>
        <span className="text-3xl font-bold w-8 text-center tabular-nums">{value}</span>
        <button
          disabled={disabled}
          onClick={() => onChange(value + 1)}
          className="w-8 h-8 rounded-full border border-white/15 flex items-center justify-center text-lg font-bold text-(--color-muted) hover:border-white/30 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          +
        </button>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-(--color-muted) mb-2">{title}</p>
      {children}
    </div>
  )
}

function ScorerGroup({
  team, players, selectedId, locked, onSelect,
}: {
  team: Team | null
  players: Player[]
  selectedId: string | null
  locked: boolean
  onSelect: (p: Player) => void
}) {
  if (!team || players.length === 0) return null
  return (
    <>
      <div className="flex items-center gap-2 px-3 pt-2 pb-0.5">
        {team.flag_url && (
          <Image src={team.flag_url} alt={team.name} width={16} height={11} className="rounded-sm object-cover shrink-0" />
        )}
        <span className="text-xs font-semibold text-(--color-muted) uppercase tracking-wider">{team.name}</span>
      </div>
      {players.map((p) => (
        <button
          key={p.id}
          disabled={locked}
          onClick={() => onSelect(p)}
          className={`text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${
            selectedId === p.id
              ? "bg-accent/10 text-(--color-accent)"
              : "text-(--color-muted) hover:bg-white/5 hover:text-white"
          } disabled:opacity-50`}
        >
          {p.jersey_number !== null && (
            <span className="text-xs w-5 text-right opacity-60 tabular-nums">{p.jersey_number}</span>
          )}
          <span>{p.name}</span>
          {p.position && (
            <span className="text-xs opacity-50 ml-auto">{p.position}</span>
          )}
        </button>
      ))}
    </>
  )
}

function MiniFlag({ url, name }: { url: string | null; name: string }) {
  if (!url) return <div className="w-4 h-2.75 rounded-sm bg-white/10 shrink-0" />
  return (
    <Image src={url} alt={name} width={16} height={11} className="rounded-sm object-cover shrink-0" />
  )
}
