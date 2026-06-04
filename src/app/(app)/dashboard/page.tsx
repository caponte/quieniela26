import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import bracketImg from "@/assets/img/brackets.png";
import predictImg from "@/assets/img/predict.png";
import UpcomingMatchCard from "./UpcomingMatchCard";
import type { MatchCardData } from "./UpcomingMatchCard";
import { JORNADA_DATE_BOUNDS } from "@/lib/utils/jornada";

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

  const { data: profile } = await supabase
    .from("users")
    .select("name")
    .eq("id", user!.id)
    .single();

  const { data: rawMatches } = await supabase
    .from("matches")
    .select(
      `id, match_number, match_date, stage, group_name, home_score, away_score, status,
       home_team:teams!matches_home_team_id_fkey(id, name, flag_url, fifa_code),
       away_team:teams!matches_away_team_id_fkey(id, name, flag_url, fifa_code)`
    )
    .gte("match_date", new Date().toISOString())
    .order("match_date", { ascending: true })
    .limit(6) as unknown as { data: MatchRow[] | null };

  const matches = rawMatches ?? [];
  const matchIds = matches.map((m) => m.id);

  const { data: rawPreds } = matchIds.length
    ? await supabase
        .from("match_predictions")
        .select("match_id, home_goals, away_goals, first_team_to_score, has_penalty, first_goal_scorer")
        .eq("user_id", user!.id)
        .is("league_id", null)
        .in("match_id", matchIds) as unknown as { data: PredRow[] | null }
    : { data: [] as PredRow[] };

  const predByMatchId = Object.fromEntries((rawPreds ?? []).map((p) => [p.match_id, p]));

  const { data: myLeagues } = await supabase
    .from("league_members")
    .select("league:leagues(id, name)")
    .eq("user_id", user!.id)
    .limit(5);

  const leagues = (myLeagues ?? []) as unknown as { league: { id: string; name: string } | null }[];

  const matchCards: MatchCardData[] = matches.map((m) => ({
    ...m,
    prediction: predByMatchId[m.id] ?? null,
    jornadaSlug: jornadaSlugForMatch(m),
  }));

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold">
          Hola, {(profile as { name: string } | null)?.name?.split(" ")[0] ?? "jugador"} 👋
        </h1>
        <p className="text-(--color-muted) text-sm mt-1">
          El Mundial empieza el 11 de junio. ¿Tienes tus predicciones listas?
        </p>
      </section>

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

      {/* Upcoming matches */}
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

      {/* My leagues */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">Mis ligas</h2>
          <Link href="/league/create" className="text-sm text-(--color-muted) hover:text-white transition-colors">
            + Crear liga
          </Link>
        </div>
        {!leagues.length ? (
          <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-6 text-center">
            <p className="text-(--color-muted) text-sm mb-3">Aún no perteneces a ninguna liga privada.</p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/league/create" className="text-sm bg-(--color-primary) hover:bg-green-700 text-white px-4 py-2 rounded-lg transition">
                Crear liga
              </Link>
              <Link href="/league/join" className="text-sm border border-(--color-border) hover:bg-(--color-surface-2) px-4 py-2 rounded-lg transition">
                Unirse con código
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {leagues.map((m) => {
              const league = m.league;
              if (!league) return null;
              return (
                <Link
                  key={league.id}
                  href={`/league/${league.id}`}
                  className="flex items-center justify-between bg-(--color-surface) border border-(--color-border) rounded-xl px-4 py-3 hover:border-(--color-primary) transition"
                >
                  <span className="font-medium text-sm">{league.name}</span>
                  <span className="text-(--color-muted) text-xs">Ver ranking →</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
