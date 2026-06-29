import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env.local") });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { realtime: { transport: ws } });

async function main() {
  const { data: marco } = await sb.from("users").select("id, name, email").eq("email", "marcodelgadom99@gmail.com").maybeSingle();
  console.log("Marco user:", JSON.stringify(marco));

  if (marco) {
    const { data: bp } = await sb.from("bracket_predictions").select("*").eq("user_id", marco.id);
    console.log("Marco bracket predictions:", JSON.stringify(bp, null, 2));
  }

  const { data: leagues } = await sb.from("leagues").select("id, name, invite_code");
  console.log("Leagues:", JSON.stringify(leagues, null, 2));

  const { data: teams } = await sb.from("teams").select("id, fifa_code, name").in("fifa_code", ["FRA","NED","ESP","SEN","NOR","ECU","ARG","COL"]);
  console.log("Teams:", JSON.stringify(teams, null, 2));
}
main().catch(console.error);
