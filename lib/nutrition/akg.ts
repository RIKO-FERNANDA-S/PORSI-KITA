import { Anggota, BarisAkg, KebutuhanGizi } from '../types';
import { AKG_LIST } from '../data/dataset';

/**
 * Batas atas retinol harian acuan NIH-ODS (PRD 8.6)
 * - 1 sampai 3 tahun: 600 mcg
 * - 4 sampai 8 tahun: 900 mcg
 * - 9 sampai 13 tahun: 1.700 mcg
 * - 14 sampai 18 tahun: 2.800 mcg
 * - 19 tahun ke atas: 3.000 mcg
 */
export function getBatasRetinolHarian(usiaTahun: number): number {
  if (usiaTahun <= 3) return 600;
  if (usiaTahun <= 8) return 900;
  if (usiaTahun <= 13) return 1700;
  if (usiaTahun <= 18) return 2800;
  return 3000;
}

/**
 * Menghitung kebutuhan gizi harian anggota keluarga berdasarkan AKG 2019 (PRD 8.1)
 * Fungsi murni tanpa efek samping, 100% deterministik.
 */
export function hitungKebutuhan(
  anggota: Anggota,
  akgDataset: BarisAkg[] = AKG_LIST
): KebutuhanGizi {
  const usiaBulan = anggota.usia_tahun * 12;

  // Cari baris dasar yang cocok dengan jenis kelamin dan rentang usia
  const barisDasar = akgDataset.find((baris) => {
    if (baris.tipe !== 'dasar') return false;

    // Kecocokan gender: LP cocok untuk semua, atau cocok persis L/P
    const genderCocok = baris.jenis_kelamin === 'LP' || baris.jenis_kelamin === anggota.jenis_kelamin;
    if (!genderCocok) return false;

    const minBulan = baris.umur_min_bulan ?? 0;
    const maxBulan = baris.umur_max_bulan ?? 9999;
    return usiaBulan >= minBulan && usiaBulan <= maxBulan;
  });

  if (!barisDasar) {
    throw new Error(
      `Tidak ditemukan baris AKG dasar untuk usia ${anggota.usia_tahun} tahun (${anggota.jenis_kelamin})`
    );
  }

  // Mulai dari angka dasar
  let energi = barisDasar.energi_kcal;
  let protein = barisDasar.protein_g;
  let vitA = barisDasar.vitamin_a_mcg_re;
  let kalsium = barisDasar.kalsium_mg;
  let zatBesi = barisDasar.zat_besi_mg;
  let seng = barisDasar.seng_mg;
  let labelKelompok = barisDasar.kelompok_usia;

  // Cek tambahan hamil jika anggota perempuan
  if (anggota.jenis_kelamin === 'P') {
    let kodeTambahan: string | null = null;
    if (anggota.status === 'hamil_t1') kodeTambahan = 'AKG-HML-T1';
    else if (anggota.status === 'hamil_t2') kodeTambahan = 'AKG-HML-T2';
    else if (anggota.status === 'hamil_t3') kodeTambahan = 'AKG-HML-T3';
    else if (anggota.status === 'menyusui_6bln1') kodeTambahan = 'AKG-MNY-6BLN1';
    else if (anggota.status === 'menyusui_6bln2') kodeTambahan = 'AKG-MNY-6BLN2';

    if (kodeTambahan) {
      const barisTambahan = akgDataset.find((b) => b.kode_kelompok === kodeTambahan);
      if (barisTambahan) {
        energi += barisTambahan.energi_kcal;
        protein += barisTambahan.protein_g;
        vitA += barisTambahan.vitamin_a_mcg_re;
        kalsium += barisTambahan.kalsium_mg;
        zatBesi += barisTambahan.zat_besi_mg;
        seng += barisTambahan.seng_mg;
        labelKelompok += ` + ${barisTambahan.kelompok_usia}`;
      }
    }
  }

  const batasRetinol = getBatasRetinolHarian(anggota.usia_tahun);

  return {
    kelompok_usia: labelKelompok,
    energi_kcal: energi,
    protein_g: protein,
    zat_besi_mg: zatBesi,
    kalsium_mg: kalsium,
    seng_mg: seng,
    vitamin_a_mcg: vitA,
    batas_retinol_mcg: batasRetinol,
  };
}
