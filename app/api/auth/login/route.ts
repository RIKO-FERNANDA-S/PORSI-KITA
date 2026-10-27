import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizePhone } from '@/lib/phone';
import { verifyPassword, setSessionCookie } from '@/lib/auth-session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, password } = body;

    if (!phone || !password) {
      return NextResponse.json(
        { error: 'Nomor WhatsApp dan kata sandi wajib diisi.' },
        { status: 400 }
      );
    }

    const formattedPhone = normalizePhone(phone);
    const cleanPhone = formattedPhone.replace(/\D/g, '');
    const localPhone = cleanPhone.startsWith('62') ? '0' + cleanPhone.slice(2) : cleanPhone;

    // Cari family di database berdasarkan nomor HP
    const family = await prisma.family.findFirst({
      where: {
        OR: [
          { phone: formattedPhone },
          { phone: cleanPhone },
          { phone: localPhone },
          { phone: `+${cleanPhone}` },
        ],
      },
    });

    if (!family) {
      return NextResponse.json(
        { error: 'Nomor WhatsApp belum terdaftar di sistem Porsi Kita. Silakan buat akun baru terlebih dahulu.' },
        { status: 404 }
      );
    }

    // Jika akun belum membuat kata sandi
    if (!family.has_password || !family.password_hash) {
      return NextResponse.json(
        { error: 'Ibu belum membuat kata sandi. Silakan tekan tombol "Belum Buat Kata Sandi" di bawah.' },
        { status: 400 }
      );
    }

    // Verifikasi password terhadap hash yang tersimpan
    const isPasswordValid = verifyPassword(password, family.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Nomor WhatsApp atau kata sandi tidak cocok. Silakan coba kembali atau gunakan Lupa Kata Sandi.' },
        { status: 400 }
      );
    }

    // Sukses: Buat response dan set session cookie resmi
    const response = NextResponse.json({
      success: true,
      redirect: '/dashboard',
      user: {
        id: family.owner_id || family.id,
        phone: formattedPhone,
        alias: family.alias,
        hasPassword: true,
        createdAt: family.created_at.toISOString(),
      },
    });

    setSessionCookie(response, {
      phone: formattedPhone,
      alias: family.alias,
      hasPassword: true,
      createdAt: family.created_at.toISOString(),
      familyId: family.id,
      ownerId: family.owner_id,
    });

    return response;
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: err.message || 'Terjadi kesalahan saat memproses login.' },
      { status: 500 }
    );
  }
}
