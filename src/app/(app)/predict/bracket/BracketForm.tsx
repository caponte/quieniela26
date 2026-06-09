"use client"

import { useRef, useState, useTransition } from "react"
import { saveBracketPrediction } from "@/lib/actions/bracket"
import {
  R32_DEFS, R16_INFO, QF_INFO, SF_INFO, FINAL_INFO, THIRD_INFO,
  R16_PAIRS, QF_PAIRS, SF_PAIRS,
  emptyPrediction,
  type TeamInfo,
  type BracketPredictionData,
} from "@/lib/utils/bracket"
import { BracketCountdown } from "@/components/BracketCountdown"

// ── Layout ──────────────────────────────────────────────────────────────────

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

// ── SVG connector paths ──────────────────────────────────────────────────────

function buildPaths(): string {
  const segs: string[] = []

  function connect(
    colSrc: number,
    srcTops: number[],
    colDst: number,
    dstTops: number[],
  ) {
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

// ── Sub-components ───────────────────────────────────────────────────────────

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
  team, label, isWinner, clickable, isLast, onClick, onClear,
}: {
  team: TeamInfo | null
  label: string
  isWinner: boolean
  clickable: boolean
  isLast: boolean
  onClick?: () => void
  onClear?: () => void
}) {
  const base = "flex-1 flex items-center gap-1.5 px-2 w-full text-left transition-colors group"
  const border = isLast ? "" : "border-b border-(--color-border)"
  const bg = isWinner
    ? "bg-(--color-accent)/10"
    : clickable ? "hover:bg-(--color-surface-2) cursor-pointer" : "cursor-default"

  return (
    <button
      onClick={e => { e.stopPropagation(); onClick?.() }}
      disabled={!clickable && !onClear}
      className={`${base} ${border} ${bg}`}
    >
      {team ? (
        <>
          <Flag team={team} />
          <span
            className={`text-[9.5px] font-semibold truncate leading-none ${
              isWinner ? "text-(--color-accent)" : "text-(--color-foreground)"
            }`}
          >
            {team.name}
          </span>
          {isWinner && (
            <span className="ml-auto text-(--color-accent) text-[8px] shrink-0">▶</span>
          )}
          {onClear && !isWinner && (
            <span
              role="button"
              onClick={e => { e.stopPropagation(); onClear() }}
              className="ml-auto text-[10px] text-(--color-muted) opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity shrink-0 cursor-pointer px-0.5"
            >
              ×
            </span>
          )}
        </>
      ) : label ? (
        <span className="text-[9.5px] font-semibold text-(--color-accent) leading-none">
          + {label}
        </span>
      ) : (
        <span className="text-[9.5px] text-(--color-muted) italic leading-none">···</span>
      )}
    </button>
  )
}

function MatchCard({
  matchId, date,
  homeTeam, awayTeam, homeLabel, awayLabel,
  winnerId, isFinal, locked,
  onHomeClick, onAwayClick,
  onHomeClear, onAwayClear,
  style,
}: {
  matchId: string; date: string
  homeTeam: TeamInfo | null; awayTeam: TeamInfo | null
  homeLabel: string; awayLabel: string
  winnerId: string | null
  isFinal?: boolean; locked: boolean
  onHomeClick: () => void; onAwayClick: () => void
  onHomeClear?: () => void; onAwayClear?: () => void
  style?: React.CSSProperties
}) {
  // Clickable when: slot is empty and has a label (open picker),
  // or slot has a team (winner toggle or re-open picker)
  const homeClickable = !locked && (!!homeLabel || !!homeTeam)
  const awayClickable = !locked && (!!awayLabel || !!awayTeam)

  return (
    <div
      className={`absolute flex flex-col overflow-hidden rounded-[10px] border-[1.5px] ${
        isFinal
          ? "border-(--color-accent) shadow-[0_6px_24px_rgba(250,204,21,0.25)]"
          : "border-(--color-border) shadow-sm"
      }`}
      style={{ width: CARD_W, height: CARD_H, ...style }}
    >
      {/* header */}
      <div
        className={`flex items-center justify-between shrink-0 px-2 border-b border-(--color-border) ${
          isFinal ? "bg-(--color-accent)/10" : "bg-(--color-surface-2)"
        }`}
        style={{ height: HDR_H }}
      >
        <span className="text-[9px] font-black text-(--color-accent)">{matchId}</span>
        <span className="text-[9px] text-(--color-muted)">{date}</span>
      </div>
      {/* home row */}
      <TeamRow
        team={homeTeam} label={homeLabel}
        isWinner={!!homeTeam && winnerId === homeTeam.id}
        clickable={homeClickable} isLast={false}
        onClick={homeClickable ? onHomeClick : undefined}
        onClear={!locked && !!homeTeam ? onHomeClear : undefined}
      />
      {/* away row */}
      <TeamRow
        team={awayTeam} label={awayLabel}
        isWinner={!!awayTeam && winnerId === awayTeam.id}
        clickable={awayClickable} isLast
        onClick={awayClickable ? onAwayClick : undefined}
        onClear={!locked && !!awayTeam ? onAwayClear : undefined}
      />
    </div>
  )
}

// ── Picker overlay ───────────────────────────────────────────────────────────

interface PickerState {
  teams: TeamInfo[]
  grouped: boolean     // group teams by group_name in the list?
  selected: string | null
  onSelect: (id: string | null) => void
  top: number
  left: number
}

function Picker({ picker, onClose }: { picker: PickerState; onClose: () => void }) {
  // Compute whether to flip above
  const pickerH = Math.min(picker.teams.length * 28 + 36, 192)
  const top = picker.top + pickerH > TOTAL_H ? picker.top - pickerH - 8 : picker.top

  const groups = picker.grouped
    ? [...new Set(picker.teams.map(t => t.group_name))].sort()
    : null

  return (
    <>
      {/* backdrop to close on outside click */}
      <div className="absolute inset-0 z-40" onClick={onClose} />
      <div
        className="absolute z-50 rounded-xl border border-(--color-border) bg-(--color-surface) shadow-xl overflow-hidden flex flex-col"
        style={{ top, left: picker.left, width: CARD_W, maxHeight: 192 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="overflow-y-auto flex-1">
          {groups ? (
            groups.map(g => (
              <div key={g}>
                <div className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-(--color-muted) bg-(--color-surface-2) border-b border-(--color-border)">
                  Grupo {g}
                </div>
                {picker.teams.filter(t => t.group_name === g).map(team => (
                  <TeamPickerRow
                    key={team.id} team={team}
                    selected={picker.selected === team.id}
                    onSelect={() => { picker.onSelect(team.id); onClose() }}
                  />
                ))}
              </div>
            ))
          ) : (
            picker.teams.map(team => (
              <TeamPickerRow
                key={team.id} team={team}
                selected={picker.selected === team.id}
                onSelect={() => { picker.onSelect(team.id); onClose() }}
              />
            ))
          )}
        </div>
        {picker.selected && (
          <button
            onClick={() => { picker.onSelect(null); onClose() }}
            className="shrink-0 flex items-center justify-center gap-1 py-1.5 text-[9px] text-(--color-muted) hover:text-(--color-foreground) border-t border-(--color-border) hover:bg-(--color-surface-2) transition-colors"
          >
            Borrar selección
          </button>
        )}
      </div>
    </>
  )
}

function TeamPickerRow({
  team, selected, onSelect,
}: {
  team: TeamInfo; selected: boolean; onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`flex items-center gap-2 w-full px-2 py-1.5 text-left transition-colors ${
        selected
          ? "bg-(--color-accent)/10 text-(--color-accent)"
          : "hover:bg-(--color-surface-2) text-(--color-foreground)"
      }`}
    >
      <Flag team={team} />
      <span className="text-[9.5px] font-medium truncate">{team.name}</span>
      {selected && <span className="ml-auto text-[9px] text-(--color-accent) shrink-0">✓</span>}
    </button>
  )
}

// ── Column header pill ───────────────────────────────────────────────────────

function ColHeader({ label, x, isFinal }: { label: string; x: number; isFinal?: boolean }) {
  return (
    <div
      className={`absolute flex items-center justify-center rounded-[8px] ${
        isFinal ? "bg-(--color-accent)" : "bg-(--color-surface-2)"
      }`}
      style={{ left: x, top: 0, width: CARD_W, height: 32 }}
    >
      <span
        className={`text-[10px] font-black uppercase tracking-[0.12em] ${
          isFinal ? "text-(--color-background)" : "text-(--color-foreground)"
        }`}
      >
        {isFinal ? "🏆 " : ""}{label}
      </span>
    </div>
  )
}

// ── BracketForm ──────────────────────────────────────────────────────────────

interface Props {
  teams: TeamInfo[]
  existing: BracketPredictionData | null
  locked: boolean
}

export function BracketForm({ teams, existing, locked }: Props) {
  const [pred, setPred] = useState<BracketPredictionData>(() => {
    if (!existing) return emptyPrediction()
    return {
      ...emptyPrediction(),
      ...existing,
      groups: Object.fromEntries(
        ["A","B","C","D","E","F","G","H","I","J","K","L"].map(g => {
          const eg = existing.groups?.[g]
          return [g, { first: eg?.first ?? null, second: eg?.second ?? null, third: eg?.third ?? null }]
        })
      ),
      r32_third: existing.r32_third ?? Array(16).fill(null),
    }
  })

  const [isPending, startTransition] = useTransition()
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle")
  const [saveError, setSaveError] = useState<string | null>(null)
  const [picker, setPicker] = useState<PickerState | null>(null)
  const bracketRef = useRef<HTMLDivElement>(null)

  const teamById      = Object.fromEntries(teams.map(t => [t.id, t]))
  const teamsByGroup  = Object.fromEntries(
    [...new Set(teams.map(t => t.group_name))].map(g => [g, teams.filter(t => t.group_name === g)])
  )

  // ── Getters ──────────────────────────────────────────────────────────────

  function getGroupTeam(group: string, pos: 1 | 2): TeamInfo | null {
    const id = pos === 1 ? pred.groups[group]?.first : pred.groups[group]?.second
    return id ? (teamById[id] ?? null) : null
  }

  function getR32Teams(slot: number): [TeamInfo | null, TeamInfo | null] {
    const def = R32_DEFS[slot]
    const resolve = (s: typeof def.home): TeamInfo | null => {
      if (s.type === "group") return getGroupTeam(s.group, s.pos)
      const id = pred.r32_third[slot]
      return id ? (teamById[id] ?? null) : null
    }
    return [resolve(def.home), resolve(def.away)]
  }

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

  // ── Setters ───────────────────────────────────────────────────────────────

  function setGroupPick(group: string, pos: "first" | "second" | "third", teamId: string | null) {
    if (locked) return
    setPred(prev => {
      const g = { ...prev.groups[group] }
      g[pos] = teamId
      if (teamId) {
        if (pos !== "first"  && g.first  === teamId) g.first  = null
        if (pos !== "second" && g.second === teamId) g.second = null
        if (pos !== "third"  && g.third  === teamId) g.third  = null
      }
      const newR32 = [...prev.r32]
      const newR32Third = [...prev.r32_third]
      R32_DEFS.forEach((def, i) => {
        const touches =
          (def.home.type === "group" && def.home.group === group) ||
          (def.away.type === "group" && def.away.group === group) ||
          (def.home.type === "third" && def.home.pool.includes(group)) ||
          (def.away.type === "third" && def.away.pool.includes(group))
        if (touches) { newR32[i] = null; newR32Third[i] = null }
      })
      return { ...prev, groups: { ...prev.groups, [group]: g }, r32: newR32, r32_third: newR32Third }
    })
  }

  function setR32ThirdPick(slot: number, teamId: string | null) {
    if (locked) return
    setPred(prev => {
      const newR32Third = [...prev.r32_third]
      newR32Third[slot] = teamId
      const newR32 = [...prev.r32]
      if (newR32[slot] && newR32[slot] !== teamId) {
        const def = R32_DEFS[slot]
        const homeTeam = def.home.type === "group" ? getGroupTeam(def.home.group, def.home.pos) : null
        if (newR32[slot] !== homeTeam?.id) newR32[slot] = null
      }
      return { ...prev, r32_third: newR32Third, r32: newR32 }
    })
  }

  function setKnockoutPick(round: "r32" | "r16" | "qf" | "sf", slot: number, teamId: string | null) {
    if (locked) return
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

  // ── Picker helpers ────────────────────────────────────────────────────────

  function openPicker(p: Omit<PickerState, "top" | "left"> & { cardTop: number; colIdx: number }) {
    const { cardTop, colIdx, ...rest } = p
    const PICKER_H = 192
    const rawTop = cardTop + CARD_H + 4
    const top = rawTop + PICKER_H > TOTAL_H ? cardTop - PICKER_H - 4 : rawTop
    setPicker({ ...rest, top, left: COL_X[colIdx] })
  }

  // ── R32 click logic ───────────────────────────────────────────────────────

  function openR32Picker(slot: number, side: "home" | "away") {
    const def = R32_DEFS[slot]
    const slotDef = side === "home" ? def.home : def.away
    const cardTop = r32Top(slot)
    if (slotDef.type === "group") {
      const posKey = slotDef.pos === 1 ? "first" : "second"
      openPicker({
        teams: teamsByGroup[slotDef.group] ?? [],
        grouped: false,
        selected: pred.groups[slotDef.group]?.[posKey] ?? null,
        onSelect: id => setGroupPick(slotDef.group, posKey, id),
        cardTop,
        colIdx: 0,
      })
    } else {
      const poolTeams = slotDef.pool.flatMap(g => teamsByGroup[g] ?? [])
      openPicker({
        teams: poolTeams,
        grouped: true,
        selected: pred.r32_third[slot] ?? null,
        onSelect: id => setR32ThirdPick(slot, id),
        cardTop,
        colIdx: 0,
      })
    }
  }

  function clearR32Side(slot: number, side: "home" | "away") {
    if (locked) return
    const def = R32_DEFS[slot]
    const slotDef = side === "home" ? def.home : def.away
    if (slotDef.type === "group") {
      const posKey = slotDef.pos === 1 ? "first" : "second"
      setGroupPick(slotDef.group, posKey, null)
    } else {
      setR32ThirdPick(slot, null)
    }
  }

  function handleR32Click(slot: number, side: "home" | "away") {
    if (locked) return
    const [homeTeam, awayTeam] = getR32Teams(slot)
    const team = side === "home" ? homeTeam : awayTeam
    const other = side === "home" ? awayTeam : homeTeam
    const winner = pred.r32[slot]

    if (!team || !other) {
      // At least one side empty → open picker for the clicked side
      openR32Picker(slot, side)
    } else {
      // Both sides filled → toggle winner
      setKnockoutPick("r32", slot, winner === team.id ? null : team.id)
    }
  }

  function handleKnockoutClick(
    round: "r16" | "qf" | "sf",
    slot: number,
    team: TeamInfo | null,
  ) {
    if (locked || !team) return
    const arr = round === "r16" ? pred.r16 : round === "qf" ? pred.qf : pred.sf
    setKnockoutPick(round, slot, arr[slot] === team.id ? null : team.id)
  }

  function handleFinalClick(team: TeamInfo | null) {
    if (locked || !team) return
    setPred(p => ({ ...p, champion: p.champion === team.id ? null : team.id }))
  }

  function handleThirdClick(team: TeamInfo | null) {
    if (locked || !team) return
    setPred(p => ({ ...p, third: p.third === team.id ? null : team.id }))
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  function handleSave() {
    setSaveError(null)
    startTransition(async () => {
      const res = await saveBracketPrediction(pred)
      if (res.error) { setSaveStatus("error"); setSaveError(res.error) }
      else { setSaveStatus("saved"); setTimeout(() => setSaveStatus("idle"), 3000) }
    })
  }

  // ── Progress ──────────────────────────────────────────────────────────────

  const r32Done = pred.r32.filter(Boolean).length
  const totalDone = r32Done
    + pred.r16.filter(Boolean).length
    + pred.qf.filter(Boolean).length
    + pred.sf.filter(Boolean).length
    + (pred.champion ? 1 : 0)
  const totalNeeded = 16 + 8 + 4 + 2 + 1  // 31

  // ── R32 slot labels ───────────────────────────────────────────────────────

  function r32Label(slotDef: (typeof R32_DEFS)[0]["home"] | (typeof R32_DEFS)[0]["away"]): string {
    if (slotDef.type === "group") {
      return `${slotDef.pos === 1 ? "1°" : "2°"}${slotDef.group}`
    }
    return `3° ${slotDef.pool.join("/")}`
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const [ft1, ft2] = getFinalTeams()
  const [tp1, tp2] = getThirdPlaceTeams()

  // Derive 3rd-place pick per group from r32_third slots
  const groupThird: Record<string, string | null> = Object.fromEntries(
    ["A","B","C","D","E","F","G","H","I","J","K","L"].map(g => [g, null])
  )
  pred.r32_third.forEach(teamId => {
    if (teamId) {
      const t = teamById[teamId]
      if (t) groupThird[t.group_name] = teamId
    }
  })

  return (
    <div>

    {/* Groups guide — sticky below navbar */}
    <div className="sticky top-14 z-40 -mx-4 bg-(--color-background) border-b border-(--color-border) shadow-lg">
      <div className="overflow-x-auto scrollbar-thin pb-1">
        <div className="flex gap-2 px-4 py-2 min-w-max">
          {(["A","B","C","D","E","F","G","H","I","J","K","L"] as const).map(g => {
            const gTeams = teamsByGroup[g] ?? []
            const first  = pred.groups[g]?.first
            const second = pred.groups[g]?.second
            const third  = groupThird[g]
            return (
              <div
                key={g}
                className="w-36 shrink-0 rounded-xl overflow-hidden border border-(--color-border) bg-(--color-surface)"
              >
                {/* card header */}
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-(--color-surface-2) border-b border-(--color-border)">
                  <span className="text-[8px] font-black uppercase tracking-[0.15em] text-(--color-muted)">Grupo</span>
                  <span className="text-sm font-black text-(--color-accent) leading-none">{g}</span>
                </div>
                {/* teams */}
                <div className="px-2 py-1.5 space-y-1">
                  {gTeams.map(t => {
                    const pos = first === t.id ? "1°" : second === t.id ? "2°" : third === t.id ? "3°" : null
                    const isThird = pos === "3°"
                    return (
                      <div key={t.id} className="flex items-center gap-1.5">
                        <img
                          src={t.flag_url ?? ""}
                          alt={t.name}
                          title={t.name}
                          className="w-5 h-3.5 object-cover rounded-[2px] shrink-0 border border-(--color-border)"
                          onError={e => { (e.target as HTMLImageElement).style.opacity = "0" }}
                        />
                        <span className={`text-[9px] truncate flex-1 leading-none ${pos ? "text-(--color-foreground) font-semibold" : "text-(--color-muted)"}`}>
                          {t.name}
                        </span>
                        {pos && (
                          <span className={`text-[8px] font-black shrink-0 leading-none ${isThird ? "text-(--color-muted)" : "text-(--color-accent)"}`}>
                            {pos}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>

    <div className="space-y-4 pt-4">
      {/* Top header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Modo Bracket</h1>
          <p className="text-xs text-(--color-muted) mt-1">
            Predice la fase eliminatoria completa.
          </p>
          {!locked && <div className="mt-2"><BracketCountdown variant="compact" /></div>}
        </div>
        {!locked && (
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
        <span className="text-(--color-muted) shrink-0">
          {totalDone}/{totalNeeded} picks
        </span>
      </div>

      {/* Banners */}
      {locked && (
        <div className="bg-yellow-900/30 border border-yellow-700 text-yellow-300 rounded-xl px-4 py-3 text-sm">
          El bracket está bloqueado. Ya no se pueden hacer cambios.
        </div>
      )}
      {saveStatus === "error" && saveError && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-xl px-4 py-3 text-sm">
          {saveError}
        </div>
      )}

      {/* Bracket */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div
          ref={bracketRef}
          className="relative select-none"
          style={{ width: TOTAL_W, height: TOTAL_H }}
          onClick={() => setPicker(null)}
        >
          {/* SVG connectors */}
          <svg
            width={TOTAL_W}
            height={TOTAL_H}
            className="absolute inset-0 pointer-events-none"
          >
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

          {/* R32 cards */}
          {R32_DEFS.map((def, i) => {
            const [homeTeam, awayTeam] = getR32Teams(i)
            return (
              <MatchCard
                key={i}
                matchId={def.matchId} date={def.date}
                homeTeam={homeTeam} awayTeam={awayTeam}
                homeLabel={homeTeam ? "" : r32Label(def.home)}
                awayLabel={awayTeam ? "" : r32Label(def.away)}
                winnerId={pred.r32[i]}
                locked={locked}
                onHomeClick={() => handleR32Click(i, "home")}
                onAwayClick={() => handleR32Click(i, "away")}
                onHomeClear={() => clearR32Side(i, "home")}
                onAwayClear={() => clearR32Side(i, "away")}
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
                homeLabel="" awayLabel=""
                winnerId={pred.r16[i]}
                locked={locked}
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
                homeLabel="" awayLabel=""
                winnerId={pred.qf[i]}
                locked={locked}
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
                homeLabel="" awayLabel=""
                winnerId={pred.sf[i]}
                locked={locked}
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
            homeLabel="" awayLabel=""
            winnerId={pred.champion}
            isFinal locked={locked}
            onHomeClick={() => handleFinalClick(ft1)}
            onAwayClick={() => handleFinalClick(ft2)}
            style={{ top: FINAL_TOP, left: COL_X[4] }}
          />

          {/* Picker overlay */}
          {picker && (
            <Picker picker={picker} onClose={() => setPicker(null)} />
          )}
        </div>
      </div>

      {/* 3rd place match */}
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
            team={tp1} label="" isWinner={!!tp1 && pred.third === tp1.id}
            clickable={!locked && !!tp1 && !!tp2}
            isLast={false}
            onClick={() => handleThirdClick(tp1)}
          />
          <TeamRow
            team={tp2} label="" isWinner={!!tp2 && pred.third === tp2.id}
            clickable={!locked && !!tp1 && !!tp2}
            isLast
            onClick={() => handleThirdClick(tp2)}
          />
        </div>
      </div>

      {/* Bottom save button */}
      {!locked && (
        <div className="pb-8">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="w-full py-3 bg-(--color-primary) hover:bg-(--color-primary-hover) text-white rounded-xl text-sm font-medium transition disabled:opacity-60"
          >
            {isPending ? "Guardando…" : saveStatus === "saved" ? "¡Guardado!" : "Guardar bracket"}
          </button>
        </div>
      )}
    </div>
    </div>
  )
}
