"use client"

import { useState } from "react"
import Link from "next/link"

interface Props {
  profile: { name: string; avatar_url: string | null; role: string } | null
}

export function NavbarClient({ profile }: Props) {
  const [open, setOpen] = useState(false)

  const close = () => setOpen(false)

  const navLinks = (
    <>
      <Link href="/dashboard"      onClick={close} className="px-3 py-2.5 rounded-lg text-sm text-(--color-muted) hover:text-(--color-foreground) hover:bg-(--color-surface-2) transition">Inicio</Link>
      <Link href="/predict/bracket" onClick={close} className="px-3 py-2.5 rounded-lg text-sm text-(--color-muted) hover:text-(--color-foreground) hover:bg-(--color-surface-2) transition">Bracket</Link>
      <Link href="/predict/match"   onClick={close} className="px-3 py-2.5 rounded-lg text-sm text-(--color-muted) hover:text-(--color-foreground) hover:bg-(--color-surface-2) transition">Jornada</Link>
      <Link href="/league"          onClick={close} className="px-3 py-2.5 rounded-lg text-sm text-(--color-muted) hover:text-(--color-foreground) hover:bg-(--color-surface-2) transition">Ligas</Link>
      {profile?.role === "admin" && (
        <Link href="/admin" onClick={close} className="px-3 py-2.5 rounded-lg text-sm text-yellow-400 hover:bg-(--color-surface-2) transition">Admin</Link>
      )}
    </>
  )

  return (
    <header className="bg-(--color-surface) border-b border-(--color-border) sticky top-0 z-50">
      <nav className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/dashboard" onClick={close} className="font-extrabold text-lg tracking-tight flex items-center gap-2 shrink-0">
          <span>⚽</span>
          <span>Quiniela <span className="text-(--color-accent)">2026</span></span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1 text-sm flex-1 justify-center">
          {navLinks}
        </div>

        {/* Desktop: avatar + logout */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <Avatar profile={profile} onClick={close} />
          <SignOutButton />
        </div>

        {/* Mobile: avatar + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <Avatar profile={profile} onClick={close} />
          <button
            onClick={() => setOpen(o => !o)}
            className="w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-lg hover:bg-(--color-surface-2) transition"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
          >
            <span className={`block w-5 h-0.5 bg-(--color-foreground) transition-all duration-200 ${open ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block w-5 h-0.5 bg-(--color-foreground) transition-all duration-200 ${open ? "opacity-0" : ""}`} />
            <span className={`block w-5 h-0.5 bg-(--color-foreground) transition-all duration-200 ${open ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t border-(--color-border) bg-(--color-surface) px-3 pb-3 pt-2 flex flex-col gap-0.5">
          {navLinks}
          <div className="border-t border-(--color-border) mt-1 pt-1">
            <SignOutButton fullWidth />
          </div>
        </div>
      )}
    </header>
  )
}

function Avatar({ profile, onClick }: { profile: Props["profile"]; onClick: () => void }) {
  if (profile?.avatar_url) {
    return (
      <Link href="/profile" onClick={onClick}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={profile.avatar_url}
          alt={profile.name}
          className="w-8 h-8 rounded-full object-cover border border-(--color-border)"
        />
      </Link>
    )
  }
  return (
    <Link href="/profile" onClick={onClick} className="w-8 h-8 rounded-full bg-(--color-surface-2) flex items-center justify-center text-sm font-bold">
      {profile?.name?.[0]?.toUpperCase() ?? "?"}
    </Link>
  )
}

function SignOutButton({ fullWidth }: { fullWidth?: boolean }) {
  return (
    <form action="/auth/signout" method="POST">
      <button
        type="submit"
        className={`text-sm text-(--color-muted) hover:text-(--color-foreground) transition px-3 py-2.5 rounded-lg hover:bg-(--color-surface-2) ${
          fullWidth ? "w-full text-left" : ""
        }`}
      >
        Cerrar sesión
      </button>
    </form>
  )
}
