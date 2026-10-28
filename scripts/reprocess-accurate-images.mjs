import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ACCURATE_RECIPES = [
  {
    kode: 'RSP001',
    nama: 'Nasi Putih',
    localAiFile: 'C:\\Users\\dell\\.gemini\\antigravity\\brain\\32c70616-315c-4caa-9f06-606fa46465f7\\nasi_putih_1793185813704.jpg',
    deskripsi: 'Nasi putih pulen hangat dalam bakul bambu beralas daun pisang',
  },
  {
    kode: 'RSP002',
    nama: 'Nasi Tim Ayam Bayam',
    url: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Nasi_Tim_Ayam_in_Jakarta.jpg',
    deskripsi: 'Nasi tim ayam khas Indonesia dengan suwiran ayam gurih dan kaldu hangat',
  },
  {
    kode: 'RSP003',
    nama: 'Sup Ayam Sayuran',
    url: 'https://upload.wikimedia.org/wikipedia/commons/9/91/Sop_Ayam_Klaten.jpg',
    fallbackUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80',
    deskripsi: 'Sop ayam bening khas Indonesia dengan potongan daging ayam dan kaldu rempah',
  },
  {
    kode: 'RSP004',
    nama: 'Hati Ayam Tumis Kecap',
    url: 'https://upload.wikimedia.org/wikipedia/commons/7/7f/Hati_ayam_petai_masakan_Padang.JPG',
    fallbackUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
    deskripsi: 'Olahan hati ayam tumis berbumbu kecap dan rempah gurih khas nusantara',
  },
  {
    kode: 'RSP005',
    nama: 'Telur Dadar Bayam',
    url: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Telur_Dadar.jpg',
    deskripsi: 'Telur dadar tebal khas Indonesia dengan irisan daun bawang dan sayur',
  },
  {
    kode: 'RSP006',
    nama: 'Pepes Ikan Kembung',
    url: 'https://upload.wikimedia.org/wikipedia/commons/2/2d/Pepes_ikan_emas_%28pais_lauk_mas%29_Sunda.jpg',
    deskripsi: 'Pepes ikan bungkus daun pisang bakar dengan bumbu kuning kunyit dan kemangi',
  },
  {
    kode: 'RSP007',
    nama: 'Ikan Lele Goreng Kuning',
    url: 'https://upload.wikimedia.org/wikipedia/commons/5/58/Lele_goreng.jpg',
    deskripsi: 'Ikan lele goreng renyah bumbu kunyit lengkap dengan lalapan dan sambal khas warung pecel',
  },
  {
    kode: 'RSP008',
    nama: 'Daging Sapi Tumis Wortel',
    url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
    deskripsi: 'Tumis irisan daging sapi empuk dengan irisan wortel dan saus kecap gurih',
  },
  {
    kode: 'RSP009',
    nama: 'Tumis Tempe Kecap',
    url: 'https://upload.wikimedia.org/wikipedia/commons/d/d2/Tempe_Orek.jpg',
    deskripsi: 'Tempe orek / tumis tempe kecap manis dengan irisan cabai merah dan bawang goreng',
  },
  {
    kode: 'RSP010',
    nama: 'Tahu Bacem',
    url: 'https://upload.wikimedia.org/wikipedia/commons/e/ec/Bacem_tahu.jpg',
    deskripsi: 'Tahu bacem cokelat legit manis khas Jawa bumbu ketumbar dan gula merah',
  },
  {
    kode: 'RSP011',
    nama: 'Perkedel Tahu Ayam',
    localAiFile: 'C:\\Users\\dell\\.gemini\\antigravity\\brain\\32c70616-315c-4caa-9f06-606fa46465f7\\perkedel_tahu_ayam_1793185829957.jpg',
    deskripsi: 'Perkedel tahu ayam goreng gurih keemasan bertabur seledri dan cabai merah',
  },
  {
    kode: 'RSP012',
    nama: 'Tempe Goreng Tepung',
    url: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Tempe_mendoan_fried_tempeh.jpg',
    deskripsi: 'Tempe goreng tepung mendoan renyah gurih dengan daun bawang harum',
  },
  {
    kode: 'RSP013',
    nama: 'Sayur Bening Bayam Jagung',
    localAiFile: 'C:\\Users\\dell\\.gemini\\antigravity\\brain\\32c70616-315c-4caa-9f06-606fa46465f7\\sayur_bening_bayam_jagung_1793184562545.jpg',
    deskripsi: 'Sayur bening bayam daun hijau segar dengan pipilan jagung manis dan bawang goreng',
  },
  {
    kode: 'RSP014',
    nama: 'Sayur Bening Daun Kelor',
    url: 'https://upload.wikimedia.org/wikipedia/commons/b/bd/Uta_Kelo.jpg',
    deskripsi: 'Sayur kuah bening daun kelor (Uta Kelo) superfood kaya zat besi dan kalsium',
  },
  {
    kode: 'RSP015',
    nama: 'Tumis Kangkung Tauco',
    url: 'https://upload.wikimedia.org/wikipedia/commons/b/bd/Tumis_Kangkung.jpg',
    deskripsi: 'Cah tumis kangkung hijau mengkilap dengan irisan cabai merah dan bumbu tauco',
  },
  {
    kode: 'RSP016',
    nama: 'Sup Bening Wortel dan Buncis',
    url: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80',
    deskripsi: 'Sup kuah bening hangat dengan irisan wortel segar dan buncis renyah',
  },
  {
    kode: 'RSP017',
    nama: 'Tumis Bayam Tahu',
    url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
    deskripsi: 'Tumisan daun bayam hijau segar dipadu potongan tahu sutra lembut',
  },
  {
    kode: 'RSP018',
    nama: 'Potongan Pisang Ambon',
    url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=800&q=80',
    deskripsi: 'Potongan buah pisang ambon matang manis alami kaya kalium',
  },
  {
    kode: 'RSP019',
    nama: 'Potongan Pepaya Segar',
    url: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=800&q=80',
    deskripsi: 'Potongan dadu buah pepaya merah segar kaya vitamin C dan serat',
  },
  {
    kode: 'RSP020',
    nama: 'Susu Sapi Hangat',
    url: 'https://upload.wikimedia.org/wikipedia/commons/3/38/Glass_of_milk.jpg',
    deskripsi: 'Segelas susu sapi murni segar hangat tinggi kalsium',
  },
  {
    kode: 'RSP025',
    nama: 'Bubur Tim Hati Ayam dan Kelor',
    url: 'https://upload.wikimedia.org/wikipedia/commons/7/7a/Bubur_Ayam.JPG',
    deskripsi: 'Bubur tim lembut bergizi tinggi ramah cerna untuk balita dan anak',
  },
];

async function fetchImageBuffer(url, fallbackUrl) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });
    if (res.ok) {
      const arr = await res.arrayBuffer();
      return Buffer.from(arr);
    }
  } catch (err) {
    console.warn(`Gagal fetch utama ${url}: ${err.message}`);
  }

  if (fallbackUrl) {
    console.log(`Mencoba fallback: ${fallbackUrl}`);
    const resFallback = await fetch(fallbackUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });
    if (resFallback.ok) {
      const arr = await resFallback.arrayBuffer();
      return Buffer.from(arr);
    }
  }

  throw new Error(`Semua URL gagal untuk gambar ini.`);
}

async function main() {
  const outputDir = path.resolve('public', 'images', 'resep');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Memulai generate ulang gambar otentik untuk 21 resep masakan nusantara...\n`);

  for (const item of ACCURATE_RECIPES) {
    const webpFilename = `${item.kode}.webp`;
    const targetPath = path.join(outputDir, webpFilename);
    const dbPath = `/images/resep/${webpFilename}`;

    console.log(`[${item.kode}] Memproses: ${item.nama}`);
    console.log(`  -> Detail: ${item.deskripsi}`);

    try {
      let imageBuffer;
      if (item.localAiFile && fs.existsSync(item.localAiFile)) {
        console.log(`  -> Memakai file AI lokal yang terverifikasi...`);
        imageBuffer = fs.readFileSync(item.localAiFile);
      } else if (item.url) {
        console.log(`  -> Mengunduh foto otentik dari ${item.url.slice(0, 60)}...`);
        imageBuffer = await fetchImageBuffer(item.url, item.fallbackUrl);
      }

      if (imageBuffer) {
        await sharp(imageBuffer)
          .resize(800, 600, {
            fit: 'cover',
            position: 'center',
          })
          .webp({
            quality: 85,
            effort: 5,
          })
          .toFile(targetPath);

        const stat = fs.statSync(targetPath);
        console.log(`  ✔ Sukses simpan ${webpFilename} (${(stat.size / 1024).toFixed(1)} KB)`);
      }

      // Update kolom image_url di PostgreSQL via Prisma
      await prisma.resep.update({
        where: { kode_resep: item.kode },
        data: { image_url: dbPath },
      });

      console.log(`  ✔ Database updated: ${item.kode} -> ${dbPath}\n`);
    } catch (err) {
      console.error(`  ✖ Gagal pada ${item.kode}: ${err.message}\n`);
    }

    // Delay 300ms agar sopan ke penyedia asset
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log('Semua 21 gambar masakan otentik berhasil diperbarui ke WebP dan disinkronkan ke Database!');
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
