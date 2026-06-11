"use client"

import { useState, useTransition } from "react"
import type { MatchWithTeams, Team } from "@/lib/utils/matchTypes"
import type { MatchStatus, EventType } from "@/lib/supabase/database.types"
import type { MatchEvent, Player } from "./page"
import { updateMatchResult, addMatchEvent, deleteMatchEvent } from "@/lib/actions/admin"

const STATUS_OPTIONS: { value: MatchStatus; label: string }[] = [
  { value: "scheduled", label: "Programado" },
  { value: "live", label: "En vivo" },
  { value: "finished", label: "Terminado" },
  { value: "postponed", label: "Postergado" },
]

const EVENT_TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: "goal", label: "Gol" },
  { value: "penalty", label: "Penal" },
  { value: "red_card", label: "Tarjeta roja" },
  { value: "yellow_card", label: "Tarjeta amarilla" },
]

const EVENT_ICON: Record<EventType, string> = {
  goal: "⚽",
  penalty: "🥅",
  red_card: "🟥",
  yellow_card: "🟨",
}

interface Props {
  match: MatchWithTeams
  homeTeam: Team | null
  awayTeam: Team | null
  events: MatchEvent[]
  players: Player[]
}

export default function MatchAdminPanel({ match, homeTeam, awayTeam, events, players }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Score editor state
  const [homeScore, setHomeScore] = useState<string>(match.home_score?.toString() ?? "")
  const [awayScore, setAwayScore] = useState<string>(match.away_score?.toString() ?? "")
  const [status, setStatus] = useState<MatchStatus>(match.status as MatchStatus)

  // Add event form state
  const [eventType, setEventType] = useState<EventType>("goal")
  const [eventTeam, setEventTeam] = useState<string>(homeTeam?.id ?? "")
  const [eventPlayer, setEventPlayer] = useState("")

  const teamPlayers = players.filter(p => p.team_id === eventTeam)

  function handleTeamChange(teamId: string) {
    setEventTeam(teamId)
    setEventPlayer("")
  }
  const [eventMinute, setEventMinute] = useState("")
  const [isFirstGoal, setIsFirstGoal] = useState(false)
  const [isOwnGoal, setIsOwnGoal] = useState(false)
  const [penaltyScored, setPenaltyScored] = useState(true)
  const [addError, setAddError] = useState<string | null>(null)

  function handleSaveResult() {
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const hs = homeScore.trim() === "" ? null : Number(homeScore)
      const as_ = awayScore.trim() === "" ? null : Number(awayScore)
      const result = await updateMatchResult(match.id, hs, as_, status)
      if (result.error) setError(result.error)
      else setSuccess(true)
    })
  }

  function handleAddEvent() {
    setAddError(null)
    if (!eventTeam) { setAddError("Selecciona un equipo."); return }
    startTransition(async () => {
      const result = await addMatchEvent({
        matchId: match.id,
        type: eventType,
        teamId: eventTeam,
        playerName: eventPlayer.trim() || null,
        minute: eventMinute.trim() ? Number(eventMinute) : null,
        isFirstGoal: eventType === "goal" && isFirstGoal,
        isOwnGoal: eventType === "goal" && isOwnGoal,
        penaltyScored: eventType === "penalty" ? penaltyScored : null,
      })
      if (result.error) setAddError(result.error)
      else {
        setEventPlayer("")
        setEventMinute("")
        setIsFirstGoal(false)
        setIsOwnGoal(false)
        setPenaltyScored(true)
      }
    })
  }

  function handleDeleteEvent(eventId: string) {
    startTransition(async () => {
      await deleteMatchEvent(eventId, match.id)
    })
  }

  const inputClass = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
  const labelClass = "block text-xs text-(--color-muted) mb-1"

  return (
    <div className="space-y-8">
      {/* Score & Status editor */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="font-semibold mb-5">Resultado y estado</h2>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className={labelClass}>{homeTeam?.name ?? "Local"}</label>
            <input
              type="number"
              min={0}
              className={inputClass}
              value={homeScore}
              onChange={e => setHomeScore(e.target.value)}
              placeholder="–"
            />
          </div>
          <div>
            <label className={labelClass}>{awayTeam?.name ?? "Visitante"}</label>
            <input
              type="number"
              min={0}
              className={inputClass}
              value={awayScore}
              onChange={e => setAwayScore(e.target.value)}
              placeholder="–"
            />
          </div>
          <div>
            <label className={labelClass}>Estado</label>
            <select
              className={inputClass}
              value={status}
              onChange={e => setStatus(e.target.value as MatchStatus)}
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        {success && <p className="text-green-400 text-sm mb-3">Guardado correctamente.</p>}

        <button
          onClick={handleSaveResult}
          disabled={isPending}
          className="px-5 py-2 bg-(--color-accent) text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isPending ? "Guardando…" : "Guardar resultado"}
        </button>

        {status === "finished" && (
          <p className="text-xs text-zinc-500 mt-3">
            Al guardar como Terminado se recalculan los puntos automáticamente.
          </p>
        )}
      </section>

      {/* Events section */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="font-semibold mb-5">Eventos del partido</h2>

        {/* Existing events */}
        {events.length === 0 ? (
          <p className="text-sm text-(--color-muted) mb-6">No hay eventos registrados.</p>
        ) : (
          <div className="space-y-2 mb-6">
            {events.map(ev => {
              const teamName = ev.team_id === homeTeam?.id ? homeTeam?.name : awayTeam?.name
              return (
                <div key={ev.id} className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg">
                  <span className="text-lg">{EVENT_ICON[ev.type]}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{teamName}</span>
                    {ev.player_name && (
                      <span className="text-sm text-(--color-muted) ml-2">{ev.player_name}</span>
                    )}
                    {ev.minute && (
                      <span className="text-xs text-(--color-muted) ml-2">{ev.minute}&apos;</span>
                    )}
                    <div className="flex gap-2 mt-0.5 flex-wrap">
                      {ev.is_first_goal && <span className="text-xs text-yellow-400">1er gol</span>}
                      {ev.is_own_goal && <span className="text-xs text-red-400">Autogol</span>}
                      {ev.type === "penalty" && ev.penalty_scored !== null && (
                        <span className={`text-xs ${ev.penalty_scored ? "text-green-400" : "text-red-400"}`}>
                          Penal {ev.penalty_scored ? "anotado" : "fallado"}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteEvent(ev.id)}
                    disabled={isPending}
                    className="text-zinc-500 hover:text-red-400 transition-colors text-sm px-2 py-1 disabled:opacity-50"
                    title="Eliminar evento"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Add event form */}
        <div className="border-t border-zinc-800 pt-5">
          <h3 className="text-sm font-medium mb-4">Agregar evento</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className={labelClass}>Tipo</label>
              <select
                className={inputClass}
                value={eventType}
                onChange={e => setEventType(e.target.value as EventType)}
              >
                {EVENT_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Equipo</label>
              <select
                className={inputClass}
                value={eventTeam}
                onChange={e => handleTeamChange(e.target.value)}
              >
                {homeTeam && <option value={homeTeam.id}>{homeTeam.name}</option>}
                {awayTeam && <option value={awayTeam.id}>{awayTeam.name}</option>}
              </select>
            </div>
            <div>
              <label className={labelClass}>Jugador (opcional)</label>
              <select
                className={inputClass}
                value={eventPlayer}
                onChange={e => setEventPlayer(e.target.value)}
              >
                <option value="">— Sin jugador —</option>
                {teamPlayers.map(p => (
                  <option key={p.id} value={p.name}>
                    {p.jersey_number != null ? `${p.jersey_number}. ` : ""}{p.name} ({p.position})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Minuto (opcional)</label>
              <input
                type="number"
                min={1}
                max={120}
                className={inputClass}
                value={eventMinute}
                onChange={e => setEventMinute(e.target.value)}
                placeholder="ej. 45"
              />
            </div>
          </div>

          {/* Conditional fields */}
          {eventType === "goal" && (
            <div className="flex gap-5 mb-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFirstGoal}
                  onChange={e => setIsFirstGoal(e.target.checked)}
                  className="accent-(--color-accent)"
                />
                Primer gol del partido
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={isOwnGoal}
                  onChange={e => setIsOwnGoal(e.target.checked)}
                  className="accent-(--color-accent)"
                />
                Autogol
              </label>
            </div>
          )}

          {eventType === "penalty" && (
            <div className="flex gap-5 mb-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="penalty_scored"
                  checked={penaltyScored}
                  onChange={() => setPenaltyScored(true)}
                  className="accent-(--color-accent)"
                />
                Anotado
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="penalty_scored"
                  checked={!penaltyScored}
                  onChange={() => setPenaltyScored(false)}
                  className="accent-(--color-accent)"
                />
                Fallado
              </label>
            </div>
          )}

          {addError && <p className="text-red-400 text-sm mb-3">{addError}</p>}

          <button
            onClick={handleAddEvent}
            disabled={isPending}
            className="px-5 py-2 bg-zinc-700 text-white rounded-lg text-sm font-medium hover:bg-zinc-600 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Agregando…" : "Agregar evento"}
          </button>
        </div>
      </section>
    </div>
  )
}
