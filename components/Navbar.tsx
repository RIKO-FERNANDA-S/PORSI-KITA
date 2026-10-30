'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import BrandLogo from './BrandLogo';
import { useToast } from './ToastProvider';

export default function Navbar() {
  const pathname = usePathname();
  const { openLogoutModal } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    try {
      const meta = localStorage.getItem('porsi_kita_auth_meta');
      const keluarga = localStorage.getItem('porsi_kita_keluarga');
      setIsLoggedIn(Boolean(meta || keluarga));
    } catch {
      // fallback
    }
  }, [pathname]);

  // Jangan render navbar desktop pada halaman Login dan Beranda Figma murni
  if (pathname === '/' || pathname === '/masuk' || pathname === '/daftar') {
    return null;
  }

  const navLinks = [
    { href: '/', label: 'Beranda' },
    { href: '/menu', label: 'Menu 7 Hari' },
    { href: '/keluarga', label: 'Profil Keluarga' },
    { href: '/tentang', label: 'Metodologi' },
    { href: '/panduan', label: 'Panduan' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-stone-200/80 shadow-xs">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo & Tagline */}
        <Link href="/" className="flex items-center gap-2.5 focus:outline-none">
          <BrandLogo size={36} showAsterisk={false} />
          <div>
            <span className="font-extrabold text-lg tracking-tight text-[#0D0101] block leading-tight">
              Porsi Kita
            </span>
            <span className="text-[10px] text-[#5F5F5F] font-medium hidden sm:block">
              Satu menu, gizi tepat per anggota
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1.5">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-lg text-xs font-[600] transition min-h-[44px] flex items-center ${
                  isActive
                    ? 'bg-emerald-50 text-[#4E7500]'
                    : 'text-[#5F5F5F] hover:text-[#0D0101] hover:bg-stone-50'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Action */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/menu"
            style={{
              background: 'linear-gradient(90deg, #6DA103 0%, #A8E645 100%)',
            }}
            className="inline-flex items-center justify-center px-4 py-2 text-xs font-[700] text-[#0D0101] rounded-[10px] shadow-xs transition min-h-[40px]"
          >
            Buka Dapur
          </Link>
          {isLoggedIn ? (
            <button
              type="button"
              onClick={openLogoutModal}
              className="inline-flex items-center justify-center px-3 py-2 text-xs font-[600] text-rose-700 hover:text-rose-900 hover:bg-rose-50 rounded-xl transition min-h-[40px] cursor-pointer"
            >
              Keluar
            </button>
          ) : (
            <Link
              href="/masuk"
              className="inline-flex items-center justify-center px-3 py-2 text-xs font-[600] text-[#0D0101] hover:bg-stone-100 rounded-xl transition min-h-[40px]"
            >
              Masuk
            </Link>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden w-11 h-11 flex items-center justify-center rounded-xl text-[#0D0101] hover:bg-stone-100 focus:outline-none"
          aria-label="Buka menu navigasi"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white px-4 pt-3 pb-6 space-y-2 shadow-lg animate-fadeIn">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-xl text-sm font-[600] min-h-[44px] flex items-center ${
                  isActive
                    ? 'bg-emerald-50 text-[#4E7500]'
                    : 'text-[#0D0101] hover:bg-stone-50'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="pt-3 border-t border-stone-100 flex flex-col gap-2">
            <Link
              href="/menu"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                background: 'linear-gradient(90deg, #6DA103 0%, #A8E645 100%)',
              }}
              className="w-full py-3 text-center text-sm font-[700] text-[#0D0101] rounded-[10px] min-h-[44px] flex items-center justify-center shadow-xs"
            >
              Buka Dapur Menu
            </Link>
            {isLoggedIn ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openLogoutModal();
                }}
                className="w-full py-3 text-center text-sm font-[700] text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-[10px] min-h-[44px] flex items-center justify-center transition cursor-pointer"
              >
                Keluar Akun
              </button>
            ) : (
              <Link
                href="/masuk"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 text-center text-sm font-[600] text-[#0D0101] hover:bg-stone-50 rounded-[10px] min-h-[44px] flex items-center justify-center border border-stone-200 transition"
              >
                Masuk ke Akun
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
