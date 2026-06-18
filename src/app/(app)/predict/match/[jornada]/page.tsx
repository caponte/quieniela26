import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  JORNADA_INFO,
  getGroupRoundMatchIds,
  isValidJornadaSlug,
} from "@/lib/utils/jornada"
import type { JornadaSlug } from "@/lib/utils/jornada"
import MatchdayForm from "./MatchdayForm"
import type { MatchWithTeams, MatchPredictionRow, PlayerRow, MatchResultEvents } from "@/lib/utils/matchTypes"
import { Breadcrumb } from "@/components/Breadcrumb"
import type { LeagueMemberPred } from "./MatchdayForm"
import { calculateLivePoints } from "@/lib/utils/livePoints"
import type { LiveMatchState } from "@/lib/utils/livePoints"

interface Props {
  params: Promise<{ jornada: string }>
  searchParams: Promise<{ match?: string }>
}

export default async function JornadaPage({ params, searchParams }: Props) {
  const { jornada } = await params
  const { match: initialMatchId } = await searchParams
  if (!isValidJornadaSlug(jornada)) notFound()

  const slug = jornada as JornadaSlug
  const info = JORNADA_INFO[slug]

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Build query for this jornada's matches
  let rawMatches: MatchWithTeams[] | null = null
  let previousResults: { id: string; homeCode: string; awayCode: string; homeScore: number; awayScore: number; homeTeamId: string | null; awayTeamId: string | null }[] = []

  if (info.isGroup) {
    const round = slug === "j1" ? 1 : slug === "j2" ? 2 : 3

    // Fetch all group matches with full data, then filter by round
    const { data: allGroupMatches } = await supabase
      .from("matches")
      .select(`
        id, match_date, stage, match_number, group_name, home_score, away_score, status, fifa_match_id,
        home_team:home_team_id ( id, name, fifa_code, flag_url ),
        away_team:away_team_id ( id, name, fifa_code, flag_url )
      `)
      .eq("stage", "group")
      .order("match_date", { ascending: true })
      .order("match_number", { ascending: true }) as unknown as { data: MatchWithTeams[] | null }

    const roundIds = getGroupRoundMatchIds(allGroupMatches ?? [], round as 1 | 2 | 3)
    rawMatches = (allGroupMatches ?? []).filter((m) => roundIds.has(m.id))

    if (round > 1) {
      const prevIds = new Set<string>()
      for (let r = 1; r < round; r++) {
        getGroupRoundMatchIds(allGroupMatches ?? [], r as 1 | 2 | 3).forEach((id) => prevIds.add(id))
      }
      previousResults = (allGroupMatches ?? [])
        .filter((m) => prevIds.has(m.id) && m.home_score !== null && m.away_score !== null)
        .map((m) => ({
          id: m.id,
          homeCode: m.home_team?.fifa_code ?? "?",
          awayCode: m.away_team?.fifa_code ?? "?",
          homeScore: m.home_score!,
          awayScore: m.away_score!,
          homeTeamId: m.home_team?.id ?? null,
          awayTeamId: m.away_team?.id ?? null,
        }))
    }
  } else {
    const { data } = await supabase
      .from("matches")
      .select(`
        id, match_date, stage, match_number, group_name, home_score, away_score, status, fifa_match_id,
        home_team:home_team_id ( id, name, fifa_code, flag_url ),
        away_team:away_team_id ( id, name, fifa_code, flag_url )
      `)
      .eq("stage", info.stage!)
      .order("match_date", { ascending: true })
      .order("match_number", { ascending: true }) as unknown as { data: MatchWithTeams[] | null }
    rawMatches = data
  }

  if (!rawMatches || rawMatches.length === 0) {
    return (
      <div className="text-center py-20 text-(--color-muted)">
        <p className="text-4xl mb-4">⏳</p>
        <p className="text-lg font-semibold">Sin partidos todavía</p>
        <p className="text-sm mt-1">Los partidos de {info.label} aún no están programados.</p>
      </div>
    )
  }

  // Fetch existing predictions for these match IDs
  const matchIds = rawMatches.map((m) => m.id)
  const { data: rawPredictions } = await supabase
    .from("match_predictions")
    .select("match_id, home_goals, away_goals, first_team_to_score, has_penalty, first_goal_scorer, first_goal_scorer_id")
    .eq("user_id", user.id)
    .is("league_id", null)
    .in("match_id", matchIds) as unknown as { data: MatchPredictionRow[] | null }

  // Fetch players in chunks of 20 teams to stay well under Supabase's 1000-row default limit
  const teamIds = Array.from(
    new Set(rawMatches.flatMap((m) => [m.home_team?.id, m.away_team?.id].filter(Boolean) as string[]))
  )
  const CHUNK = 20
  const playerChunks = await Promise.all(
    Array.from({ length: Math.ceil(teamIds.length / CHUNK) }, (_, i) =>
      supabase
        .from("players")
        .select("id, name, position, jersey_number, team_id, fifa_player_id")
        .in("team_id", teamIds.slice(i * CHUNK, (i + 1) * CHUNK))
        .order("jersey_number", { ascending: true })
    )
  )
  const rawPlayers = playerChunks.flatMap((r) => (r as unknown as { data: PlayerRow[] | null }).data ?? [])

  const predictionsByMatchId = Object.fromEntries(
    (rawPredictions ?? []).map((p) => [p.match_id, p])
  )

  // Fetch FIFA lineups (starters) for matches that have a fifa_match_id
  const starterFifaIdsByMatchId: Record<string, Set<string>> = {}
  const fifaMatchesToFetch = rawMatches.filter((m) => m.fifa_match_id)
  if (fifaMatchesToFetch.length > 0) {
    const lineupResults = await Promise.allSettled(
      fifaMatchesToFetch.map(async (m) => {
        const res = await fetch(
          `https://api.fifa.com/api/v3/live/football/${m.fifa_match_id}`,
          { next: { revalidate: 300 } }
        )
        if (!res.ok) return null
        const data = await res.json()
        // FIFA Status === 1 means starting XI; Status === 2 means substitute
        const homePlayers: { IdPlayer: string; Status: number }[] = data?.HomeTeam?.Players ?? []
        const awayPlayers: { IdPlayer: string; Status: number }[] = data?.AwayTeam?.Players ?? []
        const starters = [...homePlayers, ...awayPlayers]
          .filter((p) => p.Status === 1)
          .map((p) => p.IdPlayer)
        return { matchId: m.id, starters }
      })
    )
    for (const r of lineupResults) {
      if (r.status === "fulfilled" && r.value && r.value.starters.length > 0) {
        starterFifaIdsByMatchId[r.value.matchId] = new Set(r.value.starters)
      }
    }
  }

  // Fetch match events (first goal + penalties) for live and finished matches
  const activeMatchIds = rawMatches.filter((m) => m.status === "live" || m.status === "finished").map((m) => m.id)
  const matchResultEventsMap: Record<string, MatchResultEvents> = {}
  const liveStateMap: Record<string, LiveMatchState> = {}
  if (activeMatchIds.length > 0) {
    const { data: activeEvents } = await supabase
      .from("match_events")
      .select("match_id, team_id, player_name, is_first_goal, type")
      .in("match_id", activeMatchIds)
      .eq("is_own_goal", false) as unknown as { data: { match_id: string; team_id: string; player_name: string | null; is_first_goal: boolean; type: string }[] | null }

    for (const m of rawMatches.filter((m) => m.status === "live" || m.status === "finished")) {
      const evts = (activeEvents ?? []).filter((e) => e.match_id === m.id)
      const firstGoalEvt = evts.find((e) => e.is_first_goal)
      matchResultEventsMap[m.id] = {
        firstGoalScorerName: firstGoalEvt?.player_name ?? null,
        firstGoalTeamId: firstGoalEvt?.team_id ?? null,
        hasPenalty: evts.some((e) => e.type === "penalty"),
      }
      if (m.status === "live") {
        liveStateMap[m.id] = {
          homeScore: m.home_score ?? 0,
          awayScore: m.away_score ?? 0,
          firstGoalTeamId: firstGoalEvt?.team_id ?? null,
          firstGoalScorerName: firstGoalEvt?.player_name ?? null,
          hasPenalty: evts.some((e) => e.type === "penalty"),
        }
      }
    }
  }

  // Fetch league members' predictions
  const { data: leagueMemberships } = await supabase
    .from("league_members")
    .select("league_id")
    .eq("user_id", user.id)
    .limit(1)

  const firstLeagueId = (leagueMemberships as { league_id: string }[] | null)?.[0]?.league_id ?? null

  let leaguePredsByMatchId: Record<string, LeagueMemberPred[]> = {}

  if (firstLeagueId && matchIds.length > 0) {
    const { data: members } = await supabase
      .from("league_members")
      .select("user_id")
      .eq("league_id", firstLeagueId) as unknown as { data: { user_id: string }[] | null }

    const memberIds = (members ?? []).map((m) => m.user_id)

    const [leaguePredsRes, profilesRes, jornadaPtsRes, bracketPtsRes] = await Promise.all([
      supabase
        .from("match_predictions")
        .select("user_id, match_id, home_goals, away_goals, first_team_to_score, first_goal_scorer, has_penalty, match_points(total_points, breakdown)")
        .in("match_id", matchIds)
        .in("user_id", memberIds)
        .or(`league_id.is.null,league_id.eq.${firstLeagueId}`) as unknown as Promise<{ data: { user_id: string; match_id: string; home_goals: number; away_goals: number; first_team_to_score: string | null; first_goal_scorer: string | null; has_penalty: boolean; match_points: { total_points: number; breakdown: Record<string, boolean> | null } | null }[] | null }>,

      supabase
        .from("users")
        .select("id, name, avatar_url")
        .in("id", memberIds) as unknown as Promise<{ data: { id: string; name: string; avatar_url: string | null }[] | null }>,

      supabase
        .from("leaderboard_jornada")
        .select("user_id, total_points")
        .in("user_id", memberIds) as unknown as Promise<{ data: { user_id: string; total_points: number }[] | null }>,

      supabase
        .from("leaderboard_bracket")
        .select("user_id, total_points")
        .in("user_id", memberIds) as unknown as Promise<{ data: { user_id: string; total_points: number }[] | null }>,
    ])

    const profileMap = Object.fromEntries((profilesRes.data ?? []).map((u) => [u.id, u]))
    const jornadaMap = (jornadaPtsRes.data ?? []).reduce<Record<string, number>>((acc, r) => { acc[r.user_id] = (acc[r.user_id] ?? 0) + r.total_points; return acc }, {})
    const bracketMap = (bracketPtsRes.data ?? []).reduce<Record<string, number>>((acc, r) => { acc[r.user_id] = (acc[r.user_id] ?? 0) + r.total_points; return acc }, {})

    // Deduplicate: keep only the last prediction per (user_id, match_id)
    const seen = new Set<string>()
    for (const pred of [...(leaguePredsRes.data ?? [])].reverse()) {
      const key = `${pred.match_id}:${pred.user_id}`
      if (seen.has(key)) continue
      seen.add(key)
      if (!leaguePredsByMatchId[pred.match_id]) leaguePredsByMatchId[pred.match_id] = []
      const profile = profileMap[pred.user_id]
      const liveState = liveStateMap[pred.match_id] ?? null
      const liveCalc = liveState
        ? calculateLivePoints({ homeGoals: pred.home_goals, awayGoals: pred.away_goals, firstTeamToScoreId: pred.first_team_to_score, firstGoalScorer: pred.first_goal_scorer, hasPenalty: pred.has_penalty }, liveState)
        : null
      leaguePredsByMatchId[pred.match_id].push({
        userId: pred.user_id,
        name: profile?.name ?? "—",
        avatarUrl: profile?.avatar_url ?? null,
        homeGoals: pred.home_goals,
        awayGoals: pred.away_goals,
        firstTeamToScoreId: pred.first_team_to_score,
        firstGoalScorer: pred.first_goal_scorer,
        hasPenalty: pred.has_penalty,
        isMe: pred.user_id === user.id,
        totalPoints: (jornadaMap[pred.user_id] ?? 0) + (bracketMap[pred.user_id] ?? 0),
        matchPoints: pred.match_points?.total_points ?? null,
        finishedBreakdown: pred.match_points?.breakdown ?? null,
        livePoints: liveCalc?.total ?? null,
        liveBreakdown: liveCalc,
      })
    }
  }

  return (
    <>
      <div className="max-w-lg mx-auto px-4 pt-6">
        <Breadcrumb crumbs={[
          { label: "Inicio", href: "/dashboard" },
          { label: "Modo Jornada", href: "/predict/match" },
          { label: info.label },
        ]} />
      </div>
      <MatchdayForm
        slug={slug}
        label={info.label}
        matches={rawMatches}
        predictionsByMatchId={predictionsByMatchId}
        players={rawPlayers ?? []}
        leaguePredsByMatchId={leaguePredsByMatchId}
        matchResultEventsByMatchId={matchResultEventsMap}
        starterFifaIdsByMatchId={Object.fromEntries(
          Object.entries(starterFifaIdsByMatchId).map(([k, v]) => [k, [...v]])
        )}
        previousResults={previousResults}
        initialMatchId={initialMatchId}
      />
    </>
  )
}
