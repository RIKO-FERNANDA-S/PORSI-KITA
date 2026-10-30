'use client';

import { Anggota, Keluarga, RencanaMenu7Hari } from './types';
import { generateMenu } from './planner/generate';

const STORAGE_KEY_KELUARGA = 'porsi_kita_keluarga';
const STORAGE_KEY_ANGGOTA = 'porsi_kita_anggota';
const STORAGE_KEY_MENU = 'porsi_kita_menu_aktif';
const STORAGE_KEY_ONBOARDED = 'porsi_kita_onboarded';
const STORAGE_KEY_PANTANGAN = 'porsi_kita_pantangan_keluarga';

// Profil default Bu Sari untuk demonstrasi langsung (PRD 4.0)
export const DEFAULT_KELUARGA: Keluarga = {
  id: 'kel-bu-sari-01',
  alias: 'Keluarga Bu Sari',
  wilayah: 'Surabaya, Jawa Timur',
  budget_harian_rp: 85000,
};

export const DEFAULT_ANGGOTA: Anggota[] = [
  {
    id: 'ang-1',
    alias: 'Bu Sari (Ibu)',
    usia_tahun: 32,
    jenis_kelamin: 'P',
    status: 'umum',
    alergen: [],
  },
  {
    id: 'ang-2',
    alias: 'Pak Joko (Ayah)',
    usia_tahun: 35,
    jenis_kelamin: 'L',
    status: 'umum',
    alergen: [],
  },
  {
    id: 'ang-3',
    alias: 'Rian (Anak SD)',
    usia_tahun: 8,
    jenis_kelamin: 'L',
    status: 'umum',
    alergen: [],
  },
  {
    id: 'ang-4',
    alias: 'Ayu (Balita 3 th)',
    usia_tahun: 3,
    jenis_kelamin: 'P',
    status: 'umum',
    alergen: [],
  },
];

export function getStoredOnboarded(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY_ONBOARDED) === 'true';
}

export function setStoredOnboarded(val: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_ONBOARDED, val ? 'true' : 'false');
}

export function getStoredKeluarga(): Keluarga {
  if (typeof window === 'undefined') return DEFAULT_KELUARGA;
  const raw = localStorage.getItem(STORAGE_KEY_KELUARGA);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY_KELUARGA, JSON.stringify(DEFAULT_KELUARGA));
    return DEFAULT_KELUARGA;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return DEFAULT_KELUARGA;
  }
}

export function saveStoredKeluarga(k: Keluarga) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_KELUARGA, JSON.stringify(k));
}

export function getStoredAnggota(): Anggota[] {
  if (typeof window === 'undefined') return DEFAULT_ANGGOTA;
  const raw = localStorage.getItem(STORAGE_KEY_ANGGOTA);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY_ANGGOTA, JSON.stringify(DEFAULT_ANGGOTA));
    return DEFAULT_ANGGOTA;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return DEFAULT_ANGGOTA;
  }
}

export function saveStoredAnggota(list: Anggota[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_ANGGOTA, JSON.stringify(list));
}

export function getStoredMenu(): RencanaMenu7Hari {
  if (typeof window === 'undefined') {
    return generateMenu({
      familyId: DEFAULT_KELUARGA.id,
      familyName: DEFAULT_KELUARGA.alias,
      budgetHarianRp: DEFAULT_KELUARGA.budget_harian_rp,
      anggota: DEFAULT_ANGGOTA,
    });
  }

  const raw = localStorage.getItem(STORAGE_KEY_MENU);
  if (!raw) {
    const fresh = generateMenu({
      familyId: DEFAULT_KELUARGA.id,
      familyName: DEFAULT_KELUARGA.alias,
      budgetHarianRp: DEFAULT_KELUARGA.budget_harian_rp,
      anggota: DEFAULT_ANGGOTA,
    });
    localStorage.setItem(STORAGE_KEY_MENU, JSON.stringify(fresh));
    return fresh;
  }

  try {
    return JSON.parse(raw);
  } catch {
    const fresh = generateMenu({
      familyId: DEFAULT_KELUARGA.id,
      familyName: DEFAULT_KELUARGA.alias,
      budgetHarianRp: DEFAULT_KELUARGA.budget_harian_rp,
      anggota: DEFAULT_ANGGOTA,
    });
    return fresh;
  }
}

export function saveStoredMenu(menu: RencanaMenu7Hari) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_MENU, JSON.stringify(menu));
}

export function getStoredPantangan(): string[] {
  if (typeof window === 'undefined') return ['Udang / Kepiting (Krustasea)', 'Kacang-kacangan'];
  const raw = localStorage.getItem(STORAGE_KEY_PANTANGAN);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // fallback
    }
  }

  // Jika belum ada di localStorage, ambil dari data anggota atau default
  const a = getStoredAnggota();
  const setAl = new Set<string>();
  a.forEach((m) => {
    if (m.alergen && m.alergen.length > 0) {
      m.alergen.forEach((al) => setAl.add(al));
    }
  });

  const initial = setAl.size > 0
    ? Array.from(setAl)
    : ['Udang / Kepiting (Krustasea)', 'Kacang-kacangan'];

  try {
    localStorage.setItem(STORAGE_KEY_PANTANGAN, JSON.stringify(initial));
  } catch {}
  return initial;
}

export function saveStoredPantangan(list: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_PANTANGAN, JSON.stringify(list));
  } catch {}
}

export function resetDemoState() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY_KELUARGA);
  localStorage.removeItem(STORAGE_KEY_ANGGOTA);
  localStorage.removeItem(STORAGE_KEY_MENU);
  localStorage.removeItem(STORAGE_KEY_ONBOARDED);
  localStorage.removeItem(STORAGE_KEY_PANTANGAN);
}
