/**
 * Runs the FIFA player mapping for all teams and reports changes.
 * Usage: npm run map-all-players
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
  if (!res.ok) throw new Error(`fifa ${res.status}`);
  return res.json();
}

function normalize(name: string): string {
  return name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['\-]/g, " ").replace(/\s+/g, " ").trim();
}
function normalizeFifaName(raw: string): string {
  return normalize(raw.replace(/\b([A-ZÁÉÍÓÚÑÜÄÖ]{2,})\b/g, (m) => m[0] + m.slice(1).toLowerCase()));
}
function toProperCase(raw: string): string {
  return raw.split(" ").map((w) => w[0]?.toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}
function lastName(n: string) { return n.split(" ").at(-1)!; }
function firstName(n: string) { return n.split(" ")[0]; }
const FIFA_POSITION: Record<number, string> = { 0: "GK", 1: "DEF", 2: "MID", 3: "FWD" };

async function processTeam(team: { id: string; name: string; fifa_code: string }) {
  const { data: matches } = await supabase
    .from("matches")
    .select("id, fifa_match_id, home_team_id, away_team_id")
    .not("fifa_match_id", "is", null)
    .or(`home_team_id.eq.${team.id},away_team_id.eq.${team.id}`) as any;

  if (!matches?.length) return { updated: 0, inserted: 0, skipped: 0 };

  // Try all matches — use the one with the most players
  let bestPlayers: any[] = [];
  for (const m of matches) {
    try {
      const detail = await fifaFetch(`/live/football/${m.fifa_match_id}`);
      const isHome = m.home_team_id === team.id;
      const players = detail[isHome ? "HomeTeam" : "AwayTeam"]?.Players ?? [];
      if (players.length > bestPlayers.length) bestPlayers = players;
    } catch { /* skip */ }
  }

  if (!bestPlayers.length) return { updated: 0, inserted: 0, skipped: 0 };

  const { data: ourPlayers } = await supabase
    .from("players")
    .select("id, name, fifa_player_id, jersey_number, picture_url")
    .eq("team_id", team.id) as any;

  const ourByFifaId = new Map<string, any>();
  for (const p of ourPlayers ?? []) if (p.fifa_player_id) ourByFifaId.set(p.fifa_player_id, p);

  const fifaNorm = bestPlayers.map((fp: any) => {
    const fullRaw = fp.PlayerName?.[0]?.Description ?? "";
    return { fp, full: normalizeFifaName(fullRaw), short: normalizeFifaName(fp.ShortName?.[0]?.Description ?? ""), fullRaw };
  });

  let updated = 0, inserted = 0, skipped = 0;
  const usedFifaIds = new Set<string>();

  for (const { fp, full, short } of fifaNorm) {
    const jersey = fp.ShirtNumber ?? null;
    const pictureUrl = fp.PlayerPicture?.PictureUrl ?? null;
    const position = FIFA_POSITION[fp.Position] ?? "MID";
    const properName = toProperCase(fp.PlayerName?.[0]?.Description ?? "Unknown");

    let ourPlayer = ourByFifaId.get(fp.IdPlayer) ?? null;

    if (!ourPlayer) {
      const pool = (ourPlayers ?? []).filter((p: any) => !p.fifa_player_id);
      const byExact = pool.find((p: any) => normalize(p.name) === full || normalize(p.name) === short);
      if (byExact) { ourPlayer = byExact; }
      else {
        const bySurname = pool.filter((p: any) => lastName(normalize(p.name)) === lastName(full));
        if (bySurname.length === 1) ourPlayer = bySurname[0];
        else if (bySurname.length > 1) {
          ourPlayer = bySurname.find((p: any) => firstName(normalize(p.name)) === firstName(full)) ?? bySurname[0];
        }
      }
    }

    if (ourPlayer) {
      const needsUpdate = !ourPlayer.fifa_player_id || ourPlayer.jersey_number !== jersey || ourPlayer.picture_url !== pictureUrl;
      if (!needsUpdate) { skipped++; continue; }

      const { error } = await supabase.from("players").update({ fifa_player_id: fp.IdPlayer, jersey_number: jersey, picture_url: pictureUrl } as any).eq("id", ourPlayer.id);
      if (!error) updated++;
      usedFifaIds.add(fp.IdPlayer);
    } else {
      const { data: existing } = await supabase.from("players").select("id").eq("fifa_player_id", fp.IdPlayer).maybeSingle() as any;
      if (existing) { skipped++; continue; }

      const { error } = await supabase.from("players").insert({ team_id: team.id, name: properName, position, jersey_number: jersey, fifa_player_id: fp.IdPlayer, picture_url: pictureUrl } as any);
      if (!error) inserted++;
    }
  }

  return { updated, inserted, skipped };
}

async function main() {
  const { data: teams } = await supabase.from("teams").select("id, name, fifa_code, group_name").order("group_name").order("name") as any;

  let totalUpdated = 0, totalInserted = 0;
  const changed: string[] = [];

  console.log(`\nRevisando ${teams.length} equipos...\n`);

  for (const team of teams) {
    const { updated, inserted } = await processTeam(team);
    totalUpdated += updated;
    totalInserted += inserted;
    if (updated > 0 || inserted > 0) {
      const msg = `  ✓ ${team.name} (${team.fifa_code}): ${updated} actualizados, ${inserted} insertados`;
      console.log(msg);
      changed.push(msg);
    }
  }

  console.log(`\n── Resumen ──────────────────────────────`);
  console.log(`Actualizados: ${totalUpdated}`);
  console.log(`Insertados:   ${totalInserted}`);
  if (!changed.length) console.log(`\nTodo ya estaba al día.`);
}

main().catch(console.error);
