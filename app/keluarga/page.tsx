'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import { useToast } from '../../components/ToastProvider';
import { Anggota, Keluarga } from '../../lib/types';
import {
  getStoredKeluarga,
  saveStoredKeluarga,
  getStoredAnggota,
  saveStoredAnggota,
  resetDemoState,
} from '../../lib/store';
import { hitungKebutuhan } from '../../lib/nutrition/akg';
import { ALERGEN_OPTIONS } from '../../lib/schemas';

// Helper penerjemah ID alergen ke teks ramah orang tua
function getAlergenLabel(alIdOrName: string): string {
  const match = ALERGEN_OPTIONS.find((opt) => opt.id === alIdOrName);
  if (match) return match.label;
  return alIdOrName;
}

export default function PengaturanKeluargaPage() {
  const router = useRouter();
  const { showSuccess, showError, showInfo, showWarning } = useToast();

  // State Utama
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [keluarga, setKeluarga] = useState<Keluarga | null>(null);
  const [anggotaList, setAnggotaList] = useState<Anggota[]>([]);

  // Akun & Keamanan
  const [phone, setPhone] = useState('+62 812-3456-7890');
  const [lastPasswordUpdate, setLastPasswordUpdate] = useState('2 bulan lalu');

  // Filter Alergi Global & Preferensi Pasar
  const [allergyList, setAllergyList] = useState<string[]>(['Udang / Kepiting (Krustasea)', 'Kacang-kacangan']);
  const [selectedMarket, setSelectedMarket] = useState('Pasar Tradisional • Jakarta Selatan');
  const [waTargetPhone, setWaTargetPhone] = useState('+62 811-9876-5432');

  // Privasi & Data Governance Toggles
  const [privacySettings, setPrivacySettings] = useState({
    childPrivacy: true,
    otpAuth: true,
    posyanduSync: false,
  });

  // Modal State untuk Ubah Nomor HP / Ganti Password / Budget
  const [modalMode, setModalMode] = useState<'none' | 'phone' | 'password' | 'budget'>('none');
  const [phoneInput, setPhoneInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [budgetInput, setBudgetInput] = useState('');
  const [keluargaTipeBudget, setKeluargaTipeBudget] = useState<'bulanan' | 'mingguan'>('bulanan');

  useEffect(() => {
    try {
      const k = getStoredKeluarga();
      const a = getStoredAnggota();
      setKeluarga(k);
      setAnggotaList(a);

      const initialNominal = k.budget_belanja || (k.budget_harian_rp ? k.budget_harian_rp * 30 : 3000000);
      setBudgetInput(initialNominal.toString());
      if (k.tipe_budget) {
        setKeluargaTipeBudget(k.tipe_budget);
      }
      if (k.wilayah) {
        setSelectedMarket(k.wilayah);
      }

      // Ambil nomor HP aktif dari auth session jika ada
      try {
        const rawMeta = localStorage.getItem('porsi_kita_auth_meta');
        if (rawMeta) {
          const parsed = JSON.parse(rawMeta);
          if (parsed.phone) setPhone(parsed.phone);
        }
      } catch {}

      // Kumpulkan alergi unik dari seluruh anggota jika ada
      const allAlergen = new Set<string>();
      a.forEach((m) => {
        if (m.alergen && m.alergen.length > 0) {
          m.alergen.forEach((al) => allAlergen.add(getAlergenLabel(al)));
        }
      });
      if (allAlergen.size > 0) {
        setAllergyList(Array.from(allAlergen));
      } else {
        setAllergyList(['Udang / Kepiting (Krustasea)', 'Kacang-kacangan']);
      }
    } catch (e) {
      console.error('Gagal memuat pengaturan keluarga:', e);
    }
  }, []);

  const showToast = (msg: string) => {
    showSuccess(msg);
  };

  // 1. Simpan Nomor Telepon
  const handleSavePhone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneInput.trim()) return;
    setPhone(phoneInput.trim());
    try {
      const rawMeta = localStorage.getItem('porsi_kita_auth_meta');
      const meta = rawMeta ? JSON.parse(rawMeta) : {};
      meta.phone = phoneInput.trim();
      localStorage.setItem('porsi_kita_auth_meta', JSON.stringify(meta));
    } catch {}
    setModalMode('none');
    showSuccess('Nomor HP akun berhasil diperbarui!');
  };

  // 2. Simpan Password Baru ke Database
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.length < 6) {
      showError('Kata sandi minimal 6 karakter demi keamanan akun keluarga.', 'Kata Sandi Terlalu Pendek');
      return;
    }

    try {
      const rawMeta = localStorage.getItem('porsi_kita_auth_meta');
      const meta = rawMeta ? JSON.parse(rawMeta) : {};

      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: meta.phone || phone || '',
          familyId: keluarga?.id || meta.familyId || '',
          newPassword: passwordInput,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || 'Gagal menyimpan kata sandi ke database.', 'Gagal Menyimpan Sandi');
        return;
      }

      setLastPasswordUpdate('Baru saja');
      setModalMode('none');
      setPasswordInput('');

      if (typeof window !== 'undefined') {
        meta.hasPassword = true;
        localStorage.setItem('porsi_kita_auth_meta', JSON.stringify(meta));
      }

      showSuccess('Kata sandi berhasil diperbarui dan tersimpan aman di database!', 'Berhasil Disimpan');
    } catch {
      showError('Terjadi kendala koneksi saat menyimpan kata sandi.', 'Kendala Jaringan');
    }
  };

  // 3. Simpan Acuan Pasar Lokal
  const handleMarketChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedMarket(val);
    if (keluarga) {
      const updated = { ...keluarga, wilayah: val };
      setKeluarga(updated);
      saveStoredKeluarga(updated);
      showSuccess(`Acuan pasar diubah ke "${val}"`);
    }
  };

  // 4. Ubah Budget Belanja (Bulanan / Mingguan)
  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keluarga) return;
    const val = parseInt(budgetInput.replace(/\D/g, ''), 10);
    if (isNaN(val) || val <= 0) {
      showWarning('Nominal anggaran belanja harus lebih dari Rp 0.', 'Anggaran Belum Tepat');
      return;
    }
    const totalBulanan = keluargaTipeBudget === 'mingguan' ? val * 4 : val;
    const daily = Math.round(totalBulanan / 30);
    const updated = {
      ...keluarga,
      budget_belanja: val,
      tipe_budget: keluargaTipeBudget,
      budget_harian_rp: daily,
    };
    setKeluarga(updated);
    saveStoredKeluarga(updated);

    try {
      await fetch('/api/family/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budget_belanja: val,
          tipe_budget: keluargaTipeBudget,
          phone: phone,
        }),
      });
    } catch {
      // fallback
    }

    setModalMode('none');
    showToast(`Anggaran belanja tersimpan: Rp ${val.toLocaleString('id-ID')} (${keluargaTipeBudget})`);
  };

  // 5. Tambah & Hapus Pantangan Alergi
  const handleAddAllergy = () => {
    const nama = prompt('Masukkan nama pantangan / bahan alergi yang dilarang:\n(Contoh: Telur, Ikan Tongkol, Terigu/Gluten)');
    if (nama && nama.trim()) {
      const trimmed = nama.trim();
      if (!allergyList.includes(trimmed)) {
        setAllergyList((prev) => [...prev, trimmed]);
        showToast(`Pantangan "${trimmed}" berhasil ditambahkan.`);
      }
    }
  };

  const handleRemoveAllergy = (nama: string) => {
    if (confirm(`Hapus pantangan "${nama}" dari daftar pantangan keluarga?`)) {
      setAllergyList((prev) => prev.filter((item) => item !== nama));
      showToast(`Pantangan "${nama}" dihapus.`);
    }
  };

  // 6. Hapus Anggota
  const handleDeleteAnggota = (id: string, alias: string) => {
    if (confirm(`Yakin ingin menghapus data anggota ${alias} dari keluarga?`)) {
      const filtered = anggotaList.filter((a) => a.id !== id);
      setAnggotaList(filtered);
      saveStoredAnggota(filtered);
      showToast(`Data anggota ${alias} telah dihapus.`);
    }
  };

  // 7. Toggle Switch Privasi
  const togglePrivacy = (key: keyof typeof privacySettings) => {
    setPrivacySettings((prev) => {
      const next = !prev[key];
      return { ...prev, [key]: next };
    });
    showToast('Pengaturan privasi diperbarui.');
  };

  // 8. Unduh Data Saya (Backup)
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
    a.download = `porsi-kita-keluarga-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Salinan data profil keluarga berhasil diunduh.');
  };

  // 9. Reset Demo Data
  const handleResetData = () => {
    const konfirmasi = confirm(
      'PERINGATAN: Apakah Anda yakin ingin mereset data ke setelan awal pabrik? Seluruh riwayat menu dan catatan belanja akan dikembalikan ke kondisi baru.'
    );
    if (konfirmasi) {
      resetDemoState();
      showSuccess('Data telah direset ke pengaturan awal pabrik. Memuat ulang...');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  // Kalkulasi Anggota yang Memiliki Pantangan
  const anggotaPunyaAlergi = useMemo(() => {
    return anggotaList.filter((a) => a.alergen && a.alergen.length > 0);
  }, [anggotaList]);

  if (!keluarga) {
    return (
      <div className="min-h-screen bg-[#fff8f7] flex items-center justify-center p-6 text-center text-[#737a65]">
        <div className="flex items-center gap-3">
          <svg className="w-8 h-8 animate-spin text-[#306a3b]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="font-bold text-base text-[#2c1514]">Memuat data profil keluarga...</span>
        </div>
      </div>
    );
  }

  const budgetNominal = keluarga.budget_belanja || (keluarga.budget_harian_rp ? keluarga.budget_harian_rp * 30 : 3000000);
  const budgetHarianEst = keluarga.budget_harian_rp || Math.round(budgetNominal / 30);

  return (
    <div className="bg-[#fff8f7] font-sans text-[#2c1514] min-h-screen">
      {/* 1. ASIDE SIDEBAR */}
      <Sidebar
        activePath="pengaturan"
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
        anggotaCount={anggotaList.length}
      />

      {/* 2. TOP HEADER (Mobile & Desktop) */}
      <header className="lg:hidden sticky top-0 bg-white/95 backdrop-blur-md border-b border-[#c3c9b2]/30 px-4 h-16 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 -ml-1 rounded-xl text-[#2c1514] hover:bg-stone-100 cursor-pointer"
            aria-label="Buka navigasi menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-extrabold text-[17px] text-[#306a3b] tracking-tight">PORSI KITA</span>
        </div>
        <Link
          href="/dashboard"
          className="text-xs font-bold text-[#306a3b] bg-[#fff0ef] px-3.5 py-1.5 rounded-full hover:bg-[#ffe2df] transition"
        >
          Ke Beranda
        </Link>
      </header>

      {/* Desktop Fixed Header */}
      <header className="hidden lg:flex fixed top-0 left-64 right-0 h-16 bg-white/90 backdrop-blur-xl border-b border-[#c3c9b2]/30 z-40 items-center justify-between px-8 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-2.5">
          <span className="text-[14px] font-extrabold text-[#2c1514] tracking-tight">
            Profil &amp; Anggota Keluarga
          </span>
          <span className="text-[#c3c9b2]">•</span>
          <span className="text-[13px] text-[#306a3b] font-semibold">{keluarga.alias}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-[14px] font-bold text-[#2c1514] leading-tight">
              {keluarga.alias}
            </div>
            <div className="text-[12px] text-[#737a65] leading-tight mt-0.5">
              {selectedMarket.split('•')[0].trim()}
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#306a3b] text-white flex items-center justify-center font-bold text-[14px] shadow-xs">
            {keluarga.alias.charAt(0) || 'K'}
          </div>
        </div>
      </header>

      {/* 3. MAIN CONTENT CONTAINER */}
      <main className="lg:pl-64 pt-4 lg:pt-20 pb-20 px-4 sm:px-6 lg:px-8 max-w-[1240px] mx-auto">
        <div className="flex flex-col gap-6">

          {/* HERO SUMMARY CARD: INFORMASI UTAMA KELUARGA (SANGAT MUDAH DIBACA ORANG TUA) */}
          <section className="bg-[#306a3b] text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="flex flex-col gap-2.5 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-[#b2f2b6] text-xs font-bold w-fit">
                  <span>🏡 PROFIL RUMAH TANGGA</span>
                  <span>•</span>
                  <span>{anggotaList.length} Orang Anggota</span>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                  {keluarga.alias}
                </h1>

                <p className="text-sm sm:text-base text-white/90 leading-relaxed">
                  Semua menu masakan harian dirancang otomatis sesuai kebutuhan gizi dan porsi setiap anggota keluarga di bawah ini.
                </p>

                {/* Quick Indicators: Jatah Belanja & Peringatan Alergi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="bg-white/10 rounded-2xl p-3.5 flex items-center justify-between border border-white/15">
                    <div>
                      <span className="text-xs text-white/80 font-medium block">
                        Jatah Belanja Dapur ({keluarga.tipe_budget === 'mingguan' ? 'Mingguan' : 'Bulanan'})
                      </span>
                      <span className="text-lg sm:text-xl font-bold font-mono text-white">
                        Rp {budgetNominal.toLocaleString('id-ID')}
                      </span>
                      <span className="text-xs text-[#b2f2b6] block mt-0.5">
                        ~Rp {budgetHarianEst.toLocaleString('id-ID')} / hari
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setBudgetInput(budgetNominal.toString());
                        if (keluarga.tipe_budget) setKeluargaTipeBudget(keluarga.tipe_budget);
                        setModalMode('budget');
                      }}
                      className="min-h-[44px] px-3.5 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition cursor-pointer"
                    >
                      Ubah Jatah
                    </button>
                  </div>

                  <div className="bg-white/10 rounded-2xl p-3.5 flex items-center justify-between border border-white/15">
                    <div>
                      <span className="text-xs text-white/80 font-medium block">
                        Acuan Pasar Tradisional
                      </span>
                      <span className="text-sm sm:text-base font-bold text-white truncate block max-w-[180px]">
                        {selectedMarket.split('•')[0].trim()}
                      </span>
                      <span className="text-xs text-[#b2f2b6] block mt-0.5">
                        Harga bahan diperbarui berkala
                      </span>
                    </div>
                    <a
                      href="#preferensi-pasar"
                      className="min-h-[44px] px-3.5 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition flex items-center justify-center cursor-pointer"
                    >
                      Ganti
                    </a>
                  </div>
                </div>
              </div>

              {/* Action Button: Tambah Anggota Baru (Besar & Jelas) */}
              <div className="flex flex-col gap-2 shrink-0">
                <Link
                  href="/keluarga/anggota/baru"
                  className="min-h-[52px] px-6 py-3 rounded-full bg-[#6da003] hover:bg-[#466800] text-white text-sm sm:text-base font-extrabold flex items-center justify-center gap-2.5 shadow-md transition-colors cursor-pointer active:scale-98"
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>+ Tambah Anggota Baru</span>
                </Link>
                <span className="text-[12px] text-white/70 text-center">
                  Tambahkan anak, pasangan, atau orang tua
                </span>
              </div>
            </div>
          </section>

          {/* PERINGATAN KRUSIAL: PANTANGAN & ALERGI MAKANAN (SANGAT PENTING AGAR ORANG TUA TIDAK SALAH MASAK) */}
          <section className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-stone-200/80 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center text-xl shrink-0">
                  ⚠️
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-[#2c1514] leading-tight">
                    Pantangan &amp; Alergi Makanan Keluarga
                  </h2>
                  <p className="text-xs sm:text-sm text-[#737a65] mt-0.5">
                    Bahan-bahan di bawah ini otomatis disingkirkan dari resep agar keluarga tetap sehat dan aman.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddAllergy}
                className="min-h-[46px] px-5 py-2 rounded-full bg-[#fff0ef] hover:bg-[#ffe2df] text-[#ba1a1a] text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer self-start sm:self-auto border border-[#ba1a1a]/20"
              >
                <span>+ Tambah Pantangan Bahan</span>
              </button>
            </div>

            {/* Chips Pantangan Makanan yang Jelas & Besar */}
            <div className="flex flex-wrap gap-2.5 items-center pt-1">
              {allergyList.length === 0 ? (
                <div className="p-4 rounded-2xl bg-[#f4fbf4] text-[#367041] border border-[#b2f2b6] text-sm font-semibold flex items-center gap-2 w-full">
                  <span>✓</span>
                  <span>Alhamdulillah, tidak ada pantangan atau alergi makanan di keluarga Anda. Semua resep aman disajikan.</span>
                </div>
              ) : (
                allergyList.map((item) => (
                  <div
                    key={item}
                    className="inline-flex items-center gap-2 bg-[#ffdad6] text-[#ba1a1a] px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold border border-[#ba1a1a]/20 shadow-2xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#ba1a1a]" />
                    <span>DILARANG: {item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAllergy(item)}
                      className="w-6 h-6 rounded-full hover:bg-black/10 flex items-center justify-center transition cursor-pointer ml-1"
                      title={`Hapus pantangan ${item}`}
                      aria-label={`Hapus pantangan ${item}`}
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>

            {anggotaPunyaAlergi.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-[#fff0ef] border border-stone-200/70 text-xs text-[#2c1514] flex items-start gap-2.5">
                <span className="text-base mt-0.5">💡</span>
                <p className="leading-relaxed">
                  <strong>Catatan untuk Ibu/Ayah:</strong> Anggota keluarga dengan catatan khusus:{' '}
                  {anggotaPunyaAlergi.map((m, idx) => (
                    <span key={m.id}>
                      <strong>{m.alias}</strong> (alergi: {m.alergen.map(getAlergenLabel).join(', ')})
                      {idx < anggotaPunyaAlergi.length - 1 ? '; ' : '.'}
                    </span>
                  ))}
                </p>
              </div>
            )}
          </section>

          {/* BAGIAN UTAMA: DAFTAR KARTU ANGGOTA KELUARGA (FONT BESAR, TOMBOL BESAR) */}
          <section className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-stone-200/80 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#b2f2b6] flex items-center justify-center text-[#306a3b] text-xl shrink-0">
                  👨‍👩‍👧‍👦
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-[#2c1514] leading-tight">
                    Daftar Anggota Keluarga ({anggotaList.length} Orang)
                  </h2>
                  <p className="text-xs sm:text-sm text-[#737a65] mt-0.5">
                    Informasi usia, porsi makan harian, dan pantangan makanan masing-masing anggota.
                  </p>
                </div>
              </div>

              <Link
                href="/keluarga/anggota/baru"
                className="min-h-[46px] px-5 py-2 rounded-full bg-[#306a3b] hover:bg-[#155126] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer self-start sm:self-auto shadow-2xs"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>Tambah Anggota</span>
              </Link>
            </div>

            {/* Grid Kartu Anggota Keluarga (Besar, Mudah Dibaca & Diakses) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                    ? 'Ibu Menyusui (0-6 Bulan)'
                    : a.status === 'menyusui_6bln2'
                    ? 'Ibu Menyusui (7-12 Bulan)'
                    : a.usia_tahun < 5
                    ? 'Balita (Fokus Tumbuh Kembang)'
                    : a.usia_tahun >= 60
                    ? 'Lansia (Rendah Garam & Lemak)'
                    : 'Aktivitas Sehat Normal';

                // Ikon Peran Berdasarkan Usia & Gender
                const avatarIcon =
                  a.usia_tahun < 5
                    ? '👶'
                    : a.usia_tahun < 13
                    ? a.jenis_kelamin === 'L' ? '👦' : '👧'
                    : a.usia_tahun >= 60
                    ? a.jenis_kelamin === 'L' ? '👴' : '👵'
                    : a.jenis_kelamin === 'L' ? '👨' : '👩';

                const hasAllergy = a.alergen && a.alergen.length > 0;

                return (
                  <div
                    key={a.id}
                    className="bg-[#fff8f7] rounded-3xl p-5 sm:p-6 flex flex-col justify-between border-2 border-stone-200/80 hover:border-[#306a3b] transition-all shadow-xs gap-4"
                  >
                    {/* Header Anggota: Avatar, Nama & Tombol Aksi */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div className="w-13 h-13 rounded-2xl bg-white border border-stone-200 shadow-2xs flex items-center justify-center text-2xl shrink-0">
                          {avatarIcon}
                        </div>
                        <div>
                          <h3 className="text-base sm:text-lg font-extrabold text-[#2c1514] leading-snug">
                            {a.alias}
                          </h3>
                          <p className="text-xs sm:text-sm text-[#737a65] font-semibold mt-0.5">
                            Usia {a.usia_tahun} Tahun • {a.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                          </p>
                        </div>
                      </div>

                      <span className="px-3 py-1 rounded-full bg-[#b2f2b6] text-[#2c1514] text-[11px] sm:text-xs font-bold whitespace-nowrap">
                        {statusBadge}
                      </span>
                    </div>

                    {/* Target Energi Harian */}
                    <div className="bg-white rounded-2xl p-3.5 border border-stone-200/70 flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-semibold text-[#737a65]">
                        Kebutuhan Porsi Makan:
                      </span>
                      <span className="text-sm sm:text-base font-extrabold text-[#306a3b] font-mono">
                        {akg.energi_kcal.toLocaleString('id-ID')} kkal / hari
                      </span>
                    </div>

                    {/* Informasi Pantangan / Alergi Anggota Ini */}
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-[#737a65]">
                        Pantangan Makanan Pribadi:
                      </span>
                      {hasAllergy ? (
                        <div className="p-3 rounded-2xl bg-[#ffdad6] text-[#ba1a1a] text-xs sm:text-sm font-bold flex items-center gap-2 border border-[#ba1a1a]/20">
                          <span className="text-base">⚠️</span>
                          <span>Alergi: {a.alergen.map(getAlergenLabel).join(', ')}</span>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-2xl bg-white text-[#306a3b] text-xs sm:text-sm font-semibold flex items-center gap-2 border border-stone-200/60">
                          <span>✓</span>
                          <span>Bebas alergi makanan</span>
                        </div>
                      )}
                    </div>

                    {/* Tombol Aksi (Tinggi 48px, Sangat Nyaman untuk Orang Tua) */}
                    <div className="pt-2 border-t border-stone-200/60 flex items-center gap-2.5">
                      <Link
                        href={`/keluarga/anggota/${a.id}`}
                        className="flex-1 min-h-[48px] rounded-full bg-[#306a3b] hover:bg-[#155126] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Ubah Data &amp; Alergi</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleDeleteAnggota(a.id, a.alias)}
                        className="min-h-[48px] px-4 rounded-full bg-white hover:bg-red-50 text-red-600 border border-stone-200 text-xs sm:text-sm font-bold flex items-center justify-center transition cursor-pointer"
                        title={`Hapus ${a.alias}`}
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* DUA KOLOM BAWAH: PREFERENSI BELANJA PASAR & PENGATURAN AKUN */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* KOLOM KIRI (7 Kolom): Preferensi Pasar & Belanja Dapur */}
            <section id="preferensi-pasar" className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-stone-200/80 flex flex-col gap-4">
              <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
                <div className="w-10 h-10 rounded-2xl bg-[#fff0ef] text-[#306a3b] flex items-center justify-center text-xl shrink-0">
                  🛒
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-[#2c1514] leading-tight">
                    Acuan Pasar &amp; Pengiriman Daftar Belanja
                  </h2>
                  <p className="text-xs sm:text-sm text-[#737a65]">
                    Lokasi pasar tradisional dan nomor WhatsApp untuk belanja harian
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4 pt-1">
                {/* Dropdown Pasar */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="marketSelect" className="text-xs sm:text-sm font-bold text-[#2c1514]">
                    Pilih Acuan Pasar Tradisional Terdekat:
                  </label>
                  <div className="relative">
                    <select
                      id="marketSelect"
                      value={selectedMarket}
                      onChange={handleMarketChange}
                      className="w-full min-h-[48px] bg-[#fff8f7] rounded-2xl px-4 py-2.5 text-[#2c1514] text-xs sm:text-sm font-bold border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#306a3b] appearance-none pr-10 cursor-pointer"
                    >
                      <option value="Pasar Tradisional • Jakarta Selatan">Pasar Tradisional • Jakarta Selatan</option>
                      <option value="Pasar Tebet Barat • Jakarta Selatan">Pasar Tebet Barat • Jakarta Selatan</option>
                      <option value="Pasar Minggu • Jakarta Selatan">Pasar Minggu • Jakarta Selatan</option>
                      <option value="Supermarket Segar • Jabodetabek">Supermarket Segar • Jabodetabek</option>
                      <option value="Surabaya, Jawa Timur">Pasar Tradisional • Surabaya, Jawa Timur</option>
                    </select>
                    <svg className="w-5 h-5 text-[#737a65] pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <span className="text-[12px] text-[#737a65]">
                    Harga bahan di halaman Belanja disesuaikan otomatis dengan pasar pilihan Anda.
                  </span>
                </div>

                {/* Nomor WhatsApp Kirim Belanja */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-stone-100">
                  <label htmlFor="waPhoneInput" className="text-xs sm:text-sm font-bold text-[#2c1514]">
                    Nomor WhatsApp Tujuan (Suami / Pedagang Warung):
                  </label>
                  <div className="relative">
                    <input
                      id="waPhoneInput"
                      type="text"
                      value={waTargetPhone}
                      onChange={(e) => setWaTargetPhone(e.target.value)}
                      placeholder="+62 8xx-xxxx-xxxx"
                      className="w-full min-h-[48px] bg-[#fff8f7] rounded-2xl px-4 py-2.5 text-[#2c1514] text-xs sm:text-sm font-bold border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#306a3b]"
                    />
                    <svg className="w-5 h-5 text-[#306a3b] absolute right-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-[12px] text-[#737a65]">
                    Mempermudah mengirim catatan bahan belanjaan langsung ke aplikasi WhatsApp.
                  </span>
                </div>
              </div>
            </section>

            {/* KOLOM KANAN (5 Kolom): Akun, Keamanan & Bantuan */}
            <section className="lg:col-span-5 bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-stone-200/80 flex flex-col gap-4">
              <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
                <div className="w-10 h-10 rounded-2xl bg-[#fff0ef] text-[#306a3b] flex items-center justify-center text-xl shrink-0">
                  🔒
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-[#2c1514] leading-tight">
                    Keamanan Akun &amp; Bantuan
                  </h2>
                  <p className="text-xs sm:text-sm text-[#737a65]">
                    Nomor HP login dan pencadangan data keluarga
                  </p>
                </div>
              </div>

              {/* Data Akun HP */}
              <div className="flex flex-col gap-3 pt-1">
                <div className="bg-[#fff8f7] rounded-2xl p-4 border border-stone-200/70 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#737a65] font-semibold block">Nomor HP Terdaftar:</span>
                    <span className="text-sm sm:text-base font-bold text-[#2c1514] font-mono mt-0.5 block">{phone}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneInput(phone);
                      setModalMode('phone');
                    }}
                    className="min-h-[44px] px-3.5 py-1.5 rounded-full bg-white text-[#306a3b] text-xs font-bold border border-stone-200 hover:bg-[#ffe2df] transition cursor-pointer"
                  >
                    Ubah Nomor
                  </button>
                </div>

                {/* Password Akun */}
                <div className="bg-[#fff8f7] rounded-2xl p-4 border border-stone-200/70 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#737a65] font-semibold block">Kata Sandi (Password):</span>
                    <span className="text-sm font-mono text-[#737a65] tracking-widest mt-0.5 block">••••••••••••</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordInput('');
                      setModalMode('password');
                    }}
                    className="min-h-[44px] px-3.5 py-1.5 rounded-full bg-white text-[#306a3b] text-xs font-bold border border-stone-200 hover:bg-[#ffe2df] transition cursor-pointer"
                  >
                    Ganti Sandi
                  </button>
                </div>

                {/* Cadangan Data & Keamanan */}
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadData}
                    className="w-full min-h-[48px] py-2.5 px-4 rounded-full bg-[#fff0ef] hover:bg-[#ffe2df] text-[#306a3b] text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer border border-[#306a3b]/20"
                  >
                    <svg className="w-4 h-4 text-[#306a3b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Simpan Salinan Data (Unduh Cadangan)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetData}
                    className="w-full min-h-[44px] py-2 text-stone-500 hover:text-red-600 text-xs font-semibold text-center transition cursor-pointer"
                  >
                    Setel Ulang Data ke Awal (Reset Demo)
                  </button>
                </div>
              </div>
            </section>

          </div>

        </div>
      </main>

      {/* MODAL EDIT DATA (Phone, Password, Budget) - Touch Friendly & Jelas */}
      {modalMode !== 'none' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-xl border border-stone-200 animate-scaleIn flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h3 className="text-base sm:text-lg font-extrabold text-[#2c1514]">
                {modalMode === 'phone'
                  ? 'Ubah Nomor HP Akun'
                  : modalMode === 'password'
                  ? 'Ganti Kata Sandi Akun'
                  : 'Atur Anggaran Belanja Dapur'}
              </h3>
              <button
                type="button"
                onClick={() => setModalMode('none')}
                className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 cursor-pointer"
                aria-label="Tutup formulir"
              >
                ✕
              </button>
            </div>

            {/* Modal Ubah No HP */}
            {modalMode === 'phone' && (
              <form onSubmit={handleSavePhone} className="flex flex-col gap-3.5">
                <label className="text-xs sm:text-sm font-bold text-[#737a65]">
                  Masukkan Nomor HP Baru (Digunakan untuk Masuk):
                </label>
                <input
                  type="text"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full min-h-[48px] px-4 py-2.5 rounded-2xl bg-[#fff8f7] border border-stone-300 text-sm sm:text-base font-bold text-[#2c1514] focus:outline-none focus:ring-2 focus:ring-[#306a3b]"
                  required
                />
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalMode('none')}
                    className="min-h-[46px] px-5 py-2 rounded-full bg-stone-100 text-[#2c1514] text-xs sm:text-sm font-bold hover:bg-stone-200 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="min-h-[46px] px-6 py-2 rounded-full bg-[#6da003] hover:bg-[#466800] text-white text-xs sm:text-sm font-bold transition cursor-pointer shadow-sm"
                  >
                    Simpan Nomor HP
                  </button>
                </div>
              </form>
            )}

            {/* Modal Ganti Password */}
            {modalMode === 'password' && (
              <form onSubmit={handleSavePassword} className="flex flex-col gap-3.5">
                <label className="text-xs sm:text-sm font-bold text-[#737a65]">
                  Kata Sandi Baru (Minimal 6 Huruf/Angka):
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full min-h-[48px] px-4 py-2.5 rounded-2xl bg-[#fff8f7] border border-stone-300 text-sm sm:text-base font-bold text-[#2c1514] focus:outline-none focus:ring-2 focus:ring-[#306a3b]"
                  required
                />
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalMode('none')}
                    className="min-h-[46px] px-5 py-2 rounded-full bg-stone-100 text-[#2c1514] text-xs sm:text-sm font-bold hover:bg-stone-200 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="min-h-[46px] px-6 py-2 rounded-full bg-[#6da003] hover:bg-[#466800] text-white text-xs sm:text-sm font-bold transition cursor-pointer shadow-sm"
                  >
                    Simpan Sandi Baru
                  </button>
                </div>
              </form>
            )}

            {/* Modal Atur Budget */}
            {modalMode === 'budget' && (
              <form onSubmit={handleSaveBudget} className="flex flex-col gap-3.5">
                <label className="text-xs sm:text-sm font-bold text-[#737a65]">
                  Pilih Periode Jatah Belanja:
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-[#fff8f7] rounded-2xl border border-stone-200">
                  <button
                    type="button"
                    onClick={() => setKeluargaTipeBudget('bulanan')}
                    className={`min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                      keluargaTipeBudget === 'bulanan'
                        ? 'bg-[#306a3b] text-white shadow-xs'
                        : 'text-[#737a65] hover:text-[#2c1514]'
                    }`}
                  >
                    📅 Jatah Bulanan
                  </button>
                  <button
                    type="button"
                    onClick={() => setKeluargaTipeBudget('mingguan')}
                    className={`min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                      keluargaTipeBudget === 'mingguan'
                        ? 'bg-[#306a3b] text-white shadow-xs'
                        : 'text-[#737a65] hover:text-[#2c1514]'
                    }`}
                  >
                    📆 Jatah Mingguan
                  </button>
                </div>

                <label className="text-xs sm:text-sm font-bold text-[#737a65]">
                  {keluargaTipeBudget === 'mingguan'
                    ? 'Nominal Jatah Belanja per Minggu (Rp):'
                    : 'Nominal Jatah Belanja per Bulan (Rp):'}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm sm:text-base font-bold text-[#737a65] font-mono">
                    Rp
                  </span>
                  <input
                    type="text"
                    value={Number(budgetInput.replace(/\D/g, '') || 0).toLocaleString('id-ID')}
                    onChange={(e) => setBudgetInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full min-h-[48px] pl-12 pr-4 py-2.5 rounded-2xl bg-[#fff8f7] border border-stone-300 text-sm sm:text-base font-bold text-[#2c1514] font-mono focus:outline-none focus:ring-2 focus:ring-[#306a3b]"
                    required
                  />
                </div>

                {/* Info hitungan praktis */}
                {(() => {
                  const num = parseInt(budgetInput.replace(/\D/g, '') || '0', 10);
                  const totalBulanan = keluargaTipeBudget === 'mingguan' ? num * 4 : num;
                  const perHari = Math.round(totalBulanan / 30);
                  return (
                    <div className="text-xs text-[#2c1514] bg-[#fff0ef] p-3 rounded-2xl border border-stone-200/70 leading-relaxed">
                      {keluargaTipeBudget === 'mingguan' ? (
                        <span>
                          💡 Jatah <strong>Rp {num.toLocaleString('id-ID')}</strong>/minggu setara dengan total bulanan <strong>Rp {totalBulanan.toLocaleString('id-ID')}</strong> (Batas belanja aman: ~<strong>Rp {perHari.toLocaleString('id-ID')}</strong> / hari).
                        </span>
                      ) : (
                        <span>
                          💡 Jatah <strong>Rp {num.toLocaleString('id-ID')}</strong>/bulan memberikan batas belanja aman harian sekitar ~<strong>Rp {perHari.toLocaleString('id-ID')}</strong> / hari.
                        </span>
                      )}
                    </div>
                  );
                })()}

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalMode('none')}
                    className="min-h-[46px] px-5 py-2 rounded-full bg-stone-100 text-[#2c1514] text-xs sm:text-sm font-bold hover:bg-stone-200 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="min-h-[46px] px-6 py-2 rounded-full bg-[#6da003] hover:bg-[#466800] text-white text-xs sm:text-sm font-bold transition cursor-pointer shadow-sm"
                  >
                    Simpan Anggaran
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
