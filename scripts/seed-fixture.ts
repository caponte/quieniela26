/**
 * Seed script: imports WC 2026 teams and fixture into Supabase.
 * Usage:
 *   npx tsx scripts/seed-fixture.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and
 * optionally FOOTBALL_DATA_API_KEY (free at football-data.org) in .env.local
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // needs service role to bypass RLS
);

const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY;

// --- Static fallback teams (FIFA WC 2026 qualified, as of draw Dec 2024) ---
// Update if the actual draw differs.
const TEAMS = [
  // Group A
  { name: "México", group_name: "A", fifa_code: "MEX", flag_url: "https://flagcdn.com/mx.svg" },
  { name: "Ecuador", group_name: "A", fifa_code: "ECU", flag_url: "https://flagcdn.com/ec.svg" },
  { name: "Bolivia", group_name: "A", fifa_code: "BOL", flag_url: "https://flagcdn.com/bo.svg" },
  { name: "Sudáfrica", group_name: "A", fifa_code: "RSA", flag_url: "https://flagcdn.com/za.svg" },
  // Group B
  { name: "Estados Unidos", group_name: "B", fifa_code: "USA", flag_url: "https://flagcdn.com/us.svg" },
  { name: "Brasil", group_name: "B", fifa_code: "BRA", flag_url: "https://flagcdn.com/br.svg" },
  { name: "Panamá", group_name: "B", fifa_code: "PAN", flag_url: "https://flagcdn.com/pa.svg" },
  { name: "Noruega", group_name: "B", fifa_code: "NOR", flag_url: "https://flagcdn.com/no.svg" },
  // Group C
  { name: "Canadá", group_name: "C", fifa_code: "CAN", flag_url: "https://flagcdn.com/ca.svg" },
  { name: "Colombia", group_name: "C", fifa_code: "COL", flag_url: "https://flagcdn.com/co.svg" },
  { name: "Serbia", group_name: "C", fifa_code: "SRB", flag_url: "https://flagcdn.com/rs.svg" },
  { name: "Nueva Zelanda", group_name: "C", fifa_code: "NZL", flag_url: "https://flagcdn.com/nz.svg" },
  // Group D
  { name: "Argentina", group_name: "D", fifa_code: "ARG", flag_url: "https://flagcdn.com/ar.svg" },
  { name: "Venezuela", group_name: "D", fifa_code: "VEN", flag_url: "https://flagcdn.com/ve.svg" },
  { name: "Dinamarca", group_name: "D", fifa_code: "DEN", flag_url: "https://flagcdn.com/dk.svg" },
  { name: "Arabia Saudita", group_name: "D", fifa_code: "KSA", flag_url: "https://flagcdn.com/sa.svg" },
  // Group E
  { name: "Francia", group_name: "E", fifa_code: "FRA", flag_url: "https://flagcdn.com/fr.svg" },
  { name: "Uruguay", group_name: "E", fifa_code: "URU", flag_url: "https://flagcdn.com/uy.svg" },
  { name: "Mali", group_name: "E", fifa_code: "MLI", flag_url: "https://flagcdn.com/ml.svg" },
  { name: "Uzbekistán", group_name: "E", fifa_code: "UZB", flag_url: "https://flagcdn.com/uz.svg" },
  // Group F
  { name: "España", group_name: "F", fifa_code: "ESP", flag_url: "https://flagcdn.com/es.svg" },
  { name: "Chile", group_name: "F", fifa_code: "CHI", flag_url: "https://flagcdn.com/cl.svg" },
  { name: "Angola", group_name: "F", fifa_code: "ANG", flag_url: "https://flagcdn.com/ao.svg" },
  { name: "Corea del Sur", group_name: "F", fifa_code: "KOR", flag_url: "https://flagcdn.com/kr.svg" },
  // Group G
  { name: "Alemania", group_name: "G", fifa_code: "GER", flag_url: "https://flagcdn.com/de.svg" },
  { name: "Japón", group_name: "G", fifa_code: "JPN", flag_url: "https://flagcdn.com/jp.svg" },
  { name: "Escocia", group_name: "G", fifa_code: "SCO", flag_url: "https://flagcdn.com/gb-sct.svg" },
  { name: "Trinidad y Tobago", group_name: "G", fifa_code: "TRI", flag_url: "https://flagcdn.com/tt.svg" },
  // Group H
  { name: "Portugal", group_name: "H", fifa_code: "POR", flag_url: "https://flagcdn.com/pt.svg" },
  { name: "Perú", group_name: "H", fifa_code: "PER", flag_url: "https://flagcdn.com/pe.svg" },
  { name: "Eslovaquia", group_name: "H", fifa_code: "SVK", flag_url: "https://flagcdn.com/sk.svg" },
  { name: "Kenia", group_name: "H", fifa_code: "KEN", flag_url: "https://flagcdn.com/ke.svg" },
  // Group I
  { name: "Inglaterra", group_name: "I", fifa_code: "ENG", flag_url: "https://flagcdn.com/gb-eng.svg" },
  { name: "Paraguay", group_name: "I", fifa_code: "PAR", flag_url: "https://flagcdn.com/py.svg" },
  { name: "Senegal", group_name: "I", fifa_code: "SEN", flag_url: "https://flagcdn.com/sn.svg" },
  { name: "Bielorrusia", group_name: "I", fifa_code: "BLR", flag_url: "https://flagcdn.com/by.svg" },
  // Group J
  { name: "Países Bajos", group_name: "J", fifa_code: "NED", flag_url: "https://flagcdn.com/nl.svg" },
  { name: "Guatemala", group_name: "J", fifa_code: "GUA", flag_url: "https://flagcdn.com/gt.svg" },
  { name: "Bélgica", group_name: "J", fifa_code: "BEL", flag_url: "https://flagcdn.com/be.svg" },
  { name: "Bahréin", group_name: "J", fifa_code: "BHR", flag_url: "https://flagcdn.com/bh.svg" },
  // Group K
  { name: "Italia", group_name: "K", fifa_code: "ITA", flag_url: "https://flagcdn.com/it.svg" },
  { name: "Australia", group_name: "K", fifa_code: "AUS", flag_url: "https://flagcdn.com/au.svg" },
  { name: "Irak", group_name: "K", fifa_code: "IRQ", flag_url: "https://flagcdn.com/iq.svg" },
  { name: "Albania", group_name: "K", fifa_code: "ALB", flag_url: "https://flagcdn.com/al.svg" },
  // Group L
  { name: "Marruecos", group_name: "L", fifa_code: "MAR", flag_url: "https://flagcdn.com/ma.svg" },
  { name: "Suiza", group_name: "L", fifa_code: "SUI", flag_url: "https://flagcdn.com/ch.svg" },
  { name: "Croacia", group_name: "L", fifa_code: "CRO", flag_url: "https://flagcdn.com/hr.svg" },
  { name: "China", group_name: "L", fifa_code: "CHN", flag_url: "https://flagcdn.com/cn.svg" },
];

// Generate group stage fixtures: each group plays round-robin (6 matches per group)
// Dates are approximate. First match: June 11, 2026 at 15:00 UTC
function generateGroupFixtures(
  teamsByGroup: Record<string, typeof TEAMS>,
  teamIdMap: Record<string, string>
) {
  const fixtures = [];
  let matchNumber = 1;

  // Base date: June 11, 2026
  const baseDate = new Date("2026-06-11T15:00:00Z");
  const groups = Object.keys(teamsByGroup).sort();

  for (let gIdx = 0; gIdx < groups.length; gIdx++) {
    const group = groups[gIdx];
    const [t1, t2, t3, t4] = teamsByGroup[group];
    const groupPairings = [
      [t1, t2], [t3, t4],
      [t1, t3], [t2, t4],
      [t1, t4], [t2, t3],
    ];

    for (let pIdx = 0; pIdx < groupPairings.length; pIdx++) {
      const [home, away] = groupPairings[pIdx];
      // Spread matches across ~21 days (June 11 - July 1)
      // Each round happens on 4 consecutive days
      const round = Math.floor(pIdx / 2);
      const daysOffset = round * 7 + gIdx * 0.5;
      const matchDate = new Date(baseDate.getTime() + daysOffset * 24 * 60 * 60 * 1000);

      fixtures.push({
        home_team_id: teamIdMap[home.fifa_code],
        away_team_id: teamIdMap[away.fifa_code],
        match_date: matchDate.toISOString(),
        stage: "group" as const,
        group_name: group,
        status: "scheduled" as const,
        match_number: matchNumber++,
      });
    }
  }

  return fixtures;
}

async function fetchFromFootballDataOrg(teamIdMap: Record<string, string>) {
  if (!FOOTBALL_DATA_API_KEY) return null;

  console.log("Fetching fixture from football-data.org...");
  try {
    const res = await fetch(
      "https://api.football-data.org/v4/competitions/WC/matches",
      { headers: { "X-Auth-Token": FOOTBALL_DATA_API_KEY } }
    );
    if (!res.ok) {
      console.warn(`football-data.org responded ${res.status}, using static seed.`);
      return null;
    }
    const data = await res.json();
    const fixtures = [];
    let matchNumber = 1;

    for (const m of data.matches ?? []) {
      const homeCode = m.homeTeam?.tla?.toUpperCase();
      const awayCode = m.awayTeam?.tla?.toUpperCase();
      const homeId = teamIdMap[homeCode];
      const awayId = teamIdMap[awayCode];
      if (!homeId || !awayId) continue;

      const stageMap: Record<string, string> = {
        "GROUP_STAGE": "group",
        "ROUND_OF_32": "round_of_32",
        "LAST_16": "round_of_16",
        "QUARTER_FINALS": "quarter_final",
        "SEMI_FINALS": "semi_final",
        "THIRD_PLACE": "third_place",
        "FINAL": "final",
      };

      fixtures.push({
        home_team_id: homeId,
        away_team_id: awayId,
        match_date: m.utcDate,
        stage: stageMap[m.stage] ?? "group",
        group_name: m.group?.replace("GROUP_", "") ?? null,
        status: "scheduled" as const,
        match_number: matchNumber++,
      });
    }
    return fixtures.length > 0 ? fixtures : null;
  } catch (e) {
    console.warn("Failed to fetch from football-data.org:", e);
    return null;
  }
}

async function main() {
  console.log("Seeding teams...");
  const { data: insertedTeams, error: teamsError } = await supabase
    .from("teams")
    .upsert(TEAMS, { onConflict: "fifa_code" })
    .select("id, fifa_code");

  if (teamsError) {
    console.error("Error inserting teams:", teamsError);
    process.exit(1);
  }

  const teamIdMap: Record<string, string> = {};
  for (const t of insertedTeams ?? []) teamIdMap[t.fifa_code] = t.id;
  console.log(`Seeded ${insertedTeams?.length} teams.`);

  console.log("Seeding fixture...");
  let fixtures = await fetchFromFootballDataOrg(teamIdMap);

  if (!fixtures) {
    console.log("Using static group-stage fixture...");
    const teamsByGroup: Record<string, typeof TEAMS> = {};
    for (const t of TEAMS) {
      if (!teamsByGroup[t.group_name]) teamsByGroup[t.group_name] = [];
      teamsByGroup[t.group_name].push(t);
    }
    fixtures = generateGroupFixtures(teamsByGroup, teamIdMap);
  }

  const { error: matchesError } = await supabase.from("matches").upsert(
    fixtures,
    { onConflict: "match_number" }
  );

  if (matchesError) {
    console.error("Error inserting matches:", matchesError);
    process.exit(1);
  }

  console.log(`Seeded ${fixtures.length} matches.`);
  console.log("Done!");
}

main();
