'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getStoredAnggota, getStoredMenu } from '../lib/store';

export type SidebarPath = 'beranda' | 'kalender-menu' | 'dompet' | 'daftar-belanja' | 'pengaturan';

interface SidebarProps {
  activePath: SidebarPath;
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
  anggotaCount?: number;
  rencanaMenuId?: string;
}

export default function Sidebar({
  activePath,
  mobileOpen = false,
  setMobileOpen,
  anggotaCount: propAnggotaCount,
  rencanaMenuId: propRencanaMenuId,
}: SidebarProps) {
  const [internalAnggotaCount, setInternalAnggotaCount] = useState<number>(propAnggotaCount || 4);
  const [menuId, setMenuId] = useState<string>(propRencanaMenuId || '');

  useEffect(() => {
    if (propAnggotaCount === undefined) {
      try {
        const a = getStoredAnggota();
        if (a && a.length > 0) setInternalAnggotaCount(a.length);
      } catch {
        // fallback
      }
    }
    if (!propRencanaMenuId) {
      try {
        const m = getStoredMenu();
        if (m && m.id) setMenuId(m.id);
      } catch {
        // fallback
      }
    }
  }, [propAnggotaCount, propRencanaMenuId]);

  const displayCount = propAnggotaCount ?? internalAnggotaCount;
  const shoppingListHref = menuId ? `/belanja/${menuId}` : '/dashboard#shopping-list-section';

  const closeMobile = () => {
    if (setMobileOpen) setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={closeMobile}
          className="fixed inset-0 bg-black/40 z-50 lg:hidden backdrop-blur-xs transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Main Aside Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-white border-r border-[#c3c9b2]/40 z-50 flex flex-col justify-between py-6 px-4 transition-transform duration-300 shadow-sm ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col gap-6">
          {/* Brand Area */}
          <div className="px-2 flex items-center justify-between">
            <Link href="/" onClick={closeMobile} className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#b2f2b6] flex items-center justify-center text-[#306a3b] shadow-xs">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-[18px] text-[#306a3b] tracking-tight leading-none">
                  PORSI KITA
                </span>
                <span className="text-[11px] text-[#737a65] mt-1 leading-none font-semibold tracking-wider uppercase">
                  Harmoni Domestik
                </span>
              </div>
            </Link>

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={closeMobile}
              className="lg:hidden text-stone-500 hover:text-stone-800 p-1 rounded-lg"
              aria-label="Tutup menu navigasi"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5" aria-label="Menu Utama">
            {/* 1. Beranda */}
            <Link
              href="/dashboard"
              onClick={closeMobile}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-[14px] font-medium transition-all ${
                activePath === 'beranda'
                  ? 'bg-[#b2f2b6] text-[#367041] font-semibold shadow-[0_2px_10px_rgba(12,75,32,0.06)]'
                  : 'text-[#434937] hover:bg-[#ffe9e7] hover:text-[#2c1514]'
              }`}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Beranda</span>
            </Link>

            {/* 2. Kalender Menu */}
            <Link
              href="/menu"
              onClick={closeMobile}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-[14px] font-medium transition-all ${
                activePath === 'kalender-menu'
                  ? 'bg-[#b2f2b6] text-[#367041] font-semibold shadow-[0_2px_10px_rgba(12,75,32,0.06)]'
                  : 'text-[#434937] hover:bg-[#ffe9e7] hover:text-[#2c1514]'
              }`}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Kalender Menu</span>
            </Link>

            {/* 3. Dompet Bulanan (Diperbarui dari Buku Kas) */}
            <Link
              href="/dompet"
              onClick={closeMobile}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-[14px] font-medium transition-all ${
                activePath === 'dompet'
                  ? 'bg-[#b2f2b6] text-[#367041] font-semibold shadow-[0_2px_10px_rgba(12,75,32,0.06)]'
                  : 'text-[#434937] hover:bg-[#ffe9e7] hover:text-[#2c1514]'
              }`}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span>Dompet Bulanan</span>
            </Link>

            {/* 4. Daftar Belanja */}
            <Link
              href={shoppingListHref}
              onClick={closeMobile}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-[14px] font-medium transition-all ${
                activePath === 'daftar-belanja'
                  ? 'bg-[#b2f2b6] text-[#367041] font-semibold shadow-[0_2px_10px_rgba(12,75,32,0.06)]'
                  : 'text-[#434937] hover:bg-[#ffe9e7] hover:text-[#2c1514]'
              }`}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>Daftar Belanja</span>
            </Link>

            {/* 5. Pengaturan */}
            <Link
              href="/keluarga"
              onClick={closeMobile}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-[14px] font-medium transition-all ${
                activePath === 'pengaturan'
                  ? 'bg-[#b2f2b6] text-[#367041] font-semibold shadow-[0_2px_10px_rgba(12,75,32,0.06)]'
                  : 'text-[#434937] hover:bg-[#ffe9e7] hover:text-[#2c1514]'
              }`}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Pengaturan</span>
            </Link>
          </nav>
        </div>

        {/* Sidebar Footer Info */}
        <div className="flex flex-col gap-2 pt-4">
          <div className="p-3.5 rounded-2xl bg-[#fff0ef] flex items-center justify-between border border-stone-200/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#466800]/10 flex items-center justify-center text-[#466800]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-[#737a65] font-semibold uppercase tracking-wider">
                  Paket Keluarga
                </span>
                <span className="text-[13px] font-bold text-[#2c1514]">
                  {displayCount} Anggota Aktif
                </span>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-[#466800]" title="Sinkronisasi Aktif" />
          </div>

          <Link
            href="/"
            onClick={closeMobile}
            className="text-[12px] text-center text-[#737a65] hover:text-[#306a3b] py-1 font-medium transition"
          >
            ← Halaman Utama
          </Link>
        </div>
      </aside>
    </>
  );
}
