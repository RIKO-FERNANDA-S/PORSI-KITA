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
  const kandidat = RESEP_LIST.filter((r) => {
    if (r.kode === resepLama.kode) return false;
    if (r.kode === 'RSP025') return false; // RSP025 selalu nonaktif di MVP
    if (r.kategori !== resepLama.kategori) return false;

    // Periksa keamanan alergen dan hati ayam
    const check = isResepAmanUntukKeluarga(r, anggotaList, pemakaianHatiAyamMingguIni);
    return check.aman;
  });

  return kandidat.map((r) => ({
    resep: r,
    selisihBiayaRp: r.biaya_per_porsi_rp - resepLama.biaya_per_porsi_rp,
  }));
}
