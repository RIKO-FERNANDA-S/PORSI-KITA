'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Sidebar from '../../components/Sidebar';

interface TransaksiItem {
  id: string;
  day: string; // YYYY-MM-DD
  dayLabel: string;
  desc: string;
  merchant: string;
  time: string;
  amount: number;
  type: 'expense' | 'income';
}

const INITIAL_TRANSACTIONS: TransaksiItem[] = [
  {
    id: 'tx-1',
    day: '2025-05-15',
    dayLabel: 'Kamis, 15 Mei 2025 (Hari Ini)',
    desc: 'Belanja Menu Harian (Bayam, Ayam, Tahu & Bumbu)',
    merchant: 'Warung Sayur Bu Tejo',
    time: '07:15 WIB',
    amount: 70000,
    type: 'expense',
  },
  {
    id: 'tx-2',
    day: '2025-05-14',
    dayLabel: 'Rabu, 14 Mei 2025',
    desc: 'Bahan Ikan Kembung, Sayur Kangkung & Tahu',
    merchant: 'Pasar Minggu Pagi',
    time: '06:45 WIB',
    amount: 98500,
    type: 'expense',
  },
  {
    id: 'tx-3',
    day: '2025-05-12',
    dayLabel: 'Senin, 12 Mei 2025',
    desc: 'Jatah Uang Belanja Mingguan (Minggu ke-3)',
    merchant: 'Transfer Bank Mandiri',
    time: '10:00 WIB',
    amount: 1500000,
    type: 'income',
  },
  {
    id: 'tx-4',
    day: '2025-05-12',
    dayLabel: 'Senin, 12 Mei 2025',
    desc: 'Bumbu Dapur, Tempe, Minyak Goreng',
    merchant: 'Warung Sayur Bu Tejo',
    time: '16:20 WIB',
    amount: 45000,
    type: 'expense',
  },
];

interface WarungLangganan {
  id: string;
  nama: string;
  tag: string;
  count: number;
  totalSpent: number;
}

const INITIAL_WARUNGS: WarungLangganan[] = [
  {
    id: 'w-1',
    nama: 'Warung Sayur Bu Tejo',
    tag: '100m dari rumah',
    count: 12,
    totalSpent: 840000,
  },
  {
    id: 'w-2',
    nama: 'Pasar Minggu Pagi',
    tag: 'Komoditas segar',
    count: 4,
    totalSpent: 920000,
  },
  {
    id: 'w-3',
    nama: 'Tukang Ikan Keliling',
    tag: 'Langganan pagi',
    count: 5,
    totalSpent: 290000,
  },
];

// Helper formatting Rupiah
function formatRp(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

export default function DompetBulananPage() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Financial Ledger State
  const [totalBudget, setTotalBudget] = useState(4500000);
  const [usedBudget, setUsedBudget] = useState(2050000);
  const [remainingBalance, setRemainingBalance] = useState(2450000);
  const [transactions, setTransactions] = useState<TransaksiItem[]>(INITIAL_TRANSACTIONS);
  const [warungs, setWarungs] = useState<WarungLangganan[]>(INITIAL_WARUNGS);

  // Filters state
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [selectedMerchantFilter, setSelectedMerchantFilter] = useState('all');
  const [viewState, setViewState] = useState<'normal' | 'empty' | 'loading' | 'error'>('normal');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'expense' | 'income'>('expense');
  const [modalAmount, setModalAmount] = useState('');
  const [modalMerchant, setModalMerchant] = useState('Warung Sayur Bu Tejo');
  const [modalDesc, setModalDesc] = useState('');

  // Calculations
  const usedBudgetPercent = Math.min(
    100,
    Math.max(0, Math.round((usedBudget / totalBudget) * 100))
  );

  const sisaHari = 17;
  const batasAmanHarian = Math.round(remainingBalance / sisaHari);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchType = filterType === 'all' || t.type === filterType;
      const matchMerchant =
        selectedMerchantFilter === 'all' || t.merchant === selectedMerchantFilter;
      return matchType && matchMerchant;
    });
  }, [transactions, filterType, selectedMerchantFilter]);

  // Group by day
  const groupedDays = useMemo(() => {
    const map = new Map<string, { dayLabel: string; items: TransaksiItem[] }>();
    filteredTransactions.forEach((t) => {
      if (!map.has(t.day)) {
        map.set(t.day, { dayLabel: t.dayLabel, items: [] });
      }
      map.get(t.day)!.items.push(t);
    });
    return Array.from(map.entries());
  }, [filteredTransactions]);

  // Open modal
  const handleOpenModal = (type: 'expense' | 'income') => {
    setModalType(type);
    setModalAmount('');
    setModalDesc('');
    setModalMerchant('Warung Sayur Bu Tejo');
    setModalOpen(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setModalOpen(false);
  };

  // Handle amount change with Indonesian thousand separator
  const handleAmountInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) {
      setModalAmount('');
      return;
    }
    const num = parseInt(raw, 10);
    setModalAmount(num.toLocaleString('id-ID'));
  };

  // Handle Quick Nominal Chip (+10k, +20k, etc.)
  const handleQuickChipAdd = (nominal: number) => {
    const current = parseInt(modalAmount.replace(/\D/g, '') || '0', 10);
    const sum = current + nominal;
    setModalAmount(sum.toLocaleString('id-ID'));
  };

  // Handle Submit New Transaction
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rawNum = parseInt(modalAmount.replace(/\D/g, ''), 10);
    if (!rawNum || rawNum <= 0 || !modalDesc.trim()) return;

    const newTx: TransaksiItem = {
      id: `tx-${Date.now()}`,
      day: '2025-05-15',
      dayLabel: 'Kamis, 15 Mei 2025 (Hari Ini)',
      desc: modalDesc.trim(),
      merchant: modalMerchant,
      time: 'Baru Saja',
      amount: rawNum,
      type: modalType,
    };

    setTransactions((prev) => [newTx, ...prev]);

    // Recalculate ledger balances
    if (modalType === 'expense') {
      setRemainingBalance((prev) => Math.max(0, prev - rawNum));
      setUsedBudget((prev) => prev + rawNum);
      // Update warung stats
      setWarungs((prev) =>
        prev.map((w) =>
          w.nama === modalMerchant
            ? { ...w, count: w.count + 1, totalSpent: w.totalSpent + rawNum }
            : w
        )
      );
    } else {
      setRemainingBalance((prev) => prev + rawNum);
      setTotalBudget((prev) => prev + rawNum);
    }

    handleCloseModal();
  };

  // Handle Edit Prompt
  const handleEditPrompt = (tx: TransaksiItem) => {
    const updated = prompt(
      `Perbarui nominal untuk "${tx.desc}":\n(Contoh: 75000)`,
      String(tx.amount)
    );
    if (updated) {
      const cleanNum = parseInt(updated.replace(/\D/g, ''), 10);
      if (!isNaN(cleanNum) && cleanNum > 0) {
        const diff = cleanNum - tx.amount;
        setTransactions((prev) =>
          prev.map((item) => (item.id === tx.id ? { ...item, amount: cleanNum } : item))
        );
        if (tx.type === 'expense') {
          setUsedBudget((prev) => prev + diff);
          setRemainingBalance((prev) => prev - diff);
        } else {
          setRemainingBalance((prev) => prev + diff);
        }
      }
    }
  };

  // Handle Add New Warung
  const handleAddMerchant = () => {
    const name = prompt('Masukkan nama warung atau pedagang langganan baru:');
    if (name && name.trim()) {
      const trimmed = name.trim();
      const newWarung: WarungLangganan = {
        id: `w-${Date.now()}`,
        nama: trimmed,
        tag: 'Langganan baru',
        count: 0,
        totalSpent: 0,
      };
      setWarungs((prev) => [...prev, newWarung]);
      alert(`Warung "${trimmed}" berhasil ditambahkan.`);
    }
  };

  return (
    <div className="bg-[#fff8f7] font-sans text-[#2c1514] min-h-screen">
      {/* 1. SHARED SIDEBAR COMPONENT */}
      <Sidebar
        activePath="dompet"
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
      />

      {/* 2. TOP HEADER (Desktop & Mobile) */}
      {/* Mobile Sticky Header */}
      <header className="lg:hidden sticky top-0 bg-white/90 backdrop-blur-md border-b border-[#c3c9b2]/30 px-4 h-16 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 -ml-1 rounded-xl text-[#2c1514] hover:bg-stone-100"
            aria-label="Buka navigasi"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-bold text-[17px] text-[#306a3b] tracking-tight">PORSI KITA</span>
        </div>

        <button
          type="button"
          onClick={() => handleOpenModal('expense')}
          className="p-2 rounded-full bg-[#fff0ef] text-[#306a3b] hover:bg-[#ffe2df] transition"
          title="Catat Belanja Baru"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </header>

      {/* Desktop Fixed Header */}
      <header className="hidden lg:flex fixed top-0 left-64 lg:left-72 right-0 h-20 bg-[#fff8f7]/85 backdrop-blur-xl border-b border-[#c3c9b2]/30 z-40 items-center justify-between px-8 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#737a65]">
            Sistem Cipta Rasa
          </span>
          <span className="text-[18px] font-bold text-[#2c1514] tracking-tight">
            PERENCANA DOMESTIK HARMONIS
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#737a65] hover:bg-stone-100 transition-colors"
            aria-label="Notifikasi"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
          <div className="w-9 h-9 rounded-full bg-[#466800] text-white flex items-center justify-center font-bold text-xs shadow-xs">
            B
          </div>
        </div>
      </header>

      {/* 3. MAIN DASHBOARD CONTENT */}
      <main className="lg:pl-64 lg:pl-72 pt-4 lg:pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col gap-6">

          {/* TOP HEADER SECTION */}
          <header className="flex flex-col gap-2">
            <div className="inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full bg-[#b2f2b6] text-[#367041] text-xs font-semibold">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span>Mei 2025 • Dompet Bulanan Keluarga</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 pt-1">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2c1514] tracking-tight">
                  Dompet Bulanan Keluarga
                </h1>
                <p className="text-[14px] sm:text-[15px] text-[#5e5e5f] mt-1">
                  Kelola jatah uang belanja bulanan dan catat pengeluaran harian dengan mudah.
                </p>
              </div>
            </div>
          </header>

          {/* 12-COLUMN MAIN CONTENT GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* LEFT COLUMN (8 Cols) */}
            <div className="lg:col-span-8 flex flex-col gap-6">

              {/* HERO CARD: STATUS AMPLOP DAPUR BULAN INI */}
              <section className="bg-[#306a3b] text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
                  {/* Left: Saldo and Total Info */}
                  <div className="flex flex-col">
                    <span className="text-[12px] font-semibold tracking-wider text-white/80 uppercase">
                      SISA SALDO DOMPET (MEI 2025)
                    </span>
                    <div className="text-[36px] sm:text-[44px] font-extrabold text-white tracking-tight mt-1 font-mono">
                      {formatRp(remainingBalance)}
                    </div>
                    <p className="text-[13px] text-white/85 mt-1 font-medium">
                      Dari total anggaran bulanan {formatRp(totalBudget)}
                    </p>
                  </div>

                  {/* Right: Tombol Catat Belanja & Tambah Saldo (DIATUR ATAS-BAWAH) */}
                  <div className="flex flex-col gap-2.5 w-full sm:w-56 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenModal('expense')}
                      className="w-full min-h-[48px] bg-[#6da003] hover:bg-[#466800] text-white font-bold px-5 py-3 rounded-full inline-flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer active:scale-98"
                    >
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Catat Belanja</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenModal('income')}
                      className="w-full min-h-[48px] bg-white/15 hover:bg-white/25 text-white font-bold px-5 py-3 rounded-full inline-flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-98"
                    >
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>Tambah Saldo</span>
                    </button>
                  </div>
                </div>

                {/* Progress Bar & Limits */}
                <div className="mt-6 pt-5 border-t border-white/20">
                  <div className="flex justify-between text-[13px] text-white/90 mb-2 font-medium">
                    <span>Pemakaian Dompet Bulanan</span>
                    <span className="font-semibold">
                      {formatRp(usedBudget)} terpakai ({usedBudgetPercent}%)
                    </span>
                  </div>

                  <div className="w-full h-3 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full bg-[#6da003] rounded-full transition-all duration-300"
                      style={{ width: `${usedBudgetPercent}%` }}
                    />
                  </div>

                  <div className="mt-4 bg-white/10 rounded-2xl px-4 py-3 flex items-center gap-3 text-white text-[13px]">
                    <svg className="w-5 h-5 text-[#b2f2b6] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>
                      Batas Aman Harian: <strong className="text-white font-bold">{formatRp(batasAmanHarian)}</strong> / hari untuk {sisaHari} hari sisa bulan ini.{' '}
                      <strong className="text-[#b2f2b6] font-semibold">
                        {batasAmanHarian >= 100000 ? 'Status: Anggaran Aman.' : 'Status: Waspada Anggaran.'}
                      </strong>
                    </span>
                  </div>
                </div>
              </section>

              {/* FILTER & SEARCH BAR */}
              <section className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-stone-200/70 shadow-xs">
                <div aria-label="Kategori Catatan" className="flex flex-wrap items-center gap-1.5" role="tablist">
                  <button
                    type="button"
                    onClick={() => setFilterType('all')}
                    className={`min-h-[42px] px-4 py-2 rounded-xl text-[13px] font-bold transition-colors cursor-pointer ${
                      filterType === 'all'
                        ? 'bg-[#306a3b] text-white shadow-xs'
                        : 'text-[#5e5e5f] hover:bg-[#fff0ef] hover:text-[#2c1514]'
                    }`}
                  >
                    Semua Catatan
                  </button>

                  <button
                    type="button"
                    onClick={() => setFilterType('expense')}
                    className={`min-h-[42px] px-4 py-2 rounded-xl text-[13px] font-bold transition-colors cursor-pointer ${
                      filterType === 'expense'
                        ? 'bg-[#306a3b] text-white shadow-xs'
                        : 'text-[#5e5e5f] hover:bg-[#fff0ef] hover:text-[#2c1514]'
                    }`}
                  >
                    Pengeluaran Pasar
                  </button>

                  <button
                    type="button"
                    onClick={() => setFilterType('income')}
                    className={`min-h-[42px] px-4 py-2 rounded-xl text-[13px] font-bold transition-colors cursor-pointer ${
                      filterType === 'income'
                        ? 'bg-[#306a3b] text-white shadow-xs'
                        : 'text-[#5e5e5f] hover:bg-[#fff0ef] hover:text-[#2c1514]'
                    }`}
                  >
                    Saldo Masuk
                  </button>
                </div>

                <div className="relative border-l border-stone-200 pl-3">
                  <select
                    aria-label="Pilih Warung Langganan"
                    value={selectedMerchantFilter}
                    onChange={(e) => setSelectedMerchantFilter(e.target.value)}
                    className="min-h-[40px] pr-8 pl-2 rounded-xl bg-transparent hover:bg-[#fff0ef] text-[#2c1514] text-[13px] font-medium cursor-pointer appearance-none transition-colors"
                  >
                    <option value="all">Semua Warung ▾</option>
                    {warungs.map((w) => (
                      <option key={w.id} value={w.nama}>
                        {w.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </section>

              {/* TRANSACTIONS CONTAINER (WITH 4 VIEW STATES) */}
              <div className="space-y-6">

                {/* STATE 1: NORMAL VIEW */}
                {viewState === 'normal' && (
                  <div className="space-y-6">
                    {groupedDays.length === 0 ? (
                      <div className="bg-white rounded-3xl p-10 text-center flex flex-col items-center justify-center space-y-3 border border-stone-200/60 shadow-xs">
                        <div className="w-16 h-16 rounded-full bg-[#fff0ef] flex items-center justify-center text-[#737a65]">
                          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                        </div>
                        <h3 className="text-base font-bold text-[#2c1514]">
                          Tidak ada catatan untuk filter ini
                        </h3>
                        <p className="text-xs text-[#737a65]">
                          Coba ganti filter kategori atau warung di atas.
                        </p>
                      </div>
                    ) : (
                      groupedDays.map(([dayKey, group]) => {
                        const dayExpenses = group.items
                          .filter((t) => t.type === 'expense')
                          .reduce((sum, t) => sum + t.amount, 0);
                        const dayIncomes = group.items
                          .filter((t) => t.type === 'income')
                          .reduce((sum, t) => sum + t.amount, 0);

                        return (
                          <div key={dayKey} className="space-y-3">
                            <div className="flex items-center justify-between px-2">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#6da003]" />
                                <h3 className="text-[16px] font-bold text-[#2c1514]">
                                  {group.dayLabel}
                                </h3>
                              </div>
                              <span className="text-[12px] text-[#737a65]">
                                {dayIncomes > 0 && (
                                  <>
                                    Total Masuk:{' '}
                                    <strong className="text-[#306a3b]">
                                      + {formatRp(dayIncomes)}
                                    </strong>
                                    {' • '}
                                  </>
                                )}
                                Total Keluar:{' '}
                                <strong className="text-[#2c1514]">
                                  - {formatRp(dayExpenses)}
                                </strong>
                              </span>
                            </div>

                            {/* Items in this Day */}
                            <div className="space-y-2.5">
                              {group.items.map((item) => {
                                const isExp = item.type === 'expense';
                                return (
                                  <div
                                    key={item.id}
                                    className="bg-white rounded-3xl p-5 shadow-xs border border-stone-200/70 flex items-center justify-between gap-4 transition-all hover:shadow-sm"
                                  >
                                    <div className="flex items-center gap-4 min-w-0">
                                      <div
                                        className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                                          isExp
                                            ? 'bg-[#fff0ef] text-[#ba1a1a]'
                                            : 'bg-[#b2f2b6] text-[#367041]'
                                        }`}
                                      >
                                        {isExp ? (
                                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                          </svg>
                                        ) : (
                                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                          </svg>
                                        )}
                                      </div>

                                      <div className="flex flex-col min-w-0">
                                        <h4 className="font-semibold text-[15px] sm:text-[16px] text-[#2c1514] leading-snug truncate">
                                          {item.desc}
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[#737a65] text-[12px]">
                                          <span className="inline-flex items-center gap-1 font-medium">
                                            <span>📍</span> {item.merchant}
                                          </span>
                                          <span>•</span>
                                          <span>{item.time}</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0 ml-2">
                                      <span
                                        className={`font-mono font-bold text-[15px] sm:text-[17px] whitespace-nowrap ${
                                          isExp ? 'text-[#2c1514]' : 'text-[#306a3b]'
                                        }`}
                                      >
                                        {isExp ? '-' : '+'} {formatRp(item.amount)}
                                      </span>

                                      <button
                                        type="button"
                                        onClick={() => handleEditPrompt(item)}
                                        className="min-h-[40px] px-3.5 rounded-xl bg-[#fff0ef] hover:bg-[#ffe2df] text-[#2c1514] text-[12px] font-semibold transition-colors cursor-pointer"
                                      >
                                        Ubah
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* STATE 2: EMPTY VIEW */}
                {viewState === 'empty' && (
                  <div className="bg-white rounded-3xl p-10 shadow-xs border border-stone-200/70 text-center flex flex-col items-center justify-center space-y-4">
                    <div className="w-20 h-20 rounded-full bg-[#fff0ef] flex items-center justify-center text-[#737a65]">
                      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <div className="max-w-md space-y-1">
                      <h3 className="text-lg font-bold text-[#2c1514]">
                        Belum Ada Catatan Belanja Bulan Ini
                      </h3>
                      <p className="text-sm text-[#737a65]">
                        Setiap kali Ibu selesai belanja dari pasar atau warung, tekan tombol Catat Belanja di atas.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenModal('expense')}
                      className="min-h-[48px] bg-[#306a3b] text-white px-6 rounded-full font-bold text-sm hover:bg-[#155126] transition-colors cursor-pointer"
                    >
                      + Mulai Catat Belanja Pertama
                    </button>
                  </div>
                )}

                {/* STATE 3: LOADING SKELETON */}
                {viewState === 'loading' && (
                  <div className="space-y-3">
                    {[1, 2, 3].map((n) => (
                      <div
                        key={n}
                        className="bg-white rounded-3xl p-5 shadow-xs border border-stone-200/70 animate-pulse flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-stone-100" />
                          <div className="space-y-2">
                            <div className="w-48 h-4 bg-stone-100 rounded-md" />
                            <div className="w-32 h-3 bg-stone-100 rounded-md" />
                          </div>
                        </div>
                        <div className="w-24 h-5 bg-stone-100 rounded-md" />
                      </div>
                    ))}
                  </div>
                )}

                {/* STATE 4: ERROR VIEW */}
                {viewState === 'error' && (
                  <div className="bg-[#fff0ef] rounded-3xl p-8 shadow-xs border border-red-200 flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-red-100 text-[#ba1a1a] flex items-center justify-center">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="max-w-md">
                      <h3 className="text-lg font-bold text-[#ba1a1a]">Koneksi Terputus</h3>
                      <p className="text-sm text-[#93000a] mt-1">
                        Gagal memuat catatan dompet bulanan. Periksa koneksi internet Ibu lalu coba lagi.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewState('normal')}
                      className="min-h-[48px] px-6 rounded-full bg-[#ba1a1a] text-white font-bold text-sm hover:opacity-90 transition-opacity"
                    >
                      Muat Ulang Catatan
                    </button>
                  </div>
                )}

                {/* UI State Switcher Pills (Prototype Support) */}
                <div className="pt-2 flex items-center justify-center">
                  <div className="flex items-center gap-1 p-1 rounded-full bg-[#fff0ef] border border-stone-200/60">
                    <span className="text-[11px] text-[#737a65] px-2 font-medium">
                      Pratinjau Status:
                    </span>
                    <button
                      type="button"
                      onClick={() => setViewState('normal')}
                      className={`min-h-[28px] px-3 rounded-full text-[11px] transition-all cursor-pointer ${
                        viewState === 'normal'
                          ? 'bg-white text-[#2c1514] font-bold shadow-2xs'
                          : 'text-[#737a65] hover:text-[#2c1514]'
                      }`}
                    >
                      Data Normal
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewState('empty')}
                      className={`min-h-[28px] px-3 rounded-full text-[11px] transition-all cursor-pointer ${
                        viewState === 'empty'
                          ? 'bg-white text-[#2c1514] font-bold shadow-2xs'
                          : 'text-[#737a65] hover:text-[#2c1514]'
                      }`}
                    >
                      Kosong
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewState('loading')}
                      className={`min-h-[28px] px-3 rounded-full text-[11px] transition-all cursor-pointer ${
                        viewState === 'loading'
                          ? 'bg-white text-[#2c1514] font-bold shadow-2xs'
                          : 'text-[#737a65] hover:text-[#2c1514]'
                      }`}
                    >
                      Memuat
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewState('error')}
                      className={`min-h-[28px] px-3 rounded-full text-[11px] transition-all cursor-pointer ${
                        viewState === 'error'
                          ? 'bg-white text-[#2c1514] font-bold shadow-2xs'
                          : 'text-[#737a65] hover:text-[#2c1514]'
                      }`}
                    >
                      Gangguan
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* RIGHT COLUMN (4 Cols) */}
            <div className="lg:col-span-4 flex flex-col gap-6">

              {/* WIDGET 1: TEMPAT BELANJA LANGGANAN */}
              <section className="bg-[#fff0ef]/80 rounded-3xl p-6 space-y-4 shadow-xs border border-stone-200/50">
                <div>
                  <h2 className="text-[17px] font-bold text-[#2c1514]">
                    Warung &amp; Pasar Langganan
                  </h2>
                  <p className="text-[12px] text-[#737a65] mt-0.5">
                    Tempat belanja favorit keluarga bulan ini.
                  </p>
                </div>

                <div className="space-y-3">
                  {warungs.map((w) => (
                    <div
                      key={w.id}
                      className="bg-white rounded-2xl p-4 shadow-2xs border border-stone-200/60 transition-all hover:shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-[14px] text-[#2c1514]">{w.nama}</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#b2f2b6] text-[#367041] text-[10px] font-bold whitespace-nowrap">
                          {w.tag}
                        </span>
                      </div>
                      <div className="border-t border-stone-100 pt-2 mt-2 flex items-center justify-between text-[12px] text-[#737a65]">
                        <span>{w.count}x Belanja</span>
                        <span className="font-bold text-[#2c1514] font-mono">
                          Total: {formatRp(w.totalSpent)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddMerchant}
                  className="w-full min-h-[46px] rounded-full bg-white hover:bg-[#ffe2df] text-[#306a3b] font-bold text-[13px] flex items-center justify-center gap-2 transition-colors cursor-pointer border border-stone-200/60 shadow-2xs"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>+ Tambah Warung Langganan</span>
                </button>
              </section>

              {/* WIDGET 2: EVALUASI HEMAT DAPUR */}
              <section className="bg-[#fff0ef] rounded-3xl p-6 shadow-xs border border-stone-200/50 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#bbf45e] flex items-center justify-center text-[#121f00]">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-[16px] text-[#2c1514]">
                    Catatan Penghematan Ibu
                  </h3>
                </div>

                <p className="text-[13px] text-[#2c1514] leading-relaxed">
                  Minggu ini Ibu menghemat <span className="font-bold text-[#306a3b]">{formatRp(65000)}</span> karena memasak sesuai takaran porsi keluarga tanpa ada lauk yang terbuang.
                </p>

                <div className="pt-2 flex items-center gap-2 text-[#466800] text-[12px] font-semibold">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>0% Makanan terbuang (Food Waste Nihil)</span>
                </div>
              </section>

              {/* WIDGET 3: TIPS BELANJA HARI INI */}
              <section className="bg-white rounded-3xl p-6 shadow-xs border border-stone-200/70 space-y-2">
                <span className="text-[11px] font-bold text-[#737a65] uppercase tracking-wider">
                  Tips Belanja Cerdas
                </span>
                <h4 className="font-bold text-[14px] text-[#2c1514]">
                  Beli Telur &amp; Tahu Hari Ini?
                </h4>
                <p className="text-[13px] text-[#5e5e5f] leading-relaxed">
                  Harga telur di Warung Bu Tejo sedang normal {formatRp(28000)}/kg. Sangat cocok untuk stok lauk tinggi protein 3 hari ke depan.
                </p>
              </section>

            </div>

          </div>

        </div>
      </main>

      {/* 4. MODAL CATAT BELANJA / TAMBAH SALDO */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-200 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h2 className="text-xl font-bold text-[#2c1514]">
                {modalType === 'expense' ? 'Catat Pengeluaran Belanja' : 'Tambah Saldo Dompet'}
              </h2>
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-[#737a65] flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Tutup Formulir"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Step 1: Type toggle pills */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-[#737a65]">Jenis Catatan</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalType('expense')}
                    className={`min-h-[46px] rounded-full text-[13px] font-bold transition-all cursor-pointer ${
                      modalType === 'expense'
                        ? 'bg-[#306a3b] text-white shadow-xs'
                        : 'bg-[#fff0ef] text-[#737a65]'
                    }`}
                  >
                    Belanja Dapur (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalType('income')}
                    className={`min-h-[46px] rounded-full text-[13px] font-bold transition-all cursor-pointer ${
                      modalType === 'income'
                        ? 'bg-[#306a3b] text-white shadow-xs'
                        : 'bg-[#fff0ef] text-[#737a65]'
                    }`}
                  >
                    Uang Masuk (+)
                  </button>
                </div>
              </div>

              {/* Step 2: Masukkan Jumlah Uang (Rp) */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-[#737a65]">
                  Masukkan Jumlah Uang (Rp)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[#737a65] text-[18px] font-mono pointer-events-none select-none">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={modalAmount}
                    onChange={handleAmountInputChange}
                    placeholder="0"
                    className="w-full min-h-[52px] pl-14 pr-4 rounded-2xl bg-[#fff0ef] text-[20px] font-bold text-[#2c1514] font-mono focus:outline-none focus:ring-2 focus:ring-[#306a3b]"
                  />
                </div>

                {/* 4 Quick Nominal Chips */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {[10000, 20000, 50000, 100000].map((nominal) => (
                    <button
                      key={nominal}
                      type="button"
                      onClick={() => handleQuickChipAdd(nominal)}
                      className="min-h-[34px] px-3.5 rounded-full bg-[#fff0ef] hover:bg-[#ffe2df] text-[#2c1514] text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      + {formatRp(nominal)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3: Beli di Mana? Selectable pills */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-[#737a65]">
                  {modalType === 'expense' ? 'Beli di Mana?' : 'Sumber Saldo'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Warung Sayur Bu Tejo',
                    'Pasar Minggu Pagi',
                    'Tukang Ikan Keliling',
                    'Transfer Bank Mandiri',
                  ].map((merchant) => (
                    <button
                      key={merchant}
                      type="button"
                      onClick={() => setModalMerchant(merchant)}
                      className={`min-h-[38px] px-3.5 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
                        modalMerchant === merchant
                          ? 'bg-[#306a3b] text-white shadow-2xs'
                          : 'bg-[#fff0ef] text-[#737a65]'
                      }`}
                    >
                      {merchant}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 4: Catatan Singkat & quick chips */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-[#737a65]">
                  Catatan Singkat / Bahan Belanja
                </label>
                <input
                  type="text"
                  required
                  value={modalDesc}
                  onChange={(e) => setModalDesc(e.target.value)}
                  placeholder="Contoh: Sayur bayam, telur, bumbu masak"
                  className="w-full min-h-[46px] px-4 rounded-xl bg-[#fff0ef] text-[14px] text-[#2c1514] focus:outline-none focus:ring-2 focus:ring-[#306a3b]"
                />
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    'Belanja Menu Harian',
                    'Beli Beras & Minyak',
                    'Lauk Siang & Sayur',
                    'Jatah Belanja Mingguan',
                  ].map((descChip) => (
                    <button
                      key={descChip}
                      type="button"
                      onClick={() => setModalDesc(descChip)}
                      className="min-h-[30px] px-2.5 rounded-full bg-[#fff0ef] text-[#737a65] text-[11px] hover:text-[#2c1514] transition-colors cursor-pointer"
                    >
                      {descChip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Submit Buttons */}
              <div className="pt-3 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="min-h-[46px] px-5 rounded-full bg-stone-100 hover:bg-stone-200 text-[#2c1514] text-[13px] font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[46px] rounded-full bg-[#6da003] hover:bg-[#466800] text-white font-bold text-[13px] shadow-sm transition-all cursor-pointer"
                >
                  Simpan ke Dompet Bulanan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
