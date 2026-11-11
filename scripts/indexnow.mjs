// IndexNow (Яндекс, Bing): уведомить поисковики об изменённых страницах после пересборки каталога (ТЗ 10.1).
// Только для боевого домена. Нужен ключ: файл <KEY>.txt с этим ключом в корне сайта (aldocoppola.ru/<KEY>.txt).
// Запуск: INDEXNOW_KEY=xxxxxxxx SITE=https://aldocoppola.ru/kosmetologiya/ node scripts/indexnow.mjs
import fs from 'node:fs';
const KEY = process.env.INDEXNOW_KEY, SITE = process.env.SITE;
if (!KEY || !SITE) { console.error('Нужны INDEXNOW_KEY и SITE (боевой адрес). Превью на GitHub Pages не отправляем.'); process.exit(1); }
const xml = fs.readFileSync(new URL('../dist/sitemap.xml', import.meta.url), 'utf8');
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].replace(/^https?:\/\/[^/]+\/[^/]*\//, SITE));
const host = new URL(SITE).host;
const res = await fetch('https://yandex.com/indexnow', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key: KEY, keyLocation: `https://${host}/${KEY}.txt`, urlList: urls }) });
console.log(`IndexNow: ${res.status} ${res.statusText}, URL: ${urls.length}`);
