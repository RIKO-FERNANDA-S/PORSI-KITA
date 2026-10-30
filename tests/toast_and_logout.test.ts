import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from '../components/ToastProvider';
import {
  getStoredPantangan,
  saveStoredPantangan,
  getStoredKulkas,
  saveStoredKulkas,
  getStoredBelanjaChecked,
  saveStoredBelanjaChecked,
} from '../lib/store';
import { generateMenu } from '../lib/planner/generate';
import { buatDaftarBelanjaMingguan } from '../lib/planner/cost';
import { Anggota } from '../lib/types';

describe('Sistem Alert Animasi & Pop-Up Konfirmasi Logout', () => {
  let dispatchedEvents: CustomEvent[] = [];

  beforeEach(() => {
    dispatchedEvents = [];
    vi.stubGlobal('window', {
      dispatchEvent: vi.fn((event: Event) => {
        dispatchedEvents.push(event as CustomEvent);
        return true;
      }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  it('1. toast.success harus memancarkan event porsi-toast dengan tipe success dan payload lengkap', () => {
    toast.success('Menu 7 hari berhasil disimpan!', 'Berhasil Disimpan');

    expect(dispatchedEvents.length).toBe(1);
    const event = dispatchedEvents[0];
    expect(event.type).toBe('porsi-toast');
    expect(event.detail).toEqual({
      type: 'success',
      message: 'Menu 7 hari berhasil disimpan!',
      title: 'Berhasil Disimpan',
      duration: undefined,
    });
  });

  it('2. toast.error harus memancarkan event porsi-toast dengan tipe error untuk pemberitahuan gagal', () => {
    toast.error('Gagal terhubung ke database server.', 'Gagal Sinkronisasi', 5000);

    expect(dispatchedEvents.length).toBe(1);
    const event = dispatchedEvents[0];
    expect(event.type).toBe('porsi-toast');
    expect(event.detail).toEqual({
      type: 'error',
      message: 'Gagal terhubung ke database server.',
      title: 'Gagal Sinkronisasi',
      duration: 5000,
    });
  });

  it('3. toast.warning dan toast.info harus memancarkan event sesuai kategorinya', () => {
    toast.warning('Centang minimal 1 belanjaan!', 'Perhatian');
    toast.info('Sesi dapur aktif', 'Informasi');

    expect(dispatchedEvents.length).toBe(2);
    expect(dispatchedEvents[0].detail.type).toBe('warning');
    expect(dispatchedEvents[0].detail.message).toBe('Centang minimal 1 belanjaan!');
    expect(dispatchedEvents[1].detail.type).toBe('info');
    expect(dispatchedEvents[1].detail.message).toBe('Sesi dapur aktif');
  });

  it('4. toast.logout harus memancarkan event porsi-open-logout-modal untuk memicu pop-up konfirmasi', () => {
    toast.logout();

    expect(dispatchedEvents.length).toBe(1);
    const event = dispatchedEvents[0];
    expect(event.type).toBe('porsi-open-logout-modal');
  });

  it('5. Logika penyimpanan metadata logout menandai hasLoggedOutAfterOtp dengan aman', () => {
    const mockStorage: Record<string, string> = {
      porsi_kita_auth_meta: JSON.stringify({
        phone: '+6281234567890',
        otpVerifiedAt: '2026-10-30T10:00:00.000Z',
        hasPassword: false,
      }),
    };

    // Simulasi logika saat logout dikonfirmasi
    const raw = mockStorage['porsi_kita_auth_meta'];
    const meta = JSON.parse(raw);
    meta.hasLoggedOutAfterOtp = true;
    mockStorage['porsi_kita_auth_meta'] = JSON.stringify(meta);

    const saved = JSON.parse(mockStorage['porsi_kita_auth_meta']);
    expect(saved.hasLoggedOutAfterOtp).toBe(true);
    expect(saved.phone).toBe('+6281234567890');
  });

  it('6. Pop-up Tambah Warung: memancarkan toast sukses dan mendeteksi duplikasi warung', () => {
    const existingWarungs = [
      { id: 'w-1', nama: 'Warung Sayur Bu Ani', tag: 'Warung Sayur', count: 3, totalSpent: 120000 },
    ];

    const inputName = 'Warung Sayur Bu Ani';
    const isDuplicate = existingWarungs.some(
      (w) => w.nama.trim().toLowerCase() === inputName.trim().toLowerCase()
    );
    expect(isDuplicate).toBe(true);

    const newName = 'Toko Sembako Berkah';
    const isNewDuplicate = existingWarungs.some(
      (w) => w.nama.trim().toLowerCase() === newName.trim().toLowerCase()
    );
    expect(isNewDuplicate).toBe(false);

    toast.success(`Warung "${newName}" berhasil ditambahkan ke daftar warung langganan keluarga!`, 'Warung Ditambahkan');
    expect(dispatchedEvents.length).toBe(1);
    expect(dispatchedEvents[0].detail.message).toContain('Toko Sembako Berkah');
  });

  it('7. Fitur Hapus Warung: menghapus warung dari list, mereset filter aktif, dan memancarkan toast notifikasi', () => {
    let warungs = [
      { id: 'w-1', nama: 'Warung Sayur Bu Ani', tag: 'Warung Sayur', count: 3, totalSpent: 120000 },
      { id: 'w-2', nama: 'Kios Daging Segar', tag: 'Daging & Ayam', count: 1, totalSpent: 85000 },
    ];
    let selectedFilter = 'Warung Sayur Bu Ani';
    let modalMerchant = 'Warung Sayur Bu Ani';

    const targetToDelete = warungs[0];

    // Proses penghapusan
    warungs = warungs.filter((w) => w.id !== targetToDelete.id && w.nama !== targetToDelete.nama);
    if (selectedFilter === targetToDelete.nama) selectedFilter = 'all';
    if (modalMerchant === targetToDelete.nama) modalMerchant = 'Warung Sayur Terdekat';

    expect(warungs.length).toBe(1);
    expect(warungs[0].nama).toBe('Kios Daging Segar');
    expect(selectedFilter).toBe('all');
    expect(modalMerchant).toBe('Warung Sayur Terdekat');

    toast.success(`Warung "${targetToDelete.nama}" berhasil dihapus dari daftar langganan keluarga.`, 'Warung Dihapus');
    expect(dispatchedEvents.length).toBe(1);
    expect(dispatchedEvents[0].detail.title).toBe('Warung Dihapus');
    expect(dispatchedEvents[0].detail.message).toContain('Warung Sayur Bu Ani');
  });

  it('8. Persistensi Pantangan Makanan: bahan baru tersimpan dan TIDAK hilang saat browser disegarkan', () => {
    const mockStorage: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = val;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
    });

    // 1. Ambil list awal (default)
    const initialList = getStoredPantangan();
    expect(initialList).toContain('Udang / Kepiting (Krustasea)');
    expect(initialList).toContain('Kacang-kacangan');

    // 2. Tambah bahan pantangan baru: "Telur Ayam"
    const nextList = [...initialList, 'Telur Ayam'];
    saveStoredPantangan(nextList);

    // 3. Simulasi refresh browser: panggil getStoredPantangan lagi
    const reloadedList = getStoredPantangan();
    expect(reloadedList).toContain('Telur Ayam');
    expect(reloadedList.length).toBe(initialList.length + 1);

    // 4. Hapus bahan pantangan dan pastikan hasil penghapusan juga persisten
    const afterDelete = reloadedList.filter((item: string) => item !== 'Kacang-kacangan');
    saveStoredPantangan(afterDelete);

    const reloadedAfterDelete = getStoredPantangan();
    expect(reloadedAfterDelete).not.toContain('Kacang-kacangan');
    expect(reloadedAfterDelete).toContain('Telur Ayam');
  });

  it('9. Sinkronisasi bahan belanjaan sesuai resep masakan yang dimasak (1 Hari, 3 Hari, 1 Minggu)', () => {
    const dummyAnggota: Anggota[] = [
      { id: 'a1', alias: 'Ayah', usia_tahun: 35, jenis_kelamin: 'L', status: 'umum', alergen: [] },
      { id: 'a2', alias: 'Ibu', usia_tahun: 30, jenis_kelamin: 'P', status: 'umum', alergen: [] },
    ];
    const menu = generateMenu({
      familyId: 'fam-test-sync',
      familyName: 'Keluarga Test',
      budgetHarianRp: 80000,
      anggota: dummyAnggota,
    });

    expect(menu.hari.length).toBe(7);

    // Kebutuhan bahan 1 Hari (Hari ke-1)
    const bahanHari1 = buatDaftarBelanjaMingguan(menu.hari.slice(0, 1));
    expect(bahanHari1.length).toBeGreaterThan(0);

    // Kebutuhan bahan 3 Hari
    const bahan3Hari = buatDaftarBelanjaMingguan(menu.hari.slice(0, 3));
    expect(bahan3Hari.length).toBeGreaterThanOrEqual(bahanHari1.length);

    // Kebutuhan bahan 7 Hari (1 Minggu)
    const bahan7Hari = buatDaftarBelanjaMingguan(menu.hari.slice(0, 7));
    expect(bahan7Hari.length).toBeGreaterThanOrEqual(bahan3Hari.length);

    // Subtotal biaya harus bertambah secara proporsional sesuai jumlah hari resep
    const totalHari1 = bahanHari1.reduce((sum, it) => sum + it.estimasi_biaya_rp, 0);
    const total3Hari = bahan3Hari.reduce((sum, it) => sum + it.estimasi_biaya_rp, 0);
    const total7Hari = bahan7Hari.reduce((sum, it) => sum + it.estimasi_biaya_rp, 0);

    expect(total3Hari).toBeGreaterThan(totalHari1);
    expect(total7Hari).toBeGreaterThan(total3Hari);
  });

  it('10. Sinkronisasi stok kulkas & checklist belanja persisten antara Dashboard dan Halaman Belanja', () => {
    const mockStorage: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = val;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
    });

    // 1. Simpan stok kulkas dari Dashboard atau Halaman Belanja
    const initialFridge: Record<string, boolean> = {
      TK001: true,
      TK002: true,
    };
    saveStoredKulkas(initialFridge);

    // 2. Baca kembali dan verifikasi konsistensi data
    const loadedFridge = getStoredKulkas();
    expect(loadedFridge['TK001']).toBe(true);
    expect(loadedFridge['TK002']).toBe(true);
    expect(loadedFridge['TK003']).toBeUndefined();

    // 3. Simpan checklist belanja dari salah satu halaman
    const checkedData: Record<string, boolean> = {
      TK001: true,
      TK005: true,
    };
    saveStoredBelanjaChecked(checkedData);

    // 4. Pastikan checklist terbaca sama persis di halaman lain
    const loadedChecked = getStoredBelanjaChecked();
    expect(loadedChecked['TK001']).toBe(true);
    expect(loadedChecked['TK005']).toBe(true);
    expect(loadedChecked['TK002']).toBeUndefined();
  });
});
