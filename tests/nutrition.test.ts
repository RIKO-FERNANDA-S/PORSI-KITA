import { describe, it, expect } from 'vitest';
import { Anggota } from '../lib/types';
import { hitungKebutuhan, getBatasRetinolHarian } from '../lib/nutrition/akg';
import { hitungGiziResep, hitungBiayaResep, deteksiAlergenResep } from '../lib/nutrition/recipe';
import { tentukanPorsi } from '../lib/nutrition/portions';
import { hitungSkorAnggota, hitungSkorKeluarga, tentukanStatusKecukupan } from '../lib/nutrition/score';
import { isResepAmanUntukKeluarga } from '../lib/nutrition/safety';
import { RESEP_MAP, BAHAN_MAP } from '../lib/data/dataset';

describe('Mesin Gizi: AKG dan Kebutuhan Anggota (PRD 8.1)', () => {
  it('1. Menghitung AKG anak usia 3 tahun (kelompok 1-3 tahun)', () => {
    const anak: Anggota = {
      id: 'a1',
      alias: 'Adik',
      usia_tahun: 3,
      jenis_kelamin: 'L',
      status: 'umum',
      alergen: [],
    };
    const kebutuhan = hitungKebutuhan(anak);
    expect(kebutuhan.energi_kcal).toBe(1350);
    expect(kebutuhan.protein_g).toBe(20);
    expect(kebutuhan.kalsium_mg).toBe(650);
    expect(kebutuhan.zat_besi_mg).toBe(7.0);
    expect(kebutuhan.batas_retinol_mcg).toBe(600);
  });

  it('2. Menghitung AKG anak usia 8 tahun (kelompok 7-9 tahun)', () => {
    const anak: Anggota = {
      id: 'a2',
      alias: 'Kakak',
      usia_tahun: 8,
      jenis_kelamin: 'P',
      status: 'umum',
      alergen: [],
    };
    const kebutuhan = hitungKebutuhan(anak);
    expect(kebutuhan.energi_kcal).toBe(1650);
    expect(kebutuhan.protein_g).toBe(40);
    expect(kebutuhan.kalsium_mg).toBe(1000);
  });

  it('3. Menghitung AKG ibu hamil trimester 2 (dasar wanita 28 th + tambahan T2)', () => {
    const bumil: Anggota = {
      id: 'bumil',
      alias: 'Ibu Lina',
      usia_tahun: 28,
      jenis_kelamin: 'P',
      status: 'hamil_t2',
      alergen: [],
    };
    const kebutuhan = hitungKebutuhan(bumil);
    // Dasar wanita 19-29th: 2250 kcal, 60g protein, 600mcg Vit A, 1000mg Ca, 18mg Fe, 8mg Zn
    // Tambahan Hamil T2: +300 kcal, +10g protein, +300mcg Vit A, +200mg Ca, +9mg Fe, +4mg Zn
    expect(kebutuhan.energi_kcal).toBe(2250 + 300);
    expect(kebutuhan.protein_g).toBe(60 + 10);
    expect(kebutuhan.vitamin_a_mcg).toBe(600 + 300);
    expect(kebutuhan.kalsium_mg).toBe(1000 + 200);
    expect(kebutuhan.zat_besi_mg).toBe(18 + 9);
    expect(kebutuhan.seng_mg).toBe(8 + 4);
  });

  it('4. Menghitung AKG lansia perempuan 68 tahun', () => {
    const nenek: Anggota = {
      id: 'nenek',
      alias: 'Nenek',
      usia_tahun: 68,
      jenis_kelamin: 'P',
      status: 'umum',
      alergen: [],
    };
    const kebutuhan = hitungKebutuhan(nenek);
    expect(kebutuhan.energi_kcal).toBe(1550);
    expect(kebutuhan.protein_g).toBe(58);
    expect(kebutuhan.kalsium_mg).toBe(1200);
  });

  it('5. Menghitung AKG remaja putri 12 tahun', () => {
    const remaja: Anggota = {
      id: 'remaja',
      alias: 'Siti',
      usia_tahun: 12,
      jenis_kelamin: 'P',
      status: 'umum',
      alergen: ['telur'],
    };
    const kebutuhan = hitungKebutuhan(remaja);
    expect(kebutuhan.energi_kcal).toBe(1900);
    expect(kebutuhan.protein_g).toBe(55);
    expect(kebutuhan.zat_besi_mg).toBe(8.0);
  });
});

describe('Mesin Gizi: Resep, Alergen, dan Biaya (PRD 8.2, 8.7, 8.8)', () => {
  it('6. Menghitung nilai gizi resep dari bahan (Nasi Putih RSP001)', () => {
    const resep = RESEP_MAP.get('RSP001')!;
    expect(resep).toBeDefined();
    const gizi = hitungGiziResep(resep.bahan, BAHAN_MAP);
    expect(gizi.energi_kcal).toBe(360);
    expect(gizi.protein_g).toBe(6.8);
    expect(gizi.karbohidrat_g).toBe(78.9);
  });

  it('7. Deteksi alergen otomatis dari bahan (Telur Dadar RSP005 memiliki alergen telur)', () => {
    const resep = RESEP_MAP.get('RSP005')!;
    const alergen = deteksiAlergenResep(resep.bahan, BAHAN_MAP);
    expect(alergen).toContain('telur');
  });

  it('8. Deteksi alergen kedelai pada Tahu Bacem (RSP010)', () => {
    const resep = RESEP_MAP.get('RSP010')!;
    const alergen = deteksiAlergenResep(resep.bahan, BAHAN_MAP);
    expect(alergen).toContain('kedelai');
  });

  it('9. Menghitung biaya resep dengan faktor BDD', () => {
    const resep = RESEP_MAP.get('RSP001')!;
    const biaya = hitungBiayaResep(resep.bahan, BAHAN_MAP);
    // Beras 100g, BDD 100%, harga 1350/100g -> biaya Rp 1350
    expect(biaya).toBe(1350);
  });
});

describe('Mesin Gizi: Penentuan Porsi (PRD 8.4)', () => {
  it('10. Pengali porsi selalu berupa kelipatan 0.25 (min 0.25)', () => {
    // Sesi siang: fraksi 0.4. Kebutuhan harian 2000 kcal -> target 800 kcal
    // Total energi hidangan = 800 kcal -> pengali 1.0
    const p1 = tentukanPorsi(2000, 0.4, 800);
    expect(p1).toBe(1.0);

    // Kebutuhan anak 1350 kcal -> target 540 kcal. Total hidangan 800 kcal -> 540/800 = 0.675 -> dibulatkan ke 0.75
    const p2 = tentukanPorsi(1350, 0.4, 800);
    expect(p2).toBe(0.75);

    // Target sangat kecil harus tetap minimal 0.25
    const pMin = tentukanPorsi(300, 0.3, 1000);
    expect(pMin).toBe(0.25);
  });
});

describe('Mesin Gizi: Skor Kecukupan (PRD 8.5)', () => {
  it('11. Status kecukupan: tercukupi (>=90%), hampir (70-89%), kurang (<70%)', () => {
    expect(tentukanStatusKecukupan(0.95)).toBe('tercukupi');
    expect(tentukanStatusKecukupan(0.75)).toBe('hampir');
    expect(tentukanStatusKecukupan(0.65)).toBe('kurang');
  });

  it('12. Skor anggota dibatasi maksimal 1.0 per zat dan dirata-ratakan 6 zat', () => {
    const asupan = {
      energi_kcal: 2000,
      protein_g: 65,
      zat_besi_mg: 9,
      kalsium_mg: 1000,
      seng_mg: 11,
      vitamin_a_mcg: 650,
    };
    const kebutuhan = {
      kelompok_usia: 'Dewasa',
      energi_kcal: 2000,
      protein_g: 65,
      zat_besi_mg: 9,
      kalsium_mg: 1000,
      seng_mg: 11,
      vitamin_a_mcg: 650,
      batas_retinol_mcg: 3000,
    };
    const skor = hitungSkorAnggota('m1', 'Ayah', asupan, kebutuhan);
    expect(skor.skor_rata_rata).toBe(100);
    expect(skor.status).toBe('tercukupi');
  });

  it('13. Skor keluarga menampilkan skor rata-rata dan skor anggota terendah', () => {
    const skorA = {
      anggota_id: '1',
      alias: 'Ayah',
      skor_rata_rata: 95,
      status: 'tercukupi' as const,
      rincian_zat: {},
      asupan_total: { energi_kcal: 0, protein_g: 0, zat_besi_mg: 0, kalsium_mg: 0, seng_mg: 0, vitamin_a_mcg: 0 },
      kebutuhan: { kelompok_usia: '', energi_kcal: 0, protein_g: 0, zat_besi_mg: 0, kalsium_mg: 0, seng_mg: 0, vitamin_a_mcg: 0, batas_retinol_mcg: 3000 },
    };
    const skorB = {
      anggota_id: '2',
      alias: 'Kakak',
      skor_rata_rata: 75,
      status: 'hampir' as const,
      rincian_zat: {},
      asupan_total: { energi_kcal: 0, protein_g: 0, zat_besi_mg: 0, kalsium_mg: 0, seng_mg: 0, vitamin_a_mcg: 0 },
      kebutuhan: { kelompok_usia: '', energi_kcal: 0, protein_g: 0, zat_besi_mg: 0, kalsium_mg: 0, seng_mg: 0, vitamin_a_mcg: 0, batas_retinol_mcg: 900 },
    };
    const keluarga = hitungSkorKeluarga([skorA, skorB]);
    expect(keluarga.skor_rata_rata).toBe(85);
    expect(keluarga.skor_terendah).toBe(75);
    expect(keluarga.anggota_skor_terendah).toBe('Kakak');
  });
});

describe('Keamanan & Batas Gizi Produk (PRD 8.6 & 8.7)', () => {
  it('14. RSP025 selalu ditolak di MVP', () => {
    const r025 = RESEP_MAP.get('RSP025')!;
    const check = isResepAmanUntukKeluarga(r025, []);
    expect(check.aman).toBe(false);
  });

  it('15. Hati ayam (RSP004) ditolak jika ada anggota balita 2-3 tahun', () => {
    const balita: Anggota = {
      id: 'b1',
      alias: 'Balita',
      usia_tahun: 3,
      jenis_kelamin: 'L',
      status: 'umum',
      alergen: [],
    };
    const rHati = RESEP_MAP.get('RSP004')!;
    const check = isResepAmanUntukKeluarga(rHati, [balita], 0);
    expect(check.aman).toBe(false);
  });

  it('16. Hati ayam (RSP004) ditolak jika ada ibu hamil trimester 1', () => {
    const bumilT1: Anggota = {
      id: 'bumil',
      alias: 'Ibu',
      usia_tahun: 30,
      jenis_kelamin: 'P',
      status: 'hamil_t1',
      alergen: [],
    };
    const rHati = RESEP_MAP.get('RSP004')!;
    const check = isResepAmanUntukKeluarga(rHati, [bumilT1], 0);
    expect(check.aman).toBe(false);
  });

  it('17. Filter alergen: Telur Dadar ditolak jika ada anggota keluarga alergi telur', () => {
    const anggotaAlergi: Anggota = {
      id: 'a1',
      alias: 'Siti',
      usia_tahun: 12,
      jenis_kelamin: 'P',
      status: 'umum',
      alergen: ['telur'],
    };
    const rTelur = RESEP_MAP.get('RSP005')!;
    const check = isResepAmanUntukKeluarga(rTelur, [anggotaAlergi], 0);
    expect(check.aman).toBe(false);
    expect(check.alasan).toContain('telur');
  });
});
