'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import BrandLogo from '../../../components/BrandLogo';

function VerifikasiOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const phoneParam = searchParams.get('phone') || '';
  const namaParam = searchParams.get('nama') || '';
  const modeParam = searchParams.get('mode') || 'register'; // 'register' | 'login_unverified' | 'forgot_password'

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Khusus Mode 'forgot_password': State untuk input kata sandi baru setelah OTP valid
  const [isOtpVerifiedForReset, setIsOtpVerifiedForReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer hitung mundur kirim ulang OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Focus input pertama saat mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index: number, value: string) => {
    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal && value !== '') return;

    const newOtp = [...otp];

    if (cleanVal.length > 1) {
      // Menangani jika user melakukan paste 6 digit langsung
      const digits = cleanVal.slice(0, 6).split('');
      for (let i = 0; i < digits.length; i++) {
        if (i < 6) newOtp[i] = digits[i];
      }
      setOtp(newOtp);
      const nextIndex = Math.min(digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    newOtp[index] = cleanVal;
    setOtp(newOtp);

    // Auto-focus ke digit berikutnya
    if (cleanVal && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // 1. Verifikasi Kode OTP
  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const token = otp.join('');
    if (token.length < 6) {
      setErrorMsg('Masukkan lengkap 6 digit kode OTP yang dikirim ke WhatsApp Anda.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneParam,
          token,
          nama: namaParam,
          mode: modeParam,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Verifikasi kode OTP gagal.');
        setLoading(false);
        return;
      }

      // Khusus Mode Lupa Sandi: Buka form pembuatan kata sandi baru
      if (modeParam === 'forgot_password') {
        setIsOtpVerifiedForReset(true);
        setSuccessMsg('Kode OTP terverifikasi! Silakan tentukan kata sandi baru akun Anda.');
        setLoading(false);
        return;
      }

      setSuccessMsg('Verifikasi berhasil! Mengalihkan...');

      // Simpan status verifikasi di localStorage
      if (typeof window !== 'undefined') {
        const authMeta = {
          phone: phoneParam,
          nama: data.user?.alias || namaParam || 'Ibu Pengguna',
          verifiedAt: data.user?.createdAt ? new Date(data.user.createdAt).getTime() : Date.now(),
          hasPassword: Boolean(data.user?.hasPassword),
        };
        localStorage.setItem('porsi_kita_auth_meta', JSON.stringify(authMeta));
      }

      // Aturan Navigasi:
      // 1. Jika pendaftar baru (mode register) -> Langsung arahkan ke /lengkapi-profil (onboarding) TANPA password
      // 2. Jika user login tanpa sandi (login_unverified) -> Langsung arahkan ke /dashboard
      setTimeout(() => {
        if (modeParam === 'register') {
          router.push('/lengkapi-profil');
        } else {
          router.push('/dashboard');
        }
      }, 1000);
    } catch {
      setErrorMsg('Gagal menghubungkan ke server autentikasi.');
      setLoading(false);
    }
  };

  // 2. Simpan Kata Sandi Baru (Khusus Mode Lupa Sandi)
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword.length < 6) {
      setErrorMsg('Kata sandi baru minimal 6 karakter demi keamanan akun.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Ulangi kata sandi baru tidak cocok.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneParam,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal menyimpan kata sandi baru.');
        setLoading(false);
        return;
      }

      setSuccessMsg('Kata sandi berhasil diperbarui! Mengalihkan ke dashboard...');

      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'porsi_kita_auth_meta',
          JSON.stringify({
            phone: phoneParam,
            hasPassword: true,
            verifiedAt: Date.now(),
          })
        );
      }

      setTimeout(() => {
        router.push('/dashboard');
      }, 1200);
    } catch {
      setErrorMsg('Terjadi kendala saat menyimpan kata sandi.');
      setLoading(false);
    }
  };

  // 3. Kirim Ulang OTP
  const handleResendOtp = async () => {
    if (!canResend) return;
    setCanResend(false);
    setCountdown(60);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneParam,
          nama: namaParam,
          mode: modeParam,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal mengirim ulang OTP.');
      } else {
        setSuccessMsg('Kode OTP baru telah dikirimkan ke WhatsApp Anda.');
      }
    } catch {
      setErrorMsg('Koneksi bermasalah saat mengirim ulang OTP.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] flex flex-col items-center justify-center px-4 sm:px-6 py-8">
      {/* Brand Header */}
      <div className="mb-6 flex flex-col items-center">
        <BrandLogo size={52} showAsterisk={true} />
        <span className="text-[11px] font-bold tracking-widest text-[#0C4B20] uppercase mt-2">
          Porsi Kita • Gizi Tepat Sekeluarga
        </span>
      </div>

      <div className="w-full max-w-[420px] bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#E2E0E1] flex flex-col items-center">
        
        {/* Header Icon */}
        <div className="w-14 h-14 rounded-2xl bg-[#EAF5D8] flex items-center justify-center text-[#0C4B20] mb-4 shadow-2xs">
          {isOtpVerifiedForReset ? (
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          ) : (
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          )}
        </div>

        <h1 className="text-2xl font-bold text-[#0D0101] tracking-tight text-center">
          {isOtpVerifiedForReset ? 'Buat Kata Sandi Baru' : 'Verifikasi Kode OTP'}
        </h1>

        <p className="text-[13px] text-[#5F5F5F] text-center mt-1.5 leading-relaxed">
          {isOtpVerifiedForReset
            ? 'Buat kata sandi baru untuk mengamankan akun keluarga Ibu saat masuk berikutnya.'
            : 'Kode 6 digit telah dikirim melalui pesan WhatsApp ke nomor:'}
        </p>

        {!isOtpVerifiedForReset && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#F2F9EC] text-[#0C4B20] text-xs font-bold border border-[#6DA003]/20">
            <svg className="w-3.5 h-3.5 text-[#6DA003]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span>{phoneParam || '+62 812-xxxx-xxxx'}</span>
          </div>
        )}

        {/* Feedback Alert dengan Animasi Masuk */}
        {errorMsg && (
          <div className="w-full mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[12px] flex items-center gap-2 animate-alertEnter">
            <svg className="w-4 h-4 shrink-0 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="w-full mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[12px] flex items-center gap-2 animate-alertEnter">
            <svg className="w-4 h-4 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>{successMsg}</span>
          </div>
        )}

        {/* STEP 1: FORM 6 DIGIT OTP */}
        {!isOtpVerifiedForReset ? (
          <>
            <form onSubmit={handleVerify} className="w-full mt-6">
              <div className="flex items-center justify-between gap-2 sm:gap-2.5">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-14 sm:w-13 sm:h-15 text-center text-xl sm:text-2xl font-bold bg-[#FAFAFA] border border-[#E2E0E1] rounded-2xl text-[#0D0101] focus:outline-none focus:ring-2 focus:ring-[#0C4B20] focus:border-transparent transition-all shadow-2xs"
                  />
                ))}
              </div>

              {/* Submit Button (Min 48px) */}
              <div className="mt-6">
                <button
                  type="submit"
                  disabled={loading || otp.join('').length < 6}
                  style={{
                    background: 'linear-gradient(90deg, #6DA003 0%, #82BD03 100%)',
                    boxShadow: '0 4px 12px rgba(109, 160, 3, 0.25)',
                  }}
                  className="w-full min-h-[48px] rounded-xl text-[15px] font-bold text-white flex items-center justify-center transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Memverifikasi...</span>
                    </div>
                  ) : (
                    'Verifikasi & Lanjutkan'
                  )}
                </button>
              </div>
            </form>

            {/* Kirim Ulang OTP */}
            <div className="mt-5 text-center">
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="text-[13px] font-bold text-[#0C4B20] hover:underline cursor-pointer"
                >
                  Kirim Ulang Kode OTP ke WhatsApp
                </button>
              ) : (
                <span className="text-[12px] text-[#5F5F5F]">
                  Kirim ulang kode dalam <strong className="text-[#0D0101]">{countdown}s</strong>
                </span>
              )}
            </div>
          </>
        ) : (
          /* STEP 2 (KHUSUS MODE FORGOT_PASSWORD): FORM RESET KATA SANDI */
          <form onSubmit={handleResetPasswordSubmit} className="w-full mt-6 space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-[#0D0101] mb-1">
                Kata Sandi Baru
              </label>
              <div className="w-full min-h-[50px] bg-[#E2E0E1] rounded-[14px] px-4 flex items-center justify-between border border-transparent focus-within:border-[#0C4B20] focus-within:bg-white">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  required
                  className="w-full bg-transparent text-[14px] text-[#0D0101] placeholder-[#858585] focus:outline-none font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-stone-600 p-1 hover:text-[#0D0101]"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0D0101] mb-1">
                Ulangi Kata Sandi Baru
              </label>
              <div className="w-full min-h-[50px] bg-[#E2E0E1] rounded-[14px] px-4 flex items-center border border-transparent focus-within:border-[#0C4B20] focus-within:bg-white">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi baru"
                  required
                  className="w-full bg-transparent text-[14px] text-[#0D0101] placeholder-[#858585] focus:outline-none font-medium"
                />
              </div>
            </div>

            {/* Tombol Simpan Kata Sandi (Min 48px) */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                style={{
                  background: 'linear-gradient(90deg, #6DA003 0%, #82BD03 100%)',
                  boxShadow: '0 4px 12px rgba(109, 160, 3, 0.25)',
                }}
                className="w-full min-h-[48px] rounded-xl text-[15px] font-bold text-white flex items-center justify-center transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Menyimpan Sandi...' : 'Simpan Kata Sandi & Masuk'}
              </button>
            </div>
          </form>
        )}

        {/* Kembali ke halaman sebelumnya */}
        <div className="mt-6 pt-4 border-t border-[#E2E0E1] w-full text-center">
          <Link
            href="/masuk"
            className="text-[12px] text-[#5F5F5F] hover:text-[#0D0101] font-semibold"
          >
            ← Kembali ke halaman masuk
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifikasiOtpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center text-sm text-stone-500">Memuat verifikasi...</div>}>
      <VerifikasiOtpContent />
    </Suspense>
  );
}
