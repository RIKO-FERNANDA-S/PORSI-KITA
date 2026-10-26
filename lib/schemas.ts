import { z } from 'zod';

export const ALERGEN_OPTIONS = [
  { id: 'telur', label: 'Telur' },
  { id: 'susu', label: 'Susu Sapi' },
  { id: 'kedelai', label: 'Kedelai (Tahu/Tempe/Kecap)' },
  { id: 'gluten', label: 'Gluten / Gandum / Terigu' },
  { id: 'kacang', label: 'Kacang-kacangan' },
  { id: 'ikan', label: 'Ikan' },
  { id: 'krustasea', label: 'Udang / Kepiting (Krustasea)' },
  { id: 'moluska', label: 'Cumi / Kerang (Moluska)' },
] as const;

export const STATUS_ANGGOTA_OPTIONS = [
  { id: 'umum', label: 'Umum / Tidak Hamil / Tidak Menyusui' },
  { id: 'hamil_t1', label: 'Ibu Hamil Trimester 1' },
  { id: 'hamil_t2', label: 'Ibu Hamil Trimester 2' },
  { id: 'hamil_t3', label: 'Ibu Hamil Trimester 3' },
  { id: 'menyusui_6bln1', label: 'Ibu Menyusui (0 - 6 Bulan Pertama)' },
  { id: 'menyusui_6bln2', label: 'Ibu Menyusui (7 - 12 Bulan Kedua)' },
] as const;

// Skema Validasi Keluarga (FR-03)
export const keluargaSchema = z.object({
  alias: z
    .string()
    .min(2, { message: 'Nama/alias keluarga minimal 2 karakter' })
    .max(50, { message: 'Nama/alias keluarga maksimal 50 karakter' }),
  wilayah: z
    .string()
    .min(2, { message: 'Wilayah minimal 2 karakter (mis. Surabaya, Jawa Timur)' })
    .max(80, { message: 'Wilayah maksimal 80 karakter' }),
  budget_harian_rp: z
    .number({
      message: 'Budget harian harus berupa angka dalam rupiah',
    })
    .min(10000, { message: 'Budget harian minimal Rp 10.000' })
    .max(1000000, { message: 'Budget harian maksimal Rp 1.000.000' }),
});

export type KeluargaFormData = z.infer<typeof keluargaSchema>;

// Skema Validasi Anggota Keluarga (FR-04)
export const anggotaSchema = z
  .object({
    alias: z
      .string()
      .min(2, { message: 'Nama panggilan/alias minimal 2 karakter' })
      .max(30, { message: 'Nama panggilan/alias maksimal 30 karakter' }),
    usia_tahun: z
      .number({
        message: 'Usia harus diisi angka tahun',
      })
      .int({ message: 'Usia harus berupa bilangan bulat' })
      .min(2, {
        message:
          'Batasan Produk: Porsi Kita belum mendukung anak di bawah 2 tahun (MPASI) karena aturan gizi MPASI memerlukan validasi pakar khusus.',
      })
      .max(120, { message: 'Usia maksimal 120 tahun' }),
    jenis_kelamin: z.enum(['L', 'P'], {
      message: 'Jenis kelamin harus Laki-laki (L) atau Perempuan (P)',
    }),
    status: z.enum(
      ['umum', 'hamil_t1', 'hamil_t2', 'hamil_t3', 'menyusui_6bln1', 'menyusui_6bln2'],
      {
        message: 'Pilih status yang sesuai',
      }
    ),
    alergen: z.array(z.string()).default([]),
  })
  .refine(
    (data) => {
      // Validasi konsistensi: hanya perempuan yang bisa hamil atau menyusui
      if (data.jenis_kelamin === 'L' && data.status !== 'umum') {
        return false;
      }
      return true;
    },
    {
      message: 'Status hamil atau menyusui hanya berlaku untuk anggota perempuan.',
      path: ['status'],
    }
  );

export type AnggotaFormData = z.infer<typeof anggotaSchema>;
