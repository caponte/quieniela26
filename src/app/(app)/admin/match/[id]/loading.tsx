function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/8 ${className ?? ""}`} />
}

export default function AdminMatchLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-4 w-48 mb-2" />
      <Skeleton className="h-8 w-56" />

      {/* Score editor */}
      <div className="border border-white/8 rounded-2xl p-5 space-y-4">
        <Skeleton className="h-5 w-32" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-5 w-6 shrink-0" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
        <Skeleton className="h-11 rounded-xl" />
      </div>

      {/* Events section */}
      <div className="border border-white/8 rounded-2xl p-5 space-y-3">
        <Skeleton className="h-5 w-28" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 rounded-lg" />
        ))}
        <Skeleton className="h-11 rounded-xl mt-2" />
      </div>
    </div>
  )
}
