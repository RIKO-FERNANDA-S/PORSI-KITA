import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../lib/prisma';
import { GET, POST } from '../app/api/menu/route';
import { NextRequest } from 'next/server';

describe('API Menu 7 Hari & Database Upsert (Zero Data Accumulation)', () => {
  let testFamilyId: string;

  beforeAll(async () => {
    // Siapkan data keluarga uji coba
    const family = await prisma.family.create({
      data: {
        alias: 'Keluarga Uji Coba Menu DB',
        wilayah: 'Surabaya Timur',
        owner_id: '00000000-0000-0000-0000-000000000077',
        phone: '081299998888',
        budget_belanja: 2500000,
        budget_harian_rp: 80000,
      },
    });
    testFamilyId = family.id;
  });

  afterAll(async () => {
    // Bersihkan data keluarga dan meal_plans terkait
    if (testFamilyId) {
      await prisma.mealPlan.deleteMany({
        where: { family_id: testFamilyId },
      });
      await prisma.family.delete({
        where: { id: testFamilyId },
      });
    }
  });

  it('harus menyimpan rencana menu baru ke tabel meal_plans', async () => {
    const dummyMenu = {
      id: 'menu-test-1',
      family_id: testFamilyId,
      created_at: new Date().toISOString(),
      hari: [{ hari_ke: 1, label_hari: 'Kamis', total_biaya_hari_rp: 80000 }],
      total_biaya_mingguan_rp: 560000,
      budget_harian_rp: 80000,
    };

    const req = new NextRequest('http://localhost:3000/api/menu', {
      method: 'POST',
      body: JSON.stringify({
        menu: dummyMenu,
        total_biaya: 560000,
        family_id: testFamilyId,
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.meal_plan_id).toBeDefined();

    // Pastikan tepat ada 1 baris di tabel meal_plans
    const count = await prisma.mealPlan.count({
      where: { family_id: testFamilyId },
    });
    expect(count).toBe(1);
  });

  it('harus memperbarui baris yang ada saat generate ulang dan TIDAK MENUMPUK baris data', async () => {
    const updatedMenu = {
      id: 'menu-test-updated',
      family_id: testFamilyId,
      created_at: new Date().toISOString(),
      hari: [{ hari_ke: 1, label_hari: 'Jumat', total_biaya_hari_rp: 75000 }],
      total_biaya_mingguan_rp: 525000,
      budget_harian_rp: 75000,
    };

    const req = new NextRequest('http://localhost:3000/api/menu', {
      method: 'POST',
      body: JSON.stringify({
        menu: updatedMenu,
        total_biaya: 525000,
        family_id: testFamilyId,
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.total_biaya).toBe(525000);

    // Kunci utama: baris data tetap 1 (di-update), tidak bertambah menjadi 2
    const count = await prisma.mealPlan.count({
      where: { family_id: testFamilyId },
    });
    expect(count).toBe(1);

    // Verifikasi data terbaca via GET
    const getReq = new NextRequest(`http://localhost:3000/api/menu?family_id=${testFamilyId}`);
    const getRes = await GET(getReq);
    const getData = await getRes.json();

    expect(getRes.status).toBe(200);
    expect(getData.success).toBe(true);
    expect(getData.menu.id).toBe('menu-test-updated');
    expect(getData.total_biaya).toBe(525000);
  });
});
