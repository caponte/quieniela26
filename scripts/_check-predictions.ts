import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";
import ws from "ws";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { realtime: { transport: ws } }
);

const fifaCode = process.argv[2]?.toUpperCase() ?? "ARG";

async function main() {
  const { data: team } = await sb.from("teams").select("id, name").eq("fifa_code", fifaCode).single() as any;
  if (!team) { console.error("Team not found"); process.exit(1); }

  console.log(`\n=== Predicciones de goleador — ${team.name} ===\n`);

  const { data: players } = await sb
    .from("players")
    .select("id, name, jersey_number, fifa_player_id, picture_url")
    .eq("team_id", team.id) as any;

  const playerMap = new Map(players.map((p: any) => [p.id, p]));

  const { data: predictions } = await sb
    .from("match_predictions")
    .select("first_goal_scorer_id")
    .not("first_goal_scorer_id", "is", null) as any;

  const counts = new Map<string, number>();
  for (const r of predictions ?? []) {
    if (!playerMap.has(r.first_goal_scorer_id)) continue;
    counts.set(r.first_goal_scorer_id, (counts.get(r.first_goal_scorer_id) ?? 0) + 1);
  }

  if (counts.size === 0) {
    console.log("Ningún jugador de este equipo tiene predicciones de goleador.");
  } else {
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [id, count] of sorted) {
      const p = playerMap.get(id);
      console.log(`  ${p.fifa_player_id ? "✓" : "✗"} id | ${p.picture_url ? "✓" : "✗"} pic | ${String(count).padStart(3)}x | #${String(p.jersey_number ?? "?").padStart(2)} ${p.name}`);
    }
    console.log(`\nTotal jugadores distintos: ${counts.size}`);
  }
}

main().catch(console.error);
