import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { normalizePhone } from '@/lib/phone';
import { hashPassword, setSessionCookie } from '@/lib/auth-session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { newPassword, confirmPassword, phone } = body;

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Kata sandi baru minimal 6 karakter demi keamanan akun.' },
        { status: 400 }
      );
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'Ulangi kata sandi tidak cocok dengan kata sandi baru.' },
        { status: 400 }
      );
    }

    const hashedPassword = hashPassword(newPassword);

    // 1. Coba update password di Supabase Auth jika ada user aktif
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase.auth.updateUser({
          password: newPassword,
          data: {
            has_password: true,
            password_set_at: new Date().toISOString(),
          },
        });
      }
    } catch (authErr) {
      console.warn('Supabase auth password update notice:', authErr);
    }

    // 2. Update password_hash dan has_password di database PostgreSQL Prisma
    let targetPhone = '';
    if (phone) {
      targetPhone = normalizePhone(phone);
    }

    const cleanPhone = targetPhone.replace(/\D/g, '');
    const localPhone = cleanPhone.startsWith('62') ? '0' + cleanPhone.slice(2) : cleanPhone;

    // Cari family yang akan diupdate
    let family = await prisma.family.findFirst({
      where: {
        OR: [
          ...(targetPhone
            ? [
                { phone: targetPhone },
                { phone: cleanPhone },
                { phone: localPhone },
                { phone: `+${cleanPhone}` },
              ]
            : []),
        ],
      },
    });

    if (family) {
      family = await prisma.family.update({
        where: { id: family.id },
        data: {
          has_password: true,
          password_hash: hashedPassword,
        },
      });
    } else if (targetPhone) {
      await prisma.family.updateMany({
        where: {
          OR: [
            { phone: targetPhone },
            { phone: cleanPhone },
            { phone: localPhone },
            { phone: `+${cleanPhone}` },
          ],
        },
        data: {
          has_password: true,
          password_hash: hashedPassword,
        },
      });
    }

    const response = NextResponse.json({
      success: true,
      message: 'Kata sandi berhasil disimpan! Akun keluarga Anda kini terlindungi.',
    });

    if (family) {
      setSessionCookie(response, {
        phone: family.phone || targetPhone,
        alias: family.alias,
        hasPassword: true,
        createdAt: family.created_at.toISOString(),
        familyId: family.id,
        ownerId: family.owner_id,
      });
    }

    return response;
  } catch (err: any) {
    console.error('Error set password:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal menyimpan kata sandi.' },
      { status: 500 }
    );
  }
}
