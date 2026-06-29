/**
 * Removes the league-specific bracket_predictions row added by mistake,
 * and confirms knockout_predictions has the correct KO picks.
 */
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { realtime: { transport: ws } }
);

const MARCO_USER_ID  = "3f514690-2608-4e71-b652-fecc51627531";
const LEAGUE_ID      = "4a45d656-2839-44eb-a816-78bee3eb1872";

// Team UUIDs
const T = {
  FRA: "0f3ce876-1ae4-4d8b-b4f9-6108f333b4fd",
  NED: "966615cc-eba9-4120-8907-80c719da86db",
  ESP: "7a87cd94-a36e-4262-b998-fc16ed3cde98",
  SEN: "6e51724d-635a-4d91-a1cc-d23a3b18cf9b",
  NOR: "4d79c715-f119-4de4-bb13-5b51c2ca4cd5",
  ECU: "75b25f7c-9224-4dce-92a2-4d69fe7cef74",
  ARG: "5cf24e48-9eac-4344-b171-92e23246b79f",
  COL: "bf9e9704-1bef-48f0-885c-a735d3985171",
};

// KO picks slot order: KO_R16_NUMS=[89,90,93,94,91,92,95,96], KO_QF_NUMS=[97,98,99,100], KO_SF_NUMS=[101,102]
const koPicks = {
  r16: [T.FRA, T.NED, T.ESP, T.SEN, T.NOR, T.ECU, T.ARG, T.COL],
  qf:  [T.FRA, T.ESP, T.NOR, T.ARG],
  sf:  [T.ESP, T.ARG],
  third:    T.FRA,
  champion: T.ARG,
};

async function main() {
  // 1. Delete league-specific bracket_predictions row
  const { error: delErr, count } = await sb
    .from("bracket_predictions")
    .delete({ count: "exact" })
    .eq("user_id", MARCO_USER_ID)
    .eq("league_id", LEAGUE_ID);

  if (delErr) {
    console.error("❌ Error deleting league bracket:", delErr);
  } else {
    console.log(`✅ Deleted ${count} league-specific bracket_predictions row(s)`);
  }

  // 2. Verify original global bracket is still there
  const { data: global } = await sb
    .from("bracket_predictions")
    .select("id, league_id, predictions")
    .eq("user_id", MARCO_USER_ID)
    .is("league_id", null)
    .maybeSingle();

  if (global) {
    const p = global.predictions as any;
    console.log("✅ Original global bracket intact — champion:", p.champion);
  } else {
    console.log("⚠️  No global bracket found");
  }

  // 3. Upsert knockout_predictions with the correct picks
  const { error: koErr } = await sb
    .from("knockout_predictions")
    .upsert({ user_id: MARCO_USER_ID, picks: koPicks }, { onConflict: "user_id" });

  if (koErr) {
    console.error("❌ Error upserting knockout_predictions:", koErr);
  } else {
    console.log("✅ knockout_predictions confirmed with correct picks:");
    console.log("   r16:", "FRA NED ESP SEN NOR ECU ARG COL");
    console.log("   qf: ", "FRA ESP NOR ARG");
    console.log("   sf: ", "ESP ARG");
    console.log("   3ro: FRA | Campeón: ARG");
  }
}

main().catch(console.error);
