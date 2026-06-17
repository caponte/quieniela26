import Link from "next/link"

export default function JornadaWrapCard() {
  return (
    <Link
      href="/wrap/j1"
      className="sm:col-span-2 lg:col-span-1 group relative overflow-hidden rounded-2xl h-44 flex flex-col justify-end"
    >
      {/* Gradient background */}
      <div className="absolute inset-0 bg-linear-to-br from-amber-950 via-yellow-950/80 to-neutral-900" />

      {/* Big decorative icon */}
      <div className="absolute inset-0 flex items-center justify-end pr-6 opacity-[0.07] text-[140px] select-none pointer-events-none leading-none">
        ⚡
      </div>

      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-transparent" />

      <div className="relative px-5 pb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-yellow-400/70 mb-0.5">Resumen</p>
        <h2 className="font-bold text-lg text-white leading-tight">Jornada 1 · Wrap</h2>
        <p className="text-white/60 text-xs mt-1 leading-snug">Exactos, goleadores y estadísticas del grupo.</p>
      </div>

      <div className="absolute top-3 right-4 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5 text-xs font-medium text-white/80 group-hover:text-yellow-300 transition-colors">
        <span>⚡</span> STATS
      </div>
    </Link>
  )
}
