-- Migration: 002_prisma_schema.sql
-- Aligned with prisma/schema.prisma

-- 1. Enable uuid generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create families table
CREATE TABLE IF NOT EXISTS public.families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  alias VARCHAR(100) NOT NULL,
  wilayah VARCHAR(100) NOT NULL,
  budget_harian_rp DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- 3. Create members table
CREATE TABLE IF NOT EXISTS public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  alias VARCHAR(100) NOT NULL,
  usia_tahun INT NOT NULL,
  jenis_kelamin VARCHAR(20) NOT NULL,
  status_khusus VARCHAR(100),
  alergen TEXT[] DEFAULT '{}'::TEXT[]
);

-- 4. Create bahan table (TKPI reference)
CREATE TABLE IF NOT EXISTS public.bahan (
  kode_tkpi VARCHAR(50) PRIMARY KEY,
  nama_bahan VARCHAR(150) NOT NULL,
  kategori VARCHAR(100) NOT NULL,
  energi_kcal DOUBLE PRECISION NOT NULL,
  bdd_percent DOUBLE PRECISION NOT NULL
);

-- 5. Create warungs table
CREATE TABLE IF NOT EXISTS public.warungs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  nama_warung VARCHAR(150) NOT NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- 6. Create harga_warung table
CREATE TABLE IF NOT EXISTS public.harga_warung (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warung_id UUID NOT NULL REFERENCES public.warungs(id) ON DELETE CASCADE,
  kode_tkpi VARCHAR(50) NOT NULL REFERENCES public.bahan(kode_tkpi) ON DELETE RESTRICT,
  harga_per_100g_rp DECIMAL(10, 2) NOT NULL,
  tanggal_update DATE NOT NULL DEFAULT CURRENT_DATE
);

-- 7. Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  warung_id UUID REFERENCES public.warungs(id) ON DELETE SET NULL,
  jenis VARCHAR(20) NOT NULL, -- 'PEMASUKAN' atau 'PENGELUARAN'
  nominal DECIMAL(12, 2) NOT NULL,
  catatan TEXT,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- 8. Create meal_plans table
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  hasil_json JSONB NOT NULL,
  total_biaya DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- 9. Create resep table
CREATE TABLE IF NOT EXISTS public.resep (
  kode_resep VARCHAR(50) PRIMARY KEY,
  nama_resep VARCHAR(150) NOT NULL,
  kategori VARCHAR(100) NOT NULL,
  porsi VARCHAR(50) NOT NULL
);

-- 10. Create resep_bahan table
CREATE TABLE IF NOT EXISTS public.resep_bahan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_resep VARCHAR(50) NOT NULL REFERENCES public.resep(kode_resep) ON DELETE CASCADE,
  kode_tkpi VARCHAR(50) NOT NULL REFERENCES public.bahan(kode_tkpi) ON DELETE RESTRICT,
  jumlah_gram DOUBLE PRECISION NOT NULL
);

-- 11. Create akg table
CREATE TABLE IF NOT EXISTS public.akg (
  kode_kelompok VARCHAR(50) PRIMARY KEY,
  kelompok_usia VARCHAR(50) NOT NULL,
  jenis_kelamin VARCHAR(20) NOT NULL,
  energi_kcal DOUBLE PRECISION NOT NULL
);

-- Enable RLS
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warungs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.harga_warung ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
