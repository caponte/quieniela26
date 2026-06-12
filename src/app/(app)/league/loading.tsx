function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/8 ${className ?? ""}`} />
}

export default function LeaguesLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Skeleton className="h-4 w-40 mb-6" />
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
