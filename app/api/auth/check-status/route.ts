import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { normalizePhone } from '../send-otp/route';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { phone } = body;

    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    let targetPhone = '';
    if (phone) {
      targetPhone = normalizePhone(phone);
    } else if (authUser?.user_metadata?.phone) {
      targetPhone = authUser.user_metadata.phone;
    }

    // Cari family berdasarkan owner_id atau phone
    let family = null;

    if (authUser?.id) {
      family = await prisma.family.findFirst({
        where: { owner_id: authUser.id },
      });
    }

    if (!family && targetPhone) {
      const cleanPhone = targetPhone.replace(/\D/g, '');
      const localPhone = cleanPhone.startsWith('62') ? '0' + cleanPhone.slice(2) : cleanPhone;

      family = await prisma.family.findFirst({
        where: {
          OR: [
            { phone: targetPhone },
            { phone: cleanPhone },
            { phone: localPhone },
            { phone: `+${cleanPhone}` },
          ],
        },
      });
    }

    if (!family) {
      // Periksa apakah user ada di Supabase Auth
      if (authUser) {
        const hasPassword = Boolean(authUser.user_metadata?.has_password);
        const createdAt = authUser.created_at || new Date().toISOString();
        const ageInHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);

        return NextResponse.json({
          exists: true,
          hasPassword,
          alias: authUser.user_metadata?.full_name || 'Pengguna',
          createdAt,
          ageInHours,
        });
      }

      return NextResponse.json({
        exists: false,
        hasPassword: false,
        message: 'Pengguna tidak ditemukan.',
      });
    }

    const hasPassword = Boolean(family.has_password);
    const createdAt = family.created_at.toISOString();
    const ageInHours = (Date.now() - family.created_at.getTime()) / (1000 * 60 * 60);

    return NextResponse.json({
      exists: true,
      hasPassword,
      alias: family.alias,
      phone: family.phone || targetPhone,
      createdAt,
      ageInHours,
    });
  } catch (err: any) {
    console.error('Error check-status:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal memeriksa status akun.' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // Dukung juga pemanggilan GET berbasis session
  return POST(req);
}
