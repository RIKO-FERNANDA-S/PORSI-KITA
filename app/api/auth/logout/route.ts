import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SESSION_COOKIE_NAME } from '@/lib/auth-session';

export async function POST(req: NextRequest) {
  try {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {
      // Abaikan jika supabase auth offline
    }

    const response = NextResponse.json({
      success: true,
      message: 'Berhasil keluar dari akun.',
    });

    response.cookies.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    });

    return response;
  } catch (err: any) {
    console.error('Logout error:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal logout.' },
      { status: 500 }
    );
  }
}
