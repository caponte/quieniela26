function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/8 ${className ?? ""}`} />
}

export default function AdminStatusLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-64" />

      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="border border-white/8 rounded-2xl p-5 space-y-3">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  )
}
