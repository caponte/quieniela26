"use client"

import { useRef, useEffect } from "react"

export default function RecentMatchesScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) ref.current.scrollLeft = ref.current.scrollWidth
  }, [])

  return (
    <div
      ref={ref}
      className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory
        [&::-webkit-scrollbar]:h-1
        [&::-webkit-scrollbar-track]:rounded-full
        [&::-webkit-scrollbar-track]:bg-white/5
        [&::-webkit-scrollbar-thumb]:rounded-full
        [&::-webkit-scrollbar-thumb]:bg-white/20
        hover:[&::-webkit-scrollbar-thumb]:bg-white/35"
    >
      {children}
    </div>
  )
}
