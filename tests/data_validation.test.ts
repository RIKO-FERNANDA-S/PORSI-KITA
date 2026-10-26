import { describe, it, expect } from 'vitest';
import { AKG_LIST, BAHAN_LIST, BAHAN_MAP, RESEP_LIST, RESEP_MAP, PAKET_LIST } from '../lib/data/dataset';

describe('Gerbang Mutu Data (PRD Bagian 10): 4 Lapis Validasi Data', () => {
  it('Lapis 1: Format & Struktur Data (0 Error)', () => {
    // Memastikan dataset AKG terisi lengkap
    expect(AKG_LIST.length).toBeGreaterThanOrEqual(20);
    for (const a of AKG_LIST) {
      expect(a.kode_kelompok).toBeDefined();
      expect(a.energi_kcal).toBeGreaterThan(0);
      expect(a.protein_g).toBeGreaterThan(0);
    }

    // Memastikan dataset bahan terisi lengkap
    expect(BAHAN_LIST.length).toBeGreaterThanOrEqual(20);
    for (const b of BAHAN_LIST) {
      expect(b.kode_tkpi).toBeDefined();
      expect(b.nama).toBeDefined();
      expect(b.harga_per_100g_rp).toBeGreaterThan(0);
      expect(b.bdd_percent).toBeGreaterThan(0);
      expect(b.bdd_percent).toBeLessThanOrEqual(100);
    }
  });

  it('Lapis 2: Integritas Referensi Antar File (0 Referensi Patah)', () => {
    // Setiap bahan dalam seluruh resep harus terdaftar di tabel BAHAN_MAP
    for (const r of RESEP_LIST) {
      for (const b of r.bahan) {
        const bahanAda = BAHAN_MAP.get(b.kode_tkpi);
        expect(bahanAda).toBeDefined();
        expect(bahanAda!.harga_per_100g_rp).toBeGreaterThan(0);
      }
    }

    // Setiap resep dalam paket standar harus terdaftar di RESEP_MAP
    for (const p of PAKET_LIST) {
      for (const rKode of p.resep_kodes) {
        const resepAda = RESEP_MAP.get(rKode);
        expect(resepAda).toBeDefined();
      }
    }
  });

  it('Lapis 3: Kewajaran Fisikokimia Gizi (Faktor Atwater 4P + 4K + 9L)', () => {
    // Validasi kewajaran kalori menggunakan faktor Atwater pada bahan utama
    for (const b of BAHAN_LIST) {
      // Lewati bahan dengan kalori sangat rendah (<10 kcal) atau bumbu mikro
      if (b.energi_kcal < 20) continue;

      const kaloriHitung = 4 * b.protein_g + 4 * b.karbohidrat_g + 9 * b.lemak_g;
      // Periksa rasio kewajaran: tidak boleh melenceng ekstrem (>50% deviasi)
      const selisih = Math.abs(kaloriHitung - b.energi_kcal);
      const rasioDeviasi = selisih / b.energi_kcal;

      expect(rasioDeviasi).toBeLessThan(0.45);
    }
  });

  it('Lapis 4: Batas Keamanan Retinol & Pewarisan Alergen Otomatis', () => {
    // Hati ayam (CD005) harus memiliki kadar retinol yang sangat tinggi (>4000 mcg)
    const hatiAyam = BAHAN_MAP.get('CD005')!;
    expect(hatiAyam).toBeDefined();
    expect(hatiAyam.retinol_mcg).toBeGreaterThan(4000);

    // Resep RSP004 (Hati Ayam) harus memiliki catatan keamanan khusus
    const resep004 = RESEP_MAP.get('RSP004')!;
    expect(resep004.catatan_keamanan).toBeDefined();
    expect(resep004.catatan_keamanan).toContain('retinol');

    // Resep RSP025 harus dinonaktifkan di MVP
    const resep025 = RESEP_MAP.get('RSP025')!;
    expect(resep025.catatan_keamanan).toContain('Dinonaktifkan di MVP');

    // Seluruh resep harus mewarisi alergen dari bahan mentahnya
    for (const r of RESEP_LIST) {
      for (const b of r.bahan) {
        const bahan = BAHAN_MAP.get(b.kode_tkpi)!;
        for (const al of bahan.alergen) {
          expect(r.alergen).toContain(al.toLowerCase());
        }
      }
    }
  });
});
