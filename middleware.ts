import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';

  let hasSupabaseUser = false;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

            supabaseResponse = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });

            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      });

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        hasSupabaseUser = true;
      }
    } catch {
      // Abaikan jika Supabase auth offline atau rate limit
    }
  }

  // Periksa session cookie internal Porsi Kita
  const sessionCookie = request.cookies.get('porsi_kita_session')?.value;
  const hasAppSession = Boolean(sessionCookie && sessionCookie.length > 10);

  const isAuthenticated = hasAppSession || hasSupabaseUser;

  const { pathname } = request.nextUrl;

  const isAuthRoute =
    pathname === '/masuk' ||
    pathname === '/daftar' ||
    pathname === '/login' ||
    pathname === '/register';

  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/menu') ||
    pathname.startsWith('/dompet') ||
    pathname.startsWith('/belanja') ||
    pathname.startsWith('/keluarga');

  // Jika belum login dan mengakses halaman yang dilindungi
  if (!isAuthenticated && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/masuk';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Jika sudah terautentikasi dan mengakses halaman login/register utama tanpa query khusus
  if (isAuthenticated && isAuthRoute && !request.nextUrl.searchParams.has('tab')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
