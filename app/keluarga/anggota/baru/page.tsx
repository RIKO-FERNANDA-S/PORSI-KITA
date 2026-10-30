'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Anggota, StatusAnggota } from '../../../../lib/types';
import { getStoredAnggota, saveStoredAnggota } from '../../../../lib/store';
import { ALERGEN_OPTIONS, STATUS_ANGGOTA_OPTIONS, anggotaSchema } from '../../../../lib/schemas';

export default function TambahAnggotaPage() {
  const router = useRouter();
  const [alias, setAlias] = useState('');
  const [usiaInput, setUsiaInput] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState<'L' | 'P'>('P');
  const [status, setStatus] = useState<StatusAnggota>('umum');
  const [alergenList, setAlergenList] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleAlergen = (id: string) => {
    if (alergenList.includes(id)) {
      setAlergenList(alergenList.filter((a) => a !== id));
    } else {
      setAlergenList([...alergenList, id]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const usia = parseInt(usiaInput, 10);

    const parseResult = anggotaSchema.safeParse({
      alias,
      usia_tahun: isNaN(usia) ? undefined : usia,
      jenis_kelamin: jenisKelamin,
      status,
      alergen: alergenList,
    });

    if (!parseResult.success) {
      const errMap: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        const field = issue.path[0] as string;
        errMap[field] = issue.message;
      }
      setErrors(errMap);
      return;
    }

    const currentAnggota = getStoredAnggota();
    const newAnggota: Anggota = {
      id: `ang-${Date.now()}`,
      alias: parseResult.data.alias,
      usia_tahun: parseResult.data.usia_tahun,
      jenis_kelamin: parseResult.data.jenis_kelamin,
      status: parseResult.data.status,
      alergen: parseResult.data.alergen,
    };

    saveStoredAnggota([...currentAnggota, newAnggota]);
    router.push('/keluarga');
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-sm space-y-6">
        <div>
          <Link
            href="/keluarga"
            className="text-xs font-bold text-stone-500 hover:text-stone-800 transition flex items-center gap-1 mb-2"
          >
            ← Kembali ke Daftar Keluarga
          </Link>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">
            Tambah Anggota Keluarga
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-1">
            Gunakan nama panggilan/alias saja. Data usia dipakai untuk kalkulasi AKG.
          </p>
        </div>

        {/* Kotak Batasan Usia Produk (PRD 3.2 & 16) */}
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs leading-relaxed">
          <span className="font-bold block mb-0.5">⚠️ Batasan Usia Produk Porsi Kita:</span>
          Anak minimal berusia <strong>2 tahun ke atas</strong>. Bayi usia 0-23 bulan (MPASI) belum
          didukung karena aturan MPASI membutuhkan supervisi medis khusus.
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Alias */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Nama Panggilan / Alias <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="misal: Rian, Adik, Nenek, Ibu Sari"
              className="w-full px-4 py-3 rounded-xl border border-stone-200 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
            {errors.alias && <p className="text-xs text-rose-500 mt-1">{errors.alias}</p>}
          </div>

          {/* Usia & Jenis Kelamin */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Usia (Tahun) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="2"
                max="120"
                value={usiaInput}
                onChange={(e) => {
                  const clean = e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
                  setUsiaInput(clean);
                }}
                placeholder="misal: 4, 8, 32"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
              {errors.usia_tahun && (
                <p className="text-xs text-rose-500 mt-1 leading-relaxed">{errors.usia_tahun}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Jenis Kelamin <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setJenisKelamin('L');
                    setStatus('umum');
                  }}
                  className={`py-3 text-sm font-bold rounded-xl border transition min-h-[44px] ${
                    jenisKelamin === 'L'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  Laki-laki
                </button>
                <button
                  type="button"
                  onClick={() => setJenisKelamin('P')}
                  className={`py-3 text-sm font-bold rounded-xl border transition min-h-[44px] ${
                    jenisKelamin === 'P'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  Perempuan
                </button>
              </div>
            </div>
          </div>

          {/* Status Khusus (Hamil / Menyusui - Khusus Perempuan) */}
          {jenisKelamin === 'P' && (
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Kondisi Fisiologis Khusus (AKG Tambahan)
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusAnggota)}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                {STATUS_ANGGOTA_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors.status && <p className="text-xs text-rose-500 mt-1">{errors.status}</p>}
            </div>
          )}

          {/* Alergen */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Alergi Makanan (Opsional)
            </label>
            <p className="text-stone-500 text-xs mb-2.5">
              Menu keluarga akan otomatis menyaring dan membuang masakan yang mengandung alergen ini.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ALERGEN_OPTIONS.map((al) => {
                const selected = alergenList.includes(al.id);
                return (
                  <button
                    type="button"
                    key={al.id}
                    onClick={() => toggleAlergen(al.id)}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-bold text-left transition min-h-[44px] flex items-center justify-between ${
                      selected
                        ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-2xs'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <span>{al.label.split(' ')[0]}</span>
                    <span>{selected ? '✓' : '+'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <Link
              href="/keluarga"
              className="px-5 py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-2xl transition min-h-[48px] flex items-center justify-center text-sm"
            >
              Batal
            </Link>
            <button
              type="submit"
              className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl transition shadow-xs min-h-[48px]"
            >
              Simpan Anggota Keluarga
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
