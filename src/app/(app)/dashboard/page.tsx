import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatMatchDate } from "@/lib/utils/date";

interface MatchRow {
  id: string;
  match_date: string;
  stage: string;
  group_name: string | null;
  home_score: number | null;
  away_score: number | null;
  status: string;
  home_team: { id: string; name: string; flag_url: string | null; fifa_code: string } | null;
  away_team: { id: string; name: string; flag_url: string | null; fifa_code: string } | null;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("name")
    .eq("id", user!.id)
    .single();

  const { data: upcomingMatches } = await supabase
    .from("matches")
    .select(
      `id, match_date, stage, group_name, home_score, away_score, status,
       home_team:teams!matches_home_team_id_fkey(id, name, flag_url, fifa_code),
       away_team:teams!matches_away_team_id_fkey(id, name, flag_url, fifa_code)`
    )
    .gte("match_date", new Date().toISOString())
    .order("match_date", { ascending: true })
    .limit(6);

  const { data: myLeagues } = await supabase
    .from("league_members")
    .select("league:leagues(id, name)")
    .eq("user_id", user!.id)
    .limit(5);

  const matches = (upcomingMatches ?? []) as unknown as MatchRow[];
  const leagues = (myLeagues ?? []) as unknown as { league: { id: string; name: string } | null }[];

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
        <Link
          href="/predict/bracket"
          className="bg-(--color-surface) border border-(--color-border) rounded-xl p-5 hover:border-(--color-primary) transition group"
        >
          <p className="text-2xl mb-2">🏆</p>
          <h2 className="font-bold text-base group-hover:text-(--color-primary) transition">
            Modo Bracket
          </h2>
          <p className="text-(--color-muted) text-sm mt-1">
            Predice el ganador de cada grupo y toda la fase eliminatoria antes
            del inicio del torneo.
          </p>
        </Link>
        <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-5 opacity-60">
          <p className="text-2xl mb-2">📋</p>
          <h2 className="font-bold text-base">Modo Jornada</h2>
          <p className="text-(--color-muted) text-sm mt-1">
            Predice cada partido individualmente hasta 10 min antes del
            kick-off. Disponible pronto.
          </p>
        </div>
      </section>

      {/* Upcoming matches */}
      <section>
        <h2 className="font-bold text-lg mb-3">Próximos partidos</h2>
        {!matches.length ? (
          <p className="text-(--color-muted) text-sm">
            No hay partidos próximos cargados aún.
          </p>
        ) : (
          <div className="space-y-2">
            {matches.map((match) => (
              <Link
                key={match.id}
                href={`/predict/match/${match.id}`}
                className="flex items-center justify-between bg-(--color-surface) border border-(--color-border) rounded-xl px-4 py-3 hover:border-(--color-primary) transition"
              >
                <span className="font-medium text-sm w-36 truncate">
                  {match.home_team?.name}
                </span>
                <div className="text-center px-3 shrink-0">
                  <p className="text-xs text-(--color-muted)">
                    {match.group_name ? `Grupo ${match.group_name}` : match.stage}
                  </p>
                  <p className="text-xs text-(--color-muted) mt-0.5">
                    {formatMatchDate(match.match_date)}
                  </p>
                </div>
                <span className="font-medium text-sm w-36 text-right truncate">
                  {match.away_team?.name}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* My leagues */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">Mis ligas</h2>
          <Link
            href="/league/create"
            className="text-sm text-(--color-primary) hover:underline"
          >
            + Crear liga
          </Link>
        </div>
        {!leagues.length ? (
          <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-6 text-center">
            <p className="text-(--color-muted) text-sm mb-3">
              Aún no perteneces a ninguna liga privada.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link
                href="/league/create"
                className="text-sm bg-(--color-primary) hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
              >
                Crear liga
              </Link>
              <Link
                href="/league/join"
                className="text-sm border border-(--color-border) hover:bg-(--color-surface-2) px-4 py-2 rounded-lg transition"
              >
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
