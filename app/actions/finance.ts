'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

/**
 * Server Action: Update / Edit Nama Warung Langganan
 */
export async function updateWarungAction(warungId: string, namaWarung: string) {
  try {
    const trimmed = (namaWarung || '').trim();
    if (!warungId || !trimmed) {
      return { success: false, error: 'ID dan nama warung baru harus diisi.' };
    }

    const updated = await prisma.warung.update({
      where: { id: warungId },
      data: {
        nama_warung: trimmed,
      },
    });

    revalidatePath('/dompet');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Nama warung berhasil diperbarui.',
      warung: updated,
    };
  } catch (err: any) {
    console.error('Error updateWarungAction:', err);
    return {
      success: false,
      error: err.message || 'Gagal memperbarui warung di database.',
    };
  }
}

/**
 * Server Action: Hapus Transaksi & Update Saldo Otomatis
 */
export async function deleteTransactionAction(transactionId: string) {
  try {
    if (!transactionId) {
      return { success: false, error: 'ID transaksi harus disertakan.' };
    }

    const tx = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!tx) {
      return { success: false, error: 'Transaksi tidak ditemukan.' };
    }

    const familyId = tx.family_id;

    // Hapus transaksi
    await prisma.transaction.delete({
      where: { id: transactionId },
    });

    // Hitung ulang saldo dan pengeluaran keluarga
    const family = await prisma.family.findUnique({
      where: { id: familyId },
    });

    const budgetBelanja = Number(family?.budget_belanja) || 3000000;
    const tipeBudget = (family?.tipe_budget as 'bulanan' | 'mingguan') || 'bulanan';

    const [expenses, incomes] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          family_id: familyId,
          jenis: 'PENGELUARAN',
        },
        _sum: {
          nominal: true,
        },
      }),
      prisma.transaction.aggregate({
        where: {
          family_id: familyId,
          jenis: 'PEMASUKAN',
        },
        _sum: {
          nominal: true,
        },
      }),
    ]);

    const totalPemasukan = Number(incomes._sum.nominal) || 0;
    const pengeluaran = Number(expenses._sum.nominal) || 0;
    const totalAnggaran = (tipeBudget === 'mingguan' ? budgetBelanja * 4 : budgetBelanja) + totalPemasukan;
    const saldo = Math.max(0, totalAnggaran - pengeluaran);

    revalidatePath('/dompet');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Transaksi berhasil dihapus dan saldo diperbarui.',
      total_anggaran: totalAnggaran,
      pengeluaran,
      saldo,
    };
  } catch (err: any) {
    console.error('Error deleteTransactionAction:', err);
    return {
      success: false,
      error: err.message || 'Gagal menghapus transaksi dari database.',
    };
  }
}

/**
 * Server Action: Hapus Warung Langganan
 */
export async function deleteWarungAction(warungId: string) {
  try {
    if (!warungId) {
      return { success: false, error: 'ID warung harus disertakan.' };
    }

    await prisma.warung.delete({
      where: { id: warungId },
    });

    revalidatePath('/dompet');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Warung berhasil dihapus.',
    };
  } catch (err: any) {
    console.error('Error deleteWarungAction:', err);
    return {
      success: false,
      error: err.message || 'Gagal menghapus warung.',
    };
  }
}
