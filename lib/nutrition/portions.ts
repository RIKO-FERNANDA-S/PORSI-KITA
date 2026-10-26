import { Anggota, KebutuhanGizi, NilaiGizi, PorsiAnggotaWaktuMakan, ResepMasakan } from '../types';

/**
 * Pembagian energi per waktu makan (PRD 8.4)
 * Pagi: 30%, Siang: 40%, Malam: 30%
 */
export const FRAKSI_SESI_MAKAN = {
  pagi: 0.3,
  siang: 0.4,
  malam: 0.3,
} as const;

/**
 * Menghitung pengali porsi untuk satu anggota pada sesi makan tertentu (PRD 8.4).
 *
 * Rumus:
 * Target Energi = Kebutuhan Energi Harian Anggota * Fraksi Sesi (0.3 atau 0.4)
 * Pengali = Target Energi / Total Energi 1 Porsi Dasar Seluruh Hidangan
 * Dibulatkan ke kelipatan 0.25 terdekat (min 0.25).
 */
export function tentukanPorsi(
  kebutuhanEnergiHarian: number,
  fraksiSesi: number,
  totalEnergiDasarSesi: number
): number {
  if (totalEnergiDasarSesi <= 0) return 1.0;

  const targetEnergi = kebutuhanEnergiHarian * fraksiSesi;
  const rawMultiplier = targetEnergi / totalEnergiDasarSesi;

  // Bulatkan ke kelipatan 0.25 terdekat
  const rounded = Math.round(rawMultiplier / 0.25) * 0.25;

  // Batas minimal 0.25
  return Math.max(0.25, rounded);
}

/**
 * Menghitung alokasi porsi dan asupan gizi yang diterima setiap anggota keluarga
 * dalam satu sesi makan (PRD 8.4).
 */
export function hitungPorsiSesiMakan(
  anggotaList: Anggota[],
  kebutuhanMap: Map<string, KebutuhanGizi>,
  hidangan: ResepMasakan[],
  fraksiSesi: number
): {
  totalEnergiDasar: number;
  porsiPerAnggota: PorsiAnggotaWaktuMakan[];
} {
  // Hitung total energi 1 porsi dasar seluruh hidangan
  const totalEnergiDasar = hidangan.reduce(
    (sum, r) => sum + r.gizi_per_porsi.energi_kcal,
    0
  );

  const porsiPerAnggota: PorsiAnggotaWaktuMakan[] = anggotaList.map((anggota) => {
    const kebutuhan = kebutuhanMap.get(anggota.id);
    const kebutuhanEnergi = kebutuhan?.energi_kcal ?? 2000;
    const pengali = tentukanPorsi(kebutuhanEnergi, fraksiSesi, totalEnergiDasar);

    // Hitung gizi yang diterima anggota = gizi 1 porsi hidangan * pengali
    const giziDiterima: NilaiGizi = {
      energi_kcal: 0,
      protein_g: 0,
      lemak_g: 0,
      karbohidrat_g: 0,
      kalsium_mg: 0,
      zat_besi_mg: 0,
      seng_mg: 0,
      vitamin_a_mcg: 0,
      retinol_mcg: 0,
    };

    for (const h of hidangan) {
      giziDiterima.energi_kcal += h.gizi_per_porsi.energi_kcal * pengali;
      giziDiterima.protein_g += h.gizi_per_porsi.protein_g * pengali;
      giziDiterima.lemak_g = (giziDiterima.lemak_g || 0) + (h.gizi_per_porsi.lemak_g || 0) * pengali;
      giziDiterima.karbohidrat_g =
        (giziDiterima.karbohidrat_g || 0) + (h.gizi_per_porsi.karbohidrat_g || 0) * pengali;
      giziDiterima.kalsium_mg += h.gizi_per_porsi.kalsium_mg * pengali;
      giziDiterima.zat_besi_mg += h.gizi_per_porsi.zat_besi_mg * pengali;
      giziDiterima.seng_mg += h.gizi_per_porsi.seng_mg * pengali;
      giziDiterima.vitamin_a_mcg += h.gizi_per_porsi.vitamin_a_mcg * pengali;
      giziDiterima.retinol_mcg =
        (giziDiterima.retinol_mcg || 0) + (h.gizi_per_porsi.retinol_mcg || 0) * pengali;
    }

    // Pembulatan 1 angka di belakang koma
    return {
      anggota_id: anggota.id,
      alias: anggota.alias,
      pengali,
      gizi_diterima: {
        energi_kcal: Math.round(giziDiterima.energi_kcal * 10) / 10,
        protein_g: Math.round(giziDiterima.protein_g * 10) / 10,
        lemak_g: Math.round((giziDiterima.lemak_g || 0) * 10) / 10,
        karbohidrat_g: Math.round((giziDiterima.karbohidrat_g || 0) * 10) / 10,
        kalsium_mg: Math.round(giziDiterima.kalsium_mg * 10) / 10,
        zat_besi_mg: Math.round(giziDiterima.zat_besi_mg * 10) / 10,
        seng_mg: Math.round(giziDiterima.seng_mg * 10) / 10,
        vitamin_a_mcg: Math.round(giziDiterima.vitamin_a_mcg * 10) / 10,
        retinol_mcg: Math.round((giziDiterima.retinol_mcg || 0) * 10) / 10,
      },
    };
  });

  return {
    totalEnergiDasar,
    porsiPerAnggota,
  };
}
