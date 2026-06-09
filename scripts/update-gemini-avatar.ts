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

const GEMINI_ID  = "3f266f21-9bb7-4175-87c7-4812b659178f";
const AVATAR_URL = "https://www.gstatic.com/lamda/images/gemini_sparkle_aurora_33f86dc0c0257da337c63.svg";

async function main() {
  const { data, error } = await supabase
    .from("users")
    .update({ avatar_url: AVATAR_URL })
    .eq("id", GEMINI_ID)
    .select("name, avatar_url");

  if (error) { console.error("❌", error.message); process.exit(1); }
  console.log("✅ Avatar actualizado:", data);
}

main().catch(e => { console.error(e); process.exit(1); });
