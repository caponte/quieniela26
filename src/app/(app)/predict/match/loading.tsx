function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/8 ${className ?? ""}`} />
}

export default function MatchOverviewLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <Skeleton className="h-4 w-40 mb-6" />

      {/* Title */}
      <Skeleton className="h-8 w-44 mb-2" />
      <Skeleton className="h-4 w-80 mb-8" />

      {/* Jornada cards */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
