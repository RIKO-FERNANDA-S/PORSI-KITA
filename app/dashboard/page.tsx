'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Sidebar from '../../components/Sidebar';
import { getStoredKeluarga } from '../../lib/store';

interface ShoppingItem {
  id: string;
  name: string;
  price: number;
  checked: boolean;
}

const INITIAL_SHOPPING_LIST: ShoppingItem[] = [
  { id: '1', name: 'Bayam Cabut Segar (2 ikat)', price: 6000, checked: true },
  { id: '2', name: 'Tempe Papan Daun (2 papan)', price: 8000, checked: true },
  { id: '3', name: 'Telur Ayam Negeri (1/2 kg)', price: 15000, checked: false },
  { id: '4', name: 'Ikan Kembung Banjar (1/2 kg)', price: 22000, checked: false },
  { id: '5', name: 'Jagung Manis Pipil (2 bonggol)', price: 7000, checked: false },
  { id: '6', name: 'Tahu Sutra Putih (1 kotak)', price: 8000, checked: false },
  { id: '7', name: 'Bawang Merah & Putih (1/4 kg)', price: 14000, checked: false },
  { id: '8', name: 'Wortel Berastagi (3 buah)', price: 6000, checked: false },
];

const DAYS_OF_WEEK = [
  { day: 'Sen', date: 12 },
  { day: 'Sel', date: 13 },
  { day: 'Rab', date: 14 },
  { day: 'Kam', date: 15, isToday: true },
  { day: 'Jum', date: 16 },
  { day: 'Sab', date: 17 },
  { day: 'Min', date: 18 },
];

export default function DashboardPage() {
  const [activeNav, setActiveNav] = useState('beranda');
  const [selectedDay, setSelectedDay] = useState(15);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  // Keuangan & Budget Database State
  const [saldo, setSaldo] = useState(3000000);
  const [totalAnggaran, setTotalAnggaran] = useState(3000000);
  const [pengeluaran, setPengeluaran] = useState(0);
  const [budgetBelanja, setBudgetBelanja] = useState(3000000);
  const [tipeBudget, setTipeBudget] = useState<'bulanan' | 'mingguan'>('bulanan');
  const [loadingBudget, setLoadingBudget] = useState(true);

  // Modal Atur Budget Belanja State
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [inputBudgetNominal, setInputBudgetNominal] = useState('3.000.000');
  const [inputTipeBudget, setInputTipeBudget] = useState<'bulanan' | 'mingguan'>('bulanan');
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [budgetFeedback, setBudgetFeedback] = useState({ type: '', msg: '' });
  
  // Shopping list state
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>(INITIAL_SHOPPING_LIST);
  const [newItemText, setNewItemText] = useState('');
  const [copiedWa, setCopiedWa] = useState(false);

  // Modal / Recipe detail state
  const [selectedRecipe, setSelectedRecipe] = useState<{
    title: string;
    session: string;
    cost: string;
    tags: string[];
    portionDetail: string;
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
  const [userProfileName, setUserProfileName] = useState('Ibu Samantha');
  const [userPhone, setUserPhone] = useState('');

  useEffect(() => {
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

      // Fetch data budget dan saldo real-time dari database
      const fetchBudgetFromDb = async (phoneToUse?: string) => {
        try {
          const query = phoneToUse ? `?phone=${encodeURIComponent(phoneToUse)}` : '';
          const res = await fetch(`/api/family/budget${query}`);
          const bData = await res.json();

          if (bData.success) {
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

  // Add item to shopping list
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

  // Copy shopping list to WhatsApp format
  const handleCopyWhatsApp = () => {
    const lines = [
      '🛒 *Daftar Belanja Porsi Kita*',
      'Hari: Kamis, 15 Mei 2025',
      '--------------------------------',
      ...shoppingList.map(
        (it) => `${it.checked ? '✅' : '⬜'} ${it.name} ${it.price > 0 ? `(Rp ${it.price.toLocaleString('id-ID')})` : ''}`
      ),
      '--------------------------------',
      `*Total Estimasi: Rp ${shoppingList.reduce((acc, curr) => acc + curr.price, 0).toLocaleString('id-ID')}*`,
      'Catatan: Beli bahan segar di pasar tradisional.',
    ];
    const textToCopy = lines.join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopiedWa(true);
    setTimeout(() => setCopiedWa(false), 2500);
  };

  // Record expense to database
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

  // Save updated budget (Bulanan vs Mingguan) to database
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

      setBudgetFeedback({ type: 'success', msg: 'Budget belanja berhasil disimpan!' });

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
    <div className="bg-[#fff8f7] font-sans text-[#2c1514] min-h-screen">
      
      {/* ========================================================= */}
      {/* 1. ASIDE SIDEBAR (Shared Component)                       */}
      {/* ========================================================= */}
      <Sidebar
        activePath="beranda"
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
      />

      {/* ========================================================= */}
      {/* 2. TOP HEADER (pl-0 on mobile, lg:pl-64 on desktop) */}
      {/* ========================================================= */}
      <div className="lg:pl-64">
        <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-white/90 backdrop-blur-xl border-b border-[#c3c9b2]/30 z-40 flex items-center justify-between px-4 sm:px-8">
          
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden w-9 h-9 rounded-xl bg-[#fff0ef] flex items-center justify-center text-[#2c1514]"
              aria-label="Buka Menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex items-center gap-2 text-[#737a65]">
              <span className="w-2 h-2 rounded-full bg-[#6da003]" />
              <span className="text-[12px] font-semibold tracking-wider uppercase hidden sm:inline">
                Perencana Domestik Harmonis
              </span>
              <span className="text-[12px] font-semibold text-[#306a3b] sm:hidden">
                Porsi Kita
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <button
              type="button"
              onClick={() => alert('Notifikasi: Menu Kamis telah siap dan anggaran belanja terkunci aman.')}
              className="w-9 h-9 rounded-full bg-[#fff0ef] flex items-center justify-center text-[#434937] hover:text-[#2c1514] transition-colors relative"
              title="Notifikasi"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#6da003]" />
            </button>

            {/* Profile Avatar with Warning Badge */}
            <div className="relative">
              <Link
                href="/keluarga"
                className="w-8 h-8 rounded-full bg-[#466800] text-white flex items-center justify-center font-bold text-xs shadow-xs"
                title={`Profil: ${userProfileName}`}
              >
                {userProfileName ? userProfileName.charAt(0).toUpperCase() : 'S'}
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

        {/* ========================================================= */}
        {/* 3. MAIN DASHBOARD CONTENT */}
        {/* ========================================================= */}
        <main className="relative pt-20 min-h-screen w-full px-4 sm:px-8 pb-12 bg-[#fff8f7]">
          <div className="flex flex-col w-full max-w-[1280px] mx-auto">
            
            {/* A. GREETING & CONTEXT HEADER */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex flex-col">
                <h1 className="text-[28px] sm:text-[32px] font-bold text-[#2c1514] tracking-tight">
                  Halo Ibu Samantha,
                </h1>
                <p className="text-[14px] sm:text-[15px] text-[#5e5e5f] mt-1">
                  Berikut ringkasan menu dan keuangan keluarga bulan ini.
                </p>
              </div>

              {/* Profile Card Context */}
              <div className="flex items-center gap-3 p-2.5 pl-4 rounded-2xl bg-white shadow-xs border border-stone-200/50 self-start md:self-auto">
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-[#2c1514]">Ibu Samantha</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#b2f2b6] text-[#002109] text-[11px] font-bold">
                      Anggaran Aman
                    </span>
                  </div>
                  <span className="text-[12px] text-[#5e5e5f]">Keluarga (4 Anggota) • Jakarta Selatan</span>
                </div>
                <div className="w-11 h-11 rounded-full overflow-hidden bg-stone-200 border border-stone-200 shrink-0">
                  <img
                    className="w-full h-full object-cover"
                    alt="Portrait of an Indonesian mother with gentle warm smile"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBKN23XQm6XRUBWILfAo8i4kw3QAIyEUzEdyQs2RqI6kOYE6tYFyVETKYtwfKEQlugDfFpdDQyKv2F4NcureV9cURVRGoXFI7N9kIvVubOiKG2-dq9isgxK3PQc8Qe87HTWfUWJqosmxVTXsrBj9xWMtSR4xkuxioUt-5g5aq4puTNmBL4ngfkx_zfWBoiAxdiqrp_tD-QfPy5VIx4F7F56wQWEw619NAdqXJNt3cqnHAGDCgI-Q7ik"
                  />
                </div>
              </div>
            </header>

            {/* B. MAIN 2-COLUMN GRID (Left: Finance + Meals, Right: Shopping List) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* LEFT COLUMN (lg:col-span-8) */}
              <div className="lg:col-span-8 flex flex-col gap-8">
                
                {/* C. DOMPET BULANAN & KEUANGAN (Solid Deep Green #0C4B20) */}
                <section
                  id="dompet"
                  className="rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden"
                  style={{ backgroundColor: '#0C4B20' }}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-2 text-[#b2f2b6]">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        <span className="text-[12px] font-bold uppercase tracking-wider">
                          Sisa Saldo Belanja Dapur
                        </span>
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className="text-[34px] sm:text-[44px] font-bold tracking-tight text-white tabular-nums leading-none">
                          Rp {saldo.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <p className="text-[13px] opacity-80">
                          dari total anggaran <strong className="text-white">Rp {totalAnggaran.toLocaleString('id-ID')}</strong>
                        </p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#b2f2b6]/20 text-[#b2f2b6] border border-[#b2f2b6]/30">
                          {tipeBudget === 'mingguan'
                            ? `Budget Mingguan (Rp ${budgetBelanja.toLocaleString('id-ID')} × 4)`
                            : 'Budget Bulanan'}
                        </span>
                      </div>

                      {/* Ringkasan Alokasi */}
                      <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-white/10">
                        <div className="flex flex-col">
                          <span className="text-[11px] opacity-75">Jatah Belanja Bulanan (+)</span>
                          <span className="text-[18px] sm:text-[20px] text-[#b2f2b6] font-semibold tabular-nums">
                            Rp {totalAnggaran.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[11px] text-[#b2f2b6]/90 mt-0.5">Alokasi Dapur Bersih</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] opacity-75">Pengeluaran Terpakai (-)</span>
                          <span className="text-[18px] sm:text-[20px] font-semibold text-white tabular-nums">
                            Rp {pengeluaran.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[11px] text-[#b2f2b6]/90 mt-0.5">
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
                        className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-white font-semibold text-[14px] shadow-sm transition-all hover:brightness-105 active:scale-95 cursor-pointer"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                        className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all font-semibold text-[14px] backdrop-blur-sm cursor-pointer border border-white/10"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                    <div className="flex items-center gap-2">
                      <h2 className="text-[20px] font-bold text-[#2c1514]">Jadwal Masak Keluarga</h2>
                      <span className="px-2.5 py-1 rounded-full bg-[#ffe9e7] text-[#434937] text-[11px] font-semibold">
                        Kamis, 15 Mei 2025 (Hari Ini)
                      </span>
                    </div>

                    <Link
                      href="/menu"
                      className="flex items-center gap-1.5 text-[14px] font-semibold text-[#306a3b] hover:text-[#466800] transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Ganti Menu Harian</span>
                    </Link>
                  </div>

                  {/* Weekly Pill Strip */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1" id="calendar-strip">
                    {DAYS_OF_WEEK.map((item) => {
                      const isSelected = selectedDay === item.date;
                      return (
                        <button
                          key={item.date}
                          type="button"
                          onClick={() => setSelectedDay(item.date)}
                          style={{ backgroundColor: isSelected ? '#0C4B20' : undefined }}
                          className={`flex-1 min-w-[64px] py-2.5 px-2 rounded-2xl flex flex-col items-center transition-all ${
                            isSelected
                              ? 'text-white shadow-sm relative'
                              : 'bg-white text-[#2c1514] hover:bg-[#ffe9e7] border border-stone-200/50'
                          }`}
                        >
                          <span className={`text-[11px] font-medium ${isSelected ? 'text-[#b2f2b6]' : 'text-[#5e5e5f]'}`}>
                            {item.day}
                          </span>
                          <span className={`text-[18px] mt-0.5 ${isSelected ? 'font-bold' : 'font-semibold'}`}>
                            {item.date}
                          </span>
                          {isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full mt-1 bg-[#6DA003]" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* 3 Meal Schedule Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                    
                    {/* Card Pagi */}
                    <article className="flex flex-col bg-white rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all border border-stone-200/60">
                      <div className="h-36 w-full relative">
                        <img
                          className="w-full h-full object-cover"
                          alt="Sayur bening bayam jagung manis dan bakwan"
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCUJtdRGWzTdRnP6dXASiXmkL47HEZzdGwgzTuBW4OAUsnP4CksPpD7YHf5zQxHdVyj1P7CYY-qzLXqK767z4s9jGHCmjHu-w0YRQU6p3CpW9cmV3wInMrmI8K7AuzBjGJd69si1a7Wnuz1AdJ6GVhn72D4fdVawRWiz81BCNv4R10HHnUbt4kVfGSFpJNFcxUn0NWqDHfODD1Y1smwblkJRmGV2e779UvfrAUbCFjv6OA4Yb4M4os-"
                        />
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-sm text-[#2c1514] text-[11px] font-semibold shadow-2xs">
                          <span className="w-2 h-2 rounded-full bg-[#466800]" />
                          <span>PAGI • 06:30</span>
                        </div>
                      </div>

                      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                        <div className="flex flex-col gap-1.5">
                          <h3 className="font-bold text-[15px] text-[#2c1514] leading-snug">
                            Sayur Bening Bayam &amp; Bakwan Jagung
                          </h3>
                          <span className="text-[12px] text-[#306a3b] font-medium">
                            Est. Biaya: Rp 16.000 (4 Porsi)
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="px-2 py-0.5 rounded-md bg-[#ffe9e7] text-[#434937] text-[10px] font-medium">
                              Tinggi Zat Besi
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-[#ffe9e7] text-[#434937] text-[10px] font-medium">
                              Balita &gt;2 Thn
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedRecipe({
                              title: 'Sayur Bening Bayam & Bakwan Jagung',
                              session: 'PAGI • 06:30',
                              cost: 'Rp 16.000 (4 Porsi)',
                              tags: ['Tinggi Zat Besi (Fe 14mg)', 'Kalsium Ca 320mg', 'Balita >2 th'],
                              portionDetail:
                                'Ayu (0.5 porsi - 1 mangkuk kecil), Rian (0.75 porsi), Samantha (1 porsi), Suami (1.25 porsi).',
                            })
                          }
                          className="w-full mt-2 py-2 px-3 rounded-xl bg-[#fff0ef] text-[#2c1514] hover:bg-[#ffe9e7] text-[12px] font-semibold transition-colors flex items-center justify-center gap-1"
                        >
                          <span>Lihat Resep &amp; Porsi</span>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </article>

                    {/* Card Siang */}
                    <article className="flex flex-col bg-white rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all border border-stone-200/60">
                      <div className="h-36 w-full relative">
                        <img
                          className="w-full h-full object-cover"
                          alt="Ayam ungkep bumbu kuning tempe bacem"
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDsFwc-l2HZk092NWOjl7oCe776OquOwcGLgu4MjInBZXQVR3Vdvq57Ishje5If2XKFwzgeXLGGoW5HGKsuRDuIbA7nZ7mI69EhseICZ41yiITP94je1kZxBsslvU1zodo1niOdO3ajIuxxq22rZYnjJ5j7gYV5JsHwlKQBySY08qWCQBOh453Ec_BMRm6ddI5aY4QvRYf4Bf8sLaH5vm6qquMYKz2yf-wc1cPekjgKjhBBksCJLTSP"
                        />
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-sm text-[#2c1514] text-[11px] font-semibold shadow-2xs">
                          <span className="w-2 h-2 rounded-full bg-[#85B620]" />
                          <span>SIANG • 12:30</span>
                        </div>
                      </div>

                      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                        <div className="flex flex-col gap-1.5">
                          <h3 className="font-bold text-[15px] text-[#2c1514] leading-snug">
                            Ayam Ungkep Kuning &amp; Tempe Bacem
                          </h3>
                          <span className="text-[12px] text-[#306a3b] font-medium">
                            Est. Biaya: Rp 32.000 (4 Porsi)
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="px-2 py-0.5 rounded-md bg-[#ffe9e7] text-[#434937] text-[10px] font-medium">
                              Protein 28g
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-[#ffe9e7] text-[#434937] text-[10px] font-medium">
                              Rendah Garam
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedRecipe({
                              title: 'Ayam Ungkep Kuning & Tempe Bacem',
                              session: 'SIANG • 12:30',
                              cost: 'Rp 32.000 (4 Porsi)',
                              tags: ['Protein Hewani & Nabati', 'Rendah Garam', 'Asam Folat'],
                              portionDetail:
                                'Ayu (1/2 potong dada ayam + 1 tempe), Rian (1 potong paha), Samantha (1 potong), Suami (1.5 potong).',
                            })
                          }
                          className="w-full mt-2 py-2 px-3 rounded-xl bg-[#fff0ef] text-[#2c1514] hover:bg-[#ffe9e7] text-[12px] font-semibold transition-colors flex items-center justify-center gap-1"
                        >
                          <span>Lihat Resep &amp; Porsi</span>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </article>

                    {/* Card Malam */}
                    <article className="flex flex-col bg-white rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-all border border-stone-200/60">
                      <div className="h-36 w-full relative">
                        <img
                          className="w-full h-full object-cover"
                          alt="Sup tahu sutra dan tumis buncis"
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCO4l3y2VL8uULay7sf6JsVkBq_4wvi-Zl6y2mP3LbnV7_b68MIe3Co0URwiRj-ooifXqnHlnJhj1fCQPyfIddKNmNSnsBDQRRBKkj0pguYSHNZEmcajsnBK2EyjVzk83_sSdDbJ9a3mPX9YMDUP8lK8JfagE1PU03j_Wa187r-2ouSKsfo8vsBZ-IZYRfUwV5N0gnoxAoE5DXy9IdTvBvmLSKgh1ez2j_i0zfGl2-yOqLphpKt4WDD"
                        />
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-sm text-[#2c1514] text-[11px] font-semibold shadow-2xs">
                          <span className="w-2 h-2 rounded-full bg-[#306a3b]" />
                          <span>MALAM • 18:30</span>
                        </div>
                      </div>

                      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                        <div className="flex flex-col gap-1.5">
                          <h3 className="font-bold text-[15px] text-[#2c1514] leading-snug">
                            Sup Tahu Sutra &amp; Tumis Buncis
                          </h3>
                          <span className="text-[12px] text-[#306a3b] font-medium">
                            Est. Biaya: Rp 22.000 (4 Porsi)
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="px-2 py-0.5 rounded-md bg-[#ffe9e7] text-[#434937] text-[10px] font-medium">
                              Mudah Dicerna
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-[#ffe9e7] text-[#434937] text-[10px] font-medium">
                              Kalsium Lansia
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedRecipe({
                              title: 'Sup Tahu Sutra & Tumis Buncis',
                              session: 'MALAM • 18:30',
                              cost: 'Rp 22.000 (4 Porsi)',
                              tags: ['Tinggi Kalsium Ca', 'Serat Lembut', 'Tekstur Ramah Anak'],
                              portionDetail:
                                'Porsi kuah hangat seimbang untuk santap malam sekeluarga dengan nasi pulen.',
                            })
                          }
                          className="w-full mt-2 py-2 px-3 rounded-xl bg-[#fff0ef] text-[#2c1514] hover:bg-[#ffe9e7] text-[12px] font-semibold transition-colors flex items-center justify-center gap-1"
                        >
                          <span>Lihat Resep &amp; Porsi</span>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </article>

                  </div>
                </section>

              </div>

              {/* RIGHT COLUMN: WIDGET DAFTAR BELANJA PASAR (lg:col-span-4) */}
              <aside
                id="shopping-list-section"
                className="lg:col-span-4 flex flex-col gap-4 rounded-3xl p-6 shadow-xs border border-stone-300/60"
                style={{ backgroundColor: '#E2E0E1' }}
              >
                {/* Header Widget */}
                <div className="flex items-start justify-between">
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
                      <h2 className="text-[18px] font-bold text-[#2c1514] leading-tight">Harus Dibeli</h2>
                      <span className="text-[12px] text-[#5e5e5f]">Pasar Tradisional • 15 - 18 Mei</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-[#5e5e5f] uppercase tracking-wider block font-semibold">
                      Estimasi
                    </span>
                    <span className="text-[15px] font-bold text-[#2c1514] tabular-nums">
                      Rp {totalBelanjaEstimasi.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                {/* Checklist Items */}
                <div className="flex flex-col gap-2 mt-1">
                  {shoppingList.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/85 hover:bg-white cursor-pointer transition-all shadow-2xs group"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => handleToggleCheck(item.id)}
                          className="w-4 h-4 rounded text-[#306a3b] focus:ring-0 accent-[#6DA003] cursor-pointer"
                        />
                        <span
                          className={`text-[13px] transition-colors ${
                            item.checked
                              ? 'line-through text-[#5e5e5f]'
                              : 'text-[#2c1514] font-medium'
                          }`}
                        >
                          {item.name}
                        </span>
                      </div>
                      {item.price > 0 && (
                        <span
                          className={`text-[11px] tabular-nums ${
                            item.checked ? 'text-[#5e5e5f]' : 'text-[#434937] font-semibold'
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
                  className="flex items-center gap-2 bg-white rounded-xl px-3 py-1.5 shadow-2xs border border-stone-200/60"
                >
                  <svg className="w-4 h-4 text-[#5e5e5f]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <input
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    placeholder="Tambah catatan bahan..."
                    className="w-full bg-transparent py-1.5 text-[13px] outline-none text-[#2c1514] placeholder:text-[#5e5e5f]"
                  />
                  <button
                    type="submit"
                    className="text-[12px] text-[#306a3b] font-bold hover:text-[#466800] px-2 py-1"
                  >
                    Simpan
                  </button>
                </form>

                {/* Action Button: WhatsApp */}
                <div className="flex flex-col gap-1.5 mt-1">
                  <button
                    type="button"
                    onClick={handleCopyWhatsApp}
                    style={{ backgroundColor: '#6DA003' }}
                    className="w-full py-3.5 px-4 rounded-2xl text-white font-bold text-[14px] flex items-center justify-center gap-2 shadow-sm transition-all hover:brightness-105 active:scale-98"
                  >
                    {copiedWa ? (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Daftar Disalin ke Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span>Salin ke WhatsApp</span>
                      </>
                    )}
                  </button>
                  <span className="text-[11px] text-[#5e5e5f] text-center leading-tight">
                    Format teks rapi siap kirim ke suami / pedagang sayur langganan
                  </span>
                </div>
              </aside>

            </div>

          </div>
        </main>
      </div>

      {/* ========================================================= */}
      {/* 4. MODAL DETAIL RESEP & PORSI */}
      {/* ========================================================= */}
      {selectedRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div>
                <span className="text-[11px] font-bold text-[#6DA003] uppercase tracking-wider block">
                  {selectedRecipe.session}
                </span>
                <h3 className="text-[20px] font-bold text-[#2c1514]">{selectedRecipe.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecipe(null)}
                className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-800"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4 text-sm">
              <div className="p-3 bg-[#fff0ef] rounded-2xl">
                <span className="text-[11px] text-[#737a65] block font-semibold">Estimasi Biaya:</span>
                <span className="text-[16px] font-bold text-[#2c1514]">{selectedRecipe.cost}</span>
              </div>

              <div>
                <span className="font-bold text-[#2c1514] block mb-1">Nilai Gizi Unggulan:</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedRecipe.tags.map((t) => (
                    <span key={t} className="px-2.5 py-1 rounded-lg bg-[#b2f2b6] text-[#002109] text-xs font-semibold">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="font-bold text-[#2c1514] block mb-1">Pembagian Piring Keluarga:</span>
                <p className="text-stone-600 leading-relaxed text-xs sm:text-sm bg-stone-50 p-3 rounded-xl border border-stone-200/60">
                  {selectedRecipe.portionDetail}
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedRecipe(null)}
                className="px-5 py-2.5 rounded-xl bg-[#0C4B20] text-white font-semibold text-xs hover:bg-[#143118] transition"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. MODAL CATAT PENGELUARAN */}
      {/* ========================================================= */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="text-[18px] font-bold text-[#2c1514]">Catat Pengeluaran Belanja</h3>
              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-800"
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
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#6DA003]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Catatan / Warung</label>
                <input
                  type="text"
                  value={expenseNote}
                  onChange={(e) => setExpenseNote(e.target.value)}
                  placeholder="Contoh: Belanja sayur di Warung Bu Siti"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#6DA003]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 text-xs font-medium hover:bg-stone-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#6DA003] text-white font-bold text-xs hover:brightness-105 shadow-sm"
                >
                  Simpan Pengeluaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. MODAL KEAMANAN: AMANKAN AKUN KELUARGA IBU               */}
      {/* ========================================================= */}
      {showSecurityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#EAF5D8] text-[#0C4B20] flex items-center justify-center text-xl shrink-0">
                  🛡️
                </div>
                <div>
                  <h3 className="text-[18px] font-bold text-[#0D0101] leading-tight">
                    Amankan Akun Keluarga Ibu
                  </h3>
                  <span className="text-[11px] font-semibold text-[#0C4B20]">
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

            <p className="text-[13px] text-[#5F5F5F] mt-3.5 leading-relaxed">
              {isOver24Hours
                ? 'Sudah lebih dari 24 jam akun keluarga Ibu belum memiliki kata sandi. Demi keamanan data keluarga dan anggaran belanja, mohon buat kata sandi baru untuk akun ini sebelum melanjutkan.'
                : 'Ibu baru saja masuk tanpa kata sandi. Silakan buat kata sandi baru untuk melindungi akun keluarga saat masuk kembali.'}
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

      {/* ========================================================= */}
      {/* 7. MODAL ATUR BUDGET BELANJA (BULANAN VS MINGGUAN)        */}
      {/* ========================================================= */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#EAF5D8] text-[#0C4B20] flex items-center justify-center text-xl shrink-0">
                  💰
                </div>
                <div>
                  <h3 className="text-[18px] font-bold text-[#0D0101] leading-tight">
                    Atur Budget Belanja
                  </h3>
                  <span className="text-[11px] font-semibold text-[#0C4B20]">
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

            <p className="text-[13px] text-[#5F5F5F] mt-3.5 leading-relaxed">
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
                  <div className="p-3.5 rounded-2xl bg-[#F6F8F3] border border-[#0C4B20]/15 space-y-1.5 text-xs text-[#0D0101]">
                    <div className="flex items-center justify-between font-bold text-[#0C4B20]">
                      <span>Total Anggaran 1 Bulan:</span>
                      <span className="text-sm tabular-nums">Rp {totalBulanan.toLocaleString('id-ID')}</span>
                    </div>
                    {inputTipeBudget === 'mingguan' && (
                      <p className="text-[11px] text-stone-600">
                        *Dihitung dari Rp {num.toLocaleString('id-ID')} × 4 minggu dalam 1 bulan
                      </p>
                    )}
                    <div className="flex items-center justify-between text-stone-600 pt-1 border-t border-[#0C4B20]/10 text-[11px]">
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
