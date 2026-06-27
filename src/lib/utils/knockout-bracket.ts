import { R32_DEFS, R16_INFO, QF_INFO, SF_INFO } from "./bracket"

export interface KnockoutPredictionData {
  r32:      (string | null)[]  // 16 winner team IDs, indexed by bracket slot
  r16:      (string | null)[]  // 8
  qf:       (string | null)[]  // 4
  sf:       (string | null)[]  // 2
  third:    string | null
  champion: string | null
}

export function emptyKnockoutPrediction(): KnockoutPredictionData {
  return {
    r32:      Array(16).fill(null),
    r16:      Array(8).fill(null),
    qf:       Array(4).fill(null),
    sf:       Array(2).fill(null),
    third:    null,
    champion: null,
  }
}

// Match info for each R32 bracket slot, keyed by slot index.
// match_number is derived from R32_DEFS[i].matchId ("M74" → 74).
export interface R32MatchInfo {
  slotIndex:   number
  matchNumber: number
  matchId:     string  // "M73", "M74", …
  date:        string
  homeTeamId:  string | null
  awayTeamId:  string | null
}

export interface KnockoutMatchInfo {
  matchNumber: number
  matchId:     string
  date:        string
}

// Bracket slot → match_number mapping for R32 (same order as SQL trigger v_r32_nums)
export const R32_MATCH_NUMS: number[] = R32_DEFS.map(
  d => parseInt(d.matchId.replace("M", ""), 10)
)

export const R16_MATCH_NUMS: number[] = R16_INFO.map(
  d => parseInt(d.matchId.replace("M", ""), 10)
)

export const QF_MATCH_NUMS: number[] = QF_INFO.map(
  d => parseInt(d.matchId.replace("M", ""), 10)
)

export const SF_MATCH_NUMS: number[] = SF_INFO.map(
  d => parseInt(d.matchId.replace("M", ""), 10)
)

export const R16_PAIRS: [number, number][] = [[0,1],[2,3],[4,5],[6,7],[8,9],[10,11],[12,13],[14,15]]
export const QF_PAIRS:  [number, number][] = [[0,1],[2,3],[4,5],[6,7]]
export const SF_PAIRS:  [number, number][] = [[0,1],[2,3]]

export function isKnockoutLocked(firstR32Date: Date | null): boolean {
  if (!firstR32Date) return false
  return Date.now() >= firstR32Date.getTime() - 10 * 60 * 1000
}
