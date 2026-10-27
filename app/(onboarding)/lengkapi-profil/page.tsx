'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BrandLogo from '../../../components/BrandLogo';
import { Anggota, Keluarga } from '../../../lib/types';
import { saveStoredKeluarga, saveStoredAnggota, setStoredOnboarded } from '../../../lib/store';

export default function LengkapiProfilPage() {
  const router = useRouter();

  // State Profil Keluarga
  const [namaKeluarga, setNamaKeluarga] = useState('');
  const [wilayah, setWilayah] = useState('Pasar Tradisional • Jakarta Selatan');
  const [budgetHarian, setBudgetHarian] = useState('75000');
  const [userPhone, setUserPhone] = useState('');

  // State Anggota Keluarga Awal (Minimal 1 Orang: Kepala Keluarga/Pengguna)
  const [anggotaList, setAnggotaList] = useState<Anggota[]>([
    {
      id: 'ang-1',
      alias: '',
      usia_tahun: 30,
      jenis_kelamin: 'P',
      status: 'umum',
      alergen: [],
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    try {
      const rawMeta = localStorage.getItem('porsi_kita_auth_meta');
      if (rawMeta) {
        const meta = JSON.parse(rawMeta);
        if (meta.nama) {
          setNamaKeluarga(`Keluarga ${meta.nama}`);
          setAnggotaList([
            {
              id: 'ang-1',
              alias: meta.nama,
              usia_tahun: 28,
              jenis_kelamin: 'P',
              status: 'umum',
              alergen: [],
            },
          ]);
        }
        if (meta.phone) {
          setUserPhone(meta.phone);
        }
      }
    } catch {
      // fallback
    }
  }, []);

  const handleAddMember = () => {
    setAnggotaList((prev) => [
      ...prev,
      {
        id: `ang-${Date.now()}`,
        alias: '',
        usia_tahun: 7,
        jenis_kelamin: 'L',
        status: 'umum',
        alergen: [],
      },
    ]);
  };

  const handleRemoveMember = (id: string) => {
    if (anggotaList.length <= 1) {
      alert('Minimal harus ada 1 anggota keluarga.');
      return;
    }
    setAnggotaList((prev) => prev.filter((m) => m.id !== id));
  };

  const handleUpdateMember = (id: string, field: keyof Anggota, val: any) => {
    setAnggotaList((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: val } : m))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!namaKeluarga.trim()) {
      setErrorMsg('Nama keluarga wajib diisi.');
      return;
    }

    const invalidMember = anggotaList.find((m) => !m.alias.trim());
    if (invalidMember) {
      setErrorMsg('Semua nama/alias anggota keluarga wajib diisi.');
      return;
    }

    const parsedBudget = parseInt(budgetHarian.replace(/\D/g, ''), 10) || 75000;
    setLoading(true);

    try {
      // 1. Simpan ke Database Supabase Postgres via API
      const res = await fetch('/api/auth/save-profil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: userPhone || '+6281200000000',
          nama: namaKeluarga.trim(),
          wilayah,
          budget_harian_rp: parsedBudget,
          anggota: anggotaList,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.warn('API DB notice:', data.error);
      }

      // 2. Simpan juga ke Local Storage untuk sinkronisasi seketika di frontend
      const kData: Keluarga = {
        id: data.family?.id || `kel-${Date.now()}`,
        alias: namaKeluarga.trim(),
        wilayah,
        budget_harian_rp: parsedBudget,
      };

      saveStoredKeluarga(kData);
      saveStoredAnggota(anggotaList);
      setStoredOnboarded(true);

      if (typeof window !== 'undefined') {
        const currentMeta = JSON.parse(localStorage.getItem('porsi_kita_auth_meta') || '{}');
        localStorage.setItem(
          'porsi_kita_auth_meta',
          JSON.stringify({
            ...currentMeta,
            phone: userPhone,
            nama: namaKeluarga.trim(),
            hasPassword: false,
            verifiedAt: currentMeta.verifiedAt || Date.now(),
          })
        );
      }

      // 3. Arahkan langsung ke dashboard tanpa paksaan popup password
      router.push('/dashboard');
    } catch {
      setErrorMsg('Gagal menyimpan ke server database. Mengalihkan ke dashboard...');
      setTimeout(() => router.push('/dashboard'), 1500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] flex flex-col items-center justify-center px-4 sm:px-6 py-10 selection:bg-[#A5E342]/40">
      {/* Brand Header */}
      <div className="mb-6 flex flex-col items-center">
        <BrandLogo size={52} showAsterisk={true} />
        <span className="text-[11px] font-bold tracking-widest text-[#6DA003] uppercase mt-2">
          Harmoni Domestik
        </span>
      </div>

      <div className="w-full max-w-[620px] bg-white rounded-3xl p-6 sm:p-9 shadow-sm border border-stone-200/70 flex flex-col gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#b2f2b6] text-[#306a3b] text-xs font-bold mb-2">
            <span>✨ Langkah Awal Selesai</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0D0101] tracking-tight">
            Lengkapi Profil Diri &amp; Keluarga
          </h1>
          <p className="text-[13px] text-[#5F5F5F] mt-1 leading-relaxed">
            Data ini digunakan sistem Porsi Kita untuk menghitung kebutuhan kalori harian dan membagi porsi masakan secara otomatis.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[12px]">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* BAGIAN 1: INFO KELUARGA & BELANJA */}
          <div className="flex flex-col gap-4 pb-5 border-b border-stone-100">
            <h2 className="text-[15px] font-bold text-[#0D0101] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#6DA003]" />
              Informasi Rumah Tangga &amp; Budget
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#0D0101]">Nama Profil Keluarga:</label>
                <input
                  type="text"
                  value={namaKeluarga}
                  onChange={(e) => setNamaKeluarga(e.target.value)}
                  placeholder="misal: Keluarga Bu Samantha"
                  required
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-sm font-semibold bg-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#306a3b]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#0D0101]">Target Budget Belanja Harian:</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-500">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="10000"
                    max="1000000"
                    step="5000"
                    value={budgetHarian}
                    onChange={(e) => setBudgetHarian(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-sm font-semibold bg-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#306a3b]"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#0D0101]">Acuan Pasar Tradisional / Wilayah:</label>
              <select
                value={wilayah}
                onChange={(e) => setWilayah(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-stone-200 text-sm font-semibold bg-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#306a3b] cursor-pointer"
              >
                <option value="Pasar Tradisional • Jakarta Selatan">Pasar Tradisional • Jakarta Selatan</option>
                <option value="Pasar Tebet Barat • Jakarta Selatan">Pasar Tebet Barat • Jakarta Selatan</option>
                <option value="Pasar Minggu • Jakarta Selatan">Pasar Minggu • Jakarta Selatan</option>
                <option value="Supermarket Segar • Jabodetabek">Supermarket Segar • Jabodetabek</option>
                <option value="Surabaya, Jawa Timur">Pasar Tradisional • Surabaya, Jawa Timur</option>
              </select>
            </div>
          </div>

          {/* BAGIAN 2: ANGGOTA KELUARGA (MIN. 1 ORANG) */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-[#0D0101] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#306a3b]" />
                Anggota Keluarga ({anggotaList.length} Orang)
              </h2>
              <button
                type="button"
                onClick={handleAddMember}
                className="text-xs font-bold text-[#306a3b] bg-[#b2f2b6] hover:bg-[#b2f2b6]/80 px-3 py-1.5 rounded-full transition flex items-center gap-1 cursor-pointer"
              >
                <span>+</span> Tambah Anggota
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {anggotaList.map((m, index) => (
                <div
                  key={m.id}
                  className="p-4 rounded-2xl bg-[#FAFAFA] border border-stone-200/70 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#306a3b] uppercase">
                      Anggota #{index + 1}
                    </span>
                    {anggotaList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m.id)}
                        className="text-xs text-stone-400 hover:text-red-600 font-medium cursor-pointer"
                      >
                        Hapus ✕
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-stone-600">Nama Panggilan:</label>
                      <input
                        type="text"
                        value={m.alias}
                        onChange={(e) => handleUpdateMember(m.id, 'alias', e.target.value)}
                        placeholder="misal: Ibu, Ayah, Rian"
                        required
                        className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#306a3b]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-stone-600">Usia (Tahun):</label>
                      <input
                        type="number"
                        min="2"
                        max="100"
                        value={m.usia_tahun}
                        onChange={(e) =>
                          handleUpdateMember(m.id, 'usia_tahun', parseInt(e.target.value, 10) || 0)
                        }
                        required
                        className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#306a3b]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-semibold text-stone-600">Jenis Kelamin:</label>
                      <select
                        value={m.jenis_kelamin}
                        onChange={(e) =>
                          handleUpdateMember(m.id, 'jenis_kelamin', e.target.value as 'L' | 'P')
                        }
                        className="px-3 py-2 rounded-xl border border-stone-200 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#306a3b]"
                      >
                        <option value="P">Perempuan</option>
                        <option value="L">Laki-laki</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-2 flex flex-col gap-2.5">
            <button
              type="submit"
              disabled={loading}
              style={{
                background: 'linear-gradient(90deg, #6DA003 0%, #82BD03 100%)',
                boxShadow: '0 4px 12px rgba(109, 160, 3, 0.25)',
              }}
              className="w-full min-h-[48px] rounded-xl text-[15px] font-bold text-white flex items-center justify-center transition active:scale-[0.98] disabled:opacity-60 cursor-pointer shadow-md"
            >
              {loading ? 'Menyimpan ke Database...' : 'Simpan & Masuk ke Dashboard →'}
            </button>

            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="w-full min-h-[48px] rounded-xl bg-stone-100 hover:bg-stone-200 text-[#5F5F5F] hover:text-[#0D0101] text-[13px] font-semibold flex items-center justify-center transition cursor-pointer"
            >
              Lewati untuk saat ini &amp; Langsung ke Dashboard →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
