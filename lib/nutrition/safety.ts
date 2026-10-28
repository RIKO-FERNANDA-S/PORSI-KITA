import { Anggota, ResepMasakan } from '../types';
import { BAHAN_MAP } from '../data/dataset';

/**
 * Aturan Keamanan & Batas Gizi Produk Porsi Kita (PRD 8.6 & 8.7)
 *
 * Standar Kritis:
 * 1. RSP025 (bubur tim hati untuk balita) selalu NONAKTIF di MVP sampai porsinya ditentukan pakar gizi.
 * 2. Daftar alergen dari satu anggota menyingkirkan resep itu dari menu SELURUH KELUARGA (mencegah kontaminasi silang).
 * 3. Hati Ayam (RSP004 / berbahan hati ayam):
 *    - Maksimal 1 kali per minggu untuk seluruh jadwal 7 hari.
 *    - Tidak dijadwalkan untuk keluarga dengan anggota berusia 2-3 tahun (balita).
 *    - Tidak dijadwalkan untuk keluarga dengan ibu hamil trimester 1 (hamil_t1).
 */
export function isResepAmanUntukKeluarga(
  resep: ResepMasakan,
  anggotaList: Anggota[],
  jumlahHatiAyamMingguIni: number = 0
): {
  aman: boolean;
  alasan?: string;
} {
  // 1. Resep RSP025 selalu dinonaktifkan
  if (
    resep.kode === 'RSP025' ||
    resep.kode?.toUpperCase() === 'RSP025' ||
    resep.nama?.toLowerCase().includes('rsp025') ||
    (resep.kategori === 'Menu Anak' && resep.nama?.toLowerCase().includes('hati'))
  ) {
    return {
      aman: false,
      alasan: 'Resep RSP025 (bubur tim hati untuk balita) dinonaktifkan demi keamanan gizi balita.',
    };
  }

  // 2. Cek Alergen seluruh keluarga: Satu anggota alergi menyingkirkan resep dari menu seluruh keluarga
  const alergenKeluarga = new Set<string>();
  for (const anggota of anggotaList) {
    if (anggota.alergen && Array.isArray(anggota.alergen)) {
      for (const al of anggota.alergen) {
        if (typeof al === 'string') {
          al.split(',').forEach((sub) => {
            const clean = sub.trim().toLowerCase();
            if (clean) alergenKeluarga.add(clean);
          });
        }
      }
    }
  }

  if (alergenKeluarga.size > 0) {
    // a. Cek dari tag alergen pada resep
    for (const ra of resep.alergen || []) {
      if (alergenKeluarga.has(ra.toLowerCase().trim())) {
        return {
          aman: false,
          alasan: `Resep disingkirkan dari menu sekeluarga karena mengandung alergen '${ra}'.`,
        };
      }
    }

    // b. Cek dari bahan-bahan penyusun resep (BAHAN_MAP)
    if (resep.bahan && Array.isArray(resep.bahan)) {
      for (const b of resep.bahan) {
        const bahanData = BAHAN_MAP.get(b.kode_tkpi);
        if (bahanData && bahanData.alergen) {
          for (const ba of bahanData.alergen) {
            if (alergenKeluarga.has(ba.toLowerCase().trim())) {
              return {
                aman: false,
                alasan: `Resep disingkirkan dari menu sekeluarga karena bahan '${bahanData.nama}' mengandung alergen '${ba}'.`,
              };
            }
          }
        }

        // Cek juga kata kunci nama bahan
        const namaBahan = (b.nama_bahan || bahanData?.nama || '').toLowerCase();
        for (const al of alergenKeluarga) {
          if (namaBahan.includes(al)) {
            return {
              aman: false,
              alasan: `Resep disingkirkan dari menu sekeluarga karena bahan '${namaBahan}' memicu alergen '${al}'.`,
            };
          }
        }
      }
    }
  }

  // 3. Aturan Hati Ayam (RSP004 / BHN-003 / CD005)
  const isMenuHati =
    resep.kode === 'RSP004' ||
    resep.kode === 'RSP025' ||
    resep.nama?.toLowerCase().includes('hati ayam') ||
    resep.bahan?.some((b) => {
      const bNama = (b.nama_bahan || BAHAN_MAP.get(b.kode_tkpi)?.nama || '').toLowerCase();
      return (
        b.kode_tkpi === 'CD005' ||
        b.kode_tkpi === 'BHN-003' ||
        bNama.includes('hati ayam')
      );
    });

  if (isMenuHati) {
    // a. Maksimal 1 kali per minggu untuk seluruh keluarga
    if (jumlahHatiAyamMingguIni >= 1) {
      return {
        aman: false,
        alasan: 'Menu hati ayam dibatasi maksimal 1 kali per minggu karena kadar retinol yang sangat tinggi.',
      };
    }

    // b. Tidak boleh jika ada ibu hamil trimester 1 (mencegah hipervitaminosis A & risiko teratogenik)
    const adaBumilT1 = anggotaList.some((a) => {
      const jk = a.jenis_kelamin;
      const st = ((a.status || (a as any).status_khusus || '') + '').toLowerCase().trim();
      return (
        jk === 'P' &&
        (st === 'hamil_t1' ||
          st === 'hamil_trimester_1' ||
          st.includes('trimester 1') ||
          st.includes('trimester_1') ||
          st.includes('hamil 1') ||
          st.includes('bumil t1') ||
          st.includes('bumil_t1'))
      );
    });

    if (adaBumilT1) {
      return {
        aman: false,
        alasan: 'Hati ayam tidak disarankan jika ada ibu hamil trimester 1 untuk mencegah toksisitas retinol.',
      };
    }

    // c. Tidak boleh jika ada anak usia 2-3 tahun (balita)
    const adaBalita = anggotaList.some(
      (a) => (a.usia_tahun >= 2 && a.usia_tahun <= 3) || a.usia_tahun <= 3
    );
    if (adaBalita) {
      return {
        aman: false,
        alasan: 'Hati ayam tidak dijadwalkan untuk keluarga dengan anggota usia 2-3 tahun (balita).',
      };
    }
  }

  return { aman: true };
}
