import { Anggota, ResepMasakan } from '../types';

/**
 * Aturan Keamanan & Batas Gizi Produk Porsi Kita (PRD 8.6 & 8.7)
 */

/**
 * Memeriksa apakah suatu resep aman untuk seluruh anggota keluarga.
 *
 * Aturan:
 * 1. RSP025 selalu nonaktif di MVP sampai porsinya ditentukan pakar (PRD 8.6).
 * 2. Filter Alergen: jika resep mengandung salah satu alergen anggota keluarga, resep ditolak (PRD 8.7).
 * 3. Hati Ayam (RSP004):
 *    - Dilarang jika ada anggota hamil trimester 1 (hamil_t1)
 *    - Dilarang jika ada balita usia 2-3 tahun (usia_tahun <= 3)
 */
export function isResepAmanUntukKeluarga(
  resep: ResepMasakan,
  anggotaList: Anggota[],
  jumlahHatiAyamMingguIni: number = 0
): {
  aman: boolean;
  alasan?: string;
} {
  // 1. Resep dinonaktifkan di MVP
  if (resep.kode === 'RSP025') {
    return {
      aman: false,
      alasan: 'Resep RSP025 dinonaktifkan di MVP sampai porsinya divalidasi pakar gizi.',
    };
  }

  // 2. Cek Alergen seluruh keluarga
  for (const anggota of anggotaList) {
    if (!anggota.alergen || anggota.alergen.length === 0) continue;

    for (const al of anggota.alergen) {
      const match = resep.alergen.some(
        (ra) => ra.toLowerCase() === al.toLowerCase()
      );
      if (match) {
        return {
          aman: false,
          alasan: `Mengandung alergen ${al} yang memicu alergi pada ${anggota.alias}.`,
        };
      }
    }
  }

  // 3. Aturan Hati Ayam (RSP004 / CD005)
  const isMenuHati =
    resep.kode === 'RSP004' ||
    resep.bahan.some((b) => b.kode_tkpi === 'CD005');

  if (isMenuHati) {
    // a. Maksimal 1 kali per minggu
    if (jumlahHatiAyamMingguIni >= 1) {
      return {
        aman: false,
        alasan: 'Menu hati ayam dibatasi maksimal 1 kali per minggu karena kadar retinol yang sangat tinggi.',
      };
    }

    // b. Tidak boleh jika ada bumil trimester 1
    const adaBumilT1 = anggotaList.some(
      (a) => a.jenis_kelamin === 'P' && a.status === 'hamil_t1'
    );
    if (adaBumilT1) {
      return {
        aman: false,
        alasan: 'Hati ayam tidak disarankan jika ada ibu hamil trimester 1 untuk mencegah toksisitas retinol.',
      };
    }

    // c. Tidak boleh jika ada anak usia 2-3 tahun
    const adaBalita = anggotaList.some((a) => a.usia_tahun <= 3);
    if (adaBalita) {
      return {
        aman: false,
        alasan: 'Hati ayam belum dijadwalkan untuk keluarga dengan balita usia 2-3 tahun.',
      };
    }
  }

  return { aman: true };
}
