import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import bracketImg from "@/assets/img/brackets.png";
import predictImg from "@/assets/img/predict.png";
import UpcomingMatchCard from "./UpcomingMatchCard";
import type { MatchCardData } from "./UpcomingMatchCard";
import { JORNADA_DATE_BOUNDS } from "@/lib/utils/jornada";
import { BracketCountdown } from "@/components/BracketCountdown";
import { BRACKET_LOCK_TIME } from "@/lib/utils/bracket";

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

function jornadaSlugForMatch(match: MatchRow): string {
  if (match.stage !== "group") {
    const map: Record<string, string> = {
      round_of_32: "r32", round_of_16: "r16",
      quarter_final: "qf", semi_final: "sf",
      third_place: "final", final: "final",
    };
    return map[match.stage] ?? "j1";
  }
  const d = new Date(match.match_date);
  if (d >= JORNADA_DATE_BOUNDS.j3.from!) return "j3";
  if (d >= JORNADA_DATE_BOUNDS.j2.from!) return "j2";
  return "j1";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [profileResult, matchesResult, leaguesResult] = await Promise.all([
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
      .from("league_members")
      .select("league:leagues(id, name, invite_code)")
      .eq("user_id", user!.id)
      .limit(5),
  ]);

  const profile = profileResult.data as { name: string } | null;
  const matches = matchesResult.data ?? [];
  const matchIds = matches.map((m) => m.id);

  const rawLeagues = (leaguesResult.data ?? []) as unknown as { league: LeagueRow | null }[];
  const leagues = rawLeagues.filter((l) => l.league !== null).map((l) => l.league!);

  // Fetch match predictions
  const { data: rawPreds } = matchIds.length
    ? await supabase
        .from("match_predictions")
        .select("match_id, home_goals, away_goals, first_team_to_score, has_penalty, first_goal_scorer")
        .eq("user_id", user!.id)
        .is("league_id", null)
        .in("match_id", matchIds) as unknown as { data: PredRow[] | null }
    : { data: [] as PredRow[] };

  const predByMatchId = Object.fromEntries((rawPreds ?? []).map((p) => [p.match_id, p]));

  const matchCards: MatchCardData[] = matches.map((m) => ({
    ...m,
    prediction: predByMatchId[m.id] ?? null,
    jornadaSlug: jornadaSlugForMatch(m),
  }));

  // Fetch leaderboard for first league
  let leaderboard: LeaderboardEntry[] = [];
  let firstLeague: LeagueRow | null = leagues[0] ?? null;

  if (firstLeague) {
    const { data: rawMembers } = await supabase
      .from("league_members")
      .select("user_id, role")
      .eq("league_id", firstLeague.id) as unknown as { data: MemberRow[] | null };

    const members = rawMembers ?? [];
    const memberIds = members.map((m) => m.user_id);

    if (memberIds.length > 0) {
      const [usersRes, jornadaRes, bracketRes] = await Promise.all([
        supabase.from("users").select("id, name, avatar_url").in("id", memberIds) as unknown as Promise<{ data: UserRow[] | null }>,
        supabase.from("leaderboard_jornada").select("user_id, total_points").is("league_id", null).in("user_id", memberIds) as unknown as Promise<{ data: PtsRow[] | null }>,
        supabase.from("leaderboard_bracket").select("user_id, total_points").is("league_id", null).in("user_id", memberIds) as unknown as Promise<{ data: PtsRow[] | null }>,
      ]);

      const userMap = Object.fromEntries((usersRes.data ?? []).map((u) => [u.id, u]));
      const jornadaMap = Object.fromEntries((jornadaRes.data ?? []).map((r) => [r.user_id, r.total_points]));
      const bracketMap = Object.fromEntries((bracketRes.data ?? []).map((r) => [r.user_id, r.total_points]));

      leaderboard = members
        .map((m) => {
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
        .sort((a, b) => b.totalPts - a.totalPts || b.jornadaPts - a.jornadaPts)
        .slice(0, 5);
    }
  }

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
          {firstLeague && leaderboard.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-base truncate">{firstLeague.name}</h2>
                <Link href={`/league/${firstLeague.id}`} className="text-sm text-(--color-muted) hover:text-white transition-colors shrink-0 ml-2">
                  Ver todo →
                </Link>
              </div>
              <div className="bg-(--color-surface) border border-(--color-border) rounded-xl overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-[1.5rem_1fr_3.5rem_3.5rem] gap-2 px-3 py-2 border-b border-(--color-border)">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">#</span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted)">Jugador</span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted) text-right">Jorn.</span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-(--color-muted) text-right">Total</span>
                </div>
                {leaderboard.map((row, i) => (
                  <div
                    key={row.userId}
                    className={`grid grid-cols-[1.5rem_1fr_3.5rem_3.5rem] gap-2 px-3 py-2.5 items-center border-b border-(--color-border)/40 last:border-0 ${
                      row.isMe ? "bg-(--color-accent)/5" : ""
                    }`}
                  >
                    <span className={`text-xs font-bold tabular-nums ${
                      i === 0 ? "text-yellow-400" : i === 1 ? "text-zinc-300" : i === 2 ? "text-amber-600" : "text-(--color-muted)"
                    }`}>
                      {i + 1}
                    </span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      {row.avatarUrl ? (
                        <Image
                          src={row.avatarUrl}
                          alt={row.name}
                          width={22}
                          height={22}
                          className="rounded-full shrink-0 object-cover"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-white/10 shrink-0 flex items-center justify-center text-[9px] font-bold">
                          {row.name[0]?.toUpperCase() ?? "?"}
                        </div>
                      )}
                      <span className={`text-xs truncate ${row.isMe ? "font-semibold text-(--color-accent)" : ""}`}>
                        {row.name}{row.isMe && " (tú)"}
                      </span>
                    </div>
                    <span className="text-xs tabular-nums text-right text-(--color-muted)">{row.jornadaPts}</span>
                    <span className={`text-xs tabular-nums text-right font-semibold ${row.isMe ? "text-(--color-accent)" : "text-white"}`}>
                      {row.totalPts}
                    </span>
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
