/**
 * Checks ALL users for duplicate match predictions (same match_id, different league_id).
 * Usage: npx tsx scripts/check-all-duplicates.ts
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
) as any;

async function main() {
  const { data: users } = await sb.from("users").select("id, name, email");
  const { data: allPreds } = await sb
    .from("match_predictions")
    .select("id, user_id, match_id, league_id, match_points(total_points)");

  const userMap: Record<string, { name: string; email: string }> = {};
  for (const u of users ?? []) userMap[u.id] = { name: u.name, email: u.email };

  // Group by (user_id, match_id)
  const byUserMatch: Record<string, any[]> = {};
  for (const p of allPreds ?? []) {
    const key = `${p.user_id}::${p.match_id}`;
    if (!byUserMatch[key]) byUserMatch[key] = [];
    byUserMatch[key].push(p);
  }

  // Find duplicates
  const duplicatesByUser: Record<string, { count: number; extraPts: number }> = {};
  for (const [key, ps] of Object.entries(byUserMatch)) {
    if (ps.length < 2) continue;
    const userId = key.split("::")[0];
    const hasNull = ps.some((p: any) => p.league_id === null);
    const hasNonNull = ps.some((p: any) => p.league_id !== null);
    if (!hasNull || !hasNonNull) continue; // only flag mixed null/non-null

    const totalPts = ps.reduce((s: number, p: any) => s + ((p.match_points as any)?.total_points ?? 0), 0);
    const bestPts = Math.max(...ps.map((p: any) => (p.match_points as any)?.total_points ?? 0));
    const extra = totalPts - bestPts;

    if (!duplicatesByUser[userId]) duplicatesByUser[userId] = { count: 0, extraPts: 0 };
    duplicatesByUser[userId].count++;
    duplicatesByUser[userId].extraPts += extra;
  }

  console.log(`\n=== Auditoría de duplicados — todos los usuarios ===\n`);

  const totalUsers = Object.keys(userMap).length;
  const usersWithDupes = Object.keys(duplicatesByUser).length;

  if (usersWithDupes === 0) {
    console.log(`✅ Ningún usuario tiene predicciones duplicadas (${totalUsers} usuarios revisados).`);
  } else {
    console.log(`⚠️  ${usersWithDupes} usuarios con duplicados:\n`);
    for (const [userId, info] of Object.entries(duplicatesByUser)) {
      const u = userMap[userId];
      console.log(`  ${u?.name ?? userId} (${u?.email ?? ""}) — ${info.count} partidos duplicados, +${info.extraPts} pts extra`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
