function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/8 ${className ?? ""}`} />
}

export default function LeagueJornadaLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Skeleton className="h-4 w-48 mb-6" />

      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>

      <div className="rounded-xl overflow-hidden">
        <Skeleton className="h-9 rounded-t-xl rounded-b-none mb-px" />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="grid grid-cols-[1.5rem_1fr_3rem_1.5rem] gap-2 px-4 py-3 items-center bg-white/4 mb-px last:mb-0">
            <Skeleton className="h-3 w-3" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full shrink-0" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-4 w-8 ml-auto" />
            <Skeleton className="h-3 w-3" />
          </div>
        ))}
      </div>
    </div>
  )
}
