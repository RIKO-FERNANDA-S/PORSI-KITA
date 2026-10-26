'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Anggota, Keluarga } from '../../lib/types';
import {
  getStoredKeluarga,
  saveStoredKeluarga,
  getStoredAnggota,
  saveStoredAnggota,
  saveStoredMenu,
} from '../../lib/store';
import { hitungKebutuhan } from '../../lib/nutrition/akg';
import { generateMenu } from '../../lib/planner/generate';

export default function KeluargaPage() {
  const router = useRouter();
  const [keluarga, setKeluarga] = useState<Keluarga | null>(null);
  const [anggotaList, setAnggotaList] = useState<Anggota[]>([]);
  const [editBudget, setEditBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    const k = getStoredKeluarga();
    const a = getStoredAnggota();
    setKeluarga(k);
    setAnggotaList(a);
    setBudgetInput(k.budget_harian_rp.toString());
  }, []);

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keluarga) return;

    const val = parseInt(budgetInput.replace(/\D/g, ''), 10);
    if (isNaN(val) || val < 10000 || val > 1000000) {
      alert('Budget harian harus antara Rp 10.000 dan Rp 1.000.000');
      return;
    }

    const updated = { ...keluarga, budget_harian_rp: val };
    setKeluarga(updated);
    saveStoredKeluarga(updated);
    setEditBudget(false);
    setToastMsg('Budget harian berhasil diperbarui!');
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleGenerate = () => {
    if (!keluarga || anggotaList.length === 0) {
      alert('Tambahkan minimal 1 anggota keluarga terlebih dahulu.');
      return;
    }

    setIsGenerating(true);
    try {
      const menuBaru = generateMenu({
        familyId: keluarga.id,
        familyName: keluarga.alias,
        budgetHarianRp: keluarga.budget_harian_rp,
        anggota: anggotaList,
      });

      saveStoredMenu(menuBaru);
      router.push('/menu');
    } catch (err: any) {
      alert('Gagal menyusun menu: ' + (err?.message || 'Kesalahan mesin gizi'));
      setIsGenerating(false);
    }
  };

  const handleDeleteAnggota = (id: string, alias: string) => {
    if (confirm(`Yakin ingin menghapus anggota ${alias}?`)) {
      const filtered = anggotaList.filter((a) => a.id !== id);
      setAnggotaList(filtered);
      saveStoredAnggota(filtered);
      setToastMsg(`Anggota ${alias} telah dihapus.`);
      setTimeout(() => setToastMsg(''), 3000);
    }
  };

  if (!keluarga) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-stone-500">
        Memuat data keluarga...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Toast Notifikasi */}
      {toastMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-600 text-white text-xs font-bold shadow-md transition animate-fadeIn flex items-center justify-between">
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg('')} className="text-white/80 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Header Keluarga & Budget Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-stone-100">
          <div>
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Profil Keluarga
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 mt-1">
              {keluarga.alias}
            </h1>
            <p className="text-stone-500 text-xs sm:text-sm mt-1">
              📍 Wilayah Pasar: <strong>{keluarga.wilayah}</strong>
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 text-right w-full sm:w-auto">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
              Budget Harian Anda
            </span>
            <div className="text-2xl font-black text-emerald-900 mt-0.5">
              Rp {keluarga.budget_harian_rp.toLocaleString('id-ID')}
            </div>
            <span className="text-[11px] text-emerald-700 block mt-0.5">
              ~Rp {(keluarga.budget_harian_rp * 7).toLocaleString('id-ID')} / minggu
            </span>

            <button
              onClick={() => setEditBudget(!editBudget)}
              className="mt-2 text-xs font-bold text-emerald-700 hover:text-emerald-900 underline block ml-auto"
            >
              {editBudget ? 'Tutup' : 'Ubah Budget'}
            </button>
          </div>
        </div>

        {/* Form Ubah Budget */}
        {editBudget && (
          <form onSubmit={handleSaveBudget} className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
            <h3 className="font-bold text-sm text-stone-800">Ubah Anggaran Harian Belanja</h3>
            <div className="flex gap-2">
              <input
                type="number"
                min="10000"
                max="1000000"
                step="5000"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold flex-1"
                placeholder="misal: 60000"
                required
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition"
              >
                Simpan
              </button>
            </div>
            <span className="text-[11px] text-stone-500 block">
              Batas: Rp 10.000 s/d Rp 1.000.000 per hari.
            </span>
          </form>
        )}

        {/* Action Button: Buat Menu 7 Hari */}
        <div className="pt-2">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || anggotaList.length === 0}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base rounded-2xl shadow-md shadow-emerald-600/20 transition min-h-[48px] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>✨</span>
            {isGenerating ? 'Menyusun Menu 7 Hari...' : 'Buat Rencana Menu 7 Hari untuk Keluarga Ini'}
          </button>
        </div>
      </div>

      {/* Daftar Anggota Keluarga */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">
              Anggota Keluarga ({anggotaList.length})
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Porsi dan kecukupan AKG dihitung otomatis per individu.
            </p>
          </div>

          <Link
            href="/keluarga/anggota/baru"
            className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-sm rounded-xl border border-emerald-200 transition min-h-[44px] flex items-center gap-1.5"
          >
            <span>+</span> Tambah Anggota
          </Link>
        </div>

        {anggotaList.length === 0 ? (
          <div className="p-8 rounded-3xl bg-white border border-stone-200 text-center space-y-3">
            <span className="text-3xl">👨‍👩‍👧‍👦</span>
            <h3 className="font-bold text-stone-800 text-base">Belum Ada Anggota Keluarga</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Tambahkan anggota keluarga Anda (ayah, ibu, anak, lansia) untuk menghitung kebutuhan
              porsi dan gizi seimbang.
            </p>
            <Link
              href="/keluarga/anggota/baru"
              className="inline-block px-5 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl"
            >
              + Tambah Anggota Sekarang
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {anggotaList.map((a) => {
              const akg = hitungKebutuhan(a);

              const statusLabel =
                a.status === 'hamil_t1'
                  ? 'Ibu Hamil Trimester 1'
                  : a.status === 'hamil_t2'
                  ? 'Ibu Hamil Trimester 2'
                  : a.status === 'hamil_t3'
                  ? 'Ibu Hamil Trimester 3'
                  : a.status === 'menyusui_6bln1'
                  ? 'Ibu Menyusui 0-6 Bln'
                  : a.status === 'menyusui_6bln2'
                  ? 'Ibu Menyusui 7-12 Bln'
                  : null;

              return (
                <div
                  key={a.id}
                  className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-2xs space-y-4 relative"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">
                          {a.usia_tahun <= 5
                            ? '👶'
                            : a.usia_tahun <= 18
                            ? '👧'
                            : a.usia_tahun >= 60
                            ? '👵'
                            : '🧑'}
                        </span>
                        <h4 className="font-extrabold text-base text-stone-900">{a.alias}</h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-xs text-stone-500">
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 font-medium">
                          {a.usia_tahun} tahun
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 font-medium">
                          {a.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                        </span>
                        {statusLabel && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold">
                            {statusLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Link
                        href={`/keluarga/anggota/${a.id}`}
                        className="p-2 text-stone-400 hover:text-stone-700 transition rounded-lg hover:bg-stone-50"
                        title="Ubah Anggota"
                      >
                        ✏️
                      </Link>
                      <button
                        onClick={() => handleDeleteAnggota(a.id, a.alias)}
                        className="p-2 text-stone-400 hover:text-rose-600 transition rounded-lg hover:bg-rose-50"
                        title="Hapus Anggota"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Alergen */}
                  {a.alergen && a.alergen.length > 0 && (
                    <div className="text-xs">
                      <span className="text-stone-400 text-[11px] block mb-1">Alergi Makanan:</span>
                      <div className="flex flex-wrap gap-1">
                        {a.alergen.map((al) => (
                          <span
                            key={al}
                            className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold"
                          >
                            ⚠️ {al}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Kebutuhan AKG Permenkes 28/2019 */}
                  <div className="p-3 rounded-2xl bg-stone-50 border border-stone-100 text-xs space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-stone-500 font-bold uppercase tracking-wider">
                      <span>Kebutuhan AKG 2019</span>
                      <span className="text-emerald-700 font-extrabold">{akg.energi_kcal} kkal/hari</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-stone-700 text-[11px]">
                      <div>
                        <span className="text-stone-400 block">Protein</span>
                        <strong className="text-stone-900">{akg.protein_g} g</strong>
                      </div>
                      <div>
                        <span className="text-stone-400 block">Zat Besi</span>
                        <strong className="text-stone-900">{akg.zat_besi_mg} mg</strong>
                      </div>
                      <div>
                        <span className="text-stone-400 block">Kalsium</span>
                        <strong className="text-stone-900">{akg.kalsium_mg} mg</strong>
                      </div>
                      <div>
                        <span className="text-stone-400 block">Seng (Zn)</span>
                        <strong className="text-stone-900">{akg.seng_mg} mg</strong>
                      </div>
                      <div>
                        <span className="text-stone-400 block">Vitamin A</span>
                        <strong className="text-stone-900">{akg.vitamin_a_mcg} mcg</strong>
                      </div>
                      <div>
                        <span className="text-stone-400 block">Batas Retinol</span>
                        <strong className="text-amber-700">≤{akg.batas_retinol_mcg} mcg</strong>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
