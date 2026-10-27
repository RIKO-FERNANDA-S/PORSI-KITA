'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import { Anggota, Keluarga } from '../../lib/types';
import {
  getStoredKeluarga,
  saveStoredKeluarga,
  getStoredAnggota,
  saveStoredAnggota,
  resetDemoState,
} from '../../lib/store';
import { hitungKebutuhan } from '../../lib/nutrition/akg';

export default function PengaturanKeluargaPage() {
  const router = useRouter();

  // State Utama
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [keluarga, setKeluarga] = useState<Keluarga | null>(null);
  const [anggotaList, setAnggotaList] = useState<Anggota[]>([]);
  const [toastMsg, setToastMsg] = useState('');

  // Akun & Auth Simulation State
  const [phone, setPhone] = useState('+62 812-3456-7890');
  const [lastPasswordUpdate, setLastPasswordUpdate] = useState('2 bulan lalu');

  // Filter Alergi Global & Preferensi Pasar
  const [allergyList, setAllergyList] = useState<string[]>(['Udang & Kerang', 'Kacang Tanah']);
  const [selectedMarket, setSelectedMarket] = useState('Pasar Tradisional • Jakarta Selatan');
  const [waTargetPhone, setWaTargetPhone] = useState('+62 811-9876-5432');

  // Privasi & Data Governance Toggles
  const [privacySettings, setPrivacySettings] = useState({
    childPrivacy: true,
    otpAuth: true,
    posyanduSync: false,
  });

  // Modal State untuk Ubah Nomor HP / Ganti Password
  const [modalMode, setModalMode] = useState<'none' | 'phone' | 'password' | 'budget'>('none');
  const [phoneInput, setPhoneInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [budgetInput, setBudgetInput] = useState('');

  useEffect(() => {
    try {
      const k = getStoredKeluarga();
      const a = getStoredAnggota();
      setKeluarga(k);
      setAnggotaList(a);
      setBudgetInput(k.budget_harian_rp.toString());
      if (k.wilayah) {
        setSelectedMarket(k.wilayah);
      }

      // Kumpulkan alergi unik dari seluruh anggota jika ada
      const allAlergen = new Set<string>(['Udang & Kerang', 'Kacang Tanah']);
      a.forEach((m) => {
        if (m.alergen && m.alergen.length > 0) {
          m.alergen.forEach((al) => allAlergen.add(al));
        }
      });
      setAllergyList(Array.from(allAlergen));
    } catch (e) {
      console.error('Gagal memuat pengaturan keluarga:', e);
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // 1. Simpan Nomor Telepon
  const handleSavePhone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput.trim()) return;
    setPhone(phoneInput.trim());
    setModalMode('none');
    showToast('Nomor HP akun berhasil diperbarui!');
  };

  // 2. Simpan Password Baru
  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.length < 6) {
      alert('Password minimal 6 karakter');
      return;
    }
    setLastPasswordUpdate('Baru saja');
    setModalMode('none');
    setPasswordInput('');
    showToast('Kata sandi berhasil diperbarui!');
  };

  // 3. Simpan Acuan Pasar Lokal
  const handleMarketChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedMarket(val);
    if (keluarga) {
      const updated = { ...keluarga, wilayah: val };
      setKeluarga(updated);
      saveStoredKeluarga(updated);
      showToast(`Acuan pasar diubah ke "${val}"`);
    }
  };

  // 4. Ubah Budget Harian
  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keluarga) return;
    const val = parseInt(budgetInput.replace(/\D/g, ''), 10);
    if (isNaN(val) || val < 10000 || val > 1000000) {
      alert('Budget harian harus antara Rp 10.000 s/d Rp 1.000.000');
      return;
    }
    const updated = { ...keluarga, budget_harian_rp: val };
    setKeluarga(updated);
    saveStoredKeluarga(updated);
    setModalMode('none');
    showToast(`Budget harian disimpan: Rp ${val.toLocaleString('id-ID')}`);
  };

  // 5. Tambah & Hapus Alergi
  const handleAddAllergy = () => {
    const nama = prompt('Masukkan nama pantangan / bahan alergi baru:');
    if (nama && nama.trim()) {
      const trimmed = nama.trim();
      if (!allergyList.includes(trimmed)) {
        setAllergyList((prev) => [...prev, trimmed]);
        showToast(`Pantangan "${trimmed}" ditambahkan.`);
      }
    }
  };

  const handleRemoveAllergy = (nama: string) => {
    setAllergyList((prev) => prev.filter((item) => item !== nama));
    showToast(`Pantangan "${nama}" dihapus.`);
  };

  // 6. Hapus Anggota
  const handleDeleteAnggota = (id: string, alias: string) => {
    if (confirm(`Yakin ingin menghapus anggota ${alias}?`)) {
      const filtered = anggotaList.filter((a) => a.id !== id);
      setAnggotaList(filtered);
      saveStoredAnggota(filtered);
      showToast(`Anggota ${alias} telah dihapus.`);
    }
  };

  // 7. Toggle Switch Privasi
  const togglePrivacy = (key: keyof typeof privacySettings) => {
    setPrivacySettings((prev) => {
      const next = !prev[key];
      return { ...prev, [key]: next };
    });
    showToast('Preferensi privasi diperbarui.');
  };

  // 8. Unduh Data Saya (JSON Backup)
  const handleDownloadData = () => {
    const dataExport = {
      keluarga,
      anggota: anggotaList,
      preferensi: {
        alergi: allergyList,
        wilayahPasar: selectedMarket,
        nomorWA: waTargetPhone,
        privasi: privacySettings,
      },
      tanggalEkspor: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(dataExport, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `porsi-kita-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data berhasil diunduh ke format JSON.');
  };

  // 9. Reset Demo Data
  const handleResetData = () => {
    const konfirmasi = confirm(
      'PERINGATAN: Seluruh data keluarga, menu, dan riwayat akan direset ke setelan awal default demo. Lanjutkan?'
    );
    if (konfirmasi) {
      resetDemoState();
      alert('Data telah direset. Halaman akan dimuat ulang.');
      window.location.reload();
    }
  };

  if (!keluarga) {
    return (
      <div className="min-h-screen bg-[#fff8f7] flex items-center justify-center p-6 text-center text-[#737a65]">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 animate-spin text-[#466800]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="font-semibold text-sm">Memuat preferensi pengaturan keluarga...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#fff8f7] font-sans text-[#2c1514] min-h-screen">
      {/* 1. ASIDE SIDEBAR (Shared Component) */}
      <Sidebar
        activePath="pengaturan"
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
        anggotaCount={anggotaList.length}
      />

      {/* 2. TOP HEADER (Mobile & Desktop) */}
      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 bg-white/95 backdrop-blur-md border-b border-[#c3c9b2]/30 px-4 h-16 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 -ml-1 rounded-xl text-[#2c1514] hover:bg-stone-100"
            aria-label="Buka navigasi"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-bold text-[17px] text-[#306a3b] tracking-tight">PORSI KITA</span>
        </div>
        <Link
          href="/dashboard"
          className="text-xs font-semibold text-[#466800] bg-[#fff0ef] px-3 py-1.5 rounded-full hover:bg-[#ffe2df] transition"
        >
          Beranda
        </Link>
      </header>

      {/* Desktop Fixed Header */}
      <header className="hidden lg:flex fixed top-0 left-64 right-0 h-16 bg-white/90 backdrop-blur-xl border-b border-[#c3c9b2]/30 z-40 items-center justify-between px-8 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold uppercase tracking-widest text-[#737a65]">
            PERENCANA DOMESTIK HARMONIS
          </span>
          <span className="text-[#c3c9b2]">•</span>
          <span className="text-[12px] text-[#306a3b] font-semibold">Pengaturan Sistem</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-[13px] font-bold text-[#2c1514] leading-tight">
              {keluarga.alias}
            </div>
            <div className="text-[11px] text-[#737a65] leading-tight mt-0.5">
              {selectedMarket.split('•')[0].trim()}
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#466800] text-white flex items-center justify-center font-bold text-[13px] shadow-xs">
            {keluarga.alias.charAt(0) || 'K'}
          </div>
        </div>
      </header>

      {/* 3. MAIN DASHBOARD CONTENT */}
      <main className="lg:pl-64 pt-4 lg:pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-[1240px] mx-auto">
        <div className="flex flex-col gap-6">

          {/* Toast Notification */}
          {toastMsg && (
            <div className="p-3.5 rounded-2xl bg-[#306a3b] text-white text-xs font-bold shadow-md transition flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#bbf45e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>{toastMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setToastMsg('')}
                className="text-white/80 hover:text-white px-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Top Page Header */}
          <header className="flex flex-col gap-1 pb-4 border-b border-[#c3c9b2]/30">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#737a65]">
                PREFERENSI SISTEM
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#6da003]" />
              <span className="text-[11px] text-[#737a65] font-medium">KONTROL RUMAH TANGGA</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2c1514] tracking-tight">
              Pengaturan Akun &amp; Keluarga
            </h1>
            <p className="text-[14px] text-[#737a65]">
              Kelola keamanan nomor HP, profil gizi anggota keluarga, dan preferensi pasar lokal Anda.
            </p>
          </header>

          {/* Main Dual Column Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* LEFT / CENTER COLUMN (~8 cols) */}
            <section className="lg:col-span-8 flex flex-col gap-6">

              {/* KARTU 1: Akun & Keamanan Login */}
              <article className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-stone-200/60 flex flex-col gap-5">
                <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#b2f2b6] flex items-center justify-center text-[#306a3b]">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <h2 className="text-[17px] font-bold text-[#2c1514]">
                      Akun &amp; Keamanan Login
                    </h2>
                  </div>
                  <span className="text-[11px] text-[#737a65] uppercase tracking-wider font-bold">
                    STATUS AKTIF
                  </span>
                </div>

                {/* Row 1: Profil & Phone */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-13 h-13 rounded-full bg-[#306a3b] flex items-center justify-center text-white text-xl font-bold shadow-xs shrink-0">
                      {keluarga.alias.charAt(0) || 'K'}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[16px] font-bold text-[#2c1514]">
                          {keluarga.alias}
                        </span>
                        <span className="inline-flex items-center gap-1 bg-[#b2f2b6] text-[#002109] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                          <svg className="w-3.5 h-3.5 text-[#306a3b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Terverifikasi OTP
                        </span>
                      </div>
                      <span className="text-[14px] text-[#737a65] mt-0.5 font-medium">
                        {phone}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPhoneInput(phone);
                      setModalMode('phone');
                    }}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#fff0ef] text-[#2c1514] text-[13px] font-bold hover:bg-[#ffe2df] transition flex items-center justify-center self-start sm:self-auto cursor-pointer"
                  >
                    Ubah Nomor HP
                  </button>
                </div>

                <div className="w-full h-px bg-stone-100" />

                {/* Row 2: Password */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-[14px] font-bold text-[#2c1514]">
                      Kata Sandi (Password)
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-[#737a65] tracking-widest text-[15px]">
                        ••••••••••••
                      </span>
                      <span className="text-[12px] text-[#737a65]">
                        (Terakhir diperbarui {lastPasswordUpdate})
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPasswordInput('');
                      setModalMode('password');
                    }}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#fff0ef] text-[#2c1514] text-[13px] font-bold hover:bg-[#ffe2df] transition flex items-center justify-center self-start sm:self-auto cursor-pointer"
                  >
                    Ganti Password
                  </button>
                </div>

                <div className="w-full h-px bg-stone-100" />

                {/* Row 3: Anggaran Harian Belanja */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-[14px] font-bold text-[#2c1514]">
                      Budget Belanja Harian
                    </span>
                    <span className="text-[15px] font-black text-[#306a3b] mt-0.5">
                      Rp {keluarga.budget_harian_rp.toLocaleString('id-ID')} / hari
                    </span>
                    <span className="text-[12px] text-[#737a65]">
                      ~Rp {(keluarga.budget_harian_rp * 7).toLocaleString('id-ID')} per minggu
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setBudgetInput(keluarga.budget_harian_rp.toString());
                      setModalMode('budget');
                    }}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-[#fff0ef] text-[#2c1514] text-[13px] font-bold hover:bg-[#ffe2df] transition flex items-center justify-center self-start sm:self-auto cursor-pointer"
                  >
                    Ubah Anggaran
                  </button>
                </div>
              </article>

              {/* KARTU 2: Profil Gizi Anggota Keluarga */}
              <article className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-stone-200/60 flex flex-col gap-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-stone-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#b2f2b6] flex items-center justify-center text-[#306a3b]">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-[17px] font-bold text-[#2c1514]">
                        Anggota Keluarga ({anggotaList.length} Orang)
                      </h2>
                      <p className="text-[12px] text-[#737a65]">
                        Profil nutrisi dioptimalkan per fase metabolisme harian (AKG 2019)
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/keluarga/anggota/baru"
                    className="min-h-[44px] px-5 py-2 rounded-full bg-[#6da003] text-white text-[13px] font-bold hover:bg-[#466800] shadow-xs transition flex items-center justify-center gap-1.5 self-start sm:self-auto"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Tambah Anggota</span>
                  </Link>
                </div>

                {/* Privacy Notice Banner */}
                <div className="bg-[#fff0ef] text-[#2c1514] rounded-2xl p-4 flex items-start gap-3 border border-stone-200/50">
                  <svg className="w-5 h-5 text-[#306a3b] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-bold text-[#306a3b]">
                      Privasi Anak &amp; Keluarga Terlindungi
                    </span>
                    <p className="text-[12px] text-[#737a65] mt-0.5">
                      Kami hanya mencatat kategori usia &amp; kondisi gizi, tanpa nama lengkap resmi atau NIK anak.
                    </p>
                  </div>
                </div>

                {/* Grid 2x2 Member Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {anggotaList.map((a, idx) => {
                    const akg = hitungKebutuhan(a);

                    const statusBadge =
                      a.status === 'hamil_t1'
                        ? 'Ibu Hamil Trimester 1'
                        : a.status === 'hamil_t2'
                        ? 'Ibu Hamil Trimester 2'
                        : a.status === 'hamil_t3'
                        ? 'Ibu Hamil Trimester 3'
                        : a.status === 'menyusui_6bln1'
                        ? 'Menyusui 0-6 Bln'
                        : a.status === 'menyusui_6bln2'
                        ? 'Menyusui 7-12 Bln'
                        : a.usia_tahun < 5
                        ? 'Fokus Tumbuh Kembang'
                        : a.usia_tahun >= 60
                        ? 'Rendah Natrium & Lemak'
                        : 'Aktivitas Normal';

                    // Warna penanda visual
                    const dotColor =
                      idx === 0
                        ? 'bg-[#6da003]'
                        : idx === 1
                        ? 'bg-[#306a3b]'
                        : idx === 2
                        ? 'bg-[#466800]'
                        : 'bg-[#737a65]';

                    return (
                      <div
                        key={a.id}
                        className="bg-[#fff8f7] rounded-2xl p-4 flex flex-col justify-between border border-stone-200/70 hover:border-[#306a3b]/40 transition"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                              <span className="text-[15px] font-bold text-[#2c1514]">
                                {a.alias}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Link
                                href={`/keluarga/anggota/${a.id}`}
                                className="text-[#306a3b] text-xs font-bold hover:underline"
                              >
                                Edit
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDeleteAnggota(a.id, a.alias)}
                                className="text-stone-400 hover:text-red-600 text-xs font-medium ml-1"
                                title="Hapus"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                          <p className="text-[12px] text-[#737a65] mt-1">
                            Usia {a.usia_tahun} Tahun • {a.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-stone-200/60 flex flex-col gap-1">
                          <span className="text-[13px] font-bold text-[#306a3b]">
                            Target: {akg.energi_kcal.toLocaleString('id-ID')} kkal/hari
                          </span>
                          <span className="inline-block self-start text-[11px] px-2.5 py-0.5 rounded-full bg-[#b2f2b6] text-[#002109] font-semibold">
                            {statusBadge}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Product Disclaimer Note */}
                <div className="flex items-center gap-2 text-[#737a65] pt-1">
                  <svg className="w-4 h-4 text-[#737a65] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-[12px]">
                    Perhitungan gizi diformulasikan untuk usia &gt; 2 tahun (belum mencakup MPASI bayi di bawah 2 tahun).
                  </span>
                </div>
              </article>

              {/* KARTU 3: Filter Alergi & Preferensi Pasar Lokal */}
              <article className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-stone-200/60 flex flex-col gap-5">
                <div className="flex items-center gap-2.5 pb-2 border-b border-stone-100">
                  <div className="w-8 h-8 rounded-full bg-[#b2f2b6] flex items-center justify-center text-[#306a3b]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-[17px] font-bold text-[#2c1514]">
                      Filter Alergi &amp; Preferensi Pasar Lokal
                    </h2>
                    <p className="text-[12px] text-[#737a65]">
                      Menyesuaikan kalkulasi keranjang dan filter otomatis pantangan resep
                    </p>
                  </div>
                </div>

                {/* Filter Alergi */}
                <div className="flex flex-col gap-2">
                  <label className="text-[13px] font-bold text-[#2c1514]">
                    Pantangan &amp; Alergi Bahan Masakan
                  </label>
                  <div className="flex flex-wrap gap-2 items-center">
                    {allergyList.map((item) => (
                      <span
                        key={item}
                        onClick={() => handleRemoveAllergy(item)}
                        className="inline-flex items-center gap-1.5 bg-[#ffdad6] text-[#ba1a1a] px-3 py-1 rounded-full text-[12px] font-semibold cursor-pointer hover:bg-[#ffdad6]/80 transition select-none"
                        title="Klik untuk menghapus pantangan"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>{item}</span>
                      </span>
                    ))}

                    <button
                      type="button"
                      onClick={handleAddAllergy}
                      className="inline-flex items-center gap-1 bg-[#fff0ef] text-[#2c1514] px-3 py-1 rounded-full text-[12px] font-semibold hover:bg-[#ffe2df] transition cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Tambah Alergi</span>
                    </button>
                  </div>
                </div>

                <div className="w-full h-px bg-stone-100" />

                {/* Lokasi Harga & WhatsApp */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-bold text-[#2c1514]" htmlFor="marketSelect">
                      Acuan Harga Pasar Lokal
                    </label>
                    <div className="relative">
                      <select
                        id="marketSelect"
                        value={selectedMarket}
                        onChange={handleMarketChange}
                        className="w-full min-h-[44px] bg-[#fff8f7] rounded-xl px-3.5 py-2 text-[#2c1514] text-[13px] font-semibold border border-stone-200/70 focus:outline-none focus:ring-2 focus:ring-[#306a3b] appearance-none pr-9 cursor-pointer"
                      >
                        <option value="Pasar Tradisional • Jakarta Selatan">Pasar Tradisional • Jakarta Selatan</option>
                        <option value="Pasar Tebet Barat • Jakarta Selatan">Pasar Tebet Barat • Jakarta Selatan</option>
                        <option value="Pasar Minggu • Jakarta Selatan">Pasar Minggu • Jakarta Selatan</option>
                        <option value="Supermarket Segar • Jabodetabek">Supermarket Segar • Jabodetabek</option>
                        <option value="Surabaya, Jawa Timur">Pasar Tradisional • Surabaya, Jawa Timur</option>
                      </select>
                      <svg className="w-4 h-4 text-[#737a65] pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <span className="text-[11px] text-[#737a65]">
                      Disesuaikan dengan survei harga rata-rata bahan pokok mingguan
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-bold text-[#2c1514]" htmlFor="waPhoneInput">
                      Nomor WA Tujuan Daftar Belanja (Suami / Warung)
                    </label>
                    <div className="relative">
                      <input
                        id="waPhoneInput"
                        type="text"
                        value={waTargetPhone}
                        onChange={(e) => setWaTargetPhone(e.target.value)}
                        className="w-full min-h-[44px] bg-[#fff8f7] rounded-xl px-3.5 py-2 text-[#2c1514] text-[13px] font-semibold border border-stone-200/70 focus:outline-none focus:ring-2 focus:ring-[#306a3b]"
                      />
                      <svg className="w-4 h-4 text-[#306a3b] absolute right-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-[11px] text-[#737a65]">
                      Tujuan kirim draft format belanja pasar dalam sekali klik
                    </span>
                  </div>
                </div>
              </article>
            </section>

            {/* RIGHT PANEL COLUMN (~4 cols) */}
            <aside className="lg:col-span-4 flex flex-col gap-6">

              {/* KARTU 1: Pusat Privasi & Kendali Data (Estate Dark Green) */}
              <article className="bg-[#306a3b] text-white rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col gap-5 relative overflow-hidden">
                <div className="flex items-center gap-2.5 pb-2 border-b border-white/15">
                  <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-[#bbf45e]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-[16px] font-bold text-white">
                      Keamanan Data Proaktif
                    </h2>
                    <span className="text-[11px] text-white/80">Kedaulatan &amp; enkripsi domestik</span>
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex flex-col gap-4">
                  {/* Toggle 1 */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col pr-1">
                      <span className="text-[13px] font-bold text-white">Anonimisasi Data Anak</span>
                      <span className="text-[11px] text-white/70">Hanya simpan usia &amp; kebutuhan AKG</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePrivacy('childPrivacy')}
                      className={`w-12 h-6 rounded-full p-0.5 transition-colors relative shrink-0 flex items-center cursor-pointer ${
                        privacySettings.childPrivacy ? 'bg-[#6da003] justify-end' : 'bg-white/20 justify-start'
                      }`}
                      aria-checked={privacySettings.childPrivacy}
                      role="switch"
                    >
                      <span className="w-5 h-5 rounded-full bg-white shadow-xs block" />
                    </button>
                  </div>

                  <div className="w-full h-px bg-white/15" />

                  {/* Toggle 2 */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col pr-1">
                      <span className="text-[13px] font-bold text-white">Notifikasi OTP WhatsApp / SMS</span>
                      <span className="text-[11px] text-white/70">Saat login dari perangkat baru</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePrivacy('otpAuth')}
                      className={`w-12 h-6 rounded-full p-0.5 transition-colors relative shrink-0 flex items-center cursor-pointer ${
                        privacySettings.otpAuth ? 'bg-[#6da003] justify-end' : 'bg-white/20 justify-start'
                      }`}
                      aria-checked={privacySettings.otpAuth}
                      role="switch"
                    >
                      <span className="w-5 h-5 rounded-full bg-white shadow-xs block" />
                    </button>
                  </div>

                  <div className="w-full h-px bg-white/15" />

                  {/* Toggle 3 */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col pr-1">
                      <span className="text-[13px] font-bold text-white">Sinkronisasi Posyandu</span>
                      <span className="text-[11px] text-white/70">Akses ringkasan gizi kader posyandu</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePrivacy('posyanduSync')}
                      className={`w-12 h-6 rounded-full p-0.5 transition-colors relative shrink-0 flex items-center cursor-pointer ${
                        privacySettings.posyanduSync ? 'bg-[#6da003] justify-end' : 'bg-white/20 justify-start'
                      }`}
                      aria-checked={privacySettings.posyanduSync}
                      role="switch"
                    >
                      <span className="w-5 h-5 rounded-full bg-white shadow-xs block" />
                    </button>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex flex-col gap-2 pt-2 border-t border-white/15">
                  <button
                    type="button"
                    onClick={handleDownloadData}
                    className="w-full min-h-[44px] py-2.5 px-4 rounded-full bg-white/15 hover:bg-white/25 text-white text-[13px] font-bold transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <svg className="w-4 h-4 text-[#bbf45e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Unduh Data Saya (JSON)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetData}
                    className="w-full min-h-[44px] py-2 text-[#ffdad6] hover:text-white text-[12px] font-semibold text-center transition cursor-pointer"
                  >
                    Hapus Akun &amp; Data Permanen
                  </button>
                </div>
              </article>

              {/* KARTU 2: Pernyataan Medis & Standar Gizi */}
              <article className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-stone-200/60 flex flex-col gap-4">
                <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
                  <svg className="w-5 h-5 text-[#737a65]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h2 className="text-[16px] font-bold text-[#2c1514]">
                    Informasi &amp; Batasan Layanan
                  </h2>
                </div>

                <div className="flex flex-col gap-3">
                  {/* Point 1 */}
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#b2f2b6] text-[#306a3b] flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                      </svg>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-[#2c1514]">Standar Resmi Gizi</span>
                      <p className="text-[12px] text-[#737a65] mt-0.5 leading-relaxed">
                        Perhitungan berbasis tabel AKG Permenkes No. 28 Tahun 2019 &amp; TKPI Kemenkes RI 2017.
                      </p>
                    </div>
                  </div>

                  {/* Point 2 */}
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#fff0ef] text-[#737a65] flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-[#2c1514]">Bukan Saran Medis</span>
                      <p className="text-[12px] text-[#737a65] mt-0.5 leading-relaxed">
                        Porsi Kita adalah alat bantu perencanaan menu dan keuangan belanja dapur, bukan pengganti diagnosis medis klinis.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-[#737a65] text-[11px]">
                  <span>Versi Kebijakan: 2.4.0</span>
                  <span className="text-[#306a3b] font-bold">Terakreditasi Ahli Gizi</span>
                </div>
              </article>

            </aside>
          </div>

        </div>
      </main>

      {/* MODAL EDIT DATA (Phone, Password, Budget) */}
      {modalMode !== 'none' && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-lg border border-stone-200/80 flex flex-col gap-4 animate-scaleIn">
            <div className="flex items-center justify-between">
              <h3 className="text-[17px] font-bold text-[#2c1514]">
                {modalMode === 'phone'
                  ? 'Ubah Nomor HP Akun'
                  : modalMode === 'password'
                  ? 'Ganti Kata Sandi'
                  : 'Ubah Anggaran Belanja Harian'}
              </h3>
              <button
                type="button"
                onClick={() => setModalMode('none')}
                className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            {modalMode === 'phone' && (
              <form onSubmit={handleSavePhone} className="flex flex-col gap-3">
                <label className="text-xs font-semibold text-[#737a65]">
                  Nomor HP Aktif (Untuk OTP):
                </label>
                <input
                  type="text"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+62 812-xxxx-xxxx"
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#306a3b]"
                  required
                />
                <button
                  type="submit"
                  className="mt-2 py-3 rounded-full bg-[#6da003] hover:bg-[#466800] text-white font-bold text-sm transition"
                >
                  Simpan Nomor Baru
                </button>
              </form>
            )}

            {modalMode === 'password' && (
              <form onSubmit={handleSavePassword} className="flex flex-col gap-3">
                <label className="text-xs font-semibold text-[#737a65]">
                  Kata Sandi Baru (Min. 6 Karakter):
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••••••"
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#306a3b]"
                  required
                />
                <button
                  type="submit"
                  className="mt-2 py-3 rounded-full bg-[#6da003] hover:bg-[#466800] text-white font-bold text-sm transition"
                >
                  Perbarui Kata Sandi
                </button>
              </form>
            )}

            {modalMode === 'budget' && (
              <form onSubmit={handleSaveBudget} className="flex flex-col gap-3">
                <label className="text-xs font-semibold text-[#737a65]">
                  Budget Belanja Harian (Rp 10.000 s/d Rp 1.000.000):
                </label>
                <input
                  type="number"
                  min="10000"
                  max="1000000"
                  step="5000"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#306a3b]"
                  required
                />
                <button
                  type="submit"
                  className="mt-2 py-3 rounded-full bg-[#6da003] hover:bg-[#466800] text-white font-bold text-sm transition"
                >
                  Simpan Anggaran Baru
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
