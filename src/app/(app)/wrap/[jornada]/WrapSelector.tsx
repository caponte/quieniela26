"use client"
import { useRouter } from "next/navigation"

const WRAP_OPTIONS = [
  { slug: "j1",    label: "Jornada 1" },
  { slug: "j2",    label: "Jornada 2" },
  { slug: "j3",    label: "Jornada 3" },
  { slug: "r32",   label: "Ronda de 32" },
  { slug: "r16",   label: "Octavos" },
  { slug: "qf",    label: "Cuartos" },
  { slug: "sf",    label: "Semis" },
  { slug: "final", label: "Final" },
  { slug: "total", label: "⚡ Total acumulado" },
]

export function WrapSelector({ current }: { current: string }) {
  const router = useRouter()
  return (
    <select
      value={current}
      onChange={(e) => router.push(`/wrap/${e.target.value}`)}
      className="bg-(--color-surface) border border-(--color-border) rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-(--color-accent) cursor-pointer"
    >
      {WRAP_OPTIONS.map((o) => (
        <option key={o.slug} value={o.slug} className="bg-neutral-900">
          {o.label}
        </option>
      ))}
    </select>
  )
}
