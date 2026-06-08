"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { deleteLeague, kickMember, leaveLeague } from "@/lib/actions/league"

interface Props {
  leagueId: string
  isOwner: boolean
  currentUserId: string
  // Header mode (invite code + leave/delete)
  inviteCode?: string
  // Kick mode (per-member row)
  kickTargetId?: string
  kickTargetName?: string
}

export default function LeagueActions({
  leagueId,
  isOwner,
  currentUserId,
  inviteCode,
  kickTargetId,
  kickTargetName,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function copyCode() {
    if (!inviteCode) return
    navigator.clipboard.writeText(inviteCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function copyInviteLink() {
    if (!inviteCode) return
    const link = `${window.location.origin}/invite/${inviteCode}`
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleDelete() {
    if (!confirm(`¿Eliminar la liga "${leagueId}"? Esta acción no se puede deshacer.`)) return
    startTransition(async () => {
      const res = await deleteLeague(leagueId)
      if (res?.error) setError(res.error)
    })
  }

  function handleLeave() {
    if (!confirm("¿Salir de esta liga?")) return
    startTransition(async () => {
      const res = await leaveLeague(leagueId)
      if (res?.error) setError(res.error)
    })
  }

  function handleKick() {
    if (!kickTargetId) return
    if (!confirm(`¿Expulsar a ${kickTargetName} de la liga?`)) return
    startTransition(async () => {
      const res = await kickMember(leagueId, kickTargetId)
      if (res?.error) {
        setError(res.error)
      } else {
        router.refresh()
      }
    })
  }

  // ── Kick button mode ────────────────────────────────────────────────────
  if (kickTargetId) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={handleKick}
          disabled={isPending}
          className="text-xs text-red-400 hover:text-red-300 transition disabled:opacity-50"
        >
          {isPending ? "Expulsando..." : "Expulsar"}
        </button>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }

  // ── Header mode ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-end gap-2">
      {inviteCode && (
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={copyInviteLink}
            className="flex items-center gap-1.5 text-sm font-semibold bg-(--color-accent) text-black px-3 py-1.5 rounded-lg hover:opacity-90 transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            {copied ? "✓ Link copiado" : "Invitar"}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono tracking-widest text-(--color-muted)">
              Código: {inviteCode}
            </span>
            <button
              onClick={copyCode}
              className="text-xs text-(--color-muted) hover:text-white transition"
              title="Copiar código"
            >
              Copiar
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex items-center gap-2">
        {isOwner ? (
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="text-xs text-red-400 hover:text-red-300 transition disabled:opacity-50"
          >
            {isPending ? "Eliminando..." : "Eliminar liga"}
          </button>
        ) : (
          <button
            onClick={handleLeave}
            disabled={isPending}
            className="text-xs text-(--color-muted) hover:text-white transition disabled:opacity-50"
          >
            {isPending ? "Saliendo..." : "Salir de la liga"}
          </button>
        )}
      </div>
    </div>
  )
}
