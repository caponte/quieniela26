"use client"

import { useState, useTransition } from "react"
import { saveKnockoutPrediction } from "@/lib/actions/knockout-bracket"
import {
  R16_INFO, QF_INFO, SF_INFO, FINAL_INFO, THIRD_INFO,
  R32_DEFS,
  type TeamInfo,
} from "@/lib/utils/bracket"
import {
  emptyKnockoutPrediction,
  isKnockoutLocked,
  R32_MATCH_NUMS,
  R16_PAIRS, QF_PAIRS, SF_PAIRS,
  type KnockoutPredictionData,
} from "@/lib/utils/knockout-bracket"

// ── Layout constants (same as BracketForm) ───────────────────────────────────

const CARD_W  = 168
const CARD_H  = 76
const HDR_H   = 24
const COL_X   = [20, 232, 444, 656, 868]
const TOTAL_W = 1056
const TOTAL_H = 1278

const r32Top    = (i: number) => 42 + i * 76
const r16Top    = (i: number) => 80 + i * 152
const qfTop     = (i: number) => 156 + i * 304
const SF_TOPS   = [308, 916]
const FINAL_TOP = 612

const center = (top: number) => top + CARD_H / 2

function buildPaths(): string {
  const segs: string[] = []
  function connect(colSrc: number, srcTops: number[], colDst: number, dstTops: number[]) {
    const xR = COL_X[colSrc] + CARD_W
    const xL = COL_X[colDst]
    const xM = (xR + xL) / 2
    for (let i = 0; i < dstTops.length; i++) {
      const y1 = center(srcTops[2 * i])
      const y2 = center(srcTops[2 * i + 1])
      const yt = center(dstTops[i])
      segs.push(`M${xR},${y1} H${xM} V${y2} M${xR},${y2} H${xM} M${xM},${yt} H${xL}`)
    }
  }
  connect(0, Array.from({ length: 16 }, (_, i) => r32Top(i)),  1, Array.from({ length: 8 }, (_, i) => r16Top(i)))
  connect(1, Array.from({ length: 8  }, (_, i) => r16Top(i)),  2, Array.from({ length: 4 }, (_, i) => qfTop(i)))
  connect(2, Array.from({ length: 4  }, (_, i) => qfTop(i)),   3, SF_TOPS)
  connect(3, SF_TOPS, 4, [FINAL_TOP])
  return segs.join(" ")
}

const CONNECTOR_D = buildPaths()

// ── Sub-components ────────────────────────────────────────────────────────────

function Flag({ team }: { team: TeamInfo | null }) {
  if (!team) return <div className="w-5 h-3.5 rounded-sm bg-(--color-surface-2) shrink-0" />
  return (
    <img
      src={team.flag_url ?? ""}
      alt={team.fifa_code}
      className="w-5 h-3.5 object-cover rounded-sm shrink-0"
      onError={e => { (e.target as HTMLImageElement).style.display = "none" }}
    />
  )
}

function TeamRow({
  team, isWinner, clickable, isLast, onClick,
}: {
  team: TeamInfo | null
  isWinner: boolean
  clickable: boolean
  isLast: boolean
  onClick?: () => void
}) {
  const base = "flex-1 flex items-center gap-1.5 px-2 w-full text-left transition-colors"
  const border = isLast ? "" : "border-b border-(--color-border)"
  const bg = isWinner
    ? "bg-(--color-accent)/10"
    : clickable ? "hover:bg-(--color-surface-2) cursor-pointer" : "cursor-default"

  return (
    <button
      onClick={e => { e.stopPropagation(); onClick?.() }}
      disabled={!clickable}
      className={`${base} ${border} ${bg}`}
    >
      {team ? (
        <>
          <Flag team={team} />
          <span className={`text-[9.5px] font-semibold truncate leading-none ${isWinner ? "text-(--color-accent)" : "text-(--color-foreground)"}`}>
            {team.name}
          </span>
          {isWinner && <span className="ml-auto text-(--color-accent) text-[8px] shrink-0">▶</span>}
        </>
      ) : (
        <span className="text-[9.5px] text-(--color-muted) italic leading-none">···</span>
      )}
    </button>
  )
}

function MatchCard({
  matchId, date,
  homeTeam, awayTeam,
  winnerId, isFinal, locked,
  onHomeClick, onAwayClick,
  style,
}: {
  matchId: string; date: string
  homeTeam: TeamInfo | null; awayTeam: TeamInfo | null
  winnerId: string | null
  isFinal?: boolean; locked: boolean
  onHomeClick: () => void; onAwayClick: () => void
  style?: React.CSSProperties
}) {
  const bothPresent = !!homeTeam && !!awayTeam
  const homeClickable = !locked && bothPresent
  const awayClickable = !locked && bothPresent

  return (
    <div
      className={`absolute flex flex-col overflow-hidden rounded-[10px] border-[1.5px] ${
        isFinal
          ? "border-(--color-accent) shadow-[0_6px_24px_rgba(250,204,21,0.25)]"
          : "border-(--color-border) shadow-sm"
      }`}
      style={{ width: CARD_W, height: CARD_H, ...style }}
    >
      <div
        className={`flex items-center justify-between shrink-0 px-2 border-b border-(--color-border) ${
          isFinal ? "bg-(--color-accent)/10" : "bg-(--color-surface-2)"
        }`}
        style={{ height: HDR_H }}
      >
        <span className="text-[9px] font-black text-(--color-accent)">{matchId}</span>
        <span className="text-[9px] text-(--color-muted)">{date}</span>
      </div>
      <TeamRow
        team={homeTeam} isWinner={!!homeTeam && winnerId === homeTeam.id}
        clickable={homeClickable} isLast={false}
        onClick={homeClickable ? onHomeClick : undefined}
      />
      <TeamRow
        team={awayTeam} isWinner={!!awayTeam && winnerId === awayTeam.id}
        clickable={awayClickable} isLast
        onClick={awayClickable ? onAwayClick : undefined}
      />
    </div>
  )
}

function ColHeader({ label, x, isFinal }: { label: string; x: number; isFinal?: boolean }) {
  return (
    <div
      className={`absolute flex items-center justify-center rounded-[8px] ${
        isFinal ? "bg-(--color-accent)" : "bg-(--color-surface-2)"
      }`}
      style={{ left: x, top: 0, width: CARD_W, height: 32 }}
    >
      <span className={`text-[10px] font-black uppercase tracking-[0.12em] ${isFinal ? "text-(--color-background)" : "text-(--color-foreground)"}`}>
        {isFinal ? "🏆 " : ""}{label}
      </span>
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface R32MatchRow {
  id: string
  match_number: number
  match_date: string
  home_team_id: string
  away_team_id: string
}

interface Props {
  teams: TeamInfo[]
  teamById: Record<string, TeamInfo>
  r32Matches: R32MatchRow[]
  firstR32Date: string | null
  existing: KnockoutPredictionData | null
  locked: boolean
}

// ── KnockoutBracketForm ───────────────────────────────────────────────────────

export function KnockoutBracketForm({ teams, teamById, r32Matches, firstR32Date, existing, locked }: Props) {
  // Build a map from match_number → R32MatchRow
  const r32ByMatchNum = Object.fromEntries(r32Matches.map(m => [m.match_number, m]))

  // For each bracket slot, look up the real R32 match
  function getR32Match(slot: number): R32MatchRow | null {
    return r32ByMatchNum[R32_MATCH_NUMS[slot]] ?? null
  }

  function getR32Teams(slot: number): [TeamInfo | null, TeamInfo | null] {
    const m = getR32Match(slot)
    if (!m) return [null, null]
    return [
      teamById[m.home_team_id] ?? null,
      teamById[m.away_team_id] ?? null,
    ]
  }

  const [pred, setPred] = useState<KnockoutPredictionData>(() => {
    if (existing) return { ...emptyKnockoutPrediction(), ...existing }
    return emptyKnockoutPrediction()
  })

  const [isPending, startTransition] = useTransition()
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle")
  const [saveError, setSaveError] = useState<string | null>(null)

  // Re-check lock client-side (firstR32Date can change since we hydrated)
  const clientLocked = locked || isKnockoutLocked(firstR32Date ? new Date(firstR32Date) : null)

  // ── Getters ────────────────────────────────────────────────────────────────

  function getKnockoutTeams(round: "r16" | "qf" | "sf", slot: number): [TeamInfo | null, TeamInfo | null] {
    const pairs = round === "r16" ? R16_PAIRS : round === "qf" ? QF_PAIRS : SF_PAIRS
    const [a, b] = pairs[slot]
    const prev = round === "r16" ? pred.r32 : round === "qf" ? pred.r16 : pred.qf
    return [
      prev[a] ? (teamById[prev[a]!] ?? null) : null,
      prev[b] ? (teamById[prev[b]!] ?? null) : null,
    ]
  }

  function getFinalTeams(): [TeamInfo | null, TeamInfo | null] {
    return [
      pred.sf[0] ? (teamById[pred.sf[0]] ?? null) : null,
      pred.sf[1] ? (teamById[pred.sf[1]] ?? null) : null,
    ]
  }

  function getThirdPlaceTeams(): [TeamInfo | null, TeamInfo | null] {
    const [h0, a0] = getKnockoutTeams("sf", 0)
    const [h1, a1] = getKnockoutTeams("sf", 1)
    const w0 = pred.sf[0]; const w1 = pred.sf[1]
    const l0 = !w0 ? null : w0 === h0?.id ? a0 : w0 === a0?.id ? h0 : null
    const l1 = !w1 ? null : w1 === h1?.id ? a1 : w1 === a1?.id ? h1 : null
    return [l0, l1]
  }

  // ── Setters ────────────────────────────────────────────────────────────────

  function setKnockoutPick(round: "r32" | "r16" | "qf" | "sf", slot: number, teamId: string | null) {
    if (clientLocked) return
    setPred(prev => {
      const arr = [...prev[round]]
      arr[slot] = teamId
      if (round === "r32") {
        const s16 = Math.floor(slot / 2); const r16 = [...prev.r16]; r16[s16] = null
        const sqf = Math.floor(s16 / 2);  const qf  = [...prev.qf];  qf[sqf]  = null
        const ssf = Math.floor(sqf / 2);  const sf  = [...prev.sf];  sf[ssf]  = null
        return { ...prev, r32: arr, r16, qf, sf, third: null, champion: null }
      }
      if (round === "r16") {
        const sqf = Math.floor(slot / 2); const qf = [...prev.qf]; qf[sqf] = null
        const ssf = Math.floor(sqf / 2);  const sf = [...prev.sf]; sf[ssf] = null
        return { ...prev, r16: arr, qf, sf, third: null, champion: null }
      }
      if (round === "qf") {
        const ssf = Math.floor(slot / 2); const sf = [...prev.sf]; sf[ssf] = null
        return { ...prev, qf: arr, sf, third: null, champion: null }
      }
      if (round === "sf") return { ...prev, sf: arr, third: null, champion: null }
      return prev
    })
  }

  function handleR32Click(slot: number, team: TeamInfo | null) {
    if (clientLocked || !team) return
    const other = pred.r32[slot]
    setKnockoutPick("r32", slot, other === team.id ? null : team.id)
  }

  function handleKnockoutClick(round: "r16" | "qf" | "sf", slot: number, team: TeamInfo | null) {
    if (clientLocked || !team) return
    const arr = round === "r16" ? pred.r16 : round === "qf" ? pred.qf : pred.sf
    setKnockoutPick(round, slot, arr[slot] === team.id ? null : team.id)
  }

  function handleFinalClick(team: TeamInfo | null) {
    if (clientLocked || !team) return
    setPred(p => ({ ...p, champion: p.champion === team.id ? null : team.id }))
  }

  function handleThirdClick(team: TeamInfo | null) {
    if (clientLocked || !team) return
    setPred(p => ({ ...p, third: p.third === team.id ? null : team.id }))
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  function handleSave() {
    setSaveError(null)
    startTransition(async () => {
      const res = await saveKnockoutPrediction(pred)
      if (res.error) { setSaveStatus("error"); setSaveError(res.error) }
      else { setSaveStatus("saved"); setTimeout(() => setSaveStatus("idle"), 3000) }
    })
  }

  // ── Progress ───────────────────────────────────────────────────────────────

  const totalDone = pred.r32.filter(Boolean).length
    + pred.r16.filter(Boolean).length
    + pred.qf.filter(Boolean).length
    + pred.sf.filter(Boolean).length
    + (pred.champion ? 1 : 0)
  const totalNeeded = 16 + 8 + 4 + 2 + 1  // 31

  // ── Render ─────────────────────────────────────────────────────────────────

  const [ft1, ft2] = getFinalTeams()
  const [tp1, tp2] = getThirdPlaceTeams()

  // No R32 matches yet
  if (r32Matches.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-4xl">⏳</p>
        <h1 className="text-xl font-bold">Bracket Eliminatorio</h1>
        <p className="text-(--color-muted) text-sm">
          Disponible una vez que termine la fase de grupos y se conozcan los 32 clasificados.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="space-y-4 pt-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Bracket Eliminatorio</h1>
            <p className="text-xs text-(--color-muted) mt-1">
              Predice la eliminatoria con los 32 clasificados reales.
            </p>
            {firstR32Date && !clientLocked && (
              <p className="text-xs text-(--color-muted) mt-1">
                Se cierra 10 min antes del primer partido:{" "}
                <span className="text-(--color-foreground) font-medium">
                  {new Date(firstR32Date).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}{" "}
                  {new Date(firstR32Date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </p>
            )}
          </div>
          {!clientLocked && (
            <button
              onClick={handleSave}
              disabled={isPending}
              className="shrink-0 px-4 py-2 bg-(--color-primary) hover:bg-(--color-primary-hover) text-white rounded-xl text-sm font-medium transition disabled:opacity-60"
            >
              {isPending ? "Guardando…" : saveStatus === "saved" ? "¡Guardado!" : "Guardar"}
            </button>
          )}
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex-1 bg-(--color-surface-2) rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-(--color-accent) transition-all rounded-full"
              style={{ width: `${(totalDone / totalNeeded) * 100}%` }}
            />
          </div>
          <span className="text-(--color-muted) shrink-0">{totalDone}/{totalNeeded} picks</span>
        </div>

        {/* Banners */}
        {clientLocked && (
          <div className="bg-yellow-900/30 border border-yellow-700 text-yellow-300 rounded-xl px-4 py-3 text-sm">
            El bracket eliminatorio está bloqueado. Ya no se pueden hacer cambios.
          </div>
        )}
        {saveStatus === "error" && saveError && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-xl px-4 py-3 text-sm">
            {saveError}
          </div>
        )}

        {/* Points info */}
        <div className="bg-(--color-surface) border border-(--color-border) rounded-xl px-4 py-3 text-xs text-(--color-muted) flex flex-wrap gap-x-4 gap-y-1">
          <span>R32 <span className="text-(--color-foreground) font-semibold">1pt</span></span>
          <span>Octavos <span className="text-(--color-foreground) font-semibold">2pts</span></span>
          <span>Cuartos <span className="text-(--color-foreground) font-semibold">3pts</span></span>
          <span>Semis / 3° <span className="text-(--color-foreground) font-semibold">4pts</span></span>
          <span>Campeón <span className="text-(--color-foreground) font-semibold">5pts</span></span>
        </div>

        {/* Bracket */}
        <div className="relative">
          <div className="overflow-x-auto -mx-4 px-4">
            <div
              className="relative select-none"
              style={{ width: TOTAL_W, height: TOTAL_H }}
            >
              {/* SVG connectors */}
              <svg width={TOTAL_W} height={TOTAL_H} className="absolute inset-0 pointer-events-none">
                <path
                  d={CONNECTOR_D}
                  stroke="var(--color-border)"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              {/* Column headers */}
              <ColHeader label="Ronda de 32" x={COL_X[0]} />
              <ColHeader label="Octavos"     x={COL_X[1]} />
              <ColHeader label="Cuartos"     x={COL_X[2]} />
              <ColHeader label="Semifinal"   x={COL_X[3]} />
              <ColHeader label="Gran Final"  x={COL_X[4]} isFinal />

              {/* R32 cards — real teams, click to toggle winner */}
              {R32_DEFS.map((def, i) => {
                const [homeTeam, awayTeam] = getR32Teams(i)
                return (
                  <MatchCard
                    key={i}
                    matchId={def.matchId} date={def.date}
                    homeTeam={homeTeam} awayTeam={awayTeam}
                    winnerId={pred.r32[i]}
                    locked={clientLocked}
                    onHomeClick={() => handleR32Click(i, homeTeam)}
                    onAwayClick={() => handleR32Click(i, awayTeam)}
                    style={{ top: r32Top(i), left: COL_X[0] }}
                  />
                )
              })}

              {/* R16 cards */}
              {R16_INFO.map((info, i) => {
                const [h, a] = getKnockoutTeams("r16", i)
                return (
                  <MatchCard
                    key={i}
                    matchId={info.matchId} date={info.date}
                    homeTeam={h} awayTeam={a}
                    winnerId={pred.r16[i]}
                    locked={clientLocked}
                    onHomeClick={() => handleKnockoutClick("r16", i, h)}
                    onAwayClick={() => handleKnockoutClick("r16", i, a)}
                    style={{ top: r16Top(i), left: COL_X[1] }}
                  />
                )
              })}

              {/* QF cards */}
              {QF_INFO.map((info, i) => {
                const [h, a] = getKnockoutTeams("qf", i)
                return (
                  <MatchCard
                    key={i}
                    matchId={info.matchId} date={info.date}
                    homeTeam={h} awayTeam={a}
                    winnerId={pred.qf[i]}
                    locked={clientLocked}
                    onHomeClick={() => handleKnockoutClick("qf", i, h)}
                    onAwayClick={() => handleKnockoutClick("qf", i, a)}
                    style={{ top: qfTop(i), left: COL_X[2] }}
                  />
                )
              })}

              {/* SF cards */}
              {SF_INFO.map((info, i) => {
                const [h, a] = getKnockoutTeams("sf", i)
                return (
                  <MatchCard
                    key={i}
                    matchId={info.matchId} date={info.date}
                    homeTeam={h} awayTeam={a}
                    winnerId={pred.sf[i]}
                    locked={clientLocked}
                    onHomeClick={() => handleKnockoutClick("sf", i, h)}
                    onAwayClick={() => handleKnockoutClick("sf", i, a)}
                    style={{ top: SF_TOPS[i], left: COL_X[3] }}
                  />
                )
              })}

              {/* Final card */}
              <MatchCard
                matchId={FINAL_INFO.matchId} date={FINAL_INFO.date}
                homeTeam={ft1} awayTeam={ft2}
                winnerId={pred.champion}
                isFinal locked={clientLocked}
                onHomeClick={() => handleFinalClick(ft1)}
                onAwayClick={() => handleFinalClick(ft2)}
                style={{ top: FINAL_TOP, left: COL_X[4] }}
              />
            </div>
          </div>
          <div className="md:hidden pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l from-(--color-background) to-transparent" />
        </div>
        <p className="md:hidden text-center text-[11px] text-(--color-muted) mt-1">← desliza para ver todas las rondas →</p>

        {/* Third place */}
        <div className="mt-2">
          <p className="text-xs font-bold text-(--color-muted) uppercase tracking-wider mb-2">Tercer Puesto</p>
          <div
            className="relative flex flex-col overflow-hidden rounded-[10px] border-[1.5px] border-(--color-border) shadow-sm"
            style={{ width: CARD_W, height: CARD_H }}
          >
            <div
              className="flex items-center justify-between shrink-0 px-2 bg-(--color-surface-2) border-b border-(--color-border)"
              style={{ height: HDR_H }}
            >
              <span className="text-[9px] font-black text-(--color-accent)">{THIRD_INFO.matchId}</span>
              <span className="text-[9px] text-(--color-muted)">{THIRD_INFO.date}</span>
            </div>
            <TeamRow
              team={tp1} isWinner={!!tp1 && pred.third === tp1.id}
              clickable={!clientLocked && !!tp1 && !!tp2}
              isLast={false}
              onClick={() => handleThirdClick(tp1)}
            />
            <TeamRow
              team={tp2} isWinner={!!tp2 && pred.third === tp2.id}
              clickable={!clientLocked && !!tp1 && !!tp2}
              isLast
              onClick={() => handleThirdClick(tp2)}
            />
          </div>
        </div>

        {/* Bottom save */}
        {!clientLocked && (
          <div className="pb-8">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="w-full py-3 bg-(--color-primary) hover:bg-(--color-primary-hover) text-white rounded-xl text-sm font-medium transition disabled:opacity-60"
            >
              {isPending ? "Guardando…" : saveStatus === "saved" ? "¡Guardado!" : "Guardar bracket eliminatorio"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
