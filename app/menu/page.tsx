'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { RencanaMenu7Hari } from '../../lib/types';
import { getStoredKeluarga, getStoredAnggota, getStoredMenu, saveStoredMenu } from '../../lib/store';
import { generateMenu } from '../../lib/planner/generate';

export default function MenuPage() {
  const [rencanaMenu, setRencanaMenu] = useState<RencanaMenu7Hari | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    const m = getStoredMenu();
    setRencanaMenu(m);
    setLoading(false);
  }, []);

  const handleRegenerate = () => {
    setIsRegenerating(true);
    const k = getStoredKeluarga();
    const a = getStoredAnggota();
    const fresh = generateMenu({
      familyId: k.id,
      familyName: k.alias,
      budgetHarianRp: k.budget_harian_rp,
      anggota: a,
      seed: Date.now(),
    });
    saveStoredMenu(fresh);
    setRencanaMenu(fresh);
    setIsRegenerating(false);
  };

  if (loading || !rencanaMenu) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-stone-500">
        Menyiapkan menu 7 hari...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header Rencana Menu & Ringkasan Biaya Mingguan */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-stone-100">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-2">
              <span>📅</span> Rencana Menu 7 Hari
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              Menu Mingguan Keluarga
            </h1>
            <p className="text-stone-500 text-xs sm:text-sm mt-1">
              Satu menu dimasak bersama, porsi disesuaikan dengan kebutuhan gizi masing-masing anggota.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-2.5 w-full sm:w-auto">
            <Link
              href={`/belanja/${rencanaMenu.id}`}
              className="flex-1 sm:flex-initial px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl shadow-xs transition min-h-[44px] flex items-center justify-center gap-1.5"
            >
              <span>🛒</span> Daftar Belanja Pasar
            </Link>

            <button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="px-4 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-sm rounded-2xl transition min-h-[44px] flex items-center justify-center gap-1"
              title="Acak dan buat ulang variasi menu"
            >
              <span>🔄</span> {isRegenerating ? 'Menyusun...' : 'Variasi Lain'}
            </button>
          </div>
        </div>

        {/* Peringatan Budget Jika Ada */}
        {rencanaMenu.pesan_budget && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs leading-relaxed flex items-start gap-2.5">
            <span className="text-lg">⚠️</span>
            <div>
              <strong className="block font-bold">Pemberitahuan Anggaran:</strong>
              {rencanaMenu.pesan_budget}
            </div>
          </div>
        )}

        {/* Kartu Metrik Mingguan */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100">
            <span className="text-stone-400 font-semibold block">Target Budget (7 Hari)</span>
            <strong className="text-base sm:text-lg text-stone-900 block mt-0.5">
              Rp {rencanaMenu.target_budget_mingguan_rp.toLocaleString('id-ID')}
            </strong>
            <span className="text-[10px] text-stone-400">
              Rp {rencanaMenu.budget_harian_rp.toLocaleString('id-ID')} / hari
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
            <span className="text-emerald-700 font-semibold block">Estimasi Total Biaya</span>
            <strong className="text-base sm:text-lg text-emerald-900 block mt-0.5">
              Rp {rencanaMenu.total_biaya_mingguan_rp.toLocaleString('id-ID')}
            </strong>
            <span className="text-[10px] text-emerald-700 font-medium">Snapshot Harga PIHPS/Bapanas</span>
          </div>

          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100">
            <span className="text-stone-400 font-semibold block">Kepatuhan Budget</span>
            <strong className="text-base sm:text-lg text-stone-900 block mt-0.5">
              {rencanaMenu.kepatuhan_budget_percent}%
            </strong>
            <span className="text-[10px] text-stone-400">Target hemat tercapai</span>
          </div>

          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-100">
            <span className="text-stone-400 font-semibold block">Mode Menu</span>
            <strong className="text-base sm:text-lg text-stone-900 block mt-0.5">
              {rencanaMenu.is_fallback_package ? 'Paket Hemat' : 'Variasi Custom'}
            </strong>
            <span className="text-[10px] text-stone-400">Bebas 8 Alergen Utama</span>
          </div>
        </div>
      </div>

      {/* Grid 7 Hari */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-stone-900 tracking-tight">Jadwal Menu 7 Hari</h2>
          <span className="text-xs text-stone-500">Klik hari untuk melihat takaran porsi & gizi</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rencanaMenu.hari.map((h) => {
            const skor = h.skor_keluarga;
            const badgeBg =
              skor.status === 'tercukupi'
                ? 'bg-emerald-100 text-emerald-800'
                : skor.status === 'hampir'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-rose-100 text-rose-800';

            return (
              <div
                key={h.hari_ke}
                className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-2xs space-y-4 flex flex-col justify-between hover:border-emerald-300 transition"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                        Hari ke-{h.hari_ke}
                      </span>
                      <h3 className="font-black text-lg text-stone-900">{h.label_hari}</h3>
                    </div>

                    <div className="text-right">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${badgeBg}`}>
                        Skor {skor.skor_rata_rata}%
                      </span>
                      <span className="text-[10px] text-stone-400 block mt-1">
                        Rp {h.total_biaya_hari_rp.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {/* 3 Sesi Makan Singkat */}
                  <div className="space-y-3 pt-3 text-xs">
                    {/* Pagi */}
                    <div>
                      <span className="text-stone-400 font-bold text-[10px] uppercase block mb-1">
                        🌅 Sarapan Pagi (30%)
                      </span>
                      <ul className="space-y-0.5 text-stone-800 font-medium pl-1">
                        {h.sesi_makan.pagi.hidangan.map((item, idx) => (
                          <li key={idx} className="truncate">
                            • {item.nama}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Siang */}
                    <div>
                      <span className="text-stone-400 font-bold text-[10px] uppercase block mb-1">
                        ☀️ Makan Siang (40%)
                      </span>
                      <ul className="space-y-0.5 text-stone-800 font-medium pl-1">
                        {h.sesi_makan.siang.hidangan.map((item, idx) => (
                          <li key={idx} className="truncate">
                            • {item.nama}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Malam */}
                    <div>
                      <span className="text-stone-400 font-bold text-[10px] uppercase block mb-1">
                        🌙 Makan Malam (30%)
                      </span>
                      <ul className="space-y-0.5 text-stone-800 font-medium pl-1">
                        {h.sesi_makan.malam.hidangan.map((item, idx) => (
                          <li key={idx} className="truncate">
                            • {item.nama}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-stone-500">
                    Terendah: <strong>{skor.skor_terendah}%</strong> ({skor.anggota_skor_terendah})
                  </span>
                  <Link
                    href={`/menu/${rencanaMenu.id}/hari/${h.hari_ke}`}
                    className="font-bold text-emerald-700 hover:text-emerald-900 hover:underline min-h-[44px] flex items-center"
                  >
                    Detail Takaran →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
