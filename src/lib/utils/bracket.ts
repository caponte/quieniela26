export const BRACKET_LOCK_TIME = new Date("2026-06-11T14:50:00Z")

export const GROUPS = ["A","B","C","D","E","F","G","H","I","J","K","L"] as const
export type GroupName = (typeof GROUPS)[number]

export interface TeamInfo {
  id: string
  name: string
  flag_url: string | null
  fifa_code: string
  group_name: string
}

export interface BracketPredictionData {
  groups: Record<string, {
    first: string | null
    second: string | null
    third: string | null
  }>
  /** winner team ID for each R32 slot (16) */
  r32: (string | null)[]
  /** which 3rd-place team the user picked to fill each R32 slot (only for "third"-type slots) */
  r32_third: (string | null)[]
  r16: (string | null)[]
  qf: (string | null)[]
  sf: (string | null)[]
  third: string | null
  champion: string | null
}

export function emptyPrediction(): BracketPredictionData {
  return {
    groups: Object.fromEntries(GROUPS.map(g => [g, { first: null, second: null, third: null }])),
    r32: Array(16).fill(null),
    r32_third: Array(16).fill(null),
    r16: Array(8).fill(null),
    qf: Array(4).fill(null),
    sf: Array(2).fill(null),
    third: null,
    champion: null,
  }
}

type GroupSlot = { type: "group"; group: string; pos: 1 | 2 }
type ThirdSlot  = { type: "third"; pool: string[] }
export type MatchSlot = GroupSlot | ThirdSlot

export interface R32Def {
  matchId: string
  date: string
  home: MatchSlot
  away: MatchSlot
}

export interface MatchInfo {
  matchId: string
  date: string
}

/**
 * Official FIFA WC 2026 R32 bracket.
 * Slots 0-7 feed into the top half (SF[0]), slots 8-15 into the bottom half (SF[1]).
 * Visual order matches the reference bracket (top to bottom).
 */
export const R32_DEFS: R32Def[] = [
  // slot 0 — top of bracket
  { matchId: "M74", date: "06/29 · 16:30", home: { type: "group", group: "E", pos: 1 }, away: { type: "third", pool: ["A","B","C","D","F"] } },
  { matchId: "M77", date: "06/30 · 17:00", home: { type: "group", group: "I", pos: 1 }, away: { type: "third", pool: ["C","D","F","G","H"] } },
  { matchId: "M73", date: "06/28 · 15:00", home: { type: "group", group: "A", pos: 2 }, away: { type: "group", group: "B", pos: 2 } },
  { matchId: "M75", date: "06/29 · 21:00", home: { type: "group", group: "F", pos: 1 }, away: { type: "group", group: "C", pos: 2 } },
  { matchId: "M83", date: "07/02 · 19:00", home: { type: "group", group: "K", pos: 2 }, away: { type: "group", group: "L", pos: 2 } },
  { matchId: "M84", date: "07/02 · 15:00", home: { type: "group", group: "H", pos: 1 }, away: { type: "group", group: "J", pos: 2 } },
  { matchId: "M81", date: "07/01 · 20:00", home: { type: "group", group: "D", pos: 1 }, away: { type: "third", pool: ["B","E","F","I","J"] } },
  { matchId: "M82", date: "07/01 · 16:00", home: { type: "group", group: "G", pos: 1 }, away: { type: "third", pool: ["A","E","H","I","J"] } },
  // slot 8 — bottom half starts
  { matchId: "M76", date: "06/29 · 13:00", home: { type: "group", group: "C", pos: 1 }, away: { type: "group", group: "F", pos: 2 } },
  { matchId: "M78", date: "06/30 · 13:00", home: { type: "group", group: "E", pos: 2 }, away: { type: "group", group: "I", pos: 2 } },
  { matchId: "M79", date: "06/30 · 21:00", home: { type: "group", group: "A", pos: 1 }, away: { type: "third", pool: ["C","E","F","H","I"] } },
  { matchId: "M80", date: "07/01 · 12:00", home: { type: "group", group: "L", pos: 1 }, away: { type: "third", pool: ["E","H","I","J","K"] } },
  { matchId: "M86", date: "07/03 · 18:00", home: { type: "group", group: "J", pos: 1 }, away: { type: "group", group: "H", pos: 2 } },
  { matchId: "M88", date: "07/03 · 14:00", home: { type: "group", group: "D", pos: 2 }, away: { type: "group", group: "G", pos: 2 } },
  { matchId: "M85", date: "07/02 · 23:00", home: { type: "group", group: "B", pos: 1 }, away: { type: "third", pool: ["E","F","G","I","J"] } },
  { matchId: "M87", date: "07/03 · 21:30", home: { type: "group", group: "K", pos: 1 }, away: { type: "third", pool: ["D","E","I","J","L"] } },
]

export const R16_INFO: MatchInfo[] = [
  { matchId: "M89", date: "07/04 · 17:00" },
  { matchId: "M90", date: "07/04 · 13:00" },
  { matchId: "M93", date: "07/06 · 15:00" },
  { matchId: "M94", date: "07/06 · 20:00" },
  { matchId: "M91", date: "07/05 · 16:00" },
  { matchId: "M92", date: "07/05 · 20:00" },
  { matchId: "M95", date: "07/07 · 12:00" },
  { matchId: "M96", date: "07/07 · 16:00" },
]

export const QF_INFO: MatchInfo[] = [
  { matchId: "M97",  date: "07/09 · 16:00" },
  { matchId: "M98",  date: "07/10 · 15:00" },
  { matchId: "M99",  date: "07/11 · 17:00" },
  { matchId: "M100", date: "07/11 · 21:00" },
]

export const SF_INFO: MatchInfo[] = [
  { matchId: "M101", date: "07/14 · 15:00" },
  { matchId: "M102", date: "07/15 · 15:00" },
]

export const FINAL_INFO: MatchInfo = { matchId: "M104", date: "07/19 · 15:00" }
export const THIRD_INFO: MatchInfo = { matchId: "M103", date: "07/19 · 12:00" }

export const R16_PAIRS: [number, number][] = [[0,1],[2,3],[4,5],[6,7],[8,9],[10,11],[12,13],[14,15]]
export const QF_PAIRS:  [number, number][] = [[0,1],[2,3],[4,5],[6,7]]
export const SF_PAIRS:  [number, number][] = [[0,1],[2,3]]
