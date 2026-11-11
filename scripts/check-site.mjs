// Автотест собранного сайта (dist/) по критериям приёмки ТЗ (раздел 14) и SEO (раздел 10).
// Запуск: PATH="$HOME/.local/node/bin:$PATH" node scripts/check-site.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : f === 'index.html' && files.push(p); } })(DIST);
const rel = f => '/' + path.relative(DIST, path.dirname(f)).replace(/\\/g, '/');
const errs = [], warn = [], stat = { pages: 0, ld: 0 };
const E = (f, m) => errs.push(`${rel(f)}: ${m}`);

const visible = html => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ');
const UNCONFIRMED = ['Harmony XL', 'MERMAID', 'Gezatone', 'Skin Master', 'Friendly Light', 'Medozons', 'Ксенонотерапия', 'LumiCell'];
const NEED = { // тип страницы → обязательные типы JSON-LD (ТЗ 10.3)
  procedure: ['MedicalWebPage', 'MedicalProcedure', 'Service', 'FAQPage', 'Offer'], goal: ['MedicalWebPage', 'ItemList', 'FAQPage'],
  device: ['Product'], salon: ['MedicalClinic', 'BeautySalon'], price: ['OfferCatalog'],
};
const kind = r => /^\/procedury\/./.test(r) ? 'procedure' : /^\/celi\/./.test(r) ? 'goal' : /^\/apparaty\/./.test(r) ? 'device' : /^\/salony\/./.test(r) ? 'salon' : r === '/ceny' ? 'price' : 'other';

for (const f of files) {
  const html = fs.readFileSync(f, 'utf8'), r = rel(f), k = kind(r), text = visible(html);
  stat.pages++;
  if (!/<meta name="robots" content="noindex, nofollow"/.test(html)) E(f, 'нет noindex (превью)');
  if ((html.match(/<h1[\s>]/g) || []).length !== 1) E(f, `H1: ${(html.match(/<h1[\s>]/g) || []).length}`);
  if (!/<title>[^<]{10,}<\/title>/.test(html)) E(f, 'нет title');
  if (!/<meta name="description" content="[^"]{30,}"/.test(html)) E(f, 'нет description');
  if (!/<link rel="canonical" href="https?:\/\/[^"?]+"/.test(html)) E(f, 'нет canonical без параметров');
  if (!/<meta property="og:title"/.test(html)) E(f, 'нет Open Graph');
  if (/\bundefined\b|\bNaN\b|\[object Object\]/.test(text)) E(f, 'в тексте undefined/NaN');
  // JSON-LD
  const types = new Set();
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    stat.ld++;
    try { const j = JSON.parse(m[1]); JSON.stringify(j, (key, v) => { if (key === '@type') [].concat(v).forEach(t => types.add(t)); return v; }); }
    catch (e) { E(f, 'JSON-LD не парсится: ' + e.message); }
  }
  for (const t of ['Organization', 'WebSite']) if (!types.has(t)) E(f, `нет JSON-LD ${t}`);
  if (r !== '/' && !types.has('BreadcrumbList') && r !== '/dizayn') E(f, 'нет BreadcrumbList');
  for (const t of NEED[k] || []) if (!types.has(t)) E(f, `нет JSON-LD ${t}`);
  // обязательные блоки страниц процедур и целей (критерий 10)
  if (k === 'procedure' || k === 'goal') {
    if (!/class="acc-short"/.test(html)) E(f, 'нет «Коротко»');
    if (!/<table/.test(html)) E(f, 'нет HTML-таблицы');
    if (!/<details/.test(html)) E(f, 'нет FAQ');
    if (!/Цены обновлены/.test(html)) E(f, 'нет даты обновления');
    if (!/Текст проверил/.test(html)) E(f, 'нет места под врача');
  }
  // тон и названия (критерии 6, 12)
  if (/(^|[^а-яё])гост(ь|я|ей|ям|ю|и)([^а-яё]|$)/i.test(text)) E(f, 'слово «гость»');
  if (/флагман/i.test(text)) E(f, 'слово «флагман»');
  if (/Весна»|«Весна/.test(text)) E(f, '«Весна» вместо ТЦ BoscoVesna');
  if (/Новинский(?! бульвар)/.test(text)) E(f, '«Новинский» не в адресе');
  if (/!/.test(text.replace(/<!--[\s\S]*?-->/g, ''))) E(f, 'восклицательный знак в тексте');
  const heads = [...html.matchAll(/<(h[1-3]|nav)[^>]*>([\s\S]*?)<\/\1>/g)].map(m => visible(m[2])).join(' | ');
  if (/проблем|что вас беспокоит|недостатк/i.test(heads)) E(f, 'запрещённые слова в заголовках/навигации');
  for (const u of UNCONFIRMED) if (text.includes(u)) E(f, `неподтверждённый аппарат: ${u}`);
  // доступность: alt у картинок, подписи у кнопок
  for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\balt="/.test(m[0])) E(f, 'img без alt');
  for (const m of html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)) if (!visible(m[1]).trim() && !/aria-label="/.test(m[0])) E(f, 'кнопка без подписи');
}

// служебные файлы (критерий 11)
for (const f of ['robots.txt', 'robots-production.txt', 'sitemap.xml', 'llms.txt', 'llms-full.txt', 'ceny.json', 'search-index.json', '.nojekyll'])
  if (!fs.existsSync(path.join(DIST, f))) errs.push(`нет ${f}`);
if (!/Disallow: \//.test(fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8'))) errs.push('robots.txt превью не закрыт');
const sm = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
const smCount = (sm.match(/<url>/g) || []).length;
const big = []; (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : fs.statSync(p).size > 50 * 1024 * 1024 && big.push(p); } })(DIST);
if (big.length) errs.push('файлы > 50 МБ: ' + big.join(', '));

console.log(`Страниц: ${stat.pages}, блоков JSON-LD: ${stat.ld}, URL в sitemap: ${smCount}`);
console.log(errs.length ? `Ошибки (${errs.length}):\n` + [...new Set(errs)].slice(0, 80).join('\n') : 'Ошибок нет');
process.exit(errs.length ? 1 : 0);
