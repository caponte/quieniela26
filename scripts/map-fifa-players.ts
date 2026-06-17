/**
 * Maps our players to FIFA player IDs using name normalization.
 * Tries all matches per team until one with a non-empty Players[] roster is found.
 * Matching strategy (per team):
 *   1. Exact normalized full name
 *   2. Last word match (surname)
 *   3. First word match (first name) — last resort
 * Prints uncertain/unmatched cases for manual review.
 * Usage: npm run map-players
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

/** Lowercase, remove accents, apostrophes, hyphens, extra spaces */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** FIFA sends "Harry KANE" or "KANE" — normalize to sentence case then apply normalize() */
function normalizeFifaName(raw: string): string {
  const sentenceCase = raw.replace(/\b([A-ZÁÉÍÓÚÑÜÄÖ]{2,})\b/g, (m) =>
    m[0] + m.slice(1).toLowerCase()
  );
  return normalize(sentenceCase);
}

function lastName(n: string): string { return n.split(" ").at(-1)!; }
function firstName(n: string): string { return n.split(" ")[0]; }

const FIFA_POSITION: Record<number, string> = { 0: "GK", 1: "DEF", 2: "MID", 3: "FWD" };

/** Convert "Harry KANE" → "Harry Kane" */
function toProperCase(raw: string): string {
  return raw
    .split(" ")
    .map(w => w[0]?.toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

interface OurPlayer {
  id: string;
  team_id: string;
  name: string;
  fifa_player_id: string | null;
}

interface FifaPlayer {
  IdPlayer: string;
  ShirtNumber: number;
  PlayerName: { Locale: string; Description: string }[];
  ShortName: { Locale: string; Description: string }[];
}

async function main() {
  console.log("Fetching matches with fifa_match_id from DB...");
  const { data: matches } = await supabase
    .from("matches")
    .select("id, fifa_match_id, home_team_id, away_team_id")
    .not("fifa_match_id", "is", null) as unknown as {
      data: { id: string; fifa_match_id: string; home_team_id: string; away_team_id: string }[] | null
    };

  if (!matches?.length) {
    console.error("No mapped matches found. Run npm run map-fifa first.");
    process.exit(1);
  }

  // All match IDs per team (to try multiple if first has empty roster)
  const teamToMatches = new Map<string, string[]>();
  for (const m of matches) {
    if (!teamToMatches.has(m.home_team_id)) teamToMatches.set(m.home_team_id, []);
    if (!teamToMatches.has(m.away_team_id)) teamToMatches.set(m.away_team_id, []);
    teamToMatches.get(m.home_team_id)!.push(m.fifa_match_id);
    teamToMatches.get(m.away_team_id)!.push(m.fifa_match_id);
  }

  console.log("Fetching our players from DB...");
  const { data: ourPlayers } = await supabase
    .from("players")
    .select("id, team_id, name, fifa_player_id") as unknown as {
      data: OurPlayer[] | null
    };

  if (!ourPlayers?.length) { console.error("No players in DB."); process.exit(1); }

  const playersByTeam = new Map<string, OurPlayer[]>();
  for (const p of ourPlayers) {
    if (!playersByTeam.has(p.team_id)) playersByTeam.set(p.team_id, []);
    playersByTeam.get(p.team_id)!.push(p);
  }

  // Fetch FIFA rosters — try all matches per team until we find a non-empty Players[]
  const detailCache = new Map<string, any>(); // fifaMatchId → detail (null if fetch failed)
  const fifaPlayersByTeam = new Map<string, FifaPlayer[]>();

  const allTeams = [...teamToMatches.keys()];
  console.log(`Resolving rosters for ${allTeams.length} teams across ${matches.length} matches...\n`);

  for (const teamId of allTeams) {
    const matchIds = teamToMatches.get(teamId)!;

    for (const fifaMatchId of matchIds) {
      if (!detailCache.has(fifaMatchId)) {
        try {
          detailCache.set(fifaMatchId, await fifaFetch(`/live/football/${fifaMatchId}`));
        } catch (e) {
          detailCache.set(fifaMatchId, null);
          console.warn(`  ⚠ Could not fetch ${fifaMatchId}: ${e}`);
        }
      }

      const detail = detailCache.get(fifaMatchId);
      if (!detail) continue;

      const match = matches.find(m => m.fifa_match_id === fifaMatchId)!;
      const isHome = match.home_team_id === teamId;
      const players: FifaPlayer[] = isHome
        ? (detail.HomeTeam?.Players ?? [])
        : (detail.AwayTeam?.Players ?? []);

      if (players.length > 0) {
        fifaPlayersByTeam.set(teamId, players);
        break;
      }
    }

    if (!fifaPlayersByTeam.has(teamId)) {
      console.warn(`  ⚠ No roster found for team ${teamId} across ${matchIds.length} matches`);
    }
  }

  // Match players team by team
  let mapped = 0;
  let inserted = 0;
  let alreadyMapped = 0;
  const uncertain: { ourName: string; fifaName: string; confidence: string }[] = [];
  const unmapped: string[] = [];

  for (const [teamId, fifaPlayers] of fifaPlayersByTeam) {
    const ourTeamPlayers = playersByTeam.get(teamId) ?? [];

    const fifaNormalized = fifaPlayers.map(fp => {
      const fullRaw = fp.PlayerName?.[0]?.Description ?? "";
      const shortRaw = fp.ShortName?.[0]?.Description ?? "";
      return { fp, full: normalizeFifaName(fullRaw), short: normalizeFifaName(shortRaw), fullRaw };
    });

    const usedFifaIds = new Set<string>();

    for (const ourPlayer of ourTeamPlayers) {
      if (ourPlayer.fifa_player_id) { alreadyMapped++; continue; }

      const ourNorm = normalize(ourPlayer.name);
      const ourLast = lastName(ourNorm);
      const ourFirst = firstName(ourNorm);

      let match: typeof fifaNormalized[number] | null = null;
      let confidence = "";

      // 1. Exact full or short name
      match = fifaNormalized.find(f =>
        !usedFifaIds.has(f.fp.IdPlayer) && (f.full === ourNorm || f.short === ourNorm)
      ) ?? null;
      if (match) confidence = "exact";

      // 2. Surname match
      if (!match) {
        const candidates = fifaNormalized.filter(f =>
          !usedFifaIds.has(f.fp.IdPlayer) &&
          (lastName(f.full) === ourLast || lastName(f.short) === ourLast)
        );
        if (candidates.length === 1) {
          match = candidates[0]; confidence = "surname";
        } else if (candidates.length > 1) {
          const refined = candidates.find(f => firstName(f.full) === ourFirst);
          if (refined) { match = refined; confidence = "surname+first"; }
          else { match = candidates[0]; confidence = `surname-ambiguous(${candidates.length})`; }
        }
      }

      // 3. First name only (unique in team)
      if (!match) {
        const candidates = fifaNormalized.filter(f =>
          !usedFifaIds.has(f.fp.IdPlayer) && firstName(f.full) === ourFirst
        );
        if (candidates.length === 1) { match = candidates[0]; confidence = "first-name-only"; }
      }

      if (!match) {
        unmapped.push(ourPlayer.name);
        continue;
      }

      usedFifaIds.add(match.fp.IdPlayer);

      const isUncertain = confidence.includes("ambiguous") || confidence === "first-name-only";
      if (isUncertain) uncertain.push({ ourName: ourPlayer.name, fifaName: match.fullRaw, confidence });

      const { error } = await supabase
        .from("players")
        .update({ fifa_player_id: match.fp.IdPlayer } as any)
        .eq("id", ourPlayer.id);

      if (error) {
        console.error(`  Error updating ${ourPlayer.name}:`, error.message);
      } else {
        const tag = isUncertain ? ` ⚠ [${confidence}]` : "";
        console.log(`  ✓ ${ourPlayer.name} → ${match.fp.IdPlayer} (FIFA: ${match.fullRaw})${tag}`);
        mapped++;
      }
    }

    // Insert FIFA players that had no match in our DB
    for (const { fp, fullRaw } of fifaNormalized) {
      if (usedFifaIds.has(fp.IdPlayer)) continue;

      const name = toProperCase(fp.PlayerName?.[0]?.Description ?? fp.ShortName?.[0]?.Description ?? "Unknown");
      const position = FIFA_POSITION[fp.Position] ?? "MF";
      const jerseyNumber: number | null = fp.ShirtNumber ?? null;

      // Skip if already inserted in a previous run
      const { data: existing } = await supabase
        .from("players")
        .select("id")
        .eq("fifa_player_id", fp.IdPlayer)
        .maybeSingle() as unknown as { data: { id: string } | null };
      if (existing) continue;

      const { error } = await supabase
        .from("players")
        .insert({
          team_id: teamId,
          name,
          position,
          jersey_number: jerseyNumber,
          fifa_player_id: fp.IdPlayer,
        } as any);

      if (error) {
        console.error(`  Error inserting ${name}:`, error.message);
      } else {
        console.log(`  + inserted ${name} (#${jerseyNumber} ${position}) → ${fp.IdPlayer}`);
        inserted++;
      }
    }
  }

  // Players in teams with no FIFA roster at all
  for (const [teamId, teamPlayers] of playersByTeam) {
    if (!fifaPlayersByTeam.has(teamId)) {
      for (const p of teamPlayers) {
        if (!p.fifa_player_id) unmapped.push(p.name);
      }
    }
  }

  console.log(`\n── Summary ──────────────────────────────`);
  console.log(`Mapped:         ${mapped}`);
  console.log(`Inserted new:   ${inserted}`);
  console.log(`Already mapped: ${alreadyMapped}`);
  console.log(`Unmapped:       ${unmapped.length}`);
  console.log(`Uncertain:      ${uncertain.length}`);

  if (unmapped.length > 0) {
    console.log(`\n── Unmapped ─────────────────────────────`);
    for (const n of unmapped) console.log(`  ✗ ${n}`);
  }

  if (uncertain.length > 0) {
    console.log(`\n── Uncertain (review manually) ──────────`);
    for (const u of uncertain) console.log(`  ⚠ "${u.ourName}" → "${u.fifaName}" [${u.confidence}]`);
  }
}

main().catch(console.error);
