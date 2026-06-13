import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Breadcrumb } from "@/components/Breadcrumb"
import { BRACKET_LOCK_TIME, type BracketPredictionData, type TeamInfo } from "@/lib/utils/bracket"
import { BracketViewer } from "./BracketViewer"

interface Props {
  params: Promise<{ id: string; userId: string }>
}

interface UserRow { id: string; name: string; avatar_url: string | null }
interface LeagueRow { id: string; name: string }

export default async function MemberBracketPage({ params }: Props) {
  const { id: leagueId, userId: targetUserId } = await params

  if (Date.now() < BRACKET_LOCK_TIME.getTime()) {
    redirect(`/league/${leagueId}`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: myMembership } = await supabase
    .from("league_members")
    .select("user_id")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .maybeSingle() as unknown as { data: { user_id: string } | null }

  if (!myMembership) notFound()

  const [leagueRes, targetUserRes, bracketRes, teamsRes] = await Promise.all([
    supabase.from("leagues").select("id, name").eq("id", leagueId).maybeSingle() as unknown as Promise<{ data: LeagueRow | null }>,
    supabase.from("users").select("id, name, avatar_url").eq("id", targetUserId).maybeSingle() as unknown as Promise<{ data: UserRow | null }>,
    supabase.from("bracket_predictions").select("predictions").eq("user_id", targetUserId).order("league_id", { nullsFirst: true }).limit(1) as unknown as Promise<{ data: { predictions: BracketPredictionData }[] | null }>,
    supabase.from("teams").select("id, name, flag_url, fifa_code, group_name").order("group_name").order("name") as unknown as Promise<{ data: TeamInfo[] | null }>,
  ])

  const league      = leagueRes.data
  const targetUser  = targetUserRes.data
  const bracket     = (bracketRes.data?.[0])?.predictions ?? null
  const teams       = teamsRes.data ?? []

  if (!league || !targetUser) notFound()

  const isMe = targetUserId === user.id

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Breadcrumb crumbs={[
        { label: "Inicio", href: "/dashboard" },
        { label: "Mis ligas", href: "/league" },
        { label: league.name, href: `/league/${leagueId}` },
        { label: isMe ? "Mi bracket" : `Bracket de ${targetUser.name.split(" ")[0]}` },
      ]} />

      <div className="flex items-center gap-3 mb-8">
        {targetUser.avatar_url ? (
          <Image
            src={targetUser.avatar_url}
            alt={targetUser.name}
            width={44}
            height={44}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-base font-bold">
            {targetUser.name[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold">
            {isMe ? "Mi bracket" : `Bracket de ${targetUser.name}`}
          </h1>
          <p className="text-(--color-muted) text-sm">{league.name}</p>
        </div>
      </div>

      {!bracket ? (
        <div className="bg-(--color-surface) border border-(--color-border) rounded-xl p-8 text-center">
          <p className="text-(--color-muted)">
            {isMe ? "No enviaste tu bracket." : `${targetUser.name.split(" ")[0]} no envió su bracket.`}
          </p>
          {isMe && (
            <Link
              href="/predict/bracket"
              className="mt-3 inline-block text-sm text-(--color-accent) hover:underline"
            >
              Ver bracket →
            </Link>
          )}
        </div>
      ) : (
        <BracketViewer bracket={bracket} teams={teams} isMe={isMe} />
      )}
    </div>
  )
}
