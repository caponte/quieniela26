/**
 * One-time script: maps our matches to football-data.org match IDs.
 * Usage: npx tsx scripts/map-api-fixtures.ts
 *
 * Requires in .env.local:
 *   FOOTBALL_DATA_API_KEY=<key>
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
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

const FD_KEY = process.env.FOOTBALL_DATA_API_KEY!;
const FD_BASE = "https://api.football-data.org/v4";

// football-data.org TLA overrides where their code differs from our fifa_code
const TLA_OVERRIDE: Record<string, string> = {
  "URY": "URU", // Uruguay
};

function normalizeTla(tla: string): string {
  return TLA_OVERRIDE[tla] ?? tla;
}

async function fdFetch(endpoint: string) {
  const res = await fetch(`${FD_BASE}${endpoint}`, {
    headers: { "X-Auth-Token": FD_KEY },
  });
  if (!res.ok) throw new Error(`football-data.org ${res.status}: ${await res.text()}`);
  return res.json();
}

async function main() {
  if (!FD_KEY) {
    console.error("Missing FOOTBALL_DATA_API_KEY in .env.local");
    process.exit(1);
  }

  console.log("Fetching WC2026 fixtures from football-data.org...");
  const data = await fdFetch("/competitions/WC/matches?season=2026");
  console.log("  Response keys:", Object.keys(data));
  console.log("  resultSet:", JSON.stringify(data.resultSet));
  const apiMatches: any[] = data.matches ?? [];
  console.log(`  Got ${apiMatches.length} matches from API`);

  console.log("Fetching our teams from Supabase...");
  const { data: teams } = await supabase.from("teams").select("id, fifa_code");
  if (!teams) throw new Error("No teams found");

  const fifaToTeamId: Record<string, string> = {};
  for (const t of teams) fifaToTeamId[t.fifa_code] = t.id;

  console.log("Fetching our matches from Supabase...");
  const { data: matches } = await supabase
    .from("matches")
    .select("id, home_team_id, away_team_id, match_number");
  if (!matches) throw new Error("No matches found");

  // Build reverse lookup: team_id → fifa_code
  const teamIdToFifa: Record<string, string> = {};
  for (const t of teams) teamIdToFifa[t.id] = t.fifa_code;

  // Build lookup: "HOME_FIFA-AWAY_FIFA" → our match (both orderings)
  const matchByTeams: Record<string, typeof matches[number]> = {};
  for (const m of matches) {
    const h = teamIdToFifa[m.home_team_id];
    const a = teamIdToFifa[m.away_team_id];
    if (h && a) {
      matchByTeams[`${h}-${a}`] = m;
      matchByTeams[`${a}-${h}`] = m; // also index reversed so we can detect swaps
    }
  }

  let mapped = 0;
  let swapped = 0;
  let unmapped = 0;

  for (const apiMatch of apiMatches) {
    const rawHomeTla: string = apiMatch.homeTeam?.tla;
    const rawAwayTla: string = apiMatch.awayTeam?.tla;

    // Skip knockout stage matches where teams aren't determined yet
    if (!rawHomeTla || !rawAwayTla) {
      unmapped++;
      continue;
    }

    const homeFifa = normalizeTla(rawHomeTla);
    const awayFifa = normalizeTla(rawAwayTla);
    const key = `${homeFifa}-${awayFifa}`;
    const reverseKey = `${awayFifa}-${homeFifa}`;

    const ourMatch = matchByTeams[key] ?? matchByTeams[reverseKey];

    if (!ourMatch) {
      console.log(`  ✗ ${homeFifa} vs ${awayFifa} — no match in DB (api id: ${apiMatch.id})`);
      unmapped++;
      continue;
    }

    // Check if home/away are swapped relative to our DB
    const ourHomeFifa = teamIdToFifa[ourMatch.home_team_id];
    const isSwapped = ourHomeFifa !== homeFifa;

    if (isSwapped) {
      // Swap home/away in our DB to match the real fixture
      const { error: swapErr } = await supabase
        .from("matches")
        .update({
          home_team_id: ourMatch.away_team_id,
          away_team_id: ourMatch.home_team_id,
        } as any)
        .eq("id", ourMatch.id);

      if (swapErr) {
        console.error(`  Error swapping M${ourMatch.match_number}:`, swapErr.message);
        unmapped++;
        continue;
      }
      swapped++;
    }

    const { error } = await supabase
      .from("matches")
      .update({
        api_fixture_id: apiMatch.id,
        match_date: apiMatch.utcDate,
      } as any)
      .eq("id", ourMatch.id);

    if (error) {
      console.error(`  Error updating M${ourMatch.match_number}:`, error.message);
    } else {
      const tag = isSwapped ? " ↔ swapped" : "";
      console.log(`  ✓ M${ourMatch.match_number} ${homeFifa} vs ${awayFifa} → ${apiMatch.id} | ${apiMatch.utcDate}${tag}`);
      mapped++;
    }
  }

  console.log(`\nDone: ${mapped} mapped (${swapped} home/away corrected), ${unmapped} unmapped`);
  if (unmapped > 0) {
    console.log("Note: unmapped knockout matches will be resolved once teams are determined.");
  }
}

main().catch(console.error);
