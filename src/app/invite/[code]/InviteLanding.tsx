"use client"

import { useState, useTransition } from "react"
import { signInWithGoogle } from "@/lib/actions/auth"

interface Props {
  leagueName: string
  code: string
}

export default function InviteLanding({ leagueName, code }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSignIn() {
    startTransition(async () => {
      try {
        const url = await signInWithGoogle(`/invite/${code}`)
        if (url) window.location.href = url
      } catch {
        setError("No se pudo iniciar el proceso. Intenta de nuevo.")
      }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        {/* Logo */}
        <p className="text-4xl mb-6">⚽</p>
        <h1 className="text-2xl font-extrabold tracking-tight mb-1">
          Quiniela <span className="text-(--color-accent)">2026</span>
        </h1>

        {/* Invite card */}
        <div className="mt-8 bg-(--color-surface) border border-(--color-border) rounded-2xl p-6">
          <p className="text-(--color-muted) text-sm mb-1">Te invitaron a unirte a</p>
          <p className="text-xl font-bold mb-6">{leagueName}</p>

          <button
            onClick={handleSignIn}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold py-3 px-4 rounded-xl hover:bg-white/90 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <span className="text-sm">Redirigiendo...</span>
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="text-sm">Continuar con Google</span>
              </>
            )}
          </button>

          {error && (
            <p className="text-sm text-red-400 mt-3">{error}</p>
          )}

          <p className="text-xs text-(--color-muted) mt-4">
            Al continuar, se creará tu cuenta y quedarás unido a la liga automáticamente.
          </p>
        </div>
      </div>
    </div>
  )
}
