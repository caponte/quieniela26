"use client"

import { useState, useTransition, useMemo } from "react"
import Image from "next/image"
import { saveMatchPrediction } from "@/lib/actions/match"
import { isMatchLocked } from "@/lib/utils/jornada"
import type { JornadaSlug } from "@/lib/utils/jornada"
import type { MatchWithTeams, MatchPredictionRow, PlayerRow, Team, MatchResultEvents, GoalEvent } from "@/lib/utils/matchTypes"

type Match = MatchWithTeams
type Player = PlayerRow
type Prediction = MatchPredictionRow

export interface LeagueMemberPred {
  userId: string
  name: string
  avatarUrl: string | null
  homeGoals: number
  awayGoals: number
  firstTeamToScoreId: string | null
  firstGoalScorer: string | null
  hasPenalty: boolean
  isMe: boolean
  totalPoints: number
  matchPoints: number | null
  finishedBreakdown: Record<string, boolean> | null
  livePoints: number | null
  liveBreakdown: import("@/lib/utils/livePoints").LivePointsBreakdown | null
}

const FINISHED_BREAKDOWN_ROWS: { key: string; label: string; pts: number }[] = [
  { key: "exact_score",         label: "Marcador exacto",          pts: 3 },
  { key: "correct_winner",      label: "Ganador / empate",         pts: 1 },
  { key: "home_goals_exact",    label: "Goles local exactos",      pts: 1 },
  { key: "away_goals_exact",    label: "Goles visita exactos",     pts: 1 },
  { key: "first_team_to_score", label: "Primer equipo en marcar",  pts: 1 },
  { key: "first_goal_scorer",   label: "Primer goleador",          pts: 3 },
  { key: "has_penalty",         label: "Penales (sí/no)",          pts: 1 },
]

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

interface MatchState {
  homeGoals: number
  awayGoals: number
  firstTeamToScore: string | null
  hasPenalty: boolean
  scorerId: string | null
  scorerName: string | null
}

// ── Props ──────────────────────────────────────────────────────────────────

interface PreviousResult {
  id: string
  homeCode: string
  awayCode: string
  homeScore: number
  awayScore: number
  homeTeamId: string | null
  awayTeamId: string | null
}

interface Props {
  slug: JornadaSlug
  label: string
  matches: Match[]
  predictionsByMatchId: Record<string, Prediction>
  players: Player[]
  leaguePredsByMatchId: Record<string, LeagueMemberPred[]>
  matchResultEventsByMatchId: Record<string, MatchResultEvents>
  starterFifaIdsByMatchId: Record<string, string[]>
  previousResults?: PreviousResult[]
  initialMatchId?: string
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

const DAYS_ES = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"]
const MONTHS_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]

function formatMatchDate(dateStr: string) {
  const d = new Date(dateStr)
  const day = DAYS_ES[d.getDay()]
  const date = d.getDate()
  const month = MONTHS_ES[d.getMonth()]
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${day} ${date} ${month}, ${hh}:${mm}`
}

// ── Constants ──────────────────────────────────────────────────────────────

const POS_ORDER: Record<string, number> = { FWD: 0, MID: 1, DEF: 2, GK: 3 }

// ── Main component ─────────────────────────────────────────────────────────

export default function MatchdayForm({ slug, label, matches, predictionsByMatchId, players, leaguePredsByMatchId, matchResultEventsByMatchId, starterFifaIdsByMatchId, previousResults, initialMatchId }: Props) {
  const [current, setCurrent] = useState(() => {
    if (!initialMatchId) return 0
    const idx = matches.findIndex((m) => m.id === initialMatchId)
    return idx >= 0 ? idx : 0
  })
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

  const matchPlayers = useMemo(() => {
    const homeId = match.home_team?.id
    const awayId = match.away_team?.id
    return players
      .filter((p) => p.team_id === homeId || p.team_id === awayId)
      .sort((a, b) => {
        const posA = POS_ORDER[a.position ?? ""] ?? 4
        const posB = POS_ORDER[b.position ?? ""] ?? 4
        if (posA !== posB) return posA - posB
        return (a.jersey_number ?? 99) - (b.jersey_number ?? 99)
      })
  }, [match, players])

  const starterSet = useMemo(() => {
    const ids = starterFifaIdsByMatchId[match.id]
    return ids && ids.length > 0 ? new Set(ids) : null
  }, [match.id, starterFifaIdsByMatchId])

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
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-sm font-medium text-white">
            {label} · Partido {current + 1} de {matches.length}
          </span>
        </div>
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
          <TeamDisplay
            team={match.home_team}
            side="home"
            prevResults={previousResults?.filter(
              (r) => r.homeTeamId === match.home_team?.id || r.awayTeamId === match.home_team?.id
            )}
          />
          <span className="text-2xl font-bold text-(--color-muted)">vs</span>
          <TeamDisplay
            team={match.away_team}
            side="away"
            prevResults={previousResults?.filter(
              (r) => r.homeTeamId === match.away_team?.id || r.awayTeamId === match.away_team?.id
            )}
          />
        </div>

        {locked && (
          <p className="text-xs mt-2 text-amber-400 font-medium">
            Este partido ya está bloqueado — solo lectura
          </p>
        )}
      </div>

      {/* Prediction form or locked summary */}
      <div className="flex flex-col gap-5">

        {locked ? (
          <LockedMatchSummary
            match={match}
            state={state}
            hasPrediction={saved.has(current)}
            leaguePreds={leaguePredsByMatchId[match.id] ?? []}
            resultEvents={matchResultEventsByMatchId[match.id] ?? null}
          />
        ) : (
          <>
            {/* Score picker */}
            <Section title="Resultado">
              <div className="flex items-center justify-center gap-6">
                <GoalPicker
                  value={state.homeGoals}
                  disabled={false}
                  onChange={(v) => updateState({ homeGoals: v })}
                  label={match.home_team?.fifa_code ?? "LOC"}
                />
                <span className="text-2xl font-bold">:</span>
                <GoalPicker
                  value={state.awayGoals}
                  disabled={false}
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
                    onClick={() => updateState({ firstTeamToScore: opt.id })}
                    className={`flex-1 py-2 px-1 rounded-lg text-sm font-medium border transition-colors ${
                      state.firstTeamToScore === opt.id
                        ? "border-(--color-accent) bg-accent/10 text-(--color-accent)"
                        : "border-white/10 text-(--color-muted) hover:border-white/20 hover:text-white"
                    }`}
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
                    onClick={() => updateState({ hasPenalty: val })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      state.hasPenalty === val
                        ? "border-(--color-accent) bg-accent/10 text-(--color-accent)"
                        : "border-white/10 text-(--color-muted) hover:border-white/20 hover:text-white"
                    }`}
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
                    onChange={(e) => setScorerSearch(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm placeholder:text-(--color-muted) focus:outline-none focus:border-accent/50"
                  />
                  <div className="max-h-72 overflow-y-auto scrollbar-thin flex flex-col gap-1">
                    <button
                      onClick={() => updateState({ scorerId: null, scorerName: null })}
                      className={`text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        state.scorerId === null
                          ? "bg-accent/10 text-(--color-accent)"
                          : "text-(--color-muted) hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      — Ninguno / No sé
                    </button>
                    <ScorerGroup
                      team={match.home_team}
                      players={filteredPlayers.filter((p) => p.team_id === match.home_team?.id)}
                      selectedId={state.scorerId}
                      locked={false}
                      starterSet={starterSet}
                      onSelect={(p) => updateState({ scorerId: p.id, scorerName: p.name })}
                    />
                    <ScorerGroup
                      team={match.away_team}
                      players={filteredPlayers.filter((p) => p.team_id === match.away_team?.id)}
                      selectedId={state.scorerId}
                      locked={false}
                      starterSet={starterSet}
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

            {saved.has(current) && !isPending && (
              <p className="text-xs text-emerald-400 text-center">
                ✓ Predicción guardada
              </p>
            )}
          </>
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

function TeamDisplay({ team, prevResults }: { team: Team | null; side: "home" | "away"; prevResults?: PreviousResult[] }) {
  return (
    <div className="flex flex-col items-center gap-1 w-24">
      {team?.flag_url ? (
        <Image src={team.flag_url} alt={team.name} width={40} height={28} className="rounded-sm object-cover" />
      ) : (
        <div className="w-10 h-7 bg-white/10 rounded-sm" />
      )}
      <span className="text-sm font-semibold text-center leading-tight">{team?.name ?? "—"}</span>
      {prevResults && prevResults.map((prevResult) => {
        const isHome = team?.id === prevResult.homeTeamId
        const oppCode = isHome ? prevResult.awayCode : prevResult.homeCode
        const myScore = isHome ? prevResult.homeScore : prevResult.awayScore
        const oppScore = isHome ? prevResult.awayScore : prevResult.homeScore
        const won = myScore > oppScore
        const draw = myScore === oppScore
        const cls = won
          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
          : draw
            ? "bg-white/8 text-white/50 border border-white/12"
            : "bg-red-500/15 text-red-400 border border-red-500/30"
        return (
          <span key={prevResult.id} className={`text-[10px] tabular-nums rounded-full px-2 py-0.5 ${cls}`}>
            vs. {oppCode} {myScore}–{oppScore}
          </span>
        )
      })}
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

const POSITION_LABEL: Record<string, string> = { FWD: "Delanteros", MID: "Mediocampistas", DEF: "Defensas", GK: "Porteros" }

function ScorerGroup({
  team, players, selectedId, locked, starterSet, onSelect,
}: {
  team: Team | null
  players: Player[]
  selectedId: string | null
  locked: boolean
  starterSet: Set<string> | null
  onSelect: (p: Player) => void
}) {
  if (!team || players.length === 0) return null

  const posOrder = ["FWD", "MID", "DEF", "GK", "—"]

  function sortByPos(a: Player, b: Player) {
    const pa = POS_ORDER[a.position ?? ""] ?? 4
    const pb = POS_ORDER[b.position ?? ""] ?? 4
    if (pa !== pb) return pa - pb
    return (a.jersey_number ?? 99) - (b.jersey_number ?? 99)
  }

  function isStarter(p: Player) {
    return starterSet !== null && p.fifa_player_id != null && starterSet.has(p.fifa_player_id)
  }

  function renderPlayer(p: Player) {
    const starter = isStarter(p)
    return (
      <button
        key={p.id}
        disabled={locked}
        onClick={() => onSelect(p)}
        className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${
          selectedId === p.id
            ? "bg-accent/10 text-(--color-accent)"
            : "text-(--color-muted) hover:bg-white/5 hover:text-white"
        } disabled:opacity-50`}
      >
        {p.picture_url ? (
          <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0">
            <Image src={p.picture_url} alt={p.name} fill sizes="120px" quality={90} className="object-cover object-top scale-[2.2] origin-[50%_8%]" />
          </div>
        ) : (
          <span className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold shrink-0">
            {p.name[0]?.toUpperCase() ?? "?"}
          </span>
        )}
        {p.jersey_number !== null && (
          <span className="text-xs w-5 text-right opacity-60 tabular-nums">{p.jersey_number}</span>
        )}
        <span className="flex-1">{p.name}</span>
        {starterSet !== null && (
          <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-sm shrink-0 ${
            starter
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-white/5 text-white/25"
          }`}>
            {starter ? "TIT" : "SUP"}
          </span>
        )}
      </button>
    )
  }

  const teamHeader = (
    <div className="flex items-center gap-2 px-3 pt-2 pb-0.5">
      {team.flag_url && (
        <Image src={team.flag_url} alt={team.name} width={16} height={11} className="rounded-sm object-cover shrink-0" />
      )}
      <span className="text-xs font-semibold text-(--color-muted) uppercase tracking-wider">{team.name}</span>
    </div>
  )

  const grouped = players.reduce<Record<string, Player[]>>((acc, p) => {
    const pos = p.position ?? "—"
    if (!acc[pos]) acc[pos] = []
    acc[pos].push(p)
    return acc
  }, {})
  const sortedPositions = posOrder.filter((pos) => grouped[pos]?.length > 0)

  return (
    <>
      {teamHeader}
      {sortedPositions.map((pos) => (
        <div key={pos}>
          <p className="px-3 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/25">
            {POSITION_LABEL[pos] ?? pos}
          </p>
          {grouped[pos].sort(sortByPos).map(renderPlayer)}
        </div>
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

function lastName(fullName: string | null): string {
  if (!fullName) return "—"
  const parts = fullName.trim().split(" ")
  return parts[parts.length - 1]
}

function LockedMatchSummary({ match, state, hasPrediction, leaguePreds, resultEvents }: {
  match: Match
  state: MatchState
  hasPrediction: boolean
  leaguePreds: LeagueMemberPred[]
  resultEvents: MatchResultEvents | null
}) {
  const meId = leaguePreds.find(p => p.isMe)?.userId ?? null
  const [openBreakdownId, setOpenBreakdownId] = useState<string | null>(meId)
  const isLive = match.status === "live"
  const isFinished = match.status === "finished"
  const hasRealResult = (isLive || isFinished) && match.home_score !== null && match.away_score !== null

  return (
    <div className="flex flex-col gap-4">
      {/* Real result */}
      {hasRealResult && (
        <div className={`rounded-xl border p-4 text-center ${isLive ? "border-green-500/40 bg-green-500/5" : "border-white/10 bg-white/3"}`}>
          {isLive && (
            <p className="text-xs font-bold uppercase tracking-widest text-green-400 mb-2 flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
              En vivo{resultEvents?.matchTime ? ` · ${resultEvents.matchTime}` : ""}
            </p>
          )}
          {!isLive && <p className="text-xs font-semibold uppercase tracking-widest text-(--color-muted) mb-3">Resultado</p>}
          <div className="flex items-center justify-center gap-4">
            <div className="flex flex-col items-center gap-1 w-20">
              {match.home_team?.flag_url && (
                <Image src={match.home_team.flag_url} alt={match.home_team.name} width={32} height={22} className="rounded-sm object-cover" />
              )}
              <span className="text-xs text-(--color-muted)">{match.home_team?.name ?? "—"}</span>
            </div>
            <span className={`text-3xl font-bold tabular-nums ${isLive ? "text-green-400" : ""}`}>
              {match.home_score} – {match.away_score}
            </span>
            <div className="flex flex-col items-center gap-1 w-20">
              {match.away_team?.flag_url && (
                <Image src={match.away_team.flag_url} alt={match.away_team.name} width={32} height={22} className="rounded-sm object-cover" />
              )}
              <span className="text-xs text-(--color-muted)">{match.away_team?.name ?? "—"}</span>
            </div>
          </div>

          {/* Live goal events */}
          {isLive && resultEvents?.goalEvents && resultEvents.goalEvents.length > 0 && (() => {
            const homeGoals = resultEvents.goalEvents!.filter((g: GoalEvent) => g.team_id === match.home_team?.id)
            const awayGoals = resultEvents.goalEvents!.filter((g: GoalEvent) => g.team_id === match.away_team?.id)
            return (
              <div className="mt-3 pt-3 border-t border-green-500/20 flex justify-between gap-2">
                <div className="flex flex-col gap-0.5 flex-1 items-start">
                  {homeGoals.map((g: GoalEvent, i: number) => (
                    <span key={i} className="text-[11px] text-white/50 leading-tight">
                      ⚽ {lastName(g.player_name)}{g.minute ? ` ${g.minute}'` : ""}{g.penalty_scored ? " (P)" : ""}{g.is_own_goal ? " (OG)" : ""}
                    </span>
                  ))}
                </div>
                <div className="flex flex-col gap-0.5 flex-1 items-end">
                  {awayGoals.map((g: GoalEvent, i: number) => (
                    <span key={i} className="text-[11px] text-white/50 leading-tight">
                      {g.penalty_scored ? "(P) " : ""}{g.is_own_goal ? "(OG) " : ""}{g.minute ? `${g.minute}' ` : ""}{lastName(g.player_name)} ⚽
                    </span>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Match result events */}
          {!isLive && resultEvents && (
            <div className="mt-3 pt-3 border-t border-white/8 flex flex-col gap-1.5 text-xs text-(--color-muted)">
              <div className="flex items-center gap-2">
                <span className="w-4 text-center">⚽</span>
                <span>Primer goleador:</span>
                <span className="text-white font-medium">{resultEvents.firstGoalScorerName ?? "Sin goles"}</span>
              </div>
              {resultEvents.firstGoalTeamId && (
                <div className="flex items-center gap-2">
                  <span className="w-4 text-center">🏳️</span>
                  <span>Primer equipo:</span>
                  <span className="flex items-center gap-1.5 text-white font-medium">
                    {(() => {
                      const team = resultEvents.firstGoalTeamId === match.home_team?.id
                        ? match.home_team
                        : resultEvents.firstGoalTeamId === match.away_team?.id
                          ? match.away_team
                          : null
                      return team ? (
                        <>
                          {team.flag_url && <Image src={team.flag_url} alt={team.name} width={16} height={11} className="rounded-sm object-cover" />}
                          {team.fifa_code}
                        </>
                      ) : "—"
                    })()}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="w-4 text-center">🟨</span>
                <span>Penal:</span>
                <span className="text-white font-medium">{resultEvents.hasPenalty ? "Sí" : "No"}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* League predictions table */}
      {leaguePreds.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/3">
          <div className="px-4 py-2.5 border-b border-white/8">
            <p className="text-xs font-semibold uppercase tracking-widest text-(--color-muted)">Predicciones de la liga</p>
          </div>
          <div className="divide-y divide-white/6">
            {[...leaguePreds].sort((a, b) => {
              const aScore = a.livePoints !== null ? a.totalPoints + a.livePoints : (a.matchPoints ?? 0)
              const bScore = b.livePoints !== null ? b.totalPoints + b.livePoints : (b.matchPoints ?? 0)
              return bScore - aScore
            }).map((pred) => {
              const firstTeamName = pred.firstTeamToScoreId === match.home_team?.id
                ? match.home_team?.fifa_code
                : pred.firstTeamToScoreId === match.away_team?.id
                  ? match.away_team?.fifa_code
                  : null
              const isBreakdownOpen = openBreakdownId === pred.userId
              return (
                <div key={pred.userId}>
                  <div
                    className={`flex items-center gap-3 px-4 py-2.5 ${pred.isMe ? "bg-accent/5" : ""}`}
                  >
                    {/* Avatar */}
                    {pred.avatarUrl ? (
                      <Image src={pred.avatarUrl} alt={pred.name} width={24} height={24} className="w-6 h-6 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {pred.name[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}

                    {/* Name */}
                    <span className={`text-sm flex-1 min-w-0 truncate ${pred.isMe ? "font-semibold text-(--color-accent)" : ""}`}>
                      {pred.name}
                    </span>

                    {/* Score */}
                    <span className="text-sm font-bold tabular-nums shrink-0">
                      {pred.homeGoals} – {pred.awayGoals}
                    </span>

                    {/* First scorer */}
                    <span className="text-xs text-(--color-muted) w-24 text-right truncate shrink-0">
                      {pred.firstGoalScorer ?? (firstTeamName ?? "—")}
                    </span>

                    {/* Points */}
                    {pred.livePoints !== null && pred.liveBreakdown ? (
                      <button
                        type="button"
                        onClick={() => setOpenBreakdownId(isBreakdownOpen ? null : pred.userId)}
                        className="flex items-center gap-0.5 text-xs font-bold tabular-nums text-green-400 shrink-0 cursor-pointer select-none"
                      >
                        {pred.livePoints}
                        <span className="text-green-400 ml-0.5">pts</span>
                        <span className={`ml-0.5 text-[10px] transition-transform duration-150 ${isBreakdownOpen ? "rotate-180" : ""}`}>▾</span>
                      </button>
                    ) : pred.matchPoints !== null ? (
                      <button
                        type="button"
                        onClick={() => setOpenBreakdownId(isBreakdownOpen ? null : pred.userId)}
                        className="flex items-center gap-0.5 text-xs font-bold tabular-nums text-(--color-accent) shrink-0 cursor-pointer select-none"
                      >
                        {pred.matchPoints}
                        <span className={`ml-0.5 text-[10px] transition-transform duration-150 ${isBreakdownOpen ? "rotate-180" : ""}`}>▾</span>
                      </button>
                    ) : null}
                  </div>

                  {/* Live breakdown panel */}
                  {isBreakdownOpen && pred.liveBreakdown && (
                    <div className="px-4 pb-3 pt-1 bg-green-500/5 border-t border-green-500/20 space-y-1">
                      {LIVE_BREAKDOWN_ROWS.map((row) => {
                        const pts = pred.liveBreakdown![row.key]
                        const earned = pts > 0
                        if (row.key === "correctWinner" && (pred.liveBreakdown?.exactScore ?? 0) > 0) return null
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
                        <span className="font-bold text-green-400">{pred.livePoints}</span>
                      </div>
                    </div>
                  )}

                  {/* Finished breakdown panel */}
                  {isBreakdownOpen && pred.finishedBreakdown && (
                    <div className="px-4 pb-3 pt-1 bg-white/3 border-t border-white/6 space-y-1">
                      {FINISHED_BREAKDOWN_ROWS.map((row) => {
                        const earned = pred.finishedBreakdown![row.key] === true
                        // Hide correct_winner when exact_score was earned (it's implicit and not awarded separately)
                        if (row.key === "correct_winner" && pred.finishedBreakdown!["exact_score"] === true) return null
                        return (
                          <div key={row.key} className="flex justify-between gap-2 text-xs">
                            <span className={earned ? "text-emerald-400" : "text-white/30"}>
                              {earned ? "✓" : "✗"} {row.label}
                            </span>
                            <span className={`font-bold ${earned ? "text-emerald-400" : "text-white/20"}`}>
                              {earned ? `+${row.pts}` : "+0"}
                            </span>
                          </div>
                        )
                      })}
                      <div className="flex justify-between gap-2 text-xs pt-1 border-t border-white/8 mt-1">
                        <span className="text-white/60">Total este partido</span>
                        <span className="font-bold text-white">{pred.matchPoints}</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {!hasPrediction && (
            <div className="px-4 py-2 border-t border-white/8">
              <p className="text-xs text-(--color-muted) text-center">No hiciste predicción para este partido</p>
            </div>
          )}
        </div>
      )}

      {leaguePreds.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/3 p-4 text-center">
          <p className="text-sm text-(--color-muted)">
            {hasPrediction
              ? "Nadie más en tu liga ha predicho este partido aún."
              : "No hiciste predicción para este partido."}
          </p>
        </div>
      )}
    </div>
  )
}
