/**
 * One-time script: maps our matches to FIFA API match IDs (fifa_match_id).
 * Usage: npm run map-fifa
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *
 * No API key needed — api.fifa.com is public.
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

const FIFA_BASE = "https://api.fifa.com/api/v3";

async function fifaFetch(path: string) {
  const res = await fetch(`${FIFA_BASE}${path}`, { cache: "no-store" } as RequestInit);
  if (!res.ok) throw new Error(`fifa ${res.status}: ${await res.text()}`);
  return res.json();
}

async function main() {
  console.log("Fetching WC2026 matches from api.fifa.com...");
  const data = await fifaFetch(
    "/calendar/matches?idCompetition=17&idSeason=285023&count=200&language=en"
  );

  const fifaMatches: any[] = data.Results ?? data.results ?? [];
  console.log(`  Got ${fifaMatches.length} matches from FIFA API`);

  console.log("Fetching our teams from Supabase...");
  const { data: teams } = await supabase.from("teams").select("id, fifa_code");
  if (!teams) throw new Error("No teams found");

  const fifaCodeToTeamId: Record<string, string> = {};
  for (const t of teams) fifaCodeToTeamId[t.fifa_code] = t.id;

  console.log("Fetching our matches from Supabase...");
  const { data: matches } = await supabase
    .from("matches")
    .select("id, home_team_id, away_team_id, match_number, match_date");
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
      matchByTeams[`${a}-${h}`] = m;
    }
  }

  let mapped = 0;
  let unmapped = 0;
  let already = 0;

  for (const fm of fifaMatches) {
    const homeAbbr: string | undefined =
      fm.HomeTeam?.Abbreviation ?? fm.Home?.Abbreviation;
    const awayAbbr: string | undefined =
      fm.AwayTeam?.Abbreviation ?? fm.Away?.Abbreviation;
    const fifaId: string | undefined = fm.IdMatch;

    if (!homeAbbr || !awayAbbr || !fifaId) {
      // Knockout match with TBD teams — skip for now
      unmapped++;
      continue;
    }

    const key = `${homeAbbr}-${awayAbbr}`;
    const reverseKey = `${awayAbbr}-${homeAbbr}`;
    const ourMatch = matchByTeams[key] ?? matchByTeams[reverseKey];

    if (!ourMatch) {
      console.log(`  ✗ ${homeAbbr} vs ${awayAbbr} — no match in DB (fifa id: ${fifaId})`);
      unmapped++;
      continue;
    }

    const { error } = await supabase
      .from("matches")
      .update({ fifa_match_id: fifaId } as any)
      .eq("id", ourMatch.id);

    if (error) {
      console.error(`  Error updating M${ourMatch.match_number}:`, error.message);
      unmapped++;
    } else {
      console.log(`  ✓ M${ourMatch.match_number} ${homeAbbr} vs ${awayAbbr} → ${fifaId}`);
      mapped++;
    }
  }

  console.log(`\nDone: ${mapped} mapped, ${unmapped} unmapped (TBD knockout or not found)`);
  if (unmapped > 0) {
    console.log("Tip: run again after group stage to map knockout matches.");
  }
}

main().catch(console.error);
