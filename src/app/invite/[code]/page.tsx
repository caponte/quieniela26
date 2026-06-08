import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import InviteLanding from "./InviteLanding"

type SimpleInsert = (v: unknown) => Promise<{ error: { code?: string } | null }>

interface Props {
  params: Promise<{ code: string }>
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
