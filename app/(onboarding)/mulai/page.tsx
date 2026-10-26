'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { setStoredOnboarded } from '../../../lib/store';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const handleFinish = () => {
    setStoredOnboarded(true);
    router.push('/keluarga');
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-stone-200/80 shadow-sm space-y-8">
        {/* Progress Bar 3 Langkah */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold text-stone-500 mb-2">
            <span>LANGKAH {step} DARI 3</span>
            <button
              onClick={handleFinish}
              className="text-stone-400 hover:text-stone-600 transition"
            >
              Lewati →
            </button>
          </div>
          <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Tujuan Aplikasi */}
        {step === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-3xl">
              🎯
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-stone-900 tracking-tight">
                Satu Menu Keluarga, Gizi Tepat untuk Setiap Anggota
              </h2>
              <p className="text-stone-600 text-sm mt-3 leading-relaxed">
                Porsi Kita hadir untuk meringankan tugas ibu di dapur. Anda hanya perlu memasak{' '}
                <strong>satu menu</strong> untuk sekeluarga, sementara porsi dan kecukupan gizi
                (energi, protein, zat besi, kalsium, seng, vitamin A) dihitung terpisah untuk setiap
                anggota.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-900 text-xs space-y-1.5">
              <span className="font-bold block">✨ Apa yang Anda dapatkan:</span>
              <p>• Menu 7 hari (3 waktu makan) terkunci dalam batas anggaran harian Anda.</p>
              <p>• Takaran porsi otomatis (balita 2+ th, anak sekolah, bumil, lansia).</p>
              <p>• Daftar belanja mingguan praktis yang bisa dikirim ke WhatsApp.</p>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base rounded-2xl transition shadow-xs min-h-[48px]"
              >
                Lanjut ke Privasi & Data →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Data Minimal & Privasi */}
        {step === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center text-3xl">
              🔒
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-stone-900 tracking-tight">
                Data Anak & Keluarga Anda Terjaga Aman
              </h2>
              <p className="text-stone-600 text-sm mt-3 leading-relaxed">
                Kami menerapkan prinsip <strong>Data Minimal</strong> (Data Minimization). Kami hanya
                meminta data yang benar-benar esensial untuk perhitungan Angka Kecukupan Gizi (AKG).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/60 text-emerald-900 space-y-1">
                <span className="font-bold text-emerald-700 block">✅ Yang Kami Simpan:</span>
                <p>• Alias/nama panggilan</p>
                <p>• Usia dalam tahun (angka)</p>
                <p>• Jenis kelamin & status (hamil/menyusui)</p>
                <p>• Daftar alergi makanan</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/60 text-rose-900 space-y-1">
                <span className="font-bold text-rose-700 block">❌ TIDAK Kami Kumpulkan:</span>
                <p>• Nama lengkap anak</p>
                <p>• Tanggal & tempat lahir</p>
                <p>• Foto atau dokumen kependudukan</p>
                <p>• Alamat atau lokasi presisi</p>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-5 py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-2xl transition min-h-[48px]"
              >
                Kembali
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base rounded-2xl transition shadow-xs min-h-[48px]"
              >
                Lanjut ke Batasan & Disclaimer →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Batasan Produk & Disclaimer Resmi */}
        {step === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-3xl">
              ⚖️
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-stone-900 tracking-tight">
                Batasan Produk & Pernyataan Resmi
              </h2>
              <p className="text-stone-600 text-sm mt-3 leading-relaxed">
                Mohon baca dan pahami batasan aplikasi sebelum mulai menyusun menu:
              </p>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-stone-600">
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-950 space-y-2">
                <span className="font-bold block text-amber-900">
                  ⚠️ Peringatan Usia Balita (&lt; 2 Tahun):
                </span>
                <p>
                  Porsi Kita <strong>tidak mendukung bayi di bawah usia 2 tahun (MPASI)</strong>,
                  karena pedoman MPASI membutuhkan panduan tekstur dan konsultasi medis langsung.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-stone-700 space-y-2">
                <span className="font-bold block text-stone-900">
                  📋 Disclaimer Medis & Standar Nasional:
                </span>
                <p>
                  “Porsi Kita adalah alat bantu perencanaan menu, bukan pengganti saran dokter atau
                  ahli gizi. Untuk kondisi kesehatan khusus, alergi berat, atau anak di bawah 2 tahun,
                  konsultasikan dengan tenaga kesehatan. Estimasi harga berasal dari snapshot pasar
                  dan dapat berbeda di pasar Anda.”
                </p>
                <p className="text-stone-500">
                  “Kebutuhan gizi (AKG) dihitung berdasarkan standar berat badan nasional untuk usia
                  tersebut, bukan berat badan aktual pengguna.”
                </p>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="px-5 py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-2xl transition min-h-[48px]"
              >
                Kembali
              </button>
              <button
                onClick={handleFinish}
                className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base rounded-2xl transition shadow-xs min-h-[48px]"
              >
                Saya Paham, Mulai Atur Keluarga →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
