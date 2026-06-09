/**
 * Creates Gemini's user account and inserts its bracket prediction.
 *
 * Usage:
 *   npx tsx scripts/insert-gemini-predictions.ts [LEAGUE_CODE]
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";
import ws from "ws";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { realtime: { transport: ws } }
);

const GEMINI_EMAIL = "gemini@quiniela26.internal";
const GEMINI_NAME  = "Gemini IA 🤖";
const PREDICTIONS_FILE = path.join(__dirname, "gemini-predictions.json");

function die(msg: string, err?: unknown): never {
  console.error("❌", msg, err ?? "");
  process.exit(1);
}

async function main() {
  const leagueCode = process.argv[2]?.trim().toUpperCase() || null;

  const preds = JSON.parse(fs.readFileSync(PREDICTIONS_FILE, "utf8"));

  const { data: teams, error: teamsErr } = await supabase
    .from("teams")
    .select("id, fifa_code");
  if (teamsErr || !teams) die("Failed to fetch teams", teamsErr);

  const teamMap: Record<string, string> = {};
  for (const t of teams) teamMap[t.fifa_code] = t.id;

  function teamId(code: string | null): string | null {
    if (!code) return null;
    const id = teamMap[code];
    if (!id) die(`Unknown FIFA code: ${code}`);
    return id;
  }

  console.log("👤 Creating Gemini auth user...");
  let geminiUserId: string;

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", GEMINI_EMAIL)
    .maybeSingle();

  if (existing) {
    geminiUserId = existing.id;
    console.log(`   Already exists: ${geminiUserId}`);
  } else {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: GEMINI_EMAIL,
      email_confirm: true,
      user_metadata: { full_name: GEMINI_NAME },
    });
    if (createErr || !created?.user) die("Failed to create Gemini auth user", createErr);
    geminiUserId = created.user.id;
    console.log(`   Created: ${geminiUserId}`);

    await supabase
      .from("users")
      .update({ name: GEMINI_NAME })
      .eq("id", geminiUserId);
  }

  let leagueId: string | null = null;
  if (leagueCode) {
    const { data: league } = await supabase
      .from("leagues")
      .select("id")
      .eq("invite_code", leagueCode)
      .maybeSingle();
    if (!league) die(`League with code "${leagueCode}" not found`);
    leagueId = league.id;
    console.log(`🏆 League: ${leagueCode} → ${leagueId}`);
  }

  const bp = preds.bracket;

  const groups: Record<string, { first: string|null; second: string|null; third: string|null }> = {};
  for (const [g, v] of Object.entries(bp.groups) as [string, {first:string;second:string;third:string}][]) {
    groups[g] = {
      first:  teamId(v.first),
      second: teamId(v.second),
      third:  teamId(v.third),
    };
  }

  const r32:       (string|null)[] = bp.r32.map((c: string) => teamId(c));
  const r32_third: (string|null)[] = bp.r32_thirds.map((c: string|null) => teamId(c));
  const r16:       (string|null)[] = bp.r16.map((c: string) => teamId(c));
  const qf:        (string|null)[] = bp.qf.map((c: string) => teamId(c));
  const sf:        (string|null)[] = bp.sf.map((c: string) => teamId(c));

  const bracketJson = {
    groups,
    r32,
    r32_third,
    r16,
    qf,
    sf,
    third:    teamId(bp.third),
    champion: teamId(bp.champion),
  };

  console.log("📊 Upserting bracket prediction...");
  const { error: bpErr } = await supabase
    .from("bracket_predictions")
    .upsert({
      user_id:     geminiUserId,
      league_id:   leagueId,
      predictions: bracketJson,
      locked_at:   new Date().toISOString(),
    }, { onConflict: "user_id,league_id" });
  if (bpErr) die("Failed to upsert bracket prediction", bpErr);
  console.log("   ✅ Bracket prediction saved");

  if (preds.matches?.length > 0) {
    console.log("⚽ Upserting match predictions...");
    let ok = 0, fail = 0;

    for (const m of preds.matches) {
      const firstTeamId = m.first_team_to_score ? teamId(m.first_team_to_score) : null;

      const { error } = await supabase
        .from("match_predictions")
        .upsert({
          user_id:             geminiUserId,
          match_id:            m.match_id,
          league_id:           leagueId,
          home_goals:          m.home_goals,
          away_goals:          m.away_goals,
          first_team_to_score: firstTeamId,
          first_goal_scorer:   m.first_goal_scorer ?? null,
          has_penalty:         m.has_penalty,
          locked_at:           new Date().toISOString(),
        }, { onConflict: "user_id,match_id,league_id" });

      if (error) {
        console.error(`   ⚠️  match ${m.match_id}:`, error.message);
        fail++;
      } else {
        ok++;
      }
    }
    console.log(`   ✅ ${ok} match predictions saved, ${fail} failed`);
  } else {
    console.log("ℹ️  No match predictions provided — skipping");
  }

  if (leagueId) {
    console.log("🔗 Joining league...");
    const { error: lmErr } = await supabase
      .from("league_members")
      .upsert({
        league_id: leagueId,
        user_id:   geminiUserId,
        role:      "member",
      }, { onConflict: "league_id,user_id" });
    if (lmErr) die("Failed to join league", lmErr);
    console.log("   ✅ Joined league");
  }

  console.log("\n🤖 Gemini IA está listo en la quiniela!");
  console.log(`   user_id: ${geminiUserId}`);
  console.log(`   champion: ${bp.champion}`);
  if (leagueCode) console.log(`   league:   ${leagueCode}`);
}

main().catch(e => die("Unexpected error", e));
