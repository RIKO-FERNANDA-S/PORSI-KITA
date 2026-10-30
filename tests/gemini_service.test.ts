import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { normalizeBahanCode } from '../prisma/seed';
import { getFamilyActivePrices } from '../lib/ai/gemini-service';
import { prisma } from '../lib/prisma';

describe('Standardisasi Bahan & Logika Harga Aktif Warung', () => {
  let testFamilyId: string;
  let testWarungId: string;

  beforeAll(async () => {
    // Siapkan data dummy keluarga & warung custom untuk pengujian prioritas
    const family = await prisma.family.create({
      data: {
        alias: 'Keluarga Uji Coba Prioritas Harga',
        wilayah: 'Pasar Uji Coba',
        owner_id: '00000000-0000-0000-0000-000000000099',
        tipe_budget: 'mingguan',
        budget_belanja: 500000,
      },
    });
    testFamilyId = family.id;

    const warung = await prisma.warung.create({
      data: {
        family_id: family.id,
        nama_warung: 'Warung Bu Siti Langganan',
      },
    });
    testWarungId = warung.id;

    // Pasang harga custom beras giling (BHN-001) yang berbeda dari harga acuan pasar (mis. Rp 1.650 / 100g)
    await prisma.hargaWarung.create({
      data: {
        warung_id: warung.id,
        kode_tkpi: 'BHN-001',
        harga_per_100g_rp: 1650,
      },
    });
  });

  afterAll(async () => {
    // Bersihkan data uji coba
    if (testFamilyId) {
      await prisma.family.delete({
        where: { id: testFamilyId },
      });
    }
  });

  it('harus menstandarisasi kode TKPI dan alias menjadi BHN-001 s.d BHN-060', () => {
    // Bahan langsung
    expect(normalizeBahanCode('AR001')).toBe('BHN-001'); // Beras giling
    expect(normalizeBahanCode('CD001')).toBe('BHN-002'); // Daging ayam
    expect(normalizeBahanCode('CD005')).toBe('BHN-003'); // Hati ayam
    expect(normalizeBahanCode('CD010')).toBe('BHN-004'); // Daging sapi
    expect(normalizeBahanCode('CF001')).toBe('BHN-005'); // Ikan kembung
    expect(normalizeBahanCode('CF015')).toBe('BHN-006'); // Ikan lele
    expect(normalizeBahanCode('CE001')).toBe('BHN-007'); // Telur ayam ras
    expect(normalizeBahanCode('BH001')).toBe('BHN-008'); // Tahu
    expect(normalizeBahanCode('BH002')).toBe('BHN-009'); // Tempe
    expect(normalizeBahanCode('DG001')).toBe('BHN-010'); // Bayam hijau
    expect(normalizeBahanCode('DG012')).toBe('BHN-011'); // Wortel
    expect(normalizeBahanCode('DG020')).toBe('BHN-012'); // Daun kelor
    expect(normalizeBahanCode('GR084')).toBe('BHN-060'); // Udang

    // Alias dari harga.csv
    expect(normalizeBahanCode('FR005')).toBe('BHN-002'); // Daging ayam ras
    expect(normalizeBahanCode('FR026')).toBe('BHN-004'); // Daging sapi
    expect(normalizeBahanCode('HR002')).toBe('BHN-007'); // Telur ayam ras
    expect(normalizeBahanCode('GR050')).toBe('BHN-005'); // Ikan kembung
    expect(normalizeBahanCode('CP061')).toBe('BHN-008'); // Tahu putih
    expect(normalizeBahanCode('CP077')).toBe('BHN-009'); // Tempe kedelai murni

    // Alias dari resep_bahan.csv
    expect(normalizeBahanCode('MG001')).toBe('BHN-016'); // Minyak goreng
    expect(normalizeBahanCode('GL001')).toBe('BHN-017'); // Gula pasir konsumsi
    expect(normalizeBahanCode('BW001')).toBe('BHN-018'); // Bawang merah
    expect(normalizeBahanCode('BW002')).toBe('BHN-019'); // Bawang putih honan
    expect(normalizeBahanCode('CB001')).toBe('BHN-020'); // Cabai merah keriting
    expect(normalizeBahanCode('MK001')).toBe('BHN-025'); // Kecap manis
    expect(normalizeBahanCode('MK002')).toBe('BHN-026'); // Tauco

    // Format yang sudah BHN-xxx tidak berubah
    expect(normalizeBahanCode('BHN-015')).toBe('BHN-015');
    expect(normalizeBahanCode('BHN-030')).toBe('BHN-030');
  });

  it('harus mengambil harga aktif dari Warung Default ketika keluarga belum memiliki warung custom', async () => {
    // Memanggil tanpa familyId
    const res = await getFamilyActivePrices(null);

    expect(res.activePrices.length).toBeGreaterThanOrEqual(60);
    expect(res.hasCustomWarung).toBe(false);
    expect(res.customPricesCount).toBe(0);

    // Cek beras giling (BHN-001) harga acuan pasar
    const beras = res.priceMap['BHN-001'];
    expect(beras).toBeDefined();
    expect(beras.nama_bahan).toBe('Beras giling');
    expect(beras.sumber_harga).toBe('default_pasar');
    expect(beras.harga_per_100g_rp).toBe(1350); // PIHPS acuan pasar 1350/100g

    // Cek minyak (BHN-016)
    const minyak = res.priceMap['BHN-016'];
    expect(minyak).toBeDefined();
    expect(minyak.harga_per_100g_rp).toBeGreaterThan(0);
  }, 15000);

  it('harus memprioritaskan harga custom dari warung keluarga dan fallback ke default pasar untuk bahan lainnya', async () => {
    const res = await getFamilyActivePrices(testFamilyId);

    expect(res.hasCustomWarung).toBe(true);
    expect(res.customPricesCount).toBe(1);

    // 1. Beras giling (BHN-001) harus menggunakan harga custom Warung Bu Siti Langganan
    const beras = res.priceMap['BHN-001'];
    expect(beras).toBeDefined();
    expect(beras.sumber_harga).toBe('custom_warung');
    expect(beras.nama_warung).toBe('Warung Bu Siti Langganan');
    expect(beras.harga_per_100g_rp).toBe(1650);

    // 2. Daging ayam (BHN-002) yang belum diinput di warung custom harus fallback ke default pasar
    const ayam = res.priceMap['BHN-002'];
    expect(ayam).toBeDefined();
    expect(ayam.sumber_harga).toBe('default_pasar');
    expect(ayam.harga_per_100g_rp).toBe(3650); // Acuan pasar default
  }, 15000);
});
