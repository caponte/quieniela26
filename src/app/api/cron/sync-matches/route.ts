import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database, MatchStatus } from "@/lib/supabase/database.types";

const FD_KEY = process.env.FOOTBALL_DATA_API_KEY!;
const FD_BASE = "https://api.football-data.org/v4";

function adminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type FdStatus =
  | "TIMED" | "SCHEDULED" | "IN_PLAY" | "PAUSED"
  | "FINISHED" | "POSTPONED" | "CANCELLED" | "SUSPENDED";

function toMatchStatus(s: FdStatus): MatchStatus {
  if (s === "IN_PLAY" || s === "PAUSED") return "live";
  if (s === "FINISHED") return "finished";
  if (s === "POSTPONED" || s === "CANCELLED" || s === "SUSPENDED") return "postponed";
  return "scheduled";
}

async function fdFetch(path: string) {
  const res = await fetch(`${FD_BASE}${path}`, {
    headers: { "X-Auth-Token": FD_KEY },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`football-data.org ${res.status} on ${path}`);
  return res.json();
}

async function syncMatch(
  supabase: ReturnType<typeof adminClient>,
  apiMatch: any,
  ourMatch: { id: string; status: string; home_team_id: string; away_team_id: string }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const apiStatus = apiMatch.status as FdStatus;
  const newStatus = toMatchStatus(apiStatus);
  const homeGoals: number | null = apiMatch.score?.fullTime?.home ?? null;
  const awayGoals: number | null = apiMatch.score?.fullTime?.away ?? null;
  const isPenaltyShootout = apiMatch.score?.duration === "PENALTY_SHOOTOUT";
  const isBecomingFinished = newStatus === "finished" && ourMatch.status !== "finished";

  const errors: string[] = [];

  // Sync events BEFORE updating status so the DB trigger sees them
  if (isBecomingFinished) {
    let goals: any[] = [];
    try {
      const detail = await fdFetch(`/matches/${apiMatch.id}`);
      goals = detail.goals ?? [];
    } catch {
      // will retry next tick
    }

    if (goals.length > 0) {
      await db.from("match_events").delete().eq("match_id", ourMatch.id);

      let firstGoalDone = false;
      for (const goal of goals) {
        const isOwnGoal = goal.type === "OWN" || goal.type === "OWN_GOAL";
        const isFirstGoal = !firstGoalDone && !isOwnGoal;
        if (!isOwnGoal) firstGoalDone = true;

        const isHomeTeam = goal.team?.id === apiMatch.homeTeam?.id;
        const teamId = isHomeTeam ? ourMatch.home_team_id : ourMatch.away_team_id;

        const { error: evtErr } = await db.from("match_events").insert({
          match_id: ourMatch.id,
          type: "goal",
          team_id: teamId,
          player_name: goal.scorer?.name ?? null,
          minute: goal.minute ?? null,
          is_first_goal: isFirstGoal,
          is_own_goal: isOwnGoal,
          penalty_scored: goal.type === "PENALTY" ? true : null,
        });

        if (evtErr) errors.push(`event: ${evtErr.message}`);
      }
    }

    if (isPenaltyShootout) {
      await db.from("match_events").insert({
        match_id: ourMatch.id,
        type: "penalty",
        team_id: ourMatch.home_team_id,
        player_name: null,
        minute: null,
        is_first_goal: false,
        is_own_goal: false,
        penalty_scored: true,
      });
    }
  }

  const { error: updateErr } = await db
    .from("matches")
    .update({ home_score: homeGoals, away_score: awayGoals, status: newStatus })
    .eq("id", ourMatch.id);

  if (updateErr) errors.push(`match update: ${updateErr.message}`);

  return {
    matchId: ourMatch.id,
    apiStatus,
    newStatus,
    score: `${homeGoals ?? "?"}-${awayGoals ?? "?"}`,
    errors,
  };
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = adminClient();
  const body = await req.json().catch(() => ({}));

  // ── TEST MODE ──────────────────────────────────────────────────────────────
  // POST body: { testFixtureId: number, ourMatchId: string }
  // Fetches any fixture from football-data.org and syncs it against ourMatchId.
  // Useful for verifying goal/event sync with non-WC matches before the tournament.
  if (body.testFixtureId && body.ourMatchId) {
    const apiMatch = await fdFetch(`/matches/${body.testFixtureId}`);

    const { data: ourMatch } = await supabase
      .from("matches")
      .select("id, status, home_team_id, away_team_id")
      .eq("id", body.ourMatchId)
      .single() as unknown as { data: { id: string; status: string; home_team_id: string; away_team_id: string } | null };

    if (!ourMatch) return NextResponse.json({ error: "Match not found in DB" }, { status: 404 });

    const result = await syncMatch(supabase, apiMatch, ourMatch);
    return NextResponse.json({ test: true, ...result });
  }
  // ── END TEST MODE ──────────────────────────────────────────────────────────

  const now = new Date();
  const in4h = new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString();

  const { data: ourMatches, error: matchErr } = await supabase
    .from("matches")
    .select("id, api_fixture_id, status, home_team_id, away_team_id")
    .not("api_fixture_id", "is", null)
    .or(`status.eq.live,and(status.eq.scheduled,match_date.lte.${in4h})`);

  if (matchErr) return NextResponse.json({ error: matchErr.message }, { status: 500 });
  if (!ourMatches || ourMatches.length === 0) {
    return NextResponse.json({ synced: 0, message: "No matches to sync" });
  }

  const dateFrom = now.toISOString().split("T")[0];
  const dateTo = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [todayData, liveData] = await Promise.all([
    fdFetch(`/competitions/WC/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`),
    fdFetch(`/competitions/WC/matches?status=IN_PLAY,PAUSED`),
  ]);

  const allApiMatches: any[] = [...(todayData.matches ?? []), ...(liveData.matches ?? [])];
  const apiById = new Map<number, any>();
  for (const m of allApiMatches) apiById.set(m.id, m);

  const ourById = new Map<number, typeof ourMatches[number]>();
  for (const m of ourMatches) ourById.set(m.api_fixture_id!, m);

  let synced = 0;
  const allErrors: string[] = [];

  for (const [apiId, apiMatch] of apiById) {
    const ourMatch = ourById.get(apiId);
    if (!ourMatch) continue;

    const result = await syncMatch(supabase, apiMatch, ourMatch);
    if (result.errors.length > 0) {
      allErrors.push(...result.errors.map((e) => `[M${apiId}] ${e}`));
    } else {
      synced++;
    }
  }

  return NextResponse.json({
    synced,
    total: ourMatches.length,
    ...(allErrors.length > 0 && { errors: allErrors }),
  });
}
