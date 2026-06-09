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

const CLAUDE_ID  = "a42b03d4-d20d-4a6e-afe4-bce7db0f4a85";
const AVATAR_URL = "https://avatars.slack-edge.com/2025-05-14/8891273522918_30c38bf627ac73075db6_512.png";

async function main() {
  const { data, error } = await supabase
    .from("users")
    .update({ avatar_url: AVATAR_URL })
    .eq("id", CLAUDE_ID)
    .select("name, avatar_url");

  if (error) { console.error("❌", error.message); process.exit(1); }
  console.log("✅ Avatar actualizado:", data);
}

main().catch(e => { console.error(e); process.exit(1); });
