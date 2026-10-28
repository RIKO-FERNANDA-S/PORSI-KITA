import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const recipes = await prisma.resep.findMany({
    orderBy: { kode_resep: 'asc' },
    select: {
      kode_resep: true,
      nama_resep: true,
      kategori: true,
      image_url: true,
    },
  });
  console.log(JSON.stringify(recipes, null, 2));
}

main().finally(() => prisma.$disconnect());
