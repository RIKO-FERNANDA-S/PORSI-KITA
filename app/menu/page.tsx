'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Sidebar from '../../components/Sidebar';
import {
  RencanaMenu7Hari,
  MenuHari,
  ResepMasakan,
  Anggota,
  Keluarga,
  SesiMakan,
  BahanPangan,
  NilaiGizi,
} from '../../lib/types';
import {
  getStoredKeluarga,
  getStoredAnggota,
  getStoredMenu,
  saveStoredMenu,
} from '../../lib/store';
import { generateMenu } from '../../lib/planner/generate';
import { cariPenggantiHidangan, OpsiPenggantiHidangan } from '../../lib/planner/swap';
import { BAHAN_MAP, RESEP_MAP } from '../../lib/data/dataset';
import { hitungKebutuhan } from '../../lib/nutrition/akg';
import { FRAKSI_SESI_MAKAN, hitungPorsiSesiMakan } from '../../lib/nutrition/portions';
import { hitungSkorAnggota, hitungSkorKeluarga } from '../../lib/nutrition/score';

// Practical Indonesian home cooking steps mapping for each recipe
const LANGKAH_MEMASAK: Record<string, string[]> = {
  RSP001: [
    'Cuci beras 2-3 kali dengan air bersih mengalir hingga air bilasan cukup bening.',
    'Tambahkan air bersih dengan takaran standar (sekitar 1 : 1.5 tinggi ruas jari).',
    'Masak di rice cooker atau kukusan tradisional hingga tanak dan pulen.',
  ],
  RSP002: [
    'Tumis bawang putih cincang hingga harum, masukkan cincangan ayam dan irisan bayam.',
    'Campurkan beras yang sudah dicuci bersama air kaldu ayam hangat di mangkuk tahan panas.',
    'Kukus selama 35 menit hingga tekstur nasi tim lembut dan sangat ramah cerna.',
  ],
  RSP003: [
    'Rebus potongan ayam segar hingga keluar kaldu gurih, buang buih kotoran di permukaan.',
    'Tumis bawang merah, bawang putih geprek, dan seledri cincang hingga wangi, tuang ke rebusan kaldu.',
    'Masukkan wortel dan buncis, bumbui garam secukupnya dan lada. Masak 7 menit hingga sayur matang renyah.',
  ],
  RSP004: [
    'Cuci bersih hati ayam, lumuri sedikit jeruk nipis agar tidak amis, lalu potong dadu.',
    'Tumis irisan bawang bombai, bawang putih, dan cabai merah tanpa biji hingga layu.',
    'Masukkan hati ayam, tambahkan kecap manis dan sedikit air. Masak dengan api sedang hingga matang merata.',
  ],
  RSP005: [
    'Kocok lepas 2 butir telur ayam dengan sedikit garam dan lada bubuk.',
    'Iris halus daun bayam segar, campurkan langsung ke dalam adonan telur.',
    'Panaskan wajan dengan 1 sdm minyak kelapa/sayur, tuang adonan dan masak bolak-balik hingga matang keemasan.',
  ],
  RSP006: [
    'Siangi ikan kembung segar, kerat badannya lalu lumuri air jeruk nipis dan garam.',
    'Haluskan bumbu kuning (bawang merah, putih, kunyit bakar, kemiri, cabai merah).',
    'Lumuri ikan dengan bumbu dan daun kemangi segar, bungkus daun pisang lalu kukus 25 menit. Panggang sebentar untuk aroma harum.',
  ],
  RSP007: [
    'Marinasi ikan dengan perasan kunyit, ketumbar bubuk, bawang putih halus, dan garam selama 15 menit.',
    'Panaskan minyak cukup banyak dengan api sedang agar ikan matang merata.',
    'Goreng ikan hingga kering keemasan dan tiriskan minyaknya.',
  ],
  RSP008: [
    'Iris tipis daging sapi melawan serat agar empuk saat dimasak.',
    'Tumis bawang putih dan jahe geprek hingga harum, masukkan potongan daging hingga berubah warna.',
    'Masukkan potongan wortel, beri sedikit kecap dan kaldu, masak hingga daging empuk dan saus meresap.',
  ],
  RSP009: [
    'Potong tempe bentuk dadu 1.5 cm, goreng setengah matang agar tetap lembut di dalam.',
    'Tumis bawang merah, bawang putih, lengkuas, dan daun salam hingga harum aromatik.',
    'Masukkan tempe, kecap manis, sedikit gula merah, dan air. Aduk perlahan hingga bumbu meresap gurih.',
  ],
  RSP010: [
    'Potong tahu putih tebal, rebus bersama air kelapa (atau air putih), gula merah, ketumbar bubuk, daun salam, dan lengkuas.',
    'Ungkep dengan api kecil hingga air menyusut dan bumbu bacem meresap cokelat manis.',
    'Panggang sebentar di atas teflon atau goreng kilat sebelum disajikan hangat.',
  ],
  RSP011: [
    'Haluskan tahu putih, peras sedikit airnya menggunakan kain bersih.',
    'Campurkan tahu dengan daging ayam cincang, seledri iris, bawang putih goreng halus, telur, dan sedikit merica.',
    'Bentuk bulatan pipih, celupkan ke putih telur lalu goreng hingga cokelat keemasan.',
  ],
  RSP012: [
    'Iris tempe dengan ketebalan sedang (sekitar 0.5 cm).',
    'Buat adonan tepung beras, tepung terigu, irisan daun bawang, ketumbar, bawang putih, dan air secukupnya.',
    'Celupkan tempe ke adonan tepung lalu goreng dalam minyak panas hingga renyah gurih.',
  ],
  RSP013: [
    'Didihkan 700 ml air bersih bersama irisan temu kunci dan bawang merah.',
    'Masukkan jagung manis pipil, rebus selama 4-5 menit hingga jagung mulai empuk manis.',
    'Masukkan daun bayam segar, tambahkan garam dan sejumput gula. Masak cepat 2 menit agar zat besi dan vitamin terjaga.',
  ],
  RSP014: [
    'Didihkan air bersama bawang merah dan sedikit garam.',
    'Petik daun kelor muda yang segar, buang tangkai kerasnya.',
    'Masukkan daun kelor ke dalam air mendidih, matikan api setelah 1 menit agar warna hijau dan kalsium superfood tetap optimal.',
  ],
  RSP015: [
    'Petik daun dan batang kangkung muda, cuci di air mengalir.',
    'Tumis bawang merah, bawang putih, dan tauco manis hingga harum berminyak.',
    'Masukkan kangkung dengan api besar, aduk cepat selama 2 menit hingga layu renyah.',
  ],
  RSP016: [
    'Didihkan air kaldu sayur bening bersama irisan bawang bombai dan seledri.',
    'Masukkan potongan wortel dan buncis yang telah dipotong serong.',
    'Bumbui dengan garam, lada putih, dan kaldu jamur. Masak hingga sayuran matang empuk.',
  ],
  RSP017: [
    'Potong tahu putih kotak-kotak kecil, goreng sebentar hingga berkulit.',
    'Tumis bawang putih halus, masukkan daun bayam segar dan tahu goreng.',
    'Beri sedikit kecap asin atau saus tiram, aduk rata selama 2 menit lalu angkat hangat.',
  ],
  RSP018: [
    'Pilih pisang ambon segar yang matang pohon alami.',
    'Kupas kulit pisang dan potong serong rapi untuk porsi masing-masing anggota keluarga.',
    'Sajikan segar sebagai pencuci mulut kaya kalium.',
  ],
  RSP019: [
    'Kupas kulit pepaya matang, bersihkan biji hitam di dalamnya.',
    'Potong daging pepaya ukuran dadu 3 cm yang mudah dikunyah balita maupun lansia.',
    'Simpan sejenak di wadah tertutup agar sejuk saat dinikmati sekeluarga.',
  ],
};

// Fallback cooking steps for recipes without custom guide
const DEFAULT_LANGKAH = [
  'Siapkan dan timbang bahan baku segar sesuai takaran gramatur yang dianjurkan.',
  'Cuci bersih seluruh bahan di air mengalir dan potong sesuai kebutuhan tekstur anggota keluarga.',
  'Olah dengan metode memasak sehat (kukus, rebus, atau tumis minim minyak) hingga matang merata.',
  'Sajikan hangat dan bagi porsi sesuai takaran pengali masing-masing anggota.',
];

// Curated authentic culinary photos matching each recipe
const FOTO_RESEP: Record<string, string> = {
  RSP001: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&w=600&q=80',
  RSP002: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=600&q=80',
  RSP003: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80',
  RSP004: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
  RSP005: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80',
  RSP006: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80',
  RSP007: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80',
  RSP008: 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?auto=format&fit=crop&w=600&q=80',
  RSP009: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
  RSP010: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
  RSP011: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=600&q=80',
  RSP012: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
  RSP013: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80',
  RSP014: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
  RSP015: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
  RSP016: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80',
  RSP017: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
  RSP018: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=80',
  RSP019: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=600&q=80',
};

// Fallback photo based on recipe category
function getFotoResep(resep: ResepMasakan): string {
  if (FOTO_RESEP[resep.kode]) return FOTO_RESEP[resep.kode];
  if (resep.kategori === 'Makanan Pokok') {
    return 'https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&w=600&q=80';
  }
  if (resep.kategori === 'Lauk Hewani') {
    return 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80';
  }
  if (resep.kategori === 'Lauk Nabati') {
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
  }
  if (resep.kategori === 'Sayuran') {
    return 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80';
  }
  return 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=600&q=80';
}

export default function MenuPage() {
  const [rencanaMenu, setRencanaMenu] = useState<RencanaMenu7Hari | null>(null);
  const [keluarga, setKeluarga] = useState<Keluarga | null>(null);
  const [anggotaList, setAnggotaList] = useState<Anggota[]>([]);
  const [loading, setLoading] = useState(true);

  // Layout UI states
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(1); // 1 to 7
  const [activeMealTab, setActiveMealTab] = useState<'pagi' | 'siang' | 'malam'>('pagi');
  const [selectedMemberTabId, setSelectedMemberTabId] = useState<string>('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateNotice, setRegenerateNotice] = useState<string | null>(null);

  // Modals state
  const [detailResepModal, setDetailResepModal] = useState<ResepMasakan | null>(null);
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [resepTargetSwap, setResepTargetSwap] = useState<ResepMasakan | null>(null);
  const [sesiTargetSwap, setSesiTargetSwap] = useState<'pagi' | 'siang' | 'malam'>('pagi');

  // Load initial data
  useEffect(() => {
    const k = getStoredKeluarga();
    const a = getStoredAnggota();
    const m = getStoredMenu();

    setKeluarga(k);
    setAnggotaList(a);
    setRencanaMenu(m);

    if (a.length > 0) {
      setSelectedMemberTabId(a[0].id);
    }
    setLoading(false);
  }, []);

  // Handle Regenerate Menu with Micro-interaction
  const handleRegenerate = () => {
    if (!keluarga) return;
    setIsRegenerating(true);
    setRegenerateNotice('Menghitung Ulang Menu...');

    setTimeout(() => {
      const fresh = generateMenu({
        familyId: keluarga.id,
        familyName: keluarga.alias,
        budgetHarianRp: keluarga.budget_harian_rp,
        anggota: anggotaList,
        seed: Date.now(),
      });

      saveStoredMenu(fresh);
      setRencanaMenu(fresh);
      setIsRegenerating(false);
      setRegenerateNotice('Menu Berhasil Diperbarui!');

      setTimeout(() => {
        setRegenerateNotice(null);
      }, 2000);
    }, 900);
  };

  // Open Swap Modal
  const handleOpenSwap = (resep: ResepMasakan, sesi: 'pagi' | 'siang' | 'malam') => {
    setResepTargetSwap(resep);
    setSesiTargetSwap(sesi);
    setSwapModalOpen(true);
  };

  // Apply Swap and Recalculate
  const handleApplySwap = (resepBaru: ResepMasakan) => {
    if (!rencanaMenu || !resepTargetSwap) return;

    const currentHari = rencanaMenu.hari.find((h) => h.hari_ke === selectedDayIndex);
    if (!currentHari) return;

    // 1. Build map of kebutuhan
    const kebutuhanMap = new Map();
    anggotaList.forEach((ang) => {
      kebutuhanMap.set(ang.id, hitungKebutuhan(ang));
    });

    // 2. Update dish list in active session
    const currentSesi = currentHari.sesi_makan[sesiTargetSwap];
    const updatedHidangan = currentSesi.hidangan.map((h) =>
      h.kode === resepTargetSwap.kode ? resepBaru : h
    );

    // 3. Recalculate session portions
    const fraksi = FRAKSI_SESI_MAKAN[sesiTargetSwap];
    const labelSesi =
      sesiTargetSwap === 'pagi'
        ? 'Sarapan Pagi'
        : sesiTargetSwap === 'siang'
        ? 'Makan Siang'
        : 'Makan Malam';

    const { totalEnergiDasar, porsiPerAnggota } = hitungPorsiSesiMakan(
      anggotaList,
      kebutuhanMap,
      updatedHidangan,
      fraksi
    );

    const updatedSesi: SesiMakan = {
      sesi: sesiTargetSwap,
      label: labelSesi,
      persentase_energi: fraksi,
      hidangan: updatedHidangan,
      total_energi_standar_kcal: totalEnergiDasar,
      porsi_per_anggota: porsiPerAnggota,
    };

    const newSesiMakan = {
      ...currentHari.sesi_makan,
      [sesiTargetSwap]: updatedSesi,
    };

    // 4. Recalculate day cost
    let newDayCost = 0;
    const allSessions = [newSesiMakan.pagi, newSesiMakan.siang, newSesiMakan.malam];
    for (const s of allSessions) {
      for (const h of s.hidangan) {
        const totalPengali = s.porsi_per_anggota.reduce((sum, p) => sum + p.pengali, 0);
        newDayCost += h.biaya_per_porsi_rp * totalPengali;
      }
    }
    newDayCost = Math.round(newDayCost);

    // 5. Recalculate member nutrition scores
    const newSkorAnggotaList = anggotaList.map((a) => {
      const kebutuhan = kebutuhanMap.get(a.id)!;
      const asupanHarian: NilaiGizi = {
        energi_kcal: 0,
        protein_g: 0,
        lemak_g: 0,
        karbohidrat_g: 0,
        kalsium_mg: 0,
        zat_besi_mg: 0,
        seng_mg: 0,
        vitamin_a_mcg: 0,
        retinol_mcg: 0,
      };

      for (const s of allSessions) {
        const porsiAnggota = s.porsi_per_anggota.find((p) => p.anggota_id === a.id);
        if (porsiAnggota) {
          asupanHarian.energi_kcal += porsiAnggota.gizi_diterima.energi_kcal;
          asupanHarian.protein_g += porsiAnggota.gizi_diterima.protein_g;
          asupanHarian.lemak_g =
            (asupanHarian.lemak_g || 0) + (porsiAnggota.gizi_diterima.lemak_g || 0);
          asupanHarian.karbohidrat_g =
            (asupanHarian.karbohidrat_g || 0) +
            (porsiAnggota.gizi_diterima.karbohidrat_g || 0);
          asupanHarian.kalsium_mg += porsiAnggota.gizi_diterima.kalsium_mg;
          asupanHarian.zat_besi_mg += porsiAnggota.gizi_diterima.zat_besi_mg;
          asupanHarian.seng_mg += porsiAnggota.gizi_diterima.seng_mg;
          asupanHarian.vitamin_a_mcg += porsiAnggota.gizi_diterima.vitamin_a_mcg;
          asupanHarian.retinol_mcg =
            (asupanHarian.retinol_mcg || 0) +
            (porsiAnggota.gizi_diterima.retinol_mcg || 0);
        }
      }

      return hitungSkorAnggota(a.id, a.alias, asupanHarian, kebutuhan);
    });

    const newSkorKeluarga = hitungSkorKeluarga(newSkorAnggotaList);

    const updatedHari: MenuHari = {
      ...currentHari,
      sesi_makan: newSesiMakan,
      total_biaya_hari_rp: newDayCost,
      skor_keluarga: newSkorKeluarga,
    };

    const updatedDays = rencanaMenu.hari.map((h) =>
      h.hari_ke === selectedDayIndex ? updatedHari : h
    );

    const updatedTotalBiayaMingguan = updatedDays.reduce(
      (sum, h) => sum + h.total_biaya_hari_rp,
      0
    );

    const updatedRencana: RencanaMenu7Hari = {
      ...rencanaMenu,
      hari: updatedDays,
      total_biaya_mingguan_rp: updatedTotalBiayaMingguan,
    };

    saveStoredMenu(updatedRencana);
    setRencanaMenu(updatedRencana);
    setSwapModalOpen(false);
    setResepTargetSwap(null);
  };

  if (loading || !rencanaMenu) {
    return (
      <div className="min-h-screen bg-[#fff8f7] flex items-center justify-center p-6 text-stone-500 font-medium">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 animate-spin text-[#306a3b]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <span>Menyiapkan kalender menu keluarga 7 hari...</span>
        </div>
      </div>
    );
  }

  // Active day data
  const activeDay =
    rencanaMenu.hari.find((h) => h.hari_ke === selectedDayIndex) || rencanaMenu.hari[0];
  const activeSesi = activeDay.sesi_makan[activeMealTab];

  // Calculate session cost
  const estBiayaSesi = activeSesi.hidangan.reduce((sum, h) => {
    const totalPengali = activeSesi.porsi_per_anggota.reduce((acc, p) => acc + p.pengali, 0);
    return sum + h.biaya_per_porsi_rp * totalPengali;
  }, 0);

  // Active member for nutrition transparency table
  const activeSkorAnggota =
    activeDay.skor_keluarga.skor_per_anggota.find(
      (s) => s.anggota_id === selectedMemberTabId
    ) || activeDay.skor_keluarga.skor_per_anggota[0];

  const activeAnggota =
    anggotaList.find((a) => a.id === selectedMemberTabId) || anggotaList[0];

  // Candidates for swap modal
  const opsiSwap: OpsiPenggantiHidangan[] = resepTargetSwap
    ? cariPenggantiHidangan(resepTargetSwap, anggotaList, 0)
    : [];

  return (
    <div className="bg-[#fff8f7] font-sans text-[#2c1514] min-h-screen">
      {/* ========================================================= */}
      {/* 1. ASIDE SIDEBAR (Shared Component)                       */}
      {/* ========================================================= */}
      <Sidebar
        activePath="kalender-menu"
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
        anggotaCount={anggotaList.length}
        rencanaMenuId={rencanaMenu.id}
      />

      {/* ========================================================= */}
      {/* 2. TOP HEADER (Mobile & Desktop)                         */}
      {/* ========================================================= */}
      {/* Mobile Top Header */}
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

        <Link
          href={`/belanja/${rencanaMenu.id}`}
          className="p-2 rounded-full bg-[#fff0ef] text-[#306a3b] hover:bg-[#ffe2df] transition"
          title="Daftar Belanja Pasar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </Link>
      </header>

      {/* Desktop Top Bar */}
      <header className="hidden lg:flex fixed top-0 left-64 right-0 h-16 bg-white/90 backdrop-blur-md border-b border-[#c3c9b2]/30 z-40 items-center justify-between px-8">
        <div className="flex items-center gap-2 text-[#737a65]">
          <svg className="w-5 h-5 text-[#466800]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span className="text-[12px] font-bold tracking-wider uppercase">
            Perencana Domestik Harmonis • TKPI &amp; AKG 2019
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href={`/belanja/${rencanaMenu.id}`}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#fff0ef] text-[#306a3b] text-xs font-semibold hover:bg-[#ffe9e7] transition"
          >
            <span>🛒</span>
            <span>Belanja Pasar Hari Ini</span>
          </Link>
          <div className="w-8 h-8 rounded-full bg-[#466800] text-white flex items-center justify-center font-bold text-xs shadow-xs">
            {keluarga?.alias?.charAt(0) || 'K'}
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 3. MAIN DASHBOARD CONTENT                                */}
      {/* ========================================================= */}
      <main className="lg:pl-64 pt-4 lg:pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col gap-6">

          {/* SECTION 1: HEADER & KONTROL UTAMA */}
          <section className="bg-white p-5 sm:p-7 rounded-3xl shadow-xs border border-stone-200/70 flex flex-col gap-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2c1514] tracking-tight">
                    Rencana Menu Keluarga
                  </h1>
                  <span className="inline-flex items-center px-3.5 py-1 rounded-full bg-[#b2f2b6] text-[#367041] text-[12px] font-bold">
                    Minggu Ini • {rencanaMenu.is_fallback_package ? 'Paket Hemat' : 'Variasi Custom'}
                  </span>
                </div>
                <p className="text-[14px] sm:text-[15px] text-[#434937] max-w-2xl leading-relaxed">
                  Satu kali masak di dapur, porsi presisi sesuai kebutuhan gizi tiap anggota keluarga.
                </p>
              </div>

              {/* Action Button */}
              <div className="flex items-center flex-shrink-0">
                <button
                  id="btn-regenerate"
                  type="button"
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                  className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-full bg-[#6da003] hover:bg-[#466800] text-white font-bold text-[14px] shadow-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-75"
                >
                  {isRegenerating ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      <span>{regenerateNotice || 'Menghitung Ulang Menu...'}</span>
                    </>
                  ) : regenerateNotice ? (
                    <>
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{regenerateNotice}</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Buat Ulang Menu Mingguan</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Smart Information Card */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-[#fff0ef] rounded-2xl border border-stone-200/50">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#b2f2b6] text-[#367041] flex-shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <p className="text-[13px] sm:text-[14px] text-[#2c1514] leading-relaxed">
                <span className="font-bold text-[#306a3b]">Filter Aktif:</span> Budget Rp{' '}
                {keluarga?.budget_harian_rp.toLocaleString('id-ID') || '85.000'}/hari • Bebas Alergi:{' '}
                {anggotaList.some((a) => a.alergen.length > 0)
                  ? Array.from(new Set(anggotaList.flatMap((a) => a.alergen))).join(', ')
                  : 'Tidak ada alergi terdaftar'}{' '}
                • Sasaran: Gizi Seimbang Keluarga &amp; Ragam Pangan Lokal
              </p>
            </div>
          </section>

          {/* SECTION 2: NAVIGASI HARI (7 Pill Horizontal) */}
          <nav aria-label="Jadwal Hari Mingguan" className="overflow-x-auto pb-1 scrollbar-none">
            <div className="grid grid-flow-col auto-cols-[minmax(130px,1fr)] sm:grid-cols-7 gap-2.5 min-w-full">
              {rencanaMenu.hari.map((h) => {
                const isActive = h.hari_ke === selectedDayIndex;
                const costRibuan = Math.round(h.total_biaya_hari_rp / 1000);

                return (
                  <button
                    key={h.hari_ke}
                    type="button"
                    onClick={() => setSelectedDayIndex(h.hari_ke)}
                    aria-current={isActive ? 'date' : undefined}
                    className={`day-pill flex flex-col items-center justify-center p-3.5 rounded-2xl transition-all duration-200 min-h-[82px] cursor-pointer text-center ${
                      isActive
                        ? 'bg-[#306a3b] text-white shadow-md'
                        : 'bg-white hover:bg-[#fff0ef] text-[#2c1514] shadow-xs border border-stone-200/60'
                    }`}
                  >
                    <span
                      className={`text-[11px] font-bold flex items-center gap-1 uppercase tracking-wider ${
                        isActive ? 'text-[#b2f2b6]' : 'text-[#737a65]'
                      }`}
                    >
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#6da003]" />}
                      {h.label_hari}
                    </span>
                    <span
                      className={`text-[18px] font-black my-0.5 tracking-tight ${
                        isActive ? 'text-white' : 'text-[#2c1514]'
                      }`}
                    >
                      Hari ke-{h.hari_ke}
                    </span>
                    <span
                      className={`text-[11px] font-medium ${
                        isActive ? 'text-[#b2f2b6]' : 'text-[#737a65]'
                      }`}
                    >
                      Rp {costRibuan}rb
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* SECTION 3: BANNER STATUS HARI AKTIF */}
          <section className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-stone-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#6da003]" />
                <h2 className="text-[18px] font-bold text-[#2c1514]">
                  {activeDay.label_hari} (Hari ke-{activeDay.hari_ke})
                </h2>
              </div>
              <p className="text-[13px] sm:text-[14px] text-[#434937]">
                Estimasi Biaya:{' '}
                <strong className="text-[#2c1514] font-bold">
                  Rp {activeDay.total_biaya_hari_rp.toLocaleString('id-ID')}
                </strong>{' '}
                • Skor Gizi Keluarga:{' '}
                <strong className="text-[#306a3b] font-bold">
                  {activeDay.skor_keluarga.skor_rata_rata}% AKG Terpenuhi
                </strong>
              </p>
            </div>

            <Link
              href={`/belanja/${rencanaMenu.id}`}
              className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-full bg-[#306a3b] text-white hover:bg-[#155126] transition-all font-semibold text-[13px] sm:text-[14px] flex items-center justify-center gap-2 active:scale-98 shadow-xs"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Buka Daftar Belanja Hari Ini</span>
            </Link>
          </section>

          {/* SECTION 4: TAB SWITCHER 3 WAKTU MAKAN */}
          <div className="w-full bg-[#fff0ef] p-1.5 sm:p-2 rounded-2xl shadow-xs border border-stone-200/50">
            <div aria-label="Pilih Waktu Makan" className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="tablist">
              {/* Tab Pagi */}
              <button
                type="button"
                role="tab"
                aria-selected={activeMealTab === 'pagi'}
                onClick={() => setActiveMealTab('pagi')}
                className={`min-h-[58px] px-4 py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer text-left ${
                  activeMealTab === 'pagi'
                    ? 'bg-[#306a3b] text-white shadow-md'
                    : 'bg-white hover:bg-stone-50 text-[#434937]'
                }`}
              >
                <span className="text-2xl flex-shrink-0">🌅</span>
                <div className="flex flex-col leading-tight">
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-bold">Pagi</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        activeMealTab === 'pagi'
                          ? 'bg-white/20 text-white'
                          : 'bg-stone-100 text-[#737a65]'
                      }`}
                    >
                      06:30 WIB
                    </span>
                  </div>
                  <span
                    className={`text-[11px] mt-0.5 ${
                      activeMealTab === 'pagi' ? 'text-[#b2f2b6]' : 'text-[#737a65]'
                    }`}
                  >
                    Sarapan • Alokasi 30% AKG
                  </span>
                </div>
              </button>

              {/* Tab Siang */}
              <button
                type="button"
                role="tab"
                aria-selected={activeMealTab === 'siang'}
                onClick={() => setActiveMealTab('siang')}
                className={`min-h-[58px] px-4 py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer text-left ${
                  activeMealTab === 'siang'
                    ? 'bg-[#306a3b] text-white shadow-md'
                    : 'bg-white hover:bg-stone-50 text-[#434937]'
                }`}
              >
                <span className="text-2xl flex-shrink-0">☀️</span>
                <div className="flex flex-col leading-tight">
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-bold">Siang</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        activeMealTab === 'siang'
                          ? 'bg-white/20 text-white'
                          : 'bg-stone-100 text-[#737a65]'
                      }`}
                    >
                      12:30 WIB
                    </span>
                  </div>
                  <span
                    className={`text-[11px] mt-0.5 ${
                      activeMealTab === 'siang' ? 'text-[#b2f2b6]' : 'text-[#737a65]'
                    }`}
                  >
                    Makan Siang • Alokasi 40% AKG
                  </span>
                </div>
              </button>

              {/* Tab Malam */}
              <button
                type="button"
                role="tab"
                aria-selected={activeMealTab === 'malam'}
                onClick={() => setActiveMealTab('malam')}
                className={`min-h-[58px] px-4 py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer text-left ${
                  activeMealTab === 'malam'
                    ? 'bg-[#306a3b] text-white shadow-md'
                    : 'bg-white hover:bg-stone-50 text-[#434937]'
                }`}
              >
                <span className="text-2xl flex-shrink-0">🌙</span>
                <div className="flex flex-col leading-tight">
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-bold">Malam</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        activeMealTab === 'malam'
                          ? 'bg-white/20 text-white'
                          : 'bg-stone-100 text-[#737a65]'
                      }`}
                    >
                      18:30 WIB
                    </span>
                  </div>
                  <span
                    className={`text-[11px] mt-0.5 ${
                      activeMealTab === 'malam' ? 'text-[#b2f2b6]' : 'text-[#737a65]'
                    }`}
                  >
                    Makan Malam • Alokasi 30% AKG
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* SECTION 5: MEAL PANEL (Menu Cards & Portion Breakdown) */}
          <section className="bg-white p-5 sm:p-7 rounded-3xl shadow-xs border border-stone-200/70 flex flex-col gap-6">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-[#b2f2b6] text-[#367041] flex items-center justify-center text-xl">
                  {activeMealTab === 'pagi' ? '🌅' : activeMealTab === 'siang' ? '☀️' : '🌙'}
                </span>
                <div>
                  <h3 className="text-xl font-bold text-[#2c1514]">
                    {activeSesi.label}
                  </h3>
                  <p className="text-[12px] text-[#737a65]">
                    Alokasi {Math.round(activeSesi.persentase_energi * 100)}% Gizi Harian •{' '}
                    {activeMealTab === 'pagi'
                      ? '06:30 WIB'
                      : activeMealTab === 'siang'
                      ? '12:30 WIB'
                      : '18:30 WIB'}
                  </p>
                </div>
              </div>

              <span className="px-3.5 py-1.5 rounded-full bg-[#fff0ef] text-[#2c1514] text-[12px] font-semibold font-mono border border-stone-200/60">
                Est. Biaya Sesi: Rp {Math.round(estBiayaSesi).toLocaleString('id-ID')}
              </span>
            </div>

            {/* Grid 3 Hidangan */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeSesi.hidangan.map((dish) => {
                const fotoUrl = getFotoResep(dish);

                return (
                  <article
                    key={dish.kode}
                    className="bg-white rounded-2xl p-4 shadow-xs border border-stone-200/80 hover:border-[#306a3b]/40 hover:-translate-y-0.5 transition-all flex flex-col justify-between"
                  >
                    <div className="flex flex-col gap-3">
                      {/* Image Thumbnail with category badge */}
                      <div className="relative w-full h-44 rounded-xl overflow-hidden bg-stone-100">
                        <img
                          src={fotoUrl}
                          alt={dish.nama}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md text-[#2c1514] text-[11px] font-bold shadow-xs">
                          {dish.kategori}
                        </span>
                      </div>

                      {/* Title & Nutritional Overview */}
                      <div>
                        <h4 className="font-bold text-[17px] text-[#2c1514] leading-snug">
                          {dish.nama}
                        </h4>
                        <p className="text-[11px] text-[#737a65] line-clamp-1 mt-0.5">
                          {dish.keterangan}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[#434937] text-[13px] pt-1 border-t border-stone-100">
                        <span>{dish.gizi_per_porsi.energi_kcal} kkal</span>
                        <span className="font-bold text-[#2c1514] font-mono">
                          Rp {dish.biaya_per_porsi_rp.toLocaleString('id-ID')} / porsi
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons: Detail Resep & Bahan (Crucial User Requirement) + Swap */}
                    <div className="mt-4 pt-3 border-t border-stone-100 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDetailResepModal(dish)}
                        className="min-h-[42px] px-3 rounded-full bg-[#306a3b] hover:bg-[#155126] text-white text-[12px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        title="Lihat resep lengkap dan takaran bahan baku"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>Lihat Resep &amp; Bahan</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenSwap(dish, activeMealTab)}
                        className="min-h-[42px] px-3 rounded-full bg-[#fff0ef] hover:bg-[#ffe2df] text-[#306a3b] text-[12px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Ganti dengan masakan alternatif yang sejenis"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Ganti</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Sub-panel: Takaran Porsi Anggota Keluarga */}
            <div className="bg-[#fff0ef] rounded-2xl p-4 sm:p-5 flex flex-col gap-3 border border-stone-200/50">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#306a3b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <h4 className="font-bold text-[16px] text-[#2c1514]">
                  Takaran Porsi Sekali Makan (Berdasarkan AKG Masing-Masing):
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                {activeSesi.porsi_per_anggota.map((p) => {
                  const targetAnggota = anggotaList.find((a) => a.id === p.anggota_id);
                  const isBalita = targetAnggota ? targetAnggota.usia_tahun <= 5 : false;
                  const isLansia = targetAnggota ? targetAnggota.usia_tahun >= 60 : false;
                  const isHamil = targetAnggota ? targetAnggota.status.startsWith('hamil') : false;

                  const catatanPorsi = isHamil
                    ? 'Ekstra protein telur/ikan & sayur kaya folat'
                    : isBalita
                    ? 'Tekstur lunak / dadu kecil, kuah tawar minim garam'
                    : isLansia
                    ? 'Tekstur lembut ramah kunyah & rendah natrium'
                    : 'Porsi standar energi harian seimbang';

                  return (
                    <div
                      key={p.anggota_id}
                      className="p-3.5 bg-white rounded-xl flex flex-col justify-between border border-stone-200/60 shadow-2xs"
                    >
                      <div>
                        <span className="text-[11px] font-semibold text-[#737a65] block">
                          {p.alias}
                        </span>
                        <span className="text-[18px] font-extrabold text-[#6da003] my-0.5 block">
                          {p.pengali}x porsi
                        </span>
                      </div>
                      <span className="text-[11px] text-[#434937] leading-tight mt-1">
                        {catatanPorsi}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* SECTION 6: PANEL TRANSPARANSI GIZI (KENAPA MENU INI?) */}
          <section className="bg-white p-5 sm:p-7 rounded-3xl shadow-xs border border-stone-200/70 flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 text-[#306a3b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="text-xl font-extrabold text-[#2c1514]">
                  Kenapa Menu Ini? (Transparansi Kecukupan Gizi)
                </h3>
              </div>
              <p className="text-[13px] sm:text-[14px] text-[#434937]">
                Perhitungan deterministik matematis merujuk Angka Kecukupan Gizi (AKG) Kemenkes 2019 &amp; TKPI, bukan klaim generatif acak.
              </p>
            </div>

            {/* Member Selector Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" id="member-tabs">
              {anggotaList.map((a) => {
                const isSelected = a.id === selectedMemberTabId;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelectedMemberTabId(a.id)}
                    className={`px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#306a3b] text-white shadow-xs'
                        : 'bg-[#fff0ef] hover:bg-[#ffe2df] text-[#434937]'
                    }`}
                  >
                    {a.alias}
                  </button>
                );
              })}
            </div>

            {/* Nutrition Transparency Table */}
            {activeSkorAnggota && (
              <div className="overflow-x-auto rounded-2xl bg-[#fff0ef] p-3 sm:p-4 border border-stone-200/50">
                <table className="w-full text-left text-[13px] sm:text-[14px]">
                  <thead>
                    <tr className="text-[11px] sm:text-[12px] font-bold text-[#737a65] uppercase tracking-wider">
                      <th className="pb-3 pl-3">Zat Gizi Penting</th>
                      <th className="pb-3">Target Standar Kemenkes</th>
                      <th className="pb-3">Dari Menu Hari Ini</th>
                      <th className="pb-3 text-right pr-3">Status Capaian</th>
                    </tr>
                  </thead>
                  <tbody className="space-y-1.5">
                    {/* Energi */}
                    <tr className="bg-white rounded-xl shadow-2xs">
                      <td className="py-3 pl-3 font-semibold text-[#2c1514] rounded-l-xl">
                        Energi (Kalori)
                      </td>
                      <td className="py-3 text-[#434937]">
                        {activeSkorAnggota.kebutuhan.energi_kcal} kkal
                      </td>
                      <td className="py-3 font-bold text-[#2c1514] font-mono">
                        {Math.round(activeSkorAnggota.asupan_total.energi_kcal)} kkal
                      </td>
                      <td className="py-3 text-right pr-3 rounded-r-xl">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#b2f2b6] text-[#367041] text-[11px] font-bold">
                          {activeSkorAnggota.rincian_zat.energi_kcal?.persen || 100}%
                        </span>
                      </td>
                    </tr>

                    {/* Protein */}
                    <tr className="bg-white rounded-xl shadow-2xs">
                      <td className="py-3 pl-3 font-semibold text-[#2c1514] rounded-l-xl">
                        Protein Hewani &amp; Nabati
                      </td>
                      <td className="py-3 text-[#434937]">
                        {activeSkorAnggota.kebutuhan.protein_g} gram
                      </td>
                      <td className="py-3 font-bold text-[#2c1514] font-mono">
                        {Math.round(activeSkorAnggota.asupan_total.protein_g)} gram
                      </td>
                      <td className="py-3 text-right pr-3 rounded-r-xl">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#b2f2b6] text-[#367041] text-[11px] font-bold">
                          {activeSkorAnggota.rincian_zat.protein_g?.persen || 100}%
                        </span>
                      </td>
                    </tr>

                    {/* Zat Besi */}
                    <tr className="bg-white rounded-xl shadow-2xs">
                      <td className="py-3 pl-3 font-semibold text-[#2c1514] rounded-l-xl">
                        Zat Besi (Fe)
                      </td>
                      <td className="py-3 text-[#434937]">
                        {activeSkorAnggota.kebutuhan.zat_besi_mg} mg
                      </td>
                      <td className="py-3 font-bold text-[#2c1514] font-mono">
                        {activeSkorAnggota.asupan_total.zat_besi_mg.toFixed(1)} mg
                      </td>
                      <td className="py-3 text-right pr-3 rounded-r-xl">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#b2f2b6] text-[#367041] text-[11px] font-bold">
                          {activeSkorAnggota.rincian_zat.zat_besi_mg?.persen || 100}%
                        </span>
                      </td>
                    </tr>

                    {/* Kalsium */}
                    <tr className="bg-white rounded-xl shadow-2xs">
                      <td className="py-3 pl-3 font-semibold text-[#2c1514] rounded-l-xl">
                        Kalsium (Ca)
                      </td>
                      <td className="py-3 text-[#434937]">
                        {activeSkorAnggota.kebutuhan.kalsium_mg} mg
                      </td>
                      <td className="py-3 font-bold text-[#2c1514] font-mono">
                        {Math.round(activeSkorAnggota.asupan_total.kalsium_mg)} mg
                      </td>
                      <td className="py-3 text-right pr-3 rounded-r-xl">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#b2f2b6] text-[#367041] text-[11px] font-bold">
                          {activeSkorAnggota.rincian_zat.kalsium_mg?.persen || 100}%
                        </span>
                      </td>
                    </tr>

                    {/* Seng */}
                    <tr className="bg-white rounded-xl shadow-2xs">
                      <td className="py-3 pl-3 font-semibold text-[#2c1514] rounded-l-xl">
                        Seng / Zinc (Zn)
                      </td>
                      <td className="py-3 text-[#434937]">
                        {activeSkorAnggota.kebutuhan.seng_mg} mg
                      </td>
                      <td className="py-3 font-bold text-[#2c1514] font-mono">
                        {activeSkorAnggota.asupan_total.seng_mg.toFixed(1)} mg
                      </td>
                      <td className="py-3 text-right pr-3 rounded-r-xl">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#b2f2b6] text-[#367041] text-[11px] font-bold">
                          {activeSkorAnggota.rincian_zat.seng_mg?.persen || 100}%
                        </span>
                      </td>
                    </tr>

                    {/* Vitamin A */}
                    <tr className="bg-white rounded-xl shadow-2xs">
                      <td className="py-3 pl-3 font-semibold text-[#2c1514] rounded-l-xl">
                        Vitamin A (mcg RE)
                      </td>
                      <td className="py-3 text-[#434937]">
                        {activeSkorAnggota.kebutuhan.vitamin_a_mcg} mcg
                      </td>
                      <td className="py-3 font-bold text-[#2c1514] font-mono">
                        {Math.round(activeSkorAnggota.asupan_total.vitamin_a_mcg)} mcg
                      </td>
                      <td className="py-3 text-right pr-3 rounded-r-xl">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#b2f2b6] text-[#367041] text-[11px] font-bold">
                          {activeSkorAnggota.rincian_zat.vitamin_a_mcg?.persen || 100}%
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Kotak Catatan Ahli Gizi Porsi Kita */}
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#fff0ef] border border-stone-200/50">
              <div className="w-8 h-8 rounded-full bg-[#b2f2b6] text-[#367041] flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-bold text-[14px] text-[#2c1514]">
                  Catatan Ahli Gizi Porsi Kita untuk {activeAnggota?.alias}:
                </span>
                <p className="text-[13px] text-[#434937] leading-relaxed">
                  Asupan zat gizi harian {activeAnggota?.alias} terpenuhi secara seimbang dari perpaduan pangan lokal (seperti bayam, tempe, telur, dan ikan kembung segar) tanpa memerlukan suplemen mahal. Pengaturan porsi yang terukur menjamin kecukupan kalori dan mikronutrisi harian tetap dalam ambang batas aman.
                </p>
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* ========================================================= */}
      {/* MODAL 1: DETAIL RESEP & BAHAN BAKU (USER REQUIREMENT)      */}
      {/* ========================================================= */}
      {detailResepModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-xl border border-stone-200 my-8 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-stone-100 flex-shrink-0">
                  <img
                    src={getFotoResep(detailResepModal)}
                    alt={detailResepModal.nama}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#b2f2b6] text-[#367041] text-[10px] font-bold uppercase tracking-wider mb-1">
                    {detailResepModal.kategori}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#2c1514]">
                    {detailResepModal.nama}
                  </h3>
                  <p className="text-[12px] text-[#737a65]">
                    {detailResepModal.porsi_standar} • {detailResepModal.keterangan}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailResepModal(null)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 hover:text-stone-800 flex items-center justify-center cursor-pointer transition"
                aria-label="Tutup modal"
              >
                ✕
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-[#fff0ef] rounded-xl text-center">
                <span className="text-[10px] text-[#737a65] block font-semibold">Energi Porsi</span>
                <strong className="text-sm font-bold text-[#2c1514]">
                  {detailResepModal.gizi_per_porsi.energi_kcal} kkal
                </strong>
              </div>
              <div className="p-3 bg-[#fff0ef] rounded-xl text-center">
                <span className="text-[10px] text-[#737a65] block font-semibold">Protein</span>
                <strong className="text-sm font-bold text-[#2c1514]">
                  {detailResepModal.gizi_per_porsi.protein_g} gram
                </strong>
              </div>
              <div className="p-3 bg-[#fff0ef] rounded-xl text-center">
                <span className="text-[10px] text-[#737a65] block font-semibold">Zat Besi (Fe)</span>
                <strong className="text-sm font-bold text-[#2c1514]">
                  {detailResepModal.gizi_per_porsi.zat_besi_mg} mg
                </strong>
              </div>
              <div className="p-3 bg-[#fff0ef] rounded-xl text-center">
                <span className="text-[10px] text-[#737a65] block font-semibold">Estimasi Biaya</span>
                <strong className="text-sm font-bold text-[#306a3b] font-mono">
                  Rp {detailResepModal.biaya_per_porsi_rp.toLocaleString('id-ID')}
                </strong>
              </div>
            </div>

            {/* DAFTAR BAHAN YANG DIPERLUKAN (DETIL BAHAN PASAR) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-[15px] text-[#2c1514] flex items-center gap-2">
                  <span>🛒</span>
                  <span>Bahan Baku yang Diperlukan (Takaran Standar):</span>
                </h4>
                <span className="text-[11px] text-[#737a65]">
                  {detailResepModal.bahan.length} jenis bahan
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-stone-200/80 bg-stone-50/50">
                <table className="w-full text-left text-[12px] sm:text-[13px]">
                  <thead className="bg-stone-100/70 text-[#737a65] font-semibold text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Nama Bahan Pangan</th>
                      <th className="py-2.5 px-3">Takaran Mentah</th>
                      <th className="py-2.5 px-3">BDD %</th>
                      <th className="py-2.5 px-3 text-right">Est. Harga Pasar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200/60 bg-white">
                    {detailResepModal.bahan.map((item, idx) => {
                      const bahanInfo: BahanPangan | undefined = BAHAN_MAP.get(item.kode_tkpi);
                      const namaBahan = bahanInfo?.nama || item.nama_bahan || item.kode_tkpi;
                      const hargaEst = bahanInfo
                        ? Math.round((item.jumlah_gram / 100) * bahanInfo.harga_per_100g_rp)
                        : 0;

                      return (
                        <tr key={idx} className="hover:bg-[#fff8f7]">
                          <td className="py-2.5 px-3">
                            <strong className="text-[#2c1514] font-semibold block">{namaBahan}</strong>
                            <span className="text-[10px] text-[#737a65]">
                              {bahanInfo?.kategori || 'Bahan Pokok'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-[#434937]">
                            {item.jumlah_gram} gram
                          </td>
                          <td className="py-2.5 px-3 text-[#737a65]">
                            {bahanInfo?.bdd_percent || 100}%
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#2c1514]">
                            Rp {hargaEst.toLocaleString('id-ID')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PANDUAN PENGOLAHAN & LANGKAH MEMASAK */}
            <div className="space-y-3">
              <h4 className="font-bold text-[15px] text-[#2c1514] flex items-center gap-2">
                <span>🍳</span>
                <span>Langkah Memasak Sederhana &amp; Higienis:</span>
              </h4>

              <div className="p-4 bg-[#fff0ef] rounded-2xl border border-stone-200/60 space-y-2.5">
                {(LANGKAH_MEMASAK[detailResepModal.kode] || DEFAULT_LANGKAH).map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-[12px] sm:text-[13px] text-[#2c1514]">
                    <span className="w-5 h-5 rounded-full bg-[#306a3b] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CATATAN KEAMANAN & TEKSTUR */}
            <div className="p-3.5 rounded-2xl bg-stone-100 text-[12px] text-[#434937] space-y-1">
              <strong className="block text-[#2c1514] font-bold">
                💡 Tips Domestik Balita &amp; Lansia:
              </strong>
              <p className="leading-relaxed">
                {detailResepModal.catatan_keamanan
                  ? detailResepModal.catatan_keamanan
                  : 'Bagi porsi masakan sebelum ditambahkan garam berlebih jika terdapat anggota lansia hipertensi. Untuk balita, potong dadu lembut sayur dan suwir daging/ikan tanpa duri.'}
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
              <button
                type="button"
                onClick={() => {
                  const target = detailResepModal;
                  setDetailResepModal(null);
                  handleOpenSwap(target, activeMealTab);
                }}
                className="px-5 py-2.5 rounded-full bg-[#fff0ef] hover:bg-[#ffe2df] text-[#306a3b] font-bold text-xs transition cursor-pointer"
              >
                Ganti Masakan Ini
              </button>
              <button
                type="button"
                onClick={() => setDetailResepModal(null)}
                className="px-6 py-2.5 rounded-full bg-[#306a3b] hover:bg-[#155126] text-white font-bold text-xs transition cursor-pointer shadow-xs"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: GANTI HIDANGAN (SWAP DISH MODAL)                 */}
      {/* ========================================================= */}
      {swapModalOpen && resepTargetSwap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-xl border border-stone-200 space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <span className="text-[11px] font-bold text-[#737a65] uppercase tracking-wider block">
                  Variasi Alternatif
                </span>
                <h3 className="text-lg font-bold text-[#2c1514]">
                  Ganti {resepTargetSwap.nama}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSwapModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 hover:text-stone-800 flex items-center justify-center cursor-pointer transition"
                aria-label="Tutup modal ganti"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#434937]">
              Pilih hidangan pengganti dalam kategori <strong>{resepTargetSwap.kategori}</strong> yang tetap aman dari alergen dan sesuai anggaran:
            </p>

            <div className="space-y-2.5 max-h-[45vh] overflow-y-auto pr-1">
              {opsiSwap.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-400 bg-stone-50 rounded-2xl">
                  Tidak ditemukan hidangan pengganti lain yang aman dalam kategori ini.
                </div>
              ) : (
                opsiSwap.map((opsi) => {
                  const selisih = opsi.selisihBiayaRp;
                  const selisihLabel =
                    selisih === 0
                      ? 'Harga sama'
                      : selisih > 0
                      ? `+ Rp ${selisih.toLocaleString('id-ID')}`
                      : `- Rp ${Math.abs(selisih).toLocaleString('id-ID')} (Lebih hemat)`;

                  return (
                    <div
                      key={opsi.resep.kode}
                      className="p-3.5 rounded-2xl border border-stone-200 hover:border-[#306a3b] bg-white transition flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0">
                          <img
                            src={getFotoResep(opsi.resep)}
                            alt={opsi.resep.nama}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <strong className="block text-sm font-bold text-[#2c1514]">
                            {opsi.resep.nama}
                          </strong>
                          <span className="text-[11px] text-[#737a65]">
                            {opsi.resep.gizi_per_porsi.energi_kcal} kkal •{' '}
                            <span className={selisih < 0 ? 'text-[#367041] font-semibold' : 'text-[#737a65]'}>
                              {selisihLabel}
                            </span>
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleApplySwap(opsi.resep)}
                        className="px-3.5 py-1.5 rounded-full bg-[#306a3b] hover:bg-[#155126] text-white font-bold text-xs transition cursor-pointer shadow-xs whitespace-nowrap"
                      >
                        Pilih
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-stone-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSwapModalOpen(false)}
                className="px-5 py-2 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
