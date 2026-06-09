import { createClient } from "@/lib/supabase/server"
import { NavbarClient } from "./NavbarClient"

export async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile: { name: string; avatar_url: string | null; role: string } | null = null
  if (user) {
    const { data } = await supabase
      .from("users")
      .select("name, avatar_url, role")
      .eq("id", user.id)
      .single()
    profile = data as typeof profile
  }

  return <NavbarClient profile={profile} />
}
