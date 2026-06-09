import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import type { Metadata } from "next"
import InviteLanding from "./InviteLanding"

type SimpleInsert = (v: unknown) => Promise<{ error: { code?: string } | null }>

interface Props {
  params: Promise<{ code: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params
  const supabase = await createClient()

  const { data: league } = await supabase
    .from("leagues")
    .select("name")
    .eq("invite_code", code.toUpperCase())
    .maybeSingle() as unknown as { data: { name: string } | null }

  if (!league) return { title: "Invitación — Quiniela 2026" }

  const title = `Te invitaron a "${league.name}" — Quiniela 2026`
  const description = `Únete a ${league.name} y compite prediciendo los resultados del Mundial FIFA 2026.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  }
}

export default async function InvitePage({ params }: Props) {
  const { code } = await params
  const inviteCode = code.toUpperCase()

  const supabase = await createClient()

  // Find league by invite code
  const { data: league } = await supabase
    .from("leagues")
    .select("id, name, invite_code")
    .eq("invite_code", inviteCode)
    .maybeSingle() as unknown as { data: { id: string; name: string; invite_code: string } | null }

  if (!league) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Auto-join (ignore if already a member)
    await (supabase.from("league_members").insert as unknown as SimpleInsert)({
      league_id: league.id,
      user_id: user.id,
      role: "member",
    })
    redirect(`/league/${league.id}`)
  }

  // Not authenticated — show landing with Google sign-in
  return <InviteLanding leagueName={league.name} code={inviteCode} />
}
