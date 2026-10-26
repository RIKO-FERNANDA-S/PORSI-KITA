'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BrandLogo from '../../../components/BrandLogo';
import { createClient } from '../../../lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'masuk' | 'buat-akun'>('masuk');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const supabase = createClient();

      if (activeTab === 'masuk') {
        const { error } = await supabase.auth.signInWithPassword({
          email: identifier.includes('@') ? identifier : `${identifier}@example.com`,
          password,
        });

        if (error) {
          setErrorMsg('Nama pengguna atau kata sandi salah. Periksa lalu coba lagi.');
        } else {
          router.push('/');
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email: identifier.includes('@') ? identifier : `${identifier}@example.com`,
          password,
        });

        if (error) {
          setErrorMsg(error.message);
        } else {
          setSuccessMsg('Pendaftaran berhasil! Silakan masuk ke akun Anda.');
          setActiveTab('masuk');
        }
      }
    } catch {
      // Mode offline / demo fallback
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 xl:gap-24 px-4 sm:px-6 py-8 lg:py-0 selection:bg-[#A5E342]/40">
      {/* Kolom Kiri: Showcase Visual Porsi Kita (Pengganti placeholder "h") */}
      <div className="hidden lg:flex w-full lg:w-1/2 max-w-[500px] xl:max-w-[540px] h-[92vh] max-h-[860px] rounded-[32px] shadow-2xl overflow-hidden relative flex-col justify-between p-8 xl:p-10 text-white bg-[#143118] border border-[#143118]/20">
        
        {/* Layer Background Halus dengan Aksen Hijau Alami */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#143118] via-[#0C4B20] to-[#1a4422] pointer-events-none" />
        
        {/* Pola Grid / Tekstur Lembut Ramah Mata */}
        <div 
          className="absolute inset-0 opacity-[0.07] pointer-events-none" 
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '24px 24px'
          }} 
        />

        {/* Header Kartu Showcase: Brand Logo & Pill Standar Medis */}
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

        {/* Konten Tengah: Narasi Utama & Cuplikan Pembagian Porsi */}
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

          {/* Kartu Cuplikan Simulasi Pembagian Piring */}
          <div className="bg-black/25 rounded-2xl p-4 xl:p-5 border border-white/15 shadow-inner space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
              <span className="font-semibold text-[#A5E342] flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Contoh Pembagian Piring Sehat
              </span>
              <span className="text-[10px] text-white/60">Sayur Bening & Tempe</span>
            </div>

            {/* List Mini Anggota & Porsi */}
            <div className="space-y-2 text-xs">
              {/* Balita */}
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

              {/* Anak SD */}
              <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#6DA003] text-white text-[10px] font-bold flex items-center justify-center">
                    R
                  </span>
                  <div>
                    <span className="font-semibold text-white block leading-tight">Rian (Anak SD 8 th)</span>
                    <span className="text-[10px] text-white/60">Target 1.650 kkal • Fe 10mg</span>
                  </div>
                </div>
                <span className="font-bold text-[#A5E342] text-[12px] tabular-nums">0.75 Porsi</span>
              </div>

              {/* Ibu */}
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

              {/* Ayah */}
              <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#6DA003] text-white text-[10px] font-bold flex items-center justify-center">
                    J
                  </span>
                  <div>
                    <span className="font-semibold text-white block leading-tight">Pak Joko (Ayah 35 th)</span>
                    <span className="text-[10px] text-white/60">Target 2.650 kkal • Fe 9mg</span>
                  </div>
                </div>
                <span className="font-bold text-[#A5E342] text-[12px] tabular-nums">1.25 Porsi</span>
              </div>
            </div>

            {/* Skor Kecukupan */}
            <div className="pt-2 flex items-center justify-between text-[11px] text-white/80 border-t border-white/10">
              <span>Kecukupan Gizi Keluarga:</span>
              <span className="font-bold text-[#A5E342] bg-[#A5E342]/15 px-2 py-0.5 rounded-full border border-[#A5E342]/30">
                98% Terpenuhi
              </span>
            </div>
          </div>
        </div>

        {/* Footer Kartu Showcase: 3 Pilar Kunci */}
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
      <div className="w-full max-w-[400px] flex flex-col items-center">
        {/* Brand Mark with Asterisk */}
        <div className="mb-6">
          <BrandLogo size={52} showAsterisk={true} />
        </div>

        {/* Title */}
        <h1 className="text-[34px] font-[800] text-[#0D0101] tracking-tight text-center leading-tight mb-8">
          Selamat datang
        </h1>

        {/* Segmented Tab (Masuk | Buat Akun) */}
        <div
          role="tablist"
          className="w-full h-[50px] bg-[#E2E0E1] rounded-[14px] p-1.5 flex items-center mb-8"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'masuk'}
            onClick={() => {
              setActiveTab('masuk');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 h-full rounded-xl text-[16px] font-600 transition-all flex items-center justify-center ${
              activeTab === 'masuk'
                ? 'bg-[#FFFFFF] text-[#0D0101] shadow-2xs'
                : 'text-[#5F5F5F] hover:text-[#0D0101]'
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'buat-akun'}
            onClick={() => {
              setActiveTab('buat-akun');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 h-full rounded-[12px] text-[16px] font-[600] transition-all flex items-center justify-center ${
              activeTab === 'buat-akun'
                ? 'bg-[#FFFFFF] text-[#0D0101] shadow-2xs'
                : 'text-[#5F5F5F] hover:text-[#0D0101]'
            }`}
          >
            Buat Akun
          </button>
        </div>

        {/* Subtitle Form */}
        <div className="w-full mb-6 text-left">
          <h2 className="text-[16px] font-[600] text-[#0D0101] leading-tight mb-1">
            {activeTab === 'masuk' ? 'Masuk untuk melanjutkan' : 'Buat akun untuk melanjutkan'}
          </h2>
          <p className="text-[12px] text-[#5F5F5F] leading-relaxed">
            Dapatkan informasi mengenai menu yang sesuai dengan porsi dan kebutuhan keluarga anda.
          </p>
        </div>

        {/* Pesan Error / Sukses */}
        {errorMsg && (
          <div className="w-full p-3 rounded-[12px] bg-rose-50 border border-rose-200 text-rose-800 text-[12px] mb-4">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="w-full p-3 rounded-[12px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-[12px] mb-4">
            {successMsg}
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="w-full space-y-[9px]">
          {/* Kolom 1: Nama Pengguna / Email */}
          <div className="w-full h-[50px] bg-[#E2E0E1] rounded-[14px] px-4 flex items-center gap-3">
            <svg
              className="w-6 h-6 text-[#0D0101] shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Nama pengguna"
              required
              className="w-full bg-transparent text-[12px] text-[#0D0101] placeholder-[#858585] focus:outline-none"
            />
          </div>

          {/* Kolom 2: Kata Sandi */}
          <div className="w-full h-[50px] bg-[#E2E0E1] rounded-[14px] px-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <svg
                className="w-6 h-6 text-[#0D0101] shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kata sandi"
                required
                className="w-full bg-transparent text-[12px] text-[#0D0101] placeholder-[#858585] focus:outline-none"
              />
            </div>

            {/* Tombol Mata Toggle Visibilitas */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-[#0D0101] p-1 focus:outline-none"
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

          {/* Tombol Utama (CTA) dengan gradien --grad-cta & glow --shadow-cta */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              style={{
                background: 'linear-gradient(90deg, #6DA103 0%, #A8E645 100%)',
                boxShadow: '0 0 0 4px rgba(165, 227, 66, .45), 0 8px 14px -4px rgba(141, 196, 37, .35)',
              }}
              className="w-full h-[48px] rounded-[10px] text-[16px] font-[700] text-[#0D0101] flex items-center justify-center transition active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? 'Memproses...' : activeTab === 'masuk' ? 'Masuk' : 'Daftar Sekarang'}
            </button>
          </div>
        </form>

        {/* Tautan Sekunder di Bawah */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setActiveTab(activeTab === 'masuk' ? 'buat-akun' : 'masuk');
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className="text-[12px] font-[600] text-[#4E7500] hover:underline"
          >
            {activeTab === 'masuk'
              ? 'Belum punya akun? Buat sekarang'
              : 'Sudah punya akun? Masuk sekarang'}
          </button>
        </div>

        {/* Demo Fast Track */}
        <div className="mt-8 pt-4 border-t border-[#E2E0E1] w-full text-center">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-[11px] font-[500] text-[#858585] hover:text-[#0D0101] transition"
          >
            Masuk Langsung sebagai Tamu (Mode Demo) →
          </button>
        </div>
      </div>
    </div>
  );
}
