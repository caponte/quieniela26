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

const CHATGPT_ID  = "cc7d23a8-842a-4ba0-a002-50def1dc04df";
const AVATAR_URL  = "https://miro.medium.com/v2/resize:fit:1100/format:webp/1*aworiHYhKG4Utbn0qvVckQ.jpeg";

async function main() {
  const { data, error } = await supabase
    .from("users")
    .update({ avatar_url: AVATAR_URL })
    .eq("id", CHATGPT_ID)
    .select("name, avatar_url");

  if (error) { console.error("❌", error.message); process.exit(1); }
  console.log("✅ Avatar actualizado:", data);
}

main().catch(e => { console.error(e); process.exit(1); });
