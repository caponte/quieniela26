"use client"

import { useActionState } from "react"
import { createLeague } from "@/lib/actions/league"
import Link from "next/link"

export default function CreateLeaguePage() {
  const [state, action, isPending] = useActionState(createLeague, null)

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <Link href="/league" className="text-sm text-(--color-muted) hover:text-white transition flex items-center gap-1 mb-8">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Mis ligas
      </Link>

      <h1 className="text-2xl font-bold mb-1">Crear liga</h1>
      <p className="text-(--color-muted) text-sm mb-8">
        Invita a tus amigos con el código que se genera automáticamente.
      </p>

      <form action={action} className="flex flex-col gap-4">
        <div>
          <label htmlFor="name" className="text-xs font-semibold uppercase tracking-widest text-(--color-muted) block mb-2">
            Nombre de la liga
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={50}
            placeholder="Ej: Los Amigos del Trabajo"
            autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm placeholder:text-(--color-muted) focus:outline-none focus:border-accent/60"
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
          {isPending ? "Creando..." : "Crear liga"}
        </button>
      </form>
    </div>
  )
}
