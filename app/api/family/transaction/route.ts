import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionPayload } from '@/lib/auth-session';
import { normalizePhone } from '@/lib/phone';

/**
 * GET: Mengambil riwayat transaksi dan warung langganan keluarga dari database.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionPayload();
    const urlPhone = req.nextUrl.searchParams.get('phone');
    const targetPhone = urlPhone ? normalizePhone(urlPhone) : session?.phone;

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
      return NextResponse.json({
        success: true,
        transactions: [],
        warungs: [],
      });
    }

    // Ambil transaksi riil diurutkan dari yang terbaru
    const transactions = await prisma.transaction.findMany({
      where: { family_id: family.id },
      include: { warung: true },
      orderBy: { created_at: 'desc' },
    });

    // Ambil daftar warung langganan keluarga
    const warungsRaw = await prisma.warung.findMany({
      where: {
        OR: [
          { family_id: family.id },
          { family_id: null },
        ],
      },
      include: {
        transactions: {
          where: { family_id: family.id },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const warungs = warungsRaw.map((w) => {
      const txCount = w.transactions.length;
      const totalSpent = w.transactions.reduce((acc, t) => acc + Number(t.nominal), 0);
      return {
        id: w.id,
        nama: w.nama_warung,
        tag: w.family_id ? 'Warung Langganan' : 'Pasar Terdekat',
        count: txCount,
        totalSpent,
      };
    });

    return NextResponse.json({
      success: true,
      family_id: family.id,
      transactions,
      warungs,
    });
  } catch (err: any) {
    console.error('Error get transactions:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal mengambil data transaksi keluarga.' },
      { status: 500 }
    );
  }
}

/**
 * POST: Menambahkan transaksi pengeluaran / pemasukan baru ke database.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nominal, catatan, jenis, phone, merchant, warung_id, action, nama_warung } = body;

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

    // Dukungan pendaftaran warung langganan baru tanpa transaksi
    if (action === 'add_warung' || (!nominal && (merchant || nama_warung) && action !== 'delete_warung')) {
      const warungName = (merchant || nama_warung || '').trim();
      if (!warungName) {
        return NextResponse.json({ error: 'Nama warung tidak boleh kosong' }, { status: 400 });
      }
      let warung = await prisma.warung.findFirst({
        where: {
          nama_warung: warungName,
          OR: [{ family_id: family.id }, { family_id: null }],
        },
      });
      if (!warung) {
        warung = await prisma.warung.create({
          data: {
            family_id: family.id,
            nama_warung: warungName,
          },
        });
      }
      return NextResponse.json({
        success: true,
        message: 'Warung berhasil ditambahkan ke database!',
        warung: {
          id: warung.id,
          nama: warung.nama_warung,
          tag: 'Warung Langganan',
          count: 0,
          totalSpent: 0,
        },
      });
    }

    // Dukungan penghapusan warung langganan
    if (action === 'delete_warung') {
      const targetId = body.warung_id || body.id;
      const targetName = (body.nama_warung || body.nama || merchant || '').trim();

      if (!targetId && !targetName) {
        return NextResponse.json(
          { error: 'ID atau nama warung harus disertakan.' },
          { status: 400 }
        );
      }

      await prisma.warung.deleteMany({
        where: {
          OR: [
            ...(targetId ? [{ id: targetId }] : []),
            ...(targetName ? [{ nama_warung: targetName, family_id: family.id }] : []),
          ],
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Warung berhasil dihapus dari database.',
      });
    }

    const amount = Number(nominal);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Nominal transaksi harus berupa angka lebih dari 0.' },
        { status: 400 }
      );
    }

    // Resolusi warung jika ada nama merchant
    let finalWarungId = warung_id || null;
    if (!finalWarungId && merchant && typeof merchant === 'string' && merchant.trim()) {
      const namaWarungTrimmed = merchant.trim();
      let matchedWarung = await prisma.warung.findFirst({
        where: {
          nama_warung: namaWarungTrimmed,
          OR: [{ family_id: family.id }, { family_id: null }],
        },
      });

      if (!matchedWarung) {
        matchedWarung = await prisma.warung.create({
          data: {
            family_id: family.id,
            nama_warung: namaWarungTrimmed,
          },
        });
      }
      finalWarungId = matchedWarung.id;
    }

    // Buat transaksi baru di database
    const transaction = await prisma.transaction.create({
      data: {
        family_id: family.id,
        warung_id: finalWarungId,
        jenis: jenis === 'PEMASUKAN' ? 'PEMASUKAN' : 'PENGELUARAN',
        nominal: amount,
        catatan: catatan || (jenis === 'PEMASUKAN' ? 'Tambah saldo dompet' : 'Belanja bahan makanan dapur'),
      },
      include: { warung: true },
    });

    // Hitung ulang saldo dan pengeluaran
    const budgetBelanja = Number(family.budget_belanja) || 3000000;
    const tipeBudget = (family.tipe_budget as 'bulanan' | 'mingguan') || 'bulanan';

    const [expenses, incomes] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          family_id: family.id,
          jenis: 'PENGELUARAN',
        },
        _sum: {
          nominal: true,
        },
      }),
      prisma.transaction.aggregate({
        where: {
          family_id: family.id,
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

    return NextResponse.json({
      success: true,
      message: 'Transaksi berhasil disimpan ke database!',
      transaction,
      total_anggaran: totalAnggaran,
      pengeluaran,
      saldo,
    });
  } catch (err: any) {
    console.error('Error add transaction:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal menyimpan transaksi.' },
      { status: 500 }
    );
  }
}

/**
 * PUT: Memperbarui nominal atau catatan transaksi yang sudah ada.
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, nominal, catatan } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID transaksi harus disertakan.' }, { status: 400 });
    }

    const amount = Number(nominal);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Nominal transaksi harus berupa angka lebih dari 0.' },
        { status: 400 }
      );
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        nominal: amount,
        ...(catatan ? { catatan } : {}),
      },
      include: { warung: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Transaksi berhasil diperbarui.',
      transaction: updated,
    });
  } catch (err: any) {
    console.error('Error update transaction:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal memperbarui transaksi.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Menghapus warung langganan dari database.
 */
export async function DELETE(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const urlWarungId = url.searchParams.get('warung_id') || url.searchParams.get('id');
    const urlNama = url.searchParams.get('nama') || url.searchParams.get('nama_warung');

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // no body provided
    }

    const targetId = body?.warung_id || body?.id || urlWarungId;
    const targetName = (body?.nama_warung || body?.nama || urlNama || '').trim();

    if (!targetId && !targetName) {
      return NextResponse.json(
        { error: 'ID atau nama warung harus disertakan untuk menghapus.' },
        { status: 400 }
      );
    }

    await prisma.warung.deleteMany({
      where: {
        OR: [
          ...(targetId ? [{ id: targetId }] : []),
          ...(targetName ? [{ nama_warung: targetName }] : []),
        ],
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Warung berhasil dihapus dari database.',
    });
  } catch (err: any) {
    console.error('Error delete warung:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal menghapus warung dari database.' },
      { status: 500 }
    );
  }
}
