"use client"

import { useState, useTransition } from "react"
import { triggerManualSync } from "@/lib/actions/admin"

interface Props {
  initialApiOk: boolean
  mapped: number
  total: number
}

export default function SyncPanel({ initialApiOk, mapped, total }: Props) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)
  const [resultOk, setResultOk] = useState(true)

  function handleTrigger() {
    setResult(null)
    startTransition(async () => {
      const res = await triggerManualSync()
      setResultOk(!res.error)
      setResult(res.error ?? JSON.stringify(res.data, null, 2))
    })
  }

  return (
    <div className="space-y-6">
      {/* API status */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-(--color-muted) uppercase tracking-wide mb-4">Conexión API</h2>
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${initialApiOk ? "bg-green-500" : "bg-red-500"}`} />
          <span className="font-medium">football-data.org</span>
          <span className={`text-sm ${initialApiOk ? "text-green-400" : "text-red-400"}`}>
            {initialApiOk ? "Conectado" : "Sin conexión"}
          </span>
        </div>
      </div>

      {/* Mapping stats */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-(--color-muted) uppercase tracking-wide mb-4">Partidos mapeados</h2>
        <div className="flex items-end gap-2">
          <span className="text-4xl font-bold">{mapped}</span>
          <span className="text-xl text-(--color-muted) mb-1">/ {total}</span>
        </div>
        <div className="mt-3 h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-(--color-accent) rounded-full"
            style={{ width: `${total > 0 ? (mapped / total) * 100 : 0}%` }}
          />
        </div>
        <p className="text-xs text-(--color-muted) mt-2">
          {total - mapped} sin mapear — se resuelven tras el grupo stage
        </p>
      </div>

      {/* Manual trigger */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-(--color-muted) uppercase tracking-wide mb-1">Sync manual</h2>
        <p className="text-xs text-(--color-muted) mb-4">
          Ejecuta el sync ahora sin esperar al cron de GitHub Actions.
        </p>
        <button
          onClick={handleTrigger}
          disabled={isPending}
          className="px-5 py-2 bg-(--color-accent) text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isPending ? "Sincronizando…" : "Ejecutar sync ahora"}
        </button>

        {result && (
          <pre className={`mt-4 text-xs bg-zinc-800 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap ${resultOk ? "text-green-300" : "text-red-400"}`}>
            {result}
          </pre>
        )}
      </div>
    </div>
  )
}
