/**
 * Applies Gemini's J2 prediction updates to Supabase.
 * Reads from gemini-j2-updates.json (produced by Gemini after reviewing j1-results.json).
 *
 * Usage: npx tsx scripts/apply-gemini-j2-updates.ts
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

const GEMINI_EMAIL = "gemini@quiniela26.internal";
const UPDATES_FILE = path.join(__dirname, "gemini-j2-updates.json");

function die(msg: string, err?: unknown): never {
  console.error("❌", msg, err ?? "");
  process.exit(1);
}

async function main() {
  if (!fs.existsSync(UPDATES_FILE)) {
    die(`${UPDATES_FILE} not found.`);
  }

  const { updates } = JSON.parse(fs.readFileSync(UPDATES_FILE, "utf8")) as {
    updates: {
      match_id: string;
      home_goals: number;
      away_goals: number;
      first_team_to_score: string | null;
      has_penalty: boolean;
      first_goal_scorer: string | null;
      reason: string;
    }[];
  };

  if (!updates || updates.length === 0) {
    console.log("✅ No updates — Gemini mantiene sus pronósticos de J2 sin cambios.");
    return;
  }

  // Resolve Gemini user ID by email
  const { data: geminiUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", GEMINI_EMAIL)
    .maybeSingle();

  if (!geminiUser) die(`Gemini user not found (${GEMINI_EMAIL}). Run insert-gemini-predictions.ts first.`);
  const GEMINI_USER_ID = geminiUser.id;
  console.log(`🤖 Gemini user_id: ${GEMINI_USER_ID}`);

  // Fetch team fifa_code → id map
  const { data: teams } = await supabase.from("teams").select("id, fifa_code");
  const teamMap: Record<string, string> = {};
  for (const t of teams ?? []) teamMap[t.fifa_code] = t.id;

  console.log(`🔄 Applying ${updates.length} J2 prediction updates for Gemini IA...`);

  let ok = 0, fail = 0;

  for (const u of updates) {
    const firstTeamId = u.first_team_to_score ? (teamMap[u.first_team_to_score] ?? null) : null;

    const { error } = await supabase
      .from("match_predictions")
      .upsert({
        user_id:             GEMINI_USER_ID,
        match_id:            u.match_id,
        league_id:           null,
        home_goals:          u.home_goals,
        away_goals:          u.away_goals,
        first_team_to_score: firstTeamId,
        first_goal_scorer:   u.first_goal_scorer ?? null,
        has_penalty:         u.has_penalty,
        locked_at:           new Date().toISOString(),
      }, { onConflict: "user_id,match_id,league_id" });

    if (error) {
      console.error(`   ⚠️  match ${u.match_id}: ${error.message}`);
      fail++;
    } else {
      console.log(`   ✅ ${u.match_id.slice(0, 8)}… — ${u.reason}`);
      ok++;
    }
  }

  console.log(`\n📊 Done: ${ok} updated, ${fail} failed`);
}

main().catch((e) => die("Unexpected error", e));
