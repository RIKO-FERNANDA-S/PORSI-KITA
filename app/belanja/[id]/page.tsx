'use client';

import React, { useState, useEffect, useMemo, use, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from '../../../components/Sidebar';
import { ItemDaftarBelanja, RencanaMenu7Hari, Keluarga, Anggota } from '../../../lib/types';
import { getStoredMenu, getStoredKeluarga, getStoredAnggota } from '../../../lib/store';
import { buatDaftarBelanjaMingguan } from '../../../lib/planner/cost';

interface TitipanItem {
  id: string;
  nama: string;
  estimasiRp: number;
}

interface PageProps {
  params?: Promise<{ id?: string }>;
}

// Icon mapper per kategori lapak pasar tradisional
function getKategoriIcon(kategori: string) {
  const lower = (kategori || '').toLowerCase();
  if (lower.includes('sayur')) return '🥬';
  if (lower.includes('daging') || lower.includes('ayam') || lower.includes('unggas') || lower.includes('sapi')) return '🥩';
  if (lower.includes('ikan') || lower.includes('seafood') || lower.includes('udang') || lower.includes('laut')) return '🐟';
  if (lower.includes('tahu') || lower.includes('tempe') || lower.includes('telur')) return '🥚';
  if (lower.includes('bumbu') || lower.includes('rempah') || lower.includes('bawang') || lower.includes('cabai')) return '🧅';
  if (lower.includes('pokok') || lower.includes('beras') || lower.includes('karbohidrat') || lower.includes('serealia')) return '🍚';
  if (lower.includes('buah')) return '🍎';
  if (lower.includes('susu') || lower.includes('minuman')) return '🥛';
  return '🛒';
}

// Rekomendasi barang titipan cepat
const QUICK_TITIPAN_PRESETS = [
  { nama: 'Minyak Goreng 1L', estimasiRp: 17500 },
  { nama: 'Garam Dapur 250g', estimasiRp: 4000 },
  { nama: 'Bumbu Racik Sup', estimasiRp: 3000 },
  { nama: 'Sabun Cuci Piring', estimasiRp: 6500 },
  { nama: 'Gas LPG 3kg', estimasiRp: 22000 },
];

function BelanjaContent({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = params ? use(params) : null;
  const currentPlanId = resolvedParams?.id;

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [rencanaMenu, setRencanaMenu] = useState<RencanaMenu7Hari | null>(null);
  const [keluarga, setKeluarga] = useState<Keluarga | null>(null);
  const [anggotaList, setAnggotaList] = useState<Anggota[]>([]);
  const [daftarBelanja, setDaftarBelanja] = useState<ItemDaftarBelanja[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State interaktif belanja
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});
  const [fridgeMap, setFridgeMap] = useState<Record<string, boolean>>({});
  const [hideFridge, setHideFridge] = useState(false);
  const [periodeFilter, setPeriodeFilter] = useState<'1_minggu' | '3_hari' | 'hari_ini'>('1_minggu');
  const [statusFilter, setStatusFilter] = useState<'semua' | 'belum_dibeli' | 'sudah_dibeli'>('semua');
  const [searchQuery, setSearchQuery] = useState('');

  // Quick item titipan (tambah item mendadak di pasar)
  const [titipanList, setTitipanList] = useState<TitipanItem[]>([]);
  const [titipanNama, setTitipanNama] = useState('');
  const [titipanHarga, setTitipanHarga] = useState('10000');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [toastMsg, setToastMsg] = useState('');

  // Modal edit harga lokal
  const [editingItem, setEditingItem] = useState<ItemDaftarBelanja | null>(null);
  const [editPriceInput, setEditPriceInput] = useState('');

  // Modal selesaikan belanja & catat pengeluaran ke database
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [finishCatatan, setFinishCatatan] = useState('Belanja bahan segar di pasar tradisional');
  const [isSubmittingFinish, setIsSubmittingFinish] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const k = getStoredKeluarga();
        const a = getStoredAnggota();
        const m = getStoredMenu();

        setKeluarga(k);
        setAnggotaList(a);
        setRencanaMenu(m);

        // Ambil data budget ter-update dari database bila tersedia
        try {
          const resBudget = await fetch('/api/family/budget');
          if (resBudget.ok) {
            const budgetData = await resBudget.json();
            if (budgetData.family) {
              setKeluarga((prev) => ({
                ...(prev || k),
                alias: budgetData.family.alias || prev?.alias || k.alias,
                wilayah: budgetData.family.wilayah || prev?.wilayah || k.wilayah,
                budget_belanja: budgetData.family.budget_belanja || prev?.budget_belanja,
                tipe_budget: budgetData.family.tipe_budget || prev?.tipe_budget,
              }));
            }
          }
        } catch {
          // fallback ke local storage
        }

        if (m && m.hari && m.hari.length > 0) {
          // Hitung daftar bahan sesuai periode pilihan
          const targetHariList =
            periodeFilter === 'hari_ini'
              ? m.hari.slice(0, 1)
              : periodeFilter === '3_hari'
              ? m.hari.slice(0, 3)
              : m.hari;

          const items = buatDaftarBelanjaMingguan(targetHariList);
          setDaftarBelanja(items);

          // Inisialisasi otomatis bahan awet yang biasanya sudah tersedia di kulkas/dapur
          const initialFridge: Record<string, boolean> = {};
          items.forEach((it) => {
            const lower = it.nama_bahan.toLowerCase();
            if (
              lower.includes('garam') ||
              lower.includes('minyak') ||
              lower.includes('merica') ||
              lower.includes('lada') ||
              lower.includes('gula')
            ) {
              initialFridge[it.kode_tkpi] = true;
            }
          });
          setFridgeMap(initialFridge);
        }
      } catch (e) {
        console.error('Gagal memuat data belanja:', e);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Recalculate saat periode filter berubah (1 Minggu / 3 Hari / Hari Ini)
  useEffect(() => {
    if (rencanaMenu && rencanaMenu.hari && rencanaMenu.hari.length > 0) {
      const targetHariList =
        periodeFilter === 'hari_ini'
          ? rencanaMenu.hari.slice(0, 1)
          : periodeFilter === '3_hari'
          ? rencanaMenu.hari.slice(0, 3)
          : rencanaMenu.hari;

      const items = buatDaftarBelanjaMingguan(targetHariList);
      setDaftarBelanja(items);
    }
  }, [periodeFilter, rencanaMenu]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // Filter items berdasarkan stok kulkas, status pembelian, dan pencarian nama/lapak
  const displayedItems = useMemo(() => {
    let items = [...daftarBelanja];

    // Sembunyikan bahan di kulkas jika opsi diaktifkan
    if (hideFridge) {
      items = items.filter((it) => !fridgeMap[it.kode_tkpi]);
    }

    // Filter status beli
    if (statusFilter === 'belum_dibeli') {
      items = items.filter((it) => !checkedMap[it.kode_tkpi]);
    } else if (statusFilter === 'sudah_dibeli') {
      items = items.filter((it) => checkedMap[it.kode_tkpi]);
    }

    // Filter teks pencarian
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(
        (it) =>
          it.nama_bahan.toLowerCase().includes(q) ||
          (it.kategori || '').toLowerCase().includes(q)
      );
    }

    return items;
  }, [daftarBelanja, hideFridge, fridgeMap, statusFilter, searchQuery, checkedMap]);

  // Kelompokkan per lapak pasar tradisional
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

  // Hitung jumlah bahan yang ada di kulkas
  const fridgeCount = useMemo(() => {
    return Object.values(fridgeMap).filter(Boolean).length;
  }, [fridgeMap]);

  // Kalkulasi total estimasi biaya belanja
  const totalBiayaEstimasi = useMemo(() => {
    const itemTotal = displayedItems.reduce((sum, item) => sum + item.estimasi_biaya_rp, 0);
    const titipanTotal = titipanList.reduce((sum, item) => sum + item.estimasiRp, 0);
    return itemTotal + titipanTotal;
  }, [displayedItems, titipanList]);

  // Total biaya bahan yang sudah dicentang/dibeli
  const totalSudahDibeli = useMemo(() => {
    const itemsCheckedTotal = displayedItems
      .filter((item) => checkedMap[item.kode_tkpi])
      .reduce((sum, item) => sum + item.estimasi_biaya_rp, 0);
    return itemsCheckedTotal;
  }, [displayedItems, checkedMap]);

  const totalSisaKebutuhan = Math.max(0, totalBiayaEstimasi - totalSudahDibeli);

  // Target batas belanja mingguan
  const batasAmanRp = useMemo(() => {
    if (keluarga?.budget_belanja) {
      const nominal = Number(keluarga.budget_belanja);
      if (keluarga.tipe_budget === 'mingguan') return nominal;
      return Math.round(nominal / 4);
    }
    return rencanaMenu?.target_budget_mingguan_rp || 250000;
  }, [keluarga, rencanaMenu]);

  const persentaseDibeli =
    totalBiayaEstimasi > 0
      ? Math.min(100, Math.round((totalSudahDibeli / totalBiayaEstimasi) * 100))
      : 0;

  // Toggle checklist beli per item
  const toggleCheck = (kodeTkpi: string) => {
    setCheckedMap((prev) => ({
      ...prev,
      [kodeTkpi]: !prev[kodeTkpi],
    }));
  };

  // Tandai seluruh item dalam 1 lapak sebagai dibeli / belum
  const toggleKategoriAll = (items: ItemDaftarBelanja[]) => {
    const allChecked = items.every((it) => checkedMap[it.kode_tkpi]);
    const nextMap = { ...checkedMap };
    items.forEach((it) => {
      nextMap[it.kode_tkpi] = !allChecked;
    });
    setCheckedMap(nextMap);
    showToast(
      allChecked
        ? 'Semua bahan di lapak ini ditandai belum dibeli.'
        : 'Semua bahan di lapak ini berhasil ditandai sudah dibeli!'
    );
  };

  // Toggle status stok di kulkas
  const toggleFridge = (e: React.MouseEvent, kodeTkpi: string) => {
    e.stopPropagation();
    setFridgeMap((prev) => {
      const next = !prev[kodeTkpi];
      showToast(next ? 'Bahan ditandai ada di stok kulkas.' : 'Bahan dihapus dari stok kulkas.');
      return {
        ...prev,
        [kodeTkpi]: next,
      };
    });
  };

  // Buka modal edit harga
  const handleOpenEditPrice = (e: React.MouseEvent, item: ItemDaftarBelanja) => {
    e.stopPropagation();
    setEditingItem(item);
    setEditPriceInput(item.estimasi_biaya_rp.toString());
  };

  // Simpan harga hasil edit ke state lokal
  const handleSavePrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const val = parseInt(editPriceInput.replace(/\D/g, ''), 10);
    if (!isNaN(val) && val >= 0) {
      setDaftarBelanja((prev) =>
        prev.map((it) => (it.kode_tkpi === editingItem.kode_tkpi ? { ...it, estimasi_biaya_rp: val } : it))
      );
      showToast(`Estimasi harga ${editingItem.nama_bahan} disesuaikan: Rp ${val.toLocaleString('id-ID')}`);
    }
    setEditingItem(null);
  };

  // Tambah titipan barang cepat
  const handleAddTitipan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titipanNama.trim()) return;
    const nominal = parseInt(titipanHarga.replace(/\D/g, ''), 10) || 10000;
    const newItem: TitipanItem = {
      id: `tip-${Date.now()}`,
      nama: titipanNama.trim(),
      estimasiRp: nominal,
    };
    setTitipanList((prev) => [...prev, newItem]);
    setTitipanNama('');
    setTitipanHarga('10000');
    showToast(`Titipan "${newItem.nama}" ditambahkan ke keranjang.`);
  };

  const handleAddPresetTitipan = (preset: { nama: string; estimasiRp: number }) => {
    const newItem: TitipanItem = {
      id: `tip-${Date.now()}`,
      nama: preset.nama,
      estimasiRp: preset.estimasiRp,
    };
    setTitipanList((prev) => [...prev, newItem]);
    showToast(`Titipan "${preset.nama}" ditambahkan.`);
  };

  const handleRemoveTitipan = (id: string) => {
    setTitipanList((prev) => prev.filter((it) => it.id !== id));
    showToast('Item titipan dihapus.');
  };

  // Item yang belum dibeli untuk preview pesan WhatsApp
  const itemsBelumDibeli = useMemo(() => {
    return displayedItems.filter((item) => !checkedMap[item.kode_tkpi]);
  }, [displayedItems, checkedMap]);

  // Format teks WhatsApp rapi dan mudah dibaca pedagang atau suami
  const teksWhatsApp = useMemo(() => {
    let teks = `🛒 *DAFTAR BELANJA PASAR - PORSI KITA*\n`;
    teks += `Keluarga: *${keluarga?.alias || 'Keluarga Kita'}*\n`;
    teks += `Wilayah / Acuan Pasar: ${keluarga?.wilayah || 'Pasar Tradisional'}\n`;
    teks += `Periode: ${periodeFilter === 'hari_ini' ? 'Menu Hari Ini' : periodeFilter === '3_hari' ? 'Menu 3 Hari' : 'Menu 1 Minggu Penuh'}\n`;
    teks += `------------------------------------\n\n`;

    if (itemsBelumDibeli.length === 0 && titipanList.length === 0) {
      teks += `Alhamdulillah, semua bahan belanjaan telah selesai dibeli! ✅\n`;
    } else {
      const map = new Map<string, ItemDaftarBelanja[]>();
      for (const item of itemsBelumDibeli) {
        const list = map.get(item.kategori) || [];
        list.push(item);
        map.set(item.kategori, list);
      }

      for (const [kategori, list] of map.entries()) {
        const icon = getKategoriIcon(kategori);
        teks += `${icon} *LAPAK ${kategori.toUpperCase()}*\n`;
        list.forEach((i) => {
          const berat =
            i.kebutuhan_beli_gram >= 1000
              ? `${(i.kebutuhan_beli_gram / 1000).toFixed(1)} kg`
              : `${i.kebutuhan_beli_gram} gram`;
          teks += `◻ ${i.nama_bahan}: ${berat} (~Rp ${i.estimasi_biaya_rp.toLocaleString('id-ID')})\n`;
        });
        teks += `\n`;
      }

      if (titipanList.length > 0) {
        teks += `📝 *TITIPAN TAMBAHAN*\n`;
        titipanList.forEach((t) => {
          teks += `◻ ${t.nama} (~Rp ${t.estimasiRp.toLocaleString('id-ID')})\n`;
        });
        teks += `\n`;
      }

      teks += `------------------------------------\n`;
      teks += `*Total Estimasi Sisa Belanja: Rp ${totalSisaKebutuhan.toLocaleString('id-ID')}*\n\n`;
      teks += `_Disusun otomatis oleh Porsi Kita (gizi seimbang, hemat terukur)._`;
    }

    return teks;
  }, [itemsBelumDibeli, titipanList, totalSisaKebutuhan, keluarga, periodeFilter]);

  const handleCopyWhatsApp = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(teksWhatsApp);
      setCopyStatus('copied');
      showToast('Format daftar belanja berhasil disalin ke clipboard!');
      setTimeout(() => setCopyStatus('idle'), 2500);
    }
  };

  // Konfirmasi selesai belanja & simpan pengeluaran nyata ke database PostgreSQL
  const handleConfirmFinish = async () => {
    if (totalSudahDibeli <= 0) {
      alert('Silakan centang minimal satu bahan yang telah dibeli.');
      return;
    }

    setIsSubmittingFinish(true);
    try {
      const res = await fetch('/api/family/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jenis: 'PENGELUARAN',
          nominal: totalSudahDibeli,
          catatan: finishCatatan || 'Belanja bahan segar mingguan di pasar tradisional',
        }),
      });

      if (!res.ok) {
        console.warn('Gagal menyimpan transaksi ke database, tetap melanjutkan redirect.');
      }

      setShowFinishModal(false);
      showToast(`Pengeluaran sebesar Rp ${totalSudahDibeli.toLocaleString('id-ID')} berhasil dicatat ke Dompet!`);
      setTimeout(() => {
        router.push('/dompet');
      }, 1200);
    } catch (err) {
      console.error('Error saat menyimpan transaksi:', err);
      setShowFinishModal(false);
      showToast('Pengeluaran dicatat untuk sesi ini.');
      setTimeout(() => {
        router.push('/dompet');
      }, 1200);
    } finally {
      setIsSubmittingFinish(false);
    }
  };

  // Tampilan Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6 text-center text-stone-500">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-8 h-8 animate-spin text-[#0C4B20]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="font-bold text-sm text-[#0D0101]">Menyiapkan daftar belanja pasar keluarga...</span>
          <span className="text-xs text-stone-500">Mengkalkulasi kebutuhan bahan &amp; faktor BDD</span>
        </div>
      </div>
    );
  }

  // Tampilan Kosong Jika Belum Ada Menu Aktif
  if (!rencanaMenu || daftarBelanja.length === 0) {
    return (
      <div className="bg-[#FAFAFA] min-h-screen text-[#0D0101] flex flex-col justify-between">
        <Sidebar
          activePath="daftar-belanja"
          mobileOpen={mobileSidebarOpen}
          setMobileOpen={setMobileSidebarOpen}
          anggotaCount={anggotaList.length}
        />
        <main className="lg:pl-64 flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-stone-200 shadow-sm text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#F2F9EC] text-[#0C4B20] text-3xl flex items-center justify-center shadow-xs">
              🧺
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-[#0D0101] tracking-tight">
                Belum Ada Menu Masak Aktif
              </h2>
              <p className="text-stone-600 text-sm mt-1.5 leading-relaxed">
                Daftar belanja pasar dihitung secara otomatis dari jadwal menu 7 hari keluarga Anda, disesuaikan dengan kebutuhan gizi AKG dan batas anggaran.
              </p>
            </div>
            <Link
              href="/menu"
              style={{
                background: 'linear-gradient(90deg, #6DA003 0%, #82BD03 100%)',
                boxShadow: '0 4px 14px rgba(109, 160, 3, 0.28)',
              }}
              className="min-h-[48px] px-6 py-2.5 rounded-xl text-white font-bold text-sm flex items-center justify-center transition hover:brightness-105 cursor-pointer shadow-sm mt-2"
            >
              Susun Menu 7 Hari Sekarang →
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-[#FAFAFA] font-sans text-[#0D0101] min-h-screen selection:bg-[#6DA003]/30">
      {/* 1. ASIDE SIDEBAR */}
      <Sidebar
        activePath="daftar-belanja"
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
        anggotaCount={anggotaList.length}
        rencanaMenuId={currentPlanId || rencanaMenu.id}
      />

      {/* 2. TOP HEADER */}
      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 bg-white/95 backdrop-blur-md border-b border-stone-200 px-4 h-16 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 -ml-1 rounded-xl text-stone-700 hover:bg-stone-100 transition cursor-pointer"
            aria-label="Buka navigasi"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-extrabold text-[17px] text-[#0C4B20] tracking-tight">PORSI KITA</span>
        </div>
        <Link
          href="/menu"
          className="text-xs font-bold text-[#0C4B20] bg-[#F2F9EC] border border-[#6DA003]/30 px-3 py-1.5 rounded-full hover:bg-[#EAF5D8] transition"
        >
          Lihat Menu
        </Link>
      </header>

      {/* Desktop Fixed Header */}
      <header className="hidden lg:flex fixed top-0 left-64 right-0 h-16 bg-white/95 backdrop-blur-xl border-b border-stone-200/80 z-40 items-center justify-between px-8 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <span className="text-[14px] font-extrabold text-[#0D0101] tracking-tight">
            Daftar Belanja Pasar
          </span>
          <span className="text-stone-300 text-[13px]">•</span>
          <span className="text-stone-600 text-[13px] font-medium">
            {keluarga?.alias || 'Keluarga Kita'} (7 Hari Menu Harmonis)
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-[13px] font-bold text-[#0D0101] leading-tight">
              {keluarga?.alias || 'Ibu Rumah Tangga'}
            </div>
            <div className="text-[11px] text-[#0C4B20] font-semibold leading-tight mt-0.5">
              {keluarga?.wilayah || 'Pasar Tradisional'}
            </div>
          </div>
          <div className="w-9 h-9 rounded-full bg-[#0C4B20] text-white flex items-center justify-center text-[13px] font-bold shadow-xs">
            {keluarga?.alias?.charAt(0) || 'P'}
          </div>
        </div>
      </header>

      {/* 3. MAIN CONTENT CONTAINER */}
      <main className="lg:pl-64 pt-4 lg:pt-20 pb-20 px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto">
        <div className="flex flex-col gap-6">

          {/* Toast Notification Alert */}
          {toastMsg && (
            <div className="p-3.5 rounded-2xl bg-[#0C4B20] text-white text-xs font-bold shadow-md transition flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="text-[#A5E342]">✓</span>
                <span>{toastMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setToastMsg('')}
                className="text-white/80 hover:text-white px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Clean Page Title Bar */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-stone-200/60">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#6DA003] uppercase tracking-wider mb-1">
                <span className="w-2 h-2 rounded-full bg-[#6DA003]" />
                <span>Rencana Dapur &amp; Belanja Bahan</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0D0101] tracking-tight">
                Daftar Belanja Pasar
              </h1>
              <p className="text-[14px] text-stone-600 mt-1">
                Daftar bahan belanjaan dikonsolidasi otomatis dari jadwal masak dan telah disesuaikan dengan faktor BDD (Bagian Dapat Dimakan).
              </p>
            </div>

            <Link
              href="/menu"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0C4B20] hover:text-[#6DA003] self-start sm:self-auto transition py-2 px-3.5 rounded-xl bg-stone-100 hover:bg-stone-200"
            >
              <span>← Kembali ke Menu 7 Hari</span>
            </Link>
          </div>

          {/* HERO BUDGET BANNER CARD */}
          <div className="rounded-3xl bg-gradient-to-br from-[#0C4B20] via-[#143B1B] to-[#0A2E14] text-white p-6 sm:p-8 shadow-sm relative overflow-hidden border border-[#0C4B20]/20">
            {/* Subtle Texture Overlay */}
            <div
              className="absolute inset-0 opacity-[0.06] pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                backgroundSize: '20px 20px',
              }}
            />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="flex flex-col gap-2 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[#A5E342] text-[11px] font-extrabold w-fit">
                  <span>🎯 ESTIMASI BELANJA ({periodeFilter === 'hari_ini' ? 'HARI INI' : periodeFilter === '3_hari' ? '3 HARI' : '1 MINGGU'})</span>
                </div>

                <div className="flex items-baseline gap-3 flex-wrap">
                  <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white tabular-nums">
                    Rp {totalBiayaEstimasi.toLocaleString('id-ID')}
                  </div>
                  <span className="text-[13px] text-white/80">
                    Batas anggaran mingguan: Rp {batasAmanRp.toLocaleString('id-ID')}
                  </span>
                </div>

                {/* Progress Bar Persentase Pembelian */}
                <div className="w-full bg-white/15 rounded-full h-3 overflow-hidden my-1 p-0.5">
                  <div
                    className="bg-[#A5E342] h-full rounded-full transition-all duration-500 shadow-xs"
                    style={{ width: `${persentaseDibeli}%` }}
                  />
                </div>

                <div className="flex items-center gap-4 text-[13px] text-white/90 flex-wrap">
                  <span>
                    Sudah dicentang: <strong className="text-white font-bold">Rp {totalSudahDibeli.toLocaleString('id-ID')}</strong> ({persentaseDibeli}%)
                  </span>
                  <span className="text-white/40">•</span>
                  <span>
                    Sisa kebutuhan: <strong className="text-[#A5E342] font-bold">Rp {totalSisaKebutuhan.toLocaleString('id-ID')}</strong>
                  </span>
                </div>
              </div>

              {/* Action Buttons Utama */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 sm:items-stretch lg:items-end justify-center shrink-0">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(teksWhatsApp)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: 'linear-gradient(90deg, #6DA003 0%, #82BD03 100%)',
                    boxShadow: '0 4px 14px rgba(109, 160, 3, 0.28)',
                  }}
                  className="min-h-[48px] px-6 py-2.5 rounded-xl text-white text-[13px] font-bold flex items-center justify-center gap-2 hover:brightness-105 active:scale-98 transition shadow-xs cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>Kirim ke WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    if (totalSudahDibeli <= 0) {
                      alert('Silakan centang minimal satu bahan belanjaan yang telah dibeli.');
                      return;
                    }
                    setShowFinishModal(true);
                  }}
                  className="min-h-[48px] px-6 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-[13px] font-bold flex items-center justify-center gap-2 transition cursor-pointer active:scale-98 border border-white/20"
                >
                  <svg className="w-4 h-4 text-[#A5E342]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Selesai &amp; Catat ke Dompet</span>
                </button>
              </div>
            </div>
          </div>

          {/* CONTROL BAR: FILTER PERIODE, STATUS, SEARCH, & KULKAS */}
          <div className="w-full bg-white rounded-2xl p-4 shadow-xs border border-stone-200/80 flex flex-col gap-4">
            
            {/* Baris 1: Filter Skala Periode & Status */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Periode Segmented Control */}
              <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl w-fit flex-wrap">
                <button
                  type="button"
                  onClick={() => setPeriodeFilter('1_minggu')}
                  className={`min-h-[40px] px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    periodeFilter === '1_minggu'
                      ? 'bg-white text-[#0C4B20] shadow-xs'
                      : 'text-stone-600 hover:text-[#0D0101]'
                  }`}
                >
                  1 Minggu Penuh
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodeFilter('3_hari')}
                  className={`min-h-[40px] px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    periodeFilter === '3_hari'
                      ? 'bg-white text-[#0C4B20] shadow-xs'
                      : 'text-stone-600 hover:text-[#0D0101]'
                  }`}
                >
                  3 Hari Pertama
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodeFilter('hari_ini')}
                  className={`min-h-[40px] px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    periodeFilter === 'hari_ini'
                      ? 'bg-white text-[#0C4B20] shadow-xs'
                      : 'text-stone-600 hover:text-[#0D0101]'
                  }`}
                >
                  Hari Ini Saja
                </button>
              </div>

              {/* Status Filter: Semua / Belum Dibeli / Sudah Dibeli */}
              <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 p-1 rounded-xl w-fit">
                <button
                  type="button"
                  onClick={() => setStatusFilter('semua')}
                  className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    statusFilter === 'semua'
                      ? 'bg-[#0C4B20] text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Semua ({daftarBelanja.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('belum_dibeli')}
                  className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    statusFilter === 'belum_dibeli'
                      ? 'bg-[#6DA003] text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Belum Dibeli ({itemsBelumDibeli.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('sudah_dibeli')}
                  className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    statusFilter === 'sudah_dibeli'
                      ? 'bg-[#0C4B20] text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Sudah Dibeli
                </button>
              </div>
            </div>

            {/* Baris 2: Pencarian & Toggle Sembunyikan Kulkas */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-stone-100">
              {/* Search Bahan */}
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama bahan masakan atau lapak pasar..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-semibold text-[#0D0101] focus:outline-none focus:ring-2 focus:ring-[#0C4B20]"
                />
                <svg
                  className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs px-1"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Sembunyikan Stok Kulkas */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none px-3.5 py-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 transition min-h-[40px]">
                <input
                  type="checkbox"
                  checked={hideFridge}
                  onChange={(e) => setHideFridge(e.target.checked)}
                  className="w-4 h-4 text-[#0C4B20] rounded focus:ring-[#0C4B20] border-stone-300"
                />
                <span className="text-xs font-bold text-stone-700">
                  Sembunyikan Stok Kulkas ({fridgeCount})
                </span>
              </label>
            </div>
          </div>

          {/* 12-COLUMN MAIN CONTENT GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* LEFT COLUMN: Kelompok Lapak Pasar (8 Kolom) */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              {perKategori.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 text-center text-stone-500 border border-stone-200 shadow-xs flex flex-col items-center gap-3">
                  <span className="text-4xl">🥦</span>
                  <span className="font-bold text-stone-800 text-base">Tidak ada bahan belanjaan pada filter ini</span>
                  <p className="text-xs text-stone-500 max-w-sm">
                    Seluruh bahan mungkin telah dicentang sebagai sudah dibeli, ada di stok kulkas, atau kata kunci pencarian Anda tidak cocok.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('semua');
                      setHideFridge(false);
                      setSearchQuery('');
                    }}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-xs font-bold text-[#0C4B20] transition mt-2 cursor-pointer"
                  >
                    Reset Filter Belanja
                  </button>
                </div>
              ) : (
                perKategori.map(([kategori, items]) => {
                  const subtotalKategori = items.reduce((sum, it) => sum + it.estimasi_biaya_rp, 0);
                  const isAllChecked = items.every((it) => checkedMap[it.kode_tkpi]);

                  return (
                    <div
                      key={kategori}
                      className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-stone-200/80 flex flex-col gap-4"
                    >
                      {/* Lapak Header Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-stone-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-[#F2F9EC] flex items-center justify-center text-xl shrink-0 shadow-2xs">
                            {getKategoriIcon(kategori)}
                          </div>
                          <div>
                            <h2 className="text-[16px] font-extrabold text-[#0D0101] leading-tight">
                              Lapak {kategori}
                            </h2>
                            <span className="text-[12px] text-stone-500 font-medium">
                              {items.length} Item • Estimasi Subtotal: <strong className="text-[#0C4B20]">Rp {subtotalKategori.toLocaleString('id-ID')}</strong>
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleKategoriAll(items)}
                          className="self-start sm:self-auto text-xs font-bold text-[#0C4B20] hover:text-[#6DA003] px-3.5 py-1.5 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 transition cursor-pointer min-h-[36px]"
                        >
                          {isAllChecked ? 'Batalkan Semua' : 'Tandai Lapak Selesai ✓'}
                        </button>
                      </div>

                      {/* Items List di Lapak Terkait */}
                      <div className="flex flex-col gap-2.5">
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
                              className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer select-none gap-3 ${
                                isChecked
                                  ? 'bg-stone-50/70 border-stone-200 opacity-60'
                                  : 'bg-white border-stone-200 hover:border-[#0C4B20]/40 hover:bg-stone-50/40'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                {/* Checkbox Besar & Jelas */}
                                <div
                                  className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all mt-0.5 shrink-0 ${
                                    isChecked
                                      ? 'bg-[#6DA003] text-white shadow-xs'
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
                                      isChecked ? 'line-through text-stone-400' : 'text-[#0D0101]'
                                    }`}
                                  >
                                    {item.nama_bahan}
                                  </span>

                                  <div className="flex items-center gap-2 flex-wrap mt-0.5 text-xs text-stone-500">
                                    <span className="font-bold text-stone-800 bg-stone-100 px-2 py-0.5 rounded-md">
                                      Beli: {displayGram}
                                    </span>
                                    <span>•</span>
                                    <span title="Bagian Dapat Dimakan sesuai standar TKPI Kemenkes">
                                      BDD {item.bdd_percent}% ({item.kebutuhan_bersih_gram}g bersih)
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                                {/* Tombol Status Kulkas */}
                                <button
                                  type="button"
                                  onClick={(e) => toggleFridge(e, item.kode_tkpi)}
                                  className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                                    inFridge
                                      ? 'bg-[#B2F2B6] text-[#002109] border border-[#6DA003]/40'
                                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200 border border-stone-200'
                                  }`}
                                  title="Tandai bahan sudah tersedia di stok kulkas dapur"
                                >
                                  <span>{inFridge ? '🧊 Di Kulkas' : '+ Kulkas'}</span>
                                </button>

                                {/* Nominal Harga & Tombol Edit Harga */}
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`text-[14px] font-extrabold tabular-nums ${
                                      isChecked ? 'line-through text-stone-400' : 'text-[#0C4B20]'
                                    }`}
                                  >
                                    Rp {item.estimasi_biaya_rp.toLocaleString('id-ID')}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenEditPrice(e, item)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition cursor-pointer"
                                    title="Sesuaikan estimasi harga per bahan"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </button>
                                </div>
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

            {/* RIGHT COLUMN: Sidebar Cards (4 Kolom) */}
            <div className="lg:col-span-4 flex flex-col gap-6">

              {/* CARD 1: TITIPAN BELANJA & FORMAT WHATSAPP */}
              <div className="bg-white rounded-3xl p-6 shadow-xs border border-stone-200/80 flex flex-col gap-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-stone-100">
                  <div className="w-9 h-9 rounded-xl bg-[#F2F9EC] text-[#0C4B20] flex items-center justify-center text-lg shrink-0">
                    💬
                  </div>
                  <div>
                    <h3 className="text-[16px] font-extrabold text-[#0D0101] leading-tight">
                      Titipan &amp; Format WhatsApp
                    </h3>
                    <span className="text-[11px] text-stone-500 font-medium">
                      Salin atau kirim ke pedagang / suami di pasar
                    </span>
                  </div>
                </div>

                {/* Preset Titipan Cepat */}
                <div>
                  <span className="text-[11px] font-bold text-stone-600 block mb-1.5">
                    Titipan Populer:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_TITIPAN_PRESETS.map((p) => (
                      <button
                        key={p.nama}
                        type="button"
                        onClick={() => handleAddPresetTitipan(p)}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-stone-50 hover:bg-[#F2F9EC] text-stone-700 hover:text-[#0C4B20] border border-stone-200 transition cursor-pointer"
                      >
                        + {p.nama}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form Tambah Titipan Kustom */}
                <form onSubmit={handleAddTitipan} className="flex flex-col gap-2 pt-2 border-t border-stone-100">
                  <label className="text-xs font-bold text-stone-700">
                    Tambah Titipan Lainnya:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={titipanNama}
                      onChange={(e) => setTitipanNama(e.target.value)}
                      placeholder="misal: Kerupuk, Tisu Dapur"
                      className="flex-1 px-3 py-2 rounded-xl bg-stone-50 text-xs font-semibold border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#0C4B20]"
                    />
                    <input
                      type="number"
                      step="1000"
                      value={titipanHarga}
                      onChange={(e) => setTitipanHarga(e.target.value)}
                      placeholder="Rp"
                      className="w-24 px-2.5 py-2 rounded-xl bg-stone-50 text-xs font-semibold border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#0C4B20]"
                    />
                    <button
                      type="submit"
                      className="w-10 h-10 rounded-xl bg-[#0C4B20] text-white font-bold flex items-center justify-center hover:bg-[#143B1B] transition shrink-0 cursor-pointer shadow-xs"
                      title="Tambah item titipan"
                    >
                      +
                    </button>
                  </div>
                </form>

                {/* List Titipan yang Sudah Ditambahkan */}
                {titipanList.length > 0 && (
                  <div className="flex flex-col gap-1.5 p-3.5 bg-stone-50 rounded-2xl border border-stone-200/70">
                    <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                      Titipan Tambahan ({titipanList.length}):
                    </span>
                    {titipanList.map((t) => (
                      <div key={t.id} className="flex items-center justify-between text-xs py-1.5 border-b border-stone-200/50 last:border-b-0">
                        <span className="font-semibold text-[#0D0101]">🛍️ {t.nama}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[#0C4B20] font-bold">
                            Rp {t.estimasiRp.toLocaleString('id-ID')}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTitipan(t.id)}
                            className="text-stone-400 hover:text-red-600 cursor-pointer px-1 py-0.5"
                            title="Hapus titipan"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pratinjau Teks Format WhatsApp */}
                <div className="p-4 rounded-2xl bg-[#EAF5D8] border border-[#6DA003]/30 text-[#0D0101] text-xs leading-relaxed space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#0C4B20]">
                    <span>Pratinjau Pesan WA ({itemsBelumDibeli.length} Bahan Sisa):</span>
                    <span className="text-[10px] bg-white/80 px-2 py-0.5 rounded-full font-semibold">Siap Salin</span>
                  </div>
                  <div className="space-y-1 text-[12px] text-stone-700 max-h-44 overflow-y-auto pr-1">
                    {itemsBelumDibeli.slice(0, 6).map((it) => (
                      <p key={it.kode_tkpi} className="truncate">
                        • {it.nama_bahan} ({it.kebutuhan_beli_gram >= 1000 ? `${(it.kebutuhan_beli_gram / 1000).toFixed(1)}kg` : `${it.kebutuhan_beli_gram}g`})
                      </p>
                    ))}
                    {itemsBelumDibeli.length > 6 && (
                      <p className="text-[11px] italic text-stone-500">
                        ...dan {itemsBelumDibeli.length - 6} bahan lainnya
                      </p>
                    )}
                    {titipanList.map((t) => (
                      <p key={t.id} className="text-[#0C4B20] font-semibold truncate">
                        • [Titipan] {t.nama} (Rp {t.estimasiRp.toLocaleString('id-ID')})
                      </p>
                    ))}
                    <div className="pt-2 font-bold text-[#0C4B20] border-t border-[#6DA003]/20">
                      Total Estimasi Sisa: Rp {totalSisaKebutuhan.toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>

                {/* Tombol Salin Teks & Buka WA */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyWhatsApp}
                    className="min-h-[46px] px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#0D0101] transition text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <svg className="w-4 h-4 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>{copyStatus === 'copied' ? 'Tersalin ✓' : 'Salin Teks'}</span>
                  </button>

                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(teksWhatsApp)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[46px] px-3 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white transition text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.071.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.129.332.202.043.073.043.419-.101.824z" />
                    </svg>
                    <span>Kirim WA</span>
                  </a>
                </div>
              </div>

              {/* CARD 2: JAMINAN GIZI & PENGHEMATAN */}
              <div className="bg-white rounded-3xl p-6 shadow-xs border border-stone-200/80 flex flex-col gap-3.5">
                <div className="flex items-center gap-2.5 pb-2 border-b border-stone-100">
                  <div className="w-9 h-9 rounded-xl bg-[#F2F9EC] text-[#0C4B20] flex items-center justify-center text-lg shrink-0">
                    🛡️
                  </div>
                  <div>
                    <h3 className="text-[16px] font-extrabold text-[#0D0101] leading-tight">
                      Jaminan Standar Gizi
                    </h3>
                    <span className="text-[11px] text-stone-500 font-medium">
                      Formulasi Permenkes 28/2019 &amp; TKPI Kemenkes
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/60 flex items-start gap-3">
                    <span className="text-base mt-0.5">⚖️</span>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-[#0D0101]">
                        Faktor BDD Terkoreksi
                      </span>
                      <span className="text-[11px] text-stone-600 mt-0.5 leading-snug">
                        Gramasi belanja dinaikkan otomatis sesuai persentase kulit, duri, atau tulang yang tidak dapat dimakan.
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/60 flex items-start gap-3">
                    <span className="text-base mt-0.5">🛡️</span>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-[#0D0101]">
                        100% Bebas Alergen
                      </span>
                      <span className="text-[11px] text-stone-600 mt-0.5 leading-snug">
                        Resep masakan yang mengandung pantangan alergi anggota keluarga otomatis dieliminasi.
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/60 flex items-start gap-3">
                    <span className="text-base mt-0.5">💰</span>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-[#0D0101]">
                        Anggaran Belanja Terkunci
                      </span>
                      <span className="text-[11px] text-stone-600 mt-0.5 leading-snug">
                        Estimasi belanja mingguan dijaga agar tidak melampaui alokasi budget ({keluarga?.alias || 'Ibu'}).
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      </main>

      {/* MODAL 1: SESUAIKAN ESTIMASI HARGA BAHAN */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-xl border border-stone-200 animate-scaleIn flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h3 className="text-base font-extrabold text-[#0D0101]">
                Sesuaikan Estimasi Harga
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePrice} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Nama Bahan Pangan:
                </label>
                <div className="text-sm font-bold text-[#0C4B20]">
                  {editingItem.nama_bahan} ({editingItem.kebutuhan_beli_gram}g)
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Harga di Pasar / Warung Langganan (Rp):
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-500">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={editPriceInput}
                    onChange={(e) => setEditPriceInput(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0C4B20]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-bold hover:bg-stone-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(90deg, #6DA003 0%, #82BD03 100%)',
                  }}
                  className="min-h-[44px] px-5 py-2 rounded-xl text-white text-xs font-bold hover:brightness-105 cursor-pointer shadow-sm"
                >
                  Simpan Harga
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SELESAIKAN BELANJA & CATAT KE DATABASE */}
      {showFinishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-stone-200 animate-scaleIn flex flex-col gap-4">
            <div className="flex items-center gap-3 pb-3 border-b border-stone-100">
              <div className="w-10 h-10 rounded-2xl bg-[#F2F9EC] text-[#0C4B20] text-xl flex items-center justify-center shrink-0">
                💰
              </div>
              <div>
                <h3 className="text-[17px] font-extrabold text-[#0D0101] leading-tight">
                  Selesaikan Belanja Pasar
                </h3>
                <span className="text-[11px] text-stone-500 font-medium">
                  Catat pengeluaran nyata ke database dompet keluarga
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col gap-1">
              <span className="text-xs text-stone-500 font-medium">Total Bahan yang Dicentang:</span>
              <span className="text-2xl font-extrabold text-[#0C4B20] tabular-nums">
                Rp {totalSudahDibeli.toLocaleString('id-ID')}
              </span>
              <span className="text-[11px] text-stone-500 mt-1">
                Akan dicatat otomatis ke riwayat pengeluaran dompet keluarga Anda.
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-stone-700">Catatan Pengeluaran:</label>
              <input
                type="text"
                value={finishCatatan}
                onChange={(e) => setFinishCatatan(e.target.value)}
                placeholder="misal: Belanja sayur & lauk segar di Pasar Wonokromo"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0C4B20]"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowFinishModal(false)}
                disabled={isSubmittingFinish}
                className="min-h-[46px] px-5 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-bold hover:bg-stone-200 cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmFinish}
                disabled={isSubmittingFinish}
                style={{
                  background: 'linear-gradient(90deg, #6DA003 0%, #82BD03 100%)',
                  boxShadow: '0 4px 14px rgba(109, 160, 3, 0.28)',
                }}
                className="min-h-[46px] px-6 py-2 rounded-xl text-white text-xs font-bold hover:brightness-105 cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmittingFinish ? (
                  <span>Menyimpan...</span>
                ) : (
                  <span>Catat ke Dompet →</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BelanjaPage({ params }: PageProps = {}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6 text-center text-stone-500">
          Memuat daftar belanja pasar...
        </div>
      }
    >
      <BelanjaContent params={params} />
    </Suspense>
  );
}
