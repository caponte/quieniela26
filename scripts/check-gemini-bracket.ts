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
  const { data, error } = await sb
    .from("bracket_predictions")
    .select("league_id, predictions")
    .eq("user_id", "3f266f21-9bb7-4175-87c7-4812b659178f");

  if (error) { console.error(error); process.exit(1); }

  for (const row of data ?? []) {
    console.log("\n=== league_id:", row.league_id ?? "NULL (global)");
    const p = row.predictions as any;
    console.log("keys:", Object.keys(p));
    console.log("groups keys:", p.groups ? Object.keys(p.groups) : "MISSING");
    console.log("r32_third:", JSON.stringify(p.r32_third));
    console.log("r32 len:", Array.isArray(p.r32) ? p.r32.length : "MISSING");
    console.log("r16 len:", Array.isArray(p.r16) ? p.r16.length : "MISSING");
    console.log("qf  len:", Array.isArray(p.qf)  ? p.qf.length  : "MISSING");
    console.log("sf  len:", Array.isArray(p.sf)   ? p.sf.length  : "MISSING");
    console.log("third   :", p.third    ?? "MISSING");
    console.log("champion:", p.champion ?? "MISSING");
  }
}

main().catch(e => { console.error(e); process.exit(1); });
