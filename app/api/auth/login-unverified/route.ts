import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWhatsAppOtp } from '@/lib/whatsapp';
import { normalizePhone } from '../send-otp/route';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, nama } = body;

    if (!phone || !nama) {
      return NextResponse.json(
        { error: 'Nama keluarga dan nomor WhatsApp wajib diisi.' },
        { status: 400 }
      );
    }

    const formattedPhone = normalizePhone(phone);
    const cleanPhone = formattedPhone.replace(/\D/g, '');
    const localPhone = cleanPhone.startsWith('62') ? '0' + cleanPhone.slice(2) : cleanPhone;
    const inputNama = nama.trim();

    // 1. Cari data di database berdasarkan Nomor HP
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
        { error: 'Nama keluarga dan nomor HP tidak cocok dengan data pendaftaran.' },
        { status: 400 }
      );
    }

    // 2. Cocokkan input Nama dengan families.alias menggunakan perbandingan LOWER(TRIM(alias)) = LOWER(TRIM(inputNama))
    const dbAlias = family.alias.trim().toLowerCase();
    const cleanInputNama = inputNama.toLowerCase();

    const dbAliasNoPrefix = dbAlias.replace(/^keluarga\s+/i, '').trim();
    const inputNamaNoPrefix = cleanInputNama.replace(/^keluarga\s+/i, '').trim();

    const isMatch =
      dbAlias === cleanInputNama ||
      dbAliasNoPrefix === inputNamaNoPrefix ||
      dbAliasNoPrefix === cleanInputNama ||
      dbAlias === `keluarga ${cleanInputNama}`;

    if (!isMatch) {
      return NextResponse.json(
        { error: 'Nama keluarga dan nomor HP tidak cocok dengan data pendaftaran.' },
        { status: 400 }
      );
    }

    // 3. Periksa status has_password
    if (family.has_password) {
      return NextResponse.json(
        {
          error:
            'Akun keluarga Ibu sudah memiliki kata sandi. Silakan masuk menggunakan kata sandi Anda atau gunakan tombol "Lupa Kata Sandi".',
        },
        { status: 400 }
      );
    }

    // 4. Jika Sinkron dan has_password === false: Generate & Kirim OTP ke Nomor HP tersebut
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 menit

    await prisma.otpVerification.deleteMany({
      where: { phone: formattedPhone },
    });

    await prisma.otpVerification.create({
      data: {
        phone: formattedPhone,
        code: otpCode,
        expires_at: expiresAt,
      },
    });

    const waResult = await sendWhatsAppOtp(formattedPhone, otpCode, family.alias);

    if (!waResult.success) {
      console.warn('Fonnte send notice (login-unverified):', waResult.error);
      return NextResponse.json(
        {
          error:
            waResult.error ||
            'Gagal mengirim OTP ke nomor WhatsApp Anda. Pastikan nomor terdaftar di WhatsApp.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      phone: formattedPhone,
      alias: family.alias,
      message: 'Kode OTP 6 digit berhasil dikirim ke WhatsApp Anda.',
    });
  } catch (err: any) {
    console.error('Error login-unverified:', err);
    return NextResponse.json(
      { error: err.message || 'Terjadi kesalahan pada sistem masuk tanpa kata sandi.' },
      { status: 500 }
    );
  }
}
