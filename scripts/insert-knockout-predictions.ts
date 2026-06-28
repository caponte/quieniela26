/**
 * Inserts AI knockout bracket predictions into knockout_predictions table.
 * Uses service role to bypass RLS.
 *
 * Usage: npx tsx scripts/insert-knockout-predictions.ts
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

// Slot order = same as scoring function v_r32_nums / v_r16_nums / v_qf_nums / v_sf_nums
// R32 slots:  [M74,M77,M73,M75,M83,M84,M81,M82,M76,M78,M79,M80,M86,M88,M85,M87]

const AI_PICKS: Record<string, {
  r32: string[];
  r16: (string|null)[];
  qf:  (string|null)[];
  sf:  (string|null)[];
  third:    string | null;
  champion: string | null;
}> = {
  "claude@quiniela26.internal": {
    //          M74   M77   M73   M75   M83   M84   M81   M82   M76   M78   M79   M80   M86   M88   M85   M87
    r32:      ["GER","FRA","CAN","NED","POR","ESP","USA","BEL","BRA","NOR","MEX","ENG","ARG","AUS","SUI","COL"],
    r16:      ["FRA","NED","ESP","USA","BRA","ENG","ARG","COL"],
    qf:       ["FRA","ESP","BRA","ARG"],
    sf:       ["ESP","ARG"],
    third:    "FRA",
    champion: "ARG",
  },
  "gemini@quiniela26.internal": {
    //          M74   M77   M73   M75   M83   M84   M81   M82   M76   M78   M79   M80   M86   M88   M85   M87
    r32:      ["GER","FRA","CAN","NED","POR","ESP","USA","SEN","BRA","NOR","MEX","ENG","ARG","EGY","SUI","COL"],
    r16:      ["FRA","NED","ESP","USA","BRA","ENG","ARG","COL"],
    qf:       ["FRA","ESP","BRA","ARG"],
    sf:       ["FRA","ARG"],
    third:    "BRA",
    champion: "ARG",
  },
  "chatgpt@quiniela26.internal": {
    //          M74   M77   M73   M75   M83   M84   M81   M82   M76   M78   M79   M80   M86   M88   M85   M87
    r32:      ["GER","FRA","CAN","NED","POR","ESP","USA","BEL","BRA","NOR","MEX","ENG","ARG","EGY","SUI","COL"],
    r16:      [null, null, null, null, null, null, null, null],
    qf:       [null, null, null, null],
    sf:       [null, null],
    third:    null,
    champion: null,
  },
};

async function main() {
  // Team UUID map
  const { data: teams } = await sb.from("teams").select("id, fifa_code");
  const codeToId: Record<string, string> = {};
  for (const t of teams ?? []) codeToId[t.fifa_code] = t.id;
  function tid(code: string | null) { return code ? (codeToId[code] ?? null) : null; }

  // User map
  const emails = Object.keys(AI_PICKS);
  const { data: users } = await sb.from("users").select("id, email").in("email", emails);
  const userMap: Record<string, string> = {};
  for (const u of users ?? []) userMap[u.email] = u.id;

  for (const [email, picks] of Object.entries(AI_PICKS)) {
    const userId = userMap[email];
    if (!userId) { console.log(`⚠️  ${email} — user not found`); continue; }

    const picksJson = {
      r32:      picks.r32.map(tid),
      r16:      picks.r16.map(tid),
      qf:       picks.qf.map(tid),
      sf:       picks.sf.map(tid),
      third:    tid(picks.third),
      champion: tid(picks.champion),
    };

    // Delete existing then insert (same pattern as saveKnockoutPrediction action)
    await sb.from("knockout_predictions").delete().eq("user_id", userId);

    const { error } = await sb.from("knockout_predictions").insert({ user_id: userId, picks: picksJson });

    if (error) {
      console.error(`❌ ${email}: ${error.message}`);
    } else {
      console.log(`✅ ${email} — champion: ${picks.champion ?? "TBD"}`);
      console.log(`   r32: ${picks.r32.join(", ")}`);
    }
  }
}

main().catch(console.error);
