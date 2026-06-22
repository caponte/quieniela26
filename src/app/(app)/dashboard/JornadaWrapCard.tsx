import Link from "next/link"
import Image from "next/image"
import statsImg from "@/assets/img/stats.jpeg"

export default function JornadaWrapCard() {
  return (
    <Link
      href="/wrap/j1"
      className="sm:col-span-2 lg:col-span-1 group relative overflow-hidden rounded-2xl h-44 flex flex-col justify-end"
    >
      <Image
        src={statsImg}
        alt="Estadísticas"
        fill
        className="object-cover object-center transition duration-300 group-hover:scale-105"
        sizes="(max-width: 640px) 100vw, 50vw"
      />
      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent" />

      <div className="relative px-5 pb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-yellow-400 mb-0.5">Resumen</p>
        <h2 className="font-bold text-lg text-white leading-tight">Jornada Wrap</h2>
        <p className="text-white/60 text-xs mt-1 leading-snug">Exactos, goleadores y estadísticas del grupo.</p>
      </div>

      <div className="absolute top-3 right-4 flex items-center gap-2">
        <span className="bg-yellow-400 text-black text-[10px] font-bold uppercase tracking-widest rounded-full px-2 py-0.5">
          NEW
        </span>
        <div className="bg-black/40 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5 text-xs font-medium text-white/80 group-hover:text-yellow-300 transition-colors">
          <span>⚡</span> STATS
        </div>
      </div>
    </Link>
  )
}
