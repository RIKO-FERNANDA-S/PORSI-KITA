import { ItemDaftarBelanja, MenuHari, RencanaMenu7Hari } from '../types';
import { BAHAN_MAP } from '../data/dataset';

/**
 * Menghitung daftar belanja gabungan seluruh 7 hari (PRD 8.8 & FR-11).
 *
 * Rumus:
 * - Gram kotor (kebutuhan beli) = gram bersih / (BDD / 100)
 * - Subtotal = gram kotor / 100 * harga_per_100g
 */
export function buatDaftarBelanjaMingguan(menu7Hari: MenuHari[]): ItemDaftarBelanja[] {
  const akumulasiGram = new Map<string, number>();

  for (const hari of menu7Hari) {
    const sesiList = [hari.sesi_makan.pagi, hari.sesi_makan.siang, hari.sesi_makan.malam];

    for (const sesi of sesiList) {
      for (const hidangan of sesi.hidangan) {
        const totalPengali = sesi.porsi_per_anggota.reduce(
          (sum, p) => sum + p.pengali,
          0
        );

        for (const b of hidangan.bahan) {
          const current = akumulasiGram.get(b.kode_tkpi) || 0;
          akumulasiGram.set(b.kode_tkpi, current + b.jumlah_gram * totalPengali);
        }
      }
    }
  }

  const items: ItemDaftarBelanja[] = [];

  for (const [kodeTkpi, totalGramBersih] of akumulasiGram.entries()) {
    const bahan = BAHAN_MAP.get(kodeTkpi);
    if (!bahan) continue;

    const bddFactor = (bahan.bdd_percent > 0 ? bahan.bdd_percent : 100) / 100;
    const kebutuhanKotor = Math.ceil(totalGramBersih / bddFactor);
    const dibulatkanBeli = Math.ceil(kebutuhanKotor / 10) * 10;
    const estimasiBiaya = Math.round((dibulatkanBeli / 100) * bahan.harga_per_100g_rp);

    items.push({
      kode_tkpi: kodeTkpi,
      nama_bahan: bahan.nama,
      kategori: bahan.kategori,
      kebutuhan_bersih_gram: Math.round(totalGramBersih),
      bdd_percent: bahan.bdd_percent,
      kebutuhan_beli_gram: dibulatkanBeli,
      harga_per_100g_rp: bahan.harga_per_100g_rp,
      estimasi_biaya_rp: estimasiBiaya,
      dicentang: false,
    });
  }

  return items.sort((a, b) => a.kategori.localeCompare(b.kategori));
}

/**
 * Format teks WhatsApp siap kirim (PRD FR-11)
 */
export function formatTeksWhatsAppBelanja(
  rencana: RencanaMenu7Hari,
  daftarBelanja: ItemDaftarBelanja[]
): string {
  let teks = `🛒 *DAFTAR BELANJA PORSI KITA (7 HARI)*\n`;
  teks += `Keluarga: *${rencana.id}*\n`;
  teks += `Target Budget: Rp ${rencana.target_budget_mingguan_rp.toLocaleString('id-ID')}\n`;
  teks += `Estimasi Total: Rp ${rencana.total_biaya_mingguan_rp.toLocaleString('id-ID')}\n`;
  teks += `------------------------------------\n\n`;

  const perKategori = new Map<string, ItemDaftarBelanja[]>();
  for (const item of daftarBelanja) {
    const list = perKategori.get(item.kategori) || [];
    list.push(item);
    perKategori.set(item.kategori, list);
  }

  for (const [kategori, list] of perKategori.entries()) {
    teks += `📍 *${kategori.toUpperCase()}*\n`;
    for (const i of list) {
      const displayJumlah =
        i.kebutuhan_beli_gram >= 1000
          ? `${(i.kebutuhan_beli_gram / 1000).toFixed(1)} kg`
          : `${i.kebutuhan_beli_gram} gram`;
      teks += `◻ ${i.nama_bahan}: ${displayJumlah} (~Rp ${i.estimasi_biaya_rp.toLocaleString('id-ID')})\n`;
    }
    teks += `\n`;
  }

  teks += `Disusun otomatis oleh Porsi Kita · Satu menu keluarga, gizi tepat untuk setiap anggota.`;
  return teks;
}

/**
 * Membuat tautan WhatsApp wa.me untuk membagikan daftar belanja (PRD FR-11)
 */
export function buatTautanWhatsApp(
  rencana: RencanaMenu7Hari,
  daftarBelanja: ItemDaftarBelanja[]
): string {
  const teks = formatTeksWhatsAppBelanja(rencana, daftarBelanja);
  return `https://wa.me/?text=${encodeURIComponent(teks)}`;
}
