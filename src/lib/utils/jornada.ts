import type { MatchStage } from "@/lib/supabase/database.types"

export type JornadaSlug = "j1" | "j2" | "j3" | "r32" | "r16" | "qf" | "sf" | "final"

export const JORNADA_SLUGS: JornadaSlug[] = ["j1", "j2", "j3", "r32", "r16", "qf", "sf", "final"]

export interface JornadaInfo {
  slug: JornadaSlug
  label: string
  shortLabel: string
  isGroup: boolean
  stage: MatchStage | null  // null for group jornadas (filtered by round within group)
}

export const JORNADA_INFO: Record<JornadaSlug, JornadaInfo> = {
  j1: { slug: "j1", label: "Jornada 1", shortLabel: "J1", isGroup: true, stage: null },
  j2: { slug: "j2", label: "Jornada 2", shortLabel: "J2", isGroup: true, stage: null },
  j3: { slug: "j3", label: "Jornada 3", shortLabel: "J3", isGroup: true, stage: null },
  r32: { slug: "r32", label: "Ronda de 32", shortLabel: "R32", isGroup: false, stage: "round_of_32" },
  r16: { slug: "r16", label: "Octavos de Final", shortLabel: "R16", isGroup: false, stage: "round_of_16" },
  qf: { slug: "qf", label: "Cuartos de Final", shortLabel: "QF", isGroup: false, stage: "quarter_final" },
  sf: { slug: "sf", label: "Semifinales", shortLabel: "SF", isGroup: false, stage: "semi_final" },
  final: { slug: "final", label: "Gran Final", shortLabel: "Final", isGroup: false, stage: "final" },
}

// Returns the IDs of group matches belonging to a given round (1, 2, or 3).
// Within each group, matches are sorted by date; the first 2 = round 1, next 2 = round 2, last 2 = round 3.
export function getGroupRoundMatchIds(
  groupMatches: { id: string; match_date: string; group_name: string | null }[],
  round: 1 | 2 | 3
): Set<string> {
  const byGroup = new Map<string, typeof groupMatches>()
  for (const m of groupMatches) {
    const g = m.group_name ?? "__unknown__"
    if (!byGroup.has(g)) byGroup.set(g, [])
    byGroup.get(g)!.push(m)
  }

  const ids = new Set<string>()
  for (const matches of byGroup.values()) {
    const sorted = [...matches].sort((a, b) => a.match_date.localeCompare(b.match_date))
    const slice = sorted.slice((round - 1) * 2, round * 2)
    for (const m of slice) ids.add(m.id)
  }
  return ids
}

// A jornada unlocks when its first match kicks off (minus 10-min buffer for safety).
// For j1, it's always open before the tournament starts.
// For j2/j3 and knockout rounds, the unlock date is the first match date of that jornada.
export function isJornadaUnlocked(firstMatchDate: Date | null): boolean {
  if (!firstMatchDate) return false
  return Date.now() < firstMatchDate.getTime() - 10 * 60 * 1000
}

export function isMatchLocked(matchDate: Date): boolean {
  return Date.now() >= matchDate.getTime() - 10 * 60 * 1000
}

export function isValidJornadaSlug(slug: string): slug is JornadaSlug {
  return JORNADA_SLUGS.includes(slug as JornadaSlug)
}
