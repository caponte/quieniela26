function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/8 ${className ?? ""}`} />
}

export default function LeagueDetailLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Skeleton className="h-4 w-48 mb-6" />

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      {/* Leaderboard grid header */}
      <Skeleton className="h-10 rounded-t-xl mb-px" />
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-14 rounded-none mb-px" />
      ))}
      <Skeleton className="h-14 rounded-b-xl" />
    </div>
  )
}
