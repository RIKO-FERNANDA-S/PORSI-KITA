import { describe, it, expect } from 'vitest';
import { isResepAmanUntukKeluarga } from '../lib/nutrition/safety';
import { generateMenu } from '../lib/planner/generate';
import { cariPenggantiHidangan } from '../lib/planner/swap';
import { RESEP_MAP, RESEP_LIST } from '../lib/data/dataset';
import { Anggota } from '../lib/types';

describe('Penegakan Keamanan Gizi Ketat Porsi Kita', () => {
  const anggotaNormalDewasa: Anggota = {
    id: 'd1',
    alias: 'Budi (Dewasa)',
    usia_tahun: 30,
    jenis_kelamin: 'L',
    status: 'umum',
    alergen: [],
  };

  const anggotaIbuNormal: Anggota = {
    id: 'd2',
    alias: 'Siti (Ibu)',
    usia_tahun: 28,
    jenis_kelamin: 'P',
    status: 'umum',
    alergen: [],
  };

  const anggotaBalita2Th: Anggota = {
    id: 'b2',
    alias: 'Adik (2 Tahun)',
    usia_tahun: 2,
    jenis_kelamin: 'L',
    status: 'umum',
    alergen: [],
  };

  const anggotaBalita3Th: Anggota = {
    id: 'b3',
    alias: 'Kakak (3 Tahun)',
    usia_tahun: 3,
    jenis_kelamin: 'P',
    status: 'umum',
    alergen: [],
  };

  const anggotaBumilT1: Anggota = {
    id: 'bumil_t1',
    alias: 'Ibu Hamil Trimester 1',
    usia_tahun: 29,
    jenis_kelamin: 'P',
    status: 'hamil_t1',
    alergen: [],
  };

  const rHatiAyam = RESEP_MAP.get('RSP004')!;
  const rBuburTimHati = RESEP_MAP.get('RSP025')!;
  const rTelurDadar = RESEP_MAP.get('RSP005')!;
  const rPepesIkan = RESEP_MAP.get('RSP006')!;

  describe('1. Aturan Hati Ayam (RSP004): Maksimal 1x per Minggu', () => {
    it('memperbolehkan hati ayam jika belum pernah dikonsumsi minggu ini (count = 0)', () => {
      const check = isResepAmanUntukKeluarga(rHatiAyam, [anggotaNormalDewasa, anggotaIbuNormal], 0);
      expect(check.aman).toBe(true);
    });

    it('menolak hati ayam jika sudah dikonsumsi 1 kali minggu ini (count = 1)', () => {
      const check = isResepAmanUntukKeluarga(rHatiAyam, [anggotaNormalDewasa, anggotaIbuNormal], 1);
      expect(check.aman).toBe(false);
      expect(check.alasan).toContain('maksimal 1 kali');
    });

    it('menolak hati ayam jika frekuensi minggu ini >= 2', () => {
      const check = isResepAmanUntukKeluarga(rHatiAyam, [anggotaNormalDewasa, anggotaIbuNormal], 2);
      expect(check.aman).toBe(false);
    });
  });

  describe('2. Aturan Hati Ayam: Dilarang untuk Balita Usia 2-3 Tahun', () => {
    it('menolak hati ayam jika ada anggota keluarga berusia 2 tahun', () => {
      const check = isResepAmanUntukKeluarga(rHatiAyam, [anggotaNormalDewasa, anggotaBalita2Th], 0);
      expect(check.aman).toBe(false);
      expect(check.alasan).toContain('2-3 tahun');
    });

    it('menolak hati ayam jika ada anggota keluarga berusia 3 tahun', () => {
      const check = isResepAmanUntukKeluarga(rHatiAyam, [anggotaNormalDewasa, anggotaBalita3Th], 0);
      expect(check.aman).toBe(false);
      expect(check.alasan).toContain('2-3 tahun');
    });

    it('memperbolehkan hati ayam jika anak tertua berusia 4 tahun ke atas', () => {
      const anak4Th: Anggota = {
        id: 'a4',
        alias: 'Anak 4 Tahun',
        usia_tahun: 4,
        jenis_kelamin: 'L',
        status: 'umum',
        alergen: [],
      };
      const check = isResepAmanUntukKeluarga(rHatiAyam, [anggotaNormalDewasa, anak4Th], 0);
      expect(check.aman).toBe(true);
    });
  });

  describe('3. Aturan Hati Ayam: Dilarang untuk Ibu Hamil Trimester 1', () => {
    it('menolak hati ayam jika ada ibu hamil trimester 1 (status: hamil_t1)', () => {
      const check = isResepAmanUntukKeluarga(rHatiAyam, [anggotaNormalDewasa, anggotaBumilT1], 0);
      expect(check.aman).toBe(false);
      expect(check.alasan).toContain('trimester 1');
    });

    it('menolak hati ayam jika status_khusus mengandung "Ibu Hamil Trimester 1"', () => {
      const bumilCustom: any = {
        id: 'bumil_custom',
        alias: 'Ibu Hamil TM1',
        usia_tahun: 27,
        jenis_kelamin: 'P',
        status_khusus: 'Ibu Hamil Trimester 1',
        alergen: [],
      };
      const check = isResepAmanUntukKeluarga(rHatiAyam, [bumilCustom], 0);
      expect(check.aman).toBe(false);
    });

    it('memperbolehkan hati ayam untuk ibu hamil trimester 2 (hamil_t2) jika tidak ada balita', () => {
      const bumilT2: Anggota = {
        id: 'bumil_t2',
        alias: 'Ibu Hamil Trimester 2',
        usia_tahun: 30,
        jenis_kelamin: 'P',
        status: 'hamil_t2',
        alergen: [],
      };
      const check = isResepAmanUntukKeluarga(rHatiAyam, [bumilT2], 0);
      expect(check.aman).toBe(true);
    });
  });

  describe('4. RSP025 (Bubur Tim Hati untuk Balita) Selalu Nonaktif', () => {
    it('menolak RSP025 untuk keluarga tanpa balita sekalipun', () => {
      const check = isResepAmanUntukKeluarga(rBuburTimHati, [anggotaNormalDewasa]);
      expect(check.aman).toBe(false);
      expect(check.alasan).toContain('dinonaktifkan');
    });

    it('menolak RSP025 pada fungsi cariPenggantiHidangan (swap)', () => {
      const opsi = cariPenggantiHidangan(rHatiAyam, [anggotaNormalDewasa], 0);
      const adaRSP025 = opsi.some((o) => o.resep.kode === 'RSP025');
      expect(adaRSP025).toBe(false);
    });
  });

  describe('5. Penyingkiran Alergen Sekeluarga (Household Exclusion)', () => {
    it('menyingkirkan resep Telur Dadar jika hanya satu anak yang alergi telur', () => {
      const anakAlergiTelur: Anggota = {
        id: 'anak_telur',
        alias: 'Putri',
        usia_tahun: 8,
        jenis_kelamin: 'P',
        status: 'umum',
        alergen: ['telur'],
      };
      // Ayah dan Ibu tidak alergi, namun ada 1 anak alergi
      const check = isResepAmanUntukKeluarga(rTelurDadar, [
        anggotaNormalDewasa,
        anggotaIbuNormal,
        anakAlergiTelur,
      ]);
      expect(check.aman).toBe(false);
      expect(check.alasan).toContain('alergen');
    });

    it('menyingkirkan resep Pepes Ikan jika ada anggota keluarga alergi ikan', () => {
      const ayahAlergiIkan: Anggota = {
        id: 'ayah_ikan',
        alias: 'Pak Joko',
        usia_tahun: 35,
        jenis_kelamin: 'L',
        status: 'umum',
        alergen: ['ikan'],
      };
      const check = isResepAmanUntukKeluarga(rPepesIkan, [ayahAlergiIkan, anggotaIbuNormal]);
      expect(check.aman).toBe(false);
    });
  });

  describe('6. Integrasi Planner Menu 7 Hari (generateMenu)', () => {
    it('memastikan jadwal menu keluarga dengan balita 3 tahun 100% BEBAS dari Hati Ayam (0x seminggu)', () => {
      const plan = generateMenu({
        familyId: 'fam_balita',
        budgetHarianRp: 80000,
        anggota: [anggotaNormalDewasa, anggotaIbuNormal, anggotaBalita3Th],
      });

      let hitunganHati = 0;
      let hitunganR025 = 0;

      for (const hari of plan.hari) {
        for (const sesi of [hari.sesi_makan.pagi, hari.sesi_makan.siang, hari.sesi_makan.malam]) {
          for (const dish of sesi.hidangan) {
            if (dish.kode === 'RSP004') hitunganHati++;
            if (dish.kode === 'RSP025') hitunganR025++;
          }
        }
      }

      expect(hitunganHati).toBe(0);
      expect(hitunganR025).toBe(0);
    });

    it('memastikan jadwal menu keluarga dengan bumil T1 100% BEBAS dari Hati Ayam (0x seminggu)', () => {
      const plan = generateMenu({
        familyId: 'fam_bumil',
        budgetHarianRp: 75000,
        anggota: [anggotaNormalDewasa, anggotaBumilT1],
      });

      let hitunganHati = 0;
      for (const hari of plan.hari) {
        for (const sesi of [hari.sesi_makan.pagi, hari.sesi_makan.siang, hari.sesi_makan.malam]) {
          for (const dish of sesi.hidangan) {
            if (dish.kode === 'RSP004') hitunganHati++;
          }
        }
      }

      expect(hitunganHati).toBe(0);
    });

    it('memastikan hati ayam dijadwalkan MAKSIMAL 1 KALI dalam seminggu untuk keluarga tanpa balita/bumil T1', () => {
      const plan = generateMenu({
        familyId: 'fam_dewasa',
        budgetHarianRp: 90000,
        anggota: [anggotaNormalDewasa, anggotaIbuNormal],
      });

      let hitunganHati = 0;
      for (const hari of plan.hari) {
        for (const sesi of [hari.sesi_makan.pagi, hari.sesi_makan.siang, hari.sesi_makan.malam]) {
          for (const dish of sesi.hidangan) {
            if (dish.kode === 'RSP004') hitunganHati++;
          }
        }
      }

      expect(hitunganHati).toBeLessThanOrEqual(1);
    });

    it('memastikan TIDAK ADA hidangan yang mengandung alergen jika 1 anggota keluarga alergi', () => {
      const anakAlergiTelur: Anggota = {
        id: 'a_telur',
        alias: 'Rian',
        usia_tahun: 7,
        jenis_kelamin: 'L',
        status: 'umum',
        alergen: ['telur'],
      };

      const plan = generateMenu({
        familyId: 'fam_alergi',
        budgetHarianRp: 70000,
        anggota: [anggotaNormalDewasa, anggotaIbuNormal, anakAlergiTelur],
      });

      for (const hari of plan.hari) {
        for (const sesi of [hari.sesi_makan.pagi, hari.sesi_makan.siang, hari.sesi_makan.malam]) {
          for (const dish of sesi.hidangan) {
            expect(dish.alergen).not.toContain('telur');
            expect(dish.nama.toLowerCase()).not.toContain('telur');
          }
        }
      }
    });
  });
});
