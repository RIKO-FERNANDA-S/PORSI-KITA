import { describe, it, expect } from 'vitest';
import { profilKeluargaFormSchema } from '../lib/schemas';

describe('Form Onboarding Profil Keluarga & Anggota (Zod Validation)', () => {
  const validData = {
    namaKeluarga: 'Keluarga Samantha',
    budgetHarian: 75000,
    wilayah: 'Pasar Tradisional • Jakarta Selatan',
    anggota: [
      {
        id: 'ang-1',
        alias: 'Ibu Samantha',
        usia_tahun: 30,
        jenis_kelamin: 'P' as const,
        status: 'umum',
        alergen: [],
      },
      {
        id: 'ang-2',
        alias: 'Rian',
        usia_tahun: 5,
        jenis_kelamin: 'L' as const,
        status: 'umum',
        alergen: ['kacang'],
      },
    ],
  };

  it('passes validation with correct and complete form data', () => {
    const result = profilKeluargaFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects empty or too short family name (< 2 characters)', () => {
    const invalid = { ...validData, namaKeluarga: 'A' };
    const result = profilKeluargaFormSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('minimal 2 karakter');
    }
  });

  it('rejects daily budget below Rp 10.000 or above Rp 1.000.000', () => {
    const tooLow = { ...validData, budgetHarian: 5000 };
    const resLow = profilKeluargaFormSchema.safeParse(tooLow);
    expect(resLow.success).toBe(false);
    if (!resLow.success) {
      expect(resLow.error.issues[0].message).toContain('minimal Rp 10.000');
    }

    const tooHigh = { ...validData, budgetHarian: 2000000 };
    const resHigh = profilKeluargaFormSchema.safeParse(tooHigh);
    expect(resHigh.success).toBe(false);
    if (!resHigh.success) {
      expect(resHigh.error.issues[0].message).toContain('maksimal Rp 1.000.000');
    }
  });

  it('enforces product limitation for children under 2 years old (MPASI)', () => {
    const withBaby = {
      ...validData,
      anggota: [
        {
          id: 'ang-baby',
          alias: 'Bayi Adik',
          usia_tahun: 1, // < 2 tahun belum didukung
          jenis_kelamin: 'L' as const,
          status: 'umum',
          alergen: [],
        },
      ],
    };

    const result = profilKeluargaFormSchema.safeParse(withBaby);
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues.map((i) => i.message).join(' ');
      expect(msg).toContain('2 tahun ke atas');
    }
  });

  it('rejects member without alias or with alias shorter than 2 characters', () => {
    const withEmptyAlias = {
      ...validData,
      anggota: [
        {
          id: 'ang-1',
          alias: ' ',
          usia_tahun: 25,
          jenis_kelamin: 'P' as const,
          status: 'umum',
          alergen: [],
        },
      ],
    };

    const result = profilKeluargaFormSchema.safeParse(withEmptyAlias);
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues.map((i) => i.message).join(' ');
      expect(msg).toContain('minimal 2 karakter');
    }
  });
});
