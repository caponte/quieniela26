function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/8 ${className ?? ""}`} />
}

function MatchCard() {
  return (
    <div className="rounded-xl overflow-hidden bg-white/4">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="space-y-1 text-right">
          <Skeleton className="h-5 w-16 ml-auto" />
          <Skeleton className="h-3 w-20 ml-auto" />
        </div>
      </div>
      <div className="px-4 py-2.5 space-y-2">
        <div className="flex gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  )
}

export default function PlayerJornadaDetailLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Skeleton className="h-4 w-64 mb-6" />

      {/* Player header */}
      <div className="flex items-center gap-3 mb-8">
        <Skeleton className="h-11 w-11 rounded-full shrink-0" />
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="ml-auto text-right space-y-1">
          <Skeleton className="h-8 w-12 ml-auto" />
          <Skeleton className="h-3 w-24 ml-auto" />
        </div>
      </div>

      {/* Stage groups */}
      {[4, 3].map((count, gi) => (
        <div key={gi} className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-12" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: count }).map((_, i) => (
              <MatchCard key={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
