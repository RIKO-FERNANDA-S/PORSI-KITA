/**
 * Utility Pengiriman Pesan WhatsApp Resmi via Fonnte Gateway API
 * Device Name: Porsi Kita (Quota: 1000 messages)
 * Docs: https://fonnte.com/api
 */

export interface SendWhatsAppResult {
  success: boolean;
  id?: string;
  error?: string;
}

export async function sendWhatsAppOtp(
  recipientPhone: string,
  otpCode: string,
  userName?: string
): Promise<SendWhatsAppResult> {
  const token = process.env.FONNTE_TOKEN;

  if (!token) {
    console.warn('FONNTE_TOKEN belum dikonfigurasi di .env');
    return {
      success: false,
      error: 'Token WhatsApp Fonnte belum diset.',
    };
  }

  // Format nomor WhatsApp: bersihkan karakter non-digit
  let target = recipientPhone.replace(/\D/g, '');
  if (target.startsWith('0')) {
    target = '62' + target.substring(1);
  } else if (!target.startsWith('62')) {
    target = '62' + target;
  }

  const greeting = userName ? `Halo kak *${userName}*,` : 'Halo,';

  const message = `${greeting}\n\nKode verifikasi OTP untuk akun *PORSI KITA* Anda adalah:\n\n*${otpCode}*\n\nKode ini bersifat rahasia dan berlaku selama 5 menit. Jangan berikan kode ini kepada siapa pun demi menjaga keamanan data gizi dan belanja keluarga Anda.\n\n_Salam hangat,_\n*Tim Porsi Kita* 🥗`;

  try {
    const formData = new FormData();
    formData.append('target', target);
    formData.append('message', message);
    formData.append('countryCode', '62');

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: token,
      },
      body: formData,
    });

    const data = await response.json();

    if (!data.status) {
      console.error('Fonnte Sending Error:', data);
      return {
        success: false,
        error: data.reason || 'Gagal mengirim pesan WhatsApp via Fonnte.',
      };
    }

    console.log('WhatsApp OTP Sent Successfully via Fonnte to:', target);
    return {
      success: true,
      id: data.id?.[0] || 'sent',
    };
  } catch (err: any) {
    console.error('Fonnte Network Error:', err);
    return {
      success: false,
      error: err.message || 'Koneksi ke gateway WhatsApp gagal.',
    };
  }
}
