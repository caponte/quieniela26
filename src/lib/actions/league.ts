"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

type SimpleInsert = (v: unknown) => Promise<{ error: { code?: string; message?: string } | null }>
type InsertThenSelect = (v: unknown) => {
  select: (cols: string) => {
    single: () => Promise<{ data: { id: string } | null; error: unknown }>
  }
}

export async function createLeague(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const name = (formData.get("name") as string)?.trim()
  if (!name) return { error: "El nombre es requerido" }
  if (name.length > 50) return { error: "El nombre no puede exceder 50 caracteres" }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { data: league, error } = await (
    supabase.from("leagues").insert as unknown as InsertThenSelect
  )({ name, created_by: user.id }).select("id").single()

  if (error || !league) return { error: "No se pudo crear la liga" }

  await (supabase.from("league_members").insert as unknown as SimpleInsert)({
    league_id: league.id, user_id: user.id, role: "owner",
  })

  redirect(`/league/${league.id}`)
}

export async function joinLeague(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const code = (formData.get("code") as string)?.trim().toUpperCase()
  if (!code) return { error: "Ingresa el código de invitación" }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { data: league } = await supabase
    .from("leagues")
    .select("id")
    .eq("invite_code", code)
    .maybeSingle() as unknown as { data: { id: string } | null }

  if (!league) return { error: "Código de invitación inválido" }

  const { error } = await (supabase.from("league_members").insert as unknown as SimpleInsert)({
    league_id: league.id, user_id: user.id, role: "member",
  })

  if (error) {
    if (error.code === "23505") return { error: "Ya eres miembro de esta liga" }
    return { error: "No se pudo unir a la liga" }
  }

  redirect(`/league/${league.id}`)
}

export async function deleteLeague(leagueId: string): Promise<{ error: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { error } = await supabase
    .from("leagues")
    .delete()
    .eq("id", leagueId)
    .eq("created_by", user.id)

  if (error) return { error: "No se pudo eliminar la liga" }

  redirect("/league")
}

export async function kickMember(
  leagueId: string,
  userId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { data: myMembership } = await supabase
    .from("league_members")
    .select("role")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .maybeSingle() as unknown as { data: { role: string } | null }

  if (myMembership?.role !== "owner") return { error: "Solo el dueño puede expulsar miembros" }

  const { error } = await supabase
    .from("league_members")
    .delete()
    .eq("league_id", leagueId)
    .eq("user_id", userId)

  if (error) return { error: "No se pudo expulsar al miembro" }
  return {}
}

export async function leaveLeague(leagueId: string): Promise<{ error: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { error } = await supabase
    .from("league_members")
    .delete()
    .eq("league_id", leagueId)
    .eq("user_id", user.id)

  if (error) return { error: "No se pudo salir de la liga" }

  redirect("/league")
}
