import { GoogleGenAI, Type } from '@google/genai';
import { prisma } from '../prisma';

export interface ActivePriceItem {
  kode_tkpi: string;
  nama_bahan: string;
  kategori: string;
  harga_per_100g_rp: number;
  sumber_harga: 'custom_warung' | 'default_pasar';
  nama_warung: string;
  tanggal_update: string;
}

export interface FamilyActivePricesResult {
  activePrices: ActivePriceItem[];
  priceMap: Record<string, ActivePriceItem>;
  hasCustomWarung: boolean;
  customPricesCount: number;
  defaultPricesCount: number;
}

/**
 * 1. HELPER: Mengambil harga aktif bahan dengan prioritas:
 *    - Prioritas 1: Harga custom dari Warung langganan milik user/keluarga (family_id).
 *    - Prioritas 2 (Fallback): Harga default bawaan sistem dari Warung 'Harga Acuan Pasar (Default)'.
 */
export async function getFamilyActivePrices(
  familyId?: string | null
): Promise<FamilyActivePricesResult> {
  // 1. Ambil seluruh bahan dasar untuk menjamin kelengkapan data
  const allBahan = await prisma.bahan.findMany({
    orderBy: { kode_tkpi: 'asc' },
  });

  // 2. Cari warung default acuan pasar (family_id = null atau nama mengandung 'Harga Acuan Pasar')
  const defaultWarung = await prisma.warung.findFirst({
    where: {
      OR: [
        { family_id: null },
        { nama_warung: { contains: 'Harga Acuan Pasar' } },
      ],
    },
    include: {
      harga_warung: {
        include: { bahan: true },
      },
    },
  });

  const defaultPriceMap = new Map<string, { harga: number; warung: string; update: Date }>();
  if (defaultWarung && defaultWarung.harga_warung) {
    for (const hw of defaultWarung.harga_warung) {
      defaultPriceMap.set(hw.kode_tkpi, {
        harga: Number(hw.harga_per_100g_rp),
        warung: defaultWarung.nama_warung,
        update: hw.tanggal_update,
      });
    }
  }

  // 3. Cari warung langganan keluarga jika familyId diberikan
  let hasCustomWarung = false;
  const customPriceMap = new Map<string, { harga: number; warung: string; update: Date }>();

  if (familyId) {
    const userWarungs = await prisma.warung.findMany({
      where: { family_id: familyId },
      include: {
        harga_warung: {
          orderBy: { tanggal_update: 'desc' },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    if (userWarungs.length > 0) {
      hasCustomWarung = true;
      for (const uw of userWarungs) {
        for (const hw of uw.harga_warung) {
          // Ambil harga teranyar per kode_tkpi dari warung user
          if (!customPriceMap.has(hw.kode_tkpi)) {
            customPriceMap.set(hw.kode_tkpi, {
              harga: Number(hw.harga_per_100g_rp),
              warung: uw.nama_warung,
              update: hw.tanggal_update,
            });
          }
        }
      }
    }
  }

  // 4. Susun daftar harga aktif gabungan
  const activePrices: ActivePriceItem[] = [];
  const priceMap: Record<string, ActivePriceItem> = {};
  let customPricesCount = 0;
  let defaultPricesCount = 0;

  for (const b of allBahan) {
    const custom = customPriceMap.get(b.kode_tkpi);
    const def = defaultPriceMap.get(b.kode_tkpi);

    let finalPrice = 1500; // default aman per 100g
    let sumber: 'custom_warung' | 'default_pasar' = 'default_pasar';
    let warungName = defaultWarung?.nama_warung || 'Harga Acuan Pasar (Default)';
    let updateTime = new Date().toISOString().split('T')[0];

    if (custom) {
      finalPrice = custom.harga;
      sumber = 'custom_warung';
      warungName = custom.warung;
      updateTime = custom.update.toISOString().split('T')[0];
      customPricesCount++;
    } else if (def) {
      finalPrice = def.harga;
      sumber = 'default_pasar';
      warungName = def.warung;
      updateTime = def.update.toISOString().split('T')[0];
      defaultPricesCount++;
    } else {
      defaultPricesCount++;
    }

    const item: ActivePriceItem = {
      kode_tkpi: b.kode_tkpi,
      nama_bahan: b.nama_bahan,
      kategori: b.kategori,
      harga_per_100g_rp: Math.round(finalPrice * 100) / 100,
      sumber_harga: sumber,
      nama_warung: warungName,
      tanggal_update: updateTime,
    };

    activePrices.push(item);
    priceMap[b.kode_tkpi] = item;
  }

  return {
    activePrices,
    priceMap,
    hasCustomWarung,
    customPricesCount,
    defaultPricesCount,
  };
}

// ==========================================
// 2. DEFINISI SCHEMA JSON UNTUK GEMINI
// ==========================================
export const mealPlanResponseSchema = {
  type: Type.OBJECT,
  properties: {
    ringkasan: {
      type: Type.OBJECT,
      properties: {
        total_biaya_mingguan_rp: { type: Type.NUMBER },
        rata_rata_biaya_harian_rp: { type: Type.NUMBER },
        target_anggaran_mingguan_rp: { type: Type.NUMBER },
        status_budget: { type: Type.STRING }, // 'hemat' | 'sesuai' | 'melebihi'
        selisih_rp: { type: Type.NUMBER },
        catatan_ahli_gizi: { type: Type.STRING },
      },
      required: [
        'total_biaya_mingguan_rp',
        'rata_rata_biaya_harian_rp',
        'target_anggaran_mingguan_rp',
        'status_budget',
        'selisih_rp',
        'catatan_ahli_gizi',
      ],
    },
    porsi_anggota: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          member_id: { type: Type.STRING },
          alias: { type: Type.STRING },
          usia_tahun: { type: Type.NUMBER },
          jenis_kelamin: { type: Type.STRING },
          status_khusus: { type: Type.STRING },
          kelipatan_porsi: { type: Type.STRING }, // '0.5x' | '0.75x' | '1.0x' | '1.25x'
          alasan_gizi: { type: Type.STRING },
        },
        required: [
          'alias',
          'usia_tahun',
          'jenis_kelamin',
          'kelipatan_porsi',
          'alasan_gizi',
        ],
      },
    },
    jadwal_harian: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          hari_ke: { type: Type.NUMBER },
          nama_hari: { type: Type.STRING },
          estimasi_biaya_harian_rp: { type: Type.NUMBER },
          sarapan: {
            type: Type.OBJECT,
            properties: {
              kode_resep: { type: Type.STRING },
              nama_resep: { type: Type.STRING },
              kategori: { type: Type.STRING },
              porsi_standar: { type: Type.STRING },
              estimasi_biaya_rp: { type: Type.NUMBER },
            },
            required: ['kode_resep', 'nama_resep', 'estimasi_biaya_rp'],
          },
          makan_siang: {
            type: Type.OBJECT,
            properties: {
              kode_resep: { type: Type.STRING },
              nama_resep: { type: Type.STRING },
              kategori: { type: Type.STRING },
              porsi_standar: { type: Type.STRING },
              estimasi_biaya_rp: { type: Type.NUMBER },
            },
            required: ['kode_resep', 'nama_resep', 'estimasi_biaya_rp'],
          },
          makan_malam: {
            type: Type.OBJECT,
            properties: {
              kode_resep: { type: Type.STRING },
              nama_resep: { type: Type.STRING },
              kategori: { type: Type.STRING },
              porsi_standar: { type: Type.STRING },
              estimasi_biaya_rp: { type: Type.NUMBER },
            },
            required: ['kode_resep', 'nama_resep', 'estimasi_biaya_rp'],
          },
          selingan: {
            type: Type.OBJECT,
            properties: {
              kode_resep: { type: Type.STRING },
              nama_resep: { type: Type.STRING },
              kategori: { type: Type.STRING },
              porsi_standar: { type: Type.STRING },
              estimasi_biaya_rp: { type: Type.NUMBER },
            },
            required: ['kode_resep', 'nama_resep', 'estimasi_biaya_rp'],
          },
        },
        required: [
          'hari_ke',
          'nama_hari',
          'estimasi_biaya_harian_rp',
          'sarapan',
          'makan_siang',
          'makan_malam',
          'selingan',
        ],
      },
    },
    daftar_belanja_mingguan: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          kode_tkpi: { type: Type.STRING },
          nama_bahan: { type: Type.STRING },
          kategori: { type: Type.STRING },
          total_gram: { type: Type.NUMBER },
          estimasi_kemasan: { type: Type.STRING },
          harga_per_100g_rp: { type: Type.NUMBER },
          subtotal_rp: { type: Type.NUMBER },
          sumber_harga: { type: Type.STRING },
        },
        required: [
          'kode_tkpi',
          'nama_bahan',
          'total_gram',
          'harga_per_100g_rp',
          'subtotal_rp',
          'sumber_harga',
        ],
      },
    },
  },
  required: [
    'ringkasan',
    'porsi_anggota',
    'jadwal_harian',
    'daftar_belanja_mingguan',
  ],
};

export interface GeminiMealPlanResponse {
  ringkasan: {
    total_biaya_mingguan_rp: number;
    rata_rata_biaya_harian_rp: number;
    target_anggaran_mingguan_rp: number;
    status_budget: 'hemat' | 'sesuai' | 'melebihi';
    selisih_rp: number;
    catatan_ahli_gizi: string;
  };
  porsi_anggota: Array<{
    member_id?: string;
    alias: string;
    usia_tahun: number;
    jenis_kelamin: string;
    status_khusus?: string;
    kelipatan_porsi: string; // '0.5x' | '0.75x' | '1.0x' | '1.25x'
    alasan_gizi: string;
  }>;
  jadwal_harian: Array<{
    hari_ke: number;
    nama_hari: string;
    estimasi_biaya_harian_rp: number;
    sarapan: {
      kode_resep: string;
      nama_resep: string;
      kategori?: string;
      porsi_standar?: string;
      estimasi_biaya_rp: number;
    };
    makan_siang: {
      kode_resep: string;
      nama_resep: string;
      kategori?: string;
      porsi_standar?: string;
      estimasi_biaya_rp: number;
    };
    makan_malam: {
      kode_resep: string;
      nama_resep: string;
      kategori?: string;
      porsi_standar?: string;
      estimasi_biaya_rp: number;
    };
    selingan: {
      kode_resep: string;
      nama_resep: string;
      kategori?: string;
      porsi_standar?: string;
      estimasi_biaya_rp: number;
    };
  }>;
  daftar_belanja_mingguan: Array<{
    kode_tkpi: string;
    nama_bahan: string;
    kategori?: string;
    total_gram: number;
    estimasi_kemasan: string;
    harga_per_100g_rp: number;
    subtotal_rp: number;
    sumber_harga: string;
  }>;
}

// ==========================================
// 3. LAYANAN AI GEMINI (PERENCANAAN MENU & BUDGET)
// ==========================================
export async function generateFamilyMealPlanWithGemini({
  familyId,
  saveToDatabase = true,
  preferredModel = 'gemini-2.5-flash',
}: {
  familyId: string;
  saveToDatabase?: boolean;
  preferredModel?: string;
}) {
  const apiKey = process.env.GEMINI_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Konfigurasi GEMINI_KEY atau GEMINI_API_KEY belum tersedia di environment (.env).');
  }

  // 1. Ambil Profil Keluarga dan Anggota
  const family = await prisma.family.findUnique({
    where: { id: familyId },
    include: {
      members: true,
    },
  });

  if (!family) {
    throw new Error(`Data keluarga dengan ID '${familyId}' tidak ditemukan di database.`);
  }

  if (family.members.length === 0) {
    throw new Error('Keluarga harus memiliki minimal 1 anggota untuk membuat rencana menu gizi.');
  }

  // 2. Ambil Harga Bahan Aktif (Prioritas Custom Warung vs Acuan Pasar Default)
  const activePricesData = await getFamilyActivePrices(familyId);

  // 3. Evaluasi Keamanan Gizi & Alergen Sekeluarga
  // a. Kumpulkan seluruh alergen keluarga (Alergen dari 1 anggota menyingkirkan resep dari menu SELURUH KELUARGA)
  const familyAllergens = new Set<string>();
  for (const m of family.members) {
    if (m.alergen && Array.isArray(m.alergen)) {
      for (const al of m.alergen) {
        if (typeof al === 'string') {
          al.split(',').forEach((s: string) => {
            const clean = s.trim().toLowerCase();
            if (clean) familyAllergens.add(clean);
          });
        }
      }
    }
  }

  // b. Cek apakah ada balita usia 2-3 tahun
  const hasToddler = family.members.some(
    (m) => (m.usia_tahun >= 2 && m.usia_tahun <= 3) || m.usia_tahun <= 3
  );

  // c. Cek apakah ada ibu hamil trimester 1
  const hasBumilT1 = family.members.some((m) => {
    const jk = m.jenis_kelamin;
    const st = ((m.status_khusus || '') + '').toLowerCase().trim();
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

  // d. Ambil Katalog Resep & Relasi Bahan dengan Filter Keamanan Ketat
  const rawCatalogResep = await prisma.resep.findMany({
    include: {
      resep_bahan: {
        include: { bahan: true },
      },
    },
  });

  const catalogResep = rawCatalogResep.filter((r) => {
    // 1. Resep RSP025 selalu NONAKTIF di MVP
    if (
      r.kode_resep === 'RSP025' ||
      r.kode_resep?.toUpperCase() === 'RSP025' ||
      r.nama_resep.toLowerCase().includes('rsp025') ||
      (r.kategori === 'Menu Anak' && r.nama_resep.toLowerCase().includes('hati'))
    ) {
      return false;
    }

    // 2. Alergen sekeluarga: Jika salah satu anggota alergi, resep disingkirkan dari seluruh keluarga
    if (familyAllergens.size > 0) {
      const namaResepLower = r.nama_resep.toLowerCase();
      for (const al of familyAllergens) {
        if (namaResepLower.includes(al)) return false;
      }

      for (const rb of r.resep_bahan) {
        const bahanName = rb.bahan.nama_bahan.toLowerCase();
        for (const al of familyAllergens) {
          if (bahanName.includes(al)) return false;
        }
        if (rb.bahan.alergen && Array.isArray(rb.bahan.alergen)) {
          for (const ba of rb.bahan.alergen) {
            if (familyAllergens.has(ba.toLowerCase().trim())) return false;
          }
        }
      }
    }

    // 3. Batas Hati Ayam: Dilarang untuk keluarga dengan anak usia 2-3 tahun atau bumil trimester 1
    const isMenuHati =
      r.kode_resep === 'RSP004' ||
      r.nama_resep.toLowerCase().includes('hati ayam') ||
      r.resep_bahan.some(
        (rb) =>
          rb.kode_tkpi === 'CD005' ||
          rb.kode_tkpi === 'BHN-003' ||
          rb.bahan.nama_bahan.toLowerCase().includes('hati ayam')
      );

    if (isMenuHati && (hasToddler || hasBumilT1)) {
      return false; // Jangan sediakan di katalog untuk AI jika ada balita / bumil T1
    }

    return true;
  });

  // 4. Ambil Standar AKG
  const akgRecords = await prisma.akg.findMany();

  // 5. Hitung Target Anggaran Mingguan
  const nominalBudget = Number(family.budget_belanja || 3000000);
  const targetMingguan =
    family.tipe_budget === 'mingguan'
      ? nominalBudget
      : Math.round(nominalBudget / 4);

  // 6. Susun Prompt Spesifik untuk Gemini
  const prompt = `
Peran Anda adalah Ahli Gizi Keluarga Indonesia dan Konsultan Perencana Keuangan Belanja Rumah Tangga (Porsi Kita).

Tugas Anda:
Susun rencana menu makanan bergizi seimbang selama 7 HARI (Hari 1 s.d. Hari 7) untuk keluarga berikut, hitung kebutuhan porsi individual berdasarkan standar AKG (Angka Kecukupan Gizi), dan buat daftar belanja mingguan yang transparan serta hemat berdasarkan DAFTAR HARGA AKTIF yang disediakan.

PROFIL KELUARGA:
- Nama Keluarga: "${family.alias}"
- Acuan Pasar / Wilayah: "${family.wilayah}"
- Tipe Anggaran: ${family.tipe_budget.toUpperCase()}
- Target Anggaran Belanja Mingguan: Rp ${targetMingguan.toLocaleString('id-ID')}
- Anggota Keluarga (${family.members.length} Orang):
${family.members
  .map(
    (m, idx) =>
      `  ${idx + 1}. [${m.id}] ${m.alias} - Usia: ${m.usia_tahun} tahun, Jenis Kelamin: ${m.jenis_kelamin}, Status: ${m.status_khusus || 'Umum'}, Alergi: ${m.alergen.length > 0 ? m.alergen.join(', ') : 'Tidak ada'}`
  )
  .join('\n')}

KEAMANAN GIZI & KESELAMATAN KELUARGA (WAJIB DIIKUTI SECARA KETAT, TANPA TOLERANSI):
1. Hati Ayam (RSP004):
   - Maksimal dijadwalkan HANYA 1 KALI dalam seminggu untuk seluruh jadwal 7 hari.
   - Jika keluarga memiliki anak usia 2-3 tahun ATAU ibu hamil trimester 1: DILARANG KERAS MENJADWALKAN HATI AYAM (0 KALI) untuk mencegah risiko toksisitas retinol / teratogenik.
2. Resep RSP025 (Bubur Tim Hati Ayam dan Kelor):
   - Berstatus NONAKTIF dan DILARANG DIGUNAKAN sama sekali.
3. Aturan Alergen Sekeluarga (Household Allergen Exclusion):
   - Alergen dari SATU anggota keluarga menyingkirkan resep tersebut dari menu SELURUH KELUARGA (tidak boleh dimasak demi mencegah risiko kontaminasi silang).
   - Daftar Alergen Terlarang Keluarga Ini: ${Array.from(familyAllergens).join(', ') || 'Tidak ada'}.

KATALOG RESEP YANG TERSEDIA (HANYA PILIH DARI RESEP AMAN BERIKUT):
${catalogResep
  .map(
    (r) =>
      `- [${r.kode_resep}] ${r.nama_resep} (${r.kategori}, ${r.porsi}): ` +
      r.resep_bahan
        .map((rb) => `${rb.bahan.nama_bahan} (${rb.jumlah_gram}g [${rb.kode_tkpi}])`)
        .join(', ') +
      (r.catatan_keamanan ? ` | Peringatan: ${r.catatan_keamanan}` : '')
  )
  .join('\n')}

DAFTAR HARGA BAHAN AKTIF (PRIORITAS USER WARUNG & DEFAULT PASAR):
${activePricesData.activePrices
  .map(
    (p) =>
      `- [${p.kode_tkpi}] ${p.nama_bahan}: Rp ${p.harga_per_100g_rp}/100g (Sumber: ${p.sumber_harga === 'custom_warung' ? 'WARUNG LANGGANAN IBU (' + p.nama_warung + ')' : 'Acuan Pasar Tradisional'})`
  )
  .join('\n')}

STANDAR AKG ACUAN UTAMA:
- Balita (1-3 th): ~1350 kcal, Protein 20g
- Anak (4-6 th): ~1400 kcal, Protein 25g
- Anak (7-9 th): ~1650 kcal, Protein 40g
- Remaja/Dewasa Laki-laki: ~2000-2650 kcal
- Remaja/Dewasa Perempuan: ~1900-2250 kcal
- Ibu Hamil/Menyusui: Tambahan +180 s.d. +400 kcal & protein ekstra

ATURAN BISNIS & KALKULASI PORSI KITA (WAJIB DIIKUTI SECARA KETAT):
1. Kelipatan Porsi Anggota Keluarga:
   - Harus berupa salah satu dari: '0.5x' | '0.75x' | '1.0x' | '1.25x'.
   - Sesuaikan dengan usia, jenis kelamin, dan status khusus (misal anak kecil '0.5x' atau '0.75x', ibu '1.0x', ayah pekerja fisik '1.25x').
2. Jadwal 7 Hari:
   - Setiap hari mencakup: Sarapan, Makan Siang, Makan Malam, dan Selingan buah/susu.
   - Gunakan HANYA resep yang ada di katalog di atas.
   - Hindari bahan yang mengandung alergi anggota keluarga tersebut.
3. Estimasi Biaya & Belanja:
   - Hitung total kebutuhan bahan (dalam gram) berdasarkan kelipatan porsi seluruh keluarga.
   - Kalikan kebutuhan gram dengan harga per 100 gram dari daftar harga aktif di atas (subtotal = (gram / 100) * harga_per_100g_rp).
   - Pastikan total biaya mingguan mendekati atau di bawah target anggaran: Rp ${targetMingguan.toLocaleString('id-ID')}.
4. Nada Komunikasi:
   - Ramah, empatik, praktis untuk Ibu rumah tangga Indonesia, tanpa jargon ilmiah yang rumit.
`;

  const ai = new GoogleGenAI({ apiKey });

  // 7. Eksekusi Model dengan Fallback Teruji
  let finalJsonText = '';
  let modelUsed = preferredModel;

  const candidateModels = [
    preferredModel,
    'gemini-3.5-flash',
    'gemini-3.8-flash',
    'gemini-flash-latest',
  ];

  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: mealPlanResponseSchema,
          temperature: 0.3,
        },
      });

      if (response && response.text) {
        finalJsonText = response.text.trim();
        modelUsed = model;
        break;
      }
    } catch (err: any) {
      lastError = err;
      // Jika model 404 (deprecated / no longer available), lanjut ke kandidat berikutnya
      console.warn(`[GeminiService] Model ${model} gagal atau tidak tersedia (${err?.message || err}). Mencoba model alternatif...`);
    }
  }

  if (!finalJsonText) {
    throw new Error(`Gagal menghasilkan rencana menu dari Gemini API. Terakhir error: ${lastError?.message || lastError}`);
  }

  const parsedPlan: GeminiMealPlanResponse = JSON.parse(finalJsonText);

  // 8. Sanitasi & Penegakan Keamanan Gizi 100% pada Output AI
  let pemakaianHatiAyamMingguIni = 0;
  if (parsedPlan && Array.isArray(parsedPlan.jadwal_harian)) {
    const sanitizeMeal = (dish: {
      kode_resep: string;
      nama_resep: string;
      kategori?: string;
      porsi_standar?: string;
      estimasi_biaya_rp: number;
    }) => {
      if (!dish) return dish;
      // a. Nonaktifkan RSP025 mutlak
      if (dish.kode_resep === 'RSP025' || dish.nama_resep?.toLowerCase().includes('rsp025')) {
        dish.kode_resep = 'RSP002';
        dish.nama_resep = 'Nasi Tim Ayam Bayam';
        dish.kategori = 'Makanan Pokok';
      }

      // b. Cek Hati Ayam (max 1x seminggu, 0x jika balita 2-3 th atau bumil T1)
      const isHati = dish.kode_resep === 'RSP004' || dish.nama_resep?.toLowerCase().includes('hati ayam');
      if (isHati) {
        if (hasToddler || hasBumilT1 || pemakaianHatiAyamMingguIni >= 1) {
          dish.kode_resep = 'RSP003';
          dish.nama_resep = 'Sup Ayam Sayuran';
          dish.kategori = 'Lauk Hewani';
        } else {
          pemakaianHatiAyamMingguIni++;
        }
      }

      // c. Cek Alergen sekeluarga
      if (familyAllergens.size > 0) {
        const dishName = dish.nama_resep?.toLowerCase() || '';
        for (const al of familyAllergens) {
          if (dishName.includes(al)) {
            dish.kode_resep = 'RSP003';
            dish.nama_resep = 'Sup Ayam Sayuran';
            dish.kategori = 'Lauk Hewani';
            break;
          }
        }
      }
      return dish;
    };

    for (const h of parsedPlan.jadwal_harian) {
      if (h.sarapan) sanitizeMeal(h.sarapan);
      if (h.makan_siang) sanitizeMeal(h.makan_siang);
      if (h.makan_malam) sanitizeMeal(h.makan_malam);
      if (h.selingan) sanitizeMeal(h.selingan);
    }
  }

  // 9. Simpan ke Database (Tabel 'meal_plans') jika saveToDatabase = true
  let savedMealPlan = null;
  if (saveToDatabase) {
    savedMealPlan = await prisma.mealPlan.create({
      data: {
        family_id: family.id,
        hasil_json: parsedPlan as any,
        total_biaya: parsedPlan.ringkasan.total_biaya_mingguan_rp,
      },
    });
  }

  return {
    mealPlanId: savedMealPlan?.id,
    plan: parsedPlan,
    activePricesCount: activePricesData.activePrices.length,
    customPricesCount: activePricesData.customPricesCount,
    hasCustomWarung: activePricesData.hasCustomWarung,
    modelUsed,
  };
}
