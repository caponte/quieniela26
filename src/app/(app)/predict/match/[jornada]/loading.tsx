function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/8 ${className ?? ""}`} />
}

export default function JornadaLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <Skeleton className="h-4 w-56 mb-6" />

      {/* Title + nav */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>

      {/* Match cards */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-white/8 rounded-2xl p-5 space-y-4">
            {/* Teams row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-6 rounded-sm" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-6 w-12 rounded-full" />
              <div className="flex items-center gap-3 flex-row-reverse">
                <Skeleton className="w-8 h-6 rounded-sm" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
            {/* Score inputs */}
            <div className="flex items-center justify-center gap-4">
              <Skeleton className="h-12 w-16 rounded-xl" />
              <Skeleton className="h-5 w-4" />
              <Skeleton className="h-12 w-16 rounded-xl" />
            </div>
            {/* Bonus row */}
            <Skeleton className="h-10 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}
