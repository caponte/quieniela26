function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/8 ${className ?? ""}`} />
}

export default function CreateLeagueLoading() {
  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Skeleton className="h-4 w-48 mb-6" />
      <Skeleton className="h-8 w-40 mb-2" />
      <Skeleton className="h-4 w-64 mb-8" />
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-11 rounded-xl" />
        </div>
        <Skeleton className="h-11 rounded-xl" />
      </div>
    </div>
  )
}
