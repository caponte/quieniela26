function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/8 ${className ?? ""}`} />
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Greeting */}
      <section className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </section>

      {/* Quick action cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-44 rounded-2xl" />
      </section>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Próximos partidos */}
        <section className="space-y-3">
          <Skeleton className="h-6 w-40" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </section>

        {/* Mis ligas + leaderboard */}
        <section className="space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-14 rounded-xl" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-36" />
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-xl" />
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
