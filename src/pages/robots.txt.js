// Превью (CONFIG.preview = true): всё закрыто. Боевой robots — public/robots-production.txt (ТЗ 10.1).
import { CONFIG } from '../config.js';
import { site } from '../lib/pages.js';
export function GET() {
  const body = CONFIG.preview
    ? `# Превью на GitHub Pages — не индексировать (ТЗ, раздел 0, правило 7)\nUser-agent: *\nDisallow: /\n`
    : `User-agent: *\nAllow: /\n\nSitemap: ${site()}sitemap.xml\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
