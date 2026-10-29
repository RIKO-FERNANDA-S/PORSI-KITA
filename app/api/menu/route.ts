import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getSessionPayload } from '../../../lib/auth-session';
import { normalizePhone } from '../../../lib/phone';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Helper untuk menemukan Family berdasarkan sesi, query param, phone, atau fallback
 */
async function getTargetFamily(req: NextRequest, customFamilyId?: string, customPhone?: string) {
  const session = await getSessionPayload();
  const urlPhone = req.nextUrl.searchParams.get('phone') || customPhone;
  const urlFamilyId = req.nextUrl.searchParams.get('family_id') || customFamilyId;

  const targetPhone = urlPhone ? normalizePhone(urlPhone) : session?.phone;

  let family = null;

  // 1. Cek jika familyId valid UUID
  const candidateId = urlFamilyId || session?.familyId;
  if (candidateId && UUID_REGEX.test(candidateId)) {
    family = await prisma.family.findUnique({
      where: { id: candidateId },
    });
  }

  // 2. Cek berdasarkan nomor telepon
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

  // 3. Fallback ke keluarga pertama di database
  if (!family) {
    family = await prisma.family.findFirst();
  }

  return family;
}

/**
 * GET /api/menu
 * Mengambil menu aktif 7 hari milik keluarga dari database PostgreSQL (tabel meal_plans).
 */
export async function GET(req: NextRequest) {
  try {
    const family = await getTargetFamily(req);

    if (!family) {
      return NextResponse.json({
        success: true,
        menu: null,
        message: 'Belum ada data keluarga di database.',
      });
    }

    // Ambil meal plan terbaru dari keluarga ini
    const activeMealPlan = await prisma.mealPlan.findFirst({
      where: { family_id: family.id },
      orderBy: { created_at: 'desc' },
    });

    if (!activeMealPlan) {
      return NextResponse.json({
        success: true,
        family_id: family.id,
        menu: null,
        message: 'Belum ada rencana menu tersimpan di database.',
      });
    }

    return NextResponse.json({
      success: true,
      family_id: family.id,
      meal_plan_id: activeMealPlan.id,
      menu: activeMealPlan.hasil_json,
      total_biaya: Number(activeMealPlan.total_biaya),
      created_at: activeMealPlan.created_at,
    });
  } catch (err: any) {
    console.error('Error GET /api/menu:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal mengambil menu dari database.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/menu
 * Menyimpan atau memperbarui (UPSERT) rencana menu 7 hari keluarga ke database PostgreSQL.
 * Sesuai instruksi: ketika menu baru dibuat atau menu habis di-update, baris lama diperbarui
 * sehingga TIDAK ADA PENUMPUKAN DATA.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { menu, total_biaya, family_id, phone } = body;

    if (!menu || !menu.hari || !Array.isArray(menu.hari)) {
      return NextResponse.json(
        { error: 'Format data menu tidak valid (membutuhkan struktur rencana 7 hari).' },
        { status: 400 }
      );
    }

    let family = await getTargetFamily(req, family_id, phone);

    // Jika belum ada keluarga sama sekali di database, buat keluarga default
    if (!family) {
      family = await prisma.family.create({
        data: {
          alias: menu.familyName || 'Keluarga Kita',
          wilayah: 'Surabaya, Jawa Timur',
          owner_id: '00000000-0000-0000-0000-000000000001',
          budget_belanja: 3000000,
          budget_harian_rp: menu.budget_harian_rp || 85000,
        },
      });
    }

    const calculatedTotalBiaya =
      total_biaya !== undefined
        ? Number(total_biaya)
        : Number(menu.total_biaya_mingguan_rp) || 0;

    // Cek apakah keluarga ini sudah memiliki data meal_plan sebelumnya
    const existingMealPlan = await prisma.mealPlan.findFirst({
      where: { family_id: family.id },
      orderBy: { created_at: 'desc' },
    });

    let savedPlan;

    if (existingMealPlan) {
      // UPDATE baris yang sudah ada agar TIDAK ADA PENUMPUKAN DATA
      savedPlan = await prisma.mealPlan.update({
        where: { id: existingMealPlan.id },
        data: {
          hasil_json: menu,
          total_biaya: calculatedTotalBiaya,
          created_at: new Date(),
        },
      });

      // Bersihkan jika ada duplikat historis lama keluarga ini
      await prisma.mealPlan.deleteMany({
        where: {
          family_id: family.id,
          id: { not: savedPlan.id },
        },
      });
    } else {
      // Buat baru jika pertama kali
      savedPlan = await prisma.mealPlan.create({
        data: {
          family_id: family.id,
          hasil_json: menu,
          total_biaya: calculatedTotalBiaya,
        },
      });
    }

    return NextResponse.json({
      success: true,
      family_id: family.id,
      meal_plan_id: savedPlan.id,
      total_biaya: Number(savedPlan.total_biaya),
      updated_at: savedPlan.created_at,
      message: 'Rencana menu 7 hari berhasil disinkronkan ke database tanpa penumpukan data.',
    });
  } catch (err: any) {
    console.error('Error POST /api/menu:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal menyimpan menu ke database.' },
      { status: 500 }
    );
  }
}
