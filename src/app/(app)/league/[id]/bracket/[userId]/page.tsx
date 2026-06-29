import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Breadcrumb } from "@/components/Breadcrumb"
import {
  BRACKET_LOCK_TIME, R32_DEFS, R16_INFO, QF_INFO, SF_INFO, FINAL_INFO, THIRD_INFO,
  emptyPrediction,
  type BracketPredictionData, type TeamInfo,
} from "@/lib/utils/bracket"
import { BracketViewer } from "./BracketViewer"
import type { BracketDetail, BracketBreakdown, KoMatchPrediction, PtsConfig, GroupPredDetail, SlotPredDetail } from "./BracketViewer"

interface Props {
  params: Promise<{ id: string; userId: string }>
}

interface UserRow { id: string; name: string; avatar_url: string | null }
interface LeagueRow { id: string; name: string }

// ── DB types ───────────────────────────────────────────────────────────────────

interface KnockoutMatchDB {
  id: string
  match_number: number
  stage: string
  home_team_id: string | null
  away_team_id: string | null
  home_score: number | null
  away_score: number | null
  status: string
}

interface GroupMatchDB {
  home_team_id: string
  away_team_id: string
  home_score: number | null
  away_score: number | null
  group_name: string | null
  status: string
}

interface PenaltyEventDB {
  match_id: string
  team_id: string
  penalty_scored: boolean | null
}

// ── KO picks structure (knockout_predictions.picks) ───────────────────────────

interface KoPicks {
  r32?: (string | null)[]
  r16?: (string | null)[]
  qf?: (string | null)[]
  sf?: (string | null)[]
  third?: string | null
  champion?: string | null
}

// Slot-to-match_number mapping (mirrors SQL function in migration 013)
const KO_R32_NUMS = [74,77,73,75,83,84,81,82,76,78,79,80,86,88,85,87]
const KO_R16_NUMS = [89,90,93,94,91,92,95,96]
const KO_QF_NUMS  = [97,98,99,100]
const KO_SF_NUMS  = [101,102]

function getKoPredictedWinner(match: KnockoutMatchDB, picks: KoPicks): string | null {
  const n = match.match_number
  let slot: number
  switch (match.stage) {
    case "round_of_32":   slot = KO_R32_NUMS.indexOf(n); return slot >= 0 ? (picks.r32?.[slot] ?? null) : null
    case "round_of_16":   slot = KO_R16_NUMS.indexOf(n); return slot >= 0 ? (picks.r16?.[slot] ?? null) : null
    case "quarter_final": slot = KO_QF_NUMS.indexOf(n);  return slot >= 0 ? (picks.qf?.[slot]  ?? null) : null
    case "semi_final":    slot = KO_SF_NUMS.indexOf(n);  return slot >= 0 ? (picks.sf?.[slot]  ?? null) : null
    case "third_place":   return picks.third     ?? null
    case "final":         return picks.champion  ?? null
    default:              return null
  }
}

// ── Match-number → slot-index maps ─────────────────────────────────────────────

const matchNum = (matchId: string) => parseInt(matchId.slice(1), 10)
const R32_NUM_TO_SLOT = Object.fromEntries(R32_DEFS.map((d, i) => [matchNum(d.matchId), i]))
const R16_NUM_TO_SLOT = Object.fromEntries(R16_INFO.map((d, i) => [matchNum(d.matchId), i]))
const QF_NUM_TO_SLOT  = Object.fromEntries(QF_INFO.map((d, i)  => [matchNum(d.matchId), i]))
const SF_NUM_TO_SLOT  = Object.fromEntries(SF_INFO.map((d, i)  => [matchNum(d.matchId), i]))
const FINAL_NUM       = matchNum(FINAL_INFO.matchId)
const THIRD_NUM       = matchNum(THIRD_INFO.matchId)

// ── Internal slot type ─────────────────────────────────────────────────────────

interface ActualMatchSlot {
  homeTeamId: string | null
  awayTeamId: string | null
  homeScore: number | null
  awayScore: number | null
  winnerId: string | null
  status: string
}

interface ActualSlots {
  r32: ActualMatchSlot[]
  r16: ActualMatchSlot[]
  qf:  ActualMatchSlot[]
  sf:  ActualMatchSlot[]
  final: ActualMatchSlot
  third: ActualMatchSlot
}

// ── Helpers (adapted from LiveBracketViewer/page.tsx) ─────────────────────────

interface TeamStanding { teamId: string; points: number; gd: number; gf: number }

function calcGroupStandings(groupMatches: GroupMatchDB[]): Record<string, TeamStanding[]> {
  const raw: Record<string, Record<string, TeamStanding>> = {}
  for (const m of groupMatches) {
    if (!m.group_name || m.home_score == null || m.away_score == null) continue
    const g = m.group_name
    if (!raw[g]) raw[g] = {}
    const init = (id: string) => { if (!raw[g][id]) raw[g][id] = { teamId: id, points: 0, gf: 0, gd: 0 } }
    init(m.home_team_id); init(m.away_team_id)
    const home = raw[g][m.home_team_id], away = raw[g][m.away_team_id]
    home.gf += m.home_score; away.gf += m.away_score
    home.gd += m.home_score - m.away_score; away.gd += m.away_score - m.home_score
    if (m.home_score > m.away_score)      { home.points += 3 }
    else if (m.away_score > m.home_score) { away.points += 3 }
    else                                   { home.points += 1; away.points += 1 }
  }
  const result: Record<string, TeamStanding[]> = {}
  for (const [g, teams] of Object.entries(raw)) {
    result[g] = Object.values(teams).sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf)
  }
  return result
}

function calcTop8Thirds(standings: Record<string, TeamStanding[]>): Map<string, string> {
  const allThirds = Object.entries(standings)
    .filter(([, teams]) => teams.length >= 3)
    .map(([group, teams]) => ({ group, ...teams[2] }))
  allThirds.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf)
  const top8 = new Map<string, string>()
  allThirds.slice(0, 8).forEach(t => top8.set(t.group, t.teamId))
  return top8
}

function assignThirdsToSlots(top8: Map<string, string>): Map<number, string> {
  const slotPools = new Map<number, string[]>()
  for (let i = 0; i < R32_DEFS.length; i++) {
    const def = R32_DEFS[i]
    if (def.home.type === "third")      slotPools.set(i, (def.home as { type: "third"; pool: string[] }).pool)
    else if (def.away.type === "third") slotPools.set(i, (def.away as { type: "third"; pool: string[] }).pool)
  }
  const candidates = [...top8.entries()].map(([group, teamId]) => ({
    group, teamId,
    eligibleSlots: [...slotPools.entries()].filter(([, pool]) => pool.includes(group)).map(([idx]) => idx),
  }))
  candidates.sort((a, b) => a.eligibleSlots.length - b.eligibleSlots.length)
  const usedSlots = new Set<number>()
  const result = new Map<number, string>()
  for (const { teamId, eligibleSlots } of candidates) {
    const available = eligibleSlots.filter(s => !usedSlots.has(s))
    if (available.length === 0) continue
    result.set(available[0], teamId)
    usedSlots.add(available[0])
  }
  return result
}

function determineWinner(match: KnockoutMatchDB, penaltyEvents: PenaltyEventDB[]): string | null {
  if (match.status !== "finished") return null
  if (match.home_score == null || match.away_score == null) return null
  if (!match.home_team_id || !match.away_team_id) return null
  if (match.home_score > match.away_score) return match.home_team_id
  if (match.away_score > match.home_score) return match.away_team_id
  const pens = penaltyEvents.filter(e => e.match_id === match.id && e.penalty_scored === true)
  const homeGoals = pens.filter(e => e.team_id === match.home_team_id).length
  const awayGoals = pens.filter(e => e.team_id === match.away_team_id).length
  if (homeGoals > awayGoals) return match.home_team_id
  if (awayGoals > homeGoals) return match.away_team_id
  return null
}

function emptyActualSlot(): ActualMatchSlot {
  return { homeTeamId: null, awayTeamId: null, homeScore: null, awayScore: null, winnerId: null, status: "scheduled" }
}

function buildActualSlots(
  knockoutMatches: KnockoutMatchDB[],
  penaltyEvents: PenaltyEventDB[],
  groupStandings: Record<string, TeamStanding[]>,
  top8Thirds: Map<string, string>,
): ActualSlots {
  const slots: ActualSlots = {
    r32: Array(16).fill(null).map(emptyActualSlot),
    r16: Array(8).fill(null).map(emptyActualSlot),
    qf:  Array(4).fill(null).map(emptyActualSlot),
    sf:  Array(2).fill(null).map(emptyActualSlot),
    final: emptyActualSlot(),
    third: emptyActualSlot(),
  }
  for (const match of knockoutMatches) {
    const slot: ActualMatchSlot = {
      homeTeamId: match.home_team_id,
      awayTeamId: match.away_team_id,
      homeScore:  match.home_score,
      awayScore:  match.away_score,
      winnerId:   determineWinner(match, penaltyEvents),
      status:     match.status,
    }
    const n = match.match_number
    if      (match.stage === "final"         && n === FINAL_NUM)                       slots.final    = slot
    else if (match.stage === "third_place"   && n === THIRD_NUM)                       slots.third    = slot
    else if (match.stage === "round_of_32"   && R32_NUM_TO_SLOT[n] !== undefined)      slots.r32[R32_NUM_TO_SLOT[n]] = slot
    else if (match.stage === "round_of_16"   && R16_NUM_TO_SLOT[n] !== undefined)      slots.r16[R16_NUM_TO_SLOT[n]] = slot
    else if (match.stage === "quarter_final" && QF_NUM_TO_SLOT[n]  !== undefined)      slots.qf[QF_NUM_TO_SLOT[n]]   = slot
    else if (match.stage === "semi_final"    && SF_NUM_TO_SLOT[n]  !== undefined)      slots.sf[SF_NUM_TO_SLOT[n]]   = slot
  }
  const thirdAssignment = assignThirdsToSlots(top8Thirds)
  for (let i = 0; i < R32_DEFS.length; i++) {
    const def = R32_DEFS[i]
    const slot = slots.r32[i]
    if (!slot.homeTeamId) {
      slot.homeTeamId = def.home.type === "group"
        ? groupStandings[def.home.group]?.[def.home.pos - 1]?.teamId ?? null
        : thirdAssignment.get(i) ?? null
    }
    if (!slot.awayTeamId) {
      slot.awayTeamId = def.away.type === "group"
        ? groupStandings[def.away.group]?.[def.away.pos - 1]?.teamId ?? null
        : thirdAssignment.get(i) ?? null
    }
  }
  return slots
}

const GROUPS_ORDER = ["A","B","C","D","E","F","G","H","I","J","K","L"]

function buildDetail(
  pred: BracketPredictionData,
  slots: ActualSlots,
  groupStandings: Record<string, TeamStanding[]>,
  top8Thirds: Map<string, string>,
): BracketDetail {
  const groups: GroupPredDetail[] = GROUPS_ORDER.map(g => ({
    group: g,
    predictedFirst:  pred.groups?.[g]?.first  ?? null,
    predictedSecond: pred.groups?.[g]?.second ?? null,
    actualFirst:  groupStandings[g]?.[0]?.teamId ?? null,
    actualSecond: groupStandings[g]?.[1]?.teamId ?? null,
  }))

  const top8Set = new Set(top8Thirds.values())
  const seen = new Set<string>()
  const r32Thirds: SlotPredDetail[] = (pred.r32_third ?? [])
    .filter((id): id is string => !!id && !seen.has(id) && (seen.add(id), true))
    .map(teamId => ({ predictedId: teamId, actualId: top8Set.has(teamId) ? teamId : null }))

  const r32: SlotPredDetail[] = R32_DEFS.map((def, i) => ({
    matchId: def.matchId,
    predictedId: pred.r32?.[i] ?? null,
    actualId:    slots.r32[i]?.winnerId ?? null,
  }))
  const r16: SlotPredDetail[] = R16_INFO.map((info, i) => ({
    matchId: info.matchId,
    predictedId: pred.r16?.[i] ?? null,
    actualId:    slots.r16[i]?.winnerId ?? null,
  }))
  const qf: SlotPredDetail[] = QF_INFO.map((info, i) => ({
    matchId: info.matchId,
    predictedId: pred.qf?.[i] ?? null,
    actualId:    slots.qf[i]?.winnerId ?? null,
  }))
  const sf: SlotPredDetail[] = SF_INFO.map((info, i) => ({
    matchId: info.matchId,
    predictedId: pred.sf?.[i] ?? null,
    actualId:    slots.sf[i]?.winnerId ?? null,
  }))
  const champion: SlotPredDetail = {
    matchId:     FINAL_INFO.matchId,
    predictedId: pred.champion ?? null,
    actualId:    slots.final?.winnerId ?? null,
  }
  return { groups, r32Thirds, r32, r16, qf, sf, champion }
}

function calcBreakdown(
  pred: BracketPredictionData,
  slots: ActualSlots,
  groupStandings: Record<string, TeamStanding[]>,
  top8Thirds: Map<string, string>,
  pts: PtsConfig,
): BracketBreakdown {
  let groups = 0, r32 = 0, r16 = 0, qf = 0, sf = 0, champion = 0

  for (const [g, standing] of Object.entries(groupStandings)) {
    if (standing[0]?.teamId && pred.groups?.[g]?.first  === standing[0].teamId) groups += pts.groups
    if (standing[1]?.teamId && pred.groups?.[g]?.second === standing[1].teamId) groups += pts.groups
  }
  const top8Set = new Set(top8Thirds.values())
  const counted = new Set<string>()
  for (const pick of pred.r32_third ?? []) {
    if (!pick || counted.has(pick)) continue
    counted.add(pick)
    if (top8Set.has(pick)) groups += pts.groupsThird
  }
  for (let i = 0; i < 16; i++) { const w = slots.r32[i]?.winnerId; if (w && pred.r32?.[i] === w) r32 += pts.r32 }
  for (let i = 0; i < 8;  i++) { const w = slots.r16[i]?.winnerId; if (w && pred.r16?.[i] === w) r16 += pts.r16 }
  for (let i = 0; i < 4;  i++) { const w = slots.qf[i]?.winnerId;  if (w && pred.qf?.[i]  === w) qf  += pts.qf  }
  for (let i = 0; i < 2;  i++) { const w = slots.sf[i]?.winnerId;  if (w && pred.sf?.[i]  === w) sf  += pts.sf  }
  if (slots.final?.winnerId && pred.champion === slots.final.winnerId) champion += pts.champion

  return { groups, r32, r16, qf, sf, champion }
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function MemberBracketPage({ params }: Props) {
  const { id: leagueId, userId: targetUserId } = await params

  if (Date.now() < BRACKET_LOCK_TIME.getTime()) {
    redirect(`/league/${leagueId}`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: myMembership } = await supabase
    .from("league_members")
    .select("user_id")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .maybeSingle() as unknown as { data: { user_id: string } | null }

  if (!myMembership) notFound()

  const [leagueRes, targetUserRes, bracketRes, teamsRes, groupMatchesRes, koMatchesRes, penaltyEventsRes, ptsCfgRes] = await Promise.all([
    supabase.from("leagues").select("id, name").eq("id", leagueId).maybeSingle() as unknown as Promise<{ data: LeagueRow | null }>,
    supabase.from("users").select("id, name, avatar_url").eq("id", targetUserId).maybeSingle() as unknown as Promise<{ data: UserRow | null }>,
    supabase.from("bracket_predictions").select("predictions").eq("user_id", targetUserId).order("league_id", { nullsFirst: true }).limit(1) as unknown as Promise<{ data: { predictions: BracketPredictionData }[] | null }>,
    supabase.from("teams").select("id, name, flag_url, fifa_code, group_name").order("group_name").order("name") as unknown as Promise<{ data: TeamInfo[] | null }>,

    supabase.from("matches")
      .select("home_team_id, away_team_id, home_score, away_score, group_name, status")
      .eq("stage", "group")
      .eq("status", "finished") as unknown as Promise<{ data: GroupMatchDB[] | null }>,

    supabase.from("matches")
      .select("id, match_number, stage, home_team_id, away_team_id, home_score, away_score, status")
      .in("stage", ["round_of_32", "round_of_16", "quarter_final", "semi_final", "third_place", "final"])
      .order("match_number") as unknown as Promise<{ data: KnockoutMatchDB[] | null }>,

    supabase.from("match_events")
      .select("match_id, team_id, penalty_scored")
      .eq("type", "penalty") as unknown as Promise<{ data: PenaltyEventDB[] | null }>,

    supabase.from("points_config")
      .select("category, points")
      .like("category", "bracket_%") as unknown as Promise<{ data: { category: string; points: number }[] | null }>,
  ])

  const league          = leagueRes.data
  const targetUser      = targetUserRes.data
  const bracket         = (bracketRes.data?.[0])?.predictions ?? null
  const teams           = teamsRes.data         ?? []
  const groupMatches    = groupMatchesRes.data   ?? []
  const koMatches       = koMatchesRes.data      ?? []
  const penaltyEvents   = penaltyEventsRes.data  ?? []
  const ptsCfgData      = ptsCfgRes.data         ?? []

  if (!league || !targetUser) notFound()

  // Fetch target user's KO bracket picks + KO points config in parallel
  const [koPredRes, koPtsCfgRes] = await Promise.all([
    supabase
      .from("knockout_predictions")
      .select("picks")
      .eq("user_id", targetUserId)
      .maybeSingle() as unknown as Promise<{ data: { picks: KoPicks } | null }>,

    supabase
      .from("points_config")
      .select("category, points")
      .like("category", "knockout_%") as unknown as Promise<{ data: { category: string; points: number }[] | null }>,
  ])

  const koPicks: KoPicks = koPredRes.data?.picks ?? {}
  const koPtsCfgMap = Object.fromEntries((koPtsCfgRes.data ?? []).map(r => [r.category, r.points]))
  const koStagePtsMap: Record<string, number> = {
    round_of_32:   koPtsCfgMap["knockout_round_of_32"]   ?? 1,
    round_of_16:   koPtsCfgMap["knockout_round_of_16"]   ?? 2,
    quarter_final: koPtsCfgMap["knockout_quarter_final"] ?? 3,
    semi_final:    koPtsCfgMap["knockout_semi_final"]    ?? 4,
    third_place:   koPtsCfgMap["knockout_third_place"]   ?? 4,
    final:         koPtsCfgMap["knockout_final"]         ?? 5,
  }

  // Points config
  const ptsCfgMap = Object.fromEntries(ptsCfgData.map(r => [r.category, r.points]))
  const pts: PtsConfig = {
    groups:      ptsCfgMap["bracket_group_first"]    ?? 3,
    groupsThird: ptsCfgMap["bracket_group_third"]    ?? 1,
    r32:         ptsCfgMap["bracket_round_of_32"]    ?? 2,
    r16:         ptsCfgMap["bracket_round_of_16"]    ?? 4,
    qf:          ptsCfgMap["bracket_quarter_final"]  ?? 6,
    sf:          ptsCfgMap["bracket_semi_final"]     ?? 8,
    champion:    ptsCfgMap["bracket_final"]          ?? 10,
  }

  // Bracket scoring
  const groupStandings = calcGroupStandings(groupMatches)
  const top8Thirds     = calcTop8Thirds(groupStandings)
  const actualSlots    = buildActualSlots(koMatches, penaltyEvents, groupStandings, top8Thirds)

  const bracketDetail    = bracket ? buildDetail(bracket, actualSlots, groupStandings, top8Thirds) : null
  const bracketBreakdown = bracket ? calcBreakdown(bracket, actualSlots, groupStandings, top8Thirds, pts) : null

  // Finished groups
  const matchCountPerGroup: Record<string, number> = {}
  for (const m of groupMatches) {
    if (m.group_name) matchCountPerGroup[m.group_name] = (matchCountPerGroup[m.group_name] ?? 0) + 1
  }
  const finishedGroups = new Set(
    Object.entries(matchCountPerGroup).filter(([, c]) => c >= 6).map(([g]) => g)
  )

  // Build KO predictions from picks structure (slot by slot), so future rounds show even without DB matches
  const koMatchByNum = Object.fromEntries(koMatches.map(m => [m.match_number, m]))

  function buildKoSlots(
    nums: number[],
    picksArr: (string | null)[] | undefined,
    stage: string,
  ): KoMatchPrediction[] {
    return nums.map((matchNum, slot) => {
      const match = koMatchByNum[matchNum]
      return {
        dbMatchId:         match?.id ?? `virtual-${stage}-${slot}`,
        matchId:           `M${matchNum}`,
        stage,
        homeTeamId:        match?.home_team_id ?? null,
        awayTeamId:        match?.away_team_id ?? null,
        homeScore:         match?.home_score   ?? null,
        awayScore:         match?.away_score   ?? null,
        status:            match?.status       ?? "scheduled",
        winnerId:          match ? determineWinner(match, penaltyEvents) : null,
        predictedWinnerId: picksArr?.[slot] ?? null,
        pointsPerPick:     koStagePtsMap[stage] ?? 1,
      }
    })
  }

  function buildKoSingle(matchNum: number, stage: string, predictedWinnerId: string | null): KoMatchPrediction {
    const match = koMatchByNum[matchNum]
    return {
      dbMatchId:         match?.id ?? `virtual-${stage}`,
      matchId:           `M${matchNum}`,
      stage,
      homeTeamId:        match?.home_team_id ?? null,
      awayTeamId:        match?.away_team_id ?? null,
      homeScore:         match?.home_score   ?? null,
      awayScore:         match?.away_score   ?? null,
      status:            match?.status       ?? "scheduled",
      winnerId:          match ? determineWinner(match, penaltyEvents) : null,
      predictedWinnerId,
      pointsPerPick:     koStagePtsMap[stage] ?? 1,
    }
  }

  const koPredictions: KoMatchPrediction[] = [
    ...buildKoSlots(KO_R32_NUMS, koPicks.r32, "round_of_32"),
    ...buildKoSlots(KO_R16_NUMS, koPicks.r16, "round_of_16"),
    ...buildKoSlots(KO_QF_NUMS,  koPicks.qf,  "quarter_final"),
    ...buildKoSlots(KO_SF_NUMS,  koPicks.sf,  "semi_final"),
    buildKoSingle(103, "third_place", koPicks.third    ?? null),
    buildKoSingle(104, "final",       koPicks.champion ?? null),
  ]

  const isMe = targetUserId === user.id
  const hasBracket = !!bracket
  const hasKoPicks = Object.keys(koPicks).length > 0
  const hasKoPreds = hasKoPicks

  if (!hasBracket && !hasKoPreds) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Breadcrumb crumbs={[
          { label: "Inicio", href: "/dashboard" },
          { label: "Mis ligas", href: "/league" },
          { label: league.name, href: `/league/${leagueId}` },
          { label: isMe ? "Mi bracket" : `Bracket de ${targetUser.name.split(" ")[0]}` },
        ]} />
        <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-8 text-center">
          <p className="text-(--color-muted)">
            {isMe ? "No enviaste tu bracket." : `${targetUser.name.split(" ")[0]} no envió su bracket.`}
          </p>
          {isMe && (
            <Link href="/predict/bracket" className="mt-3 inline-block text-sm text-(--color-accent) hover:underline">
              Ver bracket →
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Breadcrumb crumbs={[
        { label: "Inicio", href: "/dashboard" },
        { label: "Mis ligas", href: "/league" },
        { label: league.name, href: `/league/${leagueId}` },
        { label: isMe ? "Mi bracket" : `Bracket de ${targetUser.name.split(" ")[0]}` },
      ]} />

      <div className="flex items-center gap-3 mb-8">
        {targetUser.avatar_url ? (
          <Image
            src={targetUser.avatar_url}
            alt={targetUser.name}
            width={44}
            height={44}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-base font-bold">
            {targetUser.name[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold">
            {isMe ? "Mi bracket" : `Bracket de ${targetUser.name}`}
          </h1>
          <p className="text-(--color-muted) text-sm">{league.name}</p>
        </div>
      </div>

      <BracketViewer
        bracket={bracket ?? emptyPrediction()}
        teams={teams}
        isMe={isMe}
        bracketDetail={bracketDetail}
        bracketBreakdown={bracketBreakdown}
        bracketPts={pts}
        finishedGroups={finishedGroups}
        koPredictions={koPredictions}
        defaultMode={hasBracket ? "bracket" : "ko"}
      />
    </div>
  )
}
