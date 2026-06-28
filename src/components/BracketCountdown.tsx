"use client"

import { useEffect, useState } from "react"
import { BRACKET_LOCK_TIME } from "@/lib/utils/bracket"

function formatParts(ms: number) {
  const s = Math.floor(ms / 1000)
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    mins: Math.floor((s % 3600) / 60),
    secs: s % 60,
  }
}

export function BracketCountdown({
  variant = "banner",
  lockTime,
}: {
  variant?: "banner" | "compact"
  lockTime?: Date | null
}) {
  const lockMs = (lockTime ?? BRACKET_LOCK_TIME).getTime()
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    const get = () => Math.max(0, lockMs - Date.now())
    setRemaining(get())
    const id = setInterval(() => {
      const r = get()
      setRemaining(r)
      if (r === 0) clearInterval(id)
    }, 1000)
    return () => clearInterval(id)
  }, [lockMs])

  if (remaining === null || remaining === 0) return null

  const { days, hours, mins, secs } = formatParts(remaining)
  const pad = (n: number) => String(n).padStart(2, "0")

  if (variant === "compact") {
    return (
      <span className="inline-flex items-center gap-1.5 text-amber-400 font-mono font-semibold tabular-nums text-sm">
        <span>⏱</span>
        {days > 0 && <><span>{days}</span><span className="text-xs text-amber-300/60 font-normal">d</span></>}
        <span>{pad(hours)}</span><span className="text-xs text-amber-300/60 font-normal">h</span>
        <span>{pad(mins)}</span><span className="text-xs text-amber-300/60 font-normal">m</span>
        <span>{pad(secs)}</span><span className="text-xs text-amber-300/60 font-normal">s</span>
      </span>
    )
  }

  return (
    <div className="flex items-center gap-3 bg-amber-950/50 border border-amber-700/50 rounded-xl px-4 py-3">
      <span className="text-xl shrink-0">⏱</span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-300/60 leading-none mb-1">
          Bracket cierra en
        </p>
        <p className="font-mono font-bold text-amber-300 tabular-nums leading-none">
          {days > 0 && (
            <><span className="text-2xl">{days}</span><span className="text-xs font-normal text-amber-300/60 mr-2">d</span></>
          )}
          <span className="text-2xl">{pad(hours)}</span><span className="text-xs font-normal text-amber-300/60 mr-2">h</span>
          <span className="text-2xl">{pad(mins)}</span><span className="text-xs font-normal text-amber-300/60 mr-2">m</span>
          <span className="text-2xl">{pad(secs)}</span><span className="text-xs font-normal text-amber-300/60">s</span>
        </p>
      </div>
    </div>
  )
}
