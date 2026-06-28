/**
 * Genera ko-prediction-data.json con los partidos reales del KO
 * (R32 → Final) para que los usuarios IA puedan hacer sus predicciones.
 *
 * Usage: npx tsx scripts/generate-ko-prediction-data.ts
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

// R32 bracket slot definitions (bracket.ts order)
const R32_BRACKET = [
  { slot: 0,  matchId: "M74", home: "E1",  away: "3rd(A/B/C/D/F)" },
  { slot: 1,  matchId: "M77", home: "I1",  away: "3rd(C/D/F/G/H)" },
  { slot: 2,  matchId: "M73", home: "A2",  away: "B2" },
  { slot: 3,  matchId: "M75", home: "F1",  away: "C2" },
  { slot: 4,  matchId: "M83", home: "K2",  away: "L2" },
  { slot: 5,  matchId: "M84", home: "H1",  away: "J2" },
  { slot: 6,  matchId: "M81", home: "D1",  away: "3rd(B/E/F/I/J)" },
  { slot: 7,  matchId: "M82", home: "G1",  away: "3rd(A/E/H/I/J)" },
  { slot: 8,  matchId: "M76", home: "C1",  away: "F2" },
  { slot: 9,  matchId: "M78", home: "E2",  away: "I2" },
  { slot: 10, matchId: "M79", home: "A1",  away: "3rd(C/E/F/H/I)" },
  { slot: 11, matchId: "M80", home: "L1",  away: "3rd(E/H/I/J/K)" },
  { slot: 12, matchId: "M86", home: "J1",  away: "H2" },
  { slot: 13, matchId: "M88", home: "D2",  away: "G2" },
  { slot: 14, matchId: "M85", home: "B1",  away: "3rd(E/F/G/I/J)" },
  { slot: 15, matchId: "M87", home: "K1",  away: "3rd(D/E/I/J/L)" },
];

// R16: winner of R32 slot pairs
const R16_BRACKET = [
  { slot: 0, matchId: "M89",  r32_home: 0, r32_away: 1,  date: "07/04 · 17:00" },
  { slot: 1, matchId: "M90",  r32_home: 2, r32_away: 3,  date: "07/04 · 13:00" },
  { slot: 2, matchId: "M93",  r32_home: 4, r32_away: 5,  date: "07/06 · 15:00" },
  { slot: 3, matchId: "M94",  r32_home: 6, r32_away: 7,  date: "07/06 · 20:00" },
  { slot: 4, matchId: "M91",  r32_home: 8, r32_away: 9,  date: "07/05 · 16:00" },
  { slot: 5, matchId: "M92",  r32_home: 10, r32_away: 11, date: "07/05 · 20:00" },
  { slot: 6, matchId: "M95",  r32_home: 12, r32_away: 13, date: "07/07 · 12:00" },
  { slot: 7, matchId: "M96",  r32_home: 14, r32_away: 15, date: "07/07 · 16:00" },
];

const QF_BRACKET = [
  { slot: 0, matchId: "M97",  r16_home: 0, r16_away: 1, date: "07/09 · 16:00" },
  { slot: 1, matchId: "M98",  r16_home: 2, r16_away: 3, date: "07/10 · 15:00" },
  { slot: 2, matchId: "M99",  r16_home: 4, r16_away: 5, date: "07/11 · 17:00" },
  { slot: 3, matchId: "M100", r16_home: 6, r16_away: 7, date: "07/11 · 21:00" },
];

const SF_BRACKET = [
  { slot: 0, matchId: "M101", qf_home: 0, qf_away: 1, date: "07/14 · 15:00" },
  { slot: 1, matchId: "M102", qf_home: 2, qf_away: 3, date: "07/15 · 15:00" },
];

async function main() {
  console.log("Fetching KO matches from Supabase...");

  type RawMatch = {
    id: string;
    match_number: number;
    match_date: string;
    stage: string;
    status: string;
    home_team: { id: string; name: string; fifa_code: string } | null;
    away_team: { id: string; name: string; fifa_code: string } | null;
  };

  const { data: rawMatches, error } = await supabase
    .from("matches")
    .select(`
      id, match_number, match_date, stage, status,
      home_team:home_team_id(id, name, fifa_code),
      away_team:away_team_id(id, name, fifa_code)
    `)
    .in("stage", ["round_of_32", "round_of_16", "quarter_final", "semi_final", "third_place", "final"])
    .order("match_number", { ascending: true });

  if (error) throw error;
  const matches = rawMatches as unknown as RawMatch[];
  console.log(`  Found ${matches.length} KO matches`);

  // Build lookup by match_number
  const byNumber = new Map<number, RawMatch>();
  for (const m of matches) byNumber.set(m.match_number, m);

  // Map matchId label ("M73") → match_number
  const labelToNumber: Record<string, number> = {
    M73: 73, M74: 74, M75: 75, M76: 76, M77: 77, M78: 78, M79: 79, M80: 80,
    M81: 81, M82: 82, M83: 83, M84: 84, M85: 85, M86: 86, M87: 87, M88: 88,
    M89: 89, M90: 90, M91: 91, M92: 92, M93: 93, M94: 94, M95: 95, M96: 96,
    M97: 97, M98: 98, M99: 99, M100: 100, M101: 101, M102: 102, M103: 103, M104: 104,
  };

  function getMatch(label: string) {
    const num = labelToNumber[label];
    return byNumber.get(num) ?? null;
  }

  // Fetch players for KO teams (helps AI pick scorers)
  const koTeamIds = new Set<string>();
  for (const m of matches) {
    if (m.home_team?.id) koTeamIds.add(m.home_team.id);
    if (m.away_team?.id) koTeamIds.add(m.away_team.id);
  }

  const { data: players } = await supabase
    .from("players")
    .select("id, name, position, jersey_number, team_id")
    .in("team_id", [...koTeamIds])
    .order("jersey_number", { ascending: true });

  // Build players by team fifa_code
  const teamIdToCode = new Map<string, string>();
  for (const m of matches) {
    if (m.home_team) teamIdToCode.set(m.home_team.id, m.home_team.fifa_code);
    if (m.away_team) teamIdToCode.set(m.away_team.id, m.away_team.fifa_code);
  }

  const playersByTeam: Record<string, { jersey: number; name: string; position: string }[]> = {};
  for (const p of players ?? []) {
    const code = teamIdToCode.get(p.team_id);
    if (!code) continue;
    if (!playersByTeam[code]) playersByTeam[code] = [];
    playersByTeam[code].push({ jersey: p.jersey_number, name: p.name, position: p.position });
  }

  // Build R32 match entries
  const r32Matches = R32_BRACKET.map((def) => {
    const m = getMatch(def.matchId);
    return {
      bracket_slot: def.slot,
      match_id: m?.id ?? null,
      match_number: labelToNumber[def.matchId],
      match_label: def.matchId,
      bracket_position: `${def.home} vs ${def.away}`,
      stage: "round_of_32",
      match_date: m?.match_date ?? null,
      status: m?.status ?? "scheduled",
      home: m?.home_team?.fifa_code ?? null,
      home_name: m?.home_team?.name ?? null,
      away: m?.away_team?.fifa_code ?? null,
      away_name: m?.away_team?.name ?? null,
      // AI fills these:
      home_goals: null,
      away_goals: null,
      has_penalty: false,
      first_team_to_score: null,
      first_goal_scorer: null,
    };
  });

  // Build R16 entries (teams TBD — flows from R32 winners)
  const r16Matches = R16_BRACKET.map((def) => {
    const m = getMatch(def.matchId);
    const homeSlot = r32Matches[def.r32_home];
    const awaySlot = r32Matches[def.r32_away];
    return {
      bracket_slot: def.slot,
      match_id: m?.id ?? null,
      match_number: labelToNumber[def.matchId],
      match_label: def.matchId,
      bracket_position: `W(${homeSlot.match_label}) vs W(${awaySlot.match_label})`,
      stage: "round_of_16",
      match_date: def.date,
      // AI fills bracket_winner (fifa_code of who advances)
      bracket_winner: null,
    };
  });

  const qfMatches = QF_BRACKET.map((def) => {
    const homeSlot = r16Matches[def.r16_home];
    const awaySlot = r16Matches[def.r16_away];
    return {
      bracket_slot: def.slot,
      match_label: def.matchId,
      bracket_position: `W(${r16Matches[def.r16_home].match_label}) vs W(${r16Matches[def.r16_away].match_label})`,
      stage: "quarter_final",
      match_date: def.date,
      bracket_winner: null,
    };
  });

  const sfMatches = SF_BRACKET.map((def) => {
    return {
      bracket_slot: def.slot,
      match_label: def.matchId,
      bracket_position: `W(${qfMatches[def.qf_home].match_label}) vs W(${qfMatches[def.qf_away].match_label})`,
      stage: "semi_final",
      match_date: def.date,
      bracket_winner: null,
    };
  });

  const output = {
    _instructions: [
      "This JSON describes the FIFA WC 2026 knockout stage.",
      "Fill in predictions for ALL r32_matches (scores, first_team_to_score, first_goal_scorer, has_penalty).",
      "For bracket progression: fill bracket_winner with the advancing team's fifa_code at each round.",
      "r16_matches.bracket_winner → who wins each R16 match.",
      "qf_matches.bracket_winner  → who wins each QF match.",
      "sf_matches.bracket_winner  → who wins each SF match (= finalist).",
      "Also fill third_place_team (loser of SF that wins 3rd place match) and champion.",
      "Use fifa_code values for all team references (e.g. 'ARG', 'ESP', 'BRA').",
      "has_penalty: true only if the match goes to penalty shootout.",
      "first_goal_scorer: full player name as it appears in players_by_team.",
    ],

    r32_matches: r32Matches,

    r16_matches: r16Matches,

    qf_matches: qfMatches,

    sf_matches: sfMatches,

    final: {
      match_label: "M104",
      match_date: "07/19 · 15:00",
      bracket_position: "W(M101) vs W(M102)",
      champion: null,           // AI fills: fifa_code of champion
    },

    third_place: {
      match_label: "M103",
      match_date: "07/19 · 12:00",
      bracket_position: "L(M101) vs L(M102)",
      third_place_winner: null, // AI fills: fifa_code of 3rd-place winner
    },

    players_by_team: playersByTeam,
  };

  const outPath = path.join(__dirname, "ko-prediction-data.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`\n✅ Saved to ${outPath}`);

  const r32WithTeams = r32Matches.filter((m) => m.home && m.away).length;
  const r32TBD = r32Matches.filter((m) => !m.home || !m.away).length;
  console.log(`   R32 matches with teams: ${r32WithTeams}`);
  if (r32TBD > 0) console.log(`   R32 TBD (no teams yet): ${r32TBD}`);
  console.log(`   Players mapped: ${Object.keys(playersByTeam).length} teams`);
}

main().catch((e) => { console.error(e); process.exit(1); });
