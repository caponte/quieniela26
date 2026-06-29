/**
 * Restores ChatGPT's group-stage bracket fields (groups, r32, r32_third,
 * third_qualifiers) that were lost, while keeping the KO picks already in DB.
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

const CHATGPT_USER_ID = "cc7d23a8-842a-4ba0-a002-50def1dc04df";
const LEAGUE_ID       = "4a45d656-2839-44eb-a816-78bee3eb1872";

// Indices in the 16-slot r32_third array that correspond to third-place slots
const THIRD_SLOTS = [0, 1, 6, 7, 10, 11, 14, 15];

const ORIGINAL = {
  groups: {
    A: { first: "MEX", second: "CZE", third: "KOR" },
    B: { first: "SUI", second: "CAN", third: "BIH" },
    C: { first: "BRA", second: "MAR", third: "SCO" },
    D: { first: "USA", second: "TUR", third: "PAR" },
    E: { first: "GER", second: "ECU", third: "CIV" },
    F: { first: "NED", second: "JPN", third: "SWE" },
    G: { first: "BEL", second: "IRN", third: "EGY" },
    H: { first: "ESP", second: "URU", third: "CPV" },
    I: { first: "FRA", second: "NOR", third: "SEN" },
    J: { first: "ARG", second: "AUT", third: "ALG" },
    K: { first: "POR", second: "COL", third: "UZB" },
    L: { first: "ENG", second: "CRO", third: "GHA" },
  },
  third_qualifiers: ["KOR","BIH","SCO","PAR","CIV","SWE","EGY","SEN"],
  r32: ["GER","FRA","MEX","NED","POR","ESP","USA","BEL","BRA","FRA","ENG","ENG","ARG","COL","SUI","POR"],
};

async function main() {
  // 1. Fetch team UUID map
  const { data: teams, error: teamsErr } = await sb.from("teams").select("id, fifa_code");
  if (teamsErr || !teams) { console.error("Failed to fetch teams", teamsErr); process.exit(1); }
  const teamMap: Record<string, string> = {};
  for (const t of teams) teamMap[t.fifa_code] = t.id;

  function toId(code: string | null): string | null {
    if (!code) return null;
    const id = teamMap[code];
    if (!id) { console.warn(`⚠️  Unknown FIFA code: "${code}"`); return null; }
    return id;
  }

  // 2. Fetch current league bracket (has r16/qf/sf/third/champion)
  const { data: row } = await sb
    .from("bracket_predictions")
    .select("predictions")
    .eq("user_id", CHATGPT_USER_ID)
    .eq("league_id", LEAGUE_ID)
    .maybeSingle();

  const current = (row?.predictions ?? {}) as Record<string, unknown>;
  console.log("Current league bracket keys:", Object.keys(current));

  // 3. Convert groups
  const groupsUUID: Record<string, Record<string, string | null>> = {};
  for (const [g, picks] of Object.entries(ORIGINAL.groups)) {
    groupsUUID[g] = {
      first:  toId(picks.first),
      second: toId(picks.second),
      third:  toId(picks.third),
    };
  }

  // 4. Convert r32 (16 R32 winners)
  const r32UUID = ORIGINAL.r32.map(toId);

  // 5. Convert third_qualifiers
  const thirdQualUUID = ORIGINAL.third_qualifiers.map(toId);

  // 6. Build r32_third (16-slot array, nulls except at THIRD_SLOTS positions)
  const r32Third: (string | null)[] = Array(16).fill(null);
  THIRD_SLOTS.forEach((slot, i) => {
    r32Third[slot] = thirdQualUUID[i] ?? null;
  });

  // 7. Merge: restore group-stage fields, keep current KO fields
  const merged = {
    ...current,
    groups:            groupsUUID,
    r32:               r32UUID,
    third_qualifiers:  thirdQualUUID,
    r32_third:         r32Third,
  };

  console.log("Merged keys:", Object.keys(merged));

  // 8. Upsert
  const { error: upsertErr } = await sb
    .from("bracket_predictions")
    .update({ predictions: merged, updated_at: new Date().toISOString() })
    .eq("user_id", CHATGPT_USER_ID)
    .eq("league_id", LEAGUE_ID);

  if (upsertErr) { console.error("Update failed:", upsertErr); process.exit(1); }

  console.log("\n✅ ChatGPT bracket restored.");
  console.log("  groups: 12 grupos ✓");
  console.log("  r32:", r32UUID.length, "entries ✓");
  console.log("  third_qualifiers:", thirdQualUUID.length, "teams ✓");
  console.log("  r32_third filled at slots:", THIRD_SLOTS.join(","));
  console.log("  KO fields preserved:", ["r16","qf","sf","third","champion"].filter(k => merged[k] !== undefined).join(", "));
}

main().catch(e => { console.error(e); process.exit(1); });
