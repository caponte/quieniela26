/**
 * Fetches J1 actual results + events from Supabase and writes j1-results.json.
 * Also writes the J2 match IDs so the AI knows which predictions to review.
 *
 * Usage: npx tsx scripts/generate-j1-results.ts
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";
import ws from "ws";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { realtime: { transport: ws } }
);

// Returns match IDs for a given group round (same logic as jornada.ts)
function getGroupRoundMatchIds(
  groupMatches: { id: string; match_date: string; group_name: string | null }[],
  round: 1 | 2 | 3
): Set<string> {
  const byGroup = new Map<string, typeof groupMatches>();
  for (const m of groupMatches) {
    const g = m.group_name ?? "__unknown__";
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push(m);
  }
  const ids = new Set<string>();
  for (const matches of byGroup.values()) {
    const sorted = [...matches].sort((a, b) => a.match_date.localeCompare(b.match_date));
    const slice = sorted.slice((round - 1) * 2, round * 2);
    for (const m of slice) ids.add(m.id);
  }
  return ids;
}

async function main() {
  console.log("Fetching group matches...");
  const { data: rawMatches, error: matchesErr } = await supabase
    .from("matches")
    .select(`
      id, match_date, match_number, group_name, status,
      home_score, away_score,
      home_team:home_team_id(id, name, fifa_code),
      away_team:away_team_id(id, name, fifa_code)
    `)
    .eq("stage", "group")
    .order("match_date", { ascending: true })
    .order("match_number", { ascending: true });

  if (matchesErr || !rawMatches) {
    console.error("❌ Failed to fetch matches", matchesErr);
    process.exit(1);
  }

  const j1Ids = getGroupRoundMatchIds(rawMatches as any[], 1);
  const j2Ids = getGroupRoundMatchIds(rawMatches as any[], 2);

  const j1Matches = rawMatches.filter((m) => j1Ids.has(m.id));
  const j2Matches = rawMatches.filter((m) => j2Ids.has(m.id));

  // Fetch events only for finished/live J1 matches
  const finishedJ1Ids = j1Matches
    .filter((m) => m.status === "finished" || m.status === "live")
    .map((m) => m.id);

  let eventsMap: Record<string, { firstGoalScorer: string | null; firstGoalTeam: string | null; hasPenalty: boolean; goals: { team: string; player: string | null; minute: number | null; isOwnGoal: boolean; isPenalty: boolean }[] }> = {};

  if (finishedJ1Ids.length > 0) {
    console.log(`Fetching events for ${finishedJ1Ids.length} finished J1 matches...`);
    const { data: events } = await supabase
      .from("match_events")
      .select("match_id, team_id, player_name, is_first_goal, is_own_goal, type, minute")
      .in("match_id", finishedJ1Ids);

    // Build team id → fifa_code map
    const teamFifaMap: Record<string, string> = {};
    for (const m of rawMatches) {
      const ht = m.home_team as any;
      const at = m.away_team as any;
      if (ht) teamFifaMap[ht.id] = ht.fifa_code;
      if (at) teamFifaMap[at.id] = at.fifa_code;
    }

    for (const matchId of finishedJ1Ids) {
      const matchEvents = (events ?? []).filter((e) => e.match_id === matchId);
      const firstGoalEvt = matchEvents.find((e) => e.is_first_goal && !e.is_own_goal);
      eventsMap[matchId] = {
        firstGoalScorer: firstGoalEvt?.player_name ?? null,
        firstGoalTeam: firstGoalEvt?.team_id ? (teamFifaMap[firstGoalEvt.team_id] ?? null) : null,
        hasPenalty: matchEvents.some((e) => e.type === "penalty"),
        goals: matchEvents
          .filter((e) => e.type === "goal")
          .map((e) => ({
            team: teamFifaMap[e.team_id] ?? e.team_id,
            player: e.player_name,
            minute: e.minute,
            isOwnGoal: e.is_own_goal,
            isPenalty: false,
          })),
      };
    }
  }

  // Build output
  const j1Results = j1Matches.map((m) => {
    const ht = m.home_team as any;
    const at = m.away_team as any;
    const events = eventsMap[m.id] ?? null;
    return {
      match_id: m.id,
      group: m.group_name,
      match_date: m.match_date,
      status: m.status,
      home_team: ht?.fifa_code ?? "?",
      away_team: at?.fifa_code ?? "?",
      home_score: m.home_score,
      away_score: m.away_score,
      first_goal_team: events?.firstGoalTeam ?? null,
      first_goal_scorer: events?.firstGoalScorer ?? null,
      has_penalty: events?.hasPenalty ?? false,
      goals: events?.goals ?? [],
    };
  });

  const j2Info = j2Matches.map((m) => {
    const ht = m.home_team as any;
    const at = m.away_team as any;
    return {
      match_id: m.id,
      group: m.group_name,
      match_date: m.match_date,
      home_team: ht?.fifa_code ?? "?",
      away_team: at?.fifa_code ?? "?",
    };
  });

  const output = {
    _meta: {
      generated_at: new Date().toISOString(),
      j1_finished: j1Results.filter((m) => m.status === "finished").length,
      j1_total: j1Results.length,
    },
    j1_results: j1Results,
    j2_matches: j2Info,
  };

  const outPath = path.join(__dirname, "j1-results.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`✅ Written to ${outPath}`);
  console.log(`   J1 finished: ${output._meta.j1_finished}/${output._meta.j1_total}`);
  console.log(`   J2 matches found: ${j2Info.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
