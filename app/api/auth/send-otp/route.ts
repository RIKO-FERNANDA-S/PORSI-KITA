import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWhatsAppOtp } from '@/lib/whatsapp';
import { normalizePhone } from '@/lib/phone';

export { normalizePhone };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, nama, mode } = body;

    if (!phone) {
      return NextResponse.json(
        { error: 'Nomor WhatsApp wajib diisi.' },
        { status: 400 }
      );
    }

    const formattedPhone = normalizePhone(phone);
    const cleanPhone = formattedPhone.replace(/\D/g, '');
    const localPhone = cleanPhone.startsWith('62') ? '0' + cleanPhone.slice(2) : cleanPhone;

    // Jika mode lupa kata sandi, verifikasi nomor harus sudah terdaftar
    if (mode === 'forgot_password') {
      const existingUser = await prisma.family.findFirst({
        where: {
          OR: [
            { phone: formattedPhone },
            { phone: cleanPhone },
            { phone: localPhone },
            { phone: `+${cleanPhone}` },
          ],
        },
      });

      if (!existingUser) {
        return NextResponse.json(
          { error: 'Nomor WhatsApp belum terdaftar di sistem Porsi Kita. Silakan lakukan pendaftaran terlebih dahulu.' },
          { status: 404 }
        );
      }
    }

    // 1. Generate 6 digit angka OTP acak
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Waktu kedaluwarsa: 5 menit dari sekarang
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // 3. Simpan ke database PostgreSQL via Prisma
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

    // 4. Kirim kode OTP nyata ke WhatsApp penerima via Fonnte Gateway
    const recipientName = nama || 'Ibu Pengguna';
    const waResult = await sendWhatsAppOtp(formattedPhone, otpCode, recipientName);

    if (!waResult.success) {
      console.warn('Fonnte Sending Notice:', waResult.error);
      return NextResponse.json(
        { error: waResult.error || 'Gagal mengirim pesan ke WhatsApp. Pastikan nomor terdaftar di WhatsApp.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      phone: formattedPhone,
      message: 'Kode OTP 6 digit berhasil dikirim ke WhatsApp Anda.',
    });
  } catch (err: any) {
    console.error('Error send OTP:', err);
    return NextResponse.json(
      { error: err.message || 'Terjadi kesalahan saat mengirim OTP.' },
      { status: 500 }
    );
  }
}
