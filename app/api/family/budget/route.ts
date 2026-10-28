import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionPayload } from '@/lib/auth-session';
import { normalizePhone } from '@/lib/phone';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionPayload();
    const urlPhone = req.nextUrl.searchParams.get('phone');

    const targetPhone = urlPhone ? normalizePhone(urlPhone) : session?.phone;

    let family = null;

    if (session?.familyId) {
      family = await prisma.family.findUnique({
        where: { id: session.familyId },
        include: { members: true },
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
        include: { members: true },
      });
    }

    if (!family) {
      family = await prisma.family.findFirst({
        include: { members: true },
      });
    }

    if (!family) {
      return NextResponse.json({
        success: true,
        alias: 'Keluarga Kita',
        wilayah: 'Pasar Tradisional',
        members_count: 0,
        members: [],
        budget_belanja: 3000000,
        tipe_budget: 'bulanan',
        total_anggaran: 3000000,
        pengeluaran: 0,
        saldo: 3000000,
        budget_harian_rp: 100000,
      });
    }

    const budgetBelanja = Number(family.budget_belanja) || 3000000;
    const tipeBudget = (family.tipe_budget as 'bulanan' | 'mingguan') || 'bulanan';

    // Aturan bisnis: Jika mingguan kalikan dalam 1 bulan (x 4)
    const totalAnggaran = tipeBudget === 'mingguan' ? budgetBelanja * 4 : budgetBelanja;

    // Hitung total pengeluaran dari tabel transactions
    const expenses = await prisma.transaction.aggregate({
      where: {
        family_id: family.id,
        jenis: 'PENGELUARAN',
      },
      _sum: {
        nominal: true,
      },
    });

    const pengeluaran = Number(expenses._sum.nominal) || 0;
    const saldo = Math.max(0, totalAnggaran - pengeluaran);
    const budgetHarianRp = Number(family.budget_harian_rp) || Math.round(totalAnggaran / 30);

    return NextResponse.json({
      success: true,
      family_id: family.id,
      alias: family.alias,
      wilayah: family.wilayah,
      members_count: family.members?.length || 0,
      members: family.members || [],
      budget_belanja: budgetBelanja,
      tipe_budget: tipeBudget,
      total_anggaran: totalAnggaran,
      pengeluaran,
      saldo,
      budget_harian_rp: budgetHarianRp,
    });
  } catch (err: any) {
    console.error('Error get family budget:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal mengambil data saldo dan budget belanja.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { budget_belanja, tipe_budget, phone } = body;

    const nominal = Number(budget_belanja);
    if (isNaN(nominal) || nominal <= 0) {
      return NextResponse.json(
        { error: 'Nominal budget belanja harus lebih besar dari 0.' },
        { status: 400 }
      );
    }

    const tipe: 'bulanan' | 'mingguan' = tipe_budget === 'mingguan' ? 'mingguan' : 'bulanan';

    // Cari family
    const session = await getSessionPayload();
    const targetPhone = phone ? normalizePhone(phone) : session?.phone;

    let family = null;

    if (session?.familyId) {
      family = await prisma.family.findUnique({
        where: { id: session.familyId },
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
      family = await prisma.family.findFirst();
    }

    if (!family) {
      return NextResponse.json(
        { error: 'Data keluarga belum terdaftar di database.' },
        { status: 404 }
      );
    }

    // Aturan bisnis: Jika mingguan kalikan dalam 1 bulan (x 4)
    const totalAnggaranBulanan = tipe === 'mingguan' ? nominal * 4 : nominal;
    const budgetHarianRp = Math.round(totalAnggaranBulanan / 30);

    const updatedFamily = await prisma.family.update({
      where: { id: family.id },
      data: {
        budget_belanja: nominal,
        tipe_budget: tipe,
        budget_harian_rp: budgetHarianRp,
      },
    });

    // Hitung sisa saldo
    const expenses = await prisma.transaction.aggregate({
      where: {
        family_id: family.id,
        jenis: 'PENGELUARAN',
      },
      _sum: {
        nominal: true,
      },
    });

    const pengeluaran = Number(expenses._sum.nominal) || 0;
    const saldo = Math.max(0, totalAnggaranBulanan - pengeluaran);

    return NextResponse.json({
      success: true,
      message: 'Budget belanja berhasil diperbarui!',
      budget_belanja: nominal,
      tipe_budget: tipe,
      total_anggaran: totalAnggaranBulanan,
      pengeluaran,
      saldo,
      budget_harian_rp: budgetHarianRp,
      family: updatedFamily,
    });
  } catch (err: any) {
    console.error('Error save family budget:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal menyimpan budget belanja keluarga.' },
      { status: 500 }
    );
  }
}
