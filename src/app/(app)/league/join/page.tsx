"use client"

import { useActionState } from "react"
import { joinLeague } from "@/lib/actions/league"
import Link from "next/link"

export default function JoinLeaguePage() {
  const [state, action, isPending] = useActionState(joinLeague, null)

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <Link href="/league" className="text-sm text-(--color-muted) hover:text-white transition flex items-center gap-1 mb-8">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Mis ligas
      </Link>

      <h1 className="text-2xl font-bold mb-1">Unirse a una liga</h1>
      <p className="text-(--color-muted) text-sm mb-8">
        Ingresa el código de invitación que te compartió el dueño de la liga.
      </p>

      <form action={action} className="flex flex-col gap-4">
        <div>
          <label htmlFor="code" className="text-xs font-semibold uppercase tracking-widest text-(--color-muted) block mb-2">
            Código de invitación
          </label>
          <input
            id="code"
            name="code"
            type="text"
            required
            maxLength={20}
            placeholder="Ej: A1B2C3D4"
            autoFocus
            autoCapitalize="characters"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-(--color-muted) focus:outline-none focus:border-accent/60 font-mono tracking-widest uppercase"
          />
        </div>

        {state?.error && (
          <p className="text-sm text-red-400">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3 rounded-xl font-semibold text-sm bg-(--color-accent) text-black hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed mt-2"
        >
          {isPending ? "Uniéndose..." : "Unirse a la liga"}
        </button>
      </form>
    </div>
  )
}
