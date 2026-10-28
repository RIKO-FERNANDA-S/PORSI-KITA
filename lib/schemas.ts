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

// Skema Validasi Formulir Lengkapi Profil / Onboarding Form (FR-03 & FR-04)
export const profilKeluargaFormSchema = z.object({
  namaKeluarga: z
    .string({ message: 'Nama profil keluarga wajib diisi' })
    .trim()
    .min(2, { message: 'Nama profil keluarga minimal 2 karakter' })
    .max(50, { message: 'Nama profil keluarga maksimal 50 karakter' }),
  budgetHarian: z
    .number({ message: 'Target budget belanja harian harus berupa angka' })
    .min(10000, { message: 'Target budget harian minimal Rp 10.000' })
    .max(1000000, { message: 'Target budget harian maksimal Rp 1.000.000' }),
  wilayah: z
    .string({ message: 'Acuan pasar/wilayah wajib dipilih' })
    .trim()
    .min(2, { message: 'Pilih acuan pasar atau wilayah yang valid' }),
  anggota: z
    .array(
      z.object({
        id: z.string(),
        alias: z
          .string()
          .trim()
          .min(2, { message: 'Nama panggilan anggota minimal 2 karakter' })
          .max(30, { message: 'Nama panggilan anggota maksimal 30 karakter' }),
        usia_tahun: z
          .number({ message: 'Usia harus diisi angka tahun' })
          .int({ message: 'Usia harus berupa bilangan bulat' })
          .min(2, {
            message:
              'Batasan Produk: Anak minimal berusia 2 tahun ke atas (usia di bawah 2 tahun / MPASI belum didukung).',
          })
          .max(120, { message: 'Usia maksimal 120 tahun' }),
        jenis_kelamin: z.enum(['L', 'P'], {
          message: 'Pilih jenis kelamin Laki-laki atau Perempuan',
        }),
        status: z.string().default('umum'),
        alergen: z.array(z.string()).default([]),
      })
    )
    .min(1, { message: 'Minimal harus ada 1 anggota keluarga yang didaftarkan' }),
});

export type ProfilKeluargaFormData = z.infer<typeof profilKeluargaFormSchema>;

// Skema Validasi Set Password Baru (Popup Keamanan & Pengaturan)
export const setPasswordSchema = z
  .object({
    newPassword: z
      .string({ message: 'Kata sandi baru wajib diisi' })
      .min(6, { message: 'Kata sandi baru minimal 6 karakter demi keamanan akun.' })
      .max(100, { message: 'Kata sandi maksimal 100 karakter.' }),
    confirmPassword: z.string().optional(),
    phone: z.string().optional(),
    familyId: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.confirmPassword && data.newPassword !== data.confirmPassword) {
        return false;
      }
      return true;
    },
    {
      message: 'Ulangi kata sandi baru tidak cocok dengan kata sandi baru.',
      path: ['confirmPassword'],
    }
  );

export type SetPasswordFormData = z.infer<typeof setPasswordSchema>;


