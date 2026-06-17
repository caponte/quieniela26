import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import type { Database, MatchStatus } from "@/lib/supabase/database.types";

const FIFA_BASE = "https://api.fifa.com/api/v3";

function adminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// FIFA MatchStatus codes: 0 = finished, 1 = scheduled, 3 = live
function toMatchStatus(s: number): MatchStatus {
  if (s === 3) return "live";
  if (s === 0) return "finished";
  return "scheduled";
}

async function fifaFetch(path: string) {
  const res = await fetch(`${FIFA_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`fifa ${res.status} on ${path}`);
  return res.json();
}

async function syncMatch(
  supabase: ReturnType<typeof adminClient>,
  fifaDetail: any,
  ourMatch: { id: string; status: string; home_team_id: string; away_team_id: string },
  force = false
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const newStatus = toMatchStatus(fifaDetail.MatchStatus);
  // FIFA API may return null Score at kickoff; live matches should show 0-0, not null.
  const homeGoals: number | null = newStatus === "live"
    ? (fifaDetail.HomeTeam?.Score ?? 0)
    : (fifaDetail.HomeTeam?.Score ?? null);
  const awayGoals: number | null = newStatus === "live"
    ? (fifaDetail.AwayTeam?.Score ?? 0)
    : (fifaDetail.AwayTeam?.Score ?? null);
  const isPenaltyShootout =
    fifaDetail.HomeTeamPenaltyScore !== null &&
    fifaDetail.HomeTeamPenaltyScore !== undefined;
  const isBecomingFinished =
    newStatus === "finished" && ourMatch.status !== "finished";

  const errors: string[] = [];

  // Sync events BEFORE updating status so the DB trigger sees them.
  // force=true allows re-syncing events on already-finished matches (admin button).
  if (isBecomingFinished || (force && newStatus === "finished")) {
    await db.from("match_events").delete().eq("match_id", ourMatch.id);

    const allPlayers: any[] = [
      ...(fifaDetail.HomeTeam?.Players ?? []),
      ...(fifaDetail.AwayTeam?.Players ?? []),
    ];
    const playerById = new Map<string, any>(
      allPlayers.map((p) => [p.IdPlayer, p])
    );

    // Fetch our DB players for this match to use canonical names
    const { data: dbPlayers } = await supabase
      .from("players")
      .select("name, fifa_player_id")
      .in("team_id", [ourMatch.home_team_id, ourMatch.away_team_id])
      .not("fifa_player_id", "is", null) as unknown as {
        data: { name: string; fifa_player_id: string }[] | null
      };
    const dbPlayerByFifaId = new Map<string, string>(
      (dbPlayers ?? []).map((p) => [p.fifa_player_id, p.name])
    );

    // Tag each goal with the team that benefits (OG → opponent's team_id)
    const homeGoalEvents = (fifaDetail.HomeTeam?.Goals ?? []).map((g: any) => ({
      ...g,
      benefitTeamId: ourMatch.home_team_id,
    }));
    const awayGoalEvents = (fifaDetail.AwayTeam?.Goals ?? []).map((g: any) => ({
      ...g,
      benefitTeamId: ourMatch.away_team_id,
    }));

    // Sort by minute to determine first goal correctly
    const allGoals = [...homeGoalEvents, ...awayGoalEvents].sort((a, b) => {
      return parseInt(a.Minute ?? "0") - parseInt(b.Minute ?? "0");
    });

    let firstGoalDone = false;
    for (const goal of allGoals) {
      const isOwnGoal = goal.Type === 3;
      const isPenalty = goal.Type === 1;
      const isFirstGoal = !firstGoalDone && !isOwnGoal;
      if (!isOwnGoal) firstGoalDone = true;

      // Prefer our DB name (canonical), fall back to FIFA API name
      const fifaPlayer = playerById.get(goal.IdPlayer);
      const playerName =
        dbPlayerByFifaId.get(goal.IdPlayer) ??
        fifaPlayer?.ShortName?.[0]?.Description ??
        fifaPlayer?.PlayerName?.[0]?.Description ??
        null;

      const { error: evtErr } = await db.from("match_events").insert({
        match_id: ourMatch.id,
        type: "goal",
        team_id: goal.benefitTeamId,
        player_name: playerName,
        minute: goal.Minute ? parseInt(goal.Minute) : null,
        is_first_goal: isFirstGoal,
        is_own_goal: isOwnGoal,
        penalty_scored: isPenalty ? true : null,
      });

      if (evtErr) errors.push(`event: ${evtErr.message}`);

      // Insert a separate 'penalty' marker so the trigger detects has_penalty correctly
      if (isPenalty) {
        await db.from("match_events").insert({
          match_id: ourMatch.id,
          type: "penalty",
          team_id: goal.benefitTeamId,
          player_name: playerName,
          minute: goal.Minute ? parseInt(goal.Minute) : null,
          is_first_goal: false,
          is_own_goal: false,
          penalty_scored: true,
        });
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

  // When force-syncing a match that's already finished (same score = trigger won't fire),
  // explicitly recalculate stored match_points so first_goal_scorer/has_penalty are correct.
  if (force && newStatus === "finished" && ourMatch.status === "finished") {
    const { error: rpcErr } = await db.rpc("calculate_match_points", { p_match_id: ourMatch.id });
    if (rpcErr) errors.push(`recalc points: ${rpcErr.message}`);
  }

  return {
    matchId: ourMatch.id,
    newStatus,
    score: `${homeGoals ?? "?"}-${awayGoals ?? "?"}`,
    errors,
  };
}

async function insertLog(
  supabase: ReturnType<typeof adminClient>,
  source: string,
  payload: object,
  synced?: number,
  total?: number,
  errors?: string[]
) {
  const db = supabase as any;
  await db.from("sync_logs").insert({
    source,
    synced: synced ?? null,
    total: total ?? null,
    errors: errors && errors.length > 0 ? errors : null,
    payload,
  });
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = adminClient();
  const body = await req.json().catch(() => ({}));

  // ── DEBUG MODE ─────────────────────────────────────────────────────────────
  // Body: { debugFifaMatchId: "400021458" } → returns raw FIFA response
  if (body.debugFifaMatchId) {
    const raw = await fifaFetch(`/live/football/${body.debugFifaMatchId}`);
    return NextResponse.json({ debug: true, raw });
  }
  // ── END DEBUG MODE ─────────────────────────────────────────────────────────

  // ── TEST MODE ──────────────────────────────────────────────────────────────
  // Body: { testFifaMatchId: "400021458", ourMatchId: "<uuid>" }
  if (body.testFifaMatchId && body.ourMatchId) {
    const fifaDetail = await fifaFetch(`/live/football/${body.testFifaMatchId}`);

    const { data: ourMatch } = (await supabase
      .from("matches")
      .select("id, status, home_team_id, away_team_id")
      .eq("id", body.ourMatchId)
      .single()) as unknown as {
      data: {
        id: string;
        status: string;
        home_team_id: string;
        away_team_id: string;
      } | null;
    };

    if (!ourMatch)
      return NextResponse.json({ error: "Match not found in DB" }, { status: 404 });

    const result = await syncMatch(supabase, fifaDetail, ourMatch, true);
    const responsePayload = { test: true, ...result };
    await insertLog(supabase, "test", responsePayload, 1, 1, result.errors);
    revalidatePath("/dashboard");
    revalidatePath("/admin");
    return NextResponse.json(responsePayload);
  }
  // ── END TEST MODE ──────────────────────────────────────────────────────────

  const now = new Date();
  const in4h = new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString();

  type OurMatch = {
    id: string;
    fifa_match_id: string | null;
    status: string;
    home_team_id: string;
    away_team_id: string;
  };

  const { data: ourMatches, error: matchErr } = (await supabase
    .from("matches")
    .select("id, fifa_match_id, status, home_team_id, away_team_id")
    .not("fifa_match_id", "is", null)
    .or(
      `status.eq.live,and(status.eq.scheduled,match_date.lte.${in4h})`
    )) as unknown as { data: OurMatch[] | null; error: { message: string } | null };

  if (matchErr) {
    await insertLog(
      supabase,
      body.source === "manual" ? "manual" : "cron",
      { error: matchErr.message }
    );
    return NextResponse.json({ error: matchErr.message }, { status: 500 });
  }

  if (!ourMatches || ourMatches.length === 0) {
    return NextResponse.json({ synced: 0, message: "No matches to sync" });
  }

  let synced = 0;
  const allErrors: string[] = [];
  const matchResults: object[] = [];

  for (const ourMatch of ourMatches) {
    let fifaDetail: any;
    try {
      fifaDetail = await fifaFetch(`/live/football/${ourMatch.fifa_match_id}`);
    } catch (err: any) {
      allErrors.push(`[${ourMatch.fifa_match_id}] fetch: ${err.message}`);
      continue;
    }

    const result = await syncMatch(supabase, fifaDetail, ourMatch);
    matchResults.push(result);
    if (result.errors.length > 0) {
      allErrors.push(
        ...result.errors.map((e) => `[${ourMatch.fifa_match_id}] ${e}`)
      );
    } else {
      synced++;
    }
  }

  const source = body.source === "manual" ? "manual" : "cron";
  const responsePayload = {
    synced,
    total: ourMatches.length,
    matches: matchResults,
    ...(allErrors.length > 0 && { errors: allErrors }),
  };

  await insertLog(
    supabase,
    source,
    responsePayload,
    synced,
    ourMatches.length,
    allErrors
  );

  if (synced > 0) {
    revalidatePath("/dashboard");
    revalidatePath("/admin");
  }

  return NextResponse.json({
    synced,
    total: ourMatches.length,
    ...(allErrors.length > 0 && { errors: allErrors }),
  });
}
