import { Anggota, ResepMasakan } from '../types';
import { isResepAmanUntukKeluarga } from '../nutrition/safety';

/**
 * Menyaring daftar resep yang aman dan dapat dipakai untuk keluarga (PRD 9.1 & 9.2).
 */
export function saringResepAman(
  semuaResep: ResepMasakan[],
  anggotaList: Anggota[],
  pemakaianHatiAyam: number = 0
): ResepMasakan[] {
  return semuaResep.filter((resep) => {
    const check = isResepAmanUntukKeluarga(resep, anggotaList, pemakaianHatiAyam);
    return check.aman;
  });
}

/**
 * Memeriksa apakah hidangan melanggar aturan variasi:
 * - Lauk hewani yang sama tidak boleh muncul 2 hari berturut-turut
 * - Resep yang sama tidak boleh muncul lebih dari 2 kali dalam 7 hari
 */
export function cekAturanVariasi(
  resep: ResepMasakan,
  hariKe: number,
  riwayatResepPerHari: ResepMasakan[][],
  frekuensiResepMingguan: Map<string, number>
): boolean {
  // Batas maksimal 2x per minggu untuk resep apa pun (kecuali nasi putih RSP001)
  if (resep.kode !== 'RSP001') {
    const frek = frekuensiResepMingguan.get(resep.kode) || 0;
    if (frek >= 2) return false;
  }

  // Jika lauk hewani, pastikan hari sebelumnya tidak menyajikan lauk yang sama
  if (resep.kategori === 'Lauk Hewani' && hariKe > 0) {
    const hariSebelumnya = riwayatResepPerHari[hariKe - 1] || [];
    const pernahMunculKemarin = hariSebelumnya.some((r) => r.kode === resep.kode);
    if (pernahMunculKemarin) return false;
  }

  return true;
}
