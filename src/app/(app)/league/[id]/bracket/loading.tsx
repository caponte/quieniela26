function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/8 ${className ?? ""}`} />
}

export default function LiveBracketLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Skeleton className="h-4 w-48 mb-6" />
      <Skeleton className="h-8 w-28 mb-6" />

      {/* Leaderboard header */}
      <div className="rounded-xl overflow-hidden">
        <Skeleton className="h-9 rounded-t-xl rounded-b-none mb-px" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 bg-white/4 mb-px last:mb-0">
            <Skeleton className="h-3 w-4 shrink-0" />
            <Skeleton className="h-6 w-6 rounded-full shrink-0" />
            <Skeleton className="h-4 w-28 flex-1" />
            <div className="flex gap-2 ml-auto">
              {Array.from({ length: 6 }).map((_, j) => (
                <Skeleton key={j} className="h-4 w-8" />
              ))}
              <Skeleton className="h-5 w-10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
