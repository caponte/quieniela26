"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { EventType, MatchStatus } from "@/lib/supabase/database.types"

export async function triggerManualSync() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autorizado" }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single() as unknown as { data: { role: string } | null }

  if (profile?.role !== "admin") return { error: "No autorizado" }

  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000"

  try {
    const res = await fetch(`${base}/api/cron/sync-matches`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ source: "manual" }),
      cache: "no-store",
    })
    const data = await res.json()
    return { data }
  } catch (e) {
    return { error: String(e) }
  }
}

type QueryResult = Promise<{ error: { message: string } | null }>
type WithEq = { eq: (col: string, val: unknown) => QueryResult }

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/")

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single() as unknown as { data: { role: string } | null }

  if (profile?.role !== "admin") redirect("/dashboard")
  return supabase
}

export async function updateMatchResult(
  matchId: string,
  homeScore: number | null,
  awayScore: number | null,
  status: MatchStatus
) {
  const supabase = await requireAdmin()

  const { error } = await (
    supabase.from("matches").update as unknown as (v: unknown) => WithEq
  )({ home_score: homeScore, away_score: awayScore, status }).eq("id", matchId)

  if (error) return { error: error.message }
  revalidatePath(`/admin/match/${matchId}`)
  revalidatePath("/admin")
  return { success: true }
}

export interface AddEventInput {
  matchId: string
  type: EventType
  teamId: string
  playerName: string | null
  minute: number | null
  isFirstGoal: boolean
  isOwnGoal: boolean
  penaltyScored: boolean | null
}

async function recalcIfFinished(supabase: Awaited<ReturnType<typeof requireAdmin>>, matchId: string) {
  const { data: m } = await supabase
    .from("matches")
    .select("status")
    .eq("id", matchId)
    .single() as unknown as { data: { status: string } | null }
  if (m?.status === "finished") {
    await (supabase.rpc as unknown as (fn: string, args: object) => Promise<unknown>)(
      "calculate_match_points", { p_match_id: matchId }
    )
  }
}

export async function addMatchEvent(input: AddEventInput) {
  const supabase = await requireAdmin()

  const { error } = await (
    supabase.from("match_events").insert as unknown as (v: unknown) => QueryResult
  )({
    match_id: input.matchId,
    type: input.type,
    team_id: input.teamId,
    player_name: input.playerName || null,
    minute: input.minute || null,
    is_first_goal: input.isFirstGoal,
    is_own_goal: input.isOwnGoal,
    penalty_scored: input.type === "penalty" ? input.penaltyScored : null,
  })

  if (error) return { error: error.message }
  await recalcIfFinished(supabase, input.matchId)
  revalidatePath(`/admin/match/${input.matchId}`)
  return { success: true }
}

export async function deleteMatchEvent(eventId: string, matchId: string) {
  const supabase = await requireAdmin()

  const { error } = await (
    supabase.from("match_events").delete as unknown as () => WithEq
  )().eq("id", eventId)

  if (error) return { error: error.message }
  await recalcIfFinished(supabase, matchId)
  revalidatePath(`/admin/match/${matchId}`)
  return { success: true }
}

export async function syncSingleMatch(matchId: string) {
  const supabase = await requireAdmin()

  const { data: match } = await supabase
    .from("matches")
    .select("fifa_match_id")
    .eq("id", matchId)
    .single() as unknown as { data: { fifa_match_id: string | null } | null }

  if (!match?.fifa_match_id) return { error: "Este partido no tiene fifa_match_id mapeado." }

  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000"

  try {
    const res = await fetch(`${base}/api/cron/sync-matches`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ testFifaMatchId: match.fifa_match_id, ourMatchId: matchId }),
      cache: "no-store",
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error ?? `HTTP ${res.status}` }
    revalidatePath(`/admin/match/${matchId}`)
    revalidatePath("/admin")
    return { data }
  } catch (e) {
    return { error: String(e) }
  }
}

