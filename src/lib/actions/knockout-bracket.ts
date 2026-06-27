"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { type KnockoutPredictionData } from "@/lib/utils/knockout-bracket"

export async function saveKnockoutPrediction(data: KnockoutPredictionData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado." }

  // Verify lock: first R32 match date - 10 min
  const { data: firstMatch } = await supabase
    .from("matches")
    .select("match_date")
    .eq("stage", "round_of_32")
    .order("match_date", { ascending: true })
    .limit(1) as unknown as { data: { match_date: string }[] | null }

  if (!firstMatch || firstMatch.length === 0) {
    return { error: "El bracket eliminatorio aún no está disponible." }
  }

  const lockTime = new Date(firstMatch[0].match_date).getTime() - 10 * 60 * 1000
  if (Date.now() >= lockTime) {
    return { error: "El bracket eliminatorio ya está bloqueado." }
  }

  // Delete existing then insert fresh (same pattern as saveBracketPrediction)
  const { error: delErr } = await supabase
    .from("knockout_predictions")
    .delete()
    .eq("user_id", user.id) as unknown as { error: { message: string } | null }

  if (delErr) return { error: delErr.message }

  const { error: insErr } = await (supabase
    .from("knockout_predictions")
    .insert as unknown as (v: unknown) => Promise<{ error: { message: string } | null }>)(
    { user_id: user.id, picks: data }
  )

  if (insErr) return { error: insErr.message }

  revalidatePath("/predict/knockout")
  return { success: true }
}
