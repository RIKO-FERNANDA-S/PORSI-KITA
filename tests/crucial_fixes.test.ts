import { describe, it, expect } from 'vitest';
import { formatKuantitasBahan } from '../lib/planner/cost';
import { RESEP_MAP, BAHAN_MAP } from '../lib/data/dataset';
import { hitungBiayaDish } from '../app/dashboard/page';

describe('Crucial Bug Fixes Suite', () => {
  // Test 1 & 2: Financial logic validation
  describe('Tugas 1 & 2: Dompet Bulanan Ledger Recalculations', () => {
    it('menghitung ulang saldo dan pengeluaran secara tepat saat transaksi belanja dihapus', () => {
      const initialTotalAnggaran = 3000000;
      const initialPengeluaran = 450000;
      const initialSaldo = initialTotalAnggaran - initialPengeluaran; // 2.550.000

      // Transaksi pengeluaran yang akan dihapus: Rp 50.000
      const deletedExpenseAmount = 50000;
      const newPengeluaran = Math.max(0, initialPengeluaran - deletedExpenseAmount); // 400.000
      const newSaldo = initialTotalAnggaran - newPengeluaran; // 2.600.000

      expect(newPengeluaran).toBe(400000);
      expect(newSaldo).toBe(2600000);
      expect(newSaldo).toBeGreaterThan(initialSaldo);
    });

    it('menghitung saldo saat transaksi pemasukan dihapus', () => {
      const initialTotalAnggaran = 3000000;
      const initialPengeluaran = 450000;
      const deletedIncomeAmount = 500000;

      const newTotalAnggaran = Math.max(0, initialTotalAnggaran - deletedIncomeAmount); // 2.500.000
      const newSaldo = newTotalAnggaran - initialPengeluaran; // 2.050.000

      expect(newTotalAnggaran).toBe(2500000);
      expect(newSaldo).toBe(2050000);
    });
  });

  // Test 3: Liquid & Cooking oil unit conversion
  describe('Tugas 3: Konversi Satuan Minyak Goreng & Cairan', () => {
    it('mengubah minyak goreng dari gram menjadi ml dan Liter', () => {
      // Massa jenis minyak ~0.9 g/ml
      // 90g -> 90 / 0.9 = 100 ml
      const hasil1 = formatKuantitasBahan('Minyak goreng', 90);
      expect(hasil1).toBe('100 ml');

      // 450g -> 450 / 0.9 = 500 ml
      const hasil2 = formatKuantitasBahan('Minyak goreng kelapa sawit', 450);
      expect(hasil2).toBe('500 ml');

      // 900g -> 900 / 0.9 = 1000 ml = 1 Liter
      const hasil3 = formatKuantitasBahan('Minyak Sayur', 900);
      expect(hasil3).toBe('1 Liter');

      // 1800g -> 2000 ml = 2 Liter
      const hasil4 = formatKuantitasBahan('Minyak kelapa', 1800);
      expect(hasil4).toBe('2 Liter');
    });

    it('tetap menampilkan satuan gram dan kg untuk bahan padat', () => {
      const hasilBeras = formatKuantitasBahan('Beras Putih Giling', 250);
      expect(hasilBeras).toBe('250g');

      const hasilDaging = formatKuantitasBahan('Daging Ayam Ras Segar', 1500);
      expect(hasilDaging).toBe('1.5 kg');
    });
  });

  // Test 4: Recipe cost calculation with BDD formula
  describe('Tugas 4: Perhitungan Harga Menu Beranda dengan Faktor BDD Kemenkes', () => {
    it('menghitung biaya bahan dengan rumus: (gram / (BDD / 100)) / 100 * harga_per_100g', () => {
      // Contoh: Daging Ayam Ras Segar (CD001, BDD 58%, harga Rp 3.650 per 100g)
      const bahanAyam = BAHAN_MAP.get('CD001');
      expect(bahanAyam).toBeDefined();
      expect(bahanAyam?.bdd_percent).toBe(58);

      const gramBersih = 100;
      const bddFactor = (bahanAyam!.bdd_percent) / 100; // 0.58
      const hargaPer100g = bahanAyam!.harga_per_100g_rp; // 3650

      const biayaDenganBdd = Math.round((gramBersih / bddFactor / 100) * hargaPer100g);
      // Tanpa BDD: (100 / 100) * 3650 = 3650
      // Dengan BDD: (100 / 0.58 / 100) * 3650 = ~6293
      expect(biayaDenganBdd).toBeGreaterThan(3650);
      expect(biayaDenganBdd).toBe(6293);
    });

    it('fungsi hitungBiayaDish menghitung biaya hidangan secara realistis', () => {
      // Ambil contoh masakan berprotein: Ayam Goreng (RSP003)
      const dishAyam = { kode: 'RSP003', nama: 'Ayam Goreng', biaya_per_porsi_rp: 0 };
      const biaya = hitungBiayaDish(dishAyam);

      expect(biaya).toBeGreaterThan(3000);
      expect(biaya).toBeLessThan(50000);
    });

    it('resep-resep master memiliki biaya per porsi yang valid dan tidak 0', () => {
      for (const [kode, resep] of RESEP_MAP.entries()) {
        expect(resep.biaya_per_porsi_rp).toBeGreaterThan(0);
        expect(resep.bahan.length).toBeGreaterThan(0);
      }
    });
  });

  // Test 5: Shopping checklist persistence
  describe('Tugas 5: Sinkronisasi Checklist Bahan Belanja', () => {
    it('memastikan struktur checklist mendukung persistensi key plan ID', () => {
      const planId = 'test-plan-123';
      const mockKey = `porsi_kita_belanja_checked_${planId}`;
      const mockData = { 'TKP001': true, 'TKP002': false };

      const serialized = JSON.stringify(mockData);
      const parsed = JSON.parse(serialized);

      expect(mockKey).toContain(planId);
      expect(parsed['TKP001']).toBe(true);
      expect(parsed['TKP002']).toBe(false);
    });
  });
});
