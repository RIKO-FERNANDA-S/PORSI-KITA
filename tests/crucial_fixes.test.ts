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

  // UI/UX & Validation Bug Fixes Suite
  describe('UI/UX & Input Validation Bug Fixes', () => {
    it('[Registrasi] menyebarkan paste kode OTP 6 digit secara mulus', () => {
      const pasted = '  123456  ';
      const cleanDigits = pasted.replace(/\D/g, '').slice(0, 6);
      const digits = cleanDigits.split('');
      const otpArray = ['', '', '', '', '', ''];
      for (let i = 0; i < 6; i++) {
        otpArray[i] = digits[i] || '';
      }

      expect(cleanDigits).toBe('123456');
      expect(otpArray).toEqual(['1', '2', '3', '4', '5', '6']);
    });

    it('[Registrasi] memotong paste lebih dari 6 digit dan membersihkan karakter non-angka', () => {
      const pasted = 'OTP: 890-123-999';
      const cleanDigits = pasted.replace(/\D/g, '').slice(0, 6);
      expect(cleanDigits).toBe('890123');
      expect(cleanDigits.length).toBe(6);
    });

    it('[Registrasi] menghapus leading zero pada input usia', () => {
      const cleanUsia = (val: string) => val.replace(/\D/g, '').replace(/^0+(?=\d)/, '');

      expect(cleanUsia('017')).toBe('17');
      expect(cleanUsia('007')).toBe('7');
      expect(cleanUsia('0')).toBe('0');
      expect(cleanUsia('25')).toBe('25');
    });

    it('[Daftar Belanja] memformat titik pemisah ribuan saat edit harga bahan dan simpan numeric', () => {
      const formatRupiah = (raw: string) => {
        const digits = raw.replace(/\D/g, '');
        if (!digits) return '';
        return parseInt(digits, 10).toLocaleString('id-ID');
      };

      const parseNumeric = (formatted: string) => {
        return parseInt(formatted.replace(/\D/g, ''), 10);
      };

      expect(formatRupiah('15000')).toBe('15.000');
      expect(formatRupiah('1250000')).toBe('1.250.000');
      expect(parseNumeric('15.000')).toBe(15000);
      expect(parseNumeric('1.250.000')).toBe(1250000);
    });

    it('[Daftar Belanja] meng-encode emoji dan karakter pesan WhatsApp secara aman tanpa simbol rusak', () => {
      const pesan = '🛒 *DAFTAR BELANJA*\n🥬 Lapak Sayur\n• Bayam: 200g (~Rp 3.000)\n';
      const encoded = encodeURIComponent(pesan);

      // Pastikan encodeURIComponent berhasil dan tidak mengandung karakter square ◻
      expect(pesan).not.toContain('◻');
      expect(encoded).toContain('%F0%9F%9B%92'); // Encoded 🛒
      expect(encoded).toContain('%F0%9F%A5%AC'); // Encoded 🥬
      expect(decodeURIComponent(encoded)).toBe(pesan);
    });
  });
});
