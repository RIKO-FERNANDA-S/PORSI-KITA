import { BahanPangan, NilaiGizi, ResepBahanItem } from '../types';
import { BAHAN_MAP } from '../data/dataset';

/**
 * Menghitung nilai gizi total resep dari daftar bahan (PRD 8.2)
 * Minyak goreng dan bumbu wajib disertakan eksplisit.
 */
export function hitungGiziResep(
  bahanItems: ResepBahanItem[],
  bahanMap: Map<string, BahanPangan> = BAHAN_MAP
): NilaiGizi {
  const gizi: NilaiGizi = {
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

  for (const item of bahanItems) {
    const bahan = bahanMap.get(item.kode_tkpi);
    if (!bahan) continue;

    const fraksi = item.jumlah_gram / 100;
    gizi.energi_kcal += bahan.energi_kcal * fraksi;
    gizi.protein_g += bahan.protein_g * fraksi;
    gizi.lemak_g = (gizi.lemak_g || 0) + bahan.lemak_g * fraksi;
    gizi.karbohidrat_g = (gizi.karbohidrat_g || 0) + bahan.karbohidrat_g * fraksi;
    gizi.kalsium_mg += bahan.kalsium_mg * fraksi;
    gizi.zat_besi_mg += bahan.zat_besi_mg * fraksi;
    gizi.seng_mg += bahan.seng_mg * fraksi;
    gizi.vitamin_a_mcg += bahan.vitamin_a_mcg * fraksi;
    gizi.retinol_mcg = (gizi.retinol_mcg || 0) + (bahan.retinol_mcg || 0) * fraksi;
  }

  return {
    energi_kcal: Math.round(gizi.energi_kcal * 10) / 10,
    protein_g: Math.round(gizi.protein_g * 10) / 10,
    lemak_g: Math.round((gizi.lemak_g || 0) * 10) / 10,
    karbohidrat_g: Math.round((gizi.karbohidrat_g || 0) * 10) / 10,
    kalsium_mg: Math.round(gizi.kalsium_mg * 10) / 10,
    zat_besi_mg: Math.round(gizi.zat_besi_mg * 10) / 10,
    seng_mg: Math.round(gizi.seng_mg * 10) / 10,
    vitamin_a_mcg: Math.round(gizi.vitamin_a_mcg * 10) / 10,
    retinol_mcg: Math.round((gizi.retinol_mcg || 0) * 10) / 10,
  };
}

/**
 * Menghitung biaya bahan suatu resep (PRD 8.8)
 * Rumus: Biaya = gram / (BDD / 100) / 100 * harga_per_100g
 */
export function hitungBiayaResep(
  bahanItems: ResepBahanItem[],
  bahanMap: Map<string, BahanPangan> = BAHAN_MAP
): number {
  let totalBiaya = 0;
  for (const item of bahanItems) {
    const bahan = bahanMap.get(item.kode_tkpi);
    if (!bahan) continue;

    const bddFactor = (bahan.bdd_percent > 0 ? bahan.bdd_percent : 100) / 100;
    const biaya = (item.jumlah_gram / bddFactor / 100) * bahan.harga_per_100g_rp;
    totalBiaya += biaya;
  }
  return Math.round(totalBiaya);
}

/**
 * Deteksi seluruh alergen dalam resep dari bahannya (PRD 8.7)
 * Alergen diwariskan otomatis dan bukan diketik manual.
 */
export function deteksiAlergenResep(
  bahanItems: ResepBahanItem[],
  bahanMap: Map<string, BahanPangan> = BAHAN_MAP
): string[] {
  const alergenSet = new Set<string>();
  for (const item of bahanItems) {
    const bahan = bahanMap.get(item.kode_tkpi);
    if (!bahan) continue;
    for (const a of bahan.alergen) {
      if (a) alergenSet.add(a.toLowerCase());
    }
  }
  return Array.from(alergenSet);
}
