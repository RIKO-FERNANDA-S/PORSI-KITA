'use client';

import React from 'react';
import Link from 'next/link';
import BrandLogo from '../../components/BrandLogo';

export default function OfflinePage() {
  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center px-4 py-12 text-[#0D0101]">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-stone-200/90 shadow-sm text-center">
        {/* Brand Logo & Offline Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <BrandLogo size={72} />
            <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-1.5 shadow-md border-2 border-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 4.243a9 9 0 01-2.828-6.364m0 0a9 9 0 012.828-6.364m0 0L3 3m5.464 5.464a5 5 0 017.072 0"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Heading & Info */}
        <h1 className="text-xl font-bold tracking-tight text-[#0D0101] mb-2">
          Koneksi Terputus (Mode Offline)
        </h1>
        <p className="text-sm text-[#5F5F5F] leading-relaxed mb-6">
          Perangkat Anda sedang tidak terhubung ke jaringan internet. Menu dan daftar belanja yang pernah Anda buka sebelumnya tetap tersimpan aman di memori HP Anda.
        </p>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleReload}
            className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-[#0C4B20] hover:bg-[#093a19] active:scale-[0.98] transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Muat Ulang Halaman
          </button>

          <Link
            href="/"
            className="w-full block py-2.5 px-4 rounded-xl font-medium text-sm text-[#0C4B20] bg-emerald-50 hover:bg-emerald-100 transition-colors"
          >
            Kembali ke Beranda
          </Link>
        </div>

        {/* Helpful Tip */}
        <div className="mt-6 pt-5 border-t border-stone-100 text-left">
          <div className="flex items-start gap-2.5 text-xs text-[#5F5F5F]">
            <span className="text-base leading-none">💡</span>
            <span>
              <strong>Tips Belanja di Pasar:</strong> Buka halaman daftar belanja sebelum berangkat ke pasar agar data tersimpan otomatis di perangkat saat sinyal lemah.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
