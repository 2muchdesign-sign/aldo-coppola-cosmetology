// sitemap.xml с lastmod по дате сборки каталога (цены и тексты обновляются вместе).
import { routes } from '../lib/routes.js';
import { site } from '../lib/pages.js';
export function GET() {
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes().map(r =>
    `  <url><loc>${site()}${r.path}</loc><lastmod>${r.lastmod}</lastmod><priority>${r.priority.toFixed(1)}</priority></url>`).join('\n')}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
