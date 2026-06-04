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
import ws from "ws";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { realtime: { transport: ws } }
);

const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY;

// --- Equipos del Mundial 2026 — sorteo oficial ---
const TEAMS = [
  // Grupo A
  { name: "México",       group_name: "A", fifa_code: "MEX", flag_url: "https://flagcdn.com/mx.svg" },
  { name: "Sudáfrica",    group_name: "A", fifa_code: "RSA", flag_url: "https://flagcdn.com/za.svg" },
  { name: "Corea",         group_name: "A", fifa_code: "KOR", flag_url: "https://flagcdn.com/kr.svg" },
  { name: "Chequia",       group_name: "A", fifa_code: "CZE", flag_url: "https://flagcdn.com/cz.svg" },
  // Grupo B
  { name: "Canadá",       group_name: "B", fifa_code: "CAN", flag_url: "https://flagcdn.com/ca.svg" },
  { name: "Bosnia",        group_name: "B", fifa_code: "BIH", flag_url: "https://flagcdn.com/ba.svg" },
  { name: "Qatar",        group_name: "B", fifa_code: "QAT", flag_url: "https://flagcdn.com/qa.svg" },
  { name: "Suiza",        group_name: "B", fifa_code: "SUI", flag_url: "https://flagcdn.com/ch.svg" },
  // Grupo C
  { name: "Brasil",       group_name: "C", fifa_code: "BRA", flag_url: "https://flagcdn.com/br.svg" },
  { name: "Marruecos",    group_name: "C", fifa_code: "MAR", flag_url: "https://flagcdn.com/ma.svg" },
  { name: "Haití",        group_name: "C", fifa_code: "HAI", flag_url: "https://flagcdn.com/ht.svg" },
  { name: "Escocia",      group_name: "C", fifa_code: "SCO", flag_url: "https://flagcdn.com/gb-sct.svg" },
  // Grupo D
  { name: "Estados Unidos",group_name: "D", fifa_code: "USA", flag_url: "https://flagcdn.com/us.svg" },
  { name: "Paraguay",     group_name: "D", fifa_code: "PAR", flag_url: "https://flagcdn.com/py.svg" },
  { name: "Australia",    group_name: "D", fifa_code: "AUS", flag_url: "https://flagcdn.com/au.svg" },
  { name: "Turquía",       group_name: "D", fifa_code: "TUR", flag_url: "https://flagcdn.com/tr.svg" },
  // Grupo E
  { name: "Alemania",     group_name: "E", fifa_code: "GER", flag_url: "https://flagcdn.com/de.svg" },
  { name: "Curazao",      group_name: "E", fifa_code: "CUW", flag_url: "https://flagcdn.com/cw.svg" },
  { name: "Costa de Marfil", group_name: "E", fifa_code: "CIV", flag_url: "https://flagcdn.com/ci.svg" },
  { name: "Ecuador",      group_name: "E", fifa_code: "ECU", flag_url: "https://flagcdn.com/ec.svg" },
  // Grupo F
  { name: "Países Bajos", group_name: "F", fifa_code: "NED", flag_url: "https://flagcdn.com/nl.svg" },
  { name: "Japón",        group_name: "F", fifa_code: "JPN", flag_url: "https://flagcdn.com/jp.svg" },
  { name: "Suecia",        group_name: "F", fifa_code: "SWE", flag_url: "https://flagcdn.com/se.svg" },
  { name: "Túnez",        group_name: "F", fifa_code: "TUN", flag_url: "https://flagcdn.com/tn.svg" },
  // Grupo G
  { name: "Bélgica",      group_name: "G", fifa_code: "BEL", flag_url: "https://flagcdn.com/be.svg" },
  { name: "Egipto",       group_name: "G", fifa_code: "EGY", flag_url: "https://flagcdn.com/eg.svg" },
  { name: "Irán",         group_name: "G", fifa_code: "IRN", flag_url: "https://flagcdn.com/ir.svg" },
  { name: "Nueva Zelanda",group_name: "G", fifa_code: "NZL", flag_url: "https://flagcdn.com/nz.svg" },
  // Grupo H
  { name: "España",       group_name: "H", fifa_code: "ESP", flag_url: "https://flagcdn.com/es.svg" },
  { name: "Cabo Verde",   group_name: "H", fifa_code: "CPV", flag_url: "https://flagcdn.com/cv.svg" },
  { name: "Arabia Saudí", group_name: "H", fifa_code: "KSA", flag_url: "https://flagcdn.com/sa.svg" },
  { name: "Uruguay",      group_name: "H", fifa_code: "URU", flag_url: "https://flagcdn.com/uy.svg" },
  // Grupo I
  { name: "Francia",      group_name: "I", fifa_code: "FRA", flag_url: "https://flagcdn.com/fr.svg" },
  { name: "Senegal",      group_name: "I", fifa_code: "SEN", flag_url: "https://flagcdn.com/sn.svg" },
  { name: "Irak",          group_name: "I", fifa_code: "IRQ", flag_url: "https://flagcdn.com/iq.svg" },
  { name: "Noruega",      group_name: "I", fifa_code: "NOR", flag_url: "https://flagcdn.com/no.svg" },
  // Grupo J
  { name: "Argentina",    group_name: "J", fifa_code: "ARG", flag_url: "https://flagcdn.com/ar.svg" },
  { name: "Argelia",       group_name: "J", fifa_code: "ALG", flag_url: "https://flagcdn.com/dz.svg" },
  { name: "Austria",      group_name: "J", fifa_code: "AUT", flag_url: "https://flagcdn.com/at.svg" },
  { name: "Jordania",     group_name: "J", fifa_code: "JOR", flag_url: "https://flagcdn.com/jo.svg" },
  // Grupo K
  { name: "Portugal",     group_name: "K", fifa_code: "POR", flag_url: "https://flagcdn.com/pt.svg" },
  { name: "RD Congo",      group_name: "K", fifa_code: "COD", flag_url: "https://flagcdn.com/cd.svg" },
  { name: "Uzbekistán",   group_name: "K", fifa_code: "UZB", flag_url: "https://flagcdn.com/uz.svg" },
  { name: "Colombia",     group_name: "K", fifa_code: "COL", flag_url: "https://flagcdn.com/co.svg" },
  // Grupo L
  { name: "Inglaterra",   group_name: "L", fifa_code: "ENG", flag_url: "https://flagcdn.com/gb-eng.svg" },
  { name: "Croacia",      group_name: "L", fifa_code: "CRO", flag_url: "https://flagcdn.com/hr.svg" },
  { name: "Ghana",        group_name: "L", fifa_code: "GHA", flag_url: "https://flagcdn.com/gh.svg" },
  { name: "Panamá",       group_name: "L", fifa_code: "PAN", flag_url: "https://flagcdn.com/pa.svg" },
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

  // Delete all existing matches before re-seeding (cascades to match_events and match_predictions)
  await supabase.from("matches").delete().gte("created_at", "2000-01-01T00:00:00Z");

  // Remove orphaned teams from old seeds that are no longer in the current TEAMS list
  const validCodes = new Set(TEAMS.map(t => t.fifa_code));
  const { data: allTeams } = await supabase.from("teams").select("id, fifa_code");
  const orphanIds = (allTeams ?? [])
    .filter(t => !validCodes.has(t.fifa_code))
    .map(t => t.id);
  if (orphanIds.length > 0) {
    await supabase.from("teams").delete().in("id", orphanIds);
    console.log(`Removed ${orphanIds.length} orphaned teams.`);
  }

  const { error: matchesError } = await supabase.from("matches").insert(fixtures);

  if (matchesError) {
    console.error("Error inserting matches:", matchesError);
    process.exit(1);
  }

  console.log(`Seeded ${fixtures.length} matches.`);
  console.log("Done!");
}

main();
