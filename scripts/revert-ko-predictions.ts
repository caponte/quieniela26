/**
 * Reverts the KO match_predictions and bracket_predictions changes
 * made by insert-ko-predictions.ts for the three AI users.
 *
 * Usage: npx tsx scripts/revert-ko-predictions.ts
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

// The 16 R32 match IDs that were incorrectly inserted
const R32_MATCH_IDS = [
  "19c6831c-ed2e-4afc-a6bf-6e2c75cb7666",
  "9ca7d4a2-293a-41ed-b0c2-f7f44737fa0a",
  "fe22d9b4-77fc-4f69-bf0f-a0d0ea9226f3",
  "474a26c3-3f21-42d9-bd9a-0e241e4bd1cc",
  "4abb412d-0024-4ba3-b773-6a5dc40ba952",
  "63ea5373-63cd-47f8-a832-e01cdcd53660",
  "00b49200-615e-430d-866d-ccd8c5e1c5d3",
  "9a2dfc3e-102c-4e26-9b51-d267c607f637",
  "bb83335b-ae2d-4487-b0cd-f287439d3b8a",
  "294c2498-2471-4db0-a362-cea5cc072995",
  "489c0f9e-4204-4587-8b7c-ef131a9c986b",
  "dd354235-2d72-405d-b7d5-774dc6a3950e",
  "72a90f45-ec25-4e6c-9eea-b1ec98003d0d",
  "ca2c0c5d-f0c1-43ea-a28e-0e4d6c66ebf4",
  "e7bed273-df10-48c7-83a4-534a15e7d325",
  "eb52baec-6a7e-41a2-99a0-2d7c94fa70b0",
];

const AI_EMAILS = [
  "claude@quiniela26.internal",
  "gemini@quiniela26.internal",
  "chatgpt@quiniela26.internal",
];

// Original bracket values (from -predictions.json files, group-stage predictions)
const ORIGINAL_BRACKETS: Record<string, { r16: string[]; qf: string[]; sf: string[]; third: string; champion: string }> = {
  "claude@quiniela26.internal": {
    r16:      ["FRA","NED","ESP","BEL","BRA","ENG","ARG","POR"],
    qf:       ["FRA","ESP","BRA","ARG"],
    sf:       ["ESP","ARG"],
    third:    "FRA",
    champion: "ARG",
  },
  "gemini@quiniela26.internal": {
    r16:      ["FRA","NED","ESP","BEL","BRA","ENG","ARG","POR"],
    qf:       ["FRA","ESP","BRA","ARG"],
    sf:       ["FRA","ARG"],
    third:    "BRA",
    champion: "ARG",
  },
  // ChatGPT bracket was not touched (skipped), no restore needed
};

async function main() {
  // 1. Fetch team UUID map
  const { data: teams } = await supabase.from("teams").select("id, fifa_code");
  const codeToId: Record<string, string> = {};
  for (const t of teams ?? []) codeToId[t.fifa_code] = t.id;

  // 2. Fetch AI user IDs
  const { data: users } = await supabase
    .from("users")
    .select("id, email")
    .in("email", AI_EMAILS);

  const userMap: Record<string, string> = {};
  for (const u of users ?? []) userMap[u.email] = u.id;
  console.log("AI users found:", Object.keys(userMap).length);

  const userIds = Object.values(userMap);

  // 3. Delete R32 match_predictions for all AI users
  console.log("\n🗑  Deleting R32 match_predictions...");
  const { error: delErr, count } = await supabase
    .from("match_predictions")
    .delete({ count: "exact" })
    .in("user_id", userIds)
    .in("match_id", R32_MATCH_IDS);

  if (delErr) {
    console.error("❌ Delete error:", delErr.message);
  } else {
    console.log(`   ✅ Deleted ${count} rows from match_predictions`);
  }

  // 4. Restore bracket_predictions for Claude and Gemini
  console.log("\n♻️  Restoring bracket_predictions...");

  for (const [email, original] of Object.entries(ORIGINAL_BRACKETS)) {
    const userId = userMap[email];
    if (!userId) {
      console.log(`   ⚠️  ${email} — user not found, skipping`);
      continue;
    }

    // Fetch current bracket to preserve groups/r32/r32_third
    const { data: bp } = await supabase
      .from("bracket_predictions")
      .select("predictions")
      .eq("user_id", userId)
      .is("league_id", null)
      .maybeSingle();

    const existing = bp?.predictions ?? {};

    const restored = {
      ...existing,
      r16:      original.r16.map(c => codeToId[c] ?? null),
      qf:       original.qf.map(c => codeToId[c] ?? null),
      sf:       original.sf.map(c => codeToId[c] ?? null),
      third:    codeToId[original.third]    ?? null,
      champion: codeToId[original.champion] ?? null,
    };

    const { error } = await supabase
      .from("bracket_predictions")
      .update({ predictions: restored })
      .eq("user_id", userId)
      .is("league_id", null);

    if (error) {
      console.error(`   ❌ ${email}: ${error.message}`);
    } else {
      console.log(`   ✅ ${email} — bracket restored (champion: ${original.champion})`);
    }
  }

  console.log("\n✅ Revert complete.");
}

main().catch(e => { console.error(e); process.exit(1); });
