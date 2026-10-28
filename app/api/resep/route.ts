import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    const recipes = await prisma.resep.findMany({
      orderBy: { kode_resep: 'asc' },
      select: {
        kode_resep: true,
        nama_resep: true,
        kategori: true,
        porsi: true,
        image_url: true,
      },
    });

    const imageMap: Record<string, string> = {};
    for (const r of recipes) {
      if (r.image_url) {
        imageMap[r.kode_resep] = r.image_url;
      }
    }

    return NextResponse.json({
      success: true,
      recipes,
      imageMap,
    });
  } catch (err: any) {
    console.error('Failed to get recipes:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
