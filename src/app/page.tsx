import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  const { error } = await searchParams;

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-8">
        <span className="text-6xl" role="img" aria-label="soccer ball">
          ⚽
        </span>
      </div>

      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-3">
        Quiniela{" "}
        <span className="text-(--color-accent)">Mundial 2026</span>
      </h1>

      <p className="text-(--color-muted) text-lg max-w-md mb-10">
        Predice resultados, compite con amigos y demuestra que conoces el
        fútbol. USA · Canadá · México.
      </p>

      <div className="flex flex-col items-center gap-4 w-full max-w-xs">
        <GoogleSignInButton />

        {error && (
          <p className="text-red-400 text-sm">
            Error al iniciar sesión. Inténtalo de nuevo.
          </p>
        )}
      </div>

      <div className="mt-16 grid grid-cols-3 gap-6 text-center max-w-lg w-full">
        <div className="bg-(--color-surface) rounded-xl p-4">
          <p className="text-2xl font-bold text-(--color-accent)">2</p>
          <p className="text-xs text-(--color-muted) mt-1">modos de juego</p>
        </div>
        <div className="bg-(--color-surface) rounded-xl p-4">
          <p className="text-2xl font-bold text-(--color-accent)">48</p>
          <p className="text-xs text-(--color-muted) mt-1">equipos</p>
        </div>
        <div className="bg-(--color-surface) rounded-xl p-4">
          <p className="text-2xl font-bold text-(--color-accent)">104</p>
          <p className="text-xs text-(--color-muted) mt-1">partidos</p>
        </div>
      </div>
    </main>
  );
}
