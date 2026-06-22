"use client"

import { useState } from "react"
import Image from "next/image"
import { R32_DEFS, type TeamInfo } from "@/lib/utils/bracket"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ActualMatchSlot {
  homeTeamId: string | null
  awayTeamId: string | null
  homeScore: number | null
  awayScore: number | null
  winnerId: string | null
  status: "scheduled" | "live" | "finished"
}

export interface ActualSlots {
  r32: ActualMatchSlot[]
  r16: ActualMatchSlot[]
  qf:  ActualMatchSlot[]
  sf:  ActualMatchSlot[]
  final: ActualMatchSlot
  third: ActualMatchSlot
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

export interface MemberBracketPoints {
  userId: string
  name: string
  avatarUrl: string | null
  totalPoints: number
  breakdown: {
    groups: number
    r32: number
    r16: number
    qf: number
    sf: number
    champion: number
  }
  detail: {
    groups: GroupPredDetail[]
    r32Thirds: SlotPredDetail[]
    r32: SlotPredDetail[]
    r16: SlotPredDetail[]
    qf: SlotPredDetail[]
    sf: SlotPredDetail[]
    champion: SlotPredDetail
  }
}

// ── Diagram layout constants ──────────────────────────────────────────────────

const CARD_W   = 96
const CARD_H   = 44
const CHAMP_H  = 80
const CHAMP_GAP = 20
const V_GAP    = 48
const DG_W     = 1440

function lY(level: number) {
  return CHAMP_H + CHAMP_GAP + level * (CARD_H + V_GAP)
}
function ccX(level: number, idx: number) {
  return (idx + 0.5) * (DG_W / (1 << level))
}
function clX(level: number, idx: number) {
  return ccX(level, idx) - CARD_W / 2
}

const DG_H = lY(4) + CARD_H + 24

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
      s.push(`M${px},${py} V${my} H${cx0} V${cy} M${cx0},${my} H${cx1} V${cy}`)
    }
  }
  return s.join(" ")
})()

// ── Sub-components ────────────────────────────────────────────────────────────

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

function MatchRow({
  slot,
  matchId,
  teamById,
}: {
  slot: ActualMatchSlot
  matchId?: string
  teamById: Record<string, TeamInfo>
}) {
  const home = slot.homeTeamId ? (teamById[slot.homeTeamId] ?? null) : null
  const away = slot.awayTeamId ? (teamById[slot.awayTeamId] ?? null) : null
  const finished = slot.status === "finished"
  const live = slot.status === "live"

  return (
    <div className="flex items-center gap-2 bg-white/4 rounded-lg px-3 py-2">
      {matchId && (
        <span className="text-[10px] text-(--color-muted) font-mono w-8 shrink-0">{matchId}</span>
      )}
      <div className={`flex items-center gap-1.5 flex-1 min-w-0 ${finished && slot.winnerId === slot.homeTeamId ? "text-(--color-accent)" : ""}`}>
        <Flag team={home} size={16} />
        <span className={`text-xs truncate font-medium ${finished && slot.winnerId === slot.homeTeamId ? "text-(--color-accent)" : ""}`}>
          {home?.name ?? "···"}
        </span>
      </div>
      <span className={`text-xs font-bold tabular-nums shrink-0 min-w-7 text-center ${live ? "text-emerald-400" : "text-(--color-muted)"}`}>
        {finished && slot.homeScore != null && slot.awayScore != null
          ? `${slot.homeScore}-${slot.awayScore}`
          : live ? "EN VIVO" : "vs"}
      </span>
      <div className={`flex items-center gap-1.5 flex-1 min-w-0 justify-end ${finished && slot.winnerId === slot.awayTeamId ? "text-(--color-accent)" : ""}`}>
        <span className={`text-xs truncate text-right font-medium ${finished && slot.winnerId === slot.awayTeamId ? "text-(--color-accent)" : ""}`}>
          {away?.name ?? "···"}
        </span>
        <Flag team={away} size={16} />
      </div>
    </div>
  )
}

function LiveDgCard({
  slot,
  teamById,
  style,
}: {
  slot: ActualMatchSlot
  teamById: Record<string, TeamInfo>
  style?: React.CSSProperties
}) {
  const home = slot.homeTeamId ? (teamById[slot.homeTeamId] ?? null) : null
  const away = slot.awayTeamId ? (teamById[slot.awayTeamId] ?? null) : null
  const isLive = slot.status === "live"

  return (
    <div
      className={`absolute flex flex-col overflow-hidden rounded-lg border bg-(--color-surface) ${
        isLive ? "border-emerald-500/60" : "border-(--color-border)"
      }`}
      style={{ width: CARD_W, height: CARD_H, ...style }}
    >
      {[
        { team: home, score: slot.homeScore },
        { team: away, score: slot.awayScore },
      ].map(({ team, score }, i) => {
        const win = !!team && slot.winnerId === team.id
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
                  className="w-4 h-2.75 object-cover rounded-xs shrink-0"
                  onError={e => { (e.target as HTMLImageElement).style.opacity = "0" }}
                />
                <span className={`text-[8.5px] truncate leading-none font-medium flex-1 min-w-0 ${
                  win ? "text-(--color-accent)" : "text-(--color-foreground)"
                }`}>
                  {team.fifa_code}
                </span>
                {score != null && (
                  <span className={`text-[8.5px] font-bold tabular-nums shrink-0 ${
                    win ? "text-(--color-accent)" : "text-(--color-muted)"
                  }`}>
                    {score}
                  </span>
                )}
                {win && <span className="ml-0.5 text-[7px] text-(--color-accent) shrink-0">▲</span>}
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

// ── Main component ────────────────────────────────────────────────────────────

export interface PtsConfig {
  groups: number
  groupsThird: number
  r32: number
  r16: number
  qf: number
  sf: number
  champion: number
}

interface Props {
  actualSlots: ActualSlots
  teams: TeamInfo[]
  memberPoints: MemberBracketPoints[]
  currentUserId: string
  pts: PtsConfig
}

const EMPTY_SLOT: ActualMatchSlot = {
  homeTeamId: null, awayTeamId: null,
  homeScore: null, awayScore: null,
  winnerId: null, status: "scheduled",
}

// ── Member detail sub-component ───────────────────────────────────────────────

const GROUPS_ORDER = ["A","B","C","D","E","F","G","H","I","J","K","L"] as const

function TeamChip({
  slot,
  teamById,
  ptsEach,
}: {
  slot: SlotPredDetail
  teamById: Record<string, TeamInfo>
  ptsEach: number
}) {
  if (!slot.predictedId) return null
  const correct = slot.predictedId === slot.actualId
  const team = teamById[slot.predictedId] ?? null
  return (
    <div className={`flex items-center gap-1 rounded-md px-1.5 py-1 ${
      correct ? "bg-emerald-500/15 border border-emerald-500/25" : "bg-red-500/10 border border-red-500/20"
    }`}>
      {team && (
        <img src={team.flag_url ?? ""} className="w-3.5 h-2.25 object-cover rounded-xs shrink-0" alt={team.fifa_code} onError={e => { (e.target as HTMLImageElement).style.opacity = "0" }} />
      )}
      <span className={`text-[8.5px] font-medium ${correct ? "text-emerald-400" : "text-red-400"}`}>
        {team?.fifa_code ?? "?"}
      </span>
      {correct && <span className="text-[8px] font-semibold text-emerald-400">+{ptsEach}</span>}
    </div>
  )
}

function MemberDetail({
  detail,
  teamById,
  pts,
}: {
  detail: MemberBracketPoints["detail"]
  teamById: Record<string, TeamInfo>
  pts: PtsConfig
}) {
  const t = (id: string | null | undefined) => id ? (teamById[id] ?? null) : null

  const knockoutRounds: { label: string; slots: SlotPredDetail[]; ptsEach: number }[] = [
    { label: "R32",     slots: detail.r32,           ptsEach: pts.r32 },
    { label: "R16",     slots: detail.r16,           ptsEach: pts.r16 },
    { label: "Cuartos", slots: detail.qf,            ptsEach: pts.qf },
    { label: "Semis",   slots: detail.sf,            ptsEach: pts.sf },
    { label: "Final",   slots: [detail.champion],    ptsEach: pts.champion },
  ]

  return (
    <div className="px-3 pb-3 pt-1 space-y-4">
      {/* Groups: only 1° and 2° */}
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-widest text-(--color-muted) mb-2">Grupos</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {detail.groups.map(g => {
            const hasResult = !!g.actualFirst
            const first  = t(g.predictedFirst)
            const second = t(g.predictedSecond)
            const aFirst  = t(g.actualFirst)
            const aSecond = t(g.actualSecond)
            const c1 = hasResult && g.predictedFirst  === g.actualFirst
            const c2 = hasResult && g.predictedSecond === g.actualSecond

            return (
              <div key={g.group} className="flex items-start gap-2 py-0.5">
                <span className="text-[9px] font-bold text-(--color-muted) w-3 shrink-0 mt-0.5">{g.group}</span>
                <div className="flex flex-col gap-0.5 min-w-0">
                  {/* 1° */}
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] text-(--color-muted) w-3 shrink-0">1°</span>
                    {first ? (
                      <>
                        <img src={first.flag_url ?? ""} className="w-3.5 h-2.25 object-cover rounded-xs shrink-0" alt={first.fifa_code} onError={e => { (e.target as HTMLImageElement).style.opacity = "0" }} />
                        <span className={`text-[9px] font-medium ${!hasResult ? "text-(--color-muted)" : c1 ? "text-emerald-400" : "text-red-400"}`}>{first.fifa_code}</span>
                        {hasResult && c1 && <span className="text-[8px] font-semibold text-emerald-400">+{pts.groups}</span>}
                        {hasResult && !c1 && aFirst && (
                          <span className="text-[8px] text-(--color-muted)">→ {aFirst.fifa_code}</span>
                        )}
                      </>
                    ) : <span className="text-[8px] text-(--color-muted) italic">—</span>}
                  </div>
                  {/* 2° */}
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] text-(--color-muted) w-3 shrink-0">2°</span>
                    {second ? (
                      <>
                        <img src={second.flag_url ?? ""} className="w-3.5 h-2.25 object-cover rounded-xs shrink-0" alt={second.fifa_code} onError={e => { (e.target as HTMLImageElement).style.opacity = "0" }} />
                        <span className={`text-[9px] font-medium ${!hasResult ? "text-(--color-muted)" : c2 ? "text-emerald-400" : "text-red-400"}`}>{second.fifa_code}</span>
                        {hasResult && c2 && <span className="text-[8px] font-semibold text-emerald-400">+{pts.groups}</span>}
                        {hasResult && !c2 && aSecond && (
                          <span className="text-[8px] text-(--color-muted)">→ {aSecond.fifa_code}</span>
                        )}
                      </>
                    ) : <span className="text-[8px] text-(--color-muted) italic">—</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Third-place qualifiers */}
      {detail.r32Thirds.some(s => s.predictedId) && (
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-widest text-(--color-muted) mb-2">Terceros que pasan</p>
          <div className="flex flex-wrap gap-1.5">
            {detail.r32Thirds.map((slot, i) => (
              <TeamChip key={i} slot={slot} teamById={teamById} ptsEach={pts.groupsThird} />
            ))}
          </div>
        </div>
      )}

      {/* Knockout rounds */}
      {knockoutRounds.map(({ label, slots, ptsEach }) => {
        const decided = slots.filter(s => s.actualId)
        if (decided.length === 0) return null
        return (
          <div key={label}>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-(--color-muted) mb-2">{label}</p>
            <div className="flex flex-wrap gap-1.5">
              {slots.map((slot, i) => (
                <TeamChip key={i} slot={slot} teamById={teamById} ptsEach={ptsEach} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function LiveBracketViewer({ actualSlots, teams, memberPoints, currentUserId, pts }: Props) {
  const [mode, setMode] = useState<"lista" | "diagrama">("lista")
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)

  const teamById = Object.fromEntries(teams.map(tm => [tm.id, tm]))
  const t = (id: string | null | undefined): TeamInfo | null =>
    id ? (teamById[id] ?? null) : null

  function getSlot(level: number, idx: number): ActualMatchSlot {
    if (level === 4) return actualSlots.r32[idx] ?? EMPTY_SLOT
    if (level === 3) return actualSlots.r16[idx] ?? EMPTY_SLOT
    if (level === 2) return actualSlots.qf[idx]  ?? EMPTY_SLOT
    if (level === 1) return actualSlots.sf[idx]   ?? EMPTY_SLOT
    return actualSlots.final ?? EMPTY_SLOT
  }

  const champion  = t(actualSlots.final?.winnerId)
  const thirdTeam = t(actualSlots.third?.winnerId)
  const finalist1 = t(actualSlots.final?.homeTeamId)
  const finalist2 = t(actualSlots.final?.awayTeamId)

  const sortedMembers = [...memberPoints].sort((a, b) => b.totalPoints - a.totalPoints)

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

      {/* ── Puntos de bracket ── */}
      {sortedMembers.length > 0 && (
        <div className="bg-(--color-surface) border border-(--color-border) rounded-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-(--color-border)">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">
              Puntos de bracket en vivo
            </span>
          </div>
          {sortedMembers.map((member, i) => {
            const isMe = member.userId === currentUserId
            const { r32, r16, qf, sf, champion: champ } = member.breakdown
            const isExpanded = expandedUserId === member.userId
            return (
              <div key={member.userId} className={`border-b border-(--color-border)/50 last:border-0 ${isMe ? "bg-accent/5" : ""}`}>
                <button
                  onClick={() => setExpandedUserId(isExpanded ? null : member.userId)}
                  className="grid grid-cols-[1.25rem_1fr_2.5rem] gap-1 px-3 py-2.5 items-center w-full text-left"
                >
                  <span className={`text-xs font-bold tabular-nums ${
                    i === 0 ? "text-yellow-400" : i === 1 ? "text-zinc-300" : i === 2 ? "text-amber-600" : "text-(--color-muted)"
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    {member.avatarUrl ? (
                      <Image src={member.avatarUrl} alt={member.name} width={20} height={20} className="w-5 h-5 rounded-full shrink-0 object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-white/10 shrink-0 flex items-center justify-center text-[9px] font-bold">
                        {member.name[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className={`text-xs truncate block ${isMe ? "font-semibold text-(--color-accent)" : ""}`}>
                        {member.name}
                      </span>
                      <span className="text-[9px] text-(--color-muted) leading-tight">
                        G:{member.breakdown.groups} · R32:{r32} · R16:{r16} · QF:{qf} · SF:{sf} · F:{champ}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <span className={`text-xs tabular-nums font-semibold ${isMe ? "text-(--color-accent)" : "text-white"}`}>
                      {member.totalPoints}
                    </span>
                    <span className={`text-[9px] text-(--color-muted) transition-transform ${isExpanded ? "rotate-180" : ""}`}>▾</span>
                  </div>
                </button>
                {isExpanded && (
                  <MemberDetail detail={member.detail} teamById={teamById} pts={pts} />
                )}
              </div>
            )
          })}
        </div>
      )}

      {mode === "lista" ? (
        <div className="space-y-6">
          {/* Ronda de 32 */}
          <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-(--color-muted) mb-3">Ronda de 32</p>
            <div className="space-y-1.5">
              {actualSlots.r32.map((slot, i) => (
                <MatchRow key={i} slot={slot} matchId={R32_DEFS[i]?.matchId} teamById={teamById} />
              ))}
            </div>
          </div>

          {/* Octavos de Final */}
          <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-(--color-muted) mb-3">Octavos de Final</p>
            <div className="space-y-1.5">
              {actualSlots.r16.map((slot, i) => (
                <MatchRow key={i} slot={slot} teamById={teamById} />
              ))}
            </div>
          </div>

          {/* Cuartos de Final */}
          <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-(--color-muted) mb-3">Cuartos de Final</p>
            <div className="space-y-1.5">
              {actualSlots.qf.map((slot, i) => (
                <MatchRow key={i} slot={slot} teamById={teamById} />
              ))}
            </div>
          </div>

          {/* Semifinales */}
          <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-(--color-muted) mb-3">Semifinales</p>
            <div className="space-y-1.5">
              {actualSlots.sf.map((slot, i) => (
                <MatchRow key={i} slot={slot} teamById={teamById} />
              ))}
            </div>
          </div>

          {/* Gran Final */}
          <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-(--color-muted) mb-3">Gran Final</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Flag team={finalist1} size={20} />
                  <span className={`text-sm ${actualSlots.final?.winnerId === finalist1?.id ? "font-bold text-(--color-accent)" : ""}`}>
                    {finalist1?.name ?? "Por definir"}
                  </span>
                </div>
              </div>
              <span className="text-xs text-(--color-muted) font-semibold shrink-0">
                {actualSlots.final?.homeScore != null && actualSlots.final?.awayScore != null
                  ? `${actualSlots.final.homeScore} - ${actualSlots.final.awayScore}`
                  : "vs"}
              </span>
              <div className="flex-1 flex justify-end">
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${actualSlots.final?.winnerId === finalist2?.id ? "font-bold text-(--color-accent)" : ""}`}>
                    {finalist2?.name ?? "Por definir"}
                  </span>
                  <Flag team={finalist2} size={20} />
                </div>
              </div>
            </div>
            {(thirdTeam || actualSlots.third?.homeTeamId) && (
              <div className="border-t border-(--color-border)/50 pt-3 flex items-center gap-2">
                <span className="text-xs text-(--color-muted) shrink-0">3er lugar:</span>
                {thirdTeam ? (
                  <>
                    <Flag team={thirdTeam} size={16} />
                    <span className="text-sm">{thirdTeam.name}</span>
                  </>
                ) : (
                  <span className="text-xs text-(--color-muted) italic">Por definir</span>
                )}
              </div>
            )}
          </div>

          {/* Campeón */}
          <div className="relative bg-linear-to-br from-yellow-500/15 via-yellow-400/5 to-transparent border border-yellow-500/30 rounded-2xl p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-yellow-400/70 mb-3">Campeón</p>
            <div className="flex flex-col items-center gap-3">
              <Flag team={champion} size={64} />
              <p className="text-2xl font-bold">{champion?.name ?? "Por definir"}</p>
              {champion && (
                <span className="text-xs font-mono text-(--color-muted) bg-white/5 px-2 py-0.5 rounded">
                  {champion.fifa_code}
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ── Diagrama ─────────────────────────────────────────────────────── */
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
                <p className="text-xs font-bold leading-tight">{champion?.name ?? "Por definir"}</p>
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

              {/* Match cards */}
              {[0, 1, 2, 3, 4].map(level =>
                Array.from({ length: 1 << level }, (_, idx) => {
                  const slot = getSlot(level, idx)
                  return (
                    <LiveDgCard
                      key={`${level}-${idx}`}
                      slot={slot}
                      teamById={teamById}
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

