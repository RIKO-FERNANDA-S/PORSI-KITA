import { createBrowserClient } from "@supabase/ssr";

/**
 * Membuat Supabase client untuk dipakai di **browser** (Client Component).
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';

  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      "Supabase URL atau Key belum diset. Fitur autentikasi online akan terbatas ke mode demo lokal."
    );
  }

  return createBrowserClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder');
}
