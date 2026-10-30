'use client';

import React, { useState, useEffect } from 'react';
import BrandLogo from './BrandLogo';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Cek apakah sudah berjalan dalam mode standalone (sudah terpasang)
    const isInStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    setIsStandalone(Boolean(isInStandaloneMode));

    if (isInStandaloneMode) return;

    // 2. Daftarkan Service Worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            // SW berhasil didaftarkan
          })
          .catch((err) => {
            console.warn('[PWA] SW Registration:', err);
          });
      });
    } else if ('serviceWorker' in navigator) {
      // Pada mode dev juga daftarkan agar bisa diuji
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // 3. Deteksi iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // 4. Tangkap event beforeinstallprompt (Android / Chrome / Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Cek apakah user pernah menutup banner dalam 7 hari terakhir
      const dismissedUntil = localStorage.getItem('pwa_banner_dismissed_until');
      if (!dismissedUntil || Date.now() > Number(dismissedUntil)) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 5. Tangkap event appinstalled
    const handleAppInstalled = () => {
      setShowBanner(false);
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    // Simpan penundaan banner selama 7 hari
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem('pwa_banner_dismissed_until', String(Date.now() + sevenDays));
  };

  // Jangan render apa pun jika sudah standalone
  if (isStandalone) return null;

  return (
    <>
      {/* Floating PWA Install Banner */}
      {showBanner && (
        <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-[#0C4B20] text-white p-4 rounded-2xl shadow-xl border border-emerald-700/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="bg-white p-1 rounded-xl shrink-0">
                <BrandLogo size={34} />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold truncate tracking-tight text-white">
                  Pasang Aplikasi Porsi Kita
                </h4>
                <p className="text-xs text-emerald-100 truncate">
                  Akses instan di layar utama & hemat kuota
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleInstallClick}
                className="py-1.5 px-3 rounded-lg text-xs font-bold bg-[#6DAD03] hover:bg-[#5f9702] text-white active:scale-95 transition-all shadow-sm cursor-pointer"
              >
                Pasang
              </button>
              <button
                onClick={handleDismiss}
                className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800/50 transition-colors"
                aria-label="Tutup Banner"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Safari Install Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="bg-white text-[#0D0101] rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-stone-200">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2.5">
                <BrandLogo size={32} />
                <h3 className="font-bold text-base text-[#0D0101]">Pasang di iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1 text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#5F5F5F] mb-4 leading-relaxed">
              Untuk memasang Porsi Kita di layar utama iPhone/iPad Anda:
            </p>

            <ol className="text-xs text-[#0D0101] space-y-3 mb-6 bg-stone-50 p-4 rounded-xl border border-stone-200/60">
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#0C4B20] text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                  1
                </span>
                <span>
                  Ketuk tombol <strong>Bagikan</strong> (ikon kotak dengan panah ke atas) di bilah navigasi Safari.
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#0C4B20] text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                  2
                </span>
                <span>
                  Gulir ke bawah lalu pilih menu <strong>"Tambah ke Layar Utama" (Add to Home Screen)</strong>.
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#0C4B20] text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                  3
                </span>
                <span>
                  Ketuk <strong>Tambah</strong> di sudut kanan atas.
                </span>
              </li>
            </ol>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl font-semibold text-xs text-white bg-[#0C4B20] hover:bg-[#093a19] transition-colors"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
}
