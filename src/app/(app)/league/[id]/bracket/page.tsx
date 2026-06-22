import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { Breadcrumb } from "@/components/Breadcrumb"
import {
  R32_DEFS, R16_INFO, QF_INFO, SF_INFO, FINAL_INFO, THIRD_INFO,
  type BracketPredictionData, type TeamInfo,
} from "@/lib/utils/bracket"
import { LiveBracketViewer, type ActualMatchSlot, type ActualSlots, type MemberBracketPoints, type GroupPredDetail, type SlotPredDetail, type PtsConfig } from "./LiveBracketViewer"

interface Props {
  params: Promise<{ id: string }>
}

interface KnockoutMatch {
  id: string
  match_number: number
  stage: string
  home_team_id: string | null
  away_team_id: string | null
  home_score: number | null
  away_score: number | null
  status: string
}

interface GroupMatch {
  home_team_id: string
  away_team_id: string
  home_score: number | null
  away_score: number | null
  group_name: string | null
  status: string
}

interface PenaltyEvent {
  match_id: string
  team_id: string
  penalty_scored: boolean | null
}

interface BracketPredRow {
  user_id: string
  predictions: BracketPredictionData
}

interface UserRow {
  id: string
  name: string
  avatar_url: string | null
}

// ── Match-number → slot-index maps ────────────────────────────────────────────

const matchNum = (matchId: string) => parseInt(matchId.slice(1), 10)

const R32_NUM_TO_SLOT = Object.fromEntries(R32_DEFS.map((d, i) => [matchNum(d.matchId), i]))
const R16_NUM_TO_SLOT = Object.fromEntries(R16_INFO.map((d, i) => [matchNum(d.matchId), i]))
const QF_NUM_TO_SLOT  = Object.fromEntries(QF_INFO.map((d, i)  => [matchNum(d.matchId), i]))
const SF_NUM_TO_SLOT  = Object.fromEntries(SF_INFO.map((d, i)  => [matchNum(d.matchId), i]))
const FINAL_NUM       = matchNum(FINAL_INFO.matchId)
const THIRD_NUM       = matchNum(THIRD_INFO.matchId)

// ── Group standings ───────────────────────────────────────────────────────────

interface TeamStanding {
  teamId: string
  points: number
  gd: number
  gf: number
}

function calcGroupStandings(groupMatches: GroupMatch[]): Record<string, TeamStanding[]> {
  const raw: Record<string, Record<string, TeamStanding>> = {}

  for (const m of groupMatches) {
    if (!m.group_name || m.home_score == null || m.away_score == null) continue
    const g = m.group_name
    if (!raw[g]) raw[g] = {}

    const initTeam = (id: string) => {
      if (!raw[g][id]) raw[g][id] = { teamId: id, points: 0, gf: 0, gd: 0 }
    }
    initTeam(m.home_team_id)
    initTeam(m.away_team_id)

    const home = raw[g][m.home_team_id]
    const away = raw[g][m.away_team_id]

    home.gf += m.home_score
    away.gf += m.away_score
    home.gd += m.home_score - m.away_score
    away.gd += m.away_score - m.home_score

    if (m.home_score > m.away_score)      { home.points += 3 }
    else if (m.away_score > m.home_score) { away.points += 3 }
    else                                   { home.points += 1; away.points += 1 }
  }

  const result: Record<string, TeamStanding[]> = {}
  for (const [g, teams] of Object.entries(raw)) {
    result[g] = Object.values(teams).sort(
      (a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf
    )
  }
  return result
}

// Rank all 12 third-place teams by pts → GD → GF, return the top 8 mapped by group
function calcTop8Thirds(standings: Record<string, TeamStanding[]>): Map<string, string> {
  const allThirds = Object.entries(standings)
    .filter(([, teams]) => teams.length >= 3)
    .map(([group, teams]) => ({ group, ...teams[2] }))

  allThirds.sort((a, b) =>
    b.points - a.points || b.gd - a.gd || b.gf - a.gf
  )

  const top8 = new Map<string, string>() // group → teamId
  allThirds.slice(0, 8).forEach(t => top8.set(t.group, t.teamId))
  return top8
}

// Assign each top-8 third to exactly one R32 slot (no repeats).
// Greedy by TEAM: process most-constrained teams first (fewest eligible slots).
function assignThirdsToSlots(
  top8: Map<string, string>,
  standings: Record<string, TeamStanding[]>,
): Map<number, string> {
  // Build slot → pool map for "third"-type slots
  const slotPools = new Map<number, string[]>()
  for (let i = 0; i < R32_DEFS.length; i++) {
    const def = R32_DEFS[i]
    if (def.home.type === "third")      slotPools.set(i, (def.home as { type: "third"; pool: string[] }).pool)
    else if (def.away.type === "third") slotPools.set(i, (def.away as { type: "third"; pool: string[] }).pool)
  }

  // For each top-8 third, list which slots it can fill
  const candidates = [...top8.entries()].map(([group, teamId]) => ({
    group,
    teamId,
    eligibleSlots: [...slotPools.entries()]
      .filter(([, pool]) => pool.includes(group))
      .map(([idx]) => idx),
  }))

  // Most constrained teams first (fewest eligible slots)
  candidates.sort((a, b) => a.eligibleSlots.length - b.eligibleSlots.length)

  const usedSlots = new Set<number>()
  const result = new Map<number, string>()

  for (const { teamId, eligibleSlots } of candidates) {
    const available = eligibleSlots.filter(s => !usedSlots.has(s))
    if (available.length === 0) continue
    const chosen = available[0]
    result.set(chosen, teamId)
    usedSlots.add(chosen)
  }

  return result
}

// ── Bracket builders ──────────────────────────────────────────────────────────

function emptySlot(): ActualMatchSlot {
  return { homeTeamId: null, awayTeamId: null, homeScore: null, awayScore: null, winnerId: null, status: "scheduled" }
}

function determineWinner(match: KnockoutMatch, penaltyEvents: PenaltyEvent[]): string | null {
  if (match.status !== "finished") return null
  if (match.home_score == null || match.away_score == null) return null
  if (!match.home_team_id || !match.away_team_id) return null

  if (match.home_score > match.away_score) return match.home_team_id
  if (match.away_score > match.home_score) return match.away_team_id

  const matchPens = penaltyEvents.filter(e => e.match_id === match.id && e.penalty_scored === true)
  const homeGoals = matchPens.filter(e => e.team_id === match.home_team_id).length
  const awayGoals = matchPens.filter(e => e.team_id === match.away_team_id).length
  if (homeGoals > awayGoals) return match.home_team_id
  if (awayGoals > homeGoals) return match.away_team_id
  return null
}

function buildActualSlots(
  knockoutMatches: KnockoutMatch[],
  penaltyEvents: PenaltyEvent[],
  groupStandings: Record<string, TeamStanding[]>,
  top8Thirds: Map<string, string>,
): ActualSlots {
  const slots: ActualSlots = {
    r32:   Array(16).fill(null).map(emptySlot),
    r16:   Array(8).fill(null).map(emptySlot),
    qf:    Array(4).fill(null).map(emptySlot),
    sf:    Array(2).fill(null).map(emptySlot),
    final: emptySlot(),
    third: emptySlot(),
  }

  // Populate from actual knockout match data
  for (const match of knockoutMatches) {
    const slot: ActualMatchSlot = {
      homeTeamId: match.home_team_id,
      awayTeamId: match.away_team_id,
      homeScore:  match.home_score,
      awayScore:  match.away_score,
      winnerId:   determineWinner(match, penaltyEvents),
      status:     match.status as ActualMatchSlot["status"],
    }
    const n = match.match_number
    if (match.stage === "final"        && n === FINAL_NUM)                       slots.final    = slot
    else if (match.stage === "third_place"  && n === THIRD_NUM)                  slots.third    = slot
    else if (match.stage === "round_of_32"  && R32_NUM_TO_SLOT[n] !== undefined) slots.r32[R32_NUM_TO_SLOT[n]] = slot
    else if (match.stage === "round_of_16"  && R16_NUM_TO_SLOT[n] !== undefined) slots.r16[R16_NUM_TO_SLOT[n]] = slot
    else if (match.stage === "quarter_final" && QF_NUM_TO_SLOT[n] !== undefined) slots.qf[QF_NUM_TO_SLOT[n]]   = slot
    else if (match.stage === "semi_final"    && SF_NUM_TO_SLOT[n] !== undefined) slots.sf[SF_NUM_TO_SLOT[n]]   = slot
  }

  // Fill R32 teams from group standings when not yet assigned by the DB
  const thirdAssignment = assignThirdsToSlots(top8Thirds, groupStandings)

  for (let i = 0; i < R32_DEFS.length; i++) {
    const def = R32_DEFS[i]
    const slot = slots.r32[i]

    if (!slot.homeTeamId) {
      if (def.home.type === "group") {
        slot.homeTeamId = groupStandings[def.home.group]?.[def.home.pos - 1]?.teamId ?? null
      } else {
        slot.homeTeamId = thirdAssignment.get(i) ?? null
      }
    }

    if (!slot.awayTeamId) {
      if (def.away.type === "group") {
        slot.awayTeamId = groupStandings[def.away.group]?.[def.away.pos - 1]?.teamId ?? null
      } else {
        slot.awayTeamId = thirdAssignment.get(i) ?? null
      }
    }
  }

  return slots
}

// ── Detail builder ────────────────────────────────────────────────────────────

const GROUPS_ORDER = ["A","B","C","D","E","F","G","H","I","J","K","L"]

function buildDetail(
  pred: BracketPredictionData,
  slots: ActualSlots,
  groupStandings: Record<string, TeamStanding[]>,
  top8Thirds: Map<string, string>,
): MemberBracketPoints["detail"] {
  const groups: GroupPredDetail[] = GROUPS_ORDER.map(g => ({
    group: g,
    predictedFirst:  pred.groups?.[g]?.first  ?? null,
    predictedSecond: pred.groups?.[g]?.second ?? null,
    actualFirst:  groupStandings[g]?.[0]?.teamId ?? null,
    actualSecond: groupStandings[g]?.[1]?.teamId ?? null,
  }))

  // "Sin importar el orden": each unique pick checked against the top-8 set
  const top8Set = new Set(top8Thirds.values())
  const seen = new Set<string>()
  const r32Thirds: SlotPredDetail[] = (pred.r32_third ?? [])
    .filter((id): id is string => !!id && !seen.has(id) && (seen.add(id), true))
    .map(teamId => ({
      predictedId: teamId,
      actualId: top8Set.has(teamId) ? teamId : null,
    }))

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

// ── Points calculation ────────────────────────────────────────────────────────

function calcBreakdown(
  pred: BracketPredictionData,
  slots: ActualSlots,
  groupStandings: Record<string, TeamStanding[]>,
  top8Thirds: Map<string, string>,
  pts: { groups: number; groupsThird: number; r32: number; r16: number; qf: number; sf: number; champion: number },
): MemberBracketPoints["breakdown"] {
  let groups = 0, r32 = 0, r16 = 0, qf = 0, sf = 0, champion = 0

  // Group stage: compare predicted 1st/2nd vs actual standings
  for (const [g, standing] of Object.entries(groupStandings)) {
    const actualFirst  = standing[0]?.teamId
    const actualSecond = standing[1]?.teamId
    if (actualFirst  && pred.groups?.[g]?.first  === actualFirst)  groups += pts.groups
    if (actualSecond && pred.groups?.[g]?.second === actualSecond) groups += pts.groups
  }

  // Third-place qualifiers: 1pt per unique pick that's in the top-8 set (sin importar el orden)
  const top8Set = new Set(top8Thirds.values())
  const counted = new Set<string>()
  for (const pick of pred.r32_third ?? []) {
    if (!pick || counted.has(pick)) continue
    counted.add(pick)
    if (top8Set.has(pick)) groups += pts.groupsThird
  }

  for (let i = 0; i < 16; i++) {
    const w = slots.r32[i]?.winnerId
    if (w && pred.r32?.[i] === w) r32 += pts.r32
  }
  for (let i = 0; i < 8; i++) {
    const w = slots.r16[i]?.winnerId
    if (w && pred.r16?.[i] === w) r16 += pts.r16
  }
  for (let i = 0; i < 4; i++) {
    const w = slots.qf[i]?.winnerId
    if (w && pred.qf?.[i] === w) qf += pts.qf
  }
  for (let i = 0; i < 2; i++) {
    const w = slots.sf[i]?.winnerId
    if (w && pred.sf?.[i] === w) sf += pts.sf
  }
  if (slots.final?.winnerId && pred.champion === slots.final.winnerId) {
    champion += pts.champion
  }

  return { groups, r32, r16, qf, sf, champion }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function LiveBracketPage({ params }: Props) {
  const { id: leagueId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const [{ data: rawLeague }, { data: rawMembership }] = await Promise.all([
    supabase.from("leagues").select("id, name").eq("id", leagueId).maybeSingle() as unknown as Promise<{ data: { id: string; name: string } | null }>,
    supabase.from("league_members").select("user_id").eq("league_id", leagueId).eq("user_id", user.id).maybeSingle() as unknown as Promise<{ data: { user_id: string } | null }>,
  ])

  if (!rawLeague) notFound()
  if (!rawMembership) notFound()

  const { data: rawMembers } = await supabase
    .from("league_members")
    .select("user_id")
    .eq("league_id", leagueId) as unknown as { data: { user_id: string }[] | null }

  const memberIds = (rawMembers ?? []).map(m => m.user_id)

  const [matchesRes, groupMatchesRes, eventsRes, predsRes, teamsRes, usersRes, ptsCfgRes] = await Promise.all([
    supabase
      .from("matches")
      .select("id, match_number, stage, home_team_id, away_team_id, home_score, away_score, status")
      .in("stage", ["round_of_32", "round_of_16", "quarter_final", "semi_final", "third_place", "final"])
      .order("match_number") as unknown as Promise<{ data: KnockoutMatch[] | null }>,

    supabase
      .from("matches")
      .select("home_team_id, away_team_id, home_score, away_score, group_name, status")
      .eq("stage", "group")
      .eq("status", "finished") as unknown as Promise<{ data: GroupMatch[] | null }>,

    supabase
      .from("match_events")
      .select("match_id, team_id, penalty_scored")
      .eq("type", "penalty") as unknown as Promise<{ data: PenaltyEvent[] | null }>,

    memberIds.length > 0
      ? (supabase
          .from("bracket_predictions")
          .select("user_id, predictions")
          .in("user_id", memberIds)
          .order("league_id", { nullsFirst: true }) as unknown as Promise<{ data: BracketPredRow[] | null }>)
      : Promise.resolve({ data: [] as BracketPredRow[] }),

    supabase
      .from("teams")
      .select("id, name, flag_url, fifa_code, group_name")
      .order("name") as unknown as Promise<{ data: TeamInfo[] | null }>,

    memberIds.length > 0
      ? (supabase
          .from("users")
          .select("id, name, avatar_url")
          .in("id", memberIds) as unknown as Promise<{ data: UserRow[] | null }>)
      : Promise.resolve({ data: [] as UserRow[] }),

    supabase
      .from("points_config")
      .select("category, points")
      .like("category", "bracket_%") as unknown as Promise<{ data: { category: string; points: number }[] | null }>,
  ])

  const knockoutMatches = matchesRes.data     ?? []
  const groupMatches    = groupMatchesRes.data ?? []
  const penaltyEvents   = eventsRes.data       ?? []
  const predsData       = predsRes.data         ?? []
  const teams           = teamsRes.data         ?? []
  const usersData       = usersRes.data         ?? []
  const ptsCfgData      = ptsCfgRes.data        ?? []

  const ptsCfgMap = Object.fromEntries(ptsCfgData.map(r => [r.category, r.points]))
  const pts = {
    groups:      ptsCfgMap["bracket_group_first"]    ?? 3,
    groupsThird: ptsCfgMap["bracket_group_third"]    ?? 1,
    r32:         ptsCfgMap["bracket_round_of_32"]    ?? 2,
    r16:         ptsCfgMap["bracket_round_of_16"]    ?? 4,
    qf:          ptsCfgMap["bracket_quarter_final"]  ?? 6,
    sf:          ptsCfgMap["bracket_semi_final"]     ?? 8,
    champion:    ptsCfgMap["bracket_final"]          ?? 10,
  }

  // Deduplicate predictions by user (prefer global null league_id, which comes first)
  const predByUser: Record<string, BracketPredictionData> = {}
  for (const row of predsData) {
    if (!predByUser[row.user_id]) predByUser[row.user_id] = row.predictions
  }

  const userMap = Object.fromEntries(usersData.map(u => [u.id, u]))

  const groupStandings = calcGroupStandings(groupMatches)
  const top8Thirds     = calcTop8Thirds(groupStandings)
  const actualSlots    = buildActualSlots(knockoutMatches, penaltyEvents, groupStandings, top8Thirds)

  const emptyDetail: MemberBracketPoints["detail"] = {
    groups:    GROUPS_ORDER.map(g => ({ group: g, predictedFirst: null, predictedSecond: null, actualFirst: null, actualSecond: null })),
    r32Thirds: R32_DEFS.filter(d => d.home.type === "third" || d.away.type === "third").map(d => ({ matchId: d.matchId, predictedId: null, actualId: null })),
    r32:       R32_DEFS.map(d  => ({ matchId: d.matchId,       predictedId: null, actualId: null })),
    r16:       R16_INFO.map(d  => ({ matchId: d.matchId,       predictedId: null, actualId: null })),
    qf:        QF_INFO.map(d   => ({ matchId: d.matchId,       predictedId: null, actualId: null })),
    sf:        SF_INFO.map(d   => ({ matchId: d.matchId,       predictedId: null, actualId: null })),
    champion:  { matchId: FINAL_INFO.matchId, predictedId: null, actualId: null },
  }

  const memberPoints: MemberBracketPoints[] = memberIds.map(uid => {
    const u    = userMap[uid]
    const pred = predByUser[uid]
    const breakdown = pred
      ? calcBreakdown(pred, actualSlots, groupStandings, top8Thirds, pts)
      : { groups: 0, r32: 0, r16: 0, qf: 0, sf: 0, champion: 0 }
    const detail = pred
      ? buildDetail(pred, actualSlots, groupStandings, top8Thirds)
      : emptyDetail
    const totalPoints = Object.values(breakdown).reduce((a, b) => a + b, 0)
    return {
      userId: uid,
      name: u?.name ?? "—",
      avatarUrl: u?.avatar_url ?? null,
      totalPoints,
      breakdown,
      detail,
    }
  })

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Breadcrumb crumbs={[
        { label: "Inicio", href: "/dashboard" },
        { label: "Mis ligas", href: "/league" },
        { label: rawLeague.name, href: `/league/${leagueId}` },
        { label: "Llaves" },
      ]} />

      <h1 className="text-2xl font-bold mb-6">Llaves</h1>

      <LiveBracketViewer
        actualSlots={actualSlots}
        teams={teams}
        memberPoints={memberPoints}
        currentUserId={user.id}
        pts={pts}
      />
    </div>
  )
}
