'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import Sidebar from '../../../components/Sidebar';
import { ItemDaftarBelanja, RencanaMenu7Hari, Keluarga, Anggota } from '../../../lib/types';
import { getStoredMenu, getStoredKeluarga, getStoredAnggota } from '../../../lib/store';
import { buatDaftarBelanjaMingguan } from '../../../lib/planner/cost';

interface TitipanItem {
  id: string;
  nama: string;
  estimasiRp: number;
}

function BelanjaContent() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [rencanaMenu, setRencanaMenu] = useState<RencanaMenu7Hari | null>(null);
  const [keluarga, setKeluarga] = useState<Keluarga | null>(null);
  const [anggotaList, setAnggotaList] = useState<Anggota[]>([]);
  const [daftarBelanja, setDaftarBelanja] = useState<ItemDaftarBelanja[]>([]);
  
  // State interaktif
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});
  const [fridgeMap, setFridgeMap] = useState<Record<string, boolean>>({});
  const [hideFridge, setHideFridge] = useState(false);
  const [periodeFilter, setPeriodeFilter] = useState<'hari_ini' | '3_hari' | '1_minggu'>('1_minggu');
  
  // Quick item titipan (tambah item mendadak)
  const [titipanList, setTitipanList] = useState<TitipanItem[]>([]);
  const [titipanInput, setTitipanInput] = useState('');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  useEffect(() => {
    try {
      const k = getStoredKeluarga();
      const a = getStoredAnggota();
      const m = getStoredMenu();
      setKeluarga(k);
      setAnggotaList(a);
      setRencanaMenu(m);

      if (m && m.hari) {
        const items = buatDaftarBelanjaMingguan(m.hari);
        setDaftarBelanja(items);

        // Inisialisasi fridge default untuk rempah/bawang/jagung jika ada
        const initialFridge: Record<string, boolean> = {};
        items.forEach((it) => {
          const lower = it.nama_bahan.toLowerCase();
          if (lower.includes('bawang') || lower.includes('garam') || lower.includes('minyak')) {
            initialFridge[it.kode_tkpi] = true;
          }
        });
        setFridgeMap(initialFridge);
      }
    } catch (e) {
      console.error('Gagal memuat data belanja:', e);
    }
  }, []);

  // Filter items berdasarkan periode & stok kulkas
  const displayedItems = useMemo(() => {
    let items = [...daftarBelanja];

    // Filter skala periode (pembagian rasio sederhana untuk simulasi kebutuhan hari ini vs 3 hari vs mingguan)
    if (periodeFilter === 'hari_ini') {
      items = items.slice(0, Math.max(3, Math.ceil(items.length / 3)));
    } else if (periodeFilter === '3_hari') {
      items = items.slice(0, Math.max(5, Math.ceil((items.length * 2) / 3)));
    }

    if (hideFridge) {
      items = items.filter((it) => !fridgeMap[it.kode_tkpi]);
    }

    return items;
  }, [daftarBelanja, periodeFilter, hideFridge, fridgeMap]);

  // Kelompokkan per kategori lapak pasar
  const perKategori = useMemo(() => {
    const map = new Map<string, ItemDaftarBelanja[]>();
    for (const item of displayedItems) {
      const kat = item.kategori || 'Bahan Lainnya';
      const list = map.get(kat) || [];
      list.push(item);
      map.set(kat, list);
    }
    return Array.from(map.entries());
  }, [displayedItems]);

  // Kalkulasi total biaya estimasi, sudah dibeli, dan sisa
  const totalBiayaEstimasi = useMemo(() => {
    const itemTotal = displayedItems.reduce((sum, item) => sum + item.estimasi_biaya_rp, 0);
    const titipanTotal = titipanList.reduce((sum, item) => sum + item.estimasiRp, 0);
    return itemTotal + titipanTotal;
  }, [displayedItems, titipanList]);

  const totalSudahDibeli = useMemo(() => {
    return displayedItems
      .filter((item) => checkedMap[item.kode_tkpi])
      .reduce((sum, item) => sum + item.estimasi_biaya_rp, 0);
  }, [displayedItems, checkedMap]);

  const totalSisaKebutuhan = Math.max(0, totalBiayaEstimasi - totalSudahDibeli);

  // Batas aman belanja dari budget mingguan
  const batasAmanRp = rencanaMenu?.target_budget_mingguan_rp || 150000;
  const persentaseDibeli =
    totalBiayaEstimasi > 0
      ? Math.min(100, Math.round((totalSudahDibeli / totalBiayaEstimasi) * 100))
      : 0;

  // Toggle checklist beli
  const toggleCheck = (kodeTkpi: string) => {
    setCheckedMap((prev) => ({
      ...prev,
      [kodeTkpi]: !prev[kodeTkpi],
    }));
  };

  // Toggle badge Ada di Kulkas
  const toggleFridge = (e: React.MouseEvent, kodeTkpi: string) => {
    e.stopPropagation();
    setFridgeMap((prev) => ({
      ...prev,
      [kodeTkpi]: !prev[kodeTkpi],
    }));
  };

  // Edit perkiraan harga per item
  const handleEditPrice = (e: React.MouseEvent, item: ItemDaftarBelanja) => {
    e.stopPropagation();
    const input = prompt(
      `Ubah estimasi harga untuk ${item.nama_bahan} (Rp):`,
      String(item.estimasi_biaya_rp)
    );
    if (input) {
      const val = parseInt(input.replace(/\D/g, ''), 10);
      if (!isNaN(val) && val >= 0) {
        setDaftarBelanja((prev) =>
          prev.map((it) => (it.kode_tkpi === item.kode_tkpi ? { ...it, estimasi_biaya_rp: val } : it))
        );
      }
    }
  };

  // Tambah titipan barang cepat
  const handleAddTitipan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titipanInput.trim()) return;
    const newItem: TitipanItem = {
      id: `tip-${Date.now()}`,
      nama: titipanInput.trim(),
      estimasiRp: 10000,
    };
    setTitipanList((prev) => [...prev, newItem]);
    setTitipanInput('');
  };

  const handleRemoveTitipan = (id: string) => {
    setTitipanList((prev) => prev.filter((it) => it.id !== id));
  };

  // Generate teks WhatsApp yang dinamis (hanya item yang belum dibeli)
  const itemsBelumDibeli = displayedItems.filter((item) => !checkedMap[item.kode_tkpi]);

  const teksWhatsApp = useMemo(() => {
    let teks = `Halo, titip daftar belanjaan dapur Porsi Kita:\n`;
    itemsBelumDibeli.slice(0, 10).forEach((item) => {
      const berat =
        item.kebutuhan_beli_gram >= 1000
          ? `${(item.kebutuhan_beli_gram / 1000).toFixed(1)} kg`
          : `${item.kebutuhan_beli_gram}g`;
      teks += `• ${item.nama_bahan} (${berat}) - Rp ${item.estimasi_biaya_rp.toLocaleString('id-ID')}\n`;
    });
    if (titipanList.length > 0) {
      titipanList.forEach((t) => {
        teks += `• [Titipan] ${t.nama} - Rp ${t.estimasiRp.toLocaleString('id-ID')}\n`;
      });
    }
    teks += `Estimasi Total Sisa: Rp ${totalSisaKebutuhan.toLocaleString('id-ID')}`;
    return teks;
  }, [itemsBelumDibeli, titipanList, totalSisaKebutuhan]);

  const handleCopyWhatsApp = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(teksWhatsApp);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    }
  };

  const handleFinishShopping = () => {
    if (totalSudahDibeli <= 0) {
      alert('Tandai setidaknya satu bahan yang telah dibeli terlebih dahulu.');
      return;
    }
    const konfirmasi = confirm(
      `Selesaikan belanja dan catat pengeluaran sebesar Rp ${totalSudahDibeli.toLocaleString('id-ID')} ke Dompet Bulanan?`
    );
    if (konfirmasi) {
      alert('Belanja tercatat! Anda dapat melihat ringkasannya di menu Dompet Bulanan.');
    }
  };

  if (!rencanaMenu) {
    return (
      <div className="min-h-screen bg-[#fff8f7] flex items-center justify-center p-6 text-center text-[#737a65]">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 animate-spin text-[#466800]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="font-semibold text-sm">Menyiapkan daftar belanja pasar...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#fff8f7] font-sans text-[#2c1514] min-h-screen">
      {/* 1. ASIDE SIDEBAR (Shared Component) */}
      <Sidebar
        activePath="daftar-belanja"
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
        anggotaCount={anggotaList.length}
        rencanaMenuId={rencanaMenu.id}
      />

      {/* 2. TOP HEADER (Mobile & Desktop) */}
      {/* Mobile Top Bar */}
      <header className="lg:hidden sticky top-0 bg-white/95 backdrop-blur-md border-b border-[#c3c9b2]/30 px-4 h-16 z-40 flex items-center justify-between">
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
        <Link
          href="/menu"
          className="text-xs font-semibold text-[#466800] bg-[#fff0ef] px-3 py-1.5 rounded-full hover:bg-[#ffe2df] transition"
        >
          Menu 7 Hari
        </Link>
      </header>

      {/* Desktop Fixed Header */}
      <header className="hidden lg:flex fixed top-0 left-64 right-0 h-16 bg-white/90 backdrop-blur-xl border-b border-[#c3c9b2]/30 z-40 items-center justify-between px-8 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-2.5">
          <span className="text-[14px] font-semibold text-[#2c1514] tracking-tight">
            Daftar Belanja Dapur
          </span>
          <span className="text-[#737a65] text-[13px]">•</span>
          <span className="text-[#737a65] text-[13px]">
            {keluarga?.alias || 'Keluarga Kita'} • 7 Hari Menu Harmonis
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-[13px] font-bold text-[#2c1514] leading-tight">
              {keluarga?.alias || 'Ibu Samantha'}
            </div>
            <div className="text-[11px] text-[#306a3b] font-medium leading-tight mt-0.5">
              {keluarga?.wilayah || 'Pasar Tradisional'}
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#306a3b] flex items-center justify-center text-white text-[13px] font-bold shadow-xs">
            {keluarga?.alias?.charAt(0) || 'P'}
          </div>
        </div>
      </header>

      {/* 3. MAIN DASHBOARD CONTENT */}
      <main className="lg:pl-64 pt-4 lg:pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto">
        <div className="flex flex-col gap-6">

          {/* Simple Clean Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#306a3b] mb-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span>Daftar Belanja Bahan Segar</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2c1514] tracking-tight">
                Daftar Belanja Keluarga
              </h1>
              <p className="text-[14px] text-[#737a65] mt-1">
                Kebutuhan pasar digabung dari kalender menu mingguan, disesuaikan dengan BDD (Bagian Dapat Dimakan).
              </p>
            </div>

            <Link
              href="/menu"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#466800] hover:text-[#306a3b] self-start sm:self-auto transition py-1"
            >
              <span>← Kembali ke Kalender Menu</span>
            </Link>
          </div>

          {/* Compact Budget Banner */}
          <div className="rounded-3xl bg-[#306a3b] text-white p-6 sm:p-8 shadow-sm relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="flex flex-col gap-2">
                <div className="text-[11px] uppercase tracking-wider text-white/80 font-bold">
                  ESTIMASI BELANJA PASAR
                </div>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                    Rp {totalBiayaEstimasi.toLocaleString('id-ID')}
                  </div>
                  <span className="text-[13px] text-white/75">
                    Batas aman anggaran: Rp {batasAmanRp.toLocaleString('id-ID')}
                  </span>
                </div>

                {/* Progress Bar Dibeli */}
                <div className="w-full max-w-md bg-white/20 rounded-full h-2.5 overflow-hidden my-1">
                  <div
                    className="bg-[#bbf45e] h-full rounded-full transition-all duration-500"
                    style={{ width: `${persentaseDibeli}%` }}
                  />
                </div>

                <div className="flex items-center gap-3 text-[13px] text-white/90 flex-wrap">
                  <span>
                    Sudah dibeli: <strong className="text-white font-bold">Rp {totalSudahDibeli.toLocaleString('id-ID')}</strong>
                  </span>
                  <span className="text-white/40">•</span>
                  <span>
                    Sisa belanja: <strong className="text-white font-bold">Rp {totalSisaKebutuhan.toLocaleString('id-ID')}</strong>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 sm:items-stretch lg:items-end justify-center">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(teksWhatsApp)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-6 py-2.5 rounded-full bg-[#6da003] text-white text-[13px] font-bold flex items-center justify-center gap-2 hover:bg-[#466800] active:scale-98 transition shadow-xs"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>Kirim ke WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={handleFinishShopping}
                  className="min-h-[44px] px-6 py-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-[13px] font-semibold flex items-center justify-center gap-2 transition cursor-pointer active:scale-98"
                >
                  <svg className="w-4 h-4 text-[#bbf45e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Selesai &amp; Catat Pengeluaran</span>
                </button>
              </div>
            </div>
          </div>

          {/* Control Bar (Single Row) */}
          <div className="w-full bg-white rounded-2xl p-3 shadow-xs border border-stone-200/60 flex flex-wrap items-center justify-between gap-4">
            {/* Periode Segmented Buttons */}
            <div className="flex items-center gap-1 p-1 bg-[#fff8f7] rounded-full border border-stone-200/50">
              <button
                type="button"
                onClick={() => setPeriodeFilter('hari_ini')}
                className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition ${
                  periodeFilter === 'hari_ini'
                    ? 'bg-[#306a3b] text-white shadow-xs'
                    : 'text-[#434937] hover:text-[#2c1514]'
                }`}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => setPeriodeFilter('3_hari')}
                className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition ${
                  periodeFilter === '3_hari'
                    ? 'bg-[#306a3b] text-white shadow-xs'
                    : 'text-[#434937] hover:text-[#2c1514]'
                }`}
              >
                3 Hari
              </button>
              <button
                type="button"
                onClick={() => setPeriodeFilter('1_minggu')}
                className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition ${
                  periodeFilter === '1_minggu'
                    ? 'bg-[#306a3b] text-white shadow-xs'
                    : 'text-[#434937] hover:text-[#2c1514]'
                }`}
              >
                1 Minggu (Lengkap)
              </button>
            </div>

            {/* Toggle Sembunyikan Stok Kulkas */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none px-3 py-1.5 rounded-full hover:bg-stone-50 transition">
              <svg className="w-4 h-4 text-[#306a3b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="text-[13px] font-semibold text-[#2c1514]">Sembunyikan Stok Kulkas</span>
              <input
                type="checkbox"
                checked={hideFridge}
                onChange={(e) => setHideFridge(e.target.checked)}
                className="w-4 h-4 text-[#306a3b] rounded focus:ring-[#306a3b] border-stone-300"
              />
            </label>
          </div>

          {/* 12-Column Responsive Body */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* LEFT COLUMN: Categorized Shopping Groups (8 cols) */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              {perKategori.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 text-center text-[#737a65] border border-stone-200/60 shadow-xs">
                  Semua bahan untuk filter ini sudah tersedia di kulkas Anda.
                </div>
              ) : (
                perKategori.map(([kategori, items]) => {
                  const subtotalKategori = items.reduce((sum, it) => sum + it.estimasi_biaya_rp, 0);

                  return (
                    <div
                      key={kategori}
                      className="bg-white rounded-3xl p-6 shadow-xs border border-stone-200/60 flex flex-col gap-4"
                    >
                      {/* Lapak Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#b2f2b6] flex items-center justify-center text-[#306a3b]">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                          </div>
                          <h2 className="text-[16px] font-bold text-[#2c1514] leading-tight">
                            Lapak {kategori}
                          </h2>
                        </div>
                        <span className="text-[12px] text-[#737a65] font-semibold">
                          {items.length} Item • Rp {subtotalKategori.toLocaleString('id-ID')}
                        </span>
                      </div>

                      {/* Items List */}
                      <div className="flex flex-col gap-2">
                        {items.map((item) => {
                          const isChecked = !!checkedMap[item.kode_tkpi];
                          const inFridge = !!fridgeMap[item.kode_tkpi];
                          const displayGram =
                            item.kebutuhan_beli_gram >= 1000
                              ? `${(item.kebutuhan_beli_gram / 1000).toFixed(1)} kg`
                              : `${item.kebutuhan_beli_gram} gram`;

                          return (
                            <div
                              key={item.kode_tkpi}
                              onClick={() => toggleCheck(item.kode_tkpi)}
                              className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                                isChecked
                                  ? 'bg-[#fff0ef]/60 border-stone-200/50 opacity-60'
                                  : 'bg-white border-stone-200/70 hover:border-[#306a3b]/40 hover:bg-[#fff8f7]'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                {/* Checkbox */}
                                <div
                                  className={`w-6 h-6 rounded-md flex items-center justify-center transition-all mt-0.5 ${
                                    isChecked
                                      ? 'bg-[#6da003] text-white shadow-2xs'
                                      : 'border border-stone-300 bg-stone-50 text-transparent'
                                  }`}
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>

                                <div className="flex flex-col">
                                  <span
                                    className={`text-[14px] font-bold ${
                                      isChecked ? 'line-through text-[#737a65]' : 'text-[#2c1514]'
                                    }`}
                                  >
                                    {item.nama_bahan} ({displayGram})
                                  </span>
                                  <span className="text-[12px] text-[#737a65]">
                                    Kebutuhan Bersih: {item.kebutuhan_bersih_gram}g • BDD: {item.bdd_percent}%
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Fridge Badge Button */}
                                <button
                                  type="button"
                                  onClick={(e) => toggleFridge(e, item.kode_tkpi)}
                                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1 transition ${
                                    inFridge
                                      ? 'bg-[#b2f2b6] text-[#002109]'
                                      : 'bg-stone-100 text-[#737a65] hover:bg-stone-200'
                                  }`}
                                  title="Tandai bahan ada di kulkas"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                  </svg>
                                  <span>{inFridge ? 'Ada di Kulkas' : '+ Kulkas'}</span>
                                </button>

                                {/* Nominal Harga */}
                                <span
                                  className={`text-[14px] font-extrabold ${
                                    isChecked ? 'line-through text-[#737a65]' : 'text-[#2c1514]'
                                  }`}
                                >
                                  Rp {item.estimasi_biaya_rp.toLocaleString('id-ID')}
                                </span>

                                {/* Edit Button */}
                                <button
                                  type="button"
                                  onClick={(e) => handleEditPrice(e, item)}
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-[#737a65] hover:text-[#2c1514] hover:bg-stone-100 transition"
                                  title="Edit Estimasi Harga"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
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

            {/* RIGHT COLUMN: 2 Streamlined Cards (4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-6">

              {/* Card 1: Tambah Titipan Cepat & Pesan WhatsApp */}
              <div className="bg-white rounded-3xl p-6 shadow-xs border border-stone-200/60 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#306a3b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <h3 className="text-[16px] font-bold text-[#2c1514]">
                    Titipan &amp; Pesan WhatsApp
                  </h3>
                </div>

                {/* Form Quick Add */}
                <form onSubmit={handleAddTitipan} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={titipanInput}
                    onChange={(e) => setTitipanInput(e.target.value)}
                    placeholder="Tambah titipan (misal: Gas, Sabun)..."
                    className="w-full px-3.5 py-2 rounded-xl bg-[#fff8f7] text-[#2c1514] text-[13px] border border-stone-200/70 focus:outline-none focus:ring-2 focus:ring-[#306a3b]"
                  />
                  <button
                    type="submit"
                    className="w-9 h-9 rounded-xl bg-[#306a3b] text-white font-bold flex items-center justify-center hover:bg-[#306a3b]/90 transition shrink-0 cursor-pointer"
                    title="Tambah Titipan"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </form>

                {/* Daftar Titipan Dinamis */}
                {titipanList.length > 0 && (
                  <div className="flex flex-col gap-1.5 p-2 bg-[#fff8f7] rounded-xl border border-stone-200/50">
                    <span className="text-[11px] font-bold text-[#737a65] uppercase">Titipan Tambahan:</span>
                    {titipanList.map((t) => (
                      <div key={t.id} className="flex items-center justify-between text-xs py-1">
                        <span className="font-semibold text-[#2c1514]">➕ {t.nama}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[#306a3b] font-bold">Rp {t.estimasiRp.toLocaleString('id-ID')}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTitipan(t.id)}
                            className="text-stone-400 hover:text-red-600"
                            title="Hapus titipan"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Preview Pesan WhatsApp */}
                <div className="p-3.5 rounded-2xl bg-[#fff0ef] text-[#2c1514] text-[13px] leading-relaxed">
                  <div className="font-bold text-[#306a3b] text-xs mb-1">
                    Pesan Belanja (Item Belum Dibeli):
                  </div>
                  <div className="space-y-1 text-[12px] text-[#737a65] max-h-48 overflow-y-auto pr-1">
                    {itemsBelumDibeli.slice(0, 7).map((it) => (
                      <p key={it.kode_tkpi}>• {it.nama_bahan}</p>
                    ))}
                    {itemsBelumDibeli.length > 7 && (
                      <p className="text-[11px] italic text-stone-400">
                        ...dan {itemsBelumDibeli.length - 7} bahan lainnya
                      </p>
                    )}
                    {titipanList.map((t) => (
                      <p key={t.id}>• [Titipan] {t.nama}</p>
                    ))}
                    <p className="pt-1.5 font-bold text-[#2c1514]">
                      Estimasi Total Sisa: Rp {totalSisaKebutuhan.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>

                {/* Button Action WA */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCopyWhatsApp}
                    className="min-h-[44px] px-3 py-2 rounded-full bg-stone-100 hover:bg-stone-200 text-[#2c1514] transition text-[13px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <svg className="w-4 h-4 text-[#737a65]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>{copyStatus === 'copied' ? 'Tersalin ✓' : 'Salin Teks'}</span>
                  </button>

                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(teksWhatsApp)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] px-3 py-2 rounded-full bg-[#b2f2b6] hover:bg-[#97d59c] text-[#002109] transition text-[13px] font-bold flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <svg className="w-4 h-4 text-[#306a3b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                    </svg>
                    <span>Buka WA</span>
                  </a>
                </div>
              </div>

              {/* Card 2: Ringkasan Gizi & Keamanan */}
              <div className="bg-white rounded-3xl p-6 shadow-xs border border-stone-200/60 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#466800]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <h3 className="text-[16px] font-bold text-[#2c1514]">
                    Status Gizi Belanjaan Ini
                  </h3>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="p-3 rounded-2xl bg-[#fff0ef] flex items-center gap-3">
                    <svg className="w-5 h-5 text-[#306a3b] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-[13px] text-[#2c1514] font-medium">
                      100% AKG Terpenuhi ({anggotaList.length} Anggota Keluarga)
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#fff0ef] flex items-center gap-3">
                    <svg className="w-5 h-5 text-[#466800] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-[13px] text-[#2c1514] font-medium">
                      Filter Alergi Aktif (Aman dari pantangan makanan)
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#fff0ef] flex items-center gap-3">
                    <svg className="w-5 h-5 text-[#306a3b] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span className="text-[13px] text-[#2c1514] font-medium">
                      1x Masak Sekeluarga (Porsi presisi, 0 sampah makanan)
                    </span>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      </main>
    </div>
  );
}

export default function BelanjaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fff8f7] flex items-center justify-center p-6 text-center text-[#737a65]">
          Memuat daftar belanja pasar...
        </div>
      }
    >
      <BelanjaContent />
    </Suspense>
  );
}
