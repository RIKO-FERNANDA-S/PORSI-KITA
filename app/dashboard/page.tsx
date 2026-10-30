'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Sidebar from '../../components/Sidebar';
import { toast } from '../../components/ToastProvider';
import { getStoredKeluarga, getStoredAnggota, getStoredMenu } from '../../lib/store';
import { buatDaftarBelanjaMingguan } from '../../lib/planner/cost';
import { RencanaMenu7Hari, MenuHari } from '../../lib/types';

interface ShoppingItem {
  id: string;
  name: string;
  price: number;
  checked: boolean;
}

export default function DashboardPage() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(1);
  
  // Profil & Keluarga Database State
  const [userProfileName, setUserProfileName] = useState('Keluarga Kita');
  const [wilayahName, setWilayahName] = useState('Pasar Tradisional');
  const [membersCount, setMembersCount] = useState(0);
  const [membersList, setMembersList] = useState<any[]>([]);
  const [userPhone, setUserPhone] = useState('');

  // Keuangan & Budget Database State
  const [saldo, setSaldo] = useState(3000000);
  const [totalAnggaran, setTotalAnggaran] = useState(3000000);
  const [pengeluaran, setPengeluaran] = useState(0);
  const [budgetBelanja, setBudgetBelanja] = useState(3000000);
  const [tipeBudget, setTipeBudget] = useState<'bulanan' | 'mingguan'>('bulanan');
  const [loadingBudget, setLoadingBudget] = useState(true);

  // Rencana Menu Aktif
  const [rencanaMenu, setRencanaMenu] = useState<RencanaMenu7Hari | null>(null);

  // Modal Atur Budget Belanja State
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [inputBudgetNominal, setInputBudgetNominal] = useState('3.000.000');
  const [inputTipeBudget, setInputTipeBudget] = useState<'bulanan' | 'mingguan'>('bulanan');
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [budgetFeedback, setBudgetFeedback] = useState({ type: '', msg: '' });
  
  // Shopping list state
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [copiedWa, setCopiedWa] = useState(false);

  // Modal / Recipe detail state
  const [selectedRecipe, setSelectedRecipe] = useState<{
    title: string;
    session: string;
    cost: string;
    tags: string[];
    portionDetail: string;
    dishes?: any[];
  } | null>(null);

  // Modal catat pengeluaran state
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseNote, setExpenseNote] = useState('');

  // 24-Hour Security Check States
  const [hasPassword, setHasPassword] = useState<boolean>(true);
  const [hasWarningBadge, setHasWarningBadge] = useState<boolean>(false);
  const [showSecurityModal, setShowSecurityModal] = useState<boolean>(false);
  const [isOver24Hours, setIsOver24Hours] = useState<boolean>(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    // 0. Sinkronisasi realtime hari dan tanggal lokal pengguna
    const now = new Date();
    setCurrentDate(now);
    setSelectedDayIndex(1); // 1 = Hari Ini (paling kiri, selaras dengan app/menu/page.tsx)

    // 1. Inisialisasi awal cepat dari Local Storage
    try {
      const storedKeluarga = getStoredKeluarga();
      const storedAnggota = getStoredAnggota();
      const storedMenu = getStoredMenu();

      if (storedKeluarga?.alias) setUserProfileName(storedKeluarga.alias);
      if (storedKeluarga?.wilayah) setWilayahName(storedKeluarga.wilayah);
      if (storedAnggota && storedAnggota.length > 0) {
        setMembersCount(storedAnggota.length);
        setMembersList(storedAnggota);
      }
      if (storedMenu) {
        setRencanaMenu(storedMenu);
        // Buat daftar belanja bahan dari menu aktif
        if (storedMenu.hari && storedMenu.hari.length > 0) {
          const rawItems = buatDaftarBelanjaMingguan(storedMenu.hari);
          const initialItems: ShoppingItem[] = rawItems.slice(0, 8).map((it, idx) => ({
            id: `item-${idx + 1}`,
            name: `${it.nama_bahan} (${it.kebutuhan_beli_gram >= 1000 ? `${(it.kebutuhan_beli_gram / 1000).toFixed(1)} kg` : `${it.kebutuhan_beli_gram}g`})`,
            price: it.estimasi_biaya_rp,
            checked: idx < 2,
          }));
          setShoppingList(initialItems);
        }
      }
    } catch (e) {
      console.warn('Inisialisasi lokal fallback notice:', e);
    }

    // Sinkronisasi menu aktif dari Database PostgreSQL (agar selalu up-to-date)
    fetch('/api/menu')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.menu) {
          setRencanaMenu(data.menu);
          try {
            localStorage.setItem('porsi_kita_rencana_menu_7hari', JSON.stringify(data.menu));
          } catch {}
          if (data.menu.hari && data.menu.hari.length > 0) {
            const rawItems = buatDaftarBelanjaMingguan(data.menu.hari);
            const initialItems: ShoppingItem[] = rawItems.slice(0, 8).map((it, idx) => ({
              id: `item-${idx + 1}`,
              name: `${it.nama_bahan} (${it.kebutuhan_beli_gram >= 1000 ? `${(it.kebutuhan_beli_gram / 1000).toFixed(1)} kg` : `${it.kebutuhan_beli_gram}g`})`,
              price: it.estimasi_biaya_rp,
              checked: idx < 2,
            }));
            setShoppingList(initialItems);
          }
        }
      })
      .catch((err) => console.warn('Gagal sinkronisasi menu dari database di dashboard:', err));

    // 2. Sinkronisasi data real-time dengan Database PostgreSQL
    const checkSecurityStatus = async () => {
      let meta: any = null;
      try {
        const raw = localStorage.getItem('porsi_kita_auth_meta');
        if (raw) meta = JSON.parse(raw);
      } catch {
        // fallback
      }

      if (meta?.nama) {
        setUserProfileName(meta.nama);
      }
      if (meta?.phone) {
        setUserPhone(meta.phone);
      }

      // Fetch data budget, nama profil keluarga, wilayah, dan anggota dari database
      const fetchBudgetFromDb = async (phoneToUse?: string) => {
        try {
          const query = phoneToUse ? `?phone=${encodeURIComponent(phoneToUse)}` : '';
          const res = await fetch(`/api/family/budget${query}`);
          const bData = await res.json();

          if (bData.success) {
            if (bData.alias) setUserProfileName(bData.alias);
            if (bData.wilayah) setWilayahName(bData.wilayah);
            if (bData.members_count !== undefined) setMembersCount(bData.members_count);
            if (bData.members && bData.members.length > 0) setMembersList(bData.members);

            setBudgetBelanja(bData.budget_belanja);
            setTipeBudget(bData.tipe_budget || 'bulanan');
            setTotalAnggaran(bData.total_anggaran);
            setPengeluaran(bData.pengeluaran);
            setSaldo(bData.saldo);
            setInputBudgetNominal(Number(bData.budget_belanja).toLocaleString('id-ID'));
            setInputTipeBudget(bData.tipe_budget || 'bulanan');
          }
        } catch (bErr) {
          console.warn('Gagal memuat budget dari database:', bErr);
        } finally {
          setLoadingBudget(false);
        }
      };

      try {
        const res = await fetch('/api/auth/check-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: meta?.phone || '' }),
        });
        const data = await res.json();

        if (data.exists) {
          if (data.alias) setUserProfileName(data.alias);
          if (data.phone) setUserPhone(data.phone);

          // Panggil budget dengan nomor telepon yang terverifikasi
          await fetchBudgetFromDb(data.phone || meta?.phone);

          if (!data.hasPassword) {
            setHasPassword(false);
            setHasWarningBadge(true);

            const ageHours = data.ageInHours ?? 0;
            // Kondisi B: umur akun >= 24 jam ATAU user pernah logout setelah OTP
            const requiresStrictPassword = ageHours >= 24 || meta?.hasLoggedOutAfterOtp === true;

            if (requiresStrictPassword) {
              setIsOver24Hours(true);
              setShowSecurityModal(true); // Pop-up otomatis muncul di dashboard
            } else {
              setIsOver24Hours(false);
              setShowSecurityModal(false); // Kondisi A: Tidak menghalangi layar, hanya badge di header
            }
          } else {
            setHasPassword(true);
            setHasWarningBadge(false);
            setShowSecurityModal(false);
          }
          return;
        }
      } catch (err) {
        console.warn('Check security status error:', err);
      }

      // Fallback jika check-status tidak mengembalikan exists
      await fetchBudgetFromDb(meta?.phone);

      // Fallback lokal jika backend tidak terjangkau
      if (meta && !meta.hasPassword) {
        setHasPassword(false);
        setHasWarningBadge(true);
        const elapsed = Date.now() - (meta.verifiedAt || Date.now());
        const ageHours = elapsed / (1000 * 60 * 60);
        if (ageHours >= 24 || meta.hasLoggedOutAfterOtp === true) {
          setIsOver24Hours(true);
          setShowSecurityModal(true);
        }
      }
    };

    checkSecurityStatus();
  }, []);

  // Format pembagian porsi keluarga dari data anggota database
  const getDynamicPortionString = (porsiList?: any[]) => {
    if (porsiList && porsiList.length > 0) {
      return porsiList.map((p) => `${p.alias} (${p.pengali}x porsi)`).join(', ');
    }
    if (membersList && membersList.length > 0) {
      return membersList
        .map((m) => {
          const pengali =
            m.usia_tahun < 4 ? '0.5x' : m.usia_tahun < 10 ? '0.75x' : m.jenis_kelamin === 'L' && m.usia_tahun > 18 ? '1.25x' : '1.0x';
          return `${m.alias} (${pengali} porsi)`;
        })
        .join(', ');
    }
    return `${userProfileName}: 1 porsi standar bergizi seimbang.`;
  };

  // Ambil data hari yang dipilih dari jadwal menu 7 hari
  const currentDayData: MenuHari | null = useMemo(() => {
    if (!rencanaMenu || !rencanaMenu.hari) return null;
    return (
      rencanaMenu.hari.find((h) => h.hari_ke === selectedDayIndex) ||
      rencanaMenu.hari[0] ||
      null
    );
  }, [rencanaMenu, selectedDayIndex]);

  // Strip 7 Hari Menu dengan Tanggal Realtime (Mulai dari HARI INI di posisi paling kiri, selaras dengan app/menu/page.tsx)
  const daysList = useMemo(() => {
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const monthNamesShort = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
    ];
    const monthNamesFull = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];

    if (!currentDate) {
      return [1, 2, 3, 4, 5, 6, 7].map((num) => ({
        hari_ke: num,
        shortLabel: num === 1 ? 'Hari Ini' : `H+${num - 1}`,
        fullLabel: num === 1 ? 'Hari Ini' : `Hari ke-${num}`,
        dateNum: num,
        monthShort: '',
        monthFull: '',
        year: 2026,
        dateFormatted: `Hari ${num}`,
        fullDateFormatted: num === 1 ? 'Hari Ini' : `Hari ke-${num}`,
        isToday: num === 1,
        isCurrent: num === selectedDayIndex,
      }));
    }

    const today = new Date(currentDate);
    today.setHours(0, 0, 0, 0);

    return [1, 2, 3, 4, 5, 6, 7].map((num) => {
      // num = 1 adalah Hari Ini (offset 0 hari, berada di bagian paling kiri)
      const d = new Date(today);
      d.setDate(today.getDate() + (num - 1));

      const dayName = dayNames[d.getDay()];
      const dateNum = d.getDate();
      const monthShort = monthNamesShort[d.getMonth()];
      const monthFull = monthNamesFull[d.getMonth()];
      const year = d.getFullYear();
      const isToday = num === 1;

      return {
        hari_ke: num,
        shortLabel: isToday ? 'Hari Ini' : dayName.slice(0, 3),
        fullLabel: dayName,
        dateNum,
        monthShort,
        monthFull,
        year,
        dateFormatted: `${dateNum} ${monthShort}`,
        fullDateFormatted: isToday
          ? `${dayName}, ${dateNum} ${monthFull} ${year} (Hari Ini)`
          : num === 2
          ? `${dayName}, ${dateNum} ${monthFull} ${year} (Besok)`
          : `${dayName}, ${dateNum} ${monthFull} ${year}`,
        isToday,
        isCurrent: num === selectedDayIndex,
      };
    });
  }, [currentDate, selectedDayIndex]);

  const currentDayItem = useMemo(() => {
    return daysList.find((d) => d.hari_ke === selectedDayIndex) || daysList[0];
  }, [daysList, selectedDayIndex]);

  // Status sayuran harian (apakah 1x masak pagi-siang / 1x seharian / 2x masak)
  const sayurPagi = currentDayData?.sesi_makan?.pagi?.hidangan?.find((h) => h.kategori === 'Sayuran');
  const sayurSiang = currentDayData?.sesi_makan?.siang?.hidangan?.find((h) => h.kategori === 'Sayuran');
  const sayurMalam = currentDayData?.sesi_makan?.malam?.hidangan?.find((h) => h.kategori === 'Sayuran');

  const isSayurPagiSiangSama = !!(sayurPagi && sayurSiang && sayurPagi.kode === sayurSiang.kode);
  const isSayurMalamSama = !!(sayurMalam && sayurPagi && sayurMalam.kode === sayurPagi.kode);

  // Simpan password baru ke database
  const handleSaveSecurityPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPasswordInput.length < 6) {
      setPasswordError('Kata sandi minimal 6 karakter demi keamanan akun.');
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordError('Ulangi kata sandi baru tidak cocok.');
      return;
    }

    setPasswordLoading(true);

    try {
      const raw = localStorage.getItem('porsi_kita_auth_meta');
      const meta = raw ? JSON.parse(raw) : {};
      const storedKeluarga = getStoredKeluarga();

      const res = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: meta.phone || userPhone || '',
          familyId: storedKeluarga?.id || meta.familyId || '',
          newPassword: newPasswordInput,
          confirmPassword: confirmPasswordInput,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data.error || 'Gagal menyimpan kata sandi ke database.');
        setPasswordLoading(false);
        return;
      }

      setPasswordSuccess('Kata sandi berhasil disimpan ke database! Akun keluarga Anda kini aman.');

      if (typeof window !== 'undefined') {
        meta.hasPassword = true;
        delete meta.hasLoggedOutAfterOtp;
        localStorage.setItem('porsi_kita_auth_meta', JSON.stringify(meta));
      }

      setHasPassword(true);
      setHasWarningBadge(false);
      setIsOver24Hours(false);
      setNewPasswordInput('');
      setConfirmPasswordInput('');

      setTimeout(() => {
        setShowSecurityModal(false);
        setPasswordSuccess('');
      }, 1200);
    } catch {
      setPasswordError('Gagal terhubung ke server.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Toggle checklist item
  const handleToggleCheck = (id: string) => {
    setShoppingList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  // Tambah item belanja cepat
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;
    const newItem: ShoppingItem = {
      id: Date.now().toString(),
      name: newItemText.trim(),
      price: 0,
      checked: false,
    };
    setShoppingList((prev) => [...prev, newItem]);
    setNewItemText('');
  };

  // Salin daftar belanja ke format WhatsApp
  const handleCopyWhatsApp = () => {
    const lines = [
      `🛒 *Daftar Belanja Bahan - Porsi Kita*`,
      `Keluarga: *${userProfileName}*`,
      `Wilayah / Pasar: ${wilayahName}`,
      `Hari: ${currentDayItem?.fullDateFormatted || currentDayData?.label_hari || `Hari ke-${selectedDayIndex}`}`,
      '--------------------------------',
      ...shoppingList.map(
        (it) => `${it.checked ? '✅' : '◻️'} ${it.name} ${it.price > 0 ? `(Rp ${it.price.toLocaleString('id-ID')})` : ''}`
      ),
      '--------------------------------',
      `*Total Estimasi: Rp ${shoppingList.reduce((acc, curr) => acc + curr.price, 0).toLocaleString('id-ID')}*`,
      'Disusun otomatis dengan takaran gizi pas sekeluarga.',
    ];
    const textToCopy = lines.join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopiedWa(true);
    setTimeout(() => setCopiedWa(false), 2500);
  };

  // Catat pengeluaran ke database PostgreSQL
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(expenseAmount.replace(/\D/g, ''), 10);
    if (isNaN(num) || num <= 0) return;

    try {
      const res = await fetch('/api/family/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nominal: num,
          catatan: expenseNote.trim() || 'Belanja bahan makanan dapur',
          phone: userPhone,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPengeluaran(data.pengeluaran);
        setSaldo(data.saldo);
        setTotalAnggaran(data.total_anggaran);
      } else {
        setPengeluaran((prev) => prev + num);
        setSaldo((prev) => Math.max(0, prev - num));
      }
    } catch {
      setPengeluaran((prev) => prev + num);
      setSaldo((prev) => Math.max(0, prev - num));
    }

    setShowExpenseModal(false);
    setExpenseAmount('');
    setExpenseNote('');
  };

  // Simpan budget belanja (Bulanan vs Mingguan) ke database
  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = parseInt(inputBudgetNominal.replace(/\D/g, ''), 10);
    if (isNaN(raw) || raw <= 0) {
      setBudgetFeedback({ type: 'error', msg: 'Nominal budget belanja harus lebih dari Rp 0.' });
      return;
    }

    setBudgetSaving(true);
    setBudgetFeedback({ type: '', msg: '' });

    try {
      const res = await fetch('/api/family/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budget_belanja: raw,
          tipe_budget: inputTipeBudget,
          phone: userPhone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setBudgetFeedback({ type: 'error', msg: data.error || 'Gagal menyimpan budget belanja.' });
        setBudgetSaving(false);
        return;
      }

      setBudgetBelanja(data.budget_belanja);
      setTipeBudget(data.tipe_budget);
      setTotalAnggaran(data.total_anggaran);
      setPengeluaran(data.pengeluaran);
      setSaldo(data.saldo);

      setBudgetFeedback({ type: 'success', msg: 'Budget belanja berhasil disimpan ke database!' });

      setTimeout(() => {
        setShowBudgetModal(false);
        setBudgetFeedback({ type: '', msg: '' });
      }, 1000);
    } catch {
      setBudgetFeedback({ type: 'error', msg: 'Gagal menghubungi server database.' });
    } finally {
      setBudgetSaving(false);
    }
  };

  const totalBelanjaEstimasi = shoppingList.reduce((acc, it) => acc + it.price, 0);

  return (
    <div className="bg-[#FAFAFA] font-sans text-[#0D0101] min-h-screen selection:bg-[#6DA003]/30">
      
      {/* 1. ASIDE SIDEBAR */}
      <Sidebar
        activePath="beranda"
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
        anggotaCount={membersCount}
        rencanaMenuId={rencanaMenu?.id}
      />

      {/* 2. TOP HEADER */}
      <div className="lg:pl-64">
        <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-white/95 backdrop-blur-xl border-b border-stone-200/80 z-40 flex items-center justify-between px-4 sm:px-8 shadow-2xs">
          
          <div className="flex items-center gap-3">
            {/* Mobile Toggle */}
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center text-stone-700 hover:bg-stone-200 transition cursor-pointer"
              aria-label="Buka Menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex items-center gap-2 text-stone-600">
              <span className="w-2 h-2 rounded-full bg-[#6DA003]" />
              <span className="text-[12px] font-bold tracking-wider uppercase hidden sm:inline text-stone-700">
                Perencana Gizi &amp; Keuangan Dapur
              </span>
              <span className="text-[12px] font-extrabold text-[#0C4B20] sm:hidden tracking-tight">
                PORSI KITA
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifikasi Ringkasan */}
            <button
              type="button"
              onClick={() => toast.info(`Menu harian untuk ${userProfileName} telah siap dan anggaran belanja terkunci aman.`, 'Notifikasi Dapur')}
              className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:text-stone-900 transition relative cursor-pointer"
              title="Notifikasi Menu & Anggaran"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#6DA003]" />
            </button>

            {/* Avatar Profil dengan Indikator Keamanan */}
            <div className="relative">
              <Link
                href="/keluarga"
                className="w-8 h-8 rounded-full bg-[#0C4B20] text-white flex items-center justify-center font-bold text-xs shadow-xs hover:brightness-110 transition cursor-pointer"
                title={`Profil: ${userProfileName}`}
              >
                {userProfileName ? userProfileName.charAt(0).toUpperCase() : 'K'}
              </Link>
              {hasWarningBadge && (
                <button
                  type="button"
                  onClick={() => setShowSecurityModal(true)}
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-white ring-1 ring-amber-600/30 cursor-pointer animate-pulse"
                  title="Peringatan Keamanan: Akun belum memiliki kata sandi. Klik untuk mengamankan."
                />
              )}
            </div>
          </div>
        </header>

        {/* 3. MAIN DASHBOARD CONTENT */}
        <main className="relative pt-20 min-h-screen w-full px-4 sm:px-8 pb-14 bg-[#FAFAFA]">
          <div className="flex flex-col w-full max-w-[1280px] mx-auto gap-6">
            
            {/* A. GREETING & CONTEXT HEADER */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-stone-200/60">
              <div className="flex flex-col">
                <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#6DA003] uppercase tracking-wider mb-1">
                  <span className="w-2 h-2 rounded-full bg-[#6DA003]" />
                  <span>Ringkasan Harian Keluarga</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0D0101] tracking-tight">
                  Halo, {userProfileName}!
                </h1>
                <p className="text-[14px] text-stone-600 mt-1">
                  Berikut rencana menu bergizi dan estimasi pengeluaran dapur keluarga Anda.
                </p>
              </div>

              {/* Profile Card Context dari Database */}
              <div className="flex items-center gap-3 p-3 pl-4 rounded-2xl bg-white shadow-xs border border-stone-200 self-start md:self-auto">
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold text-[#0D0101]">{userProfileName}</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#B2F2B6] text-[#002109] text-[11px] font-bold">
                      Anggaran Terkendali
                    </span>
                  </div>
                  <span className="text-[12px] text-stone-500 font-medium">
                    {membersCount > 0 ? `${membersCount} Anggota Keluarga` : 'Keluarga'} • {wilayahName}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#0C4B20] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                  {userProfileName ? userProfileName.charAt(0).toUpperCase() : 'K'}
                </div>
              </div>
            </header>

            {/* B. MAIN 2-COLUMN GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* LEFT COLUMN: Dompet & Kalender Masak (8 Kolom) */}
              <div className="lg:col-span-8 flex flex-col gap-8">
                
                {/* C. DOMPET BULANAN & KEUANGAN (Solid Deep Green #0C4B20) */}
                <section
                  id="dompet"
                  className="rounded-3xl p-6 sm:p-8 text-white shadow-sm relative overflow-hidden"
                  style={{ backgroundColor: '#0C4B20' }}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-2 text-[#B2F2B6]">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <span className="text-[12px] font-extrabold uppercase tracking-wider">
                          Sisa Saldo Belanja Dapur
                        </span>
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className="text-[34px] sm:text-[44px] font-extrabold tracking-tight text-white tabular-nums leading-none">
                          Rp {saldo.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2.5">
                        <p className="text-[13px] opacity-85">
                          dari total anggaran <strong className="text-white font-bold">Rp {totalAnggaran.toLocaleString('id-ID')}</strong>
                        </p>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#B2F2B6]/20 text-[#B2F2B6] border border-[#B2F2B6]/30">
                          {tipeBudget === 'mingguan'
                            ? `Budget Mingguan (Rp ${budgetBelanja.toLocaleString('id-ID')} × 4)`
                            : 'Budget Bulanan'}
                        </span>
                      </div>

                      {/* Ringkasan Alokasi */}
                      <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-white/15">
                        <div className="flex flex-col">
                          <span className="text-[11px] opacity-75">Total Anggaran Bulanan (+)</span>
                          <span className="text-[18px] sm:text-[20px] text-[#B2F2B6] font-bold tabular-nums">
                            Rp {totalAnggaran.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[11px] text-[#B2F2B6]/90 mt-0.5 font-medium">Batas Belanja Dapur</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] opacity-75">Pengeluaran Terpakai (-)</span>
                          <span className="text-[18px] sm:text-[20px] font-bold text-white tabular-nums">
                            Rp {pengeluaran.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[11px] text-[#B2F2B6]/90 mt-0.5 font-medium">
                            {totalAnggaran > 0 ? Math.round((pengeluaran / totalAnggaran) * 100) : 0}% terpakai
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 min-w-[200px] justify-center">
                      <button
                        type="button"
                        onClick={() => setShowExpenseModal(true)}
                        style={{ backgroundColor: '#6DA003' }}
                        className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-white font-bold text-[13px] shadow-sm transition-all hover:brightness-105 active:scale-95 cursor-pointer min-h-[44px]"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Catat Pengeluaran</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setInputBudgetNominal(budgetBelanja.toLocaleString('id-ID'));
                          setInputTipeBudget(tipeBudget);
                          setBudgetFeedback({ type: '', msg: '' });
                          setShowBudgetModal(true);
                        }}
                        className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all font-bold text-[13px] backdrop-blur-sm cursor-pointer border border-white/15 min-h-[44px]"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Atur Budget Belanja</span>
                      </button>
                    </div>
                  </div>
                </section>

                {/* D. KALENDER & JADWAL MASAKAN */}
                <section className="flex flex-col gap-4">
                  {/* Section Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-[20px] font-extrabold text-[#0D0101]">Jadwal Masak Keluarga</h2>
                      <span className="px-2.5 py-1 rounded-full bg-[#EAF5D8] text-[#0C4B20] text-[11px] font-bold border border-[#6DA003]/30 flex items-center gap-1.5">
                        {currentDayItem?.isToday && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#6DA003] animate-pulse" />
                        )}
                        <span>
                          {currentDayItem?.isToday
                            ? `Hari Ini • ${currentDayItem.fullDateFormatted}`
                            : currentDayItem?.fullDateFormatted || currentDayData?.label_hari || `Hari ke-${selectedDayIndex}`}
                        </span>
                      </span>
                    </div>

                    <Link
                      href="/menu"
                      className="flex items-center gap-1.5 text-[13px] font-bold text-[#0C4B20] hover:text-[#6DA003] transition-colors"
                    >
                      <span>Lihat Rincian Menu 7 Hari →</span>
                    </Link>
                  </div>

                  {/* 7-Day Pill Strip */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1" id="calendar-strip">
                    {daysList.map((item) => {
                      const isSelected = selectedDayIndex === item.hari_ke;
                      return (
                        <button
                          key={item.hari_ke}
                          type="button"
                          onClick={() => setSelectedDayIndex(item.hari_ke)}
                          style={{ backgroundColor: isSelected ? '#0C4B20' : undefined }}
                          className={`flex-1 min-w-[64px] py-2 px-1.5 rounded-2xl flex flex-col items-center transition-all cursor-pointer ${
                            isSelected
                              ? 'text-white shadow-xs relative'
                              : item.isToday
                              ? 'bg-[#F2F9EC] text-[#0C4B20] hover:bg-[#EAF5D8] border border-[#6DA003]/40'
                              : 'bg-white text-[#0D0101] hover:bg-stone-50 border border-stone-200'
                          }`}
                        >
                          <span className={`text-[11px] font-bold ${
                            isSelected ? 'text-[#B2F2B6]' : item.isToday ? 'text-[#0C4B20]' : 'text-stone-500'
                          }`}>
                            {item.shortLabel}
                          </span>
                          <span className={`text-[17px] mt-0.5 leading-tight ${
                            isSelected ? 'font-extrabold text-white' : item.isToday ? 'font-extrabold text-[#0C4B20]' : 'font-bold text-[#0D0101]'
                          }`}>
                            {item.dateNum}
                          </span>
                          {isSelected ? (
                            <span className="w-1.5 h-1.5 rounded-full mt-1 bg-[#6DA003]" />
                          ) : item.isToday ? (
                            <span className="text-[9px] font-extrabold text-[#6DA003] leading-none mt-1">Hari ini</span>
                          ) : (
                            <span className="text-[10px] text-stone-400 leading-none mt-1">{item.monthShort}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* 3 Meal Schedule Cards */}
                  {!currentDayData || !currentDayData.sesi_makan ? (
                    <div className="bg-white rounded-3xl p-8 border border-stone-200 text-center flex flex-col items-center justify-center gap-3 mt-2 shadow-xs">
                      <div className="w-16 h-16 rounded-full bg-[#EAF5D8] text-[#0C4B20] flex items-center justify-center text-3xl">
                        🍲
                      </div>
                      <h3 className="font-extrabold text-[18px] text-[#0D0101]">Belum Ada Rencana Menu Masak</h3>
                      <p className="text-[13px] text-stone-500 max-w-md">
                        Susun rencana menu 7 hari keluarga Anda yang otomatis menghitung takaran porsi sesuai AKG dan estimasi belanja harian.
                      </p>
                      <Link
                        href="/menu"
                        className="mt-2 px-6 py-3 rounded-2xl bg-[#0C4B20] hover:bg-[#073214] text-white font-bold text-[14px] transition shadow-xs flex items-center gap-2"
                      >
                        <span>Buat Menu 7 Hari Sekarang</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-2">
                      {/* Card Pagi */}
                      {(() => {
                        const pagiSesi = currentDayData.sesi_makan.pagi;
                        if (!pagiSesi) return null;

                        const mainDish =
                          pagiSesi.hidangan.find((h) => h.kategori === 'Lauk Hewani') ||
                          pagiSesi.hidangan.find((h) => h.kategori === 'Sayuran') ||
                          pagiSesi.hidangan[0];
                        const fotoUrl = mainDish?.kode ? `/images/resep/${mainDish.kode}.webp` : '/images/resep/RSP013.webp';
                        const pagiCostNum = pagiSesi.hidangan.reduce((acc, h) => {
                          const totalPengali = pagiSesi.porsi_per_anggota?.reduce((sum, p) => sum + p.pengali, 0) || 1;
                          return acc + (h.biaya_per_porsi_rp || 0) * totalPengali;
                        }, 0);
                        const pagiCost = `Rp ${Math.round(pagiCostNum).toLocaleString('id-ID')}`;
                        const pagiPortion = getDynamicPortionString(pagiSesi.porsi_per_anggota);
                        const sayurDish = pagiSesi.hidangan.find((h) => h.kategori === 'Sayuran');
                        const isSameVeg = isSayurPagiSiangSama && sayurDish;

                        return (
                          <article className="flex flex-col bg-white rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all border border-stone-200/90 justify-between">
                            <div>
                              {/* Hero Thumbnail */}
                              <div className="h-40 w-full relative bg-stone-100">
                                <img
                                  className="w-full h-full object-cover"
                                  alt="Sarapan Pagi"
                                  src={fotoUrl}
                                  loading="lazy"
                                />
                                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 backdrop-blur-sm text-[#0D0101] text-[11px] font-bold shadow-2xs">
                                  <span className="w-2 h-2 rounded-full bg-[#0C4B20]" />
                                  <span>SARAPAN • 06:30 WIB</span>
                                </div>
                                <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-sm text-[#0C4B20] text-[11px] font-bold shadow-2xs font-mono">
                                  Est. {pagiCost}
                                </span>
                              </div>

                              {/* Content & Dish List */}
                              <div className="p-4 sm:p-5 flex flex-col gap-3">
                                {/* Badge Efisiensi Sayur Domestik */}
                                {isSameVeg && (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200/80 self-start">
                                    <span>🍲</span>
                                    <span>Masak 1x (Porsi Pagi &amp; Siang)</span>
                                  </div>
                                )}

                                <div>
                                  <div className="flex items-center justify-between">
                                    <h3 className="font-extrabold text-[16px] text-[#0D0101]">
                                      Sarapan Pagi
                                    </h3>
                                    <span className="text-[11px] font-bold text-[#6DA003] bg-[#F2F9EC] px-2 py-0.5 rounded-md">
                                      30% AKG
                                    </span>
                                  </div>
                                  <p className="text-[12px] text-stone-500 mt-0.5">
                                    {pagiSesi.hidangan.length} hidangan bergizi seimbang
                                  </p>
                                </div>

                                {/* List Masakan Rapi */}
                                <div className="space-y-2 pt-1 border-t border-stone-100">
                                  {pagiSesi.hidangan.map((dish) => (
                                    <div
                                      key={dish.kode}
                                      className="flex items-center justify-between p-2 rounded-xl bg-stone-50 hover:bg-[#F2F9EC]/80 border border-stone-200/60 transition gap-2"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <img
                                          src={`/images/resep/${dish.kode}.webp`}
                                          alt={dish.nama}
                                          className="w-10 h-10 rounded-lg object-cover bg-stone-200 shrink-0 border border-stone-200/50"
                                          loading="lazy"
                                        />
                                        <div className="min-w-0">
                                          <span className="font-bold text-[13px] text-[#0D0101] truncate block">
                                            {dish.nama}
                                          </span>
                                          <span className="text-[11px] text-[#737a65] block truncate">
                                            {dish.kategori} • {dish.gizi_per_porsi.energi_kcal} kkal
                                          </span>
                                        </div>
                                      </div>
                                      <span className="text-[11px] font-bold text-[#0C4B20] font-mono shrink-0 ml-1">
                                        Rp {dish.biaya_per_porsi_rp.toLocaleString('id-ID')}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Card Footer */}
                            <div className="p-4 pt-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedRecipe({
                                    title: 'Sarapan Pagi Keluarga',
                                    session: 'SARAPAN PAGI • 06:30 WIB',
                                    cost: pagiCost,
                                    tags: ['Tinggi Zat Besi (Fe)', 'Kalsium Seimbang', 'Serat Pagi'],
                                    portionDetail: pagiPortion,
                                    dishes: pagiSesi.hidangan,
                                  })
                                }
                                className="w-full min-h-[44px] py-2 px-3 rounded-xl bg-stone-50 hover:bg-[#EAF5D8] hover:text-[#0C4B20] text-[#0D0101] text-[12.5px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-stone-200 active:scale-98"
                              >
                                <span>Lihat Rincian Porsi &amp; Resep</span>
                                <svg className="w-4 h-4 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </div>
                          </article>
                        );
                      })()}

                      {/* Card Siang */}
                      {(() => {
                        const siangSesi = currentDayData.sesi_makan.siang;
                        if (!siangSesi) return null;

                        const mainDish =
                          siangSesi.hidangan.find((h) => h.kategori === 'Lauk Hewani') ||
                          siangSesi.hidangan.find((h) => h.kategori === 'Sayuran') ||
                          siangSesi.hidangan[0];
                        const fotoUrl = mainDish?.kode ? `/images/resep/${mainDish.kode}.webp` : '/images/resep/RSP008.webp';
                        const siangCostNum = siangSesi.hidangan.reduce((acc, h) => {
                          const totalPengali = siangSesi.porsi_per_anggota?.reduce((sum, p) => sum + p.pengali, 0) || 1;
                          return acc + (h.biaya_per_porsi_rp || 0) * totalPengali;
                        }, 0);
                        const siangCost = `Rp ${Math.round(siangCostNum).toLocaleString('id-ID')}`;
                        const siangPortion = getDynamicPortionString(siangSesi.porsi_per_anggota);
                        const sayurDish = siangSesi.hidangan.find((h) => h.kategori === 'Sayuran');
                        const isSameVeg = isSayurPagiSiangSama && sayurDish;

                        return (
                          <article className="flex flex-col bg-white rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all border border-stone-200/90 justify-between">
                            <div>
                              {/* Hero Thumbnail */}
                              <div className="h-40 w-full relative bg-stone-100">
                                <img
                                  className="w-full h-full object-cover"
                                  alt="Makan Siang"
                                  src={fotoUrl}
                                  loading="lazy"
                                />
                                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 backdrop-blur-sm text-[#0D0101] text-[11px] font-bold shadow-2xs">
                                  <span className="w-2 h-2 rounded-full bg-[#6DA003]" />
                                  <span>MAKAN SIANG • 12:30 WIB</span>
                                </div>
                                <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-sm text-[#0C4B20] text-[11px] font-bold shadow-2xs font-mono">
                                  Est. {siangCost}
                                </span>
                              </div>

                              {/* Content & Dish List */}
                              <div className="p-4 sm:p-5 flex flex-col gap-3">
                                {/* Badge Efisiensi Sayur Domestik */}
                                {isSameVeg && (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200/80 self-start">
                                    <span>🍲</span>
                                    <span>Porsi Lanjutan Pagi (Tanpa Masak Ulang)</span>
                                  </div>
                                )}

                                <div>
                                  <div className="flex items-center justify-between">
                                    <h3 className="font-extrabold text-[16px] text-[#0D0101]">
                                      Makan Siang
                                    </h3>
                                    <span className="text-[11px] font-bold text-[#6DA003] bg-[#F2F9EC] px-2 py-0.5 rounded-md">
                                      40% AKG
                                    </span>
                                  </div>
                                  <p className="text-[12px] text-stone-500 mt-0.5">
                                    {siangSesi.hidangan.length} hidangan bergizi seimbang
                                  </p>
                                </div>

                                {/* List Masakan Rapi */}
                                <div className="space-y-2 pt-1 border-t border-stone-100">
                                  {siangSesi.hidangan.map((dish) => (
                                    <div
                                      key={dish.kode}
                                      className="flex items-center justify-between p-2 rounded-xl bg-stone-50 hover:bg-[#F2F9EC]/80 border border-stone-200/60 transition gap-2"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <img
                                          src={`/images/resep/${dish.kode}.webp`}
                                          alt={dish.nama}
                                          className="w-10 h-10 rounded-lg object-cover bg-stone-200 shrink-0 border border-stone-200/50"
                                          loading="lazy"
                                        />
                                        <div className="min-w-0">
                                          <span className="font-bold text-[13px] text-[#0D0101] truncate block">
                                            {dish.nama}
                                          </span>
                                          <span className="text-[11px] text-stone-500 block truncate">
                                            {dish.kategori} • {dish.gizi_per_porsi.energi_kcal} kkal
                                          </span>
                                        </div>
                                      </div>
                                      <span className="text-[11px] font-bold text-[#0C4B20] font-mono shrink-0 ml-1">
                                        Rp {dish.biaya_per_porsi_rp.toLocaleString('id-ID')}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Card Footer */}
                            <div className="p-4 pt-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedRecipe({
                                    title: 'Makan Siang Keluarga',
                                    session: 'MAKAN SIANG • 12:30 WIB',
                                    cost: siangCost,
                                    tags: ['Protein Tinggi Hewani & Nabati', 'Energi Siang Optimal', 'Zat Besi Heme'],
                                    portionDetail: siangPortion,
                                    dishes: siangSesi.hidangan,
                                  })
                                }
                                className="w-full min-h-[44px] py-2 px-3 rounded-xl bg-stone-50 hover:bg-[#EAF5D8] hover:text-[#0C4B20] text-[#0D0101] text-[12.5px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-stone-200 active:scale-98"
                              >
                                <span>Lihat Rincian Porsi &amp; Resep</span>
                                <svg className="w-4 h-4 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </div>
                          </article>
                        );
                      })()}

                      {/* Card Malam */}
                      {(() => {
                        const malamSesi = currentDayData.sesi_makan.malam;
                        if (!malamSesi) return null;

                        const mainDish =
                          malamSesi.hidangan.find((h) => h.kategori === 'Lauk Hewani') ||
                          malamSesi.hidangan.find((h) => h.kategori === 'Sayuran') ||
                          malamSesi.hidangan[0];
                        const fotoUrl = mainDish?.kode ? `/images/resep/${mainDish.kode}.webp` : '/images/resep/RSP010.webp';
                        const malamCostNum = malamSesi.hidangan.reduce((acc, h) => {
                          const totalPengali = malamSesi.porsi_per_anggota?.reduce((sum, p) => sum + p.pengali, 0) || 1;
                          return acc + (h.biaya_per_porsi_rp || 0) * totalPengali;
                        }, 0);
                        const malamCost = `Rp ${Math.round(malamCostNum).toLocaleString('id-ID')}`;
                        const malamPortion = getDynamicPortionString(malamSesi.porsi_per_anggota);
                        const sayurDish = malamSesi.hidangan.find((h) => h.kategori === 'Sayuran');

                        return (
                          <article className="flex flex-col bg-white rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all border border-stone-200/90 justify-between">
                            <div>
                              {/* Hero Thumbnail */}
                              <div className="h-40 w-full relative bg-stone-100">
                                <img
                                  className="w-full h-full object-cover"
                                  alt="Makan Malam"
                                  src={fotoUrl}
                                  loading="lazy"
                                />
                                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 backdrop-blur-sm text-[#0D0101] text-[11px] font-bold shadow-2xs">
                                  <span className="w-2 h-2 rounded-full bg-[#0C4B20]" />
                                  <span>MAKAN MALAM • 18:30 WIB</span>
                                </div>
                                <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-sm text-[#0C4B20] text-[11px] font-bold shadow-2xs font-mono">
                                  Est. {malamCost}
                                </span>
                              </div>

                              {/* Content & Dish List */}
                              <div className="p-4 sm:p-5 flex flex-col gap-3">
                                {/* Badge Efisiensi Sayur Domestik */}
                                {sayurDish && (
                                  isSayurMalamSama ? (
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200/80 self-start">
                                      <span>🍲</span>
                                      <span>Masak 1x Seharian (Praktis)</span>
                                    </div>
                                  ) : (
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 text-[11px] font-bold border border-sky-200/80 self-start">
                                      <span>🥬</span>
                                      <span>Masak ke-2: Sayur Segar Malam</span>
                                    </div>
                                  )
                                )}

                                <div>
                                  <div className="flex items-center justify-between">
                                    <h3 className="font-extrabold text-[16px] text-[#0D0101]">
                                      Makan Malam
                                    </h3>
                                    <span className="text-[11px] font-bold text-[#6DA003] bg-[#F2F9EC] px-2 py-0.5 rounded-md">
                                      30% AKG
                                    </span>
                                  </div>
                                  <p className="text-[12px] text-stone-500 mt-0.5">
                                    {malamSesi.hidangan.length} hidangan bergizi seimbang
                                  </p>
                                </div>

                                {/* List Masakan Rapi */}
                                <div className="space-y-2 pt-1 border-t border-stone-100">
                                  {malamSesi.hidangan.map((dish) => (
                                    <div
                                      key={dish.kode}
                                      className="flex items-center justify-between p-2 rounded-xl bg-stone-50 hover:bg-[#F2F9EC]/80 border border-stone-200/60 transition gap-2"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <img
                                          src={`/images/resep/${dish.kode}.webp`}
                                          alt={dish.nama}
                                          className="w-10 h-10 rounded-lg object-cover bg-stone-200 shrink-0 border border-stone-200/50"
                                          loading="lazy"
                                        />
                                        <div className="min-w-0">
                                          <span className="font-bold text-[13px] text-[#0D0101] truncate block">
                                            {dish.nama}
                                          </span>
                                          <span className="text-[11px] text-stone-500 block truncate">
                                            {dish.kategori} • {dish.gizi_per_porsi.energi_kcal} kkal
                                          </span>
                                        </div>
                                      </div>
                                      <span className="text-[11px] font-bold text-[#0C4B20] font-mono shrink-0 ml-1">
                                        Rp {dish.biaya_per_porsi_rp.toLocaleString('id-ID')}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Card Footer */}
                            <div className="p-4 pt-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedRecipe({
                                    title: 'Makan Malam Keluarga',
                                    session: 'MAKAN MALAM • 18:30 WIB',
                                    cost: malamCost,
                                    tags: ['Ramah Pencernaan', 'Kalsium Tulang', 'Serat Halus'],
                                    portionDetail: malamPortion,
                                    dishes: malamSesi.hidangan,
                                  })
                                }
                                className="w-full min-h-[44px] py-2 px-3 rounded-xl bg-stone-50 hover:bg-[#EAF5D8] hover:text-[#0C4B20] text-[#0D0101] text-[12.5px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-stone-200 active:scale-98"
                              >
                                <span>Lihat Rincian Porsi &amp; Resep</span>
                                <svg className="w-4 h-4 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </div>
                          </article>
                        );
                      })()}
                    </div>
                  )}
                </section>

              </div>

              {/* RIGHT COLUMN: WIDGET DAFTAR BELANJA PASAR (4 Kolom) */}
              <aside
                id="shopping-list-section"
                className="lg:col-span-4 flex flex-col gap-4 rounded-3xl p-6 shadow-xs border border-stone-200 bg-white"
              >
                {/* Header Widget */}
                <div className="flex items-start justify-between pb-2 border-b border-stone-100">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-2xs"
                      style={{ backgroundColor: '#0C4B20' }}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <div className="flex flex-col">
                      <h2 className="text-[17px] font-extrabold text-[#0D0101] leading-tight">Harus Dibeli</h2>
                      <span className="text-[12px] text-stone-500 font-medium">{wilayahName}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-bold">
                      Estimasi
                    </span>
                    <span className="text-[15px] font-extrabold text-[#0C4B20] tabular-nums">
                      Rp {totalBelanjaEstimasi.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                {/* Checklist Items */}
                <div className="flex flex-col gap-2 mt-1">
                  {shoppingList.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50/80 hover:bg-stone-100 cursor-pointer transition-all border border-stone-200/60"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => handleToggleCheck(item.id)}
                          className="w-4 h-4 rounded text-[#0C4B20] focus:ring-0 accent-[#6DA003] cursor-pointer"
                        />
                        <span
                          className={`text-[13px] transition-colors ${
                            item.checked
                              ? 'line-through text-stone-400'
                              : 'text-[#0D0101] font-semibold'
                          }`}
                        >
                          {item.name}
                        </span>
                      </div>
                      {item.price > 0 && (
                        <span
                          className={`text-[11px] tabular-nums ${
                            item.checked ? 'text-stone-400 line-through' : 'text-[#0C4B20] font-bold'
                          }`}
                        >
                          Rp {item.price.toLocaleString('id-ID')}
                        </span>
                      )}
                    </label>
                  ))}
                </div>

                {/* Quick Add Input Form */}
                <form
                  onSubmit={handleAddItem}
                  className="flex items-center gap-2 bg-stone-50 rounded-xl px-3 py-1.5 border border-stone-200"
                >
                  <svg className="w-4 h-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <input
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    placeholder="Tambah catatan bahan..."
                    className="w-full bg-transparent py-1.5 text-[13px] outline-none text-[#0D0101] placeholder:text-stone-400 font-medium"
                  />
                  <button
                    type="submit"
                    className="text-[12px] text-[#0C4B20] font-bold hover:text-[#6DA003] px-2 py-1 cursor-pointer"
                  >
                    Simpan
                  </button>
                </form>

                {/* Action Buttons: WhatsApp & Lihat Daftar Belanja Lengkap */}
                <div className="flex flex-col gap-2 mt-1">
                  <button
                    type="button"
                    onClick={handleCopyWhatsApp}
                    style={{ backgroundColor: '#6DA003' }}
                    className="w-full py-3 px-4 rounded-xl text-white font-bold text-[13px] flex items-center justify-center gap-2 shadow-sm transition hover:brightness-105 active:scale-98 cursor-pointer min-h-[44px]"
                  >
                    {copiedWa ? (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Daftar Disalin ke Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span>Salin Format WhatsApp</span>
                      </>
                    )}
                  </button>

                  <Link
                    href="/belanja"
                    className="w-full py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#0C4B20] text-center font-bold text-xs transition cursor-pointer"
                  >
                    Buka Checklist Pasar Lengkap (Lapak &amp; Kulkas) →
                  </Link>
                </div>
              </aside>

            </div>

          </div>
        </main>
      </div>

      {/* 4. MODAL DETAIL RESEP & PORSI */}
      {selectedRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div>
                <span className="text-[11px] font-extrabold text-[#6DA003] uppercase tracking-wider block">
                  {selectedRecipe.session}
                </span>
                <h3 className="text-[20px] font-extrabold text-[#0D0101]">{selectedRecipe.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecipe(null)}
                className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4 text-sm max-h-[65vh] overflow-y-auto pr-1">
              <div className="flex items-center justify-between p-3.5 bg-[#F2F9EC] rounded-2xl border border-[#6DA003]/20">
                <span className="text-[12px] text-[#0C4B20] font-bold">Estimasi Biaya Sesi:</span>
                <span className="text-[16px] font-extrabold text-[#0C4B20]">{selectedRecipe.cost}</span>
              </div>

              {/* Rincian Hidangan Masakan */}
              {selectedRecipe.dishes && selectedRecipe.dishes.length > 0 && (
                <div>
                  <span className="font-bold text-[#0D0101] block mb-2 text-xs uppercase tracking-wider text-stone-500">
                    Hidangan dalam Sesi Ini ({selectedRecipe.dishes.length} Masakan):
                  </span>
                  <div className="space-y-2">
                    {selectedRecipe.dishes.map((d: any) => (
                      <div
                        key={d.kode}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-200/70 gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={`/images/resep/${d.kode}.webp`}
                            alt={d.nama}
                            className="w-10 h-10 rounded-lg object-cover bg-stone-200 shrink-0 border border-stone-200/50"
                          />
                          <div className="min-w-0">
                            <h5 className="font-bold text-[13px] text-[#0D0101] truncate">{d.nama}</h5>
                            <span className="text-[11px] text-stone-500 block truncate">
                              {d.kategori} • {d.gizi_per_porsi?.energi_kcal} kkal
                            </span>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-[#0C4B20] font-mono shrink-0 ml-1">
                          Rp {d.biaya_per_porsi_rp?.toLocaleString('id-ID')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <span className="font-bold text-[#0D0101] block mb-1.5">Nilai Gizi Unggulan:</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedRecipe.tags.map((t) => (
                    <span key={t} className="px-2.5 py-1 rounded-lg bg-[#B2F2B6] text-[#002109] text-xs font-bold">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="font-bold text-[#0D0101] block mb-1.5">Pembagian Porsi Keluarga ({userProfileName}):</span>
                <div className="text-stone-700 leading-relaxed text-xs sm:text-sm bg-stone-50 p-3.5 rounded-xl border border-stone-200">
                  {selectedRecipe.portionDetail}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-200 flex items-center justify-between gap-2">
              <Link
                href="/menu"
                className="text-[12px] font-bold text-[#0C4B20] hover:text-[#6DA003] transition flex items-center gap-1"
              >
                <span>Buka Kalender Menu 7 Hari →</span>
              </Link>
              <button
                type="button"
                onClick={() => setSelectedRecipe(null)}
                className="px-5 py-2.5 rounded-xl bg-[#0C4B20] text-white font-bold text-xs hover:brightness-110 transition cursor-pointer shadow-sm"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL CATAT PENGELUARAN */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="text-[18px] font-extrabold text-[#0D0101]">Catat Pengeluaran Belanja</h3>
              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="py-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Nominal Belanja (Rp)</label>
                <input
                  type="text"
                  required
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="Contoh: 35000"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0C4B20]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Catatan / Warung Pasar</label>
                <input
                  type="text"
                  value={expenseNote}
                  onChange={(e) => setExpenseNote(e.target.value)}
                  placeholder={`Contoh: Belanja sayur di ${wilayahName}`}
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0C4B20]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-stone-600 text-xs font-bold hover:bg-stone-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(90deg, #6DA003 0%, #82BD03 100%)',
                  }}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl text-white font-bold text-xs hover:brightness-105 shadow-sm cursor-pointer"
                >
                  Simpan Pengeluaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL KEAMANAN: AMANKAN AKUN KELUARGA IBU */}
      {showSecurityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#EAF5D8] text-[#0C4B20] flex items-center justify-center text-xl shrink-0">
                  🛡️
                </div>
                <div>
                  <h3 className="text-[18px] font-extrabold text-[#0D0101] leading-tight">
                    Amankan Akun {userProfileName}
                  </h3>
                  <span className="text-[11px] font-bold text-[#0C4B20]">
                    Porsi Kita • Perlindungan Akun
                  </span>
                </div>
              </div>
              {!isOver24Hours && (
                <button
                  type="button"
                  onClick={() => setShowSecurityModal(false)}
                  className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-800 cursor-pointer"
                  title="Tutup dialog"
                >
                  ✕
                </button>
              )}
            </div>

            <p className="text-[13px] text-stone-600 mt-3.5 leading-relaxed">
              {isOver24Hours
                ? `Sudah lebih dari 24 jam akun ${userProfileName} belum memiliki kata sandi. Demi keamanan data keluarga dan anggaran belanja, mohon buat kata sandi baru untuk akun ini sebelum melanjutkan.`
                : `Ibu baru saja masuk tanpa kata sandi. Silakan buat kata sandi baru untuk melindungi akun ${userProfileName} saat masuk kembali.`}
            </p>

            {passwordError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <span>⚠️</span>
                <span>{passwordError}</span>
              </div>
            )}
            {passwordSuccess && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <span>✓</span>
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveSecurityPassword} className="py-4 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#0D0101] block mb-1">
                  Kata Sandi Baru <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full px-4 py-2.5 pr-10 rounded-xl border border-stone-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0C4B20]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-800 text-xs font-semibold cursor-pointer select-none"
                    title={showNewPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                  >
                    {showNewPassword ? 'Sembunyi' : 'Lihat'}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#0D0101] block mb-1">
                  Ulangi Kata Sandi Baru <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    placeholder="Ulangi kata sandi baru"
                    className="w-full px-4 py-2.5 pr-10 rounded-xl border border-stone-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0C4B20]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-800 text-xs font-semibold cursor-pointer select-none"
                    title={showConfirmPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                  >
                    {showConfirmPassword ? 'Sembunyi' : 'Lihat'}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                {!isOver24Hours && (
                  <button
                    type="button"
                    onClick={() => setShowSecurityModal(false)}
                    className="min-h-[48px] px-5 py-2.5 rounded-xl bg-stone-100 text-stone-600 text-xs font-bold hover:bg-stone-200 transition cursor-pointer"
                  >
                    Nanti Saja
                  </button>
                )}
                <button
                  type="submit"
                  disabled={passwordLoading}
                  style={{
                    background: 'linear-gradient(90deg, #6DA003 0%, #82BD03 100%)',
                    boxShadow: '0 4px 12px rgba(109, 160, 3, 0.25)',
                  }}
                  className="min-h-[48px] px-6 py-2.5 rounded-xl text-white font-bold text-[13px] hover:brightness-105 transition shadow-sm cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {passwordLoading ? (
                    <span>Menyimpan Sandi...</span>
                  ) : (
                    <span>Simpan Kata Sandi Akun</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL ATUR BUDGET BELANJA (BULANAN VS MINGGUAN) */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#EAF5D8] text-[#0C4B20] flex items-center justify-center text-xl shrink-0">
                  💰
                </div>
                <div>
                  <h3 className="text-[18px] font-extrabold text-[#0D0101] leading-tight">
                    Atur Budget Belanja
                  </h3>
                  <span className="text-[11px] font-bold text-[#0C4B20]">
                    Porsi Kita • Pengaturan Anggaran Dapur
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBudgetModal(false)}
                className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-800 cursor-pointer"
                title="Tutup dialog"
              >
                ✕
              </button>
            </div>

            <p className="text-[13px] text-stone-600 mt-3.5 leading-relaxed">
              Pilih tipe periode belanja Ibu (bulanan atau mingguan). Jika memilih mingguan, sistem otomatis mengalikan 4 minggu untuk menghitung total anggaran 1 bulan.
            </p>

            {budgetFeedback.msg && (
              <div
                className={`mt-3 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  budgetFeedback.type === 'error'
                    ? 'bg-rose-50 border border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                }`}
              >
                <span>{budgetFeedback.type === 'error' ? '⚠️' : '✓'}</span>
                <span>{budgetFeedback.msg}</span>
              </div>
            )}

            <form onSubmit={handleSaveBudget} className="py-4 space-y-4">
              {/* Tipe Periode Toggle */}
              <div>
                <label className="text-xs font-bold text-[#0D0101] block mb-1.5">
                  Tipe Periode Budget
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setInputTipeBudget('bulanan')}
                    className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      inputTipeBudget === 'bulanan'
                        ? 'bg-white text-[#0C4B20] shadow-xs'
                        : 'text-stone-600 hover:text-[#0D0101]'
                    }`}
                  >
                    📅 Budget Bulanan
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputTipeBudget('mingguan')}
                    className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      inputTipeBudget === 'mingguan'
                        ? 'bg-white text-[#0C4B20] shadow-xs'
                        : 'text-stone-600 hover:text-[#0D0101]'
                    }`}
                  >
                    📆 Budget Mingguan
                  </button>
                </div>
              </div>

              {/* Input Nominal Budget */}
              <div>
                <label className="text-xs font-bold text-[#0D0101] block mb-1">
                  {inputTipeBudget === 'mingguan' ? 'Nominal Budget per Minggu (Rp)' : 'Nominal Budget per Bulan (Rp)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-stone-500">
                    Rp
                  </span>
                  <input
                    type="text"
                    required
                    value={inputBudgetNominal}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      if (!raw) {
                        setInputBudgetNominal('0');
                        return;
                      }
                      const num = parseInt(raw, 10);
                      setInputBudgetNominal(num.toLocaleString('id-ID'));
                    }}
                    placeholder={inputTipeBudget === 'mingguan' ? 'Contoh: 750.000' : 'Contoh: 3.000.000'}
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-stone-300 text-sm font-bold text-[#0D0101] focus:outline-none focus:ring-2 focus:ring-[#0C4B20]"
                  />
                </div>
              </div>

              {/* Live Preview Perhitungan */}
              {(() => {
                const num = parseInt(inputBudgetNominal.replace(/\D/g, '') || '0', 10);
                const totalBulanan = inputTipeBudget === 'mingguan' ? num * 4 : num;
                const perHari = Math.round(totalBulanan / 30);
                return (
                  <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5 text-xs text-[#0D0101]">
                    <div className="flex items-center justify-between font-bold text-[#0C4B20]">
                      <span>Total Anggaran 1 Bulan:</span>
                      <span className="text-sm tabular-nums">Rp {totalBulanan.toLocaleString('id-ID')}</span>
                    </div>
                    {inputTipeBudget === 'mingguan' && (
                      <p className="text-[11px] text-stone-600">
                        *Dihitung dari Rp {num.toLocaleString('id-ID')} × 4 minggu dalam 1 bulan
                      </p>
                    )}
                    <div className="flex items-center justify-between text-stone-600 pt-1 border-t border-stone-200 text-[11px]">
                      <span>Estimasi batas aman per hari:</span>
                      <span className="font-semibold tabular-nums text-[#0D0101]">~Rp {perHari.toLocaleString('id-ID')} / hari</span>
                    </div>
                  </div>
                );
              })()}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowBudgetModal(false)}
                  className="min-h-[48px] px-5 py-2.5 rounded-xl bg-stone-100 text-stone-600 text-xs font-bold hover:bg-stone-200 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={budgetSaving}
                  style={{
                    background: 'linear-gradient(90deg, #6DA003 0%, #82BD03 100%)',
                    boxShadow: '0 4px 12px rgba(109, 160, 3, 0.25)',
                  }}
                  className="min-h-[48px] px-6 py-2.5 rounded-xl text-white font-bold text-[13px] hover:brightness-105 transition shadow-sm cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {budgetSaving ? 'Menyimpan...' : 'Simpan Budget Belanja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
