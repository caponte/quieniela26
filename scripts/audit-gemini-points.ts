/**
 * Audits Gemini's total match points with full breakdown.
 * Usage: npx tsx scripts/audit-gemini-points.ts
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
  const { data: geminiUser } = await sb
    .from("users").select("id, name").eq("email", "gemini@quiniela26.internal").maybeSingle();
  if (!geminiUser) { console.error("❌ Gemini user not found"); process.exit(1); }

  // All Gemini predictions with points
  const { data: preds } = await sb
    .from("match_predictions")
    .select("id, match_id, home_goals, away_goals, league_id, match_points(base_points, bonus_points, total_points, breakdown)")
    .eq("user_id", geminiUser.id);

  // Matches info
  const matchIds = (preds ?? []).map((p: any) => p.match_id);
  const { data: matches } = await sb
    .from("matches")
    .select("id, home_team_id, away_team_id, home_score, away_score, status, match_date, group_name, stage")
    .in("id", matchIds);

  const { data: teams } = await sb.from("teams").select("id, fifa_code");
  const teamById: Record<string, string> = {};
  for (const t of teams ?? []) teamById[t.id] = t.fifa_code;

  const matchById: Record<string, any> = {};
  for (const m of matches ?? []) matchById[m.id] = m;

  // Determine jornada
  const { data: allGroup } = await sb
    .from("matches").select("id, group_name, match_date").eq("stage", "group").order("match_date");
  const byGroup = new Map<string, any[]>();
  for (const m of allGroup ?? []) {
    const g = m.group_name ?? "__";
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push(m);
  }
  const jornadaById: Record<string, string> = {};
  for (const [, ms] of byGroup) {
    const sorted = [...ms].sort((a: any, b: any) => a.match_date.localeCompare(b.match_date));
    sorted.slice(0, 2).forEach((m: any) => { jornadaById[m.id] = "J1"; });
    sorted.slice(2, 4).forEach((m: any) => { jornadaById[m.id] = "J2"; });
    sorted.slice(4).forEach((m: any) => { jornadaById[m.id] = "J3"; });
  }

  let grand = 0;
  let withPoints = 0, withoutPoints = 0;
  const byJornada: Record<string, { pts: number; count: number }> = {};

  const rows: any[] = [];
  for (const p of preds ?? []) {
    const m = matchById[p.match_id];
    if (!m) continue;
    const pts = (p.match_points as any)?.total_points ?? null;
    const home = teamById[m.home_team_id] ?? "?";
    const away = teamById[m.away_team_id] ?? "?";
    const jornada = m.stage === "group" ? (jornadaById[m.id] ?? "GRP") : m.stage;
    const status = m.status;

    if (pts !== null) {
      grand += pts;
      withPoints++;
      byJornada[jornada] = byJornada[jornada] ?? { pts: 0, count: 0 };
      byJornada[jornada].pts += pts;
      byJornada[jornada].count++;
    } else {
      withoutPoints++;
    }

    rows.push({ jornada, status, home, pred_h: p.home_goals, away, pred_a: p.away_goals, real_h: m.home_score, real_a: m.away_score, pts, breakdown: (p.match_points as any)?.breakdown });
  }

  // Sort by jornada then teams
  rows.sort((a, b) => a.jornada.localeCompare(b.jornada) || a.home.localeCompare(b.home));

  console.log(`\n=== Auditoría de puntos — ${geminiUser.name} ===\n`);

  for (const r of rows) {
    if (r.pts === null) {
      console.log(`  ⏳ ${r.jornada} | ${r.home} vs ${r.away} | pred: ${r.pred_h}-${r.pred_a} | real: ${r.real_h ?? "?"}-${r.real_a ?? "?"} | SIN PUNTOS (${r.status})`);
    } else {
      const bd = r.breakdown ? Object.entries(r.breakdown).filter(([,v]) => v).map(([k]) => k).join("+") : "";
      console.log(`  ${r.pts > 0 ? "✅" : "  "} ${r.jornada} | ${r.home} ${r.pred_h}-${r.pred_a} ${r.away} | real: ${r.real_h}-${r.real_a} | ${r.pts}pts${bd ? " ("+bd+")" : ""}`);
    }
  }

  console.log(`\n--- Por jornada ---`);
  for (const [j, v] of Object.entries(byJornada).sort()) {
    console.log(`  ${j}: ${v.pts} pts (${v.count} partidos con puntos)`);
  }

  console.log(`\n📊 Total match points: ${grand}`);
  console.log(`   Con puntos: ${withPoints} | Sin puntos: ${withoutPoints}`);
  console.log(`   ¿Coincide con 234? ${grand === 234 ? "✅ SÍ" : `❌ NO (diferencia: ${grand - 234})`}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
