import {
  KebutuhanGizi,
  NilaiGizi,
  SkorAnggota,
  SkorKeluarga,
  SkorZatGizi,
  StatusKecukupan,
} from '../types';

/**
 * Menentukan status kecukupan berdasarkan rasio (PRD 8.5)
 * - >= 90% (0.9): tercukupi
 * - 70% - 89% (0.7 - 0.89): hampir
 * - < 70% (< 0.7): kurang
 */
export function tentukanStatusKecukupan(rasio: number): StatusKecukupan {
  if (rasio >= 0.9) return 'tercukupi';
  if (rasio >= 0.7) return 'hampir';
  return 'kurang';
}

/**
 * Menghitung skor kecukupan per individu anggota keluarga (PRD 8.5)
 * Berdasarkan 6 zat gizi utama: Energi, Protein, Zat Besi, Kalsium, Seng, Vitamin A.
 */
export function hitungSkorAnggota(
  anggotaId: string,
  alias: string,
  asupan: NilaiGizi,
  kebutuhan: KebutuhanGizi
): SkorAnggota {
  const zatConfig: { key: keyof NilaiGizi; label: string; satuan: string }[] = [
    { key: 'energi_kcal', label: 'Energi', satuan: 'kkal' },
    { key: 'protein_g', label: 'Protein', satuan: 'g' },
    { key: 'zat_besi_mg', label: 'Zat Besi', satuan: 'mg' },
    { key: 'kalsium_mg', label: 'Kalsium', satuan: 'mg' },
    { key: 'seng_mg', label: 'Seng (Zinc)', satuan: 'mg' },
    { key: 'vitamin_a_mcg', label: 'Vitamin A', satuan: 'mcg RE' },
  ];

  const rincianZat: Record<string, SkorZatGizi> = {};
  let totalRasio = 0;

  for (const cfg of zatConfig) {
    const valAsupan = asupan[cfg.key] || 0;
    const valKebutuhan = (kebutuhan[cfg.key] as number) || 1;

    // Rasio asupan vs AKG dengan batas atas 1.0 (PRD 8.5)
    const rawRatio = valKebutuhan > 0 ? valAsupan / valKebutuhan : 0;
    const cappedRatio = Math.min(rawRatio, 1.0);
    const persen = Math.round(rawRatio * 100);

    totalRasio += cappedRatio;
    rincianZat[cfg.key] = {
      zat: cfg.label,
      satuan: cfg.satuan,
      kebutuhan: Math.round(valKebutuhan * 10) / 10,
      terpenuhi: Math.round(valAsupan * 10) / 10,
      persen,
      rasio: Math.round(cappedRatio * 100) / 100,
      status: tentukanStatusKecukupan(cappedRatio),
    };
  }

  // Rata-rata 6 zat gizi
  const skorRataRata = Math.round((totalRasio / zatConfig.length) * 100);
  const status = tentukanStatusKecukupan(skorRataRata / 100);

  // Periksa batas keamanan retinol
  const peringatan: string[] = [];
  if (
    asupan.retinol_mcg &&
    kebutuhan.batas_retinol_mcg &&
    asupan.retinol_mcg > kebutuhan.batas_retinol_mcg
  ) {
    peringatan.push(
      `Peringatan: Asupan retinol (${Math.round(asupan.retinol_mcg)} mcg) melebihi batas atas aman harian (${kebutuhan.batas_retinol_mcg} mcg).`
    );
  }

  return {
    anggota_id: anggotaId,
    alias,
    skor_rata_rata: skorRataRata,
    status,
    rincian_zat: rincianZat,
    asupan_total: asupan,
    kebutuhan,
    peringatan_keamanan: peringatan.length > 0 ? peringatan : undefined,
  };
}

/**
 * Menghitung skor kecukupan seluruh keluarga (PRD 8.5)
 * Skor keluarga = rata-rata seluruh anggota, dan skor anggota terendah selalu ditampilkan.
 */
export function hitungSkorKeluarga(skorAnggotaList: SkorAnggota[]): SkorKeluarga {
  if (skorAnggotaList.length === 0) {
    return {
      skor_rata_rata: 0,
      skor_terendah: 0,
      status: 'kurang',
      skor_per_anggota: [],
    };
  }

  let totalSkor = 0;
  let minSkor = 100;
  let anggotaTerendah = skorAnggotaList[0].alias;

  for (const item of skorAnggotaList) {
    totalSkor += item.skor_rata_rata;
    if (item.skor_rata_rata < minSkor) {
      minSkor = item.skor_rata_rata;
      anggotaTerendah = item.alias;
    }
  }

  const rataRata = Math.round(totalSkor / skorAnggotaList.length);

  return {
    skor_rata_rata: rataRata,
    skor_terendah: minSkor,
    anggota_skor_terendah: anggotaTerendah,
    status: tentukanStatusKecukupan(rataRata / 100),
    skor_per_anggota: skorAnggotaList,
  };
}
