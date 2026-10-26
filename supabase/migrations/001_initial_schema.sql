-- ================================================================
-- Porsi Kita: Database Schema & Row Level Security (RLS)
-- Sesuai Product Requirements Document (PRD) v1.0 Bagian 11 & 12
-- ================================================================

-- Aktifkan ekstensi UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABEL FAMILIES (Profil Keluarga)
CREATE TABLE IF NOT EXISTS public.families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    alias VARCHAR(100) NOT NULL,
    wilayah VARCHAR(100) NOT NULL,
    budget_harian_rp NUMERIC(12, 2) NOT NULL CHECK (budget_harian_rp >= 10000 AND budget_harian_rp <= 1000000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index untuk performa kueri per user
CREATE INDEX IF NOT EXISTS idx_families_owner_id ON public.families(owner_id);

-- 2. TABEL MEMBERS (Anggota Keluarga - Data Minimal)
-- Catatan Keamanan (PRD 13): Tidak ada nama lengkap, tidak ada tanggal lahir, tidak ada foto/lokasi
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    alias VARCHAR(50) NOT NULL,
    usia_tahun INT NOT NULL CHECK (usia_tahun >= 2 AND usia_tahun <= 120),
    jenis_kelamin VARCHAR(2) NOT NULL CHECK (jenis_kelamin IN ('L', 'P')),
    status VARCHAR(30) NOT NULL DEFAULT 'umum' CHECK (status IN ('umum', 'hamil_t1', 'hamil_t2', 'hamil_t3', 'menyusui_6bln1', 'menyusui_6bln2')),
    alergen TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_members_family_id ON public.members(family_id);

-- 3. TABEL MEAL_PLANS (Rencana Menu 7 Hari)
CREATE TABLE IF NOT EXISTS public.meal_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    hasil JSONB NOT NULL,
    total_biaya NUMERIC(12, 2) NOT NULL,
    target_budget NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meal_plans_family_id ON public.meal_plans(family_id);

-- 4. TABEL INGREDIENTS (Bahan Pangan TKPI 2017)
CREATE TABLE IF NOT EXISTS public.ingredients (
    kode_tkpi VARCHAR(20) PRIMARY KEY,
    nama VARCHAR(150) NOT NULL,
    kategori VARCHAR(50) NOT NULL,
    kategori_menu VARCHAR(30) NOT NULL,
    kondisi VARCHAR(50) NOT NULL,
    energi_kcal NUMERIC(8, 2) NOT NULL,
    protein_g NUMERIC(8, 2) NOT NULL,
    lemak_g NUMERIC(8, 2) NOT NULL DEFAULT 0,
    karbohidrat_g NUMERIC(8, 2) NOT NULL DEFAULT 0,
    kalsium_mg NUMERIC(8, 2) NOT NULL DEFAULT 0,
    zat_besi_mg NUMERIC(8, 2) NOT NULL DEFAULT 0,
    seng_mg NUMERIC(8, 2) NOT NULL DEFAULT 0,
    vitamin_a_mcg NUMERIC(8, 2) NOT NULL DEFAULT 0,
    retinol_mcg NUMERIC(8, 2) DEFAULT 0,
    bdd_percent NUMERIC(5, 2) NOT NULL DEFAULT 100,
    alergen TEXT[] DEFAULT '{}',
    sumber_data VARCHAR(100) DEFAULT 'TKPI 2017'
);

-- 5. TABEL INGREDIENT_PRICES (Snapshot Harga Pangan)
CREATE TABLE IF NOT EXISTS public.ingredient_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode_tkpi VARCHAR(20) NOT NULL REFERENCES public.ingredients(kode_tkpi) ON DELETE CASCADE,
    nama_bahan VARCHAR(150) NOT NULL,
    harga_per_100g_rp NUMERIC(10, 2) NOT NULL,
    sumber_harga VARCHAR(150) NOT NULL,
    tanggal_update DATE NOT NULL DEFAULT CURRENT_DATE,
    catatan TEXT
);

-- 6. TABEL RECIPES & RECIPE_INGREDIENTS
CREATE TABLE IF NOT EXISTS public.recipes (
    kode VARCHAR(20) PRIMARY KEY,
    nama VARCHAR(150) NOT NULL,
    kategori VARCHAR(50) NOT NULL,
    porsi_standar VARCHAR(50) NOT NULL,
    keterangan TEXT,
    catatan_keamanan TEXT,
    target_usia_max_tahun INT
);

CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kode_resep VARCHAR(20) NOT NULL REFERENCES public.recipes(kode) ON DELETE CASCADE,
    kode_tkpi VARCHAR(20) NOT NULL REFERENCES public.ingredients(kode_tkpi),
    jumlah_gram NUMERIC(8, 2) NOT NULL
);

-- 7. TABEL AKG_REFERENCE (Standar Permenkes 28/2019)
CREATE TABLE IF NOT EXISTS public.akg_reference (
    kode_kelompok VARCHAR(30) PRIMARY KEY,
    kelompok_usia VARCHAR(100) NOT NULL,
    jenis_kelamin VARCHAR(2) NOT NULL,
    tipe VARCHAR(30) NOT NULL,
    umur_min_bulan INT,
    umur_max_bulan INT,
    energi_kcal NUMERIC(8, 2) NOT NULL,
    protein_g NUMERIC(8, 2) NOT NULL,
    vitamin_a_mcg_re NUMERIC(8, 2) NOT NULL,
    kalsium_mg NUMERIC(8, 2) NOT NULL,
    zat_besi_mg NUMERIC(8, 2) NOT NULL,
    seng_mg NUMERIC(8, 2) NOT NULL,
    catatan TEXT
);

-- ================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================

-- Aktifkan RLS pada seluruh tabel pengguna
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

-- Tabel publik (referensi): siapa pun yang login atau anonim bisa baca
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredient_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.akg_reference ENABLE ROW LEVEL SECURITY;

-- 1. Kebijakan Families: Hanya pemilik (owner_id = auth.uid()) yang bisa akses
CREATE POLICY "Families: Owner can select own family"
    ON public.families FOR SELECT
    USING (owner_id = auth.uid());

CREATE POLICY "Families: Owner can insert own family"
    ON public.families FOR INSERT
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Families: Owner can update own family"
    ON public.families FOR UPDATE
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Families: Owner can delete own family"
    ON public.families FOR DELETE
    USING (owner_id = auth.uid());

-- 2. Kebijakan Members: Akses diturunkan dari kepemilikan keluarga
CREATE POLICY "Members: Owner of family can select members"
    ON public.members FOR SELECT
    USING (family_id IN (SELECT id FROM public.families WHERE owner_id = auth.uid()));

CREATE POLICY "Members: Owner of family can insert members"
    ON public.members FOR INSERT
    WITH CHECK (family_id IN (SELECT id FROM public.families WHERE owner_id = auth.uid()));

CREATE POLICY "Members: Owner of family can update members"
    ON public.members FOR UPDATE
    USING (family_id IN (SELECT id FROM public.families WHERE owner_id = auth.uid()))
    WITH CHECK (family_id IN (SELECT id FROM public.families WHERE owner_id = auth.uid()));

CREATE POLICY "Members: Owner of family can delete members"
    ON public.members FOR DELETE
    USING (family_id IN (SELECT id FROM public.families WHERE owner_id = auth.uid()));

-- 3. Kebijakan Meal Plans: Akses diturunkan dari kepemilikan keluarga
CREATE POLICY "Meal Plans: Owner of family can select plans"
    ON public.meal_plans FOR SELECT
    USING (family_id IN (SELECT id FROM public.families WHERE owner_id = auth.uid()));

CREATE POLICY "Meal Plans: Owner of family can insert plans"
    ON public.meal_plans FOR INSERT
    WITH CHECK (family_id IN (SELECT id FROM public.families WHERE owner_id = auth.uid()));

CREATE POLICY "Meal Plans: Owner of family can delete plans"
    ON public.meal_plans FOR DELETE
    USING (family_id IN (SELECT id FROM public.families WHERE owner_id = auth.uid()));

-- 4. Kebijakan Baca Publik untuk Data Referensi
CREATE POLICY "Ingredients are readable by all"
    ON public.ingredients FOR SELECT
    TO authenticated, anon
    USING (true);

CREATE POLICY "Ingredient prices are readable by all"
    ON public.ingredient_prices FOR SELECT
    TO authenticated, anon
    USING (true);

CREATE POLICY "Recipes are readable by all"
    ON public.recipes FOR SELECT
    TO authenticated, anon
    USING (true);

CREATE POLICY "Recipe ingredients are readable by all"
    ON public.recipe_ingredients FOR SELECT
    TO authenticated, anon
    USING (true);

CREATE POLICY "AKG reference is readable by all"
    ON public.akg_reference FOR SELECT
    TO authenticated, anon
    USING (true);
