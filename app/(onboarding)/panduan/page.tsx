import Link from 'next/link';

export default function PanduanPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-12">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
          <span>📖</span> Panduan Praktis Ibu di Dapur
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">
          Panduan Penggunaan Porsi Kita
        </h1>
        <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
          Pelajari cara memanfaatkan fitur Porsi Kita untuk menghemat anggaran belanja harian
          sekaligus memastikan kebutuhan gizi seluruh keluarga tercukupi.
        </p>
      </div>

      <div className="space-y-8">
        {/* Panduan 1 */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-sm">
              1
            </span>
            <h3 className="font-extrabold text-lg text-stone-900">Menentukan Budget Harian</h3>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed pl-10">
            Di halaman <strong>Profil Keluarga</strong>, masukkan anggaran harian yang biasa Anda alokasikan
            untuk belanja makan (misalnya Rp 40.000 atau Rp 85.000). Sistem akan secara otomatis mengunci
            pilihan menu agar total pengeluaran 7 hari tetap berada dalam batas anggaran ini.
          </p>
        </div>

        {/* Panduan 2 */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-sm">
              2
            </span>
            <h3 className="font-extrabold text-lg text-stone-900">Membaca Takaran Porsi per Anggota</h3>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed pl-10">
            Setiap sesi makan (Pagi, Siang, Malam) menampilkan <strong>pengali porsi</strong> dalam kelipatan 0,25:
          </p>
          <div className="pl-10 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-stone-700 pt-1">
            <div className="p-3 bg-stone-50 rounded-xl">
              <strong>0.5x porsi:</strong> Untuk balita usia 2-5 tahun (setengah centong nasi, sepotong kecil lauk).
            </div>
            <div className="p-3 bg-stone-50 rounded-xl">
              <strong>1.0x porsi:</strong> Porsi standar dewasa (1 centong nasi penuh, 1 potong lauk standar).
            </div>
            <div className="p-3 bg-stone-50 rounded-xl">
              <strong>1.25x - 1.5x porsi:</strong> Untuk remaja putra aktif, pria pekerja fisik, atau ibu menyusui.
            </div>
          </div>
        </div>

        {/* Panduan 3 */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-sm">
              3
            </span>
            <h3 className="font-extrabold text-lg text-stone-900">Menggunakan Daftar Belanja & WhatsApp</h3>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed pl-10">
            Buka menu <strong>Daftar Belanja</strong> untuk melihat rekap seluruh bahan pangan yang dibutuhkan
            selama 7 hari ke depan. Takaran gram sudah dikonversikan dengan faktor Bagian Dapat Dimakan (BDD)
            sehingga Anda tidak akan kekurangan bahan saat memasak. Tekan tombol <strong>Kirim ke WhatsApp</strong>{' '}
            untuk mengirimkan catatan belanja yang rapi ke suami atau pedagang langganan.
          </p>
        </div>

        {/* Panduan 4 */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-sm">
              4
            </span>
            <h3 className="font-extrabold text-lg text-stone-900">Mengganti Hidangan (Swap)</h3>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed pl-10">
            Jika ada hidangan yang bahannya sedang habis di pasar, buka <strong>Detail Hari</strong> dan tekan
            tombol <strong>Ganti ↺</strong> pada hidangan tersebut. Sistem hanya akan menawarkan alternatif
            dari kategori yang sama yang tetap aman dari alergi dan tidak merusak batas anggaran belanja.
          </p>
        </div>
      </div>

      <div className="text-center pt-4">
        <Link
          href="/keluarga"
          className="inline-flex items-center justify-center px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl shadow-xs transition"
        >
          Buka Profil Keluarga Anda →
        </Link>
      </div>
    </div>
  );
}
