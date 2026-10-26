'use client';

import { use, Suspense } from 'react';
import Link from 'next/link';
import { RESEP_MAP, BAHAN_MAP } from '../../../lib/data/dataset';

function ResepDetailContent({
  params,
}: {
  params: Promise<{ kode: string }>;
}) {
  const resolvedParams = use(params);
  const kode = resolvedParams.kode;
  const resep = RESEP_MAP.get(kode);

  if (!resep) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-xl font-bold text-stone-800">Resep Tidak Ditemukan</h1>
        <p className="text-sm text-stone-500">Kode resep {kode} tidak ada dalam database TKPI.</p>
        <Link href="/menu" className="text-sm font-bold text-emerald-700 underline">
          Kembali ke Menu
        </Link>
      </div>
    );
  }

  const gizi = resep.gizi_per_porsi;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div>
        <Link
          href="/menu"
          className="text-xs font-bold text-stone-500 hover:text-stone-800 transition flex items-center gap-1 mb-3 min-h-[44px]"
        >
          ← Kembali ke Menu
        </Link>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
            {resep.kategori}
          </span>
          <span className="px-3 py-1 rounded-full bg-stone-100 text-stone-700 text-xs font-medium">
            {resep.porsi_standar}
          </span>
          <span className="px-3 py-1 rounded-full bg-stone-100 text-stone-700 text-xs font-medium">
            Kode: {resep.kode}
          </span>
        </div>
        <h1 className="text-3xl font-black text-stone-900 tracking-tight">{resep.nama}</h1>
        <p className="text-stone-600 text-sm mt-1">{resep.keterangan}</p>
      </div>

      {/* Peringatan Keamanan Jika Ada */}
      {resep.catatan_keamanan && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs leading-relaxed flex items-start gap-2.5">
          <span className="text-xl">⚠️</span>
          <div>
            <strong className="block font-bold">Catatan Keamanan Produk:</strong>
            {resep.catatan_keamanan}
          </div>
        </div>
      )}

      {/* Ringkasan Gizi & Biaya per Porsi */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs">
          <span className="text-stone-400 font-semibold block">Energi</span>
          <strong className="text-lg text-stone-900 block mt-0.5">{gizi.energi_kcal} kkal</strong>
          <span className="text-[10px] text-stone-400">per 1 porsi dasar</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs">
          <span className="text-stone-400 font-semibold block">Protein</span>
          <strong className="text-lg text-emerald-800 block mt-0.5">{gizi.protein_g} gram</strong>
          <span className="text-[10px] text-stone-400">per 1 porsi dasar</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs">
          <span className="text-stone-400 font-semibold block">Zat Besi</span>
          <strong className="text-lg text-stone-900 block mt-0.5">{gizi.zat_besi_mg} mg</strong>
          <span className="text-[10px] text-stone-400">pencegah anemia</span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 shadow-2xs">
          <span className="text-emerald-700 font-semibold block">Estimasi Biaya</span>
          <strong className="text-lg text-emerald-950 block mt-0.5">
            Rp {resep.biaya_per_porsi_rp.toLocaleString('id-ID')}
          </strong>
          <span className="text-[10px] text-emerald-700">1 porsi standar</span>
        </div>
      </div>

      {/* Bahan-Bahan & Takaran */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <h2 className="text-lg font-black text-stone-900">Bahan untuk 1 Porsi Standar</h2>
          <span className="text-xs text-stone-400 font-medium">Data TKPI Kemenkes</span>
        </div>

        <div className="divide-y divide-stone-100 text-xs">
          {resep.bahan.map((b, idx) => {
            const detailBahan = BAHAN_MAP.get(b.kode_tkpi);
            return (
              <div key={idx} className="py-2.5 flex items-center justify-between gap-2">
                <div>
                  <strong className="text-stone-900 font-bold">{detailBahan?.nama || b.kode_tkpi}</strong>
                  <span className="text-[10px] text-stone-400 block mt-0.5">
                    Kode TKPI: {b.kode_tkpi} · BDD: {detailBahan?.bdd_percent || 100}%
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-stone-800 text-sm">{b.jumlah_gram} g</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-3 border-t border-stone-100">
          <span className="text-stone-400 text-xs font-bold uppercase tracking-wider block mb-1.5">
            Alergen Terdeteksi:
          </span>
          {resep.alergen.length === 0 ? (
            <span className="text-xs text-emerald-700 font-medium">
              ✓ Bebas dari 8 alergen utama
            </span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {resep.alergen.map((a) => (
                <span
                  key={a}
                  className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold"
                >
                  ⚠️ Mengandung {a}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rincian Lengkap Zat Gizi */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-4">
        <h2 className="text-lg font-black text-stone-900">Rincian Lengkap Kandungan Gizi</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-stone-700">
          <div className="p-3 bg-stone-50 rounded-xl">
            <span className="text-stone-400 block">Kalsium</span>
            <strong className="text-stone-900 text-sm">{gizi.kalsium_mg} mg</strong>
          </div>
          <div className="p-3 bg-stone-50 rounded-xl">
            <span className="text-stone-400 block">Seng (Zinc)</span>
            <strong className="text-stone-900 text-sm">{gizi.seng_mg} mg</strong>
          </div>
          <div className="p-3 bg-stone-50 rounded-xl">
            <span className="text-stone-400 block">Vitamin A (RE)</span>
            <strong className="text-stone-900 text-sm">{gizi.vitamin_a_mcg} mcg</strong>
          </div>
          <div className="p-3 bg-stone-50 rounded-xl">
            <span className="text-stone-400 block">Retinol Murni</span>
            <strong className="text-stone-900 text-sm">{gizi.retinol_mcg || 0} mcg</strong>
          </div>
          <div className="p-3 bg-stone-50 rounded-xl">
            <span className="text-stone-400 block">Lemak</span>
            <strong className="text-stone-900 text-sm">{gizi.lemak_g || 0} g</strong>
          </div>
          <div className="p-3 bg-stone-50 rounded-xl">
            <span className="text-stone-400 block">Karbohidrat</span>
            <strong className="text-stone-900 text-sm">{gizi.karbohidrat_g || 0} g</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResepDetailPage(props: { params: Promise<{ kode: string }> }) {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto px-4 py-16 text-center text-stone-500">Memuat detail resep...</div>}>
      <ResepDetailContent params={props.params} />
    </Suspense>
  );
}
