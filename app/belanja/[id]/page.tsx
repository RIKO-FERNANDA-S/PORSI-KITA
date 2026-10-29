'use client';

import React, { useState, useEffect, useMemo, use, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from '../../../components/Sidebar';
import { ItemDaftarBelanja, RencanaMenu7Hari, Keluarga, Anggota } from '../../../lib/types';
import { getStoredMenu, getStoredKeluarga, getStoredAnggota, saveStoredMenu } from '../../../lib/store';
import { buatDaftarBelanjaMingguan } from '../../../lib/planner/cost';

interface TitipanItem {
  id: string;
  nama: string;
  estimasiRp: number;
}

interface PageProps {
  params?: Promise<{ id?: string }>;
}

const STORAGE_KEY_KULKAS = 'porsi_kita_kulkas_stok';

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
  const [statusFilter, setStatusFilter] = useState<'semua' | 'belum_dibeli' | 'kulkas' | 'sudah_dibeli'>('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRecipeList, setShowRecipeList] = useState(false);

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

  // Load data awal dari database PostgreSQL & Local Storage
  useEffect(() => {
    async function loadData() {
      try {
        const k = getStoredKeluarga();
        const a = getStoredAnggota();
        let m = getStoredMenu();

        setKeluarga(k);
        setAnggotaList(a);

        // 1. Ambil menu 7 hari terbaru langsung dari database PostgreSQL
        try {
          const resMenu = await fetch('/api/menu');
          if (resMenu.ok) {
            const dataMenu = await resMenu.json();
            if (dataMenu.success && dataMenu.menu) {
              m = dataMenu.menu;
              saveStoredMenu(dataMenu.menu);
            }
          }
        } catch (err) {
          console.warn('Gagal memuat menu dari database:', err);
        }

        setRencanaMenu(m);

        // 2. Ambil data budget ter-update dari database bila tersedia
        try {
          const resBudget = await fetch('/api/family/budget');
          if (resBudget.ok) {
            const budgetData = await resBudget.json();
            if (budgetData.alias || budgetData.budget_belanja) {
              setKeluarga((prev) => ({
                ...(prev || k),
                alias: budgetData.alias || prev?.alias || k.alias,
                wilayah: budgetData.wilayah || prev?.wilayah || k.wilayah,
                budget_belanja: budgetData.budget_belanja || prev?.budget_belanja,
                tipe_budget: budgetData.tipe_budget || prev?.tipe_budget,
              }));
            }
          }
        } catch {
          // fallback ke local storage
        }

        if (m && m.hari && m.hari.length > 0) {
          // Hitung daftar bahan sesuai periode pilihan default (1 Minggu)
          const targetHariList = m.hari.slice(0, 7);
          const items = buatDaftarBelanjaMingguan(targetHariList);
          setDaftarBelanja(items);

          // Restore preferensi stok kulkas dari localStorage atau gunakan default awet
          let initialFridge: Record<string, boolean> = {};
          try {
            const rawF = localStorage.getItem(STORAGE_KEY_KULKAS);
            if (rawF) {
              initialFridge = JSON.parse(rawF);
            }
          } catch {}

          if (Object.keys(initialFridge).length === 0) {
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
            try {
              localStorage.setItem(STORAGE_KEY_KULKAS, JSON.stringify(initialFridge));
            } catch {}
          }

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
          : rencanaMenu.hari.slice(0, 7);

      const items = buatDaftarBelanjaMingguan(targetHariList);
      setDaftarBelanja(items);
    }
  }, [periodeFilter, rencanaMenu]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // Resep masakan yang termasuk dalam periode filter saat ini
  const resepDalamPeriode = useMemo(() => {
    if (!rencanaMenu?.hari) return [];
    const targetHari =
      periodeFilter === 'hari_ini'
        ? rencanaMenu.hari.slice(0, 1)
        : periodeFilter === '3_hari'
        ? rencanaMenu.hari.slice(0, 3)
        : rencanaMenu.hari.slice(0, 7);

    const map = new Map<string, { kode: string; nama: string; kategori: string }>();
    for (const h of targetHari) {
      const sesiList = [h.sesi_makan.pagi, h.sesi_makan.siang, h.sesi_makan.malam];
      for (const s of sesiList) {
        for (const hid of s.hidangan) {
          if (!map.has(hid.kode)) {
            map.set(hid.kode, { kode: hid.kode, nama: hid.nama, kategori: hid.kategori });
          }
        }
      }
    }
    return Array.from(map.values());
  }, [rencanaMenu, periodeFilter]);

  // Kalkulasi penghematan dari stok kulkas
  const totalBiayaSemuaBahan = useMemo(() => {
    return daftarBelanja.reduce((sum, it) => sum + it.estimasi_biaya_rp, 0);
  }, [daftarBelanja]);

  const totalHematKulkas = useMemo(() => {
    return daftarBelanja
      .filter((it) => fridgeMap[it.kode_tkpi])
      .reduce((sum, it) => sum + it.estimasi_biaya_rp, 0);
  }, [daftarBelanja, fridgeMap]);

  const jumlahBahanKulkas = useMemo(() => {
    return daftarBelanja.filter((it) => fridgeMap[it.kode_tkpi]).length;
  }, [daftarBelanja, fridgeMap]);

  const totalTitipan = useMemo(() => {
    return titipanList.reduce((sum, item) => sum + item.estimasiRp, 0);
  }, [titipanList]);

  // Total biaya belanja pasar nyata (sudah dikurangi bahan yang ada di kulkas + titipan)
  const totalBiayaBelanjaPasar = useMemo(() => {
    const bahanPerluDibeli = daftarBelanja
      .filter((it) => !fridgeMap[it.kode_tkpi])
      .reduce((sum, it) => sum + it.estimasi_biaya_rp, 0);
    return bahanPerluDibeli + totalTitipan;
  }, [daftarBelanja, fridgeMap, totalTitipan]);

  // Total biaya bahan pasar yang sudah dicentang/dibeli
  const totalSudahDibeli = useMemo(() => {
    const bahanPasarDibeli = daftarBelanja
      .filter((it) => !fridgeMap[it.kode_tkpi] && checkedMap[it.kode_tkpi])
      .reduce((sum, it) => sum + it.estimasi_biaya_rp, 0);
    return bahanPasarDibeli;
  }, [daftarBelanja, fridgeMap, checkedMap]);

  // Sisa kebutuhan belanja pasar yang belum dibeli
  const totalSisaKebutuhan = Math.max(0, totalBiayaBelanjaPasar - totalSudahDibeli);

  // Target batas belanja sesuai periode
  const batasAmanRp = useMemo(() => {
    let budgetHarian = 85000;
    if (keluarga?.budget_belanja) {
      const nominal = Number(keluarga.budget_belanja);
      budgetHarian = keluarga.tipe_budget === 'mingguan' ? Math.round(nominal / 7) : Math.round(nominal / 30);
    } else if (rencanaMenu?.budget_harian_rp) {
      budgetHarian = rencanaMenu.budget_harian_rp;
    }

    if (periodeFilter === 'hari_ini') return budgetHarian;
    if (periodeFilter === '3_hari') return budgetHarian * 3;
    return budgetHarian * 7;
  }, [keluarga, rencanaMenu, periodeFilter]);

  const persentaseDibeli =
    totalBiayaBelanjaPasar > 0
      ? Math.min(100, Math.round((totalSudahDibeli / totalBiayaBelanjaPasar) * 100))
      : 100;

  // Filter items berdasarkan stok kulkas, status pembelian, dan pencarian nama/lapak
  const displayedItems = useMemo(() => {
    let items = [...daftarBelanja];

    // Sembunyikan bahan di kulkas jika opsi diaktifkan
    if (hideFridge) {
      items = items.filter((it) => !fridgeMap[it.kode_tkpi]);
    }

    // Filter status
    if (statusFilter === 'belum_dibeli') {
      items = items.filter((it) => !fridgeMap[it.kode_tkpi] && !checkedMap[it.kode_tkpi]);
    } else if (statusFilter === 'kulkas') {
      items = items.filter((it) => fridgeMap[it.kode_tkpi]);
    } else if (statusFilter === 'sudah_dibeli') {
      items = items.filter((it) => !fridgeMap[it.kode_tkpi] && checkedMap[it.kode_tkpi]);
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

  // Bahan yang perlu dibeli di pasar namun belum dicentang
  const itemsBelumDibeli = useMemo(() => {
    return daftarBelanja.filter((item) => !fridgeMap[item.kode_tkpi] && !checkedMap[item.kode_tkpi]);
  }, [daftarBelanja, fridgeMap, checkedMap]);

  // Bahan yang ada di kulkas
  const itemsDiKulkas = useMemo(() => {
    return daftarBelanja.filter((item) => fridgeMap[item.kode_tkpi]);
  }, [daftarBelanja, fridgeMap]);

  // Toggle checklist beli per item
  const toggleCheck = (kodeTkpi: string) => {
    setCheckedMap((prev) => ({
      ...prev,
      [kodeTkpi]: !prev[kodeTkpi],
    }));
  };

  // Tandai seluruh item dalam 1 lapak sebagai dibeli / belum
  const toggleKategoriAll = (items: ItemDaftarBelanja[]) => {
    const nonFridgeItems = items.filter((it) => !fridgeMap[it.kode_tkpi]);
    if (nonFridgeItems.length === 0) return;

    const allChecked = nonFridgeItems.every((it) => checkedMap[it.kode_tkpi]);
    const nextMap = { ...checkedMap };
    nonFridgeItems.forEach((it) => {
      nextMap[it.kode_tkpi] = !allChecked;
    });
    setCheckedMap(nextMap);
    showToast(
      allChecked
        ? 'Semua bahan di lapak ini ditandai belum dibeli.'
        : 'Semua bahan di lapak ini berhasil ditandai sudah dibeli!'
    );
  };

  // Toggle status stok di kulkas (otomatis memotong budget & menyimpan ke localStorage)
  const toggleFridge = (e: React.MouseEvent, kodeTkpi: string) => {
    e.stopPropagation();
    setFridgeMap((prev) => {
      const next = !prev[kodeTkpi];
      const updated = { ...prev, [kodeTkpi]: next };
      try {
        localStorage.setItem(STORAGE_KEY_KULKAS, JSON.stringify(updated));
      } catch {}

      showToast(
        next
          ? 'Bahan tersimpan di Kulkas. Anggaran belanja otomatis lebih hemat!'
          : 'Bahan dihapus dari Kulkas. Masuk ke daftar belanja pasar.'
      );
      return updated;
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

  // Format teks WhatsApp rapi dan jelas (membedakan pasar dan kulkas)
  const teksWhatsApp = useMemo(() => {
    let teks = `🛒 *DAFTAR BELANJA PASAR - PORSI KITA*\n`;
    teks += `Keluarga: *${keluarga?.alias || 'Keluarga Kita'}*\n`;
    teks += `Wilayah / Acuan Pasar: ${keluarga?.wilayah || 'Pasar Tradisional'}\n`;
    teks += `Periode Belanja: *${
      periodeFilter === 'hari_ini'
        ? 'Menu 1 Hari (Hari Ini)'
        : periodeFilter === '3_hari'
        ? 'Menu 3 Hari'
        : 'Menu 1 Minggu Penuh (7 Hari)'
    }*\n`;
    teks += `------------------------------------\n\n`;

    if (itemsBelumDibeli.length === 0 && titipanList.length === 0) {
      teks += `Alhamdulillah, semua bahan belanjaan pasar telah selesai dibeli! ✅\n`;
    } else {
      const map = new Map<string, ItemDaftarBelanja[]>();
      for (const item of itemsBelumDibeli) {
        const list = map.get(item.kategori) || [];
        list.push(item);
        map.set(item.kategori, list);
      }

      teks += `📍 *BAHAN HARUS DIBELI DI PASAR:*\n`;
      for (const [kategori, list] of map.entries()) {
        const icon = getKategoriIcon(kategori);
        teks += `${icon} *Lapak ${kategori.toUpperCase()}*\n`;
        list.forEach((i) => {
          const berat =
            i.kebutuhan_beli_gram >= 1000
              ? `${(i.kebutuhan_beli_gram / 1000).toFixed(1)} kg`
              : `${i.kebutuhan_beli_gram}g`;
          teks += `◻ ${i.nama_bahan}: ${berat} (~Rp ${i.estimasi_biaya_rp.toLocaleString('id-ID')})\n`;
        });
        teks += `\n`;
      }

      if (titipanList.length > 0) {
        teks += `📝 *TITIPAN TAMBAHAN:*\n`;
        titipanList.forEach((t) => {
          teks += `◻ ${t.nama} (~Rp ${t.estimasiRp.toLocaleString('id-ID')})\n`;
        });
        teks += `\n`;
      }

      if (itemsDiKulkas.length > 0) {
        teks += `🧊 *STOK SUDAH ADA DI KULKAS (TIDAK PERLU BELI):*\n`;
        itemsDiKulkas.forEach((k) => {
          teks += `✓ ${k.nama_bahan} (Hemat Rp ${k.estimasi_biaya_rp.toLocaleString('id-ID')})\n`;
        });
        teks += `\n`;
      }

      teks += `------------------------------------\n`;
      teks += `*Total Kebutuhan Bahan Menu: Rp ${totalBiayaSemuaBahan.toLocaleString('id-ID')}*\n`;
      if (totalHematKulkas > 0) {
        teks += `*Hemat dari Stok Kulkas: -Rp ${totalHematKulkas.toLocaleString('id-ID')}*\n`;
      }
      teks += `*Total Biaya Belanja Pasar: Rp ${totalBiayaBelanjaPasar.toLocaleString('id-ID')}*\n`;
      teks += `*Sisa yang Belum Dicentang: Rp ${totalSisaKebutuhan.toLocaleString('id-ID')}*\n\n`;
      teks += `_Disusun otomatis oleh Porsi Kita (gizi seimbang, hemat terukur)._`;
    }

    return teks;
  }, [
    itemsBelumDibeli,
    itemsDiKulkas,
    titipanList,
    totalBiayaSemuaBahan,
    totalHematKulkas,
    totalBiayaBelanjaPasar,
    totalSisaKebutuhan,
    keluarga,
    periodeFilter,
  ]);

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
      alert('Silakan centang minimal satu bahan belanjaan yang telah dibeli.');
      return;
    }

    setIsSubmittingFinish(true);
    try {
      let meta: any = null;
      try {
        const raw = localStorage.getItem('porsi_kita_auth_meta');
        if (raw) meta = JSON.parse(raw);
      } catch {}

      const res = await fetch('/api/family/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jenis: 'PENGELUARAN',
          nominal: totalSudahDibeli,
          catatan: finishCatatan || `Belanja bahan dapur pasar (${periodeFilter.replace('_', ' ')})`,
          phone: meta?.phone,
        }),
      });

      if (!res.ok) {
        console.warn('Gagal menyimpan transaksi ke database, tetap melanjutkan redirect.');
      }

      setShowFinishModal(false);
      showToast(`Pengeluaran sebesar Rp ${totalSudahDibeli.toLocaleString('id-ID')} berhasil dicatat ke Dompet!`);
      setTimeout(() => {
        router.push('/dompet');
      }, 1000);
    } catch (err) {
      console.error('Error saat menyimpan transaksi:', err);
      setShowFinishModal(false);
      showToast('Pengeluaran dicatat untuk sesi ini.');
      setTimeout(() => {
        router.push('/dompet');
      }, 1000);
    } finally {
      setIsSubmittingFinish(false);
    }
  };

  // Tampilan Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fff8f7] flex items-center justify-center p-6 text-center text-[#737a65]">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-8 h-8 animate-spin text-[#306a3b]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="font-bold text-sm text-[#2c1514]">Menyiapkan daftar belanja pasar keluarga...</span>
          <span className="text-xs text-[#737a65]">Mengkonsolidasikan resep menu &amp; faktor BDD Kemenkes</span>
        </div>
      </div>
    );
  }

  // Tampilan Kosong Jika Belum Ada Menu Aktif
  if (!rencanaMenu || !rencanaMenu.hari || rencanaMenu.hari.length === 0) {
    return (
      <div className="bg-[#fff8f7] min-h-screen text-[#2c1514] flex flex-col justify-between font-sans">
        <Sidebar
          activePath="daftar-belanja"
          mobileOpen={mobileSidebarOpen}
          setMobileOpen={setMobileSidebarOpen}
          anggotaCount={anggotaList.length}
        />
        <main className="lg:pl-64 flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-stone-200/80 shadow-sm text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#fff0ef] text-[#306a3b] text-3xl flex items-center justify-center shadow-2xs">
              🧺
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-[#2c1514] tracking-tight">
                Belum Ada Menu 7 Hari yang Dihasilkan
              </h2>
              <p className="text-[#5e5e5f] text-sm mt-1.5 leading-relaxed">
                Daftar belanja pasar disusun otomatis dari menu 7 hari keluarga Anda, disesuaikan dengan kebutuhan gizi anggota dan batas anggaran bulanan.
              </p>
            </div>
            <Link
              href="/menu"
              className="min-h-[48px] px-6 py-3 rounded-full bg-[#6da003] hover:bg-[#466800] text-white font-bold text-sm flex items-center justify-center transition-colors cursor-pointer shadow-sm mt-2"
            >
              Generate Menu 7 Hari Sekarang →
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-[#fff8f7] font-sans text-[#2c1514] min-h-screen">
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
      <header className="lg:hidden sticky top-0 bg-white/95 backdrop-blur-md border-b border-[#c3c9b2]/30 px-4 h-16 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 -ml-1 rounded-xl text-[#2c1514] hover:bg-stone-100 transition cursor-pointer"
            aria-label="Buka navigasi"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-extrabold text-[17px] text-[#306a3b] tracking-tight">PORSI KITA</span>
        </div>
        <Link
          href="/menu"
          className="text-xs font-bold text-[#306a3b] bg-[#fff0ef] border border-[#306a3b]/20 px-3 py-1.5 rounded-full hover:bg-[#ffe2df] transition"
        >
          Lihat Menu
        </Link>
      </header>

      {/* Desktop Fixed Header */}
      <header className="hidden lg:flex fixed top-0 left-64 right-0 h-16 bg-[#fff8f7]/90 backdrop-blur-xl border-b border-[#c3c9b2]/30 z-40 items-center justify-between px-8 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <span className="text-[14px] font-extrabold text-[#2c1514] tracking-tight">
            Daftar Belanja Pasar
          </span>
          <span className="text-stone-300 text-[13px]">•</span>
          <span className="text-[#737a65] text-[13px] font-medium">
            {keluarga?.alias || 'Keluarga Kita'} (Tersinkron Resep Menu 7 Hari)
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-[13px] font-bold text-[#2c1514] leading-tight">
              {keluarga?.alias || 'Ibu Rumah Tangga'}
            </div>
            <div className="text-[11px] text-[#306a3b] font-semibold leading-tight mt-0.5">
              {keluarga?.wilayah || 'Pasar Tradisional'}
            </div>
          </div>
          <div className="w-9 h-9 rounded-full bg-[#466800] text-white flex items-center justify-center text-[13px] font-bold shadow-xs">
            {keluarga?.alias?.charAt(0) || 'P'}
          </div>
        </div>
      </header>

      {/* 3. MAIN CONTENT CONTAINER */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <main className="flex-1 pt-4 lg:pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
          <div className="flex flex-col gap-5">

            {/* Toast Notification Alert */}
            {toastMsg && (
              <div className="p-3.5 rounded-2xl bg-[#306a3b] text-white text-xs font-bold shadow-md transition flex items-center justify-between animate-fadeIn">
                <div className="flex items-center gap-2">
                  <span className="text-[#b2f2b6]">✓</span>
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

            {/* Page Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#b2f2b6] text-[#367041] text-xs font-semibold mb-1">
                  <span>🥬 Sesuai Resep Menu 7 Hari</span>
                  <span>•</span>
                  <span>Faktor BDD Kemenkes</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2c1514] tracking-tight">
                  Daftar Belanja Pasar Keluarga
                </h1>
                <p className="text-xs sm:text-sm text-[#5e5e5f] mt-0.5">
                  Kebutuhan bahan pangan dihitung otomatis dari resep menu masak 7 hari, dengan fitur penghematan stok kulkas.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Link
                  href="/menu"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#306a3b] hover:text-[#466800] transition py-2 px-3.5 rounded-xl bg-white border border-stone-200 hover:bg-[#fff0ef] shadow-2xs"
                >
                  <span>← Lihat Jadwal Menu</span>
                </Link>
                <Link
                  href="/dompet"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2c1514] hover:text-[#306a3b] transition py-2 px-3.5 rounded-xl bg-white border border-stone-200 hover:bg-[#fff0ef] shadow-2xs"
                >
                  <span>Dompet Keuangan →</span>
                </Link>
              </div>
            </div>

            {/* HERO BUDGET & SAVINGS BANNER CARD */}
            <div className="rounded-3xl bg-[#306a3b] text-white p-5 sm:p-7 shadow-md relative overflow-hidden border border-[#306a3b]">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
                <div className="flex flex-col gap-2.5 max-w-xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-[#b2f2b6] text-[11px] font-bold w-fit">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>
                      BELANJA {periodeFilter === 'hari_ini' ? '1 HARI (HARI INI)' : periodeFilter === '3_hari' ? '3 HARI PERTAMA' : '1 MINGGU (7 HARI PENUH)'}
                    </span>
                  </div>

                  {/* Main Amount & Limit */}
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-mono">
                      Rp {totalBiayaBelanjaPasar.toLocaleString('id-ID')}
                    </div>
                    <span className="text-xs text-white/80 font-medium">
                      Batas Anggaran: Rp {batasAmanRp.toLocaleString('id-ID')}
                    </span>
                  </div>

                  {/* Kulkas Savings Highlight Box */}
                  {totalHematKulkas > 0 ? (
                    <div className="bg-white/15 backdrop-blur-xs rounded-2xl px-4 py-2.5 border border-white/20 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🧊</span>
                        <div>
                          <span className="font-bold text-[#b2f2b6]">Hemat Rp {totalHematKulkas.toLocaleString('id-ID')}</span>
                          <span className="text-white/80 ml-1">
                            ({jumlahBahanKulkas} bahan sudah ada di kulkas, tidak perlu beli)
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] bg-[#6da003] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-white">
                        Hemat Aktif
                      </span>
                    </div>
                  ) : (
                    <div className="bg-white/10 rounded-2xl px-4 py-2 text-xs text-white/80 flex items-center gap-2">
                      <span>💡</span>
                      <span>
                        Punya stok bumbu atau bahan di kulkas? Tandai tombol <strong>&quot;+ Kulkas&quot;</strong> agar anggaran belanja lebih hemat.
                      </span>
                    </div>
                  )}

                  {/* Progress Bar Belanja */}
                  <div className="w-full bg-white/20 rounded-full h-2.5 overflow-hidden my-0.5">
                    <div
                      className="bg-[#6da003] h-full rounded-full transition-all duration-500"
                      style={{ width: `${persentaseDibeli}%` }}
                    />
                  </div>

                  <div className="flex items-center gap-3 text-xs text-white/90 flex-wrap">
                    <span>
                      Dicentang: <strong className="text-white font-bold font-mono">Rp {totalSudahDibeli.toLocaleString('id-ID')}</strong> ({persentaseDibeli}%)
                    </span>
                    <span className="text-white/40">•</span>
                    <span>
                      Sisa Belanja: <strong className="text-[#b2f2b6] font-bold font-mono">Rp {totalSisaKebutuhan.toLocaleString('id-ID')}</strong>
                    </span>
                  </div>
                </div>

                {/* Action Buttons Utama */}
                <div className="flex flex-row lg:flex-col gap-2.5 sm:items-stretch lg:items-end justify-center shrink-0">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(teksWhatsApp)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[48px] px-5 py-2.5 rounded-full bg-[#6da003] hover:bg-[#466800] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer flex-1 sm:flex-initial"
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
                    className="min-h-[48px] px-5 py-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer border border-white/20 flex-1 sm:flex-initial"
                  >
                    <svg className="w-4 h-4 text-[#b2f2b6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Selesai &amp; Catat Dompet</span>
                  </button>
                </div>
              </div>
            </div>

            {/* EXPANDABLE MENU RECIPES IN THIS PERIOD */}
            <div className="bg-white rounded-2xl p-4 shadow-2xs border border-stone-200/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">🍳</span>
                  <span className="text-xs sm:text-sm font-bold text-[#2c1514]">
                    Menu Masakan dalam Periode Ini ({resepDalamPeriode.length} Hidangan)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRecipeList(!showRecipeList)}
                  className="text-xs font-bold text-[#306a3b] hover:text-[#466800] py-1 px-2.5 rounded-lg bg-[#fff0ef] transition cursor-pointer"
                >
                  {showRecipeList ? 'Sembunyikan ▲' : 'Lihat Resep ▼'}
                </button>
              </div>

              {showRecipeList && (
                <div className="pt-3 mt-3 border-t border-stone-100 flex flex-wrap gap-2 animate-fadeIn">
                  {resepDalamPeriode.map((r) => (
                    <span
                      key={r.kode}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#fff0ef] text-[#2c1514] border border-stone-200/60"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#6da003]" />
                      {r.nama}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* CONTROL BAR: FILTER PERIODE, KULKAS, STATUS & PENCARIAN */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-2xs border border-stone-200/80 flex flex-col gap-3.5">
              {/* Row 1: Segmented Control Periode Belanja (1 Minggu / 3 Hari / 1 Hari) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <label className="text-[12px] font-bold text-[#737a65]">
                    Pilih Kebutuhan Belanja:
                  </label>
                  <div className="flex items-center gap-1 p-1 bg-[#fff0ef] rounded-2xl border border-stone-200/60">
                    <button
                      type="button"
                      onClick={() => setPeriodeFilter('1_minggu')}
                      className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer ${
                        periodeFilter === '1_minggu'
                          ? 'bg-[#306a3b] text-white shadow-xs'
                          : 'text-[#737a65] hover:text-[#2c1514]'
                      }`}
                    >
                      1 Minggu (7 Hari)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPeriodeFilter('3_hari')}
                      className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer ${
                        periodeFilter === '3_hari'
                          ? 'bg-[#306a3b] text-white shadow-xs'
                          : 'text-[#737a65] hover:text-[#2c1514]'
                      }`}
                    >
                      3 Hari
                    </button>
                    <button
                      type="button"
                      onClick={() => setPeriodeFilter('hari_ini')}
                      className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer ${
                        periodeFilter === 'hari_ini'
                          ? 'bg-[#306a3b] text-white shadow-xs'
                          : 'text-[#737a65] hover:text-[#2c1514]'
                      }`}
                    >
                      1 Hari (Hari Ini)
                    </button>
                  </div>
                </div>

                {/* Sembunyikan Stok Kulkas Checkbox */}
                <label className="flex items-center gap-2.5 cursor-pointer select-none px-4 py-2.5 rounded-2xl border border-stone-200/80 bg-[#fff0ef]/60 hover:bg-[#fff0ef] transition min-h-[44px] shrink-0 self-start sm:self-end">
                  <input
                    type="checkbox"
                    checked={hideFridge}
                    onChange={(e) => setHideFridge(e.target.checked)}
                    className="w-4 h-4 text-[#306a3b] rounded focus:ring-[#306a3b] border-stone-300"
                  />
                  <span className="text-xs font-bold text-[#2c1514]">
                    Sembunyikan Bahan Kulkas ({jumlahBahanKulkas})
                  </span>
                </label>
              </div>

              {/* Row 2: Search & Status Filter */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-stone-100">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari bahan masakan atau nama lapak..."
                    className="w-full min-h-[44px] pl-10 pr-8 py-2 rounded-2xl bg-[#fff0ef] text-xs font-semibold text-[#2c1514] placeholder:text-[#737a65] focus:outline-none focus:ring-2 focus:ring-[#306a3b]"
                  />
                  <svg
                    className="w-4 h-4 text-[#737a65] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs px-1"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Status Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('semua')}
                    className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === 'semua'
                        ? 'bg-[#306a3b] text-white shadow-2xs'
                        : 'bg-[#fff0ef] text-[#737a65] hover:text-[#2c1514]'
                    }`}
                  >
                    Semua ({daftarBelanja.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('belum_dibeli')}
                    className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === 'belum_dibeli'
                        ? 'bg-[#6da003] text-white shadow-2xs'
                        : 'bg-[#fff0ef] text-[#737a65] hover:text-[#2c1514]'
                    }`}
                  >
                    Perlu Beli ({itemsBelumDibeli.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('kulkas')}
                    className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === 'kulkas'
                        ? 'bg-[#306a3b] text-white shadow-2xs'
                        : 'bg-[#fff0ef] text-[#737a65] hover:text-[#2c1514]'
                    }`}
                  >
                    Di Kulkas ({jumlahBahanKulkas})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('sudah_dibeli')}
                    className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === 'sudah_dibeli'
                        ? 'bg-[#306a3b] text-white shadow-2xs'
                        : 'bg-[#fff0ef] text-[#737a65] hover:text-[#2c1514]'
                    }`}
                  >
                    Sudah Dibeli
                  </button>
                </div>
              </div>
            </div>

            {/* 12-COLUMN MAIN CONTENT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

              {/* LEFT COLUMN: Kelompok Lapak Pasar (8 Kolom) */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                {perKategori.length === 0 ? (
                  <div className="bg-white rounded-3xl p-8 text-center text-[#737a65] border border-stone-200 shadow-2xs flex flex-col items-center gap-3">
                    <span className="text-3xl">🥦</span>
                    <span className="font-bold text-[#2c1514] text-sm">Tidak ada bahan belanjaan pada filter ini</span>
                    <p className="text-xs text-[#737a65] max-w-sm">
                      Seluruh bahan mungkin telah ditandai ada di stok kulkas, sudah dibeli, atau kata kunci pencarian tidak cocok.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter('semua');
                        setHideFridge(false);
                        setSearchQuery('');
                      }}
                      className="min-h-[44px] px-5 py-2 rounded-full bg-[#fff0ef] hover:bg-[#ffe2df] text-xs font-bold text-[#306a3b] transition mt-1 cursor-pointer"
                    >
                      Reset Filter Belanja
                    </button>
                  </div>
                ) : (
                  perKategori.map(([kategori, items]) => {
                    const subtotalKategori = items.reduce((sum, it) => sum + it.estimasi_biaya_rp, 0);
                    const nonFridgeInKategori = items.filter((it) => !fridgeMap[it.kode_tkpi]);
                    const isAllChecked =
                      nonFridgeInKategori.length > 0 &&
                      nonFridgeInKategori.every((it) => checkedMap[it.kode_tkpi]);

                    return (
                      <div
                        key={kategori}
                        className="bg-white rounded-3xl p-4 sm:p-5 shadow-2xs border border-stone-200/80 flex flex-col gap-3"
                      >
                        {/* Lapak Header Bar */}
                        <div className="flex items-center justify-between gap-2.5 pb-2.5 border-b border-stone-100">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-2xl bg-[#fff0ef] flex items-center justify-center text-lg shrink-0 shadow-2xs">
                              {getKategoriIcon(kategori)}
                            </div>
                            <div>
                              <h2 className="text-sm sm:text-[15px] font-extrabold text-[#2c1514] leading-tight">
                                Lapak {kategori}
                              </h2>
                              <span className="text-[11px] text-[#737a65] font-medium">
                                {items.length} Bahan • Subtotal: <strong className="text-[#306a3b] font-mono">Rp {subtotalKategori.toLocaleString('id-ID')}</strong>
                              </span>
                            </div>
                          </div>

                          {nonFridgeInKategori.length > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleKategoriAll(items)}
                              className="text-[11px] font-bold text-[#306a3b] hover:text-[#466800] px-3.5 py-1.5 rounded-full bg-[#fff0ef] hover:bg-[#ffe2df] transition cursor-pointer min-h-[36px]"
                            >
                              {isAllChecked ? 'Batalkan Centang' : 'Centang Semua Lapak ✓'}
                            </button>
                          )}
                        </div>

                        {/* Items List di Lapak Terkait */}
                        <div className="flex flex-col gap-2">
                          {items.map((item) => {
                            const inFridge = !!fridgeMap[item.kode_tkpi];
                            const isChecked = !!checkedMap[item.kode_tkpi];
                            const displayGram =
                              item.kebutuhan_beli_gram >= 1000
                                ? `${(item.kebutuhan_beli_gram / 1000).toFixed(1)} kg`
                                : `${item.kebutuhan_beli_gram} gram`;

                            return (
                              <div
                                key={item.kode_tkpi}
                                onClick={() => {
                                  if (!inFridge) toggleCheck(item.kode_tkpi);
                                }}
                                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all select-none gap-3 ${
                                  inFridge
                                    ? 'bg-[#f4fbf4] border-[#b2f2b6] opacity-90'
                                    : isChecked
                                    ? 'bg-stone-50/70 border-stone-200 opacity-60 cursor-pointer'
                                    : 'bg-white border-stone-200/90 hover:border-[#306a3b]/40 hover:bg-[#fff0ef]/30 cursor-pointer'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {/* Checkbox (hanya aktif jika tidak ada di kulkas) */}
                                  {!inFridge ? (
                                    <div
                                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                                        isChecked
                                          ? 'bg-[#6da003] text-white shadow-2xs'
                                          : 'border-2 border-stone-300 bg-white text-transparent'
                                      }`}
                                    >
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    </div>
                                  ) : (
                                    <div className="w-6 h-6 rounded-lg bg-[#b2f2b6] text-[#367041] flex items-center justify-center shrink-0 text-xs">
                                      🧊
                                    </div>
                                  )}

                                  <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span
                                        className={`text-xs sm:text-sm font-bold truncate ${
                                          inFridge
                                            ? 'text-[#2c1514]'
                                            : isChecked
                                            ? 'line-through text-stone-400'
                                            : 'text-[#2c1514]'
                                        }`}
                                      >
                                        {item.nama_bahan}
                                      </span>

                                      {inFridge && (
                                        <span className="px-2 py-0.5 rounded-full bg-[#b2f2b6] text-[#2c1514] text-[10px] font-bold">
                                          Ada di Kulkas (Hemat)
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1.5 text-[11px] text-[#737a65] mt-0.5">
                                      <span className="font-semibold text-[#2c1514] bg-[#fff0ef] px-1.5 py-0.5 rounded-md">
                                        {displayGram}
                                      </span>
                                      <span>•</span>
                                      <span title="Bagian Dapat Dimakan (TKPI)">
                                        BDD {item.bdd_percent}% ({item.kebutuhan_bersih_gram}g)
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {/* Tombol Toggle Kulkas (Min 44px) */}
                                  <button
                                    type="button"
                                    onClick={(e) => toggleFridge(e, item.kode_tkpi)}
                                    className={`min-h-[40px] px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                      inFridge
                                        ? 'bg-[#b2f2b6] text-[#367041] border border-[#6da003]/40'
                                        : 'bg-[#fff0ef] text-[#737a65] hover:text-[#2c1514] hover:bg-[#ffe2df]'
                                    }`}
                                    title={inFridge ? 'Klik untuk menghapus dari stok kulkas' : 'Tandai bahan ini sudah ada di kulkas'}
                                  >
                                    {inFridge ? '🧊 Di Kulkas' : '+ Kulkas'}
                                  </button>

                                  {/* Nominal Biaya */}
                                  <div className="text-right">
                                    {inFridge ? (
                                      <div className="flex flex-col items-end">
                                        <span className="text-xs sm:text-sm font-extrabold text-[#306a3b] font-mono">
                                          Hemat Rp {item.estimasi_biaya_rp.toLocaleString('id-ID')}
                                        </span>
                                        <span className="text-[10px] text-[#737a65] line-through">
                                          Rp {item.estimasi_biaya_rp.toLocaleString('id-ID')}
                                        </span>
                                      </div>
                                    ) : (
                                      <span
                                        className={`text-xs sm:text-sm font-extrabold tabular-nums font-mono ${
                                          isChecked ? 'line-through text-stone-400' : 'text-[#306a3b]'
                                        }`}
                                      >
                                        Rp {item.estimasi_biaya_rp.toLocaleString('id-ID')}
                                      </span>
                                    )}
                                  </div>

                                  {/* Edit Harga Button */}
                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenEditPrice(e, item)}
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-[#2c1514] hover:bg-stone-100 transition cursor-pointer"
                                    title="Sesuaikan harga bahan di pasar Anda"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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

              {/* RIGHT COLUMN: Rincian Anggaran & Titipan Belanja (4 Kolom - Sticky) */}
              <div className="lg:col-span-4 lg:sticky lg:top-20 flex flex-col gap-4">

                {/* CARD 1: RINGKASAN ANGGARAN CERDAS */}
                <div className="bg-white rounded-3xl p-5 shadow-2xs border border-stone-200/80 flex flex-col gap-3.5">
                  <div className="flex items-center gap-2.5 pb-2.5 border-b border-stone-100">
                    <div className="w-8 h-8 rounded-xl bg-[#fff0ef] text-[#306a3b] flex items-center justify-center text-base shrink-0">
                      📊
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-[#2c1514] leading-tight">
                        Ringkasan Belanja Cerdas
                      </h3>
                      <span className="text-[11px] text-[#737a65]">
                        Kalkulasi hemat menu vs stok rumah
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[#737a65]">
                      <span>Total Kebutuhan Menu ({periodeFilter.replace('_', ' ')}):</span>
                      <span className="font-bold text-[#2c1514] font-mono">
                        Rp {totalBiayaSemuaBahan.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[#306a3b]">
                      <span className="font-semibold">Hemat dari Stok Kulkas ({jumlahBahanKulkas} bahan):</span>
                      <span className="font-bold font-mono">
                        - Rp {totalHematKulkas.toLocaleString('id-ID')}
                      </span>
                    </div>

                    {totalTitipan > 0 && (
                      <div className="flex items-center justify-between text-[#737a65]">
                        <span>Titipan Tambahan ({titipanList.length}):</span>
                        <span className="font-bold text-[#2c1514] font-mono">
                          + Rp {totalTitipan.toLocaleString('id-ID')}
                        </span>
                      </div>
                    )}

                    <div className="border-t border-dashed border-stone-200 pt-2 flex items-center justify-between font-bold text-sm text-[#2c1514]">
                      <span>Biaya Belanja Pasar:</span>
                      <span className="text-[#306a3b] font-mono">
                        Rp {totalBiayaBelanjaPasar.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#737a65] pt-1">
                      <span>Sudah dibeli di pasar:</span>
                      <span className="font-semibold font-mono text-[#306a3b]">
                        Rp {totalSudahDibeli.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {totalHematKulkas > 0 && (
                    <div className="p-3 rounded-2xl bg-[#f4fbf4] border border-[#b2f2b6] text-[11px] text-[#367041] flex items-center gap-2">
                      <span>✓</span>
                      <span>
                        Ibu menghemat <strong>Rp {totalHematKulkas.toLocaleString('id-ID')}</strong> karena memanfaatkan bahan yang sudah ada!
                      </span>
                    </div>
                  )}
                </div>

                {/* CARD 2: TITIPAN BELANJA & BERBAGI */}
                <div className="bg-white rounded-3xl p-5 shadow-2xs border border-stone-200/80 flex flex-col gap-3.5">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-stone-100">
                    <div className="w-8 h-8 rounded-xl bg-[#fff0ef] text-[#306a3b] flex items-center justify-center text-base shrink-0">
                      🛍️
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-[#2c1514] leading-tight">
                        Titipan Tambahan
                      </h3>
                      <span className="text-[11px] text-[#737a65]">
                        Catat barang titipan mendadak saat ke pasar
                      </span>
                    </div>
                  </div>

                  {/* Preset Titipan Cepat */}
                  <div>
                    <span className="text-[11px] font-bold text-[#737a65] block mb-1">
                      Titipan Populer:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_TITIPAN_PRESETS.map((p) => (
                        <button
                          key={p.nama}
                          type="button"
                          onClick={() => handleAddPresetTitipan(p)}
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#fff0ef] hover:bg-[#ffe2df] text-[#2c1514] transition cursor-pointer"
                        >
                          + {p.nama}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Form Tambah Titipan Kustom */}
                  <form onSubmit={handleAddTitipan} className="flex flex-col gap-1.5 pt-2 border-t border-stone-100">
                    <label className="text-[11px] font-bold text-[#737a65]">
                      Tambah Titipan Baru:
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={titipanNama}
                        onChange={(e) => setTitipanNama(e.target.value)}
                        placeholder="misal: Kerupuk, Tisu"
                        className="flex-1 px-3 py-2 rounded-xl bg-[#fff0ef] text-xs font-semibold text-[#2c1514] placeholder:text-[#737a65] focus:outline-none focus:ring-2 focus:ring-[#306a3b]"
                      />
                      <input
                        type="number"
                        step="1000"
                        value={titipanHarga}
                        onChange={(e) => setTitipanHarga(e.target.value)}
                        placeholder="Rp"
                        className="w-20 px-3 py-2 rounded-xl bg-[#fff0ef] text-xs font-semibold text-[#2c1514] focus:outline-none focus:ring-2 focus:ring-[#306a3b]"
                      />
                      <button
                        type="submit"
                        className="w-9 h-9 rounded-xl bg-[#306a3b] text-white font-bold flex items-center justify-center hover:bg-[#155126] transition shrink-0 cursor-pointer text-sm shadow-2xs"
                        title="Tambah titipan"
                      >
                        +
                      </button>
                    </div>
                  </form>

                  {/* List Titipan yang Ditambahkan */}
                  {titipanList.length > 0 && (
                    <div className="flex flex-col gap-1 p-2.5 bg-[#fff0ef] rounded-2xl border border-stone-200/60">
                      <span className="text-[10px] font-bold text-[#737a65] uppercase tracking-wider">
                        Daftar Titipan ({titipanList.length}):
                      </span>
                      {titipanList.map((t) => (
                        <div key={t.id} className="flex items-center justify-between text-xs py-1 border-b border-stone-200/50 last:border-b-0">
                          <span className="font-semibold text-[#2c1514] truncate">• {t.nama}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[#306a3b] font-bold text-[11px] font-mono">
                              Rp {t.estimasiRp.toLocaleString('id-ID')}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTitipan(t.id)}
                              className="text-stone-400 hover:text-red-600 cursor-pointer px-1"
                              title="Hapus"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons: Salin Format WA & Buka Chat */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={handleCopyWhatsApp}
                      className="w-full min-h-[44px] px-3 py-2 rounded-full bg-stone-100 hover:bg-stone-200 text-[#2c1514] transition text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <svg className="w-4 h-4 text-[#737a65]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>{copyStatus === 'copied' ? 'Format WA Tersalin ✓' : 'Salin Format Teks WA'}</span>
                    </button>

                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(teksWhatsApp)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full min-h-[44px] px-3 py-2 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white transition text-xs font-bold flex items-center justify-center gap-2 shadow-2xs"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.071.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.129.332.202.043.073.043.419-.101.824z" />
                      </svg>
                      <span>Buka Aplikasi WhatsApp</span>
                    </a>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </main>
      </div>

      {/* MODAL 1: SESUAIKAN ESTIMASI HARGA BAHAN */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-xl border border-stone-200 animate-scaleIn flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h3 className="text-base font-extrabold text-[#2c1514]">
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
                <label className="text-xs font-bold text-[#737a65] block mb-1">
                  Nama Bahan Pangan:
                </label>
                <div className="text-sm font-bold text-[#306a3b]">
                  {editingItem.nama_bahan} ({editingItem.kebutuhan_beli_gram}g)
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#737a65] block mb-1">
                  Harga di Pasar / Warung Langganan (Rp):
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#737a65] font-mono">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={editPriceInput}
                    onChange={(e) => setEditPriceInput(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[#fff0ef] border border-stone-200 text-sm font-bold text-[#2c1514] font-mono focus:outline-none focus:ring-2 focus:ring-[#306a3b]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="min-h-[46px] px-5 py-2 rounded-full bg-stone-100 text-[#2c1514] text-xs font-bold hover:bg-stone-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="min-h-[46px] px-6 py-2 rounded-full bg-[#6da003] hover:bg-[#466800] text-white text-xs font-bold transition-colors cursor-pointer shadow-sm"
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
              <div className="w-10 h-10 rounded-2xl bg-[#fff0ef] text-[#306a3b] text-xl flex items-center justify-center shrink-0">
                💰
              </div>
              <div>
                <h3 className="text-[17px] font-extrabold text-[#2c1514] leading-tight">
                  Selesaikan Belanja Pasar
                </h3>
                <span className="text-[11px] text-[#737a65] font-medium">
                  Catat pengeluaran nyata ke database dompet keluarga
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#fff0ef] border border-stone-200/60 flex flex-col gap-1">
              <span className="text-xs text-[#737a65] font-medium">Total Bahan yang Dicentang di Pasar:</span>
              <span className="text-2xl font-extrabold text-[#306a3b] tabular-nums font-mono">
                Rp {totalSudahDibeli.toLocaleString('id-ID')}
              </span>
              <span className="text-[11px] text-[#737a65] mt-1">
                Bahan yang ada di kulkas (hemat Rp {totalHematKulkas.toLocaleString('id-ID')}) otomatis tidak ditagihkan ke pengeluaran.
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#737a65]">Catatan Pengeluaran:</label>
              <input
                type="text"
                value={finishCatatan}
                onChange={(e) => setFinishCatatan(e.target.value)}
                placeholder="misal: Belanja sayur & lauk segar di Pasar Wonokromo"
                className="w-full px-4 py-3 rounded-2xl bg-[#fff0ef] border border-stone-200 text-xs font-semibold text-[#2c1514] focus:outline-none focus:ring-2 focus:ring-[#306a3b]"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowFinishModal(false)}
                disabled={isSubmittingFinish}
                className="min-h-[48px] px-5 py-2 rounded-full bg-stone-100 text-[#2c1514] text-xs font-bold hover:bg-stone-200 cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmFinish}
                disabled={isSubmittingFinish}
                className="min-h-[48px] px-6 py-2.5 rounded-full bg-[#6da003] hover:bg-[#466800] text-white text-xs font-bold cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50 transition-colors"
              >
                {isSubmittingFinish ? (
                  <span>Menyimpan ke Database...</span>
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
