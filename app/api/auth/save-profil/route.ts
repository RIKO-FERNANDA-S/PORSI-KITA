import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { normalizePhone } from '@/lib/phone';
import { setSessionCookie } from '@/lib/auth-session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, nama, wilayah, budget_harian_rp, budget_belanja, tipe_budget, anggota } = body;

    if (!phone) {
      return NextResponse.json({ error: 'Nomor WhatsApp wajib diisi.' }, { status: 400 });
    }

    if (!nama || !nama.trim()) {
      return NextResponse.json({ error: 'Nama keluarga wajib diisi.' }, { status: 400 });
    }

    const formattedPhone = normalizePhone(phone);
    const cleanPhone = formattedPhone.replace(/\D/g, '');
    const localPhone = cleanPhone.startsWith('62') ? '0' + cleanPhone.slice(2) : cleanPhone;

    const supabase = await createClient();

    // 1. Ambil user Supabase auth aktif jika ada
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let ownerId = user?.id;

    // 2. Cari existing family berdasarkan owner_id atau phone
    let family = null;

    if (ownerId) {
      family = await prisma.family.findFirst({
        where: { owner_id: ownerId },
      });
    }

    if (!family) {
      family = await prisma.family.findFirst({
        where: {
          OR: [
            { phone: formattedPhone },
            { phone: cleanPhone },
            { phone: localPhone },
            { phone: `+${cleanPhone}` },
          ],
        },
      });
    }

    const tipe: 'bulanan' | 'mingguan' = tipe_budget === 'mingguan' ? 'mingguan' : 'bulanan';
    const nominalBudget = Number(budget_belanja) || (Number(budget_harian_rp) ? (tipe === 'mingguan' ? Number(budget_harian_rp) * 7 : Number(budget_harian_rp) * 30) : 3000000);
    const totalBulanan = tipe === 'mingguan' ? nominalBudget * 4 : nominalBudget;
    const dailyBudget = Math.round(totalBulanan / 30);

    const familyData = {
      alias: nama.trim(),
      wilayah: wilayah || 'Pasar Tradisional • Jakarta Selatan',
      budget_belanja: nominalBudget,
      tipe_budget: tipe,
      budget_harian_rp: dailyBudget,
      phone: formattedPhone,
      has_password: false, // Set status has_password = false
    };

    if (family) {
      // Update data keluarga yang sudah ada
      family = await prisma.family.update({
        where: { id: family.id },
        data: {
          ...familyData,
          ...(ownerId ? { owner_id: ownerId } : {}),
        },
      });
    } else {
      // Buat data keluarga baru
      // Jika ownerId belum ada, gunakan UUID dummy valid atau buat jika demo
      const fallbackOwnerId = ownerId || '00000000-0000-0000-0000-000000000000';
      family = await prisma.family.create({
        data: {
          owner_id: fallbackOwnerId,
          ...familyData,
        },
      });
    }

    // 3. Simpan anggota keluarga (members) jika ada data yang dikirimkan
    if (anggota && Array.isArray(anggota) && anggota.length > 0) {
      // Hapus data anggota lama untuk keluarga ini agar bersih
      await prisma.member.deleteMany({
        where: { family_id: family.id },
      });

      for (const m of anggota) {
        if (!m.alias || !m.alias.trim()) continue;
        await prisma.member.create({
          data: {
            family_id: family.id,
            alias: m.alias.trim(),
            usia_tahun: parseInt(m.usia_tahun, 10) || 25,
            jenis_kelamin: m.jenis_kelamin || 'P',
            status_khusus: m.status || 'umum',
            alergen: Array.isArray(m.alergen) ? m.alergen : [],
          },
        });
      }
    }

    // Perbarui metadata user di Supabase jika ada user session
    if (user) {
      await supabase.auth.updateUser({
        data: {
          has_password: false,
          phone: formattedPhone,
          full_name: nama.trim(),
        },
      });
    }

    const response = NextResponse.json({
      success: true,
      message: 'Data keluarga berhasil disimpan ke database.',
      family,
    });

    setSessionCookie(response, {
      phone: formattedPhone,
      alias: family.alias,
      hasPassword: Boolean(family.has_password),
      createdAt: family.created_at.toISOString(),
      familyId: family.id,
      ownerId: family.owner_id,
    });

    return response;
  } catch (err: any) {
    console.error('Error save profil:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal menyimpan data keluarga ke database.' },
      { status: 500 }
    );
  }
}
