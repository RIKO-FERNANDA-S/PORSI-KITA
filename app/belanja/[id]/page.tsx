'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { ItemDaftarBelanja, RencanaMenu7Hari } from '../../../lib/types';
import { getStoredMenu } from '../../../lib/store';
import { buatDaftarBelanjaMingguan, buatTautanWhatsApp } from '../../../lib/planner/cost';

function BelanjaContent() {
  const [rencanaMenu, setRencanaMenu] = useState<RencanaMenu7Hari | null>(null);
  const [daftarBelanja, setDaftarBelanja] = useState<ItemDaftarBelanja[]>([]);
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const m = getStoredMenu();
    setRencanaMenu(m);
    const items = buatDaftarBelanjaMingguan(m.hari);
    setDaftarBelanja(items);
  }, []);

  const toggleCheck = (kodeTkpi: string) => {
    setCheckedMap((prev) => ({
      ...prev,
      [kodeTkpi]: !prev[kodeTkpi],
    }));
  };

  if (!rencanaMenu) {
    return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-stone-500">Memuat daftar belanja...</div>;
  }

  const totalBiayaBelanja = daftarBelanja.reduce(
    (sum, item) => sum + item.estimasi_biaya_rp,
    0
  );

  const waLink = buatTautanWhatsApp(rencanaMenu, daftarBelanja);

  const perKategori = new Map<string, ItemDaftarBelanja[]>();
  for (const item of daftarBelanja) {
    const list = perKategori.get(item.kategori) || [];
    list.push(item);
    perKategori.set(item.kategori, list);
  }

  const jumlahDicentang = Object.values(checkedMap).filter(Boolean).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div>
        <Link
          href="/menu"
          className="text-xs font-bold text-stone-500 hover:text-stone-800 transition flex items-center gap-1 mb-3 min-h-[44px]"
        >
          ← Kembali ke Menu 7 Hari
        </Link>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
              Daftar Belanja Pasar (7 Hari)
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight mt-0.5">
              Belanja Mingguan Keluarga
            </h1>
            <p className="text-stone-500 text-xs sm:text-sm mt-1">
              Bahan digabung lintas 7 hari dan telah disesuaikan dengan Bagian Dapat Dimakan (BDD).
            </p>
          </div>

          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-2xl shadow-md shadow-emerald-600/20 transition min-h-[48px] flex items-center justify-center gap-2"
          >
            <span>💬</span> Kirim ke WhatsApp
          </a>
        </div>
      </div>

      <div className="p-5 rounded-3xl bg-white border border-stone-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs text-stone-500 block">Total Estimasi Belanja:</span>
          <span className="text-2xl font-black text-emerald-900">
            Rp {totalBiayaBelanja.toLocaleString('id-ID')}
          </span>
          <span className="text-xs text-stone-400 block mt-0.5">
            Budget Target: Rp {rencanaMenu.target_budget_mingguan_rp.toLocaleString('id-ID')}
          </span>
        </div>

        <div className="text-right">
          <span className="text-xs text-stone-500 block">Status Belanja:</span>
          <span className="text-sm font-bold text-stone-800">
            {jumlahDicentang} dari {daftarBelanja.length} bahan dibeli
          </span>
          <div className="w-32 bg-stone-100 h-1.5 rounded-full overflow-hidden mt-1 ml-auto">
            <div
              className="bg-emerald-600 h-full transition-all"
              style={{
                width: `${daftarBelanja.length > 0 ? (jumlahDicentang / daftarBelanja.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {Array.from(perKategori.entries()).map(([kategori, items]) => (
          <div
            key={kategori}
            className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-2xs space-y-3"
          >
            <h3 className="font-extrabold text-sm text-stone-900 uppercase tracking-wider pb-2 border-b border-stone-100 flex items-center justify-between">
              <span>📍 {kategori}</span>
              <span className="text-xs text-stone-400 font-normal">
                {items.length} macam bahan
              </span>
            </h3>

            <div className="divide-y divide-stone-100 text-xs">
              {items.map((item) => {
                const isChecked = !!checkedMap[item.kode_tkpi];
                const displayJumlah =
                  item.kebutuhan_beli_gram >= 1000
                    ? `${(item.kebutuhan_beli_gram / 1000).toFixed(1)} kg`
                    : `${item.kebutuhan_beli_gram} gram`;

                return (
                  <div
                    key={item.kode_tkpi}
                    onClick={() => toggleCheck(item.kode_tkpi)}
                    className={`py-3 flex items-center justify-between gap-3 cursor-pointer select-none transition ${
                      isChecked ? 'opacity-40 line-through' : 'hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-5 h-5 text-emerald-600 rounded-md focus:ring-emerald-500 border-stone-300 pointer-events-none"
                      />
                      <div>
                        <strong className="text-sm font-bold text-stone-900 block">
                          {item.nama_bahan}
                        </strong>
                        <span className="text-[11px] text-stone-400">
                          Bersih: {item.kebutuhan_bersih_gram} g · BDD: {item.bdd_percent}% · Rp{' '}
                          {item.harga_per_100g_rp.toLocaleString('id-ID')}/100g
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <strong className="text-sm font-black text-stone-900 block">
                        {displayJumlah}
                      </strong>
                      <span className="text-[11px] text-emerald-800 font-bold block">
                        ~Rp {item.estimasi_biaya_rp.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BelanjaPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto px-4 py-16 text-center text-stone-500">Memuat daftar belanja...</div>}>
      <BelanjaContent />
    </Suspense>
  );
}
