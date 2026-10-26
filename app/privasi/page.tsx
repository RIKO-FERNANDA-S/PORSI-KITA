import Link from 'next/link';

export default function PrivasiPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-12">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
          <span>🔒</span> Keamanan & Privasi Pengguna
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">
          Kebijakan Privasi & Perlindungan Data Anak
        </h1>
        <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
          Porsi Kita berkomitmen menjunjung tinggi standar privasi digital, khususnya data anak di bawah umur.
          Kami menerapkan prinsip Data Minimization sejak hari pertama perancangan sistem.
        </p>
      </div>

      <div className="space-y-8">
        {/* Prinsip Data Minimal */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-4">
          <h2 className="text-xl font-black text-stone-900 tracking-tight">
            1. Prinsip Data Minimal (Data Minimization)
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Untuk menghitung kecukupan gizi, sistem hanya membutuhkan <strong>rentang usia dalam tahun</strong>{' '}
            dan <strong>jenis kelamin</strong>. Kami sengaja meniadakan data identitas sensitif:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/60 text-emerald-950 space-y-1.5">
              <span className="font-extrabold text-emerald-800 block text-sm">
                ✅ Data yang Kami Simpan:
              </span>
              <p>• Alamat email akun (untuk login dan autentikasi).</p>
              <p>• Nama panggilan / alias (mis. &quot;Rian&quot;, &quot;Kakak&quot;, &quot;Ibu Sari&quot;).</p>
              <p>• Usia dalam tahun (mis. 4 tahun, 8 tahun).</p>
              <p>• Jenis kelamin (L / P) & status fisiologis (hamil/menyusui).</p>
              <p>• Catatan alergen makanan (mis. telur, kedelai).</p>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/60 text-rose-950 space-y-1.5">
              <span className="font-extrabold text-rose-800 block text-sm">
                ❌ Data yang TIDAK PERNAH Kami Kumpulkan:
              </span>
              <p>• Nama lengkap anak atau keluarga.</p>
              <p>• Tanggal lahir, bulan lahir, atau NIK.</p>
              <p>• Foto wajah atau dokumen keluarga.</p>
              <p>• Alamat rumah, koordinat GPS, atau lokasi presisi.</p>
              <p>• Riwayat medis klinis pribadi.</p>
            </div>
          </div>
        </div>

        {/* Keamanan Teknis & RLS */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-4">
          <h2 className="text-xl font-black text-stone-900 tracking-tight">
            2. Keamanan Tingkat Basis Data (Row Level Security)
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Data keluarga, anggota, dan riwayat menu dilindungi oleh <strong>Row Level Security (RLS)</strong>{' '}
            pada PostgreSQL Supabase. Artinya:
          </p>
          <ul className="list-disc pl-5 text-xs sm:text-sm text-stone-600 space-y-2">
            <li>
              Pengguna A tidak dapat membaca atau memodifikasi data keluarga milik Pengguna B, bahkan jika mencoba
              mengubah parameter ID di browser.
            </li>
            <li>
              Kunci rahasia basis data (<code>service_role</code>) tidak pernah dimasukkan ke dalam kode klien (browser).
            </li>
            <li>
              Sesi login dilindungi melalui cookie HTTP-only yang aman dari serangan pencurian sesi (session hijacking).
            </li>
          </ul>
        </div>

        {/* Hak Pengguna */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-4">
          <h2 className="text-xl font-black text-stone-900 tracking-tight">
            3. Hak Menghapus Data Anda (FR-15)
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Anda memiliki kendali penuh atas data keluarga Anda. Anda dapat mengubah atau menghapus data anggota
            keluarga dan riwayat menu kapan saja langsung melalui halaman Profil Keluarga.
          </p>
        </div>
      </div>

      <div className="text-center pt-4">
        <Link
          href="/keluarga"
          className="inline-flex items-center justify-center px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl shadow-xs transition"
        >
          Kembali ke Profil Keluarga →
        </Link>
      </div>
    </div>
  );
}
