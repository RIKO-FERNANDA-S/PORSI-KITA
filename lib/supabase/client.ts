import { createBrowserClient } from "@supabase/ssr";

/**
 * Membuat Supabase client untuk dipakai di **browser** (Client Component).
 *
 * Cara pakai:
 * ```ts
 * "use client";
 * import { createClient } from "@/lib/supabase/client";
 * const supabase = createClient();
 * ```
 *
 * createBrowserClient otomatis baca/tulis cookie lewat `document.cookie`,
 * jadi kita TIDAK perlu atur getAll/setAll secara manual.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Environment variables NEXT_PUBLIC_SUPABASE_URL dan " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY harus diisi di .env.local"
    );
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}
