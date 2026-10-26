'use client';

import { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import { MenuHari, ResepMasakan, RencanaMenu7Hari } from '../../../../../lib/types';
import { getStoredMenu, getStoredAnggota, saveStoredMenu } from '../../../../../lib/store';
import { cariPenggantiHidangan } from '../../../../../lib/planner/swap';

function DetailHariContent({
  params,
}: {
  params: Promise<{ id: string; n: string }>;
}) {
  const resolvedParams = use(params);
  const hariIndex = parseInt(resolvedParams.n, 10);

  const [rencanaMenu, setRencanaMenu] = useState<RencanaMenu7Hari | null>(null);
  const [hari, setHari] = useState<MenuHari | null>(null);
  const [selectedAnggotaTab, setSelectedAnggotaTab] = useState<string>('');
  const [bukaRumus, setBukaRumus] = useState(false);
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [resepTargetSwap, setResepTargetSwap] = useState<ResepMasakan | null>(null);
  const [sesiTargetSwap, setSesiTargetSwap] = useState<'pagi' | 'siang' | 'malam'>('pagi');

  useEffect(() => {
    const m = getStoredMenu();
    setRencanaMenu(m);
    const targetHari = m.hari.find((h) => h.hari_ke === hariIndex) || m.hari[0];
    setHari(targetHari);
    if (targetHari && targetHari.skor_keluarga.skor_per_anggota.length > 0) {
      setSelectedAnggotaTab(targetHari.skor_keluarga.skor_per_anggota[0].anggota_id);
    }
  }, [hariIndex]);

  const handleOpenSwap = (resep: ResepMasakan, sesi: 'pagi' | 'siang' | 'malam') => {
    setResepTargetSwap(resep);
    setSesiTargetSwap(sesi);
    setSwapModalOpen(true);
  };

  const handleApplySwap = (resepBaru: ResepMasakan) => {
    if (!rencanaMenu || !hari || !resepTargetSwap) return;

    const updatedSesi = { ...hari.sesi_makan[sesiTargetSwap] };
    updatedSesi.hidangan = updatedSesi.hidangan.map((h) =>
      h.kode === resepTargetSwap.kode ? resepBaru : h
    );

    const updatedHari: MenuHari = {
      ...hari,
      sesi_makan: {
        ...hari.sesi_makan,
        [sesiTargetSwap]: updatedSesi,
      },
    };

    const updatedRencana: RencanaMenu7Hari = {
      ...rencanaMenu,
      hari: rencanaMenu.hari.map((h) => (h.hari_ke === hari.hari_ke ? updatedHari : h)),
    };

    saveStoredMenu(updatedRencana);
    setRencanaMenu(updatedRencana);
    setHari(updatedHari);
    setSwapModalOpen(false);
    setResepTargetSwap(null);
  };

  if (!hari || !rencanaMenu) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-stone-500">Memuat detail hari...</div>;
  }

  const anggotaList = getStoredAnggota();
  const skorKeluarga = hari.skor_keluarga;
  const activeSkorAnggota = skorKeluarga.skor_per_anggota.find(
    (s) => s.anggota_id === selectedAnggotaTab
  );

  const sesiList = [
    { key: 'pagi' as const, sesi: hari.sesi_makan.pagi, icon: '🌅', label: 'Sarapan Pagi (30%)' },
    { key: 'siang' as const, sesi: hari.sesi_makan.siang, icon: '☀️', label: 'Makan Siang (40%)' },
    { key: 'malam' as const, sesi: hari.sesi_makan.malam, icon: '🌙', label: 'Makan Malam (30%)' },
  ];

  const opsiSwap = resepTargetSwap ? cariPenggantiHidangan(resepTargetSwap, anggotaList, 0) : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Breadcrumb & Navigation antar hari */}
      <div className="flex items-center justify-between">
        <Link
          href="/menu"
          className="text-xs font-bold text-stone-500 hover:text-stone-800 transition flex items-center gap-1 min-h-[44px]"
        >
          ← Kembali ke Ringkasan 7 Hari
        </Link>

        <div className="flex items-center gap-2">
          {hariIndex > 1 && (
            <Link
              href={`/menu/${rencanaMenu.id}/hari/${hariIndex - 1}`}
              className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-xs font-bold text-stone-700 transition"
            >
              ← Hari {hariIndex - 1}
            </Link>
          )}
          {hariIndex < 7 && (
            <Link
              href={`/menu/${rencanaMenu.id}/hari/${hariIndex + 1}`}
              className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-xs font-bold text-stone-700 transition"
            >
              Hari {hariIndex + 1} →
            </Link>
          )}
        </div>
      </div>

      {/* Header Hari */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
              Detail Menu & Porsi
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 mt-0.5">
              {hari.label_hari} (Hari ke-{hari.hari_ke})
            </h1>
            <p className="text-stone-500 text-xs sm:text-sm mt-1">
              Estimasi Biaya Hari Ini: <strong>Rp {hari.total_biaya_hari_rp.toLocaleString('id-ID')}</strong> ·
              Skor Kecukupan Keluarga:{' '}
              <strong className="text-emerald-700">{skorKeluarga.skor_rata_rata}%</strong>
            </p>
          </div>

          <Link
            href={`/belanja/${rencanaMenu.id}`}
            className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 transition min-h-[44px] flex items-center gap-1.5"
          >
            <span>🛒</span> Buka Daftar Belanja
          </Link>
        </div>
      </div>

      {/* 3 Sesi Makan (Pagi, Siang, Malam) & Takaran Porsi */}
      <div className="space-y-6">
        <h2 className="text-xl font-black text-stone-900 tracking-tight">
          3 Waktu Makan & Takaran per Anggota
        </h2>

        {sesiList.map(({ key, sesi, icon, label }) => (
          <div
            key={key}
            className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-2xs space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{icon}</span>
                <h3 className="font-extrabold text-lg text-stone-900">{label}</h3>
              </div>
              <span className="text-xs text-stone-400 font-medium">
                Energi Dasar: {sesi.total_energi_standar_kcal} kkal
              </span>
            </div>

            {/* Hidangan yang dimasak */}
            <div className="space-y-2">
              <span className="text-stone-400 text-xs font-bold uppercase tracking-wider block">
                Menu yang Dimasak Ibu:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sesi.hidangan.map((h) => (
                  <div
                    key={h.kode}
                    className="p-3.5 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-between text-xs gap-2"
                  >
                    <div>
                      <Link
                        href={`/resep/${h.kode}`}
                        className="font-extrabold text-stone-900 hover:text-emerald-700 hover:underline block"
                      >
                        {h.nama} ↗
                      </Link>
                      <span className="text-stone-500 text-[11px] block mt-0.5">
                        {h.kategori} · {h.gizi_per_porsi.energi_kcal} kkal · Rp {h.biaya_per_porsi_rp.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenSwap(h, key)}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-stone-200 text-[11px] font-bold text-stone-600 hover:text-emerald-700 hover:bg-emerald-50 transition"
                      title="Ganti hidangan ini dengan alternatif lain"
                    >
                      Ganti ↺
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Takaran Porsi per Anggota Keluarga */}
            <div className="pt-2">
              <span className="text-stone-400 text-xs font-bold uppercase tracking-wider block mb-2">
                Takaran Porsi Setiap Anggota (Kelipatan 0.25):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {sesi.porsi_per_anggota.map((p) => (
                  <div
                    key={p.anggota_id}
                    className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-xs space-y-1"
                  >
                    <span className="font-bold text-emerald-950 block truncate">{p.alias}</span>
                    <div className="text-emerald-700 font-black text-sm">
                      {p.pengali}x porsi
                    </div>
                    <span className="text-[10px] text-emerald-800 block">
                      ~{p.gizi_diterima.energi_kcal} kkal
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Panel "Kenapa Menu Ini" */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xs space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <h2 className="text-xl font-black text-stone-900 tracking-tight">
              Kenapa Menu Ini? (Transparansi Kecukupan Gizi)
            </h2>
          </div>
          <p className="text-stone-500 text-xs sm:text-sm mt-1">
            Setiap angka asupan dapat ditelusuri langsung ke acuan AKG Permenkes No. 28 Tahun 2019.
          </p>
        </div>

        {/* Tab Pemilihan Anggota */}
        <div className="flex flex-wrap gap-2 border-b border-stone-100 pb-3">
          {skorKeluarga.skor_per_anggota.map((sa) => {
            const isSelected = sa.anggota_id === selectedAnggotaTab;
            return (
              <button
                key={sa.anggota_id}
                onClick={() => setSelectedAnggotaTab(sa.anggota_id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition min-h-[44px] flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <span>{sa.alias}</span>
                <span className={isSelected ? 'text-emerald-200' : 'text-stone-400'}>
                  ({sa.skor_rata_rata}%)
                </span>
              </button>
            );
          })}
        </div>

        {/* Detail Pemenuhan Gizi Anggota Terpilih */}
        {activeSkorAnggota && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500">
                Kelompok AKG: <strong>{activeSkorAnggota.kebutuhan.kelompok_usia}</strong>
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  activeSkorAnggota.status === 'tercukupi'
                    ? 'bg-emerald-100 text-emerald-800'
                    : activeSkorAnggota.status === 'hampir'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                Status: {activeSkorAnggota.status.toUpperCase()} ({activeSkorAnggota.skor_rata_rata}%)
              </span>
            </div>

            {/* Peringatan Keamanan Jika Ada */}
            {activeSkorAnggota.peringatan_keamanan && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                {activeSkorAnggota.peringatan_keamanan.map((p, idx) => (
                  <p key={idx}>⚠️ {p}</p>
                ))}
              </div>
            )}

            {/* Tabel 6 Zat Gizi Utama */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 uppercase tracking-wider font-bold">
                    <th className="py-2.5 px-3">Zat Gizi</th>
                    <th className="py-2.5 px-3 text-right">AKG Target</th>
                    <th className="py-2.5 px-3 text-right">Terpenuhi</th>
                    <th className="py-2.5 px-3 text-right">% AKG</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-800">
                  {Object.values(activeSkorAnggota.rincian_zat).map((z) => (
                    <tr key={z.zat} className="hover:bg-stone-50">
                      <td className="py-3 px-3 font-bold text-stone-900">
                        {z.zat} <span className="text-[10px] text-stone-400 font-normal">({z.satuan})</span>
                      </td>
                      <td className="py-3 px-3 text-right font-medium">
                        {z.kebutuhan} {z.satuan}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-900">
                        {z.terpenuhi} {z.satuan}
                      </td>
                      <td className="py-3 px-3 text-right font-black">
                        {z.persen}%
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            z.status === 'tercukupi'
                              ? 'bg-emerald-100 text-emerald-800'
                              : z.status === 'hampir'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {z.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Collapsible Rincian Rumus */}
            <div className="pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setBukaRumus(!bukaRumus)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
              >
                <span>{bukaRumus ? '▼ Sembunyikan' : '▶ Buka'}</span> Rincian Rumus & Metodologi Perhitungan
              </button>

              {bukaRumus && (
                <div className="mt-3 p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-600 space-y-2 leading-relaxed animate-fadeIn">
                  <p>
                    <strong>1. Rumus Pengali Porsi:</strong> Target Energi Sesi = Energi AKG × Fraksi Waktu
                    Makan (Pagi 30%, Siang 40%, Malam 30%). Pengali = Target Energi Sesi / Total Energi 1
                    Porsi Dasar Seluruh Hidangan (dibulatkan ke kelipatan 0,25 terdekat).
                  </p>
                  <p>
                    <strong>2. Rumus Skor Zat:</strong> Skor = min(Asupan / Kebutuhan AKG, 1.0). Skor di atas
                    100% dibatasi maksimal 1,0 agar kelebihan satu zat tidak menutupi kekurangan zat lain.
                  </p>
                  <p>
                    <strong>3. Skor Anggota:</strong> Rata-rata dari skor 6 zat gizi utama (Energi, Protein,
                    Zat Besi, Kalsium, Seng, Vitamin A).
                  </p>
                  <p>
                    <strong>4. Skor Keluarga:</strong> Rata-rata skor seluruh anggota keluarga. Skor anggota
                    terendah selalu ditampilkan agar transparansi gizi balita/lansia tetap terjaga.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Ganti Hidangan (FR-14 P1) */}
      {swapModalOpen && resepTargetSwap && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                  Ganti Hidangan
                </span>
                <h3 className="font-extrabold text-lg text-stone-900 mt-0.5">
                  Alternatif untuk {resepTargetSwap.nama}
                </h3>
              </div>
              <button
                onClick={() => setSwapModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-2 text-xl"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-500">
              Kandidat pengganti otomatis disaring: sekategori ({resepTargetSwap.kategori}), bebas dari
              alergen keluarga, dan aman dari batas retinol.
            </p>

            <div className="space-y-2.5">
              {opsiSwap.length === 0 ? (
                <div className="p-4 rounded-xl bg-stone-50 text-stone-500 text-xs text-center">
                  Tidak ada hidangan alternatif yang memenuhi syarat keamanan dan alergi saat ini.
                </div>
              ) : (
                opsiSwap.map((opt) => (
                  <div
                    key={opt.resep.kode}
                    className="p-3.5 rounded-2xl border border-stone-200 hover:border-emerald-500 transition flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <h4 className="font-extrabold text-stone-900">{opt.resep.nama}</h4>
                      <span className="text-stone-500 text-[11px] block mt-0.5">
                        {opt.resep.gizi_per_porsi.energi_kcal} kkal · Rp {opt.resep.biaya_per_porsi_rp.toLocaleString('id-ID')}
                        {opt.selisihBiayaRp !== 0 && (
                          <span
                            className={
                              opt.selisihBiayaRp > 0 ? 'text-amber-700 ml-1 font-bold' : 'text-emerald-700 ml-1 font-bold'
                            }
                          >
                            ({opt.selisihBiayaRp > 0 ? `+Rp ${opt.selisihBiayaRp}` : `-Rp ${Math.abs(opt.selisihBiayaRp)}`})
                          </span>
                        )}
                      </span>
                    </div>

                    <button
                      onClick={() => handleApplySwap(opt.resep)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition min-h-[44px]"
                    >
                      Pilih
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DetailHariPage(props: { params: Promise<{ id: string; n: string }> }) {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-4 py-16 text-center text-stone-500">Memuat detail hari...</div>}>
      <DetailHariContent params={props.params} />
    </Suspense>
  );
}
