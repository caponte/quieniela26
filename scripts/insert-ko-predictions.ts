/**
 * Inserts an AI user's KO-stage predictions from a JSON file.
 *
 * Usage:
 *   npx tsx scripts/insert-ko-predictions.ts <predictions-file> [LEAGUE_CODE]
 *
 * Example:
 *   npx tsx scripts/insert-ko-predictions.ts scripts/claude-ko-predictions.json
 *   npx tsx scripts/insert-ko-predictions.ts scripts/gemini-ko-predictions.json MUNDIAL26
 *
 * The predictions file must follow the schema in ko-prediction-data.json:
 *   - r32_matches: array with home_goals, away_goals, has_penalty,
 *                  first_team_to_score, first_goal_scorer filled
 *   - bracket.r16 / qf / sf: arrays of 8/4/2 fifa_codes (winners per slot)
 *   - bracket.third / bracket.champion: fifa_codes
 *   - meta.user_email: email of the AI user in Supabase auth
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

function die(msg: string, err?: unknown): never {
  console.error("❌", msg, err ?? "");
  process.exit(1);
}

async function main() {
  const predsFile = process.argv[2];
  const leagueCode = process.argv[3]?.trim().toUpperCase() || null;

  if (!predsFile) die("Usage: insert-ko-predictions.ts <predictions-file> [LEAGUE_CODE]");

  const preds = JSON.parse(fs.readFileSync(predsFile, "utf8"));
  const meta = preds.meta as { user_email: string; user_name: string };

  console.log(`📁 Loading predictions from ${predsFile}`);
  console.log(`👤 User: ${meta.user_name} (${meta.user_email})`);

  // 1. Fetch team UUID map { fifa_code → id }
  const { data: teams, error: teamsErr } = await supabase
    .from("teams")
    .select("id, fifa_code");
  if (teamsErr || !teams) die("Failed to fetch teams", teamsErr);

  const teamMap: Record<string, string> = {};
  for (const t of teams) teamMap[t.fifa_code] = t.id;

  function teamId(code: string | null): string | null {
    if (!code) return null;
    const id = teamMap[code];
    if (!id) die(`Unknown FIFA code: "${code}"`);
    return id;
  }

  // 2. Fetch player UUID map { name → id }
  const { data: players } = await supabase
    .from("players")
    .select("id, name");

  const playerMap: Record<string, string> = {};
  for (const p of players ?? []) playerMap[p.name.trim()] = p.id;

  function playerId(name: string | null): string | null {
    if (!name) return null;
    return playerMap[name.trim()] ?? null;
  }

  // 3. Get or create the AI user
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", meta.user_email)
    .maybeSingle();

  let userId: string;
  if (existingUser) {
    userId = existingUser.id;
    console.log(`   User exists: ${userId}`);
  } else {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: meta.user_email,
      email_confirm: true,
      user_metadata: { full_name: meta.user_name },
    });
    if (createErr || !created?.user) die("Failed to create user", createErr);
    userId = created.user.id;
    await supabase.from("users").update({ name: meta.user_name }).eq("id", userId);
    console.log(`   User created: ${userId}`);
  }

  // 4. Resolve league
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

  // 5. Insert R32 match predictions
  // Support format C: preds.ko_predictions.r32 (Claude format)
  const r32List: any[] = preds.r32_matches ?? preds.ko_predictions?.r32 ?? [];

  console.log("\n⚽ Upserting R32 match predictions...");
  let ok = 0, fail = 0, skipped = 0;

  for (const m of r32List) {
    if (!m.match_id) {
      console.log(`   ⚠️  ${m.match_label} — no match_id (TBD), skipping`);
      skipped++;
      continue;
    }

    const firstTeamId = teamId(m.first_team_to_score ?? null);
    const firstScorerId = playerId(m.first_goal_scorer ?? null);

    const { error } = await supabase
      .from("match_predictions")
      .upsert({
        user_id:             userId,
        match_id:            m.match_id,
        league_id:           leagueId,
        home_goals:          m.home_goals,
        away_goals:          m.away_goals,
        first_team_to_score: firstTeamId,
        first_goal_scorer:   firstScorerId,
        has_penalty:         m.has_penalty ?? false,
        locked_at:           new Date().toISOString(),
      }, { onConflict: "user_id,match_id,league_id" });

    if (error) {
      console.error(`   ⚠️  ${m.match_label} (${m.home} vs ${m.away}): ${error.message}`);
      fail++;
    } else {
      const label = m.match_label ?? m.match_id?.slice(0, 8);
      const teams = m.home && m.away ? `${m.home} vs ${m.away}` : m.match_id;
      console.log(`   ✓ ${label} ${m.home_goals}-${m.away_goals} [${teams}]${m.has_penalty ? " (PKs)" : ""}`);
      ok++;
    }
  }
  console.log(`   ${ok} saved, ${fail} failed, ${skipped} skipped`);

  // 6. Update bracket prediction (r16, qf, sf, third, champion)
  console.log("\n📊 Updating bracket prediction (KO rounds)...");

  // Extract bracket arrays — support two formats:
  //   A) flat: preds.bracket.r16 = ["ESP","ARG",...] (8 codes)
  //   B) nested (template format): preds.r16_matches[i].bracket_winner + preds.final.champion
  let r16Codes: (string|null)[];
  let qfCodes:  (string|null)[];
  let sfCodes:  (string|null)[];
  let thirdCode: string | null;
  let championCode: string | null;

  if (preds.bracket) {
    // Format A — flat arrays: preds.bracket.r16 = ["ESP", ...]
    const bp = preds.bracket;
    r16Codes     = bp.r16  as (string|null)[];
    qfCodes      = bp.qf   as (string|null)[];
    sfCodes      = bp.sf   as (string|null)[];
    thirdCode    = bp.third    ?? null;
    championCode = bp.champion ?? null;
  } else if (preds.ko_predictions) {
    // Format C — Claude format: preds.ko_predictions.r16[i].winner
    const kp = preds.ko_predictions;
    r16Codes     = (kp.r16  as any[]).map((m: any) => m.winner ?? null);
    qfCodes      = (kp.qf   as any[]).map((m: any) => m.winner ?? null);
    sfCodes      = (kp.sf   as any[]).map((m: any) => m.winner ?? null);
    thirdCode    = kp.third_place?.winner ?? null;
    championCode = kp.final?.winner       ?? null;
  } else {
    // Format B — template format: preds.r16_matches[i].bracket_winner
    r16Codes     = (preds.r16_matches as any[]).map((m: any) => m.bracket_winner ?? null);
    qfCodes      = (preds.qf_matches  as any[]).map((m: any) => m.bracket_winner ?? null);
    sfCodes      = (preds.sf_matches  as any[]).map((m: any) => m.bracket_winner ?? null);
    thirdCode    = preds.third_place?.third_place_winner ?? null;
    championCode = preds.final?.champion ?? null;
  }

  const hasBracket = r16Codes.some(c => c !== null) || championCode !== null;

  if (!hasBracket) {
    console.log("   ⏭  No bracket data provided — skipping bracket update");
  } else {
    // Fetch current bracket
    let bpQuery = supabase
      .from("bracket_predictions")
      .select("predictions")
      .eq("user_id", userId);
    bpQuery = leagueId === null
      ? bpQuery.is("league_id", null)
      : bpQuery.eq("league_id", leagueId);
    const { data: existingBP } = await bpQuery.maybeSingle();

    const existingPreds = existingBP?.predictions ?? {};

    // Only overwrite rounds that have actual data
    const patch: Record<string, unknown> = {};
    if (r16Codes.some(c => c !== null)) patch.r16 = r16Codes.map(teamId);
    if (qfCodes.some(c => c !== null))  patch.qf  = qfCodes.map(teamId);
    if (sfCodes.some(c => c !== null))  patch.sf  = sfCodes.map(teamId);
    if (thirdCode)    patch.third    = teamId(thirdCode);
    if (championCode) patch.champion = teamId(championCode);

    const updatedBracket = { ...existingPreds, ...patch };

    const { error: bpErr } = await supabase
      .from("bracket_predictions")
      .upsert({
        user_id:     userId,
        league_id:   leagueId,
        predictions: updatedBracket,
        locked_at:   new Date().toISOString(),
      }, { onConflict: "user_id,league_id" });

    if (bpErr) die("Failed to upsert bracket prediction", bpErr);
    console.log(`   ✅ Bracket updated — champion: ${championCode}`);
  }

  // 7. Join league
  if (leagueId) {
    await supabase
      .from("league_members")
      .upsert({ league_id: leagueId, user_id: userId, role: "member" },
               { onConflict: "league_id,user_id" });
    console.log(`🔗 Joined league ${leagueCode}`);
  }

  console.log(`\n✅ Done! ${meta.user_name} KO predictions inserted.`);
  console.log(`   user_id: ${userId}`);
  console.log(`   champion: ${championCode}`);
}

main().catch((e) => die("Unexpected error", e));
