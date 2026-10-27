/**
 * Normalisasi nomor HP ke format E.164 (misal: 081234567890 -> +6281234567890)
 */
export function normalizePhone(rawPhone: string): string {
  let cleaned = rawPhone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  return '+' + cleaned;
}
