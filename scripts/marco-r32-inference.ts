/**
 * Shows which R32 matches we CAN'T infer from Marco's r16 picks,
 * so we can ask him directly.
 */
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { R32_DEFS } from "../src/lib/utils/bracket.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { realtime: { transport: ws } }
);

// Marco's r16 picks (cuartos participants = octavo winners)
const R16_WINNERS: Record<number, string> = {
  0: "FRA", 1: "NED", 2: "ESP", 3: "SEN",
  4: "NOR", 5: "ECU", 6: "ARG", 7: "COL",
};

// Marco's answers for the unknown R32 matches (who wins each)
const MARCO_R32_ANSWERS: Record<number, string> = {
  74: "GER", // Alemania
  73: "CAN", // Canadá
  83: "POR", // Portugal
  81: "USA", // Estados Unidos
  76: "BRA", // Brasil
  80: "ENG", // Inglaterra
  88: "EGY", // Egipto
  85: "SUI", // Suiza
};

// R16 slot pairs: octavo slot i = R32 slot (2i) vs R32 slot (2i+1)
// R16_PAIRS = [[0,1],[2,3],[4,5],[6,7],[8,9],[10,11],[12,13],[14,15]]

async function main() {
  // Load all R32 match participants from DB
  const { data: dbMatches } = await sb
    .from("matches")
    .select("match_number, home_team_id, away_team_id")
    .eq("stage", "round_of_32")
    .order("match_number");

  const { data: teams } = await sb.from("teams").select("id, name, fifa_code");
  const teamById: Record<string, { name: string; fifa_code: string }> = {};
  for (const t of teams ?? []) teamById[t.id] = { name: t.name, fifa_code: t.fifa_code };

  // Build match_number → participants map
  const matchByNum: Record<number, { home: string; away: string }> = {};
  for (const m of dbMatches ?? []) {
    if (m.home_team_id && m.away_team_id) {
      matchByNum[m.match_number] = {
        home: teamById[m.home_team_id]?.fifa_code ?? "?",
        away: teamById[m.away_team_id]?.fifa_code ?? "?",
      };
    }
  }

  // R32_DEFS slot → match number
  const r32SlotToMatchNum = R32_DEFS.map(d => parseInt(d.matchId.replace("M", ""), 10));

  // Build complete r32 array (16 slots)
  const r32Picks: (string | null)[] = Array(16).fill(null);

  for (let r16Slot = 0; r16Slot < 8; r16Slot++) {
    const r32SlotA = r16Slot * 2;
    const r32SlotB = r16Slot * 2 + 1;
    const winner = R16_WINNERS[r16Slot];

    const matchNumA = r32SlotToMatchNum[r32SlotA];
    const matchNumB = r32SlotToMatchNum[r32SlotB];
    const matchA = matchByNum[matchNumA];
    const matchB = matchByNum[matchNumB];

    const winnerInA = matchA && (matchA.home === winner || matchA.away === winner);
    const winnerInB = matchB && (matchB.home === winner || matchB.away === winner);

    const teamByFifa = Object.fromEntries(Object.entries(teamById).map(([id, t]) => [t.fifa_code, id]));

    if (winnerInA) {
      r32Picks[r32SlotA] = teamByFifa[winner] ?? null;
      const unknownCode = MARCO_R32_ANSWERS[matchNumB];
      r32Picks[r32SlotB] = unknownCode ? (teamByFifa[unknownCode] ?? null) : null;
    } else if (winnerInB) {
      r32Picks[r32SlotB] = teamByFifa[winner] ?? null;
      const unknownCode = MARCO_R32_ANSWERS[matchNumA];
      r32Picks[r32SlotA] = unknownCode ? (teamByFifa[unknownCode] ?? null) : null;
    }
  }

  // Team UUIDs for rounds from user
  // Read existing knockout_predictions to preserve all other fields
  const MARCO = "3f514690-2608-4e71-b652-fecc51627531";
  const { data: existing } = await sb
    .from("knockout_predictions")
    .select("picks")
    .eq("user_id", MARCO)
    .maybeSingle();

  const existingPicks = (existing?.picks ?? {}) as Record<string, unknown>;
  console.log("\n=== Picks existentes (antes de actualizar r32) ===");
  console.log(JSON.stringify(existingPicks, null, 2));

  // Only patch r32, keep everything else intact
  const updatedPicks = { ...existingPicks, r32: r32Picks };

  console.log("\n=== r32 calculado ===");
  const { data: allTeams } = await sb.from("teams").select("id, name, fifa_code");
  const teamByIdFull: Record<string, string> = {};
  for (const t of allTeams ?? []) teamByIdFull[t.id] = t.fifa_code;

  for (let i = 0; i < 16; i++) {
    const code = r32Picks[i] ? (teamByIdFull[r32Picks[i]!] ?? "?") : "null";
    console.log(`  slot ${i} (M${r32SlotToMatchNum[i]}): ${code}`);
  }

  const { error } = await sb
    .from("knockout_predictions")
    .upsert({ user_id: MARCO, picks: updatedPicks }, { onConflict: "user_id" });

  if (error) console.error("❌", error);
  else console.log("\n✅ knockout_predictions actualizado — solo se modificó r32, todo lo demás intacto");
}

main().catch(console.error);
