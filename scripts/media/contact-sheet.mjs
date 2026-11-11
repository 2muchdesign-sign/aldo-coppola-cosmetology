// Контактный лист: превью всех кадров папки с подписями-именами файлов (для отбора фото).
// node scripts/media/contact-sheet.mjs <папка> <выход.jpg>
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const [dir, out] = process.argv.slice(2);
const files = fs.readdirSync(dir).filter(f => /\.jpe?g$/i.test(f)).sort();
const W = 300, H = 200, COLS = 6, PAD = 6, LBL = 22;
const rows = Math.ceil(files.length / COLS);
const tiles = await Promise.all(files.map(async (f, i) => {
  const img = await sharp(path.join(dir, f)).rotate().resize(W, H, { fit: 'cover' }).jpeg({ quality: 70 }).toBuffer();
  const label = Buffer.from(`<svg width="${W}" height="${LBL}"><rect width="100%" height="100%" fill="#2E2E30"/><text x="6" y="16" font-family="Menlo" font-size="13" fill="#fff">${i + 1}. ${f}</text></svg>`);
  const x = (i % COLS) * (W + PAD), y = Math.floor(i / COLS) * (H + LBL + PAD);
  return [{ input: img, left: x, top: y }, { input: label, left: x, top: y + H }];
}));
await sharp({ create: { width: COLS * (W + PAD), height: rows * (H + LBL + PAD), channels: 3, background: '#ffffff' } })
  .composite(tiles.flat()).jpeg({ quality: 72 }).toFile(out);
console.log(out, files.length);
