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

  if (!supabaseUrl || !supabaseKey) {
    // Jika env belum diset, lanjutkan request agar halaman demo/publik tetap berjalan
    return supabaseResponse;
  }

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

  // Ambil user aktif dari session cookie
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isAuthRoute = pathname === '/masuk' || pathname === '/daftar' || pathname === '/login' || pathname === '/register';
  const isProtectedRoute =
    pathname.startsWith('/keluarga') ||
    pathname.startsWith('/menu') ||
    pathname.startsWith('/belanja') ||
    pathname.startsWith('/mulai');

  // Jika belum login dan mengakses halaman privat, arahkan ke /masuk
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/masuk';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Jika sudah login dan mengakses halaman auth (/masuk atau /daftar), arahkan ke /keluarga
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/keluarga';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
