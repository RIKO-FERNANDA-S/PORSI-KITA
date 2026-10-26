'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();

  // Jangan render footer desktop pada layar Login dan Tampilan Utama Figma
  if (pathname === '/' || pathname === '/masuk' || pathname === '/daftar') {
    return null;
  }

  return (
    <footer className="mt-auto bg-[#0D0101] text-[#FAFAFA] border-t border-stone-800">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🍽️</span>
              <span className="text-xl font-extrabold text-white tracking-tight">Porsi Kita</span>
            </div>
            <p className="text-stone-400 text-xs leading-relaxed mb-4">
              Satu menu keluarga, gizi tepat untuk setiap anggota. Membantu keluarga Indonesia
              menyusun rencana menu mingguan yang hemat, aman dari alergi, dan tepat gizi berdasarkan
              TKPI 2017 dan Permenkes 28/2019.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-[11px] text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-[#8CC425]"></span>
              Sprint Lomba Pemenuhan Gizi Anak 2026
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold text-xs mb-3 uppercase tracking-wider">Aplikasi</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" className="hover:text-[#A5E342] transition">
                  Tampilan Utama
                </Link>
              </li>
              <li>
                <Link href="/menu" className="hover:text-[#A5E342] transition">
                  Menu 7 Hari
                </Link>
              </li>
              <li>
                <Link href="/keluarga" className="hover:text-[#A5E342] transition">
                  Profil Keluarga
                </Link>
              </li>
              <li>
                <Link href="/masuk" className="hover:text-[#A5E342] transition">
                  Masuk Akun
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-xs mb-3 uppercase tracking-wider">Transparansi</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/tentang" className="hover:text-[#A5E342] transition">
                  Metodologi & Sumber
                </Link>
              </li>
              <li>
                <Link href="/panduan" className="hover:text-[#A5E342] transition">
                  Panduan Penggunaan
                </Link>
              </li>
              <li>
                <Link href="/privasi" className="hover:text-[#A5E342] transition">
                  Kebijakan Privasi
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Kotak Disclaimer Wajib (PRD Bagian 16) */}
        <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 text-xs text-stone-400 space-y-2 leading-relaxed mb-8">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider text-[11px]">
            <span>⚠️</span> Disclaimer Resmi & Batasan Produk
          </div>
          <p>
            “Porsi Kita adalah alat bantu perencanaan menu, bukan pengganti saran dokter atau ahli
            gizi. Untuk kondisi kesehatan khusus, alergi berat, atau anak di bawah 2 tahun,
            konsultasikan dengan tenaga kesehatan. Estimasi harga berasal dari snapshot dan dapat
            berbeda di pasar Anda.”
          </p>
          <p className="text-stone-500">
            “Kebutuhan gizi (AKG) dihitung berdasarkan standar berat badan nasional untuk usia
            tersebut, bukan berat badan aktual pengguna.”
          </p>
        </div>

        <div className="border-t border-stone-800 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-3">
          <p>© 2026 Porsi Kita. Dibuat dengan transparansi data untuk kesehatan keluarga Indonesia.</p>
          <div className="flex gap-4">
            <Link href="/tentang" className="hover:underline">
              TKPI 2017
            </Link>
            <Link href="/tentang" className="hover:underline">
              Permenkes 28/2019
            </Link>
            <Link href="/privasi" className="hover:underline">
              Privasi & RLS
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
