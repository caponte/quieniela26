/**
 * Outputs J2 match results for Gemini context.
 * Usage: npx tsx scripts/get-j2-results.ts
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";
import ws from "ws";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { realtime: { transport: ws } }
);

async function main() {
  const { data: allMatches } = await sb
    .from("matches")
    .select("id, match_date, group_name, home_team_id, away_team_id, home_score, away_score, status")
    .eq("stage", "group")
    .order("match_date") as any;

  const { data: teams } = await sb.from("teams").select("id, fifa_code, name") as any;
  const teamById: Record<string, { fifa_code: string; name: string }> = {};
  for (const t of teams ?? []) teamById[t.id] = { fifa_code: t.fifa_code, name: t.name };

  const { data: events } = await sb
    .from("match_events")
    .select("match_id, team_id, player_name, is_first_goal, type, minute, is_own_goal, penalty_scored")
    .order("minute") as any;

  const eventsByMatch: Record<string, any[]> = {};
  for (const e of events ?? []) {
    if (!eventsByMatch[e.match_id]) eventsByMatch[e.match_id] = [];
    eventsByMatch[e.match_id].push(e);
  }

  // Determine J2 match IDs per group
  const byGroup = new Map<string, any[]>();
  for (const m of allMatches ?? []) {
    const g = m.group_name ?? "__";
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push(m);
  }

  const j1Ids = new Set<string>();
  const j2Ids = new Set<string>();
  for (const [, ms] of byGroup) {
    const sorted = [...ms].sort((a, b) => a.match_date.localeCompare(b.match_date));
    sorted.slice(0, 2).forEach(m => j1Ids.add(m.id));
    sorted.slice(2, 4).forEach(m => j2Ids.add(m.id));
  }

  const j2Matches = (allMatches ?? [])
    .filter((m: any) => j2Ids.has(m.id))
    .sort((a: any, b: any) => a.match_date.localeCompare(b.match_date));

  // Build output
  const results: any[] = [];

  for (const m of j2Matches) {
    const home = teamById[m.home_team_id];
    const away = teamById[m.away_team_id];
    const evts = eventsByMatch[m.id] ?? [];
    const goals = evts.filter((e: any) => e.type === "goal");
    const firstGoal = goals.find((e: any) => e.is_first_goal);
    const hasPenalty = evts.some((e: any) => e.type === "penalty");

    results.push({
      group: m.group_name,
      match_id: m.id,
      home: home?.fifa_code ?? "?",
      home_name: home?.name ?? "?",
      away: away?.fifa_code ?? "?",
      away_name: away?.name ?? "?",
      date: new Date(m.match_date).toLocaleDateString("es-MX", { month: "short", day: "numeric", timeZone: "UTC" }),
      status: m.status,
      score: m.home_score !== null ? `${m.home_score}-${m.away_score}` : "pendiente",
      first_goal_scorer: firstGoal ? `${firstGoal.player_name} (${teamById[firstGoal.team_id]?.fifa_code ?? "?"})` : null,
      has_penalty: hasPenalty,
      goals: goals.map((g: any) => ({
        player: g.player_name,
        team: teamById[g.team_id]?.fifa_code ?? "?",
        minute: g.minute,
        own_goal: g.is_own_goal,
        penalty: g.penalty_scored,
      })),
    });
  }

  // Console output
  console.log("\n========================================");
  console.log("  RESULTADOS JORNADA 2 — Mundial 2026");
  console.log("========================================\n");

  const byGroupOut = new Map<string, any[]>();
  for (const r of results) {
    if (!byGroupOut.has(r.group)) byGroupOut.set(r.group, []);
    byGroupOut.get(r.group)!.push(r);
  }

  for (const [group, matches] of [...byGroupOut.entries()].sort()) {
    console.log(`--- Grupo ${group} ---`);
    for (const r of matches) {
      const status = r.status === "finished" ? `${r.score}` : r.status === "live" ? `${r.score} (en vivo)` : "pendiente";
      console.log(`  ${r.home} vs ${r.away}  →  ${status}`);
      if (r.first_goal_scorer) console.log(`    Primer gol: ${r.first_goal_scorer}`);
      if (r.has_penalty) console.log(`    ⚠️  Hubo penales`);
      if (r.goals.length > 0) {
        for (const g of r.goals) {
          const label = g.own_goal ? "⚽ (a.g.)" : g.penalty ? "⚽ (pen)" : "⚽";
          console.log(`    ${label} ${g.player ?? "?"} (${g.team}) min.${g.minute ?? "?"}`);
        }
      }
    }
    console.log();
  }

  // Save JSON for Gemini context
  const outPath = path.join(__dirname, "j2-results.json");
  fs.writeFileSync(outPath, JSON.stringify({ jornada: 2, matches: results }, null, 2), "utf8");
  console.log(`✅ Guardado en ${outPath}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
