import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import bracketImg from "@/assets/img/brackets.png";
import predictImg from "@/assets/img/predict.png";
import UpcomingMatchCard from "./UpcomingMatchCard";
import type { MatchCardData, LeagueFullPred } from "./UpcomingMatchCard";
import { getGroupRoundMatchIds } from "@/lib/utils/jornada";
import { BracketCountdown } from "@/components/BracketCountdown";
import { BRACKET_LOCK_TIME } from "@/lib/utils/bracket";
import { calculateLivePoints } from "@/lib/utils/livePoints";
import type { LiveMatchState } from "@/lib/utils/livePoints";

interface MatchRow {
  id: string;
  match_number: number;
  match_date: string;
  stage: string;
  group_name: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string;
  home_team: { id: string; name: string; flag_url: string | null; fifa_code: string } | null;
  away_team: { id: string; name: string; flag_url: string | null; fifa_code: string } | null;
}

interface PredRow {
  match_id: string;
  home_goals: number;
  away_goals: number;
  first_team_to_score: string | null;
  has_penalty: boolean;
  first_goal_scorer: string | null;
}

interface LeagueRow { id: string; name: string; invite_code: string }
interface MemberRow { user_id: string; role: string }
interface UserRow { id: string; name: string; avatar_url: string | null }
interface PtsRow { user_id: string; total_points: number }

interface LeaderboardEntry {
  userId: string;
  name: string;
  avatarUrl: string | null;
  jornadaPts: number;
  bracketPts: number;
  totalPts: number;
  isMe: boolean;
}

function jornadaSlugForMatch(match: MatchRow, roundIdSets: { j1: Set<string>; j2: Set<string>; j3: Set<string> }): string {
  if (match.stage !== "group") {
    const map: Record<string, string> = {
      round_of_32: "r32", round_of_16: "r16",
      quarter_final: "qf", semi_final: "sf",
      third_place: "final", final: "final",
    };
    return map[match.stage] ?? "j1";
  }
  if (roundIdSets.j3.has(match.id)) return "j3";
  if (roundIdSets.j2.has(match.id)) return "j2";
  return "j1";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Step 1: core data in parallel
  const [profileResult, matchesResult, liveMatchesResult, leaguesResult, groupMatchesResult] = await Promise.all([
    supabase.from("users").select("name").eq("id", user!.id).single(),

    supabase
      .from("matches")
      .select(
        `id, match_number, match_date, stage, group_name, home_score, away_score, status,
         home_team:teams!matches_home_team_id_fkey(id, name, flag_url, fifa_code),
         away_team:teams!matches_away_team_id_fkey(id, name, flag_url, fifa_code)`
      )
      .gte("match_date", new Date().toISOString())
      .order("match_date", { ascending: true })
      .limit(6) as unknown as Promise<{ data: MatchRow[] | null }>,

    supabase
      .from("matches")
      .select(
        `id, match_number, match_date, stage, group_name, home_score, away_score, status,
         home_team:teams!matches_home_team_id_fkey(id, name, flag_url, fifa_code),
         away_team:teams!matches_away_team_id_fkey(id, name, flag_url, fifa_code)`
      )
      .eq("status", "live")
      .order("match_date", { ascending: true }) as unknown as Promise<{ data: MatchRow[] | null }>,

    supabase
      .from("league_members")
      .select("league:leagues(id, name, invite_code)")
      .eq("user_id", user!.id)
      .limit(5),

    supabase
      .from("matches")
      .select("id, match_date, group_name")
      .eq("stage", "group") as unknown as Promise<{ data: { id: string; match_date: string; group_name: string | null }[] | null }>,
  ]);

  const profile = profileResult.data as { name: string } | null;
  const matches = matchesResult.data ?? [];
  const liveMatches = liveMatchesResult.data ?? [];

  // Fetch first-goal events for live matches
  const liveMatchStateMap: Record<string, LiveMatchState> = {};
  if (liveMatches.length > 0) {
    const liveIds = liveMatches.map((m) => m.id);
    const { data: firstGoalEvents } = await supabase
      .from("match_events")
      .select("match_id, team_id, player_name")
      .in("match_id", liveIds)
      .eq("is_first_goal", true)
      .eq("is_own_goal", false)
      .limit(liveIds.length) as unknown as { data: { match_id: string; team_id: string; player_name: string | null }[] | null };

    for (const m of liveMatches) {
      const evt = (firstGoalEvents ?? []).find((e) => e.match_id === m.id);
      liveMatchStateMap[m.id] = {
        homeScore: m.home_score ?? 0,
        awayScore: m.away_score ?? 0,
        firstGoalTeamId: evt?.team_id ?? null,
        firstGoalScorerName: evt?.player_name ?? null,
      };
    }
  }
  const matchIds = matches.map((m) => m.id);

  const allGroupMatches = groupMatchesResult.data ?? [];
  const groupRoundIds = {
    j1: getGroupRoundMatchIds(allGroupMatches, 1),
    j2: getGroupRoundMatchIds(allGroupMatches, 2),
    j3: getGroupRoundMatchIds(allGroupMatches, 3),
  };

  const rawLeagues = (leaguesResult.data ?? []) as unknown as { league: LeagueRow | null }[];
  const leagues = rawLeagues.filter((l) => l.league !== null).map((l) => l.league!);
  const firstLeague: LeagueRow | null = leagues[0] ?? null;

  const liveMatchIds = liveMatches.map((m) => m.id);
  const allPredMatchIds = [...new Set([...matchIds, ...liveMatchIds])];

  // Step 2: user's own predictions + first league members (parallel)
  const [rawPredsResult, firstLeagueMembersResult] = await Promise.all([
    allPredMatchIds.length
      ? supabase
          .from("match_predictions")
          .select("match_id, home_goals, away_goals, first_team_to_score, has_penalty, first_goal_scorer")
          .eq("user_id", user!.id)
          .is("league_id", null)
          .in("match_id", allPredMatchIds) as unknown as Promise<{ data: PredRow[] | null }>
      : Promise.resolve({ data: [] as PredRow[] }),

    firstLeague
      ? supabase
          .from("league_members")
          .select("user_id, role")
          .eq("league_id", firstLeague.id) as unknown as Promise<{ data: MemberRow[] | null }>
      : Promise.resolve({ data: [] as MemberRow[] }),
  ]);

  const predByMatchId = Object.fromEntries((rawPredsResult.data ?? []).map((p) => [p.match_id, p]));
  const firstLeagueMembers = firstLeagueMembersResult.data ?? [];
  const firstLeagueMemberIds = firstLeagueMembers.map((m) => m.user_id);

  // Step 3: leaderboard profiles/points + league pred counts (parallel)
  const [usersRes, jornadaRes, bracketRes, leaguePredsRes] = await Promise.all([
    firstLeagueMemberIds.length
      ? supabase.from("users").select("id, name, avatar_url").in("id", firstLeagueMemberIds) as unknown as Promise<{ data: UserRow[] | null }>
      : Promise.resolve({ data: [] as UserRow[] }),

    firstLeagueMemberIds.length
      ? supabase.from("leaderboard_jornada").select("user_id, total_points").is("league_id", null).in("user_id", firstLeagueMemberIds) as unknown as Promise<{ data: PtsRow[] | null }>
      : Promise.resolve({ data: [] as PtsRow[] }),

    firstLeagueMemberIds.length
      ? supabase.from("leaderboard_bracket").select("user_id, total_points").is("league_id", null).in("user_id", firstLeagueMemberIds) as unknown as Promise<{ data: PtsRow[] | null }>
      : Promise.resolve({ data: [] as PtsRow[] }),

    firstLeagueMemberIds.length && allPredMatchIds.length
      ? supabase
          .from("match_predictions")
          .select("match_id, user_id, home_goals, away_goals, first_team_to_score, first_goal_scorer, has_penalty")
          .in("match_id", allPredMatchIds)
          .in("user_id", firstLeagueMemberIds)
          .or(`league_id.is.null,league_id.eq.${firstLeague!.id}`) as unknown as Promise<{ data: { match_id: string; user_id: string; home_goals: number; away_goals: number; first_team_to_score: string | null; first_goal_scorer: string | null; has_penalty: boolean }[] | null }>

      : Promise.resolve({ data: [] as { match_id: string; user_id: string; home_goals: number; away_goals: number; first_team_to_score: string | null; first_goal_scorer: string | null; has_penalty: boolean }[] }),
  ]);

  const userMap = Object.fromEntries((usersRes.data ?? []).map((u) => [u.id, u]));
  const jornadaMap = Object.fromEntries((jornadaRes.data ?? []).map((r) => [r.user_id, r.total_points]));
  const bracketMap = Object.fromEntries((bracketRes.data ?? []).map((r) => [r.user_id, r.total_points]));

  // League predictors per match (deduplicated — NULL unique constraint doesn't hold in Postgres)
  const leaguePredsPerMatch: Record<string, { name: string; avatarUrl: string | null }[]> = {};
  const leagueFullPredsPerMatch: Record<string, LeagueFullPred[]> = {};
  const seenPred = new Set<string>();
  for (const p of [...(leaguePredsRes.data ?? [])].reverse()) {
    const key = `${p.match_id}:${p.user_id}`;
    if (seenPred.has(key)) continue;
    seenPred.add(key);
    const u = userMap[p.user_id];
    if (!u) continue;
    if (!leaguePredsPerMatch[p.match_id]) leaguePredsPerMatch[p.match_id] = [];
    leaguePredsPerMatch[p.match_id].push({ name: u.name, avatarUrl: u.avatar_url });
    if (!leagueFullPredsPerMatch[p.match_id]) leagueFullPredsPerMatch[p.match_id] = [];
    leagueFullPredsPerMatch[p.match_id].push({
      userId: p.user_id,
      name: u.name,
      avatarUrl: u.avatar_url,
      homeGoals: p.home_goals,
      awayGoals: p.away_goals,
      firstTeamToScoreId: p.first_team_to_score,
      firstGoalScorer: p.first_goal_scorer,
      isMe: p.user_id === user!.id,
      totalPoints: (jornadaMap[p.user_id] ?? 0) + (bracketMap[p.user_id] ?? 0),
      livePoints: liveMatchStateMap[p.match_id]
        ? calculateLivePoints({ homeGoals: p.home_goals, awayGoals: p.away_goals, firstTeamToScoreId: p.first_team_to_score, firstGoalScorer: p.first_goal_scorer }, liveMatchStateMap[p.match_id]).total
        : null,
      liveBreakdown: liveMatchStateMap[p.match_id]
        ? calculateLivePoints({ homeGoals: p.home_goals, awayGoals: p.away_goals, firstTeamToScoreId: p.first_team_to_score, firstGoalScorer: p.first_goal_scorer }, liveMatchStateMap[p.match_id])
        : null,
    });
  }

  const matchCards: MatchCardData[] = matches.map((m) => ({
    ...m,
    prediction: predByMatchId[m.id] ?? null,
    jornadaSlug: jornadaSlugForMatch(m, groupRoundIds),
    leaguePredictors: firstLeagueMemberIds.length > 0 ? (leaguePredsPerMatch[m.id] ?? []) : null,
    leagueTotal: firstLeagueMemberIds.length > 0 ? firstLeagueMemberIds.length : null,
    leagueFullPreds: firstLeagueMemberIds.length > 0 ? (leagueFullPredsPerMatch[m.id] ?? []) : null,
  }));

  const liveMatchCards: MatchCardData[] = liveMatches.map((m) => ({
    ...m,
    prediction: predByMatchId[m.id] ?? null,
    jornadaSlug: jornadaSlugForMatch(m, groupRoundIds),
    leaguePredictors: firstLeagueMemberIds.length > 0 ? (leaguePredsPerMatch[m.id] ?? []) : null,
    leagueTotal: firstLeagueMemberIds.length > 0 ? firstLeagueMemberIds.length : null,
    leagueFullPreds: firstLeagueMemberIds.length > 0 ? (leagueFullPredsPerMatch[m.id] ?? []) : null,
  }));

  // Leaderboard

  const leaderboardBase: LeaderboardEntry[] = firstLeague && firstLeagueMemberIds.length > 0
    ? firstLeagueMembers.map((m) => {
        const u = userMap[m.user_id];
        const jornadaPts = jornadaMap[m.user_id] ?? 0;
        const bracketPts = bracketMap[m.user_id] ?? 0;
        return {
          userId: m.user_id,
          name: u?.name ?? "—",
          avatarUrl: u?.avatar_url ?? null,
          jornadaPts,
          bracketPts,
          totalPts: jornadaPts + bracketPts,
          isMe: m.user_id === user!.id,
        };
      })
    : [];

  const leaderboardByTotal   = [...leaderboardBase].sort((a, b) => b.totalPts   - a.totalPts   || b.jornadaPts - a.jornadaPts).slice(0, 5);
  const leaderboardByJornada = [...leaderboardBase].sort((a, b) => b.jornadaPts - a.jornadaPts || b.totalPts   - a.totalPts).slice(0, 5);
  const leaderboardByBracket = [...leaderboardBase].sort((a, b) => b.bracketPts - a.bracketPts || b.totalPts   - a.totalPts).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <section>
        <h1 className="text-2xl font-bold">
          Hola, {profile?.name?.split(" ")[0] ?? "jugador"} 👋
        </h1>
        <p className="text-(--color-muted) text-sm mt-1">
          El Mundial empieza el 11 de junio. ¿Tienes tus predicciones listas?
        </p>
      </section>

      {/* Bracket countdown */}
      {Date.now() < BRACKET_LOCK_TIME.getTime() && <BracketCountdown />}

      {/* Quick actions */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/predict/bracket" className="group relative overflow-hidden rounded-2xl h-44 flex flex-col justify-end">
          <Image
            src={bracketImg}
            alt="Modo Bracket"
            fill
            className="object-cover object-center transition duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent" />
          <div className="relative px-5 pb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-0.5">Modo Bracket</p>
            <h2 className="font-bold text-lg text-white leading-tight">Predice el torneo completo</h2>
            <p className="text-white/60 text-xs mt-1 leading-snug">Grupos, octavos, cuartos, semis y la gran final.</p>
          </div>
          <div className="absolute top-3 right-4 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5 text-xs font-medium text-white/80">
            <span>▶</span> PLAY
          </div>
        </Link>

        <Link href="/predict/match" className="group relative overflow-hidden rounded-2xl h-44 flex flex-col justify-end">
          <Image
            src={predictImg}
            alt="Modo Jornada"
            fill
            className="object-cover object-center transition duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent" />
          <div className="relative px-5 pb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-0.5">Modo Jornada</p>
            <h2 className="font-bold text-lg text-white leading-tight">Predice partido a partido</h2>
            <p className="text-white/60 text-xs mt-1 leading-snug">Hasta 10 min antes del kick-off, con bonos por goleador y penales.</p>
          </div>
          <div className="absolute top-3 right-4 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5 text-xs font-medium text-white/80">
            <span>📅</span> CALENDAR
          </div>
        </Link>
      </section>

      {/* Live matches */}
      {liveMatchCards.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
            <h2 className="font-bold text-lg text-green-400">En vivo</h2>
          </div>
          <div className="space-y-2">
            {liveMatchCards.map((match) => (
              <UpcomingMatchCard key={match.id} match={match} />
            ))}
          </div>
        </section>
      )}

      {/* Two-column layout: matches | leagues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Left: upcoming matches */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg">Próximos partidos</h2>
            <Link href="/predict/match" className="text-sm text-(--color-muted) hover:text-white transition-colors">
              Ver todos →
            </Link>
          </div>
          {!matchCards.length ? (
            <p className="text-(--color-muted) text-sm">No hay partidos próximos cargados aún.</p>
          ) : (
            <div className="space-y-2">
              {matchCards.map((match) => (
                <UpcomingMatchCard key={match.id} match={match} />
              ))}
            </div>
          )}
        </section>

        {/* Right: leagues + leaderboard preview */}
        <section className="space-y-6">

          {/* My leagues list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-lg">Mis ligas</h2>
              <Link href="/league/create" className="text-sm text-(--color-muted) hover:text-white transition-colors">
                + Crear
              </Link>
            </div>
            {!leagues.length ? (
              <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-5 text-center">
                <p className="text-(--color-muted) text-sm mb-3">Aún no perteneces a ninguna liga privada.</p>
                <div className="flex items-center justify-center gap-3">
                  <Link href="/league/create" className="text-sm bg-(--color-primary) hover:bg-green-700 text-white px-4 py-2 rounded-lg transition">
                    Crear liga
                  </Link>
                  <Link href="/league/join" className="text-sm border border-(--color-border) hover:bg-(--color-surface-2) px-4 py-2 rounded-lg transition">
                    Unirse
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {leagues.map((league) => (
                  <Link
                    key={league.id}
                    href={`/league/${league.id}`}
                    className="flex items-center justify-between bg-(--color-surface) border border-(--color-border) rounded-xl px-4 py-3 hover:border-(--color-primary) transition"
                  >
                    <span className="font-medium text-sm">{league.name}</span>
                    <span className="text-(--color-muted) text-xs">Ver ranking →</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Leaderboard preview for first league */}
          {firstLeague && leaderboardBase.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-base truncate">{firstLeague.name}</h2>
                <Link href={`/league/${firstLeague.id}`} className="text-sm text-(--color-muted) hover:text-white transition-colors shrink-0 ml-2">
                  Ver todo →
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { title: "Jornada", data: leaderboardByJornada, pts: (r: LeaderboardEntry) => r.jornadaPts },
                  { title: "Bracket", data: leaderboardByBracket, pts: (r: LeaderboardEntry) => r.bracketPts },
                  { title: "Total",   data: leaderboardByTotal,   pts: (r: LeaderboardEntry) => r.totalPts   },
                ] as const).map(({ title, data, pts }) => (
                  <div key={title} className="bg-(--color-surface) border border-(--color-border) rounded-xl overflow-hidden">
                    <div className="px-2 py-1.5 border-b border-(--color-border)">
                      <span className="text-[9px] font-semibold uppercase tracking-widest text-(--color-muted)">{title}</span>
                    </div>
                    {data.map((row, i) => (
                      <div key={row.userId} className={`flex items-center gap-1 px-2 py-1.5 border-b border-(--color-border)/40 last:border-0 ${row.isMe ? "bg-(--color-accent)/5" : ""}`}>
                        <span className={`text-[10px] font-bold tabular-nums w-4 shrink-0 ${i === 0 ? "text-yellow-400" : i === 1 ? "text-zinc-300" : i === 2 ? "text-amber-600" : "text-(--color-muted)"}`}>{i + 1}</span>
                        {row.avatarUrl ? (
                          <Image src={row.avatarUrl} alt={row.name} width={16} height={16} className="w-4 h-4 rounded-full shrink-0 object-cover" />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-white/10 shrink-0 flex items-center justify-center text-[8px] font-bold">{row.name[0]?.toUpperCase() ?? "?"}</div>
                        )}
                        <span className={`text-[11px] truncate flex-1 min-w-0 ${row.isMe ? "font-semibold text-(--color-accent)" : ""}`}>{row.name}</span>
                        <span className={`text-[11px] tabular-nums shrink-0 font-semibold ${row.isMe ? "text-(--color-accent)" : "text-white"}`}>{pts(row)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

        </section>
      </div>
    </div>
  );
}
