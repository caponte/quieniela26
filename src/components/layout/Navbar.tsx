import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

interface UserProfile {
  name: string;
  avatar_url: string | null;
  role: string;
}

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: UserProfile | null = null;
  if (user) {
    const { data } = await supabase
      .from("users")
      .select("name, avatar_url, role")
      .eq("id", user.id)
      .single();
    profile = data as UserProfile | null;
  }

  return (
    <header className="bg-(--color-surface) border-b border-(--color-border) sticky top-0 z-50">
      <nav className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link
          href="/dashboard"
          className="font-extrabold text-lg tracking-tight flex items-center gap-2"
        >
          <span>⚽</span>
          <span>
            Quiniela <span className="text-(--color-accent)">2026</span>
          </span>
        </Link>

        <div className="flex items-center gap-1 text-sm">
          <Link
            href="/dashboard"
            className="px-3 py-1.5 rounded-lg text-(--color-muted) hover:text-foreground hover:bg-(--color-surface-2) transition"
          >
            Inicio
          </Link>
          <Link
            href="/predict/bracket"
            className="px-3 py-1.5 rounded-lg text-(--color-muted) hover:text-foreground hover:bg-(--color-surface-2) transition"
          >
            Bracket
          </Link>
          <Link
            href="/league/create"
            className="px-3 py-1.5 rounded-lg text-(--color-muted) hover:text-foreground hover:bg-(--color-surface-2) transition"
          >
            Ligas
          </Link>
          {profile?.role === "admin" && (
            <Link
              href="/admin"
              className="px-3 py-1.5 rounded-lg text-yellow-400 hover:bg-(--color-surface-2) transition"
            >
              Admin
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          {profile?.avatar_url ? (
            <Link href="/profile">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={profile.avatar_url}
                alt={profile.name}
                className="w-8 h-8 rounded-full object-cover border border-(--color-border)"
              />
            </Link>
          ) : (
            <Link
              href="/profile"
              className="w-8 h-8 rounded-full bg-(--color-surface-2) flex items-center justify-center text-sm font-bold"
            >
              {profile?.name?.[0]?.toUpperCase() ?? "?"}
            </Link>
          )}
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="text-xs text-(--color-muted) hover:text-foreground transition px-2 py-1"
            >
              Salir
            </button>
          </form>
        </div>
      </nav>
    </header>
  );
}
