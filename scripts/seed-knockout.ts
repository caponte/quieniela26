/**
 * Fetches knockout matches (R32 → Final) from the FIFA API and inserts them
 * into Supabase, setting fifa_match_id in the same step.
 *
 * Usage: npm run seed-knockout
 *
 * Run after the group stage ends, once teams are defined in the API.
 * Safe to re-run: uses upsert on match_number, so existing rows are updated.
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";
import ws from "ws";
import type { MatchStage } from "../src/lib/supabase/database.types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { realtime: { transport: ws } }
);

const FIFA_BASE = "https://api.fifa.com/api/v3";

async function fifaFetch(url: string) {
  const res = await fetch(url, { cache: "no-store" } as RequestInit);
  if (!res.ok) throw new Error(`FIFA API ${res.status}: ${await res.text()}`);
  return res.json();
}

// Stage match_number ranges (based on bracket.ts)
const STAGE_START: Record<string, number> = {
  round_of_32:  73,
  round_of_16:  89,
  quarter_final: 97,
  semi_final:   101,
  third_place:  103,
  final:        104,
};

function fifaStageToMatchStage(stageName: string): MatchStage | null {
  const s = stageName.toLowerCase();
  if (s.includes("round of 32") || s.includes("last 32") || s.includes("dieciseisavo") || s.includes("treintaidosavo")) return "round_of_32";
  if (s.includes("round of 16") || s.includes("last 16") || s.includes("octavo")) return "round_of_16";
  if (s.includes("quarter") || s.includes("cuarto")) return "quarter_final";
  if (s.includes("semi")) return "semi_final";
  if (s.includes("third") || s.includes("3rd") || s.includes("play-off for third") || s.includes("tercer")) return "third_place";
  if (s.includes("final")) return "final";
  return null;
}

async function main() {
  console.log("Fetching WC2026 matches from api.fifa.com...");
  const data = await fifaFetch(
    `${FIFA_BASE}/calendar/matches?idCompetition=17&idSeason=285023&count=200&language=en`
  );

  const allFifaMatches: any[] = data.Results ?? data.results ?? [];
  console.log(`  Got ${allFifaMatches.length} total matches from FIFA API`);

  // Filter to knockout matches (GroupName is null/empty for knockout)
  const knockoutMatches = allFifaMatches.filter((m: any) => {
    const groupName = m.GroupName ?? m.Group?.Name;
    const isGroup = Array.isArray(groupName) ? groupName.length > 0 : !!groupName;
    return !isGroup;
  });
  console.log(`  Knockout matches found: ${knockoutMatches.length}`);

  if (knockoutMatches.length === 0) {
    console.log("No knockout matches available yet. Run again after the group stage ends.");
    return;
  }

  // Load our teams (fifa_code → id)
  const { data: teams, error: teamsErr } = await supabase
    .from("teams")
    .select("id, fifa_code");
  if (teamsErr || !teams) throw new Error("Failed to load teams: " + teamsErr?.message);
  const codeToId: Record<string, string> = {};
  for (const t of teams) codeToId[t.fifa_code] = t.id;

  // Load existing match_numbers so we can detect conflicts
  const { data: existingMatches } = await supabase
    .from("matches")
    .select("match_number, fifa_match_id");
  const existingByNumber = new Map<number, any>();
  for (const m of existingMatches ?? []) existingByNumber.set(m.match_number, m);

  // Group knockout matches by stage, sorted by date
  const byStage: Record<string, any[]> = {};
  for (const m of knockoutMatches) {
    const rawStage: string =
      m.StageName?.find((s: any) => s.Locale === "en-GB")?.Description ??
      m.StageName?.find((s: { Description?: string }) => s.Description)?.Description ??
      "";
    const stage = fifaStageToMatchStage(rawStage);
    if (!stage) {
      console.log(`  ✗ Unknown stage "${rawStage}" for match ${m.IdMatch}`);
      continue;
    }
    if (!byStage[stage]) byStage[stage] = [];
    byStage[stage].push({ ...m, _stage: stage });
  }

  // Sort each stage by date
  for (const stage of Object.keys(byStage)) {
    byStage[stage].sort((a, b) => {
      const da = new Date(a.Date ?? a.MatchDate).getTime();
      const db2 = new Date(b.Date ?? b.MatchDate).getTime();
      return da - db2;
    });
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  const stageOrder: MatchStage[] = [
    "round_of_32", "round_of_16", "quarter_final", "semi_final", "third_place", "final",
  ];

  for (const stage of stageOrder) {
    const matches = byStage[stage] ?? [];
    if (matches.length === 0) continue;

    const startNum = STAGE_START[stage];
    console.log(`\n${stage} (${matches.length} matches, starting at M${startNum}):`);

    for (let i = 0; i < matches.length; i++) {
      const fm = matches[i];
      const matchNumber: number = fm.MatchNumber ?? (startNum + i);
      const fifaId: string = fm.IdMatch;

      const homeAbbr: string | undefined =
        fm.Home?.Abbreviation ?? fm.HomeTeam?.Abbreviation;
      const awayAbbr: string | undefined =
        fm.Away?.Abbreviation ?? fm.AwayTeam?.Abbreviation;

      if (!homeAbbr || !awayAbbr) {
        console.log(`  M${matchNumber} — TBD vs TBD (teams not decided yet, skipping)`);
        skipped++;
        continue;
      }

      const homeId = codeToId[homeAbbr];
      const awayId = codeToId[awayAbbr];

      if (!homeId) {
        console.log(`  M${matchNumber} — ✗ Unknown home team code: ${homeAbbr}`);
        skipped++;
        continue;
      }
      if (!awayId) {
        console.log(`  M${matchNumber} — ✗ Unknown away team code: ${awayAbbr}`);
        skipped++;
        continue;
      }

      const matchDate: string = fm.Date ?? fm.MatchDate;
      const payload = {
        match_number: matchNumber,
        home_team_id: homeId,
        away_team_id: awayId,
        match_date: matchDate,
        stage: stage as MatchStage,
        group_name: null,
        status: "scheduled" as const,
        fifa_match_id: fifaId,
      };

      const existing = existingByNumber.get(matchNumber);
      if (existing) {
        const { error } = await supabase
          .from("matches")
          .update(payload as any)
          .eq("match_number", matchNumber);
        if (error) {
          console.error(`  M${matchNumber} — update error: ${error.message}`);
        } else {
          console.log(`  M${matchNumber} ↻ ${homeAbbr} vs ${awayAbbr} → updated (fifa: ${fifaId})`);
          updated++;
        }
      } else {
        const { error } = await supabase
          .from("matches")
          .insert(payload as any);
        if (error) {
          console.error(`  M${matchNumber} — insert error: ${error.message}`);
        } else {
          console.log(`  M${matchNumber} ✓ ${homeAbbr} vs ${awayAbbr} → inserted (fifa: ${fifaId})`);
          inserted++;
        }
      }
    }
  }

  console.log(`\nDone: ${inserted} inserted, ${updated} updated, ${skipped} skipped (TBD or unknown code)`);
  if (skipped > 0) {
    console.log("Tip: run again later when the remaining teams are decided.");
  }
}

main().catch(console.error);
