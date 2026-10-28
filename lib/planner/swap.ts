import { Anggota, ResepMasakan } from '../types';
import { RESEP_LIST } from '../data/dataset';
import { isResepAmanUntukKeluarga } from '../nutrition/safety';

export interface OpsiPenggantiHidangan {
  resep: ResepMasakan;
  selisihBiayaRp: number; // Positif jika lebih mahal, negatif jika lebih hemat
}

/**
 * Mencari kandidat pengganti satu hidangan (PRD FR-14):
 * - Kategori yang sama
 * - Aman dari alergen seluruh keluarga
 * - Memenuhi batas keamanan (misal batas hati ayam)
 * - Bukan hidangan yang sama
 */
export function cariPenggantiHidangan(
  resepLama: ResepMasakan,
  anggotaList: Anggota[],
  pemakaianHatiAyamMingguIni: number = 0
): OpsiPenggantiHidangan[] {
  // Jika hidangan yang hendak diganti adalah hati ayam, kurangi hitungan untuk mengevaluasi opsi pengganti
  const hatiCountForCheck =
    resepLama.kode === 'RSP004' || resepLama.nama.toLowerCase().includes('hati ayam')
      ? Math.max(0, pemakaianHatiAyamMingguIni - 1)
      : pemakaianHatiAyamMingguIni;

  const kandidat = RESEP_LIST.filter((r) => {
    if (r.kode === resepLama.kode) return false;
    if (r.kode === 'RSP025' || r.kode?.toUpperCase() === 'RSP025') return false; // RSP025 selalu nonaktif di MVP
    if (r.kategori !== resepLama.kategori) return false;

    // Periksa keamanan alergen seluruh keluarga dan batasan hati ayam
    const check = isResepAmanUntukKeluarga(r, anggotaList, hatiCountForCheck);
    return check.aman;
  });

  return kandidat.map((r) => ({
    resep: r,
    selisihBiayaRp: r.biaya_per_porsi_rp - resepLama.biaya_per_porsi_rp,
  }));
}
