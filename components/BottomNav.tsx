'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { getStoredKeluarga, getStoredAnggota, saveStoredMenu } from '../lib/store';
import { generateMenu } from '../lib/planner/generate';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);

  // Nav items sesuai SKILL.md dan desain Figma
  const navItems = [
    {
      label: 'Beranda',
      href: '/',
      icon: (active: boolean) => (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={active ? 2.2 : 1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      label: 'Dapur',
      href: '/menu',
      icon: (active: boolean) => (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={active ? 2.2 : 1.8}
        >
          {/* Sendok & Garpu outline */}
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4v16m-4-16v6a2 2 0 002 2h0m-4-8h4m6 0a3 3 0 013 3v2a2 2 0 01-2 2h-1v9"
          />
        </svg>
      ),
    },
    // Tengah kosong untuk FAB Scan
    {
      label: 'Catatan',
      href: '/panduan',
      icon: (active: boolean) => (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={active ? 2.2 : 1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      label: 'Profil',
      href: '/keluarga',
      icon: (active: boolean) => (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={active ? 2.2 : 1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
    },
  ];

  // Aksi FAB Scan Tengah (PRD & SKILL.md: FAB Scan memicu generator menu instan / perencana)
  const handleFabClick = () => {
    setIsScanning(true);
    const k = getStoredKeluarga();
    const a = getStoredAnggota();
    const fresh = generateMenu({
      familyId: k.id,
      familyName: k.alias,
      budgetHarianRp: k.budget_harian_rp,
      anggota: a,
      seed: Date.now(),
    });
    saveStoredMenu(fresh);
    setTimeout(() => {
      setIsScanning(false);
      router.push('/menu');
    }, 400);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none px-3">
      <div className="w-full max-w-[430px] pointer-events-auto relative">
        {/* Floating Action Button (FAB) Scan di Tengah (±80px di mobile, 68px di desktop) */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-7 md:-top-6 z-20">
          <button
            type="button"
            onClick={handleFabClick}
            className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-[#0D0101] text-[#FAFAFA] flex items-center justify-center shadow-xl active:scale-95 transition-transform border-[3px] border-[#FAFAFA] focus:outline-none"
            title="Scan / Rencanakan Menu Cepat"
            aria-label="Pindai Menu"
          >
            {isScanning ? (
              <span className="text-xs font-bold animate-pulse">Menyusun...</span>
            ) : (
              <svg
                className="w-7 h-7 sm:w-8 sm:h-8 text-[#FAFAFA]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                {/* Frame scan corner brackets + center bar */}
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V5a1 1 0 011-1h3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 4h3a1 1 0 011 1v3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v3a1 1 0 001 1h3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 20h3a1 1 0 001-1v-3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 12h10" />
              </svg>
            )}
          </button>
        </div>

        {/* Forest Green Navigation Bar (Height ±84px di mobile, dock mengambang di desktop) */}
        <div className="bg-[#0C4B20] text-[#FAFAFA] h-[80px] sm:h-[84px] pb-3 sm:pb-4 md:pb-0 px-6 sm:px-8 flex items-center justify-between rounded-t-3xl md:rounded-2xl md:mb-3 shadow-2xl border-t border-white/10 md:border">
          {/* Sisi Kiri: Beranda & Dapur */}
          <div className="flex items-center gap-5 sm:gap-7">
            {navItems.slice(0, 2).map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex flex-col items-center justify-center min-w-[48px] sm:min-w-[52px] min-h-[44px] transition ${
                    active ? 'text-[#FAFAFA] opacity-100 font-semibold scale-105' : 'text-[#FAFAFA] opacity-70 hover:opacity-100'
                  }`}
                >
                  {item.icon(active)}
                  <span className="text-[10px] mt-1 font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Sisi Kanan: Catatan & Profil */}
          <div className="flex items-center gap-5 sm:gap-7">
            {navItems.slice(2, 4).map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex flex-col items-center justify-center min-w-[48px] sm:min-w-[52px] min-h-[44px] transition ${
                    active ? 'text-[#FAFAFA] opacity-100 font-semibold scale-105' : 'text-[#FAFAFA] opacity-70 hover:opacity-100'
                  }`}
                >
                  {item.icon(active)}
                  <span className="text-[10px] mt-1 font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
