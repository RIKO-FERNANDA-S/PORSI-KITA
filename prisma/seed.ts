import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();
const DATA_DIR = path.join(process.cwd(), 'data');

// Pemetaan standar ke kode format seragam BHN-001 hingga BHN-060
const TKPI_TO_BHN_MAP: Record<string, string> = {
  // 60 Bahan Pangan Pokok
  AR001: 'BHN-001',
  CD001: 'BHN-002',
  CD005: 'BHN-003',
  CD010: 'BHN-004',
  CF001: 'BHN-005',
  CF015: 'BHN-006',
  CE001: 'BHN-007',
  BH001: 'BHN-008',
  BH002: 'BHN-009',
  DG001: 'BHN-010',
  DG012: 'BHN-011',
  DG020: 'BHN-012',
  DB001: 'BHN-013',
  DB010: 'BHN-014',
  GD001: 'BHN-015',
  KR012: 'BHN-016',
  MP007: 'BHN-017',
  NR007: 'BHN-018',
  NR008: 'BHN-019',
  NR014: 'BHN-020',
  DR100: 'BHN-021',
  DR013: 'BHN-022',
  AR015: 'BHN-023',
  AP025: 'BHN-024',
  NP005: 'BHN-025',
  CP065: 'BHN-026',
  GR007: 'BHN-027',
  AR004: 'BHN-028',
  AR009: 'BHN-029',
  AR019: 'BHN-030',
  BR013: 'BHN-031',
  BR016: 'BHN-032',
  BR028: 'BHN-033',
  CR017: 'BHN-034',
  CR014: 'BHN-035',
  CR026: 'BHN-036',
  CR032: 'BHN-037',
  DR007: 'BHN-038',
  DR010: 'BHN-039',
  DR016: 'BHN-040',
  DR044: 'BHN-041',
  DR064: 'BHN-042',
  DR109: 'BHN-043',
  DR126: 'BHN-044',
  DR141: 'BHN-045',
  DR145: 'BHN-046',
  DR154: 'BHN-047',
  DR161: 'BHN-048',
  ER001: 'BHN-049',
  ER004: 'BHN-050',
  ER031: 'BHN-051',
  ER039: 'BHN-052',
  ER054: 'BHN-053',
  ER067: 'BHN-054',
  ER105: 'BHN-055',
  FR012: 'BHN-056',
  FR019: 'BHN-057',
  GR003: 'BHN-058',
  GR039: 'BHN-059',
  GR084: 'BHN-060',

  // Alias dari sumber harga.csv (Panel Bapanas / PIHPS)
  FR005: 'BHN-002', // Daging ayam ras -> BHN-002 (Daging ayam)
  FR026: 'BHN-004', // Daging sapi (Kualitas 2) -> BHN-004 (Daging sapi)
  HR002: 'BHN-007', // Telur ayam ras -> BHN-007 (Telur ayam ras)
  GR050: 'BHN-005', // Ikan kembung -> BHN-005 (Ikan kembung)
  FR007: 'BHN-003', // Hati ayam segar -> BHN-003 (Hati ayam)
  GR046: 'BHN-006', // Ikan mas / survei lapak lele -> BHN-006 (Ikan lele)
  CP061: 'BHN-008', // Tahu putih -> BHN-008 (Tahu)
  CP077: 'BHN-009', // Tempe kedelai murni -> BHN-009 (Tempe kedelai murni)
  DR008: 'BHN-010', // Bayam hijau -> BHN-010 (Bayam hijau)
  DR166: 'BHN-011', // Wortel -> BHN-011 (Wortel)
  DR038: 'BHN-012', // Daun kelor segar -> BHN-012 (Kelor (daun))
  ER074: 'BHN-013', // Pisang ambon -> BHN-013 (Pisang ambon)
  ER073: 'BHN-014', // Pepaya bangkok -> BHN-014 (Pepaya)
  JR006: 'BHN-015', // Susu sapi segar -> BHN-015 (Susu sapi segar)

  // Alias dari resep_bahan.csv
  MG001: 'BHN-016', // Minyak goreng -> BHN-016 (Minyak kelapa sawit)
  GL001: 'BHN-017', // Gula pasir konsumsi -> BHN-017 (Gula putih)
  BW001: 'BHN-018', // Bawang merah -> BHN-018 (Bawang merah)
  BW002: 'BHN-019', // Bawang putih honan -> BHN-019 (Bawang putih)
  CB001: 'BHN-020', // Cabai merah keriting -> BHN-020 (Cabai merah)
  MK001: 'BHN-025', // Kecap manis -> BHN-025 (Kecap manis)
  MK002: 'BHN-026', // Tauco -> BHN-026 (Tauco)
  AR005: 'BHN-024', // Tepung terigu -> BHN-024 (Tepung terigu)
  DG030: 'BHN-023', // Jagung manis -> BHN-023 (Jagung manis)
  DG005: 'BHN-021', // Kangkung -> BHN-021 (Kangkung)
  DG008: 'BHN-022', // Buncis -> BHN-022 (Buncis)
};

export function normalizeBahanCode(rawCode: string): string {
  const code = rawCode.trim();
  if (code.startsWith('BHN-')) {
    return code;
  }
  return TKPI_TO_BHN_MAP[code] || code;
}

function parseCsvFile<T>(filename: string): T[] {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`File ${filename} tidak ditemukan di folder data/`);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

const parseNum = (val: any, fallback = 0): number => {
  if (val === undefined || val === null || val === '') return fallback;
  const cleaned = String(val).trim().replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? fallback : num;
};

async function main() {
  console.log('🌱 [Porsi Kita] Memulai proses Seeding Database Komprehensif...');

  // ==========================================
  // 1. SEED BAHAN (bahan.csv) -> BHN-001 s.d BHN-060
  // ==========================================
  console.log('📦 1/6 Seeding data Bahan Pangan (standarisasi BHN-001 - BHN-060)...');
  const bahanRows = parseCsvFile<Record<string, string>>('bahan.csv');

  for (let idx = 0; idx < bahanRows.length; idx++) {
    const row = bahanRows[idx];
    const kodeTkpi = normalizeBahanCode(row.Kode_TKPI || `BHN-${String(idx + 1).padStart(3, '0')}`);
    const alergenList = row.Alergen
      ? row.Alergen.split(';')
          .map((a) => a.trim().toLowerCase())
          .filter(Boolean)
      : [];

    await prisma.bahan.upsert({
      where: { kode_tkpi: kodeTkpi },
      update: {
        nama_bahan: row.Nama_Bahan.trim(),
        kategori: row.Kategori.trim(),
        kategori_menu: row.Kategori_Menu?.trim() || null,
        kondisi: row.Kondisi?.trim() || null,
        energi_kcal: parseNum(row.Energi_kcal),
        protein_g: parseNum(row.Protein_g),
        lemak_g: parseNum(row.Lemak_g),
        karbohidrat_g: parseNum(row.Karbohidrat_g),
        kalsium_mg: parseNum(row.Kalsium_mg),
        zat_besi_mg: parseNum(row.Zat_Besi_mg),
        seng_mg: parseNum(row.Seng_Zinc_mg),
        vitamin_a_mcg: parseNum(row.Vitamin_A_mcg),
        bdd_percent: parseNum(row.BDD_percent, 100),
        alergen: alergenList,
      },
      create: {
        kode_tkpi: kodeTkpi,
        nama_bahan: row.Nama_Bahan.trim(),
        kategori: row.Kategori.trim(),
        kategori_menu: row.Kategori_Menu?.trim() || null,
        kondisi: row.Kondisi?.trim() || null,
        energi_kcal: parseNum(row.Energi_kcal),
        protein_g: parseNum(row.Protein_g),
        lemak_g: parseNum(row.Lemak_g),
        karbohidrat_g: parseNum(row.Karbohidrat_g),
        kalsium_mg: parseNum(row.Kalsium_mg),
        zat_besi_mg: parseNum(row.Zat_Besi_mg),
        seng_mg: parseNum(row.Seng_Zinc_mg),
        vitamin_a_mcg: parseNum(row.Vitamin_A_mcg),
        bdd_percent: parseNum(row.BDD_percent, 100),
        alergen: alergenList,
      },
    });
  }
  console.log(`✅ Berhasil seed ${bahanRows.length} data Bahan ke tabel 'bahan'.`);

  // ==========================================
  // 2. SEED RESEP & RESEP_BAHAN
  // ==========================================
  console.log('🍳 2/6 Seeding data Resep & Komposisi ResepBahan...');
  const resepRows = parseCsvFile<Record<string, string>>('resep.csv');

  for (const row of resepRows) {
    const targetUsia = row.Target_Usia_Max_Tahun ? parseInt(row.Target_Usia_Max_Tahun, 10) : null;
    await prisma.resep.upsert({
      where: { kode_resep: row.Kode_Resep.trim() },
      update: {
        nama_resep: row.Nama_Resep.trim(),
        kategori: row.Kategori.trim(),
        porsi: row.Porsi.trim(),
        keterangan: row.Keterangan?.trim() || null,
        catatan_keamanan: row.Catatan_Keamanan?.trim() || null,
        target_usia_max_tahun: isNaN(targetUsia as number) ? null : targetUsia,
      },
      create: {
        kode_resep: row.Kode_Resep.trim(),
        nama_resep: row.Nama_Resep.trim(),
        kategori: row.Kategori.trim(),
        porsi: row.Porsi.trim(),
        keterangan: row.Keterangan?.trim() || null,
        catatan_keamanan: row.Catatan_Keamanan?.trim() || null,
        target_usia_max_tahun: isNaN(targetUsia as number) ? null : targetUsia,
      },
    });
  }

  // Refresh ResepBahan
  await prisma.resepBahan.deleteMany({});
  const resepBahanRows = parseCsvFile<Record<string, string>>('resep_bahan.csv');

  for (const rb of resepBahanRows) {
    const kodeTkpi = normalizeBahanCode(rb.Kode_TKPI);
    await prisma.resepBahan.create({
      data: {
        kode_resep: rb.Kode_Resep.trim(),
        kode_tkpi: kodeTkpi,
        jumlah_gram: parseNum(rb.Jumlah_Gram),
      },
    });
  }
  console.log(`✅ Berhasil seed ${resepRows.length} resep & ${resepBahanRows.length} komposisi resep_bahan.`);

  // ==========================================
  // 3. SEED AKG (akg.csv)
  // ==========================================
  console.log('📊 3/6 Seeding Standar Kecukupan Gizi (AKG)...');
  const akgRows = parseCsvFile<Record<string, string>>('akg.csv');

  for (const row of akgRows) {
    const umurMin = row.Umur_Min_Bulan ? parseInt(row.Umur_Min_Bulan, 10) : null;
    const umurMax = row.Umur_Max_Bulan ? parseInt(row.Umur_Max_Bulan, 10) : null;

    await prisma.akg.upsert({
      where: { kode_kelompok: row.Kode_Kelompok.trim() },
      update: {
        kelompok_usia: row.Kelompok_Usia.trim(),
        jenis_kelamin: row.Jenis_Kelamin.trim(),
        tipe: row.Tipe?.trim() || null,
        umur_min_bulan: isNaN(umurMin as number) ? null : umurMin,
        umur_max_bulan: isNaN(umurMax as number) ? null : umurMax,
        dalam_cakupan_produk: row.Dalam_Cakupan_Produk?.trim() || null,
        energi_kcal: parseNum(row.Energi_kcal),
        protein_g: parseNum(row.Protein_g),
        vitamin_a_mcg_re: parseNum(row.Vitamin_A_mcg_RE),
        kalsium_mg: parseNum(row.Kalsium_mg),
        zat_besi_mg: parseNum(row.Zat_Besi_mg),
        seng_mg: parseNum(row.Seng_mg),
        catatan: row.Catatan?.trim() || null,
      },
      create: {
        kode_kelompok: row.Kode_Kelompok.trim(),
        kelompok_usia: row.Kelompok_Usia.trim(),
        jenis_kelamin: row.Jenis_Kelamin.trim(),
        tipe: row.Tipe?.trim() || null,
        umur_min_bulan: isNaN(umurMin as number) ? null : umurMin,
        umur_max_bulan: isNaN(umurMax as number) ? null : umurMax,
        dalam_cakupan_produk: row.Dalam_Cakupan_Produk?.trim() || null,
        energi_kcal: parseNum(row.Energi_kcal),
        protein_g: parseNum(row.Protein_g),
        vitamin_a_mcg_re: parseNum(row.Vitamin_A_mcg_RE),
        kalsium_mg: parseNum(row.Kalsium_mg),
        zat_besi_mg: parseNum(row.Zat_Besi_mg),
        seng_mg: parseNum(row.Seng_mg),
        catatan: row.Catatan?.trim() || null,
      },
    });
  }
  console.log(`✅ Berhasil seed ${akgRows.length} baris data AKG.`);

  // ==========================================
  // 4. SEED PAKET MENU & KOMPONEN
  // ==========================================
  console.log('🍱 4/6 Seeding Paket Menu & Komponen...');
  const paketRows = parseCsvFile<Record<string, string>>('paket_menu.csv');

  for (const p of paketRows) {
    await prisma.paketMenu.upsert({
      where: { kode_paket: p.Kode_Paket.trim() },
      update: {
        nama_paket: p.Nama_Paket.trim(),
        keterangan: p.Keterangan?.trim() || null,
        catatan_keamanan: p.Catatan_Keamanan?.trim() || null,
      },
      create: {
        kode_paket: p.Kode_Paket.trim(),
        nama_paket: p.Nama_Paket.trim(),
        keterangan: p.Keterangan?.trim() || null,
        catatan_keamanan: p.Catatan_Keamanan?.trim() || null,
      },
    });
  }

  await prisma.paketKomponen.deleteMany({});
  const komponenRows = parseCsvFile<Record<string, string>>('paket_komponen.csv');

  for (const k of komponenRows) {
    await prisma.paketKomponen.create({
      data: {
        kode_paket: k.Kode_Paket.trim(),
        kode_resep: k.Kode_Resep.trim(),
      },
    });
  }
  console.log(`✅ Berhasil seed ${paketRows.length} paket menu & ${komponenRows.length} relasi komponen.`);

  // ==========================================
  // 5. SEED WARUNG DEFAULT & HARGA_WARUNG (harga.csv)
  // ==========================================
  console.log('🏪 5/6 Seeding Warung Default & Harga Acuan Pasar (harga.csv)...');
  
  // Buat atau temukan Warung Default global sistem (family_id = null)
  let defaultWarung = await prisma.warung.findFirst({
    where: { nama_warung: 'Harga Acuan Pasar (Default)' },
  });

  if (!defaultWarung) {
    defaultWarung = await prisma.warung.create({
      data: {
        nama_warung: 'Harga Acuan Pasar (Default)',
        family_id: null,
      },
    });
  }

  const hargaRows = parseCsvFile<Record<string, string>>('harga.csv');
  let hargaCount = 0;

  for (const h of hargaRows) {
    const rawKode = h.Kode_TKPI?.trim();
    const normalizedCode = normalizeBahanCode(rawKode);
    const hargaPer100g = parseNum(h.Harga_per_100g_Rp);

    // Pastikan bahan terkait ada di database sebelum mengikat harga
    const bahanExist = await prisma.bahan.findUnique({
      where: { kode_tkpi: normalizedCode },
    });

    if (bahanExist) {
      await prisma.hargaWarung.upsert({
        where: {
          warung_id_kode_tkpi: {
            warung_id: defaultWarung.id,
            kode_tkpi: normalizedCode,
          },
        },
        update: {
          harga_per_100g_rp: hargaPer100g,
          tanggal_update: new Date(),
        },
        create: {
          warung_id: defaultWarung.id,
          kode_tkpi: normalizedCode,
          harga_per_100g_rp: hargaPer100g,
          tanggal_update: new Date(),
        },
      });
      hargaCount++;
    } else {
      console.warn(`⚠️ Bahan tidak ditemukan untuk kode [${rawKode} -> ${normalizedCode}] (${h.Nama_Bahan})`);
    }
  }

  console.log(`✅ Berhasil seed ${hargaCount} harga acuan pasar pada Warung Default '${defaultWarung.nama_warung}'.`);
  console.log('🎉 Seeding database selesai 100% dengan integritas relasi penuh!');
}

// Jalankan seeding otomatis hanya jika file dieksekusi langsung
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  main()
    .catch((e) => {
      console.error('❌ Error saat seeding database:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
