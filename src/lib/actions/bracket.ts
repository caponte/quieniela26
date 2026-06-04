"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { BRACKET_LOCK_TIME, type BracketPredictionData } from "@/lib/utils/bracket"

export async function saveBracketPrediction(data: BracketPredictionData) {
  if (Date.now() >= BRACKET_LOCK_TIME.getTime()) {
    return { error: "El bracket ya está bloqueado. No se pueden hacer más cambios." }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado." }

  // Delete all existing rows first.
  // Using delete (not upsert) because UNIQUE(user_id, league_id) doesn't trigger
  // when league_id IS NULL in Postgres (NULL != NULL), so upsert always inserts.
  // Also cleans up any duplicate rows from earlier bugs.
  const { error: delErr } = await supabase
    .from("bracket_predictions")
    .delete()
    .eq("user_id", user.id)
    .is("league_id", null) as unknown as { error: { message: string } | null }

  if (delErr) return { error: delErr.message }

  // Insert fresh row. Cast needed: Supabase generic doesn't resolve the
  // self-referential Insert type on bracket_predictions.
  const { error: insErr } = await (supabase
    .from("bracket_predictions")
    .insert as unknown as (v: unknown) => Promise<{ error: { message: string } | null }>)(
    { user_id: user.id, league_id: null, predictions: data }
  )

  if (insErr) return { error: insErr.message }

  revalidatePath("/predict/bracket")
  return { success: true }
}
