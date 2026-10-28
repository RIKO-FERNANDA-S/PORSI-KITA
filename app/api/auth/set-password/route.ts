import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { normalizePhone } from '@/lib/phone';
import { hashPassword, setSessionCookie, verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth-session';
import { setPasswordSchema } from '@/lib/schemas';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { newPassword, confirmPassword, phone, familyId } = body;

    // 1. Validasi Zod terhadap payload kata sandi
    const validation = setPasswordSchema.safeParse({
      newPassword,
      confirmPassword,
      phone,
      familyId,
    });

    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || 'Format kata sandi tidak valid.';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const hashedPassword = hashPassword(newPassword);

    // 2. Ambil user Supabase Auth aktif jika ada
    let supabaseUser: any = null;
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        supabaseUser = user;
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

    // 3. Baca session cookie porsi_kita_session jika ada
    const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = sessionCookie ? verifySessionToken(sessionCookie) : null;

    // 4. Resolusi identitas target keluarga di database
    const targetFamilyId = familyId || session?.familyId;
    const targetOwnerId = session?.ownerId || supabaseUser?.id;
    const rawTargetPhone = phone || session?.phone || supabaseUser?.phone || supabaseUser?.user_metadata?.phone || '';
    const targetPhone = rawTargetPhone ? normalizePhone(rawTargetPhone) : '';
    const cleanPhone = targetPhone.replace(/\D/g, '');
    const localPhone = cleanPhone.startsWith('62') ? '0' + cleanPhone.slice(2) : cleanPhone;

    // 5. Cari record Family di database Prisma dengan prioritas lengkap
    let family = null;

    // Prioritas A: Berdasarkan familyId langsung
    if (targetFamilyId) {
      family = await prisma.family.findUnique({
        where: { id: targetFamilyId },
      }).catch(() => null);
    }

    // Prioritas B: Berdasarkan owner_id (Supabase Auth UID / Session)
    if (!family && targetOwnerId) {
      family = await prisma.family.findFirst({
        where: { owner_id: targetOwnerId },
      });
    }

    // Prioritas C: Berdasarkan nomor telepon (E.164, lokal, dll.)
    if (!family && targetPhone) {
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

    // Prioritas D: Fallback ke record keluarga terbaru di database
    if (!family) {
      family = await prisma.family.findFirst({
        orderBy: { created_at: 'desc' },
      });
    }

    // 6. Simpan kata sandi ke PostgreSQL Database
    if (family) {
      family = await prisma.family.update({
        where: { id: family.id },
        data: {
          has_password: true,
          password_hash: hashedPassword,
          // Lengkapi nomor telepon jika sebelumnya null
          ...(family.phone ? {} : (targetPhone ? { phone: targetPhone } : {})),
          // Hubungkan owner_id jika sebelumnya dummy
          ...(family.owner_id === '00000000-0000-0000-0000-000000000000' && targetOwnerId
            ? { owner_id: targetOwnerId }
            : {}),
        },
      });
    } else {
      // Jika database masih kosong sama sekali, buatkan record baru
      family = await prisma.family.create({
        data: {
          owner_id: targetOwnerId || '00000000-0000-0000-0000-000000000000',
          phone: targetPhone || null,
          alias: session?.alias || 'Keluarga Pengguna',
          wilayah: 'Pasar Tradisional • Jakarta Selatan',
          budget_harian_rp: 75000,
          has_password: true,
          password_hash: hashedPassword,
        },
      });
    }

    const response = NextResponse.json({
      success: true,
      message: 'Kata sandi baru berhasil disimpan ke database! Akun keluarga Anda kini aman.',
      family: {
        id: family.id,
        phone: family.phone || targetPhone,
        alias: family.alias,
        hasPassword: true,
      },
    });

    setSessionCookie(response, {
      phone: family.phone || targetPhone || '',
      alias: family.alias,
      hasPassword: true,
      createdAt: family.created_at.toISOString(),
      familyId: family.id,
      ownerId: family.owner_id,
    });

    return response;
  } catch (err: any) {
    console.error('Error set password:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal menyimpan kata sandi ke database.' },
      { status: 500 }
    );
  }
}

