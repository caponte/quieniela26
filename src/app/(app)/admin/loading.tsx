function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/8 ${className ?? ""}`} />
}

export default function AdminLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between mb-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>

      {/* Match rows */}
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
