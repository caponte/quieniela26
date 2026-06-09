/**
 * Generates prediction-data.json with all data needed for Claude to predict
 * the bracket and all group-stage matches.
 *
 * Usage: npx tsx scripts/generate-prediction-data.ts
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

// ── Bracket structure (from bracket.ts) ─────────────────────────────────────

const R32_SLOTS = [
  { slot: 0,  matchId: "M74", home: "E1",    away: "3rd(A/B/C/D/F)" },
  { slot: 1,  matchId: "M77", home: "I1",    away: "3rd(C/D/F/G/H)" },
  { slot: 2,  matchId: "M73", home: "A2",    away: "B2" },
  { slot: 3,  matchId: "M75", home: "F1",    away: "C2" },
  { slot: 4,  matchId: "M83", home: "K2",    away: "L2" },
  { slot: 5,  matchId: "M84", home: "H1",    away: "J2" },
  { slot: 6,  matchId: "M81", home: "D1",    away: "3rd(B/E/F/I/J)" },
  { slot: 7,  matchId: "M82", home: "G1",    away: "3rd(A/E/H/I/J)" },
  { slot: 8,  matchId: "M76", home: "C1",    away: "F2" },
  { slot: 9,  matchId: "M78", home: "E2",    away: "I2" },
  { slot: 10, matchId: "M79", home: "A1",    away: "3rd(C/E/F/H/I)" },
  { slot: 11, matchId: "M80", home: "L1",    away: "3rd(E/H/I/J/K)" },
  { slot: 12, matchId: "M86", home: "J1",    away: "H2" },
  { slot: 13, matchId: "M88", home: "D2",    away: "G2" },
  { slot: 14, matchId: "M85", home: "B1",    away: "3rd(E/F/G/I/J)" },
  { slot: 15, matchId: "M87", home: "K1",    away: "3rd(D/E/I/J/L)" },
];

const R16_SLOTS = [
  { slot: 0, matchId: "M89",  feeds: "R32 slots 0 vs 1"   },
  { slot: 1, matchId: "M90",  feeds: "R32 slots 2 vs 3"   },
  { slot: 2, matchId: "M93",  feeds: "R32 slots 4 vs 5"   },
  { slot: 3, matchId: "M94",  feeds: "R32 slots 6 vs 7"   },
  { slot: 4, matchId: "M91",  feeds: "R32 slots 8 vs 9"   },
  { slot: 5, matchId: "M92",  feeds: "R32 slots 10 vs 11" },
  { slot: 6, matchId: "M95",  feeds: "R32 slots 12 vs 13" },
  { slot: 7, matchId: "M96",  feeds: "R32 slots 14 vs 15" },
];

const QF_SLOTS = [
  { slot: 0, matchId: "M97",  feeds: "R16 slots 0 vs 1" },
  { slot: 1, matchId: "M98",  feeds: "R16 slots 2 vs 3" },
  { slot: 2, matchId: "M99",  feeds: "R16 slots 4 vs 5" },
  { slot: 3, matchId: "M100", feeds: "R16 slots 6 vs 7" },
];

const SF_SLOTS = [
  { slot: 0, matchId: "M101", feeds: "QF slots 0 vs 1" },
  { slot: 1, matchId: "M102", feeds: "QF slots 2 vs 3" },
];

const FINAL = { matchId: "M104", feeds: "SF winners" };
const THIRD_PLACE = { matchId: "M103", feeds: "SF losers" };

// ── Fetch data ───────────────────────────────────────────────────────────────

async function main() {
  console.log("Fetching teams...");
  const { data: teams, error: teamsErr } = await supabase
    .from("teams")
    .select("id, name, fifa_code, group_name")
    .order("group_name")
    .order("name");

  if (teamsErr) throw teamsErr;

  console.log("Fetching matches...");
  const { data: rawMatches, error: matchesErr } = await supabase
    .from("matches")
    .select(`
      id, match_number, match_date, stage, group_name, status,
      home_team:home_team_id(id, name, fifa_code),
      away_team:away_team_id(id, name, fifa_code)
    `)
    .order("match_date", { ascending: true })
    .order("match_number", { ascending: true });

  if (matchesErr) throw matchesErr;

  console.log("Fetching players...");
  const { data: players, error: playersErr } = await supabase
    .from("players")
    .select("id, name, position, jersey_number, team_id")
    .order("jersey_number", { ascending: true });

  if (playersErr) throw playersErr;

  // ── Build groups map ─────────────────────────────────────────────────────
  const groups: Record<string, { name: string; fifa_code: string }[]> = {};
  for (const team of teams ?? []) {
    const g = team.group_name as string;
    if (!groups[g]) groups[g] = [];
    groups[g].push({ name: team.name, fifa_code: team.fifa_code });
  }

  // ── Build players map by team fifa_code ──────────────────────────────────
  const teamById: Record<string, string> = {};
  for (const team of teams ?? []) teamById[team.id] = team.fifa_code;

  const playersByTeam: Record<string, { jersey: number; name: string; position: string }[]> = {};
  for (const p of players ?? []) {
    const code = teamById[p.team_id];
    if (!code) continue;
    if (!playersByTeam[code]) playersByTeam[code] = [];
    playersByTeam[code].push({ jersey: p.jersey_number, name: p.name, position: p.position });
  }

  // ── Build group-stage matches ─────────────────────────────────────────────
  type RawMatch = {
    id: string;
    match_number: number;
    match_date: string;
    stage: string;
    group_name: string | null;
    status: string;
    home_team: { id: string; name: string; fifa_code: string } | null;
    away_team: { id: string; name: string; fifa_code: string } | null;
  };

  const groupMatches = (rawMatches as unknown as RawMatch[])
    .filter((m) => m.stage === "group")
    .map((m) => ({
      match_id: m.id,
      match_number: m.match_number,
      match_date: m.match_date,
      group: m.group_name,
      home: m.home_team?.fifa_code,
      home_name: m.home_team?.name,
      away: m.away_team?.fifa_code,
      away_name: m.away_team?.name,
    }));

  // ── Output JSON ──────────────────────────────────────────────────────────
  const output = {
    _instructions: [
      "This JSON contains all data needed to predict the 2026 FIFA World Cup.",
      "Use fifa_code values when predicting teams.",
      "For bracket: predict groups first (1st/2nd per group + 8 qualifying 3rd-place teams),",
      "then predict winners for each round following the bracket structure.",
      "For jornada matches: predict score, first team to score, penalty (yes/no), and first goal scorer.",
    ],

    bracket_structure: {
      description: "FIFA WC 2026 bracket. 48 teams, 12 groups of 4. Top 2 from each group + 8 best 3rd-place teams = 32 teams in knockout stage.",
      r32: R32_SLOTS,
      r16: R16_SLOTS,
      quarter_finals: QF_SLOTS,
      semi_finals: SF_SLOTS,
      final: FINAL,
      third_place_match: THIRD_PLACE,
    },

    groups,

    group_matches: groupMatches,

    players_by_team: playersByTeam,
  };

  const outPath = path.join(__dirname, "prediction-data.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`\n✅ Saved to ${outPath}`);
  console.log(`   Teams: ${teams?.length}`);
  console.log(`   Group matches: ${groupMatches.length}`);
  console.log(`   Players: ${players?.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
