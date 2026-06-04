import type { MatchStage } from "@/lib/supabase/database.types"

export type JornadaSlug = "j1" | "j2" | "j3" | "r32" | "r16" | "qf" | "sf" | "final"

export const JORNADA_SLUGS: JornadaSlug[] = ["j1", "j2", "j3", "r32", "r16", "qf", "sf", "final"]

export interface JornadaInfo {
  slug: JornadaSlug
  label: string
  shortLabel: string
  isGroup: boolean
  stage: MatchStage | null  // null for group jornadas (filtered by date)
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

// Jornada 1: group matches with match_date < Jun 18
// Jornada 2: group matches >= Jun 18 and < Jun 25
// Jornada 3: group matches >= Jun 25
export const JORNADA_DATE_BOUNDS: Record<"j1" | "j2" | "j3", { from?: Date; to?: Date }> = {
  j1: { to: new Date("2026-06-18T00:00:00Z") },
  j2: { from: new Date("2026-06-18T00:00:00Z"), to: new Date("2026-06-25T00:00:00Z") },
  j3: { from: new Date("2026-06-25T00:00:00Z") },
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
