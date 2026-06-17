export default function Loading() {
  return (
    <div className="space-y-10 animate-pulse">
      <div className="h-4 w-48 bg-white/5 rounded" />
      <div className="space-y-3">
        <div className="h-8 w-64 bg-white/5 rounded" />
        <div className="h-4 w-40 bg-white/5 rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="h-64 bg-white/5 rounded-xl" />
      <div className="h-48 bg-white/5 rounded-xl" />
      <div className="h-96 bg-white/5 rounded-xl" />
    </div>
  )
}
