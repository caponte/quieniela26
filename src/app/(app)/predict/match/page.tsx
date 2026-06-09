import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { JORNADA_SLUGS, JORNADA_INFO, getGroupRoundMatchIds, isMatchLocked } from "@/lib/utils/jornada"
import type { JornadaSlug } from "@/lib/utils/jornada"
import { Breadcrumb } from "@/components/Breadcrumb"

interface MatchRow { id: string; match_date: string; stage: string; group_name: string | null }
interface PredRow { match_id: string }

interface JornadaSummary {
  slug: JornadaSlug
  firstMatchDate: Date | null
  totalMatches: number
  predictedMatches: number
}

export default async function MatchOverviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rawMatches } = await supabase
    .from("matches")
    .select("id, match_date, stage, group_name")
    .order("match_date", { ascending: true }) as unknown as { data: MatchRow[] | null }

  const { data: rawPredictions } = user ? await supabase
    .from("match_predictions")
    .select("match_id")
    .eq("user_id", user.id)
    .is("league_id", null) as unknown as { data: PredRow[] | null }
    : { data: [] as PredRow[] }

  const matches = rawMatches ?? []
  const predictedSet = new Set((rawPredictions ?? []).map((p) => p.match_id))

  const groupMatches = matches.filter((m) => m.stage === "group")
  const groupRoundIds: Record<"j1" | "j2" | "j3", Set<string>> = {
    j1: getGroupRoundMatchIds(groupMatches, 1),
    j2: getGroupRoundMatchIds(groupMatches, 2),
    j3: getGroupRoundMatchIds(groupMatches, 3),
  }

  const summaries: JornadaSummary[] = JORNADA_SLUGS.map((slug) => {
    const info = JORNADA_INFO[slug]
    let jornadaMatches = matches

    if (info.isGroup) {
      const ids = groupRoundIds[slug as "j1" | "j2" | "j3"]
      jornadaMatches = jornadaMatches.filter((m) => ids.has(m.id))
    } else {
      jornadaMatches = jornadaMatches.filter((m) => m.stage === info.stage)
    }

    const firstMatchDate = jornadaMatches[0] ? new Date(jornadaMatches[0].match_date) : null
    const predictedMatches = jornadaMatches.filter((m) => predictedSet.has(m.id)).length

    return { slug, firstMatchDate, totalMatches: jornadaMatches.length, predictedMatches }
  })

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Breadcrumb crumbs={[
        { label: "Inicio", href: "/dashboard" },
        { label: "Modo Jornada" },
      ]} />
      <h1 className="text-2xl font-bold mb-1">Modo Jornada</h1>
      <p className="text-(--color-muted) mb-8 text-sm">
        Predice el resultado de cada partido antes de que empiece.
      </p>

      <div className="flex flex-col gap-3">
        {summaries.map((summary) => {
          const info = JORNADA_INFO[summary.slug]
          const locked = summary.firstMatchDate ? isMatchLocked(summary.firstMatchDate) : false
          const noMatches = summary.totalMatches === 0
          const allDone = summary.predictedMatches === summary.totalMatches && summary.totalMatches > 0

          return (
            <JornadaCard
              key={summary.slug}
              info={info}
              summary={summary}
              locked={locked}
              noMatches={noMatches}
              allDone={allDone}
            />
          )
        })}
      </div>
    </div>
  )
}

function JornadaCard({
  info,
  summary,
  locked,
  noMatches,
  allDone,
}: {
  info: (typeof JORNADA_INFO)[JornadaSlug]
  summary: JornadaSummary
  locked: boolean
  noMatches: boolean
  allDone: boolean
}) {
  const isDisabled = noMatches || locked

  const statusBadge = () => {
    if (noMatches) return <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-(--color-muted)">Pendiente</span>
    if (locked) return <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-(--color-muted)">Cerrado</span>
    if (allDone) return <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Completo ✓</span>
    return <span className="text-xs px-2 py-0.5 rounded-full bg-accent/15 text-(--color-accent)">Abierto</span>
  }

  const inner = (
    <div className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
      isDisabled
        ? "border-white/8 opacity-50 cursor-not-allowed"
        : "border-white/10 hover:border-accent/40 hover:bg-white/3 cursor-pointer"
    }`}>
      <div className="flex items-center gap-4">
        <div className="text-center w-10">
          <span className="text-lg font-bold text-(--color-accent)">{info.shortLabel}</span>
        </div>
        <div>
          <p className="font-semibold">{info.label}</p>
          {!noMatches && (
            <p className="text-xs text-(--color-muted) mt-0.5">
              {summary.predictedMatches}/{summary.totalMatches} predicciones
            </p>
          )}
          {noMatches && (
            <p className="text-xs text-(--color-muted) mt-0.5">Sin partidos todavía</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {statusBadge()}
        {!isDisabled && (
          <svg className="w-4 h-4 text-(--color-muted)" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
    </div>
  )

  if (isDisabled) return <div>{inner}</div>

  return (
    <Link href={`/predict/match/${summary.slug}`}>
      {inner}
    </Link>
  )
}
