"use client"

import { useState, useTransition } from "react"
import { triggerManualSync } from "@/lib/actions/admin"
import type { SyncLog } from "./page"

interface Props {
  initialApiOk: boolean
  mapped: number
  total: number
  logs: SyncLog[]
}

const SOURCE_LABEL: Record<string, string> = {
  cron: "Cron",
  manual: "Manual",
  test: "Test",
}

const SOURCE_COLOR: Record<string, string> = {
  cron: "text-zinc-400",
  manual: "text-blue-400",
  test: "text-yellow-400",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  })
}

export default function SyncPanel({ initialApiOk, mapped, total, logs: initialLogs }: Props) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<string | null>(null)
  const [resultOk, setResultOk] = useState(true)
  const [logs, setLogs] = useState<SyncLog[]>(initialLogs)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function handleTrigger() {
    setResult(null)
    startTransition(async () => {
      const res = await triggerManualSync()
      setResultOk(!res.error)
      setResult(res.error ?? JSON.stringify(res.data, null, 2))

      // Optimistically prepend a log entry so the user sees it immediately
      if (res.data) {
        const newLog: SyncLog = {
          id: crypto.randomUUID(),
          triggered_at: new Date().toISOString(),
          source: "manual",
          synced: (res.data as any).synced ?? null,
          total: (res.data as any).total ?? null,
          errors: (res.data as any).errors ?? null,
          payload: res.data as object,
        }
        setLogs(prev => [newLog, ...prev])
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* API status */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-(--color-muted) uppercase tracking-wide mb-4">Conexión API</h2>
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${initialApiOk ? "bg-green-500" : "bg-red-500"}`} />
          <span className="font-medium">api.fifa.com</span>
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

      {/* Sync history */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-(--color-muted) uppercase tracking-wide mb-4">
          Historial de ejecuciones
        </h2>

        {logs.length === 0 ? (
          <p className="text-sm text-(--color-muted)">Sin registros aún.</p>
        ) : (
          <div className="space-y-2">
            {logs.map(log => {
              const hasErrors = log.errors && log.errors.length > 0
              const isExpanded = expandedId === log.id

              return (
                <div key={log.id} className="bg-zinc-800 rounded-lg overflow-hidden">
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-700 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  >
                    {/* Status dot */}
                    <span className={`w-2 h-2 rounded-full shrink-0 ${hasErrors ? "bg-red-500" : "bg-green-500"}`} />

                    {/* Source badge */}
                    <span className={`text-xs font-medium w-12 shrink-0 ${SOURCE_COLOR[log.source] ?? "text-zinc-400"}`}>
                      {SOURCE_LABEL[log.source] ?? log.source}
                    </span>

                    {/* Timestamp */}
                    <span className="text-xs text-(--color-muted) flex-1">{formatDate(log.triggered_at)}</span>

                    {/* Synced count */}
                    {log.synced != null && (
                      <span className="text-xs text-zinc-400 shrink-0">
                        {log.synced}/{log.total} sincronizados
                      </span>
                    )}

                    {/* Expand arrow */}
                    <span className="text-zinc-500 text-xs shrink-0">{isExpanded ? "▲" : "▼"}</span>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-zinc-700">
                      {hasErrors && (
                        <div className="mt-3 mb-2">
                          <p className="text-xs text-red-400 font-medium mb-1">Errores:</p>
                          {log.errors!.map((e, i) => (
                            <p key={i} className="text-xs text-red-300 font-mono">{e}</p>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-(--color-muted) font-medium mt-3 mb-1">Payload:</p>
                      <pre className="text-xs text-zinc-300 bg-zinc-900 rounded p-3 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
