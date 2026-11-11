// Обработка медиа по data/media.yaml (ТЗ, раздел 8):
//  фото → WebP 640/1024/1600 + JPG 1024/1600 (запасной), до ~400 КБ;
//  видео → MP4 H.264 без звука, faststart, до ~8 МБ (+ 720p для телефона, если исходник больше) и постер WebP/JPG.
// Результат: public/media/img, public/media/video и src/lib/media-manifest.json.
// Запуск: PATH="$HOME/.local/node/bin:$PATH" node scripts/media/process-media.mjs [--force]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import yaml from 'js-yaml';
import ffmpeg from 'ffmpeg-static';

import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC_BASE = path.resolve(ROOT, '..');                       // папка «Claude Code»
const IMG = path.join(ROOT, 'public/media/img'), VID = path.join(ROOT, 'public/media/video');
const FORCE = process.argv.includes('--force');
const WEBP_W = [640, 1024, 1600], JPG_W = [1024, 1600], MAX_KB = 400, MAX_VIDEO_MB = 8;
fs.mkdirSync(IMG, { recursive: true }); fs.mkdirSync(VID, { recursive: true });

const cfg = yaml.load(fs.readFileSync(path.join(ROOT, 'data/media.yaml'), 'utf8'));
const manifest = { images: {}, videos: {} };
const report = [];
const kb = f => Math.round(fs.statSync(f).size / 1024);
const fresh = (out, src) => !FORCE && fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs;
const slugOf = src => path.basename(src).replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9-]+/g, '-');

async function photo(src, name) {
  const abs = path.join(SRC_BASE, src);
  const meta = await sharp(abs).rotate().metadata();
  const w0 = meta.autoOrient?.width || meta.width, h0 = meta.autoOrient?.height || meta.height;
  const widths = WEBP_W.filter(w => w <= w0).concat(w0 < WEBP_W[0] ? [w0] : []);
  for (const w of widths) {
    const out = path.join(IMG, `${name}-${w}.webp`);
    if (!fresh(out, abs)) {
      let q = 74;
      do { await sharp(abs).rotate().resize({ width: w }).webp({ quality: q, effort: 5 }).toFile(out); q -= 8; } while (kb(out) > MAX_KB && q > 40);
    }
  }
  const jw = JPG_W.filter(w => w <= w0); if (!jw.length) jw.push(w0);
  for (const w of jw) {
    const out = path.join(IMG, `${name}-${w}.jpg`);
    if (!fresh(out, abs)) {
      let q = 78;
      do { await sharp(abs).rotate().resize({ width: w }).jpeg({ quality: q, mozjpeg: true, progressive: true }).toFile(out); q -= 8; } while (kb(out) > MAX_KB && q > 45);
    }
  }
  const largest = path.join(IMG, `${name}-${widths.at(-1)}.webp`);
  report.push(`${name}: ${w0}×${h0} → webp ${widths.join('/')} (${kb(largest)} КБ макс.)`);
  return { base: `img/${name}`, webp: widths, jpg: jw, ratio: +(w0 / h0).toFixed(4) };
}

for (const [key, list] of Object.entries(cfg.images || {})) {
  manifest.images[key] = [];
  for (const it of list) {
    const name = `${slugOf(it.src)}`;
    const p = await photo(it.src, name);
    manifest.images[key].push({ ...p, alt: it.alt, caption: it.caption || null });
  }
}

for (const [key, v] of Object.entries(cfg.videos || {})) {
  const abs = path.join(SRC_BASE, v.src);
  const name = key.replace(/^tour-/, 'tour-');
  const out = path.join(VID, `${name}.mp4`), outM = path.join(VID, `${name}-720.mp4`);
  const probe = await (async () => { try { execFileSync(ffmpeg, ['-i', abs], { stdio: 'pipe' }); } catch (e) { return String(e.stderr); } })();
  const m = /(\d{3,4})x(\d{3,4})/.exec(probe.split('Video:')[1] || ''); const W = m ? +m[1] : 1280;
  const dur = /Duration: (\d+):(\d+):([\d.]+)/.exec(probe); const secs = dur ? +dur[1] * 3600 + +dur[2] * 60 + +dur[3] : 60;
  const encode = (dst, width, crf) => execFileSync(ffmpeg, ['-y', '-i', abs, '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(crf),
    '-vf', `scale='min(${width},iw)':-2,fps=30`, '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-profile:v', 'high', dst], { stdio: 'pipe' });
  if (!fresh(out, abs)) {
    let crf = 26; encode(out, 1280, crf);
    while (kb(out) > MAX_VIDEO_MB * 1024 && crf < 34) { crf += 3; encode(out, 1280, crf); }
  }
  let mobile = null;
  if (W > 720) { if (!fresh(outM, abs)) encode(outM, 720, 28); mobile = `video/${name}-720.mp4`; }
  const poster = await photo(v.poster, `${name}-poster`);
  manifest.videos[key] = { video: `video/${name}.mp4`, mobile, poster, alt: v.alt, seconds: Math.round(secs) };
  report.push(`${name}: ${W}px, ${Math.round(secs)} с → ${(kb(out) / 1024).toFixed(1)} МБ${mobile ? `, 720p ${(kb(outM) / 1024).toFixed(1)} МБ` : ''}`);
}

fs.writeFileSync(path.join(ROOT, 'src/lib/media-manifest.json'), JSON.stringify(manifest, null, 1));
console.log(report.join('\n'));
