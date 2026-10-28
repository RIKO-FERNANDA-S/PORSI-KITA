import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionPayload } from '@/lib/auth-session';
import { normalizePhone } from '@/lib/phone';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nominal, catatan, jenis, phone } = body;

    const amount = Number(nominal);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Nominal pengeluaran harus berupa angka lebih dari 0.' },
        { status: 400 }
      );
    }

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
        { error: 'Data keluarga belum terdaftar.' },
        { status: 404 }
      );
    }

    // Buat transaksi baru di tabel transactions
    const transaction = await prisma.transaction.create({
      data: {
        family_id: family.id,
        jenis: jenis === 'PEMASUKAN' ? 'PEMASUKAN' : 'PENGELUARAN',
        nominal: amount,
        catatan: catatan || 'Belanja bahan makanan dapur',
      },
    });

    // Hitung ulang saldo
    const budgetBelanja = Number(family.budget_belanja) || 3000000;
    const tipeBudget = (family.tipe_budget as 'bulanan' | 'mingguan') || 'bulanan';
    const totalAnggaran = tipeBudget === 'mingguan' ? budgetBelanja * 4 : budgetBelanja;

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

    return NextResponse.json({
      success: true,
      message: 'Pengeluaran berhasil dicatat ke database!',
      transaction,
      total_anggaran: totalAnggaran,
      pengeluaran,
      saldo,
    });
  } catch (err: any) {
    console.error('Error add transaction:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal menyimpan transaksi pengeluaran.' },
      { status: 500 }
    );
  }
}
