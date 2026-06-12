function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/8 ${className ?? ""}`} />
}

export default function LeagueBracketLoading() {
  return (
    <div className="py-6 space-y-6">
      <div className="px-4 space-y-2">
        <Skeleton className="h-4 w-64 mb-2" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-48" />
      </div>

      <div className="overflow-x-auto px-4">
        <div className="flex gap-6 min-w-max">
          {[16, 8, 4, 2, 1].map((count, col) => (
            <div key={col} className="flex flex-col gap-3" style={{ width: 160 }}>
              <Skeleton className="h-4 w-24 mb-1" />
              {Array.from({ length: count }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
