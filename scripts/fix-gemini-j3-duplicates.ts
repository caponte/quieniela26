/**
 * Deletes the 6 duplicate J3 predictions for Gemini that have a non-null league_id.
 * Keeps only the league_id=null predictions (the updated j3 ones).
 *
 * Usage: npx tsx scripts/fix-gemini-j3-duplicates.ts
 */
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
) as any;

async function main() {
  const { data: geminiUser } = await sb
    .from("users").select("id").eq("email", "gemini@quiniela26.internal").maybeSingle();
  if (!geminiUser) { console.error("❌ Gemini not found"); process.exit(1); }

  // Find all match_ids that have both a null and non-null league_id prediction
  const { data: preds } = await sb
    .from("match_predictions")
    .select("id, match_id, league_id, home_goals, away_goals")
    .eq("user_id", geminiUser.id);

  const byMatch: Record<string, any[]> = {};
  for (const p of preds ?? []) {
    if (!byMatch[p.match_id]) byMatch[p.match_id] = [];
    byMatch[p.match_id].push(p);
  }

  // Only matches with duplicates (one null + one non-null)
  const toDelete: string[] = [];
  for (const [, ps] of Object.entries(byMatch)) {
    if (ps.length < 2) continue;
    const hasNull = ps.some((p: any) => p.league_id === null);
    const withLeagueId = ps.filter((p: any) => p.league_id !== null);
    if (hasNull && withLeagueId.length > 0) {
      toDelete.push(...withLeagueId.map((p: any) => p.id));
    }
  }

  if (toDelete.length === 0) {
    console.log("✅ No hay duplicados que eliminar.");
    return;
  }

  console.log(`\n🗑️  Eliminando ${toDelete.length} predicciones duplicadas con league_id no-null...\n`);

  const { error } = await sb
    .from("match_predictions")
    .delete()
    .in("id", toDelete);

  if (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }

  console.log(`✅ ${toDelete.length} predicciones eliminadas.`);

  // Verify new totals from leaderboard
  const { data: lbRows } = await sb
    .from("leaderboard_jornada")
    .select("league_id, total_points")
    .eq("user_id", geminiUser.id);

  let total = 0;
  console.log(`\n--- leaderboard_jornada tras corrección ---`);
  for (const row of lbRows ?? []) {
    console.log(`  league_id: ${row.league_id ?? "NULL"} → ${row.total_points} pts`);
    total += row.total_points;
  }
  console.log(`  TOTAL: ${total} pts`);
}

main().catch((e) => { console.error(e); process.exit(1); });
