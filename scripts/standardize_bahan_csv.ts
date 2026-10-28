import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');

const bahanPath = path.join(DATA_DIR, 'bahan.csv');
const raw = fs.readFileSync(bahanPath, 'utf8');

const records = parse(raw, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
});

console.log(`Found ${records.length} bahan records`);

const cleanNumber = (val: string | undefined): string => {
  if (!val) return '0';
  return val.trim().replace(',', '.');
};

const outputLines: string[] = [];
outputLines.push(
  'Kode_TKPI,Nama_Bahan,Kategori,Kategori_Menu,Kondisi,Energi_kcal,Protein_g,Lemak_g,Karbohidrat_g,Kalsium_mg,Zat_Besi_mg,Seng_Zinc_mg,Vitamin_A_mcg,BDD_percent,Alergen,Sumber_Data,Tipe_Nilai,Status_Verifikasi'
);

records.forEach((row: any, index: number) => {
  const newCode = `BHN-${String(index + 1).padStart(3, '0')}`;
  const namaBahan = row.Nama_Bahan ? `"${row.Nama_Bahan.replace(/"/g, '""')}"` : '""';
  const kategori = row.Kategori || '';
  const kategoriMenu = row.Kategori_Menu || '';
  const kondisi = row.Kondisi || '';
  const energiKcal = cleanNumber(row.Energi_kcal);
  const proteinG = cleanNumber(row.Protein_g);
  const lemakG = cleanNumber(row.Lemak_g);
  const karbohidratG = cleanNumber(row.Karbohidrat_g);
  const kalsiumMg = cleanNumber(row.Kalsium_mg);
  const zatBesiMg = cleanNumber(row.Zat_Besi_mg);
  const sengZincMg = cleanNumber(row.Seng_Zinc_mg);
  const vitaminAMcg = cleanNumber(row.Vitamin_A_mcg);
  const bddPercent = cleanNumber(row.BDD_percent);
  const alergen = row.Alergen || '';
  const sumberData = row.Sumber_Data || '';
  const tipeNilai = row.Tipe_Nilai || '';
  const statusVerifikasi = row.Status_Verifikasi || '';

  outputLines.push(
    [
      newCode,
      namaBahan,
      kategori,
      kategoriMenu,
      kondisi,
      energiKcal,
      proteinG,
      lemakG,
      karbohidratG,
      kalsiumMg,
      zatBesiMg,
      sengZincMg,
      vitaminAMcg,
      bddPercent,
      alergen,
      sumberData,
      tipeNilai,
      statusVerifikasi,
    ].join(',')
  );
});

fs.writeFileSync(bahanPath, outputLines.join('\n') + '\n', 'utf8');
console.log('✅ bahan.csv successfully updated with BHN-001 to BHN-060 and dot decimals.');
