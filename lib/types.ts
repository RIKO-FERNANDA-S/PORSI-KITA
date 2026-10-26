/**
 * Porsi Kita - TypeScript Core Types
 * Sesuai Product Requirements Document (PRD) v1.0
 */

// Kelompok status khusus anggota
export type StatusAnggota =
  | 'umum'
  | 'hamil_t1'
  | 'hamil_t2'
  | 'hamil_t3'
  | 'menyusui_6bln1'
  | 'menyusui_6bln2';

// 8 Kategori Alergen Utama
export type AlergenUtama =
  | 'telur'
  | 'susu'
  | 'kedelai'
  | 'gluten'
  | 'kacang'
  | 'ikan'
  | 'krustasea'
  | 'moluska';

// Data Anggota Keluarga
export interface Anggota {
  id: string;
  family_id?: string;
  alias: string;
  usia_tahun: number; // Minimal 2 tahun (anak < 2 th di luar cakupan produk)
  jenis_kelamin: 'L' | 'P';
  status: StatusAnggota;
  alergen: string[]; // List alergen anggota
}

// Data Keluarga
export interface Keluarga {
  id: string;
  owner_id?: string;
  alias: string;
  wilayah: string;
  budget_harian_rp: number; // Minimal 10.000, maksimal 1.000.000
  created_at?: string;
  updated_at?: string;
}

// 6 Zat Gizi Utama yang dilacak (PRD 8.1)
export interface NilaiGizi {
  energi_kcal: number;
  protein_g: number;
  zat_besi_mg: number;
  kalsium_mg: number;
  seng_mg: number;
  vitamin_a_mcg: number; // RE (Retinol Equivalent)
  lemak_g?: number;
  karbohidrat_g?: number;
  retinol_mcg?: number; // Nilai retinol murni untuk batas aman
}

// Kebutuhan AKG per anggota (termasuk batas atas retinol)
export interface KebutuhanGizi extends NilaiGizi {
  kelompok_usia: string;
  batas_retinol_mcg: number;
}

// Baris dataset AKG (data/akg.csv)
export interface BarisAkg {
  kode_kelompok: string;
  kelompok_usia: string;
  jenis_kelamin: 'L' | 'P' | 'LP';
  tipe: 'dasar' | 'tambahan_hamil' | 'tambahan_menyusui';
  umur_min_bulan?: number;
  umur_max_bulan?: number;
  dalam_cakupan_produk: 'ya' | 'tidak' | 'sebagian';
  energi_kcal: number;
  protein_g: number;
  vitamin_a_mcg_re: number;
  kalsium_mg: number;
  zat_besi_mg: number;
  seng_mg: number;
  catatan?: string;
}

// Data Bahan Pangan (data/bahan.csv & data/harga.csv)
export interface BahanPangan {
  kode_tkpi: string;
  nama: string;
  kategori: string;
  kategori_menu: 'karbo' | 'protein_hewani' | 'protein_nabati' | 'sayur' | 'buah' | 'minuman' | 'bumbu_minyak';
  kondisi: string;
  energi_kcal: number;
  protein_g: number;
  lemak_g: number;
  karbohidrat_g: number;
  kalsium_mg: number;
  zat_besi_mg: number;
  seng_mg: number;
  vitamin_a_mcg: number;
  retinol_mcg?: number;
  bdd_percent: number; // Bagian Dapat Dimakan (default 100)
  alergen: string[]; // Telur, susu, dll
  harga_per_100g_rp: number;
  sumber_harga?: string;
  tanggal_harga?: string;
}

// Resep Bahan Detail
export interface ResepBahanItem {
  kode_tkpi: string;
  nama_bahan?: string;
  jumlah_gram: number;
}

// Resep Masakan (data/resep.csv)
export interface ResepMasakan {
  kode: string;
  nama: string;
  kategori: 'Makanan Pokok' | 'Lauk Hewani' | 'Lauk Nabati' | 'Sayuran' | 'Buah' | 'Minuman/Susu' | 'Menu Anak';
  porsi_standar: string;
  keterangan: string;
  catatan_keamanan?: string;
  target_usia_max_tahun?: number;
  bahan: ResepBahanItem[];
  alergen: string[];
  gizi_per_porsi: NilaiGizi;
  biaya_per_porsi_rp: number;
}

// Porsi dan Konsumsi Anggota per Waktu Makan
export interface PorsiAnggotaWaktuMakan {
  anggota_id: string;
  alias: string;
  pengali: number; // Kelipatan 0.25 (mis. 0.5, 0.75, 1.0, 1.25)
  gizi_diterima: NilaiGizi;
}

// Hidangan dalam Waktu Makan
export interface HidanganItem {
  resep: ResepMasakan;
  takaran_standar_gram: number;
}

// Waktu Makan (Pagi 30%, Siang 40%, Malam 30%)
export interface SesiMakan {
  sesi: 'pagi' | 'siang' | 'malam';
  label: string;
  persentase_energi: number; // 0.30, 0.40, 0.30
  hidangan: ResepMasakan[];
  total_energi_standar_kcal: number;
  porsi_per_anggota: PorsiAnggotaWaktuMakan[];
}

// Skor Kecukupan Gizi (PRD 8.5)
export type StatusKecukupan = 'tercukupi' | 'hampir' | 'kurang';

export interface SkorZatGizi {
  zat: string;
  satuan: string;
  kebutuhan: number;
  terpenuhi: number;
  persen: number; // terpenuhi / kebutuhan * 100
  rasio: number; // min(terpenuhi / kebutuhan, 1.0)
  status: StatusKecukupan;
}

export interface SkorAnggota {
  anggota_id: string;
  alias: string;
  skor_rata_rata: number; // 0 - 100%
  status: StatusKecukupan;
  rincian_zat: Record<string, SkorZatGizi>;
  asupan_total: NilaiGizi;
  kebutuhan: KebutuhanGizi;
  peringatan_keamanan?: string[];
}

export interface SkorKeluarga {
  skor_rata_rata: number; // rata-rata seluruh anggota
  skor_terendah: number; // anggota terendah selalu ditampilkan
  anggota_skor_terendah?: string;
  status: StatusKecukupan;
  skor_per_anggota: SkorAnggota[];
}

// Menu Harian (1 Hari)
export interface MenuHari {
  hari_ke: number;
  label_hari: string; // misal "Senin", "Selasa", dst.
  sesi_makan: {
    pagi: SesiMakan;
    siang: SesiMakan;
    malam: SesiMakan;
  };
  total_biaya_hari_rp: number;
  skor_keluarga: SkorKeluarga;
}

// Rencana Menu 7 Hari
export interface RencanaMenu7Hari {
  id: string;
  family_id: string;
  created_at: string;
  hari: MenuHari[];
  total_biaya_mingguan_rp: number;
  target_budget_mingguan_rp: number;
  budget_harian_rp: number;
  kepatuhan_budget_percent: number;
  is_fallback_package?: boolean;
  pesan_budget?: string;
}

// Item Daftar Belanja Gabungan 7 Hari
export interface ItemDaftarBelanja {
  kode_tkpi: string;
  nama_bahan: string;
  kategori: string;
  kebutuhan_bersih_gram: number;
  bdd_percent: number;
  kebutuhan_beli_gram: number; // dibulatkan praktis untuk pasar
  harga_per_100g_rp: number;
  estimasi_biaya_rp: number;
  dicentang?: boolean;
}

// Paket Menu Cadangan (PKT001 - PKT004)
export interface PaketMenu {
  kode_paket: string;
  nama_paket: string;
  keterangan: string;
  catatan_keamanan?: string;
  resep_kodes: string[];
}
