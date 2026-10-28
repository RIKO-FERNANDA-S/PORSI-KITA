import {
  Anggota,
  KebutuhanGizi,
  MenuHari,
  NilaiGizi,
  RencanaMenu7Hari,
  ResepMasakan,
  SesiMakan,
  SkorAnggota,
} from '../types';
import { PAKET_LIST, RESEP_LIST, RESEP_MAP } from '../data/dataset';
import { hitungKebutuhan } from '../nutrition/akg';
import { FRAKSI_SESI_MAKAN, hitungPorsiSesiMakan } from '../nutrition/portions';
import { isResepAmanUntukKeluarga } from '../nutrition/safety';
import { hitungSkorAnggota, hitungSkorKeluarga } from '../nutrition/score';
import { cekAturanVariasi } from './rules';

export interface GenerateInput {
  familyId: string;
  familyName?: string;
  budgetHarianRp: number;
  anggota: Anggota[];
  seed?: string | number;
}

const NAMA_HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

/**
 * Pseudo-random generator sederhana berbasis seed string/angka (deterministik).
 */
function createSeededRng(seed: string | number) {
  let s = 0;
  const str = String(seed);
  for (let i = 0; i < str.length; i++) {
    s = (s << 5) - s + str.charCodeAt(i);
    s |= 0;
  }
  s = Math.abs(s) || 1234567;

  return function nextFloat() {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/**
 * Menghitung estimasi biaya minimal keluarga per hari untuk mencapai gizi dasar.
 * Ambang batas: ~Rp 18.000 per ekivalen dewasa (2000 kcal).
 */
export function hitungEstimasiBiayaMinimalHarian(
  anggotaList: Anggota[],
  kebutuhanMap: Map<string, KebutuhanGizi>
): number {
  let totalPengaliHarianKeluarga = 0;
  for (const a of anggotaList) {
    const k = kebutuhanMap.get(a.id);
    const kalori = k?.energi_kcal || 2000;
    totalPengaliHarianKeluarga += kalori / 2000;
  }
  return Math.max(12000, Math.round(totalPengaliHarianKeluarga * 18000));
}

/**
 * Menyusun satu sesi makan menggunakan paket standar (fallback).
 */
function susunSesiDariPaket(
  paketKode: string,
  sesi: 'pagi' | 'siang' | 'malam',
  anggotaList: Anggota[],
  kebutuhanMap: Map<string, KebutuhanGizi>
): SesiMakan {
  const paket = PAKET_LIST.find((p) => p.kode_paket === paketKode) || PAKET_LIST[0];
  const hidangan = paket.resep_kodes
    .map((k) => RESEP_MAP.get(k))
    .filter((r): r is ResepMasakan => r !== undefined);

  const fraksi = FRAKSI_SESI_MAKAN[sesi];
  const label = sesi === 'pagi' ? 'Sarapan Pagi' : sesi === 'siang' ? 'Makan Siang' : 'Makan Malam';
  const { totalEnergiDasar, porsiPerAnggota } = hitungPorsiSesiMakan(
    anggotaList,
    kebutuhanMap,
    hidangan,
    fraksi
  );

  return {
    sesi,
    label,
    persentase_energi: fraksi,
    hidangan,
    total_energi_standar_kcal: totalEnergiDasar,
    porsi_per_anggota: porsiPerAnggota,
  };
}

/**
 * Generator Menu 7 Hari (PRD 9.0)
 * Menghasilkan rencana menu 7 hari yang memenuhi budget, bebas alergen,
 * tepat gizi per anggota, deterministik, dan dapat dijelaskan (explainable).
 */
export function generateMenu(input: GenerateInput): RencanaMenu7Hari {
  const { familyId, budgetHarianRp, anggota } = input;
  const rng = createSeededRng(input.seed ?? familyId);

  if (!anggota || anggota.length === 0) {
    throw new Error('Keluarga harus memiliki minimal 1 anggota untuk membuat menu.');
  }

  // 1. Hitung kebutuhan AKG setiap anggota keluarga
  const kebutuhanMap = new Map<string, KebutuhanGizi>();
  for (const a of anggota) {
    kebutuhanMap.set(a.id, hitungKebutuhan(a));
  }

  // 2. Cek apakah budget harian di bawah batas minimum pemenuhan 70% energi
  const estimasiBiayaMin = hitungEstimasiBiayaMinimalHarian(anggota, kebutuhanMap);
  const budgetTerlaluRendah = budgetHarianRp < estimasiBiayaMin;

  // 3. Saring resep yang aman dari alergen dan keamanan umum (PRD 9.1 & 9.2)
  const resepAman = RESEP_LIST.filter((r) => {
    if (r.kode === 'RSP025') return false; // RSP025 selalu dinonaktifkan di MVP
    const check = isResepAmanUntukKeluarga(r, anggota, 0);
    return check.aman;
  });

  // Pisahkan resep aman berdasarkan kategori
  const poolKarbo = resepAman.filter((r) => r.kategori === 'Makanan Pokok');
  const poolHewani = resepAman.filter((r) => r.kategori === 'Lauk Hewani');
  const poolNabati = resepAman.filter((r) => r.kategori === 'Lauk Nabati');
  const poolSayur = resepAman.filter((r) => r.kategori === 'Sayuran');
  const poolBuahSusu = resepAman.filter(
    (r) => r.kategori === 'Buah' || r.kategori === 'Minuman/Susu'
  );

  // Filter paket fallback agar HANYA menggunakan paket yang 100% bebas dari alergen keluarga
  const paketAman = PAKET_LIST.filter((p) =>
    p.resep_kodes.every((kode) => {
      const r = RESEP_MAP.get(kode);
      if (!r) return false;
      return isResepAmanUntukKeluarga(r, anggota, 0).aman;
    })
  );

  // Jika pool resep tidak cukup karena alergen sangat ketat atau budget terlalu rendah,
  // gunakan mode fallback paket standar yang aman (PRD 9.7 & 9.8)
  const butuhFallback =
    budgetTerlaluRendah ||
    poolKarbo.length === 0 ||
    poolHewani.length === 0 ||
    poolSayur.length === 0;

  const hariList: MenuHari[] = [];
  const riwayatResepPerHari: ResepMasakan[][] = [];
  const frekuensiResepMingguan = new Map<string, number>();
  let pemakaianHatiAyam = 0;

  // Rotasi paket aman jika fallback
  const paketPilihan =
    paketAman.length > 0 ? paketAman.map((p) => p.kode_paket) : ['PKT001'];

  for (let i = 0; i < 7; i++) {
    const hariKe = i + 1;
    const labelHari = NAMA_HARI[i];

    let sesiPagi: SesiMakan;
    let sesiSiang: SesiMakan;
    let sesiMalam: SesiMakan;

    if (butuhFallback && paketPilihan.length > 0) {
      const kodePaket = paketPilihan[i % paketPilihan.length];
      sesiPagi = susunSesiDariPaket(kodePaket, 'pagi', anggota, kebutuhanMap);
      sesiSiang = susunSesiDariPaket(kodePaket, 'siang', anggota, kebutuhanMap);
      sesiMalam = susunSesiDariPaket(kodePaket, 'malam', anggota, kebutuhanMap);
    } else {
      // Susun 3 sesi makan dengan algoritma rule-based & variasi
      const susunSesi = (sesi: 'pagi' | 'siang' | 'malam'): SesiMakan => {
        const fraksi = FRAKSI_SESI_MAKAN[sesi];
        const label = sesi === 'pagi' ? 'Sarapan Pagi' : sesi === 'siang' ? 'Makan Siang' : 'Makan Malam';

        const hidangan: ResepMasakan[] = [];

        // 1. Makanan Pokok (utamakan Nasi Putih)
        const karbo = poolKarbo.find((r) => r.kode === 'RSP001') || poolKarbo[0];
        if (karbo) hidangan.push(karbo);

        // 2. Lauk Hewani dengan aturan variasi dan batas hati ayam
        const kandidatHewani = poolHewani.filter((r) => {
          if (!cekAturanVariasi(r, i, riwayatResepPerHari, frekuensiResepMingguan)) return false;
          const check = isResepAmanUntukKeluarga(r, anggota, pemakaianHatiAyam);
          if (!check.aman) return false;
          return true;
        });

        const safeFallbackHewani = poolHewani.filter(
          (r) => isResepAmanUntukKeluarga(r, anggota, pemakaianHatiAyam).aman
        );

        const hewani =
          kandidatHewani.length > 0
            ? kandidatHewani[Math.floor(rng() * kandidatHewani.length)]
            : safeFallbackHewani.length > 0
              ? safeFallbackHewani[Math.floor(rng() * safeFallbackHewani.length)]
              : poolHewani.find((r) => isResepAmanUntukKeluarga(r, anggota, pemakaianHatiAyam).aman) || poolHewani[0];

        if (hewani) {
          hidangan.push(hewani);
          if (hewani.kode === 'RSP004' || hewani.nama.toLowerCase().includes('hati ayam')) {
            pemakaianHatiAyam++;
          }
          frekuensiResepMingguan.set(
            hewani.kode,
            (frekuensiResepMingguan.get(hewani.kode) || 0) + 1
          );
        }

        // 3. Lauk Nabati
        const kandidatNabati = poolNabati.filter((r) =>
          cekAturanVariasi(r, i, riwayatResepPerHari, frekuensiResepMingguan)
        );
        const nabati =
          kandidatNabati.length > 0
            ? kandidatNabati[Math.floor(rng() * kandidatNabati.length)]
            : poolNabati[Math.floor(rng() * poolNabati.length)];

        if (nabati) {
          hidangan.push(nabati);
          frekuensiResepMingguan.set(
            nabati.kode,
            (frekuensiResepMingguan.get(nabati.kode) || 0) + 1
          );
        }

        // 4. Sayuran
        const kandidatSayur = poolSayur.filter((r) =>
          cekAturanVariasi(r, i, riwayatResepPerHari, frekuensiResepMingguan)
        );
        const sayur =
          kandidatSayur.length > 0
            ? kandidatSayur[Math.floor(rng() * kandidatSayur.length)]
            : poolSayur[Math.floor(rng() * poolSayur.length)];

        if (sayur) {
          hidangan.push(sayur);
          frekuensiResepMingguan.set(
            sayur.kode,
            (frekuensiResepMingguan.get(sayur.kode) || 0) + 1
          );
        }

        // 5. Buah atau Susu (pagi/siang)
        if (sesi !== 'malam' && poolBuahSusu.length > 0) {
          const buah = poolBuahSusu[Math.floor(rng() * poolBuahSusu.length)];
          if (buah) hidangan.push(buah);
        }

        const { totalEnergiDasar, porsiPerAnggota } = hitungPorsiSesiMakan(
          anggota,
          kebutuhanMap,
          hidangan,
          fraksi
        );

        return {
          sesi,
          label,
          persentase_energi: fraksi,
          hidangan,
          total_energi_standar_kcal: totalEnergiDasar,
          porsi_per_anggota: porsiPerAnggota,
        };
      };

      sesiPagi = susunSesi('pagi');
      sesiSiang = susunSesi('siang');
      sesiMalam = susunSesi('malam');
    }

    // Catat hidangan hari ini untuk riwayat variasi
    const semuaHidanganHariIni = [
      ...sesiPagi.hidangan,
      ...sesiSiang.hidangan,
      ...sesiMalam.hidangan,
    ];
    riwayatResepPerHari.push(semuaHidanganHariIni);

    // Hitung total biaya hari ini
    let totalBiayaHariRp = 0;
    const sesiList = [sesiPagi, sesiSiang, sesiMalam];
    for (const s of sesiList) {
      for (const h of s.hidangan) {
        const totalPengali = s.porsi_per_anggota.reduce((sum, p) => sum + p.pengali, 0);
        totalBiayaHariRp += h.biaya_per_porsi_rp * totalPengali;
      }
    }
    totalBiayaHariRp = Math.round(totalBiayaHariRp);

    // Hitung akumulasi asupan harian setiap anggota
    const skorAnggotaHariList: SkorAnggota[] = anggota.map((a) => {
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

      for (const s of sesiList) {
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

    const skorKeluargaHari = hitungSkorKeluarga(skorAnggotaHariList);

    hariList.push({
      hari_ke: hariKe,
      label_hari: labelHari,
      sesi_makan: {
        pagi: sesiPagi,
        siang: sesiSiang,
        malam: sesiMalam,
      },
      total_biaya_hari_rp: totalBiayaHariRp,
      skor_keluarga: skorKeluargaHari,
    });
  }

  // Hitung total biaya mingguan
  const totalBiayaMingguan = hariList.reduce((sum, h) => sum + h.total_biaya_hari_rp, 0);
  const targetBudgetMingguan = budgetHarianRp * 7;
  const kepatuhanPercent = Math.min(
    100,
    Math.round((targetBudgetMingguan / Math.max(1, totalBiayaMingguan)) * 100)
  );

  let pesanBudget: string | undefined;
  if (budgetTerlaluRendah) {
    pesanBudget = `Budget harian Rp ${budgetHarianRp.toLocaleString('id-ID')} berada di bawah estimasi biaya minimal pemenuhan gizi (Rp ${estimasiBiayaMin.toLocaleString('id-ID')}/hari). Sistem mengaktifkan rotasi paket menu hemat standar.`;
  }

  return {
    id: `plan-${familyId}-${Date.now()}`,
    family_id: familyId,
    created_at: new Date().toISOString(),
    hari: hariList,
    total_biaya_mingguan_rp: totalBiayaMingguan,
    target_budget_mingguan_rp: targetBudgetMingguan,
    budget_harian_rp: budgetHarianRp,
    kepatuhan_budget_percent: kepatuhanPercent,
    is_fallback_package: butuhFallback,
    pesan_budget: pesanBudget,
  };
}
