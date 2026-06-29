/**
 * Copies groups/r32/r32_third/third_qualifiers from Gemini's global bracket
 * into the liga bracket (F8CCF666), keeping KO fields already there.
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

const GEMINI_USER_ID = "3f266f21-9bb7-4175-87c7-4812b659178f";
const LEAGUE_ID      = "4a45d656-2839-44eb-a816-78bee3eb1872";

async function main() {
  const { data: rows, error } = await sb
    .from("bracket_predictions")
    .select("league_id, predictions")
    .eq("user_id", GEMINI_USER_ID);

  if (error) { console.error(error); process.exit(1); }

  const global = rows?.find(r => r.league_id === null)?.predictions as any;
  const liga   = rows?.find(r => r.league_id === LEAGUE_ID)?.predictions as any;

  if (!global) { console.error("Global bracket not found"); process.exit(1); }
  if (!liga)   { console.error("Liga bracket not found");   process.exit(1); }

  console.log("Global keys :", Object.keys(global));
  console.log("Liga keys   :", Object.keys(liga));

  const FIELDS_TO_COPY = ["groups", "r32", "r32_third", "third_qualifiers"] as const;
  const patch: Record<string, unknown> = { ...liga };

  for (const field of FIELDS_TO_COPY) {
    if (global[field] !== undefined && liga[field] === undefined) {
      patch[field] = global[field];
      console.log(`  + copying ${field}`);
    } else {
      console.log(`  ~ ${field}: ${liga[field] !== undefined ? "already present" : "missing in global too"}`);
    }
  }

  const { error: updateErr } = await sb
    .from("bracket_predictions")
    .update({ predictions: patch, updated_at: new Date().toISOString() })
    .eq("user_id", GEMINI_USER_ID)
    .eq("league_id", LEAGUE_ID);

  if (updateErr) { console.error("Update failed:", updateErr); process.exit(1); }

  console.log("\n✅ Liga bracket patched. New keys:", Object.keys(patch));
}

main().catch(e => { console.error(e); process.exit(1); });
