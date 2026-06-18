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

async function main() {
  const fifaCode = process.argv[2]?.toUpperCase() ?? "BRA";
  const { data: team } = await sb.from("teams").select("id, name").eq("fifa_code", fifaCode).single() as any;
  const { data } = await sb.from("players").select("name, jersey_number, fifa_player_id, picture_url").eq("team_id", team.id).order("jersey_number") as any;

  console.log(`\n=== ${team.name} — ${data.length} jugadores en BD ===\n`);
  for (const p of data) {
    console.log(`  #${String(p.jersey_number ?? "?").padStart(2)} | ${p.fifa_player_id ? "✓" : "✗"} id | ${p.picture_url ? "✓" : "✗"} pic | ${p.name}`);
  }
  const missing = data.filter((p: any) => !p.fifa_player_id);
  if (missing.length) console.log(`\n⚠ Sin mapear: ${missing.map((p: any) => p.name).join(", ")}`);
  else console.log(`\n✓ Todos mapeados`);
}

main().catch(console.error);
