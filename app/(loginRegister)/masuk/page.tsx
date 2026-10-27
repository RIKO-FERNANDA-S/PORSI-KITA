'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BrandLogo from '../../../components/BrandLogo';
import { createClient } from '../../../lib/supabase/client';

export type LoginMode = 'PASSWORD' | 'UNVERIFIED_OTP' | 'FORGOT_PASSWORD';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab: 'masuk' (Login) atau 'buat-akun' (Register)
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'masuk' | 'buat-akun'>(
    tabParam === 'buat-akun' ? 'buat-akun' : 'masuk'
  );

  // 3 Mode Login: PASSWORD (Default), UNVERIFIED_OTP, FORGOT_PASSWORD
  const [loginMode, setLoginMode] = useState<LoginMode>('PASSWORD');

  // Input States
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [namaKeluarga, setNamaKeluarga] = useState('');

  // Status & Feedback States
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Helper normalisasi nomor telepon ke format E.164 (+62...)
  const formatPhoneToE164 = (raw: string): string => {
    let clean = raw.replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = '62' + clean.substring(1);
    } else if (!clean.startsWith('62')) {
      clean = '62' + clean;
    }
    return '+' + clean;
  };

  // Bersihkan error saat beralih tab atau mode
  const switchTab = (tab: 'masuk' | 'buat-akun') => {
    setActiveTab(tab);
    setLoginMode('PASSWORD');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const switchLoginMode = (mode: LoginMode) => {
    setLoginMode(mode);
    setErrorMsg('');
    setSuccessMsg('');
  };

  // =========================================================================
  // 1. ALUR REGISTER BARU: HANYA INPUT NOMOR HP -> OTP
  // =========================================================================
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!phone.trim()) {
      setErrorMsg('Silakan masukkan nomor WhatsApp Anda.');
      return;
    }

    const formatted = formatPhoneToE164(phone);
    if (formatted.length < 10) {
      setErrorMsg('Format nomor WhatsApp tidak valid. Masukkan minimal 10 digit.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formatted,
          mode: 'register',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal mengirim kode OTP ke WhatsApp Anda.');
        setLoading(false);
        return;
      }

      // Redirect langsung ke /verifikasi-otp dengan nomor HP
      const query = new URLSearchParams({
        phone: formatted,
        mode: 'register',
      }).toString();

      router.push(`/verifikasi-otp?${query}`);
    } catch {
      setErrorMsg('Terjadi kendala jaringan saat mengirim OTP. Silakan periksa koneksi internet Anda.');
      setLoading(false);
    }
  };

  // =========================================================================
  // 2. MODE 1: LOGIN STANDAR (NOMOR HP & KATA SANDI)
  // =========================================================================
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!phone.trim()) {
      setErrorMsg('Silakan masukkan nomor WhatsApp Anda.');
      return;
    }
    if (!password) {
      setErrorMsg('Silakan masukkan kata sandi akun Anda.');
      return;
    }

    const formatted = formatPhoneToE164(phone);
    setLoading(true);

    try {
      // Validasi status kata sandi di database terlebih dahulu
      const checkRes = await fetch('/api/auth/check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formatted }),
      });
      const checkData = await checkRes.json();

      if (checkData.exists && checkData.hasPassword === false) {
        // Aturan Wajib: Tampilkan pesan terarah jika belum buat password
        setErrorMsg('Ibu belum membuat kata sandi. Silakan tekan tombol "Belum Buat Kata Sandi" di bawah.');
        setLoading(false);
        return;
      }

      // Jalankan login kata sandi resmi melalui backend API
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formatted,
          password,
        }),
      });

      const loginData = await loginRes.json();

      if (!loginRes.ok) {
        setErrorMsg(loginData.error || 'Nomor WhatsApp atau kata sandi tidak cocok. Silakan coba kembali.');
        setLoading(false);
        return;
      }

      // Simpan session info ke localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'porsi_kita_auth_meta',
          JSON.stringify({
            phone: formatted,
            nama: loginData.user?.alias || 'Ibu Pengguna',
            hasPassword: true,
            verifiedAt: Date.now(),
          })
        );
      }

      router.push('/dashboard');
    } catch {
      setErrorMsg('Gagal terhubung ke server autentikasi.');
      setLoading(false);
    }
  };

  // =========================================================================
  // 3. MODE 2: LOGIN USER BELUM BUAT PASSWORD (NAMA KELUARGA + NOMOR HP -> OTP)
  // =========================================================================
  const handleUnverifiedOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!namaKeluarga.trim()) {
      setErrorMsg('Silakan masukkan Nama Keluarga yang didaftarkan saat awal.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Silakan masukkan nomor WhatsApp Anda.');
      return;
    }

    const formatted = formatPhoneToE164(phone);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login-unverified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formatted,
          nama: namaKeluarga.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Tampilkan pesan error spesifik dari backend (misal: "Nama keluarga dan nomor HP tidak cocok dengan data pendaftaran.")
        setErrorMsg(data.error || 'Nama keluarga dan nomor HP tidak cocok dengan data pendaftaran.');
        setLoading(false);
        return;
      }

      // Arahkan ke halaman verifikasi OTP
      const query = new URLSearchParams({
        phone: formatted,
        nama: namaKeluarga.trim(),
        mode: 'login_unverified',
      }).toString();

      router.push(`/verifikasi-otp?${query}`);
    } catch {
      setErrorMsg('Terjadi kendala saat memproses verifikasi. Silakan coba kembali.');
      setLoading(false);
    }
  };

  // =========================================================================
  // 4. MODE 3: LUPA KATA SANDI (NOMOR HP -> OTP -> SET PASSWORD BARU)
  // =========================================================================
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!phone.trim()) {
      setErrorMsg('Silakan masukkan nomor WhatsApp Anda terlebih dahulu.');
      return;
    }

    const formatted = formatPhoneToE164(phone);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formatted,
          mode: 'forgot_password',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal mengirim OTP pemulihan kata sandi.');
        setLoading(false);
        return;
      }

      const query = new URLSearchParams({
        phone: formatted,
        mode: 'forgot_password',
      }).toString();

      router.push(`/verifikasi-otp?${query}`);
    } catch {
      setErrorMsg('Gagal memproses pemulihan kata sandi.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 xl:gap-24 px-4 sm:px-6 py-8 lg:py-0 selection:bg-[#6DA003]/30">
      
      {/* Kolom Kiri: Showcase Visual Porsi Kita */}
      <div className="hidden lg:flex w-full lg:w-1/2 max-w-[500px] xl:max-w-[540px] h-[92vh] max-h-[860px] rounded-[32px] shadow-2xl overflow-hidden relative flex-col justify-between p-8 xl:p-10 text-white bg-[#0C4B20] border border-[#0C4B20]/20">
        
        {/* Layer Background Halus */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0C4B20] via-[#143118] to-[#0a3818] pointer-events-none" />
        
        {/* Pola Titik Lembut */}
        <div 
          className="absolute inset-0 opacity-[0.08] pointer-events-none" 
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '24px 24px'
          }} 
        />

        {/* Header Showcase */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 flex items-center justify-center">
              <BrandLogo size={28} showAsterisk={false} />
            </div>
            <div>
              <span className="font-bold text-[18px] tracking-tight block text-white leading-none">
                Porsi Kita
              </span>
              <span className="text-[11px] text-[#A5E342] font-medium tracking-wide">
                Gizi Tepat Sekeluarga
              </span>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-semibold text-white/90">
            <span className="w-1.5 h-1.5 rounded-full bg-[#A5E342]" />
            Permenkes 28/2019
          </div>
        </div>

        {/* Narasi Tengah */}
        <div className="relative z-10 space-y-6 my-auto py-4">
          <div>
            <span className="text-[12px] font-bold text-[#A5E342] uppercase tracking-wider block mb-2">
              Solusi Dapur Rumah Tangga
            </span>
            <h2 className="text-[26px] xl:text-[30px] font-bold text-white leading-[1.2] tracking-tight">
              Satu Masakan Rumah,<br />
              Porsi Gizi Pas Tiap Anggota.
            </h2>
            <p className="text-[13px] xl:text-[14px] text-white/80 mt-2.5 leading-relaxed">
              Ibu tidak perlu memasak berulang kali. Cukup masak satu menu lezat, sistem membagi porsi per piring secara presisi untuk balita, anak, orang tua, hingga lansia.
            </p>
          </div>

          {/* Cuplikan Simulasi Porsi */}
          <div className="bg-black/25 rounded-2xl p-4 xl:p-5 border border-white/15 shadow-inner space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
              <span className="font-semibold text-[#A5E342] flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Contoh Pembagian Piring Sehat
              </span>
              <span className="text-[10px] text-white/60">Sayur Bening &amp; Tempe</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#6DA003] text-white text-[10px] font-bold flex items-center justify-center">
                    A
                  </span>
                  <div>
                    <span className="font-semibold text-white block leading-tight">Ayu (Balita 3 th)</span>
                    <span className="text-[10px] text-white/60">Target 1.350 kkal • Fe 7mg</span>
                  </div>
                </div>
                <span className="font-bold text-[#A5E342] text-[12px] tabular-nums">0.50 Porsi</span>
              </div>

              <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#6DA003] text-white text-[10px] font-bold flex items-center justify-center">
                    B
                  </span>
                  <div>
                    <span className="font-semibold text-white block leading-tight">Bu Sari (Ibu 32 th)</span>
                    <span className="text-[10px] text-white/60">Target 2.150 kkal • Fe 18mg</span>
                  </div>
                </div>
                <span className="font-bold text-[#A5E342] text-[12px] tabular-nums">1.00 Porsi</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-[11px] text-white/80 border-t border-white/10">
              <span>Kecukupan Gizi Keluarga:</span>
              <span className="font-bold text-[#A5E342] bg-[#A5E342]/15 px-2 py-0.5 rounded-full border border-[#A5E342]/30">
                98% Terpenuhi
              </span>
            </div>
          </div>
        </div>

        {/* Footer Showcase */}
        <div className="relative z-10 pt-4 border-t border-white/15 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 rounded-xl bg-white/5">
            <span className="font-bold text-white block text-[13px]">1 Menu</span>
            <span className="text-[10px] text-white/60">Satu panci keluarga</span>
          </div>
          <div className="p-2 rounded-xl bg-white/5">
            <span className="font-bold text-white block text-[13px]">Hemat 30%</span>
            <span className="text-[10px] text-white/60">Terkunci anggaran</span>
          </div>
          <div className="p-2 rounded-xl bg-white/5">
            <span className="font-bold text-white block text-[13px]">Bebas Alergi</span>
            <span className="text-[10px] text-white/60">Proteksi otomatis</span>
          </div>
        </div>
      </div>

      {/* Kolom Kanan: Form Masuk / Buat Akun */}
      <div className="w-full max-w-[430px] flex flex-col items-center">
        {/* Brand Mark */}
        <div className="mb-5">
          <BrandLogo size={52} showAsterisk={true} />
        </div>

        {/* Title */}
        <h1 className="text-[30px] sm:text-[32px] font-[800] text-[#0D0101] tracking-tight text-center leading-tight mb-5">
          Selamat datang
        </h1>

        {/* Segmented Tab (Masuk | Buat Akun) */}
        <div
          role="tablist"
          className="w-full h-[52px] bg-[#E2E0E1] rounded-[16px] p-1.5 flex items-center mb-5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'masuk'}
            onClick={() => switchTab('masuk')}
            className={`flex-1 min-h-[40px] rounded-[12px] text-[14px] font-[700] transition-all flex items-center justify-center cursor-pointer ${
              activeTab === 'masuk'
                ? 'bg-[#FFFFFF] text-[#0D0101] shadow-xs'
                : 'text-[#5F5F5F] hover:text-[#0D0101]'
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'buat-akun'}
            onClick={() => switchTab('buat-akun')}
            className={`flex-1 min-h-[40px] rounded-[12px] text-[14px] font-[700] transition-all flex items-center justify-center cursor-pointer ${
              activeTab === 'buat-akun'
                ? 'bg-[#FFFFFF] text-[#0D0101] shadow-xs'
                : 'text-[#5F5F5F] hover:text-[#0D0101]'
            }`}
          >
            Buat Akun
          </button>
        </div>

        {/* Alert Pesan Error / Sukses */}
        {errorMsg && (
          <div className="w-full p-3.5 rounded-[14px] bg-rose-50 border border-rose-200 text-rose-800 text-[13px] font-medium mb-4 flex items-start gap-2.5">
            <svg className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="leading-snug">{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="w-full p-3.5 rounded-[14px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-[13px] font-medium mb-4 flex items-start gap-2.5">
            <svg className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="leading-snug">{successMsg}</span>
          </div>
        )}

        {/* ================================================================= */}
        {/* KONTEN TAB: BUAT AKUN (REGISTER BARU TANPA PASSWORD DI AWAL)       */}
        {/* ================================================================= */}
        {activeTab === 'buat-akun' && (
          <div className="w-full transition-all duration-200">
            <div className="w-full mb-4 text-left">
              <h2 className="text-[16px] font-bold text-[#0D0101] leading-tight mb-1">
                Daftar Akun Keluarga Baru
              </h2>
              <p className="text-[13px] text-[#5F5F5F] leading-relaxed">
                Cukup masukkan nomor WhatsApp Ibu. Kami akan mengirimkan 6 digit kode OTP untuk mulai melengkapi data keluarga.
              </p>
            </div>

            <form onSubmit={handleRegister} className="w-full space-y-3.5">
              {/* Input Nomor HP Saja */}
              <div className="w-full">
                <label className="block text-[12px] font-bold text-[#0D0101] mb-1.5">
                  Nomor WhatsApp Ibu
                </label>
                <div className="w-full min-h-[50px] bg-[#E2E0E1] rounded-[14px] px-4 flex items-center gap-3 border border-transparent focus-within:border-[#0C4B20] focus-within:bg-[#FFFFFF] transition-all">
                  <svg className="w-5 h-5 text-[#0C4B20] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    required
                    className="w-full bg-transparent text-[14px] text-[#0D0101] placeholder-[#858585] focus:outline-none font-medium"
                  />
                </div>
                <p className="text-[11px] text-[#5F5F5F] mt-1 pl-1">
                  Format awalan 08 akan disesuaikan otomatis menjadi +628.
                </p>
              </div>

              {/* Tombol Daftar & Kirim OTP (Min 48px) */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: 'linear-gradient(90deg, #6DA003 0%, #82BD03 100%)',
                    boxShadow: '0 4px 12px rgba(109, 160, 3, 0.25)',
                  }}
                  className="w-full min-h-[48px] rounded-[12px] text-[15px] font-bold text-white flex items-center justify-center transition active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Mengirim Kode OTP...</span>
                    </div>
                  ) : (
                    'Daftar & Kirim Kode OTP'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================================================================= */}
        {/* KONTEN TAB: MASUK DENGAN 3 MODE                                    */}
        {/* ================================================================= */}
        {activeTab === 'masuk' && (
          <div className="w-full transition-all duration-200">
            
            {/* ------------------------------------------------------------- */}
            {/* MODE 1: LOGIN STANDAR (PASSWORD - DEFAULT)                     */}
            {/* ------------------------------------------------------------- */}
            {loginMode === 'PASSWORD' && (
              <div className="space-y-4">
                <div className="w-full mb-3 text-left">
                  <h2 className="text-[16px] font-bold text-[#0D0101] leading-tight mb-1">
                    Masuk ke Akun Keluarga Ibu
                  </h2>
                  <p className="text-[13px] text-[#5F5F5F] leading-relaxed">
                    Masukkan nomor WhatsApp dan kata sandi yang telah dibuat.
                  </p>
                </div>

                <form onSubmit={handlePasswordLogin} className="w-full space-y-3.5">
                  {/* Input Nomor HP */}
                  <div>
                    <label className="block text-[12px] font-bold text-[#0D0101] mb-1">
                      Nomor WhatsApp
                    </label>
                    <div className="w-full min-h-[50px] bg-[#E2E0E1] rounded-[14px] px-4 flex items-center gap-3 border border-transparent focus-within:border-[#0C4B20] focus-within:bg-[#FFFFFF] transition-all">
                      <svg className="w-5 h-5 text-[#0C4B20] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Contoh: 081234567890"
                        required
                        className="w-full bg-transparent text-[14px] text-[#0D0101] placeholder-[#858585] focus:outline-none font-medium"
                      />
                    </div>
                  </div>

                  {/* Input Kata Sandi */}
                  <div>
                    <label className="block text-[12px] font-bold text-[#0D0101] mb-1">
                      Kata Sandi
                    </label>
                    <div className="w-full min-h-[50px] bg-[#E2E0E1] rounded-[14px] px-4 flex items-center justify-between gap-3 border border-transparent focus-within:border-[#0C4B20] focus-within:bg-[#FFFFFF] transition-all">
                      <div className="flex items-center gap-3 flex-1">
                        <svg className="w-5 h-5 text-[#0D0101] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Masukkan kata sandi akun"
                          required
                          className="w-full bg-transparent text-[14px] text-[#0D0101] placeholder-[#858585] focus:outline-none font-medium"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[#0D0101] p-1.5 focus:outline-none cursor-pointer hover:opacity-70"
                        title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Mode 3 Trigger: Lupa Kata Sandi */}
                  <div className="flex justify-end pt-0.5">
                    <button
                      type="button"
                      onClick={() => switchLoginMode('FORGOT_PASSWORD')}
                      className="text-[12px] font-semibold text-[#5F5F5F] hover:text-[#0C4B20] underline cursor-pointer"
                    >
                      Lupa kata sandi?
                    </button>
                  </div>

                  {/* Submit Button Mode 1 (Min 48px) */}
                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        background: 'linear-gradient(90deg, #6DA003 0%, #82BD03 100%)',
                        boxShadow: '0 4px 12px rgba(109, 160, 3, 0.25)',
                      }}
                      className="w-full min-h-[48px] rounded-[12px] text-[15px] font-bold text-white flex items-center justify-center transition active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                    >
                      {loading ? 'Memverifikasi Sandi...' : 'Masuk ke Dashboard'}
                    </button>
                  </div>
                </form>

                {/* Pemisah Elegan */}
                <div className="relative flex items-center justify-center my-4">
                  <div className="border-t border-[#E2E0E1] w-full" />
                  <span className="bg-[#FAFAFA] px-3 text-[11px] font-bold text-[#858585] uppercase tracking-wider">
                    Atau Masuk Tanpa Sandi
                  </span>
                </div>

                {/* Mode 2 Trigger: Tombol Jelas dan Berbeda Visual */}
                <div className="w-full">
                  <button
                    type="button"
                    onClick={() => switchLoginMode('UNVERIFIED_OTP')}
                    className="w-full min-h-[48px] p-3 rounded-[14px] bg-[#FFFFFF] border-2 border-[#6DA003]/30 hover:border-[#6DA003] hover:bg-[#F2F9EC] transition-all flex items-center justify-between text-left cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#6DA003]/10 text-[#0C4B20] flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-[13px] font-bold text-[#0C4B20] block leading-tight group-hover:text-[#0C4B20]">
                          Sudah daftar tapi belum sempat buat kata sandi?
                        </span>
                        <span className="text-[11px] text-[#5F5F5F] block mt-0.5">
                          Masuk via verifikasi OTP WhatsApp
                        </span>
                      </div>
                    </div>
                    <span className="text-[#6DA003] font-bold text-sm shrink-0 pl-2">→</span>
                  </button>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* MODE 2: LOGIN USER BELUM BUAT PASSWORD (UNVERIFIED_OTP)        */}
            {/* ------------------------------------------------------------- */}
            {loginMode === 'UNVERIFIED_OTP' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="w-full mb-3 text-left">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EAF5D8] text-[#0C4B20] text-[11px] font-bold mb-2">
                    <span>✨ Masuk Tanpa Kata Sandi</span>
                  </div>
                  <h2 className="text-[16px] font-bold text-[#0D0101] leading-tight mb-1">
                    Verifikasi Nama &amp; Nomor WhatsApp
                  </h2>
                  <p className="text-[13px] text-[#5F5F5F] leading-relaxed">
                    Masukkan Nama Keluarga yang didaftarkan saat awal dan nomor WhatsApp Anda untuk menerima kode OTP masuk.
                  </p>
                </div>

                <form onSubmit={handleUnverifiedOtpLogin} className="w-full space-y-3.5">
                  {/* Input 1: Nama Keluarga */}
                  <div>
                    <label className="block text-[12px] font-bold text-[#0D0101] mb-1">
                      Nama Keluarga (yang didaftarkan)
                    </label>
                    <div className="w-full min-h-[50px] bg-[#E2E0E1] rounded-[14px] px-4 flex items-center gap-3 border border-transparent focus-within:border-[#0C4B20] focus-within:bg-[#FFFFFF] transition-all">
                      <svg className="w-5 h-5 text-[#0C4B20] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <input
                        type="text"
                        value={namaKeluarga}
                        onChange={(e) => setNamaKeluarga(e.target.value)}
                        placeholder="Misal: Keluarga Budi atau Ibu Sari"
                        required
                        className="w-full bg-transparent text-[14px] text-[#0D0101] placeholder-[#858585] focus:outline-none font-medium"
                      />
                    </div>
                  </div>

                  {/* Input 2: Nomor WhatsApp */}
                  <div>
                    <label className="block text-[12px] font-bold text-[#0D0101] mb-1">
                      Nomor WhatsApp
                    </label>
                    <div className="w-full min-h-[50px] bg-[#E2E0E1] rounded-[14px] px-4 flex items-center gap-3 border border-transparent focus-within:border-[#0C4B20] focus-within:bg-[#FFFFFF] transition-all">
                      <svg className="w-5 h-5 text-[#0C4B20] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Contoh: 081234567890"
                        required
                        className="w-full bg-transparent text-[14px] text-[#0D0101] placeholder-[#858585] focus:outline-none font-medium"
                      />
                    </div>
                  </div>

                  {/* Tombol Kirim OTP WhatsApp (Min 48px) */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        background: 'linear-gradient(90deg, #6DA003 0%, #82BD03 100%)',
                        boxShadow: '0 4px 12px rgba(109, 160, 3, 0.25)',
                      }}
                      className="w-full min-h-[48px] rounded-[12px] text-[15px] font-bold text-white flex items-center justify-center transition active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                    >
                      {loading ? 'Mencocokkan Data...' : 'Kirim Kode OTP WhatsApp'}
                    </button>
                  </div>

                  {/* Tombol Kembali ke Halaman Masuk Utama (Min 48px) */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => switchLoginMode('PASSWORD')}
                      className="w-full min-h-[48px] rounded-[12px] bg-[#E2E0E1] hover:bg-stone-300 text-[#0D0101] text-[13px] font-bold flex items-center justify-center transition cursor-pointer"
                    >
                      ← Kembali ke halaman masuk utama
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* MODE 3: LUPA KATA SANDI (FORGOT_PASSWORD)                      */}
            {/* ------------------------------------------------------------- */}
            {loginMode === 'FORGOT_PASSWORD' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="w-full mb-3 text-left">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold mb-2">
                    <span>🔑 Pemulihan Kata Sandi</span>
                  </div>
                  <h2 className="text-[16px] font-bold text-[#0D0101] leading-tight mb-1">
                    Lupa Kata Sandi Akun
                  </h2>
                  <p className="text-[13px] text-[#5F5F5F] leading-relaxed">
                    Masukkan nomor WhatsApp yang sudah terdaftar. Kami akan mengirimkan kode OTP untuk membuat kata sandi baru.
                  </p>
                </div>

                <form onSubmit={handleForgotPassword} className="w-full space-y-3.5">
                  {/* Input Nomor HP */}
                  <div>
                    <label className="block text-[12px] font-bold text-[#0D0101] mb-1">
                      Nomor WhatsApp Terdaftar
                    </label>
                    <div className="w-full min-h-[50px] bg-[#E2E0E1] rounded-[14px] px-4 flex items-center gap-3 border border-transparent focus-within:border-[#0C4B20] focus-within:bg-[#FFFFFF] transition-all">
                      <svg className="w-5 h-5 text-[#0C4B20] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Contoh: 081234567890"
                        required
                        className="w-full bg-transparent text-[14px] text-[#0D0101] placeholder-[#858585] focus:outline-none font-medium"
                      />
                    </div>
                  </div>

                  {/* Tombol Kirim Kode Pemulihan (Min 48px) */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        background: 'linear-gradient(90deg, #6DA003 0%, #82BD03 100%)',
                        boxShadow: '0 4px 12px rgba(109, 160, 3, 0.25)',
                      }}
                      className="w-full min-h-[48px] rounded-[12px] text-[15px] font-bold text-white flex items-center justify-center transition active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                    >
                      {loading ? 'Mengirim Kode...' : 'Kirim Kode Pemulihan ke WhatsApp'}
                    </button>
                  </div>

                  {/* Tombol Kembali ke Halaman Masuk Utama (Min 48px) */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => switchLoginMode('PASSWORD')}
                      className="w-full min-h-[48px] rounded-[12px] bg-[#E2E0E1] hover:bg-stone-300 text-[#0D0101] text-[13px] font-bold flex items-center justify-center transition cursor-pointer"
                    >
                      ← Kembali ke halaman masuk utama
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>
        )}

        {/* Tautan Sekunder di Bawah Tab */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => switchTab(activeTab === 'masuk' ? 'buat-akun' : 'masuk')}
            className="text-[13px] font-bold text-[#0C4B20] hover:underline cursor-pointer"
          >
            {activeTab === 'masuk'
              ? 'Belum punya akun? Buat akun keluarga sekarang'
              : 'Sudah punya akun? Masuk sekarang'}
          </button>
        </div>

        {/* Demo Fast Track Mode */}
        <div className="mt-6 pt-4 border-t border-[#E2E0E1] w-full text-center">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="text-[12px] font-semibold text-[#858585] hover:text-[#0D0101] transition cursor-pointer"
          >
            Masuk Langsung sebagai Tamu (Mode Demo) →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center text-sm text-stone-500">Memuat halaman masuk...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
