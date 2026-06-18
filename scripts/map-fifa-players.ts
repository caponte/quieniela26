/**
 * Maps and upserts players for a single country using the FIFA API.
 *
 * Strategy per team:
 *   1. Query our DB players for the team
 *   2. Pull FIFA roster from the first match that has a non-empty Players[]
 *   3. For each FIFA player:
 *      - If found in DB (by fifa_player_id or name): UPDATE jersey_number, picture_url, fifa_player_id if missing
 *      - If not found: INSERT
 *   4. Report skipped / uncertain matches for manual review
 *
 * Usage:
 *   npm run map-players -- --country ARG
 *   npm run map-players -- --country ARG --dry-run
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

async function fifaFetch(endpoint: string) {
  const res = await fetch(`${FIFA_BASE}${endpoint}`, { cache: "no-store" } as RequestInit);
  if (!res.ok) throw new Error(`fifa ${res.status}: ${await res.text()}`);
  return res.json();
}

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeFifaName(raw: string): string {
  const sentenceCase = raw.replace(/\b([A-ZÁÉÍÓÚÑÜÄÖ]{2,})\b/g, (m) =>
    m[0] + m.slice(1).toLowerCase()
  );
  return normalize(sentenceCase);
}

function toProperCase(raw: string): string {
  return raw
    .split(" ")
    .map((w) => w[0]?.toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function lastName(n: string): string { return n.split(" ").at(-1)!; }
function firstName(n: string): string { return n.split(" ")[0]; }

const FIFA_POSITION: Record<number, string> = { 0: "GK", 1: "DEF", 2: "MID", 3: "FWD" };

interface OurPlayer {
  id: string;
  team_id: string;
  name: string;
  fifa_player_id: string | null;
  jersey_number: number | null;
  picture_url: string | null;
}

interface FifaPlayer {
  IdPlayer: string;
  IdTeam: string;
  ShirtNumber: number | null;
  Position: number;
  PlayerName: { Locale: string; Description: string }[];
  ShortName: { Locale: string; Description: string }[];
  PlayerPicture: { PictureUrl: string } | null;
}

interface NormalizedFifaPlayer {
  fp: FifaPlayer;
  full: string;
  short: string;
  fullRaw: string;
}

function parseArgs() {
  const args = process.argv.slice(2);
  // Usage: npm run map-players ARG [--dry-run]
  const country = args.find((a) => !a.startsWith("--"))?.toUpperCase() ?? null;
  const dryRun = args.includes("--dry-run");
  return { country, dryRun };
}

async function getFifaRosterForTeam(
  teamId: string,
  matchIds: string[]
): Promise<{ players: FifaPlayer[]; fifaTeamId: string } | null> {
  for (const fifaMatchId of matchIds) {
    let detail: any;
    try {
      detail = await fifaFetch(`/live/football/${fifaMatchId}`);
    } catch (e) {
      console.warn(`  ⚠ Could not fetch match ${fifaMatchId}: ${e}`);
      continue;
    }

    for (const side of ["HomeTeam", "AwayTeam"] as const) {
      const team = detail[side];
      if (!team?.Players?.length) continue;

      // Find which side matches our team by cross-referencing match record
      // We'll check both sides and pick the one that has players
      // The caller will pass only matches where this team participates
      const players: FifaPlayer[] = team.Players;
      if (players.length > 0) {
        return { players, fifaTeamId: team.IdTeam };
      }
    }
  }
  return null;
}

async function getRosterFromMatch(
  fifaMatchId: string,
  isHome: boolean
): Promise<FifaPlayer[]> {
  const detail = await fifaFetch(`/live/football/${fifaMatchId}`);
  const side = isHome ? "HomeTeam" : "AwayTeam";
  return detail[side]?.Players ?? [];
}

async function main() {
  const { country, dryRun } = parseArgs();

  if (!country) {
    console.error("Usage: npm run map-players ARG [--dry-run]");
    process.exit(1);
  }

  if (dryRun) console.log("--- DRY RUN — no DB writes ---\n");

  // 1. Find the team in our DB
  const { data: teamRow, error: teamErr } = await supabase
    .from("teams")
    .select("id, name, fifa_code")
    .eq("fifa_code", country)
    .maybeSingle() as unknown as { data: { id: string; name: string; fifa_code: string } | null; error: any };

  if (teamErr || !teamRow) {
    console.error(`Team with fifa_code="${country}" not found in DB.`);
    process.exit(1);
  }

  console.log(`\n=== ${teamRow.name} (${country}) ===\n`);

  // 2. Get matches for this team that have a fifa_match_id
  const { data: matches } = await supabase
    .from("matches")
    .select("id, fifa_match_id, home_team_id, away_team_id")
    .not("fifa_match_id", "is", null)
    .or(`home_team_id.eq.${teamRow.id},away_team_id.eq.${teamRow.id}`) as unknown as {
      data: { id: string; fifa_match_id: string; home_team_id: string; away_team_id: string }[] | null
    };

  if (!matches?.length) {
    console.error("No mapped matches found for this team. Run npm run map-fifa first.");
    process.exit(1);
  }

  // 3. Find FIFA roster — try each match until we get a non-empty Players[]
  let fifaPlayers: FifaPlayer[] = [];

  for (const m of matches) {
    const isHome = m.home_team_id === teamRow.id;
    try {
      const detail = await fifaFetch(`/live/football/${m.fifa_match_id}`);
      const side = isHome ? "HomeTeam" : "AwayTeam";
      const players: FifaPlayer[] = detail[side]?.Players ?? [];
      if (players.length > 0) {
        fifaPlayers = players;
        console.log(`  Got ${players.length} players from match ${m.fifa_match_id}\n`);
        break;
      }
    } catch (e) {
      console.warn(`  ⚠ Could not fetch match ${m.fifa_match_id}: ${e}`);
    }
  }

  if (!fifaPlayers.length) {
    console.error("No roster found across any match. Try again after a match is played.");
    process.exit(1);
  }

  // 4. Get our current players for this team
  const { data: ourPlayers } = await supabase
    .from("players")
    .select("id, team_id, name, fifa_player_id, jersey_number, picture_url")
    .eq("team_id", teamRow.id) as unknown as { data: OurPlayer[] | null };

  const ourByFifaId = new Map<string, OurPlayer>();
  for (const p of ourPlayers ?? []) {
    if (p.fifa_player_id) ourByFifaId.set(p.fifa_player_id, p);
  }

  // 5. Normalize FIFA players for name matching
  const fifaNormalized: NormalizedFifaPlayer[] = fifaPlayers.map((fp) => {
    const fullRaw = fp.PlayerName?.[0]?.Description ?? "";
    const shortRaw = fp.ShortName?.[0]?.Description ?? "";
    return { fp, full: normalizeFifaName(fullRaw), short: normalizeFifaName(shortRaw), fullRaw };
  });

  // 6. Process each FIFA player
  let updated = 0;
  let inserted = 0;
  let skipped = 0;
  const uncertain: { fifaName: string; ourName: string; confidence: string }[] = [];

  for (const { fp, full, short, fullRaw } of fifaNormalized) {
    const jersey = fp.ShirtNumber ?? null;
    const pictureUrl = fp.PlayerPicture?.PictureUrl ?? null;
    const position = FIFA_POSITION[fp.Position] ?? "MID";
    const properName = toProperCase(fp.PlayerName?.[0]?.Description ?? fp.ShortName?.[0]?.Description ?? "Unknown");

    // --- Find match in our DB ---
    let ourPlayer: OurPlayer | null = ourByFifaId.get(fp.IdPlayer) ?? null;
    let confidence = "fifa_id";

    // Fallback: name matching if not found by FIFA ID
    if (!ourPlayer) {
      const ourTeamPlayers = ourPlayers ?? [];

      const byExact = ourTeamPlayers.find(
        (p) => !p.fifa_player_id && (normalize(p.name) === full || normalize(p.name) === short)
      );
      if (byExact) { ourPlayer = byExact; confidence = "exact"; }

      if (!ourPlayer) {
        const bySurname = ourTeamPlayers.filter(
          (p) => !p.fifa_player_id && lastName(normalize(p.name)) === lastName(full)
        );
        if (bySurname.length === 1) { ourPlayer = bySurname[0]; confidence = "surname"; }
        else if (bySurname.length > 1) {
          const refined = bySurname.find((p) => firstName(normalize(p.name)) === firstName(full));
          ourPlayer = refined ?? bySurname[0];
          confidence = refined ? "surname+first" : `surname-ambiguous(${bySurname.length})`;
        }
      }

      if (!ourPlayer) {
        const byFirst = (ourPlayers ?? []).filter(
          (p) => !p.fifa_player_id && firstName(normalize(p.name)) === firstName(full)
        );
        if (byFirst.length === 1) { ourPlayer = byFirst[0]; confidence = "first-name-only"; }
      }
    }

    const isUncertain = confidence.includes("ambiguous") || confidence === "first-name-only";

    // --- UPDATE existing player ---
    if (ourPlayer) {
      const needsUpdate =
        !ourPlayer.fifa_player_id ||
        ourPlayer.jersey_number !== jersey ||
        ourPlayer.picture_url !== pictureUrl;

      if (!needsUpdate) {
        skipped++;
        continue;
      }

      if (isUncertain) uncertain.push({ fifaName: fullRaw, ourName: ourPlayer.name, confidence });

      const tag = isUncertain ? ` ⚠ [${confidence}]` : "";
      console.log(`  ✓ UPDATE ${ourPlayer.name} → #${jersey} ${fp.IdPlayer} 🖼 ${pictureUrl ? "yes" : "no"}${tag}`);

      if (!dryRun) {
        const { error } = await supabase
          .from("players")
          .update({
            fifa_player_id: fp.IdPlayer,
            jersey_number: jersey,
            picture_url: pictureUrl,
          } as any)
          .eq("id", ourPlayer.id);
        if (error) console.error(`    Error: ${error.message}`);
        else updated++;
      } else {
        updated++;
      }

      // Mark as used so we don't double-match
      if (ourPlayer.fifa_player_id) ourByFifaId.delete(ourPlayer.fifa_player_id);

    // --- INSERT new player ---
    } else {
      console.log(`  + INSERT ${properName} (#${jersey} ${position}) → ${fp.IdPlayer}`);

      if (!dryRun) {
        const { error } = await supabase
          .from("players")
          .insert({
            team_id: teamRow.id,
            name: properName,
            position,
            jersey_number: jersey,
            fifa_player_id: fp.IdPlayer,
            picture_url: pictureUrl,
          } as any);
        if (error) console.error(`    Error: ${error.message}`);
        else inserted++;
      } else {
        inserted++;
      }
    }
  }

  // Summary
  console.log(`\n── Summary ──────────────────────────────`);
  console.log(`Updated:  ${updated}`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Skipped:  ${skipped} (already complete)`);

  if (uncertain.length > 0) {
    console.log(`\n── Uncertain matches (review manually) ──`);
    for (const u of uncertain) {
      console.log(`  ⚠ FIFA "${u.fifaName}" → DB "${u.ourName}" [${u.confidence}]`);
    }
  }
}

main().catch(console.error);
