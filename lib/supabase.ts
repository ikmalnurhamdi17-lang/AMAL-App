import { createBrowserClient } from "@supabase/ssr"

export function getSupabase() {
  // Langsung return tanpa menyimpan instance di variabel luar
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}