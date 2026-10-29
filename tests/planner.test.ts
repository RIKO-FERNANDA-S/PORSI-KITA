import { describe, it, expect } from 'vitest';
import { Anggota } from '../lib/types';
import { generateMenu } from '../lib/planner/generate';
import { buatDaftarBelanjaMingguan, formatTeksWhatsAppBelanja, buatTautanWhatsApp } from '../lib/planner/cost';
import { cariPenggantiHidangan } from '../lib/planner/swap';
import { RESEP_MAP } from '../lib/data/dataset';

describe('Menu Generator: 3 Profil Tetap PRD (PRD 9 & 17)', () => {
  it('18. Keluarga A (Ibu 32, Ayah 35, Anak 3 th, Anak 8 th) menghasilkan menu 7 hari tanpa hati ayam untuk balita', () => {
    const keluargaA: Anggota[] = [
      { id: 'ibu', alias: 'Bu Sari', usia_tahun: 32, jenis_kelamin: 'P', status: 'umum', alergen: [] },
      { id: 'ayah', alias: 'Pak Joko', usia_tahun: 35, jenis_kelamin: 'L', status: 'umum', alergen: [] },
      { id: 'anak1', alias: 'Rian', usia_tahun: 8, jenis_kelamin: 'L', status: 'umum', alergen: [] },
      { id: 'anak2', alias: 'Ayu', usia_tahun: 3, jenis_kelamin: 'P', status: 'umum', alergen: [] },
    ];

    const menu = generateMenu({
      familyId: 'keluarga-a',
      familyName: 'Keluarga Bu Sari',
      budgetHarianRp: 85000,
      anggota: keluargaA,
      seed: 'seed-keluarga-a',
    });

    expect(menu.hari.length).toBe(7);
    expect(menu.total_biaya_mingguan_rp).toBeGreaterThan(0);

    // Karena ada anak usia 3 th, menu hati ayam (RSP004) TIDAK boleh dijadwalkan sama sekali
    for (const h of menu.hari) {
      const allDishes = [
        ...h.sesi_makan.pagi.hidangan,
        ...h.sesi_makan.siang.hidangan,
        ...h.sesi_makan.malam.hidangan,
      ];
      const hasLiver = allDishes.some((d) => d.kode === 'RSP004');
      expect(hasLiver).toBe(false);

      // Verifikasi efisiensi masak sayur keluarga Indonesia:
      // Pagi & Siang SELALU berbagi sayur yang sama (cukup masak 1x di pagi hari)
      const sayurPagi = h.sesi_makan.pagi.hidangan.find((d) => d.kategori === 'Sayuran');
      const sayurSiang = h.sesi_makan.siang.hidangan.find((d) => d.kategori === 'Sayuran');
      const sayurMalam = h.sesi_makan.malam.hidangan.find((d) => d.kategori === 'Sayuran');

      expect(sayurPagi).toBeDefined();
      expect(sayurSiang).toBeDefined();
      expect(sayurPagi!.kode).toBe(sayurSiang!.kode); // Pagi & Siang 100% identik

      // Jumlah masakan sayur unik per hari maksimal 2 (1x masak seharian atau 2x masak)
      const sayurCodesToday = new Set(
        [sayurPagi?.kode, sayurSiang?.kode, sayurMalam?.kode].filter(Boolean)
      );
      expect(sayurCodesToday.size).toBeLessThanOrEqual(2);
    }
  });

  it('19. Keluarga B (Ibu hamil T2 usia 28, Anak 5 th, Nenek 68 th) sukses dengan pemenuhan gizi seimbang', () => {
    const keluargaB: Anggota[] = [
      { id: 'bumil', alias: 'Bu Lina', usia_tahun: 28, jenis_kelamin: 'P', status: 'hamil_t2', alergen: [] },
      { id: 'anak', alias: 'Doni', usia_tahun: 5, jenis_kelamin: 'L', status: 'umum', alergen: [] },
      { id: 'nenek', alias: 'Nenek', usia_tahun: 68, jenis_kelamin: 'P', status: 'umum', alergen: [] },
    ];

    const menu = generateMenu({
      familyId: 'keluarga-b',
      familyName: 'Keluarga Bu Lina',
      budgetHarianRp: 75000,
      anggota: keluargaB,
      seed: 'seed-keluarga-b',
    });

    expect(menu.hari.length).toBe(7);
    // Cek skor kecukupan keluarga ada dan di atas 0
    for (const h of menu.hari) {
      expect(h.skor_keluarga.skor_rata_rata).toBeGreaterThan(60);
      expect(h.skor_keluarga.skor_per_anggota.length).toBe(3);
    }
  });

  it('20. Keluarga C (Orang tua tunggal + Remaja putri 12 th alergi telur) bebas dari telur', () => {
    const keluargaC: Anggota[] = [
      { id: 'ayah', alias: 'Pak Dedi', usia_tahun: 40, jenis_kelamin: 'L', status: 'umum', alergen: [] },
      { id: 'anak', alias: 'Putri', usia_tahun: 12, jenis_kelamin: 'P', status: 'umum', alergen: ['telur'] },
    ];

    const menu = generateMenu({
      familyId: 'keluarga-c',
      familyName: 'Keluarga Pak Dedi',
      budgetHarianRp: 50000,
      anggota: keluargaC,
      seed: 'seed-keluarga-c',
    });

    expect(menu.hari.length).toBe(7);

    // Pastikan 100% hidangan tidak ada yang mengandung alergen telur
    for (const h of menu.hari) {
      const allDishes = [
        ...h.sesi_makan.pagi.hidangan,
        ...h.sesi_makan.siang.hidangan,
        ...h.sesi_makan.malam.hidangan,
      ];
      for (const dish of allDishes) {
        expect(dish.alergen).not.toContain('telur');
        expect(dish.kode).not.toBe('RSP005'); // Telur dadar
      }
    }
  });

  it('21. Generator memberikan peringatan dan beralih ke paket standar jika budget harian terlalu rendah', () => {
    const anggota: Anggota[] = [
      { id: '1', alias: 'Dewasa 1', usia_tahun: 30, jenis_kelamin: 'L', status: 'umum', alergen: [] },
      { id: '2', alias: 'Dewasa 2', usia_tahun: 30, jenis_kelamin: 'P', status: 'umum', alergen: [] },
      { id: '3', alias: 'Anak', usia_tahun: 10, jenis_kelamin: 'L', status: 'umum', alergen: [] },
    ];

    // Budget sangat rendah Rp 10.000 untuk 3 orang
    const menu = generateMenu({
      familyId: 'low-budget',
      budgetHarianRp: 10000,
      anggota,
    });

    expect(menu.is_fallback_package).toBe(true);
    expect(menu.pesan_budget).toBeDefined();
    expect(menu.pesan_budget).toContain('Budget harian');
  });

  it('22. Pembuatan daftar belanja mingguan menggabungkan bahan dan menghitung BDD serta link WhatsApp', () => {
    const anggota: Anggota[] = [
      { id: '1', alias: 'Ibu', usia_tahun: 30, jenis_kelamin: 'P', status: 'umum', alergen: [] },
    ];
    const menu = generateMenu({
      familyId: 'fam-belanja',
      budgetHarianRp: 40000,
      anggota,
    });

    const daftarBelanja = buatDaftarBelanjaMingguan(menu.hari);
    expect(daftarBelanja.length).toBeGreaterThan(0);

    // Cek beras medium ada di daftar
    const beras = daftarBelanja.find((i) => i.kode_tkpi === 'AR001');
    expect(beras).toBeDefined();
    expect(beras!.kebutuhan_beli_gram).toBeGreaterThan(0);

    // Cek format WhatsApp dan link wa.me
    const waText = formatTeksWhatsAppBelanja(menu, daftarBelanja);
    expect(waText).toContain('DAFTAR BELANJA PORSI KITA');
    const waLink = buatTautanWhatsApp(menu, daftarBelanja);
    expect(waLink).toContain('https://wa.me/?text=');
  });

  it('23. Fitur ganti satu hidangan (FR-14) menyajikan alternatif sekategori yang aman', () => {
    const anggota: Anggota[] = [
      { id: '1', alias: 'Budi', usia_tahun: 25, jenis_kelamin: 'L', status: 'umum', alergen: ['ikan'] },
    ];
    const resepSupAyam = RESEP_MAP.get('RSP003')!; // Lauk Hewani
    const opsiPengganti = cariPenggantiHidangan(resepSupAyam, anggota, 0);

    expect(opsiPengganti.length).toBeGreaterThan(0);
    for (const opt of opsiPengganti) {
      expect(opt.resep.kategori).toBe('Lauk Hewani');
      expect(opt.resep.alergen).not.toContain('ikan');
      expect(opt.resep.kode).not.toBe('RSP003');
    }
  });

  it('24. Efisiensi masak sup sayur 1x untuk pagi-siang atau 2x sehari dengan pemenuhan gizi keluarga terjamin', () => {
    const anggota: Anggota[] = [
      { id: '1', alias: 'Ayah', usia_tahun: 36, jenis_kelamin: 'L', status: 'umum', alergen: [] },
      { id: '2', alias: 'Ibu', usia_tahun: 33, jenis_kelamin: 'P', status: 'umum', alergen: [] },
      { id: '3', alias: 'Anak', usia_tahun: 6, jenis_kelamin: 'P', status: 'umum', alergen: [] },
    ];

    const menu = generateMenu({
      familyId: 'fam-sayur-efisien',
      budgetHarianRp: 80000,
      anggota,
      seed: 'sayur-seed-123',
    });

    for (const hari of menu.hari) {
      const sayurPagi = hari.sesi_makan.pagi.hidangan.find((d) => d.kategori === 'Sayuran');
      const sayurSiang = hari.sesi_makan.siang.hidangan.find((d) => d.kategori === 'Sayuran');
      const sayurMalam = hari.sesi_makan.malam.hidangan.find((d) => d.kategori === 'Sayuran');

      // Pagi dan Siang selalu sama persis
      expect(sayurPagi).toBeDefined();
      expect(sayurSiang).toBeDefined();
      expect(sayurPagi!.kode).toBe(sayurSiang!.kode);

      // Sesi malam bisa sama (1x masak) atau sayur segar baru (2x masak)
      // Yang pasti masakan sayur unik harian <= 2
      const sayurCodes = new Set([sayurPagi!.kode, sayurSiang!.kode, sayurMalam?.kode].filter(Boolean));
      expect(sayurCodes.size).toBeLessThanOrEqual(2);

      // Gizi keluarga tetap terpenuhi dengan baik (skor rata-rata keluarga tinggi)
      expect(hari.skor_keluarga.skor_rata_rata).toBeGreaterThan(70);
    }
  });
});
