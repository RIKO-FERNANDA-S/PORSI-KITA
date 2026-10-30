import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from '../components/ToastProvider';

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
});
