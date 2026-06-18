/**
 * Fixes Gemini's prediction for CZE vs RSA (09e1da83) which was incorrectly
 * overwritten with KOR data. Restores to original: 2-1, CZE first, Patrik Schick.
 *
 * Usage: npx tsx scripts/fix-gemini-cze-rsa.ts
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";
import ws from "ws";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { realtime: { transport: ws } }
);

const GEMINI_EMAIL = "gemini@quiniela26.internal";
const MATCH_ID = "09e1da83-53d8-4f6e-a7fb-956388d78f04"; // CZE vs RSA

async function main() {
  const { data: geminiUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", GEMINI_EMAIL)
    .maybeSingle();

  if (!geminiUser) {
    console.error("❌ Gemini user not found");
    process.exit(1);
  }

  const { data: teams } = await supabase.from("teams").select("id, fifa_code");
  const teamMap: Record<string, string> = {};
  for (const t of teams ?? []) teamMap[t.fifa_code] = t.id;

  const czeTeamId = teamMap["CZE"];
  if (!czeTeamId) {
    console.error("❌ CZE team not found in teams table");
    process.exit(1);
  }

  const { error } = await supabase
    .from("match_predictions")
    .upsert({
      user_id:             geminiUser.id,
      match_id:            MATCH_ID,
      league_id:           null,
      home_goals:          2,
      away_goals:          1,
      first_team_to_score: czeTeamId,
      first_goal_scorer:   "Patrik Schick",
      has_penalty:         false,
      locked_at:           new Date().toISOString(),
    }, { onConflict: "user_id,match_id,league_id" });

  if (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }

  console.log("✅ Restored: CZE vs RSA → 2-1, CZE first, Patrik Schick");
}

main().catch((e) => { console.error(e); process.exit(1); });
