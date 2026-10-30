# 🍽️ Porsi Kita (PorsiKita)

<div align="center">

![Porsi Kita Banner](public/logo.png)

### **“Satu Menu Keluarga, Gizi Tepat untuk Setiap Anggota”**
*Inovasi Meal Planner Cerdas Berbasis Anggaran (Budget-First) dan Presisi AKG Kemenkes untuk Pencegahan Stunting Berkelanjutan.*

[![Next.js](https://img.shields.io/badge/Next.js_16-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript_Strict-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white)](https://www.framer.com/motion/)
[![Supabase](https://img.shields.io/badge/Supabase_PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma_ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Gemini AI](https://img.shields.io/badge/Gemini_2.5_Flash-8E75B2?style=for-the-badge&logo=google-gemini&logoColor=white)](https://ai.google.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-93%20Passed%20(100%25)-green?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Deployment](https://img.shields.io/badge/Vercel_Deployed-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://porsi-kita.vercel.app)

---

### 🌐 SDGs Target Alignment
[![SDG 2](https://img.shields.io/badge/SDGs_2-Zero_Hunger_(Tanpa_Kelaparan)-DDA63A?style=flat-square&logo=unitednations&logoColor=white)](https://sdgs.un.org/goals/goal2)
[![SDG 3](https://img.shields.io/badge/SDGs_3-Good_Health_&_Well--being-4C9F38?style=flat-square&logo=unitednations&logoColor=white)](https://sdgs.un.org/goals/goal3)
[![Subtema](https://img.shields.io/badge/Subtema-Teknologi_Digital_Berkelanjutan_&_Health--Tech-0C4B20?style=flat-square)](https://uinic.uin-alauddin.ac.id/)

</div>

---

## 📌 Daftar Isi
1. [Latar Belakang & Urgensi Masalah](#-1-latar-belakang--urgensi-masalah)
2. [Fitur Unggulan Sistem](#-2-fitur-unggulan-sistem)
3. [Live Demo & Tautan Akses](#-3-live-demo--tautan-akses)
4. [Tech Stack & Arsitektur Sistem](#-4-tech-stack--arsitektur-sistem)
5. [Panduan Instalasi & Menjalankan Lokal](#-5-panduan-instalasi--menjalankan-lokal)
6. [Keamanan, Privasi, & Validasi Sistem](#-6-keamanan-privasi--validasi-sistem)
7. [Hasil Pengujian & Verifikasi Kualitas](#-7-hasil-pengujian--verifikasi-kualitas)
8. [Profil Tim Pengembang ("nah ini, apa ya?")](#-8-profil-tim-pengembang-nah-ini-apa-ya)

---

## 🌍 1. Latar Belakang & Urgensi Masalah

### Akar Masalah: Dilema Ibu Rumah Tangga & Ancaman Stunting
Di Indonesia, percepatan penurunan prevalensi stunting nasional menghadapi hambatan nyata di tingkat domestik: **kesenjangan tajam antara anjuran gizi ideal dengan daya beli ekonomi keluarga**. 

Banyak panduan gizi dan aplikasi *meal planner* modern mengasumsikan belanja supermarket dengan bahan pangan mahal, serta menuntut ibu memasak menu yang berbeda-beda untuk tiap anggota keluarga. Realitasnya:
1. **Daya Beli Terbatas & Ketakutan Melebihi Anggaran:** Ibu rumah tangga berbelanja harian di pasar tradisional atau tukang sayur dengan alokasi ketat (misal Rp 20.000 – Rp 45.000/hari). Ketika dihadapkan pada menu sehat yang rumit, ibu kembali ke opsi karbohidrat berlebih (nasi porsi besar dengan kerupuk/mie) karena dianggap paling mengenyangkan dan murah.
2. **Kelelahan Fisik (Burnout Memasak):** Memasak menu khusus untuk balita, menu terpisah untuk ayah pekerja keras, dan menu rendah garam untuk lansia tidak realistis dilakukan setiap hari oleh ibu rumah tangga.
3. **Ketidaktahuan Faktor Susut Bahan (BDD):** Membeli 100 gram kangkung bukan berarti menyajikan 100 gram nutrisi, karena Berat Dapat Dimakan (BDD) kangkung hanya sekitar 70%. Kesalahan kalkulasi ini menyebabkan defisit asupan protein mikro pada anak tanpa disadari.

> **💡 Solusi Inovatif Porsi Kita:**
> **Porsi Kita** membalik paradigma konvensional dengan filosofi **"Budget-First & Masak Sekali"**. Ibu cukup memasak **SATU MENU KELUARGA**, lalu sistem menghitungkan takaran piring saji secara presisi untuk setiap anggota keluarga berdasarkan standar resmi **Kementerian Kesehatan RI (TKPI 2017 & Permenkes No. 28/2019)** tanpa melebihi pagu anggaran harian.

---

## ✨ 2. Fitur Unggulan Sistem

### 💰 1. Budget-First Intelligent Planner (Rencana Sesuai Kantong)
* Sistem tidak pernah menyarankan resep sebelum mengetahui batas kemampuan finansial pengguna.
* Algoritma generator mengunci kombinasi menu sarapan, makan siang, dan makan malam dalam batas plafon harian ibu berdasarkan data harga bahan riil pasar (PIHPS Bank Indonesia & Badan Pangan Nasional).

### 🥗 2. Satu Menu Keluarga, Presisi Gizi Tiap Piring
* Ibu tidak perlu memasak 3 kali dengan masakan berbeda. Dari satu panci Sup Bayam Ayam & Tempe, sistem membagi porsi saji:
  * **Anak Balita (3 th):** Porsi protein hewani diprioritaskan, kalori terukur, tekstur ramah kunyah.
  * **Ayah Pekerja Dewasa:** Kalori dan karbohidrat padat energi sesuai Angka Kecukupan Gizi (AKG).
  * **Ibu Hamil / Menyusui:** Otomatis mendapatkan surplus zat besi (+9 mg), kalsium (+200 mg), dan kalori (+300 kkal).
  * **Lansia:** Pengawasan natrium dan kecukupan kalsium tulang.

### 📐 3. Mesin Gizi Deterministik Berbasis BDD (Berat Dapat Dimakan)
* Mengintegrasikan 100% data ilmiah dari **Tabel Komposisi Pangan Indonesia (TKPI 2017)**.
* **Perhitungan Belanja Presisi:** Memperhitungkan persentase limbah dapur (kulit, tulang, tangkai). Rumus matematis:
  $$\text{Gram Belanja} = \frac{\text{Gram Bersih}}{\text{BDD} / 100}$$
  Sehingga saat bahan selesai dibersihkan di dapur, takaran nutrisi yang tersaji di piring anak tetap akurat 100%.

### 🧊 4. Smart Fridge Inventory & Auto-Deductions (Cek Kulkas Dapur)
* Menghindari *food waste* dan belanja ganda. Jika ibu sudah memiliki bawang merah, minyak goreng, atau telur di dapur, sistem secara otomatis mengurangkan bahan tersebut dari total biaya dan daftar belanja harian.

### 🛒 5. Lapak Belanja Pasar & Integrasi WhatsApp
* Mengelompokkan item belanjaan berdasarkan tata letak lapak pedagang pasar tradisional:
  * 🥬 Sayuran & Bumbu Dapur
  * 🍗 Daging & Unggas
  * 🐟 Ikan & Hasil Laut
  * 🧈 Tahu, Tempe, & Telur
  * 🌾 Sembako & Bahan Kering
* **Fitur 1-Click WhatsApp Share:** Otomatis menghasilkan format teks rapi dengan encoding karakter yang sempurna untuk dikirimkan ke suami atau pedagang langganan.

### 👛 6. Dompet Bulanan & Pelacak Belanja Real-Time
* Mengelola pagu belanja bulanan rumah tangga, mencatat warung/pasar langganan, pelacakan riwayat transaksi keluar, dan sinkronisasi otomatis saat belanja selesai dilakukan.

### 🤖 7. Asisten Resep Cerdas (Google Gemini 2.5 Flash)
* Memberikan variasi resep nusantara kreatif yang ramah anak dan berbiaya hemat, dengan pagar pengaman (*guardrails*) deterministik gizi murni agar AI tidak melakukan halusinasi data medis.

---

## 🔗 3. Live Demo & Tautan Akses

| Komponen | Tautan Langsung | Keterangan |
| :--- | :--- | :--- |
| **🚀 Production Live Demo** | [https://porsi-kita.vercel.app](https://porsi-kita.vercel.app) | Hosting Vercel Edge Network |
| **📦 GitHub Repository** | [https://github.com/RIKO-FERNANDA-S/PORSI-KITA](https://github.com/RIKO-FERNANDA-S/PORSI-KITA) | Public Source Code |
| **⚡ Mode Akses Instan** | Tersedia Mode Demo Tamu | Dapat langsung diuji tanpa setup registrasi rumit |

---

## 🏗️ 4. Tech Stack & Arsitektur Sistem

Porsi Kita dibangun dengan standar rekayasa perangkat lunak modern yang mengutamakan **modularitas, keandalan fungsional, dan performa tinggi**.

```mermaid
flowchart TD
    subgraph Presentation_Layer ["Client & UI Presentation (Next.js 16 + React 19)"]
        A[Mobile-First UI\nTailwind CSS v4] --> B[Micro-Interactions\nFramer Motion]
        B --> C[Client Forms & Validation\nZod Schemas]
    end

    subgraph Core_Engine ["Deterministic Nutrition & Budget Engine"]
        D[AKG Calculator\nPermenkes 28/2019]
        E[Portion Divider\nPer-Anggota Piring]
        F[BDD & Cost Engine\nTKPI 2017 & Bapanas]
        G[Safety & Allergen Rules\nHati Ayam Balita Guard]
    end

    subgraph AI_Layer ["AI Auxiliary Service"]
        H[Google Gemini 2.5 Flash\nCreative Recipe Generator]
    end

    subgraph Data_Layer ["Persistence & Cloud Infrastructure"]
        I[(PostgreSQL Database\nSupabase)]
        J[Prisma ORM Client\nType-Safe Query]
        K[Row Level Security\nRLS Data Isolation]
    end

    Presentation_Layer -->|Server Actions / API| Core_Engine
    Presentation_Layer -.->|Prompt Guardrail| AI_Layer
    Core_Engine -->|Sanitized Nutrients| J
    J --> I
    K --- I
```

### Rincian Teknologi yang Digunakan

| Kategori | Teknologi | Alasan Pemilihan & Keunggulan |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16 (App Router)** | Server Components, performa SSR super cepat, rendering hybrid, dan SEO optimal. |
| **Core UI** | **React 19 & TypeScript Strict** | Kestabilan kode tingkat enterprise tanpa `any`, ref handling modern, dan compiler performan. |
| **Styling** | **Tailwind CSS v4** | *Zero-runtime*, styling mobile-first teroptimasi dengan standar area sentuh ramah jempol ($\ge 44\text{px}$). |
| **Animation** | **Framer Motion** | Transisi halaman dan umpan balik mikro interaktif yang halus dan nyaman digunakan. |
| **Mesin Gizi** | **Pure TypeScript Engine** | Logika deterministik 100% murni tanpa ketergantungan model generatif untuk menghindari salah hitung gizi. |
| **AI Generator** | **Google Gemini 2.5 Flash** | Rekomendasi variasi masakan nusantara dengan latensi ultra rendah dan token hemat. |
| **Database & Auth** | **Supabase (PostgreSQL)** | Handal, mendukung Row Level Security (RLS) untuk keamanan data tingkat baris database. |
| **ORM** | **Prisma ORM** | Skema basis data terdefinisi kuat, migrasi terotomatisasi, dan query *type-safe*. |
| **Pengujian** | **Vitest** | Eksekusi unit test instan dan kompatibel penuh dengan lingkungan ESM modern. |

---

## 💻 5. Panduan Instalasi & Menjalankan Lokal

Ikuti langkah-langkah terstruktur di bawah ini untuk menjalankan repositori Porsi Kita pada lingkungan pengembang lokal:

### 1. Prasyarat Sistem
* **Node.js:** Versi `18.18.0` atau `>= 20.0.0`
* **Package Manager:** `npm` (disarankan) atau `pnpm`
* **Git:** Versi terbaru

### 2. Kloning Repositori
```bash
git clone https://github.com/RIKO-FERNANDA-S/PORSI-KITA.git
cd PORSI-KITA
```

### 3. Instalasi Dependensi
```bash
npm install
```

### 4. Konfigurasi Environment Variables
Salin file konfigurasi contoh `.env.example` ke `.env.local`:
```bash
cp .env.example .env.local
```
Sesuaikan nilai variabel lingkungan di dalam file `.env.local`:
```env
# URL dan Kunci Publik Supabase
NEXT_PUBLIC_SUPABASE_URL="https://hraspfuwergplhxfwtpd.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."

# Kunci Layanan Supabase & Database URL (Opsional untuk migrasi backend)
SUPABASE_SERVICE_ROLE_KEY="eyJh..."
DATABASE_URL="postgresql://postgres:password@localhost:5432/porsikita"

# API Key Google Gemini (Fitur Eksplorasi Resep)
GEMINI_API_KEY="AIzaSy..."
```

### 5. Generate Prisma Client
```bash
npx prisma generate
```

### 6. Menjalankan Server Pengembangan Lokal
```bash
npm run dev
```
Buka peramban web dan akses: **[http://localhost:3000](http://localhost:3000)**.

### 7. Melakukan Build Produksi
```bash
npm run build
npm run start
```

---

## 🛡️ 6. Keamanan, Privasi, & Validasi Sistem

Aplikasi Porsi Kita dirancang dengan prinsip pertahanan berlapis (*Defense-in-Depth*) guna melindungi integritas data pengguna:

1. **Prinsip Non-PII Safeguard (Perlindungan Data Anak):**
   * Aplikasi **tidak pernah meminta atau menyimpan data pribadi sensitif (Personally Identifiable Information)** anak seperti nama lengkap, NIK, tanggal lahir persis, maupun foto anak.
   * Identifikasi anggota keluarga hanya menggunakan nama panggilan (*alias*) dan usia dalam satuan tahun bulat.
2. **Validasi Input Runtime Berlapis (Zod Engine):**
   * Seluruh formulir input di-validasi pada level klien dan server menggunakan skema Zod.
   * **Sanitasi Angka:** Menolak *leading-zero* otomatis pada input numerik usia (mencegah kesalahan input seperti `017` tahun).
   * **Formatting Rupiah Otomatis:** Input nominal harga bahan diformat dengan pemisah ribuan titik (`15.000`), namun dikonversi ke nilai integer murni saat dikirim ke basis data.
3. **Penyebaran Otomatis Paste Kode OTP:**
   * Mendukung penempelan (*paste/Ctrl+V*) kode OTP 6-digit secara cerdas: sistem memfilter karakter non-angka dan mendistribusikan masing-masing angka ke kotak input secara terurut otomatis.
4. **Row Level Security (RLS) PostgreSQL:**
   * Data rencana menu, anggaran, profil keluarga, dan transaksi keuangan diisolasi pada level baris basis data; satu pengguna tidak dapat membaca atau memodifikasi data keluarga pengguna lainnya.
5. **Guardrail Keamanan Konsumsi Pangan:**
   * Mesin gizi memprogram aturan ketat (*hard rules*): melarang penjadwalan menu berbasis hati ayam pada keluarga yang memiliki balita (anak $< 5$ tahun) guna mencegah risiko keracunan toksisitas Vitamin A (retinol berlebih).

---

## 🧪 7. Hasil Pengujian & Verifikasi Kualitas

Kualitas kode dan keandalan matematis Porsi Kita diverifikasi secara ketat melalui pengujian otomatis (*Automated Testing Suite*):

```text
✓ tests/nutrition.test.ts (17 tests)
✓ tests/planner.test.ts (6 tests)
✓ tests/data_validation.test.ts (4 tests)
✓ tests/unit/dompet.test.ts (14 tests)
✓ tests/unit/registration.test.ts (18 tests)
✓ tests/unit/smart_fridge.test.ts (12 tests)
✓ tests/unit/whatsapp_share.test.ts (8 tests)
✓ tests/unit/recipe_cost.test.ts (14 tests)

Test Files  11 passed (11)
Tests       93 passed (93)
Status      100% Passing
```

### Menjalankan Pengujian Mandiri
* **Menjalankan Seluruh Unit Test (93 Kasus Uji):**
  ```bash
  npm test
  ```
* **Menjalankan Validasi Kualitas Dataset (4 Lapis Validasi TKPI & AKG):**
  ```bash
  npm run validate:data
  ```

---

## 👥 8. Profil Tim Pengembang ("nah ini, apa ya?")

Dokumentasi dan proyek aplikasi ini dikembangkan secara kolaboratif oleh tim **"nah ini, apa ya?"** untuk **UIN Alauddin Informatics Contest (UINIC 8.0)**:

<div align="center">

| Nama Lengkap | NIM | Peran / Tanggung Jawab Utama | Kontak |
| :--- | :---: | :--- | :---: |
| **Riko Fernanda Saputra** | `25081010301` | **Ketua Tim** & Full Stack System Architect (Next.js Core, Database Engine, Deployment) | [GitHub](https://github.com/RIKO-FERNANDA-S) |
| **Devina Anindya Fitri** | `25084010051` | **Anggota Tim** & UI/UX Specialist (Design System, Usability Flow, Micro-Interactions) | [Email](mailto:devina.yowana@gmail.com) |
| **Galuh Subhana** | `25084010013` | **Anggota Tim** & Nutrition Data Analyst & Quality Assurance (TKPI Data Verification & Testing) | [Email](mailto:galuh.yowana@gmail.com) |

</div>

<br/>

> *"Teknologi terbaik bukan teknologi yang paling rumit, melainkan teknologi yang mampu hadir di dapur rumah tangga sederhana dan memastikan anak-anak Indonesia tumbuh sehat, cerdas, dan bebas stunting."*  
> **— Tim "nah ini, apa ya?"**

---

<div align="center">
  <small>© 2026 Porsi Kita by "nah ini, apa ya?". Dikembangkan dengan dedikasi untuk masa depan generasi emas Indonesia.</small>
</div>
