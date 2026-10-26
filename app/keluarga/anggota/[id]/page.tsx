'use client';

import { useState, useEffect, use, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Anggota, StatusAnggota } from '../../../../lib/types';
import { getStoredAnggota, saveStoredAnggota } from '../../../../lib/store';
import { ALERGEN_OPTIONS, STATUS_ANGGOTA_OPTIONS, anggotaSchema } from '../../../../lib/schemas';

function EditAnggotaContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const id = resolvedParams.id;

  const [alias, setAlias] = useState('');
  const [usiaInput, setUsiaInput] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState<'L' | 'P'>('P');
  const [status, setStatus] = useState<StatusAnggota>('umum');
  const [alergenList, setAlergenList] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const list = getStoredAnggota();
    const target = list.find((a) => a.id === id);
    if (target) {
      setAlias(target.alias);
      setUsiaInput(target.usia_tahun.toString());
      setJenisKelamin(target.jenis_kelamin);
      setStatus(target.status);
      setAlergenList(target.alergen || []);
    }
    setLoading(false);
  }, [id]);

  const toggleAlergen = (alId: string) => {
    if (alergenList.includes(alId)) {
      setAlergenList(alergenList.filter((a) => a !== alId));
    } else {
      setAlergenList([...alergenList, alId]);
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
    const updatedList = currentAnggota.map((a) => {
      if (a.id === id) {
        return {
          ...a,
          alias: parseResult.data.alias,
          usia_tahun: parseResult.data.usia_tahun,
          jenis_kelamin: parseResult.data.jenis_kelamin,
          status: parseResult.data.status,
          alergen: parseResult.data.alergen,
        };
      }
      return a;
    });

    saveStoredAnggota(updatedList);
    router.push('/keluarga');
  };

  const handleDelete = () => {
    if (confirm(`Yakin ingin menghapus anggota ${alias}?`)) {
      const currentAnggota = getStoredAnggota();
      const updatedList = currentAnggota.filter((a) => a.id !== id);
      saveStoredAnggota(updatedList);
      router.push('/keluarga');
    }
  };

  if (loading) {
    return <div className="max-w-xl mx-auto px-4 py-16 text-center text-stone-500">Memuat...</div>;
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/keluarga"
              className="text-xs font-bold text-stone-500 hover:text-stone-800 transition flex items-center gap-1 mb-2"
            >
              ← Kembali ke Daftar Keluarga
            </Link>
            <h1 className="text-2xl font-black text-stone-900 tracking-tight">
              Ubah Data Anggota
            </h1>
          </div>

          <button
            type="button"
            onClick={handleDelete}
            className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition"
          >
            Hapus Anggota
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Nama Panggilan / Alias <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="misal: Rian, Adik, Nenek"
              className="w-full px-4 py-3 rounded-xl border border-stone-200 text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
            {errors.alias && <p className="text-xs text-rose-500 mt-1">{errors.alias}</p>}
          </div>

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
                onChange={(e) => setUsiaInput(e.target.value)}
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
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Alergi Makanan (Opsional)
            </label>
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
              Perbarui Anggota
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EditAnggotaPage(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="max-w-xl mx-auto px-4 py-16 text-center text-stone-500">Memuat data anggota...</div>}>
      <EditAnggotaContent params={props.params} />
    </Suspense>
  );
}
