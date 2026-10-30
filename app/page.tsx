'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  getStoredKeluarga,
  getStoredAnggota,
  getStoredMenu,
  saveStoredMenu,
  DEFAULT_KELUARGA,
  DEFAULT_ANGGOTA,
} from '../lib/store';
import { Anggota, Keluarga, RencanaMenu7Hari } from '../lib/types';
import { generateMenu } from '../lib/planner/generate';

export default function PorsiKitaLandingPage() {
  const router = useRouter();
  const [keluarga, setKeluarga] = useState<Keluarga>(DEFAULT_KELUARGA);
  const [anggotaList, setAnggotaList] = useState<Anggota[]>(DEFAULT_ANGGOTA);
  const [rencanaMenu, setRencanaMenu] = useState<RencanaMenu7Hari | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Interactive Floating Budget Bar states
  const [budgetHarian, setBudgetHarian] = useState(45000);
  const [durasiMenu, setDurasiMenu] = useState<'7 Hari' | '14 Hari'>('7 Hari');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    try {
      // Pastikan tidak ada sisa mode view lama yang mengganggu
      localStorage.removeItem('porsi_kita_active_view');

      const k = getStoredKeluarga();
      const a = getStoredAnggota();
      const m = getStoredMenu();
      if (k) setKeluarga(k);
      if (a && a.length > 0) setAnggotaList(a);
      if (m) setRencanaMenu(m);

      const authMeta = localStorage.getItem('porsi_kita_auth_meta');
      setIsLoggedIn(Boolean(authMeta || k));
    } catch {
      // Browser storage fallback
    }
  }, []);

  const handleSusunMenu = () => {
    setIsGenerating(true);
    try {
      const k = keluarga || DEFAULT_KELUARGA;
      const fresh = generateMenu({
        familyId: k.id,
        familyName: k.alias,
        budgetHarianRp: budgetHarian,
        anggota: anggotaList.length > 0 ? anggotaList : DEFAULT_ANGGOTA,
        seed: Date.now(),
      });
      saveStoredMenu(fresh);
      setRencanaMenu(fresh);
    } catch {
      // fallback
    }
    setTimeout(() => {
      setIsGenerating(false);
      router.push('/menu');
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#fff8f7] text-[#2c1514] font-sans antialiased selection:bg-[#bbf45e]/40">
      
      {/* ========================================================= */}
      {/* 1. HEADER / NAVBAR PUBLIK */}
      {/* ========================================================= */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#fff8f7]/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-stone-200/50">
        <div className="h-20 max-w-[1280px] mx-auto px-5 md:px-8 lg:px-12 flex items-center justify-between gap-6">
          
          {/* Logo Brand "PORSI KITA" dengan Logo Resmi */}
          <Link href="/" className="flex items-center gap-3 group focus:outline-none">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
              <Image
                src="/logo.png"
                alt="Logo Resmi Porsi Kita"
                width={40}
                height={40}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-[20px] tracking-tight uppercase text-[#306a3b] group-hover:text-[#466800] transition-colors leading-none">
                PORSI KITA
              </span>
              <span className="text-[10px] text-[#737a65] font-semibold tracking-wider uppercase mt-1 leading-none">
                Harmoni Domestik
              </span>
            </div>
          </Link>

          {/* Menu Navigasi Tengah Desktop */}
          <nav className="hidden lg:flex items-center gap-1.5" aria-label="Navigasi Utama Publik">
            <a
              href="#cara-kerja"
              className="px-3.5 py-2 rounded-full text-[13px] font-semibold text-[#434937] hover:text-[#2c1514] hover:bg-[#ffe9e7]/70 transition-colors"
            >
              Cara Kerja
            </a>
            <a
              href="#standar-gizi"
              className="px-3.5 py-2 rounded-full text-[13px] font-semibold text-[#434937] hover:text-[#2c1514] hover:bg-[#ffe9e7]/70 transition-colors"
            >
              Standar Gizi
            </a>
            <a
              href="#fitur"
              className="px-3.5 py-2 rounded-full text-[13px] font-semibold text-[#434937] hover:text-[#2c1514] hover:bg-[#ffe9e7]/70 transition-colors"
            >
              Fitur
            </a>
            <a
              href="#posyandu-api"
              className="px-3.5 py-2 rounded-full text-[13px] font-semibold text-[#434937] hover:text-[#2c1514] hover:bg-[#ffe9e7]/70 transition-colors"
            >
              Posyandu &amp; API
            </a>
            <Link
              href="/tentang"
              className="px-3.5 py-2 rounded-full text-[13px] font-semibold text-[#434937] hover:text-[#2c1514] hover:bg-[#ffe9e7]/70 transition-colors"
            >
              Metodologi
            </Link>
            <Link
              href="/panduan"
              className="px-3.5 py-2 rounded-full text-[13px] font-semibold text-[#434937] hover:text-[#2c1514] hover:bg-[#ffe9e7]/70 transition-colors"
            >
              Panduan
            </Link>
          </nav>

          {/* Aksi Kanan Publik */}
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[13px] tracking-wide text-white bg-[#306a3b] hover:bg-[#25522d] transition-all duration-200 font-bold shadow-xs hover:shadow-sm"
              >
                <span>Buka Dashboard</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            ) : (
              <>
                <Link
                  href="/masuk"
                  className="px-4 py-2 text-[13px] font-bold text-[#306a3b] hover:text-[#466800] transition"
                >
                  Masuk
                </Link>
                <Link
                  href="/daftar"
                  className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-[13px] tracking-wide text-white bg-[#6da003] hover:bg-[#466800] transition-all duration-200 font-bold shadow-xs hover:shadow-sm"
                >
                  Mulai Gratis
                </Link>
              </>
            )}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-[#306a3b] hover:bg-[#ffe9e7] transition focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#fff8f7] border-b border-stone-200/60 px-5 py-4 flex flex-col gap-2.5 shadow-lg animate-in slide-in-from-top-2 duration-200">
            <a
              href="#cara-kerja"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2.5 rounded-xl text-[14px] font-semibold text-[#434937] hover:bg-[#ffe9e7]"
            >
              Cara Kerja
            </a>
            <a
              href="#standar-gizi"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2.5 rounded-xl text-[14px] font-semibold text-[#434937] hover:bg-[#ffe9e7]"
            >
              Standar Gizi
            </a>
            <a
              href="#fitur"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2.5 rounded-xl text-[14px] font-semibold text-[#434937] hover:bg-[#ffe9e7]"
            >
              Fitur
            </a>
            <a
              href="#posyandu-api"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2.5 rounded-xl text-[14px] font-semibold text-[#434937] hover:bg-[#ffe9e7]"
            >
              Posyandu &amp; API
            </a>
            <Link
              href="/tentang"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2.5 rounded-xl text-[14px] font-semibold text-[#434937] hover:bg-[#ffe9e7]"
            >
              Metodologi
            </Link>
            <Link
              href="/panduan"
              onClick={() => setMobileMenuOpen(false)}
              className="px-4 py-2.5 rounded-xl text-[14px] font-semibold text-[#434937] hover:bg-[#ffe9e7]"
            >
              Panduan
            </Link>
            <div className="pt-2 border-t border-stone-200/50 flex flex-col gap-2">
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-3 rounded-xl bg-[#306a3b] text-white text-[14px] font-bold shadow-sm"
                >
                  Buka Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/masuk"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 rounded-xl border border-stone-300 text-[#306a3b] text-[14px] font-bold"
                  >
                    Masuk
                  </Link>
                  <Link
                    href="/daftar"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-3 rounded-xl bg-[#6da003] text-white text-[14px] font-bold shadow-sm"
                  >
                    Daftar Sekarang
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ========================================================= */}
      {/* 2. MAIN BODY CONTAINER */}
      {/* ========================================================= */}
      <main className="w-full pt-20 bg-[#fff8f7] min-h-[calc(100vh-80px)]">
        <div className="flex flex-col w-full">

          {/* ========================================================= */}
          {/* SECTION A: HERO SECTION */}
          {/* ========================================================= */}
          <section className="relative w-full overflow-hidden bg-[#2c1514] text-[#fff8f7] -mt-20 pt-20">
            
            {/* Background Image with Editorial Scrim Overlay */}
            <div
              className="absolute inset-0 w-full h-full bg-cover bg-center opacity-45"
              style={{
                backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCdfEqnUJ_QwvbrRMv5jwnX5W5vYw9JmdVlWamr-EoHmrINh6DVoetmEKm_YYih8YAxhyO5IXr9Cmo489_0lxPOnkazy-orLcwxZn7MfZEe_yNWtn5_qw0kd2cPECW8J4GdW9qpGGNUzPUEApomnOCo_rmQC1W4OUzr5St9RYRVJdbVa8cNocBKWRuU7HwmGbZikpLp70-gWwT1phJ1Eiico4fyaLA_d3xVImJNmA0')",
              }}
            />

            {/* Layered Gradient Scrim */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#2c1514]/95 via-[#2c1514]/85 to-[#306a3b]/70" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#2c1514] via-transparent to-black/30" />

            {/* Hero Content Container */}
            <div className="relative max-w-[1280px] mx-auto px-5 md:px-8 lg:px-12 pt-16 pb-36 md:pt-24 md:pb-44 flex flex-col justify-center min-h-[640px]">
              <div className="max-w-2xl flex flex-col gap-4">
                
                {/* Sub-tagline badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 self-start">
                  <span className="w-2 h-2 rounded-full bg-[#bbf45e]" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-white">
                    Standar Gizi Resmi Kemenkes RI
                  </span>
                </div>

                {/* Headline 3-baris */}
                <h1 className="text-[38px] sm:text-[48px] lg:text-[56px] font-bold text-white tracking-tight leading-[1.1]">
                  Satu Masakan,<br />
                  Porsi Gizi Tiap<br />
                  <span className="text-[#a0d745]">Anggota Keluarga.</span>
                </h1>

                {/* Sub-teks */}
                <p className="text-[16px] sm:text-[18px] text-[#ffe9e7] leading-relaxed max-w-xl">
                  Perencana menu hemat berbasis data resmi AKG Kemenkes &amp; TKPI. Porsi tepat untuk balita, anak, ibu hamil, dewasa, hingga lansia tanpa perlu repot masak terpisah.
                </p>

                {/* Tombol Aksi Utama Hero */}
                <div className="flex flex-wrap items-center gap-3.5 pt-3">
                  <Link
                    href={isLoggedIn ? '/dashboard' : '/daftar'}
                    className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[14px] font-bold text-white bg-[#6da003] hover:bg-[#466800] transition-all duration-200 shadow-xl hover:shadow-2xl active:scale-[0.98]"
                  >
                    <span>{isLoggedIn ? 'Buka Dashboard Saya' : 'Mulai Rencanakan Menu'}</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>

                  <a
                    href="#cara-kerja"
                    className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[14px] font-semibold text-white bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 transition-all duration-200"
                  >
                    <span>Lihat Simulasi Dapur</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </a>
                </div>

                {/* 3 Ikon Kredibilitas */}
                <div className="flex flex-wrap items-center gap-6 pt-4 text-[#fff8f7]">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#bbf45e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-[13px] font-semibold tracking-wide">Verified AKG &amp; TKPI</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#bbf45e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-[13px] font-semibold tracking-wide">Privasi Aman (Non-PII)</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#bbf45e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="text-[13px] font-semibold tracking-wide">Ramah WA &amp; Hemat Kuota</span>
                  </div>
                </div>

              </div>
            </div>
          </section>

          {/* ========================================================= */}
          {/* FLOATING INTERACTIVE BUDGET BAR (Overlapping Hero) */}
          {/* ========================================================= */}
          <div className="relative max-w-[1280px] mx-auto px-5 md:px-8 lg:px-12 -mt-20 md:-mt-24 z-20 w-full">
            <div className="bg-[#306a3b] text-white rounded-3xl p-6 md:p-8 shadow-2xl relative border border-white/10">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 items-center">
                
                {/* 1. BUDGET HARIAN INTERAKTIF */}
                <div className="flex flex-col border-b sm:border-b-0 sm:border-r border-white/15 pb-4 sm:pb-0 pr-0 sm:pr-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-[#ffe9e7] uppercase tracking-wider">
                      BUDGET HARIAN
                    </span>
                    <svg className="w-4 h-4 text-[#bbf45e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[24px] font-bold text-white tracking-tight">
                      Rp {(budgetHarian / 1000).toFixed(0)}rb
                    </span>
                    <div className="flex gap-1 ml-auto">
                      {[35000, 45000, 65000].map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setBudgetHarian(b)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition ${
                            budgetHarian === b
                              ? 'bg-[#bbf45e] text-[#143118]'
                              : 'bg-white/15 text-white hover:bg-white/25'
                          }`}
                        >
                          {b / 1000}k
                        </button>
                      ))}
                    </div>
                  </div>
                  <span className="text-[12px] text-[#ffe2df] mt-0.5">Estimasi Belanja Pasar Tradisional</span>
                </div>

                {/* 2. DURASI MENU */}
                <div className="flex flex-col border-b sm:border-b-0 lg:border-r border-white/15 pb-4 sm:pb-0 pr-0 lg:pr-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-[#ffe9e7] uppercase tracking-wider">
                      DURASI MENU
                    </span>
                    <svg className="w-4 h-4 text-[#bbf45e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-[24px] font-bold text-white tracking-tight">
                    {durasiMenu}
                  </span>
                  <span className="text-[12px] text-[#ffe2df]">Jadwal Rotasi Masak Mingguan</span>
                </div>

                {/* 3. ANGGOTA (>2 THN) */}
                <div className="flex flex-col border-b sm:border-b-0 sm:border-r border-white/15 pb-4 sm:pb-0 pr-0 sm:pr-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-[#ffe9e7] uppercase tracking-wider">
                      ANGGOTA (&gt;2 THN)
                    </span>
                    <svg className="w-4 h-4 text-[#bbf45e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <span className="text-[24px] font-bold text-white tracking-tight">
                    {anggotaList.length} Orang
                  </span>
                  <span className="text-[12px] text-[#ffe2df]">Balita, Dewasa &amp; Lansia</span>
                </div>

                {/* 4. FILTER ALERGI */}
                <div className="flex flex-col border-b sm:border-b-0 pb-4 sm:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-[#ffe9e7] uppercase tracking-wider">
                      FILTER ALERGI
                    </span>
                    <svg className="w-4 h-4 text-[#bbf45e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </div>
                  <span className="text-[24px] font-bold text-white tracking-tight">
                    Bebas Pantangan
                  </span>
                  <span className="text-[12px] text-[#ffe2df]">Tanpa Alergen / Kustomisasi</span>
                </div>

                {/* 5. CTA BUTTON */}
                <div className="flex flex-col justify-center sm:col-span-2 lg:col-span-1">
                  <button
                    type="button"
                    onClick={handleSusunMenu}
                    disabled={isGenerating}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#6da003] hover:bg-[#466800] text-white font-bold text-[14px] py-4 px-6 transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-75 cursor-pointer"
                  >
                    <span>{isGenerating ? 'MENYUSUN...' : 'SUSUN MENU'}</span>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </div>

              </div>

              {/* Tombol bulat panah ke bawah */}
              <a
                aria-label="Gulir ke rincian fitur"
                href="#cara-kerja"
                className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white text-[#306a3b] shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </a>
            </div>
          </div>

          {/* ========================================================= */}
          {/* SECTION B: 3 ZIG-ZAG FEATURE SECTIONS (#cara-kerja) */}
          {/* ========================================================= */}
          <section className="w-full pt-24 md:pt-32 pb-16 flex flex-col" id="cara-kerja">
            
            {/* Row 1: Gizi Per Individu, Cukup Masak Sekali */}
            <div className="w-full bg-[#fff8f7] py-12 md:py-16">
              <div className="max-w-[1280px] mx-auto px-5 md:px-8 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                
                {/* Content Kiri */}
                <div className="lg:col-span-6 flex flex-col gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#b2f2b6] flex items-center justify-center text-[#306a3b]">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  </div>
                  <span className="text-[12px] uppercase tracking-wider text-[#466800] font-bold">
                    1 Masakan Untuk Seluruh Rumah
                  </span>
                  <h2 className="text-[30px] sm:text-[36px] font-bold text-[#2c1514] leading-tight">
                    Gizi Per Individu, Cukup Masak Sekali
                  </h2>
                  <p className="text-[15px] text-[#5e5e5f] leading-relaxed">
                    Satu menu keluarga yang sama, namun porsi dan kecukupan gizinya dihitung spesifik untuk tiap anggota (balita &gt;2 tahun, anak sekolah, ibu hamil, dewasa, hingga lansia). Tanpa kelelahan menyiapkan menu terpisah tiap jam makan.
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/menu"
                      className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-semibold text-[#306a3b] bg-[#ffe9e7] hover:bg-[#b2f2b6] transition-colors"
                    >
                      <span>LIHAT CONTOH PORSI</span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </Link>
                  </div>
                </div>

                {/* Stacked Card Kanan */}
                <div className="lg:col-span-6 relative flex justify-center">
                  <div className="absolute -inset-2 bg-[#ffe9e7] rounded-3xl transform rotate-2" />
                  <div className="relative w-full rounded-3xl overflow-hidden bg-white shadow-xl">
                    <div className="h-80 md:h-96 w-full relative">
                      <img
                        className="w-full h-full object-cover"
                        alt="Indonesian family balanced meal tray containing fresh Sayur Bening Bayam Jagung, grilled fish, tempeh bacem"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuACf4j_Bplu7ZkiKbaOU_Y3i8AnnICKnols0SaXn5NDLxEehiLnT8YTdjgZ8708BvfYsRsvEOSPGyYtTw2epoyqXnt2lCUXiuSAma5tZfIrZz3ft9M96qVUldyzHgu2-G9yWaiY2MFG-sJTTfqCNqIe2ueEZmjNbMPDXxm7QALKrEkDE5mIgQLZXVL6DsrMGtZWaX7mi36R1VZRG8atDIbwPRfNDcdDr-FGMlg0pjg"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    </div>

                    {/* Floating Badge (98% Kecukupan AKG) */}
                    <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl max-w-[210px]">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[12px] font-bold text-[#2c1514]">AKG Terpenuhi</span>
                        <span className="text-[12px] font-bold text-[#466800]">98%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#ffe9e7] overflow-hidden">
                        <div className="h-full bg-[#6da003] w-[98%] rounded-full" />
                      </div>
                      <p className="text-[11px] text-[#5e5e5f] mt-2">Zat Besi, Protein &amp; Zinc terbagi proporsional</p>
                    </div>

                    {/* Bottom Floating Badge */}
                    <div className="p-5 bg-white flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#466800]/10 flex items-center justify-center text-[#466800]">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <span className="text-[13px] text-[#2c1514] font-semibold block">Hitungan Baku Kemenkes</span>
                          <span className="text-[12px] text-[#5e5e5f]">Algoritma non-generatif presisi</span>
                        </div>
                      </div>
                      <Link href="/tentang" className="text-[12px] text-[#466800] font-bold hover:underline">
                        Lihat Cara Hitung
                      </Link>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Row 2: Budget-First dengan Harga Pasar Lokal */}
            <div className="w-full bg-[#ffe9e7] py-12 md:py-16">
              <div className="max-w-[1280px] mx-auto px-5 md:px-8 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                
                {/* Visual Kiri */}
                <div className="lg:col-span-6 order-2 lg:order-1 relative flex justify-center">
                  <div className="absolute -inset-2 bg-[#ffe2df] rounded-3xl transform -rotate-2" />
                  <div className="relative w-full rounded-3xl overflow-hidden bg-white shadow-xl">
                    <div className="h-80 md:h-96 w-full relative">
                      <img
                        className="w-full h-full object-cover"
                        alt="Authentic colorful Indonesian traditional market fresh vegetables, tofu, tempeh"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCtlQJhKo7F1BKPdNHj2amAogvdGpswpkAYZMSd_bK0TwHv517tyWDJ-KqE-KhhsrAz9O3p-Aco8pWotD9SrafRbPRpb5aJtpG2lE3gR7G3kiIrDiacaN2st1xTHEo45nmxW0j_M-wHMcMyZlVqZy7u7TKzSCf05LJZ3jG7hxXjkopXFr9O3A0DyY-htze35emwxsFrzldvkeuodZtZWcgPGbDUaQZH5NgZzv-lI9A"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    </div>

                    {/* Floating Badge Kiri Bawah */}
                    <div className="absolute bottom-6 left-6 right-6 md:right-auto bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#306a3b] text-white flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-[18px] font-bold text-[#2c1514] block leading-tight">Rp 35.000 / Hari</span>
                        <span className="text-[12px] text-[#5e5e5f]">Estimasi Nyata Harga Pasar Tradisional</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content Kanan */}
                <div className="lg:col-span-6 order-1 lg:order-2 flex flex-col gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#b2f2b6] flex items-center justify-center text-[#306a3b]">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <span className="text-[12px] uppercase tracking-wider text-[#466800] font-bold">
                    Rasio Gizi Maksimal vs Kantong Aman
                  </span>
                  <h2 className="text-[30px] sm:text-[36px] font-bold text-[#2c1514] leading-tight">
                    Budget-First dengan Harga Pasar Lokal
                  </h2>
                  <p className="text-[15px] text-[#5e5e5f] leading-relaxed">
                    Masukkan budget harian atau mingguan Ibu, dan sistem menyusun menu terbaik dalam batas tersebut. Harga bahan dapat disesuaikan dengan harga warung &amp; pasar setempat agar belanja dapur tetap terukur tanpa kompromi nutrisi.
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/dompet"
                      className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-semibold text-[#306a3b] bg-white hover:bg-[#fff8f7] transition-colors shadow-sm"
                    >
                      <span>COBA SIMULASI BUDGET</span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                    </Link>
                  </div>
                </div>

              </div>
            </div>

            {/* Row 3: AI Transparan & Tervalidasi Pakar Gizi */}
            <div className="w-full bg-[#fff8f7] py-12 md:py-16" id="standar-gizi">
              <div className="max-w-[1280px] mx-auto px-5 md:px-8 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                
                {/* Content Kiri */}
                <div className="lg:col-span-6 flex flex-col gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#b2f2b6] flex items-center justify-center text-[#306a3b]">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <span className="text-[12px] uppercase tracking-wider text-[#466800] font-bold">
                    Integritas Ilmiah Terbuka
                  </span>
                  <h2 className="text-[30px] sm:text-[36px] font-bold text-[#2c1514] leading-tight">
                    AI Transparan &amp; Tervalidasi Pakar Gizi
                  </h2>
                  <p className="text-[15px] text-[#5e5e5f] leading-relaxed">
                    AI hanya membantu memvariasikan resep dan rotasi menu harian. Perhitungan gramatur dan angka kecukupan nutrisi murni menggunakan rumus baku AKG Kemenkes &amp; TKPI 2017, serta telah dicek langsung oleh Ahli Gizi &amp; Kader Posyandu.
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/tentang"
                      className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-semibold text-[#306a3b] bg-[#ffe9e7] hover:bg-[#b2f2b6] transition-colors"
                    >
                      <span>CEK METODOLOGI</span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </Link>
                  </div>
                </div>

                {/* Visual Kanan */}
                <div className="lg:col-span-6 relative flex justify-center">
                  <div className="absolute -inset-2 bg-[#ffe9e7] rounded-3xl transform rotate-2" />
                  <div className="relative w-full rounded-3xl overflow-hidden bg-white shadow-xl">
                    <div className="h-80 md:h-96 w-full relative">
                      <img
                        className="w-full h-full object-cover"
                        alt="Certified clinical nutritionist reviewing food portion models with health volunteers"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuDw9sMjnF8ZkaXsAowNj0pyioSn4_uOs6tzdt6UFIX3D7516yqFb34vwupny3J_d86D92N57lmNNdrhIaRUtre7QqjeBKwQhcirkTrYYz_VAcyNi73AzDWvVQPbF_DunCWlY_S1CZ_n_m5z4Q91zjIcnyP5Nz4hd8TJdLw17-aK44npbMjRZgSwWx8x6EavXoB-E_Kk9RpNgo1JNDPM15SwngIq0FQKhAxMNIiA_QA"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    </div>

                    {/* Floating Card Kanan Bawah */}
                    <div className="absolute bottom-6 right-6 left-6 md:left-auto bg-[#306a3b] text-white rounded-2xl p-4 shadow-2xl flex items-center gap-3">
                      <svg className="w-6 h-6 text-[#bbf45e] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <span className="text-[13px] font-bold text-white block">Audit Ilmiah Terbuka</span>
                        <span className="text-[11px] text-[#ffe9e7]">Terverifikasi Ahli Gizi &amp; Standar TKPI</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </section>

          {/* ========================================================= */}
          {/* SECTION C: ADVANTAGES BENTO GRID (#fitur) */}
          {/* ========================================================= */}
          <section className="w-full bg-[#fff0ef] py-16 md:py-24" id="fitur">
            <div className="max-w-[1280px] mx-auto px-5 md:px-8 lg:px-12 flex flex-col gap-10">
              
              {/* Section Header */}
              <div className="text-center max-w-2xl mx-auto flex flex-col gap-2">
                <span className="text-[12px] uppercase tracking-wider text-[#466800] font-bold">
                  Ketenangan Pikiran Keluarga
                </span>
                <h2 className="text-[30px] sm:text-[36px] font-bold text-[#2c1514] tracking-tight">
                  Keunggulan &amp; Keamanan Porsi Kita
                </h2>
                <p className="text-[15px] text-[#5e5e5f]">
                  Dirancang dari empati terhadap keseharian orang tua Indonesia yang menginginkan gizi prima tanpa kerumitan teknis.
                </p>
              </div>

              {/* Bento Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Kartu Besar Kiri (cols 7): WhatsApp Share */}
                <div className="lg:col-span-7 bg-white rounded-3xl p-8 md:p-10 shadow-xl flex flex-col justify-between relative overflow-hidden border border-stone-200/50">
                  <div className="flex flex-col gap-4 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#b2f2b6] flex items-center justify-center text-[#306a3b]">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </div>
                      <span className="text-[11px] px-3 py-1 rounded-full bg-[#ffe9e7] text-[#434937] font-semibold">
                        1-Click Share
                      </span>
                    </div>

                    <h3 className="text-[22px] sm:text-[26px] font-bold text-[#2c1514] leading-snug">
                      Ramah Pengguna Awam &amp; Bagikan ke WhatsApp
                    </h3>
                    <p className="text-[15px] text-[#5e5e5f] leading-relaxed max-w-xl">
                      Bahasa sederhana tanpa istilah medis yang membingungkan, ukuran tombol besar, sangat hemat kuota internet, dan daftar belanja mingguan otomatis terkirim rapi ke WhatsApp keluarga dalam satu ketukan.
                    </p>
                  </div>

                  {/* Mockup Mini WA Chat Bubble UI */}
                  <div className="mt-8 pt-6 border-t border-stone-200/60 flex flex-col gap-3 max-w-md">
                    <div className="self-start bg-[#ffe2df]/80 rounded-2xl rounded-tl-sm p-4 text-[#2c1514] text-[13px] shadow-xs">
                      <p className="font-bold text-[#466800] mb-1">Daftar Belanja Porsi Kita (Rabu)</p>
                      <p className="text-[#5e5e5f] leading-relaxed">
                        • 2 ikat Bayam (Rp 4.000)<br />
                        • 1 papan Tempe Segar (Rp 7.000)<br />
                        • 500g Ikan Kembung (Rp 18.000)<br />
                        <strong>Total: Rp 29.000</strong> (Hemat Rp 6.000 dari plafon)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Kolom Kanan (cols 5) */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  
                  {/* Kartu Kanan Atas: Privasi Data Anak */}
                  <div className="bg-white rounded-3xl p-8 shadow-xl flex flex-col gap-3 border border-stone-200/50">
                    <div className="w-11 h-11 rounded-2xl bg-[#b2f2b6] flex items-center justify-center text-[#306a3b]">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <h3 className="text-[20px] font-bold text-[#2c1514]">
                      Privasi &amp; Keamanan Data Anak Proaktif
                    </h3>
                    <p className="text-[14px] text-[#5e5e5f] leading-relaxed">
                      Kami tidak meminta data identitas anak (tanpa nama lengkap, NIK, atau tanggal lahir spesifik). Cukup pilih kelompok usia dan jenis kelamin untuk perhitungan gizi.
                    </p>
                  </div>

                  {/* Row Kanan Bawah: 2 Mini Bento Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6" id="posyandu-api">
                    
                    {/* Mini Card 1: Open API & Posyandu */}
                    <div className="bg-[#ffe9e7] rounded-3xl p-6 shadow-md flex flex-col justify-between gap-3 border border-stone-200/40">
                      <div>
                        <span className="inline-block px-2.5 py-1 rounded-md bg-[#306a3b] text-white text-[11px] font-bold mb-3">
                          API DOKU
                        </span>
                        <h4 className="text-[17px] font-bold text-[#2c1514]">
                          Open API &amp; Posyandu
                        </h4>
                      </div>
                      <p className="text-[13px] text-[#5e5e5f] leading-relaxed">
                        Tersedia endpoint terstandarisasi untuk integrasi dashboard pemantauan gizi kader posyandu &amp; puskesmas.
                      </p>
                    </div>

                    {/* Mini Card 2: Filter Alergi & Usia */}
                    <div className="bg-white rounded-3xl p-6 shadow-md flex flex-col justify-between gap-3 border border-stone-200/50">
                      <div>
                        <div className="w-8 h-8 rounded-xl bg-[#b2f2b6] flex items-center justify-center text-[#306a3b] mb-3">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h4 className="text-[17px] font-bold text-[#2c1514]">
                          Filter Alergi &amp; Usia
                        </h4>
                      </div>
                      <p className="text-[13px] text-[#5e5e5f] leading-relaxed">
                        Proteksi alergen kacang, udang, telur serta batasan khusus anak di atas 2 tahun (non-MPASI).
                      </p>
                    </div>

                  </div>

                </div>

              </div>

            </div>
          </section>

          {/* ========================================================= */}
          {/* SECTION D: 3-CARD SHOWCASE SECTION (Porsi Per Anggota) */}
          {/* ========================================================= */}
          <section className="w-full bg-[#fff8f7] py-16 md:py-24">
            <div className="max-w-[1280px] mx-auto px-5 md:px-8 lg:px-12 flex flex-col gap-10">
              
              {/* Section Header */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex flex-col gap-2 max-w-xl">
                  <span className="text-[12px] uppercase tracking-wider text-[#466800] font-bold">
                    Proporsi Individual Terukur
                  </span>
                  <h2 className="text-[30px] sm:text-[36px] font-bold text-[#2c1514] tracking-tight">
                    Simulasi Pembagian Porsi
                  </h2>
                </div>
                <p className="text-[15px] text-[#5e5e5f] max-w-md">
                  Dari wajan yang sama, piring tiap anggota keluarga mendapatkan takaran gramatur mikro &amp; makronutrien yang tepat sasaran.
                </p>
              </div>

              {/* 3 Kartu Vertikal Berdampingan */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch pt-4">
                
                {/* Kartu 1: Balita & Anak */}
                <div className="bg-white rounded-3xl p-7 shadow-xl flex flex-col justify-between transition-transform duration-200 hover:-translate-y-1 border border-stone-200/50">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="px-3.5 py-1 rounded-full bg-[#ffe9e7] text-[#434937] text-[11px] font-semibold">
                        Usia &gt;2 - 12 Thn
                      </span>
                      <span className="text-[12px] font-bold text-[#306a3b]">0.50 - 0.75 Porsi</span>
                    </div>
                    <div className="h-48 w-full rounded-2xl overflow-hidden relative">
                      <img
                        className="w-full h-full object-cover"
                        alt="Child portion plate with soft steamed rice, tofu cubes, chicken breast and sweet corn"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuC-YhGpAJ2DPtXVF-gwECegSGwR3SHJlfumiqL_WKq24CVArOsCDhnUq-klKgpE-ywrDazyrHOyXXO40j80c9PjKKhVs6N0n4-GRyJhjXS88UcMG8P4OOBDzaFqvISaNAs7UNiSmVcYtBYKVnUN3zQBozd_DsyjyTLoXuLf6XSquoUPSBlohG7kwEHALdi79QiYeAIl4XGB8O1nbxYIGp3xMmFzyA0mpHaTXxpGfxU"
                      />
                    </div>
                    <h3 className="text-[20px] font-bold text-[#2c1514]">Porsi Balita &amp; Anak</h3>
                    <p className="text-[14px] text-[#5e5e5f] leading-relaxed">
                      Fokus pada kepadatan protein hewani &amp; nabati serta zinc untuk dukung masa emas tumbuh kembang optimal (di luar MPASI &lt;2 tahun).
                    </p>
                  </div>
                  <div className="pt-6">
                    <Link
                      href={isLoggedIn ? '/dashboard' : '/daftar'}
                      className="w-full py-3.5 rounded-full bg-[#306a3b] hover:bg-[#25522d] text-white text-[13px] font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <span>LIHAT DETAIL</span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </Link>
                  </div>
                </div>

                {/* Kartu 2: Ibu Hamil & Menyusui (Highlighted Center #306a3b) */}
                <div className="bg-[#306a3b] text-white rounded-3xl p-7 shadow-2xl flex flex-col justify-between transform lg:-translate-y-4 z-10 transition-transform duration-200">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="px-3.5 py-1 rounded-full bg-[#6da003] text-white text-[11px] font-bold">
                        Prioritas Gizi Khusus
                      </span>
                      <span className="text-[12px] font-bold text-[#bbf45e]">1.00 Porsi + Tambahan</span>
                    </div>
                    <div className="h-48 w-full rounded-2xl overflow-hidden relative">
                      <img
                        className="w-full h-full object-cover"
                        alt="Maternal nutrition plate featuring grilled fish rich in omega 3, dark spinach, boiled egg"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuCHuhF52kt3OZ7XNQ70Jv8rL29tzjJt6CfIqfUDG-4Rj16EHEaIx3owKvSQ-n_Nhn9cHYjLYaCKFB6CNc1B467HT53XZ0T58xwvdG48k2V_C4Fk-Kq97ZIalEfsWu2PPkS5aUjj40INye_H6Q8a-VZmlCe-DRASEvQeeCUcirRafsCxYFQOc0CI2EE068EkPXd8vuGTunmcqSDnq6oPFv-hm5FSIezAx3kn_KpuSlE"
                      />
                      <div className="absolute inset-0 bg-[#306a3b]/20" />
                    </div>
                    <h3 className="text-[20px] font-bold text-white">Porsi Ibu Hamil &amp; Menyusui</h3>
                    <p className="text-[14px] text-[#ffe9e7] leading-relaxed">
                      Tambahan kebutuhan zat besi, asam folat, kalsium, dan kalori terukur dari menu masakan yang sama tanpa ribet masak terpisah di dapur.
                    </p>
                  </div>
                  <div className="pt-6">
                    <Link
                      href={isLoggedIn ? '/dashboard' : '/daftar'}
                      className="w-full py-3.5 rounded-full bg-[#6da003] hover:bg-[#466800] text-white text-[13px] font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
                    >
                      <span>LIHAT DETAIL</span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </Link>
                  </div>
                </div>

                {/* Kartu 3: Dewasa & Lansia */}
                <div className="bg-white rounded-3xl p-7 shadow-xl flex flex-col justify-between transition-transform duration-200 hover:-translate-y-1 border border-stone-200/50">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="px-3.5 py-1 rounded-full bg-[#ffe9e7] text-[#434937] text-[11px] font-semibold">
                        Dewasa &amp; Lansia
                      </span>
                      <span className="text-[12px] font-bold text-[#306a3b]">1.00 - 1.25 Porsi</span>
                    </div>
                    <div className="h-48 w-full rounded-2xl overflow-hidden relative">
                      <img
                        className="w-full h-full object-cover"
                        alt="Adult healthy Indonesian plate focusing on fiber, chayote squash, grilled tofu, fresh fish"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBVwI0BbocpSDt44jiTCiuXJ67Fy0qfI1pGm7pjWGQOyJssmmTQ8jlpacgC2faihrZQmEQKXhsfxBenRQyUFSfziBh745IVQC7GqubAeE_TUz71ZD4tP-pxfpUtU4nLbDt_6dTmsZ5EK8ql6wGdWySBkOJPD9qt_-JdQ_fn4NWxBZLDwq0dFTA0Xs1vi1idqIvTLbdXOc_Jyb8dnAKAFk-OM9KQX7cAfYI41OJ8moY"
                      />
                    </div>
                    <h3 className="text-[20px] font-bold text-[#2c1514]">Porsi Dewasa &amp; Lansia</h3>
                    <p className="text-[14px] text-[#5e5e5f] leading-relaxed">
                      Takaran seimbang kaya serat alami, kontrol natrium &amp; gula, serta opsi tekstur ramah kunyah dengan filter alergi keluarga terintegrasi.
                    </p>
                  </div>
                  <div className="pt-6">
                    <Link
                      href={isLoggedIn ? '/dashboard' : '/daftar'}
                      className="w-full py-3.5 rounded-full bg-[#306a3b] hover:bg-[#25522d] text-white text-[13px] font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <span>LIHAT DETAIL</span>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </Link>
                  </div>
                </div>

              </div>

            </div>
          </section>

          {/* ========================================================= */}
          {/* SECTION E: STATS BANNER & MEDICAL DISCLAIMER */}
          {/* ========================================================= */}
          <section className="w-full bg-[#fff8f7] py-16 md:py-24" id="kontak">
            <div className="max-w-[1280px] mx-auto px-5 md:px-8 lg:px-12 flex flex-col">
              
              {/* Banner Gelap Circular Stats (#306a3b) */}
              <div className="w-full bg-[#306a3b] text-white rounded-3xl p-8 md:p-14 shadow-2xl relative overflow-hidden">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6 relative z-10 text-center">
                  
                  {/* 1. Lingkaran 100% */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative w-24 h-24 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path className="text-white/20" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                        <path className="text-[#6da003]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="100, 100" strokeLinecap="round" strokeWidth="3" />
                      </svg>
                      <span className="absolute text-[24px] font-bold text-white">100%</span>
                    </div>
                    <span className="text-[13px] font-semibold text-white max-w-[160px]">
                      Berbasis Data AKG &amp; TKPI
                    </span>
                  </div>

                  {/* 2. Lingkaran 1x */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative w-24 h-24 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path className="text-white/20" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                        <path className="text-[#6da003]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="100, 100" strokeLinecap="round" strokeWidth="3" />
                      </svg>
                      <span className="absolute text-[24px] font-bold text-white">1x</span>
                    </div>
                    <span className="text-[13px] font-semibold text-white max-w-[160px]">
                      Masak Sekali untuk Sekeluarga
                    </span>
                  </div>

                  {/* 3. Lingkaran >2 Thn */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative w-24 h-24 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path className="text-white/20" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                        <path className="text-[#6da003]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="85, 100" strokeLinecap="round" strokeWidth="3" />
                      </svg>
                      <span className="absolute text-[24px] font-bold text-white">&gt;2 Th</span>
                    </div>
                    <span className="text-[13px] font-semibold text-white max-w-[160px]">
                      Batas Aman Usia (Non-MPASI)
                    </span>
                  </div>

                  {/* 4. Lingkaran 0 */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative w-24 h-24 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path className="text-white/20" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                        <path className="text-[#6da003]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="10, 100" strokeLinecap="round" strokeWidth="3" />
                      </svg>
                      <span className="absolute text-[24px] font-bold text-white">0</span>
                    </div>
                    <span className="text-[13px] font-semibold text-white max-w-[160px]">
                      Data Identitas Anak Dikumpulkan
                    </span>
                  </div>

                </div>
              </div>

              {/* Medical Disclaimer Box */}
              <div className="mt-8 bg-[#ffe9e7] rounded-2xl p-6 shadow-xs flex items-start gap-4 border border-stone-200/50">
                <div className="w-8 h-8 rounded-full bg-[#306a3b]/10 flex items-center justify-center text-[#306a3b] shrink-0 mt-0.5">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[12px] text-[#2c1514] font-bold uppercase tracking-wider">
                    Pernyataan Medis &amp; Batasan Produk
                  </span>
                  <p className="text-[13px] text-[#5e5e5f] leading-relaxed">
                    Porsi Kita adalah alat bantu perencanaan menu dan anggaran keluarga sehari-hari, bukan pengganti saran, diagnosis, atau perawatan medis profesional. Saat ini perhitungan porsi dikhususkan untuk anggota keluarga berusia di atas 2 tahun dan belum mencakup aturan MPASI untuk bayi di bawah 2 tahun.
                  </p>
                </div>
              </div>

            </div>
          </section>

          {/* ========================================================= */}
          {/* SECTION F: CALL TO ACTION BANNER (Mulai Perencanaan) */}
          {/* ========================================================= */}
          <section className="w-full bg-gradient-to-br from-[#306a3b] to-[#25522d] text-white py-16 md:py-20">
            <div className="max-w-[1280px] mx-auto px-5 md:px-8 lg:px-12 text-center flex flex-col items-center gap-6">
              <span className="text-[12px] font-bold uppercase tracking-widest text-[#bbf45e] bg-white/10 px-4 py-1.5 rounded-full border border-white/15">
                Mudah, Tepat Gizi &amp; Hemat
              </span>
              <h2 className="text-[32px] sm:text-[42px] font-bold text-white max-w-2xl leading-tight">
                Siap Sajikan Gizi Terbaik untuk Keluarga Tercinta?
              </h2>
              <p className="text-[15px] sm:text-[17px] text-[#ffe9e7] max-w-xl leading-relaxed">
                Bergabunglah bersama keluarga Indonesia yang menghemat anggaran belanja pasar dan mewujudkan generasi sehat bebas stunting.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <Link
                  href={isLoggedIn ? '/dashboard' : '/daftar'}
                  className="rounded-full bg-[#6da003] hover:bg-[#bbf45e] hover:text-[#143118] text-white font-bold text-[15px] px-8 py-4 transition-all duration-200 shadow-xl hover:shadow-2xl active:scale-95"
                >
                  {isLoggedIn ? 'Buka Dashboard Saya' : 'Daftar Akun Keluarga Gratis'}
                </Link>
                <Link
                  href="/menu"
                  className="rounded-full bg-white/15 hover:bg-white/25 text-white font-semibold text-[15px] px-7 py-4 transition-all duration-200 border border-white/20 backdrop-blur-md"
                >
                  Coba Rencana Menu Dulu
                </Link>
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* ========================================================= */}
      {/* 3. FOOTER RESMI PUBLIK (Dengan Logo Resmi) */}
      {/* ========================================================= */}
      <footer className="w-full bg-[#fff0ef] text-[#434937] py-14 shadow-[0_-1px_6px_rgba(0,0,0,0.02)] border-t border-stone-200/60">
        <div className="max-w-[1280px] mx-auto px-5 md:px-8 lg:px-12">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12">
            
            {/* Brand Column (cols 2) */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <Link href="/" className="flex items-center gap-3 focus:outline-none">
                <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shrink-0 bg-white p-1 shadow-xs border border-stone-200/50">
                  <Image
                    src="/logo.png"
                    alt="Logo Porsi Kita"
                    width={40}
                    height={40}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-[20px] uppercase text-[#306a3b] font-bold tracking-tight leading-none">
                    PORSI KITA
                  </span>
                  <span className="text-[11px] text-[#737a65] font-semibold uppercase tracking-wider mt-0.5">
                    Harmoni Domestik
                  </span>
                </div>
              </Link>
              <p className="text-[14px] text-[#434937] max-w-sm leading-relaxed">
                Platform kurasi gizi presisi dan perencanaan porsi keluarga. Mengubah rutinitas nutrisi domestik menjadi ikhtiar sehat yang terukur, penuh rasa, dan berkelanjutan.
              </p>

              {/* Social / Contact Icons */}
              <div className="flex items-center gap-3 pt-1">
                <a
                  aria-label="Instagram"
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-10 h-10 rounded-full bg-[#ffe9e7] flex items-center justify-center text-[#466800] hover:bg-[#6da003] hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </a>
                <a
                  aria-label="Kontak WhatsApp"
                  href="https://wa.me"
                  target="_blank"
                  rel="noreferrer"
                  className="w-10 h-10 rounded-full bg-[#ffe9e7] flex items-center justify-center text-[#466800] hover:bg-[#6da003] hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Col 2: Navigasi Cepat */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[13px] text-[#2c1514] font-bold tracking-wide uppercase">
                Navigasi
              </span>
              <a href="#cara-kerja" className="text-[13px] text-[#434937] hover:text-[#466800] transition-colors">
                Cara Kerja
              </a>
              <a href="#standar-gizi" className="text-[13px] text-[#434937] hover:text-[#466800] transition-colors">
                Standar Gizi
              </a>
              <a href="#fitur" className="text-[13px] text-[#434937] hover:text-[#466800] transition-colors">
                Fitur Unggulan
              </a>
              <Link href="/menu" className="text-[13px] text-[#434937] hover:text-[#466800] transition-colors">
                Katalog Menu 7 Hari
              </Link>
            </div>

            {/* Col 3: Ekosistem */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[13px] text-[#2c1514] font-bold tracking-wide uppercase">
                Ekosistem
              </span>
              <a href="#posyandu-api" className="text-[13px] text-[#434937] hover:text-[#466800] transition-colors">
                Integrasi Posyandu &amp; API
              </a>
              <Link href="/panduan" className="text-[13px] text-[#434937] hover:text-[#466800] transition-colors">
                Pusat Bantuan
              </Link>
              <Link href="/tentang" className="text-[13px] text-[#434937] hover:text-[#466800] transition-colors">
                Metodologi Gizi
              </Link>
              <a href="#kontak" className="text-[13px] text-[#434937] hover:text-[#466800] transition-colors">
                Hubungi Kami
              </a>
            </div>

            {/* Col 4: Legalitas */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[13px] text-[#2c1514] font-bold tracking-wide uppercase">
                Legalitas
              </span>
              <Link href="/privasi" className="text-[13px] text-[#434937] hover:text-[#466800] transition-colors">
                Kebijakan Privasi
              </Link>
              <Link href="/privasi" className="text-[13px] text-[#434937] hover:text-[#466800] transition-colors">
                Syarat &amp; Ketentuan
              </Link>
              <Link href="/tentang" className="text-[13px] text-[#434937] hover:text-[#466800] transition-colors">
                Keamanan Data Gizi
              </Link>
              <Link href="/panduan" className="text-[13px] text-[#434937] hover:text-[#466800] transition-colors">
                Pedoman Klinis
              </Link>
            </div>

          </div>

          {/* Bottom Copyright */}
          <div className="pt-8 border-t border-stone-200/60 flex flex-col md:flex-row items-center justify-between gap-4 text-[13px] text-[#434937]">
            <p>© 2025 Porsi Kita. Hak Cipta Dilindungi Undang-Undang.</p>
            <p className="text-[11px] text-[#737a65]">
              Dirancang untuk ketahanan gizi keluarga &amp; pencegahan stunting nasional berbasis AKG Kemenkes.
            </p>
          </div>

        </div>
      </footer>

    </div>
  );
}
