/**
 * Copies groups/r32/r32_third/third_qualifiers from a user's global bracket
 * into their liga bracket, keeping KO fields already present.
 *
 * Usage: npx tsx scripts/fix-league-bracket.ts <user_id> <league_id>
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
);

const FIELDS_TO_COPY = ["groups", "r32", "r32_third", "third_qualifiers"] as const;

async function checkAndFix(userId: string, leagueId: string) {
  const { data: rows, error } = await sb
    .from("bracket_predictions")
    .select("league_id, predictions")
    .eq("user_id", userId);

  if (error) { console.error(error); process.exit(1); }

  const global = rows?.find(r => r.league_id === null)?.predictions as any;
  const liga   = rows?.find(r => r.league_id === leagueId)?.predictions as any;

  if (!global) { console.error("❌ Global bracket not found"); process.exit(1); }
  if (!liga)   { console.error("❌ Liga bracket not found");   process.exit(1); }

  console.log("Global keys:", Object.keys(global));
  console.log("Liga keys  :", Object.keys(liga));

  const missing = FIELDS_TO_COPY.filter(f => liga[f] === undefined && global[f] !== undefined);

  if (missing.length === 0) {
    console.log("✅ Liga bracket already complete — nothing to fix");
    return;
  }

  const patch = { ...liga };
  for (const field of missing) {
    patch[field] = global[field];
    console.log(`  + copying ${field}`);
  }

  const { error: updateErr } = await sb
    .from("bracket_predictions")
    .update({ predictions: patch, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("league_id", leagueId);

  if (updateErr) { console.error("Update failed:", updateErr); process.exit(1); }
  console.log("✅ Liga bracket patched. New keys:", Object.keys(patch));
}

async function main() {
  const userId   = process.argv[2];
  const leagueId = process.argv[3];
  if (!userId || !leagueId) {
    console.error("Usage: fix-league-bracket.ts <user_id> <league_id>");
    process.exit(1);
  }
  await checkAndFix(userId, leagueId);
}

main().catch(e => { console.error(e); process.exit(1); });
