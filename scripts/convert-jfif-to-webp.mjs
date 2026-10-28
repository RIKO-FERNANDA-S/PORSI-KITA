import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function convertJfifToWebp() {
  const targetDir = path.resolve('public', 'images', 'resep');

  if (!fs.existsSync(targetDir)) {
    throw new Error(`Directory tidak ditemukan: ${targetDir}`);
  }

  const allFiles = fs.readdirSync(targetDir);
  const jfifFiles = allFiles.filter((f) => f.toLowerCase().endsWith('.jfif'));

  console.log(`Ditemukan ${jfifFiles.length} file .jfif di ${targetDir}:\n`);

  if (jfifFiles.length === 0) {
    console.log('Tidak ada file .jfif yang perlu dikonversi.');
    return;
  }

  let totalOriginalSize = 0;
  let totalWebpSize = 0;
  const results = [];

  for (const file of jfifFiles) {
    const filePath = path.join(targetDir, file);
    const baseName = path.parse(file).name; // e.g. "RSP003"
    const webpFileName = `${baseName}.webp`;
    const webpPath = path.join(targetDir, webpFileName);

    const originalSize = fs.statSync(filePath).size;
    totalOriginalSize += originalSize;

    console.log(`Mengonversi ${file} -> ${webpFileName}...`);

    // Dapatkan metadata gambar sumber
    const metadata = await sharp(filePath).metadata();
    console.log(`  Format: ${metadata.format}, Dimensi asli: ${metadata.width}x${metadata.height}`);

    // Konversi ke .webp
    // Standar rasio landscape 4:3 (800x600) untuk tampilan card resep yang rapi dan konsisten
    await sharp(filePath)
      .resize(800, 600, {
        fit: 'cover',
        position: 'center',
      })
      .webp({
        quality: 85,
        effort: 5,
      })
      .toFile(webpPath);

    const webpSize = fs.statSync(webpPath).size;
    totalWebpSize += webpSize;

    // Verifikasi hasil file webp valid
    const webpMeta = await sharp(webpPath).metadata();
    if (webpMeta.format !== 'webp') {
      throw new Error(`Gagal konversi ${file}: format hasil bukan webp`);
    }

    // Hapus file .jfif setelah konversi berhasil
    fs.unlinkSync(filePath);

    // Update database resep jika baseName sesuai kode resep
    const dbImageUrl = `/images/resep/${webpFileName}`;
    try {
      const existing = await prisma.resep.findUnique({
        where: { kode_resep: baseName },
      });
      if (existing) {
        await prisma.resep.update({
          where: { kode_resep: baseName },
          data: { image_url: dbImageUrl },
        });
        console.log(`  Database record ${baseName} diselaraskan: ${dbImageUrl}`);
      }
    } catch (dbErr) {
      console.warn(`  Peringatan saat update DB untuk ${baseName}:`, dbErr.message);
    }

    const savedPercent = (((originalSize - webpSize) / originalSize) * 100).toFixed(1);
    console.log(`  ✔ Berhasil: ${(originalSize / 1024).toFixed(0)} KB -> ${(webpSize / 1024).toFixed(1)} KB (hemat ${savedPercent}%)\n`);

    results.push({
      file,
      webpFileName,
      originalKb: (originalSize / 1024).toFixed(1),
      webpKb: (webpSize / 1024).toFixed(1),
      savedPercent,
    });
  }

  const totalSavedPercent = (((totalOriginalSize - totalWebpSize) / totalOriginalSize) * 100).toFixed(1);
  console.log('='.repeat(50));
  console.log(`TOTAL KONVERSI SELESAI:`);
  console.log(`Total ukuran awal: ${(totalOriginalSize / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Total ukuran WebP: ${(totalWebpSize / 1024).toFixed(1)} KB (${(totalWebpSize / (1024 * 1024)).toFixed(2)} MB)`);
  console.log(`Penghematan storage: ${totalSavedPercent}%`);
  console.log('='.repeat(50));
}

convertJfifToWebp()
  .catch((err) => {
    console.error('Error saat konversi:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
