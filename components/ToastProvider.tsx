'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  id?: string;
  type?: ToastType;
  title?: string;
  message: string;
  duration?: number; // ms
}

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration: number;
  createdAt: number;
  isExiting: boolean;
}

interface ToastContextValue {
  showToast: (options: ToastOptions | string, type?: ToastType) => string;
  showSuccess: (message: string, title?: string, duration?: number) => string;
  showError: (message: string, title?: string, duration?: number) => string;
  showInfo: (message: string, title?: string, duration?: number) => string;
  showWarning: (message: string, title?: string, duration?: number) => string;
  removeToast: (id: string) => void;
  openLogoutModal: () => void;
  closeLogoutModal: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Global event-based helper for non-React or universal callability
export const toast = {
  success: (message: string, title?: string, duration?: number) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('porsi-toast', {
          detail: { type: 'success', message, title, duration },
        })
      );
    }
  },
  error: (message: string, title?: string, duration?: number) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('porsi-toast', {
          detail: { type: 'error', message, title, duration },
        })
      );
    }
  },
  info: (message: string, title?: string, duration?: number) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('porsi-toast', {
          detail: { type: 'info', message, title, duration },
        })
      );
    }
  },
  warning: (message: string, title?: string, duration?: number) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('porsi-toast', {
          detail: { type: 'warning', message, title, duration },
        })
      );
    }
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('porsi-open-logout-modal'));
    }
  },
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback to static helpers if used outside provider
    return {
      showToast: (opts: ToastOptions | string, type?: ToastType) => {
        const msg = typeof opts === 'string' ? opts : opts.message;
        const t = (typeof opts === 'string' ? type : opts.type) || 'info';
        const title = typeof opts === 'object' ? opts.title : undefined;
        if (t === 'success') toast.success(msg, title);
        else if (t === 'error') toast.error(msg, title);
        else if (t === 'warning') toast.warning(msg, title);
        else toast.info(msg, title);
        return 'fallback-id';
      },
      showSuccess: toast.success,
      showError: toast.error,
      showInfo: toast.info,
      showWarning: toast.warning,
      removeToast: () => {},
      openLogoutModal: toast.logout,
      closeLogoutModal: () => {},
    };
  }
  return context;
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  
  // Logout Modal state with exit animation
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isExitingLogoutModal, setIsExitingLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Trigger dismissal with smooth exit animation
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isExiting: true } : item))
    );

    // Wait for exit animation (240ms) then remove from state
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 240);
  }, []);

  const showToast = useCallback(
    (options: ToastOptions | string, defaultType: ToastType = 'info'): string => {
      const id = typeof options === 'object' && options.id ? options.id : `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const message = typeof options === 'string' ? options : options.message;
      const type = (typeof options === 'object' ? options.type : defaultType) || defaultType;
      const title = typeof options === 'object' ? options.title : undefined;
      const duration = typeof options === 'object' && options.duration ? options.duration : (type === 'error' ? 5000 : 4200);

      const newItem: ToastItem = {
        id,
        type,
        title,
        message,
        duration,
        createdAt: Date.now(),
        isExiting: false,
      };

      setToasts((prev) => {
        // Limit max toasts to 4 at a time to prevent screen cluttering
        const filtered = prev.filter((t) => t.id !== id);
        return [...filtered.slice(-3), newItem];
      });

      return id;
    },
    []
  );

  const showSuccess = useCallback((message: string, title?: string, duration?: number) => {
    return showToast({ message, title, type: 'success', duration });
  }, [showToast]);

  const showError = useCallback((message: string, title?: string, duration?: number) => {
    return showToast({ message, title, type: 'error', duration });
  }, [showToast]);

  const showInfo = useCallback((message: string, title?: string, duration?: number) => {
    return showToast({ message, title, type: 'info', duration });
  }, [showToast]);

  const showWarning = useCallback((message: string, title?: string, duration?: number) => {
    return showToast({ message, title, type: 'warning', duration });
  }, [showToast]);

  // Open & Close Logout Modal with animation
  const openLogoutModal = useCallback(() => {
    setIsExitingLogoutModal(false);
    setIsLogoutModalOpen(true);
  }, []);

  const closeLogoutModal = useCallback(() => {
    if (isLoggingOut) return; // Prevent closing while in progress
    setIsExitingLogoutModal(true);
    setTimeout(() => {
      setIsLogoutModalOpen(false);
      setIsExitingLogoutModal(false);
    }, 200);
  }, [isLoggingOut]);

  // Handle actual logout execution
  const handlePerformLogout = async () => {
    setIsLoggingOut(true);

    try {
      // 1. Catat flag auth meta di localStorage jika ada
      try {
        const rawMeta = localStorage.getItem('porsi_kita_auth_meta');
        if (rawMeta) {
          const meta = JSON.parse(rawMeta);
          meta.hasLoggedOutAfterOtp = true;
          localStorage.setItem('porsi_kita_auth_meta', JSON.stringify(meta));
        }
      } catch {
        // fallback
      }

      // 2. Request logout ke backend API
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      
      // 3. Tutup pop-up dengan animasi keluar
      setIsExitingLogoutModal(true);
      setTimeout(() => {
        setIsLogoutModalOpen(false);
        setIsExitingLogoutModal(false);
        setIsLoggingOut(false);
      }, 200);

      // 4. Munculkan alert toast sukses dengan animasi masuk & keluar
      showSuccess(
        'Ibu/Ayah telah berhasil keluar dari akun Porsi Kita. Sampai jumpa kembali!',
        'Berhasil Keluar'
      );

      // 5. Arahkan ke halaman login
      setTimeout(() => {
        router.push('/masuk');
      }, 600);
    } catch (err: any) {
      setIsLoggingOut(false);
      showError(
        'Terjadi kendala saat memproses keluar akun. Silakan coba kembali.',
        'Gagal Keluar'
      );
    }
  };

  // Listen to custom global events
  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ToastOptions>;
      if (customEvent.detail) {
        showToast(customEvent.detail);
      }
    };

    const handleLogoutEvent = () => {
      openLogoutModal();
    };

    window.addEventListener('porsi-toast', handleToastEvent);
    window.addEventListener('porsi-open-logout-modal', handleLogoutEvent);

    return () => {
      window.removeEventListener('porsi-toast', handleToastEvent);
      window.removeEventListener('porsi-open-logout-modal', handleLogoutEvent);
    };
  }, [showToast, openLogoutModal]);

  // Auto-dismiss toasts with individual timers
  useEffect(() => {
    if (toasts.length === 0) return;

    const timers = toasts.map((item) => {
      if (item.isExiting) return null;
      return setTimeout(() => {
        dismissToast(item.id);
      }, item.duration);
    });

    return () => {
      timers.forEach((t) => t && clearTimeout(t));
    };
  }, [toasts, dismissToast]);

  // Handle escape key to close logout modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isLogoutModalOpen && !isLoggingOut) {
        closeLogoutModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLogoutModalOpen, isLoggingOut, closeLogoutModal]);

  return (
    <ToastContext.Provider
      value={{
        showToast,
        showSuccess,
        showError,
        showInfo,
        showWarning,
        removeToast: dismissToast,
        openLogoutModal,
        closeLogoutModal,
      }}
    >
      {children}

      {/* =========================================================================
          TOAST ALERT NOTIFICATION CONTAINER (Floating Top Right / Top Center)
          Memiliki Animasi Masuk (.animate-alertEnter) dan Keluar (.animate-alertExit)
          ========================================================================= */}
      <div
        className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-[99999] pointer-events-none flex flex-col gap-3"
        aria-live="polite"
        role="region"
        aria-label="Pemberitahuan Sistem"
      >
        {toasts.map((item) => {
          const isError = item.type === 'error';
          const isSuccess = item.type === 'success';
          const isWarning = item.type === 'warning';
          const isInfo = item.type === 'info';

          // Visual theme per status type
          let borderColor = 'border-[#85B620]/60';
          let bgColor = 'bg-white';
          let iconBg = 'bg-[#85B620] text-white';
          let titleColor = 'text-[#143118]';
          let progressColor = 'bg-[#85B620]';
          let defaultTitle = 'Informasi';

          if (isSuccess) {
            borderColor = 'border-emerald-500/40';
            bgColor = 'bg-[#f7fbf2]';
            iconBg = 'bg-emerald-600 text-white';
            titleColor = 'text-emerald-950';
            progressColor = 'bg-emerald-500';
            defaultTitle = 'Berhasil';
          } else if (isError) {
            borderColor = 'border-rose-400/50';
            bgColor = 'bg-[#fff5f5]';
            iconBg = 'bg-rose-600 text-white';
            titleColor = 'text-rose-950';
            progressColor = 'bg-rose-500';
            defaultTitle = 'Pemberitahuan Gagal';
          } else if (isWarning) {
            borderColor = 'border-amber-400/50';
            bgColor = 'bg-[#fffdf2]';
            iconBg = 'bg-amber-500 text-white';
            titleColor = 'text-amber-950';
            progressColor = 'bg-amber-500';
            defaultTitle = 'Perhatian';
          } else if (isInfo) {
            borderColor = 'border-sky-400/40';
            bgColor = 'bg-[#f4faff]';
            iconBg = 'bg-sky-600 text-white';
            titleColor = 'text-sky-950';
            progressColor = 'bg-sky-500';
            defaultTitle = 'Informasi Penting';
          }

          return (
            <div
              key={item.id}
              role="alert"
              className={`pointer-events-auto rounded-2xl border-2 shadow-xl p-4 sm:p-4.5 flex items-start gap-3.5 relative overflow-hidden transition-all backdrop-blur-xs ${bgColor} ${borderColor} ${
                item.isExiting ? 'animate-alertExit' : 'animate-alertEnter'
              }`}
            >
              {/* Icon Visual */}
              <div
                className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-sm shadow-xs ${iconBg}`}
              >
                {isSuccess && (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.6}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {isError && (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.6}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                {isWarning && (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
                {isInfo && (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>

              {/* Text Information */}
              <div className="flex-1 min-w-0 pr-1">
                <h4 className={`text-[14px] font-bold leading-tight ${titleColor}`}>
                  {item.title || defaultTitle}
                </h4>
                <p className="text-[13px] text-[#2c1514] font-medium leading-relaxed mt-1 break-words">
                  {item.message}
                </p>
              </div>

              {/* Close Button with generous touch target */}
              <button
                type="button"
                onClick={() => dismissToast(item.id)}
                className="w-8 h-8 -mr-1 -mt-1 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-800 hover:bg-stone-200/60 transition cursor-pointer flex-shrink-0"
                aria-label="Tutup notifikasi"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Subtle Progress Bar Animasi Durasi */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-stone-200/40">
                <div
                  className={`h-full ${progressColor} animate-progress`}
                  style={{ animationDuration: `${item.duration}ms` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* =========================================================================
          POP-UP MODAL KONFIRMASI LOGOUT
          Dengan Animasi Masuk (.animate-scaleIn) dan Keluar (.animate-scaleOut)
          ========================================================================= */}
      {isLogoutModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-modal-title"
          className={`fixed inset-0 z-[99998] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity ${
            isExitingLogoutModal ? 'animate-fadeOut' : 'animate-fadeIn'
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isLoggingOut) {
              closeLogoutModal();
            }
          }}
        >
          <div
            className={`bg-white rounded-3xl p-6 sm:p-7 max-w-sm sm:max-w-md w-full shadow-2xl border border-stone-200/90 flex flex-col gap-5 ${
              isExitingLogoutModal ? 'animate-scaleOut' : 'animate-scaleIn'
            }`}
          >
            {/* Header Modal with Visual Exit Icon */}
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200/70 flex items-center justify-center text-rose-600 flex-shrink-0 shadow-xs">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 id="logout-modal-title" className="text-[18px] sm:text-[19px] font-extrabold text-[#0D0101] leading-tight">
                  Keluar dari Akun Keluarga?
                </h3>
                <p className="text-[12px] text-[#737a65] font-semibold mt-0.5">
                  Porsi Kita • Satu Menu, Gizi Tepat Sekeluarga
                </p>
              </div>
            </div>

            {/* Content Body with clear reassurance for older parents */}
            <div className="bg-[#FAF8F5] p-3.5 sm:p-4 rounded-2xl border border-stone-200/70 text-[13px] sm:text-[14px] text-[#4a403d] leading-relaxed">
              <p>
                Apakah Ibu/Ayah yakin ingin keluar dari akun sekarang?
              </p>
              <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-stone-200/60 text-emerald-800 text-[12px] font-semibold">
                <svg className="w-4 h-4 flex-shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Rencana menu 7 hari dan data keluarga tetap aman tersimpan.</span>
              </div>
            </div>

            {/* Action Buttons: Min 48px Touch Target, Senior Friendly */}
            <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 pt-1">
              <button
                type="button"
                onClick={closeLogoutModal}
                disabled={isLoggingOut}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl border-2 border-stone-200 hover:border-stone-300 hover:bg-stone-100/70 text-[#2c1514] font-bold text-[14px] sm:text-[15px] transition min-h-[48px] flex items-center justify-center cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handlePerformLogout}
                disabled={isLoggingOut}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-bold text-[14px] sm:text-[15px] shadow-md shadow-rose-600/25 transition min-h-[48px] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
              >
                {isLoggingOut ? (
                  <>
                    <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Mengeluarkan...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7" />
                    </svg>
                    <span>Ya, Keluar Akun</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
