import Link from "next/link"

interface Crumb {
  label: string
  href?: string
}

export function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-(--color-muted) mb-8">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-white/20 select-none">/</span>}
          {crumb.href ? (
            <Link href={crumb.href} className="hover:text-white transition-colors">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-white/80">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
