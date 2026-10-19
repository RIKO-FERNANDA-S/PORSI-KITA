import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Membuat Supabase client untuk dipakai di **server**
 * (Server Component, Server Action, Route Handler).
 *
 * Cara pakai:
 * ```ts
 * import { createClient } from "@/lib/supabase/server";
 * const supabase = await createClient();
 * const { data } = await supabase.from("recipes").select();
 * ```
 *
 * PENTING:
 * - Fungsi ini async karena `cookies()` di Next.js 15+ adalah async.
 * - Selalu buat client baru per-request, JANGAN simpan di variabel global.
 * - Di Server Component, cookie hanya bisa *dibaca* (tidak bisa di-set).
 *   Untuk set cookie (misal refresh token), perlu middleware — lihat
 *   dokumentasi Supabase SSR.
 */
export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Environment variables NEXT_PUBLIC_SUPABASE_URL dan " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY harus diisi di .env.local"
    );
  }

  // await cookies() — di Next.js 15+ cookies() mengembalikan Promise
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // setAll bisa gagal kalau dipanggil dari Server Component
          // (karena Server Component hanya bisa READ cookie, tidak WRITE).
          // Ini aman diabaikan — session refresh akan ditangani middleware.
        }
      },
    },
  });
}
