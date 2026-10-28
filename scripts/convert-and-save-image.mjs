import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const sourcePath = 'C:\\Users\\dell\\.gemini\\antigravity\\brain\\32c70616-315c-4caa-9f06-606fa46465f7\\sayur_bening_bayam_jagung_1793184562545.jpg';
  const targetDir = path.resolve('public', 'images', 'resep');
  const targetWebp = path.join(targetDir, 'sayur-bening-bayam-jagung.webp');
  const dbImageUrl = '/images/resep/sayur-bening-bayam-jagung.webp';

  console.log('Source:', sourcePath);
  console.log('Target:', targetWebp);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source file not found: ${sourcePath}`);
  }

  // 1. Convert to .webp using sharp
  const info = await sharp(sourcePath)
    .resize(800, 600, { fit: 'cover' })
    .webp({ quality: 85, effort: 6 })
    .toFile(targetWebp);

  console.log('Converted to WebP successfully:', info);

  const originalSize = fs.statSync(sourcePath).size;
  const webpSize = fs.statSync(targetWebp).size;
  console.log(`Original size: ${(originalSize / 1024).toFixed(1)} KB`);
  console.log(`WebP size: ${(webpSize / 1024).toFixed(1)} KB (hemat ${(((originalSize - webpSize) / originalSize) * 100).toFixed(1)}%)`);

  // 2. Update Resep RSP013 in Database
  const updatedResep = await prisma.resep.update({
    where: { kode_resep: 'RSP013' },
    data: { image_url: dbImageUrl },
  });

  console.log('Updated database record for RSP013:', updatedResep);
}

main()
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
