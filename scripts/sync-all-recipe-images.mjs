import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const RECIPES_CONFIG = [
  {
    kode: 'RSP001',
    slug: 'nasi-putih',
    localAiFile: 'C:\\Users\\dell\\.gemini\\antigravity\\brain\\32c70616-315c-4caa-9f06-606fa46465f7\\nasi_putih_1793185813704.jpg',
    fallbackUrl: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&w=800&q=80',
  },
  {
    kode: 'RSP002',
    slug: 'nasi-tim-ayam-bayam',
    fallbackUrl: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=800&q=80',
  },
  {
    kode: 'RSP003',
    slug: 'sup-ayam-sayuran',
    fallbackUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80',
  },
  {
    kode: 'RSP004',
    slug: 'hati-ayam-tumis-kecap',
    fallbackUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
  },
  {
    kode: 'RSP005',
    slug: 'telur-dadar-bayam',
    fallbackUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80',
  },
  {
    kode: 'RSP006',
    slug: 'pepes-ikan-kembung',
    fallbackUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80',
  },
  {
    kode: 'RSP007',
    slug: 'ikan-lele-goreng-kuning',
    fallbackUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80',
  },
  {
    kode: 'RSP008',
    slug: 'daging-sapi-tumis-wortel',
    fallbackUrl: 'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?auto=format&fit=crop&w=800&q=80',
  },
  {
    kode: 'RSP009',
    slug: 'tumis-tempe-kecap',
    fallbackUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
  },
  {
    kode: 'RSP010',
    slug: 'tahu-bacem',
    fallbackUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
  },
  {
    kode: 'RSP011',
    slug: 'perkedel-tahu-ayam',
    localAiFile: 'C:\\Users\\dell\\.gemini\\antigravity\\brain\\32c70616-315c-4caa-9f06-606fa46465f7\\perkedel_tahu_ayam_1793185829957.jpg',
    fallbackUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80',
  },
  {
    kode: 'RSP012',
    slug: 'tempe-goreng-tepung',
    fallbackUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
  },
  {
    kode: 'RSP013',
    slug: 'sayur-bening-bayam-jagung',
    localAiFile: 'C:\\Users\\dell\\.gemini\\antigravity\\brain\\32c70616-315c-4caa-9f06-606fa46465f7\\sayur_bening_bayam_jagung_1793184562545.jpg',
    fallbackUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80',
  },
  {
    kode: 'RSP014',
    slug: 'sayur-bening-daun-kelor',
    fallbackUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
  },
  {
    kode: 'RSP015',
    slug: 'tumis-kangkung-tauco',
    fallbackUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
  },
  {
    kode: 'RSP016',
    slug: 'sup-bening-wortel-dan-buncis',
    fallbackUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80',
  },
  {
    kode: 'RSP017',
    slug: 'tumis-bayam-tahu',
    fallbackUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
  },
  {
    kode: 'RSP018',
    slug: 'potongan-pisang-ambon',
    fallbackUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=800&q=80',
  },
  {
    kode: 'RSP019',
    slug: 'potongan-pepaya-segar',
    fallbackUrl: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=800&q=80',
  },
  {
    kode: 'RSP020',
    slug: 'susu-sapi-hangat',
    fallbackUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80',
  },
  {
    kode: 'RSP025',
    slug: 'bubur-tim-hati-ayam-kelor',
    fallbackUrl: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=800&q=80',
  },
];

async function downloadBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function main() {
  const outputDir = path.resolve('public', 'images', 'resep');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Starting image conversion and database update for ${RECIPES_CONFIG.length} recipes...`);

  for (const item of RECIPES_CONFIG) {
    const webpFilename = `${item.kode}.webp`;
    const targetPath = path.join(outputDir, webpFilename);
    const dbPath = `/images/resep/${webpFilename}`;

    try {
      let imageBuffer;
      if (item.localAiFile && fs.existsSync(item.localAiFile)) {
        console.log(`[AI Image] Converting local generated AI photo for ${item.kode} (${item.slug})...`);
        imageBuffer = fs.readFileSync(item.localAiFile);
      } else if (item.fallbackUrl) {
        console.log(`[Photo Asset] Fetching & optimizing photo for ${item.kode} (${item.slug})...`);
        imageBuffer = await downloadBuffer(item.fallbackUrl);
      }

      if (imageBuffer) {
        await sharp(imageBuffer)
          .resize(800, 600, { fit: 'cover' })
          .webp({ quality: 85, effort: 5 })
          .toFile(targetPath);

        const fileSizeKb = (fs.statSync(targetPath).size / 1024).toFixed(1);
        console.log(`  -> Saved ${webpFilename} (${fileSizeKb} KB)`);
      }

      // Update in PostgreSQL Database
      await prisma.resep.update({
        where: { kode_resep: item.kode },
        data: { image_url: dbPath },
      });

      console.log(`  -> DB Updated: ${item.kode} => ${dbPath}`);
    } catch (err) {
      console.error(`Error processing ${item.kode}:`, err.message);
    }
  }

  console.log('\nAll recipes successfully converted to WebP and pushed to database!');
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
