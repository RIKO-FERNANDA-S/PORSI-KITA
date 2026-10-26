import Link from 'next/link';

export default function TentangPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-12">
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
          <span>📚</span> Metodologi & Transparansi Sains
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">
          Metodologi, Sumber Data, & Batasan Produk
        </h1>
        <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
          Porsi Kita menolak pendekatan “kotak hitam” (black-box). Seluruh angka gizi, perhitungan porsi,
          dan takaran resep dapat ditelusuri langsung ke publikasi resmi Kementerian Kesehatan RI dan regulasi nasional.
        </p>
      </div>

      {/* Sumber Data Primer */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-6">
        <h2 className="text-xl font-black text-stone-900 tracking-tight">
          1. Sumber Data Primer (Ground Truth)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 space-y-2">
            <span className="font-extrabold text-sm text-stone-900 block">TKPI 2017</span>
            <span className="text-emerald-700 font-bold block">Kementerian Kesehatan RI</span>
            <p className="text-stone-600 leading-relaxed">
              Tabel Komposisi Pangan Indonesia (TKPI) 2017 dengan nomor halaman buku dan kode bahan asli
              (mis. AR001 untuk Beras Giling, CD001 untuk Daging Ayam, CD005 untuk Hati Ayam).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 space-y-2">
            <span className="font-extrabold text-sm text-stone-900 block">AKG 2019</span>
            <span className="text-emerald-700 font-bold block">Permenkes No. 28 Tahun 2019</span>
            <p className="text-stone-600 leading-relaxed">
              Standar Angka Kecukupan Gizi yang Dianjurkan untuk Masyarakat Indonesia, mencakup balita,
              anak sekolah, remaja, pria/wanita dewasa, lansia, serta tambahan kalori dan mikronutrien bagi ibu hamil dan menyusui.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 space-y-2">
            <span className="font-extrabold text-sm text-stone-900 block">Snapshot Harga Pangan</span>
            <span className="text-emerald-700 font-bold block">Bapanas & PIHPS Bank Indonesia</span>
            <p className="text-stone-600 leading-relaxed">
              Data harga pasar komoditas pangan pokok per 19 Oktober 2026 (Surabaya & Jawa Timur). Disertai
              label estimasi untuk bahan pelengkap pasar tradisional.
            </p>
          </div>
        </div>
      </section>

      {/* 4 Lapis Validasi Data */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-4">
        <h2 className="text-xl font-black text-stone-900 tracking-tight">
          2. Gerbang Mutu Data (4 Lapis Validasi)
        </h2>
        <p className="text-xs text-stone-600 leading-relaxed">
          Dataset sebelum masuk ke mesin kalkulator gizi melalui empat tahapan gerbang mutu tanpa kompromi:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 space-y-1">
            <strong className="text-stone-900 block font-bold">Lapis 1: Validasi Format & Struktur</strong>
            <p className="text-stone-600">
              Pemeriksaan header, tipe data numerik murni, dan tidak adanya karakter korup pada dataset CSV.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 space-y-1">
            <strong className="text-stone-900 block font-bold">Lapis 2: Integritas Referensi Antar File</strong>
            <p className="text-stone-600">
              Setiap kode bahan dalam resep harus cocok persis dengan tabel bahan pangan dan tabel harga.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 space-y-1">
            <strong className="text-stone-900 block font-bold">Lapis 3: Kewajaran Gizi (Atwater Factor)</strong>
            <p className="text-stone-600">
              Validasi fisikokimia menggunakan persamaan Atwater (4 × Protein + 4 × Karbohidrat + 9 × Lemak)
              dengan batas toleransi kewajaran 15%.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100 space-y-1">
            <strong className="text-stone-900 block font-bold">Lapis 4: Uji Keamanan Khusus (Retinol & Alergen)</strong>
            <p className="text-stone-600">
              Pemeriksaan batas atas retinol (NIH-ODS) untuk hati ayam dan pewarisan otomatis alergen dari bahan mentah.
            </p>
          </div>
        </div>
      </section>

      {/* Batasan Data Terbuka (PRD Bagian 10) */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-4">
        <h2 className="text-xl font-black text-stone-900 tracking-tight">
          3. Batasan Data yang Diakui Terbuka
        </h2>
        <div className="space-y-2.5 text-xs text-stone-600 leading-relaxed">
          <div className="p-3 bg-stone-50 rounded-xl">
            • <strong>Ikan Lele:</strong> Karena ikan lele segar belum memiliki entri terpisah dalam buku TKPI 2017,
            Porsi Kita menyubstitusikan profil gizinya menggunakan ikan air tawar setara (Ikan Mas GR046).
          </div>
          <div className="p-3 bg-stone-50 rounded-xl">
            • <strong>Nilai Kosong TKPI:</strong> Sel TKPI yang tidak dianalisis pada buku asli tidak dipaksakan
            bernilai 0 secara keliru, melainkan tetap dipertahankan null dalam pemrosesan matriks gizi.
          </div>
          <div className="p-3 bg-stone-50 rounded-xl">
            • <strong>Harga adalah Snapshot:</strong> Angka rupiah merupakan snapshot survei harga pada 19 Oktober 2026,
            bukan feed API real-time bursa.
          </div>
          <div className="p-3 bg-stone-50 rounded-xl">
            • <strong>Resep Rumahan:</strong> Takaran gram bumbu dan minyak goreng dicantumkan secara eksplisit
            agar perhitungan kalori tumisan dan gorengan tetap akurat dan tidak meleset.
          </div>
        </div>
      </section>

      {/* Kotak Disclaimer Resmi (Wajib) */}
      <section className="p-6 rounded-3xl bg-amber-50/90 border border-amber-200 text-xs text-amber-950 space-y-3 leading-relaxed">
        <div className="flex items-center gap-2 font-bold text-amber-900 uppercase tracking-wider text-sm">
          <span>⚠️</span> Disclaimer Resmi & Batasan Produk
        </div>
        <p className="font-medium text-stone-800">
          “Porsi Kita adalah alat bantu perencanaan menu, bukan pengganti saran dokter atau ahli gizi.
          Untuk kondisi kesehatan khusus, alergi berat, atau anak di bawah 2 tahun, konsultasikan dengan
          tenaga kesehatan. Estimasi harga berasal dari snapshot dan dapat berbeda di pasar Anda.”
        </p>
        <p className="text-stone-600">
          “Kebutuhan gizi (AKG) dihitung berdasarkan standar berat badan nasional untuk usia tersebut,
          bukan berat badan aktual pengguna.”
        </p>
      </section>

      <div className="text-center pt-4">
        <Link
          href="/mulai"
          className="inline-flex items-center justify-center px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl shadow-xs transition"
        >
          Coba Rencanakan Menu Sekarang →
        </Link>
      </div>
    </div>
  );
}
