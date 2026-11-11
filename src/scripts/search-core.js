// Ядро поиска: общее для сборки индекса и браузера. Без внешних зависимостей, кроме MiniSearch на клиенте.
// Понимает: синонимы (в индексе), русскую морфологию (простой стеммер), кириллицу/латиницу (транслит),
// неверную раскладку (йцукен <-> qwerty), опечатки (fuzzy в MiniSearch).

const EN = "qwertyuiop[]asdfghjkl;'zxcvbnm,.`";
const RU = 'йцукенгшщзхъфывапролджэячсмитьбюё';
const toRu = {}, toEn = {};
for (let i = 0; i < EN.length; i++) { toRu[EN[i]] = RU[i]; toEn[RU[i]] = EN[i]; }

/** Переключить раскладку целиком: «гдекфащкьук» -> «ultraformer», «ghbdtn» -> «привет» */
export function swapLayout(s) {
  const lat = (s.match(/[a-z]/g) || []).length, cyr = (s.match(/[а-яё]/g) || []).length;
  const map = cyr >= lat ? toEn : toRu;
  return [...s].map(c => map[c] ?? c).join('');
}

const TR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
/** Кириллица -> латиница («ультраформер» -> «ultraformer», «морфеус» -> «morfeus») */
export const translit = s => [...s].map(c => TR[c] ?? c).join('');

/** Упрощённая латиница для сравнения брендов: ph->f, w->v, x->ks, двойные буквы -> одна */
export const latKey = s => s.replace(/ph/g, 'f').replace(/w/g, 'v').replace(/x/g, 'ks').replace(/(.)\1+/g, '$1').replace(/y/g, 'i');

export const normalize = s => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[«»"“”„()[\]{},.:;!?/\\|+*&#№%]/g, ' ').replace(/[‐-―−]/g, '-').replace(/\s+/g, ' ').trim();

// Простой русский стеммер: отрезаем частые окончания у слов длиннее 4 букв.
const ENDINGS = ['иями', 'ями', 'ами', 'ого', 'его', 'ому', 'ему', 'ими', 'ыми', 'ией', 'ией', 'ий', 'ый', 'ой', 'ая', 'яя', 'ое', 'ее', 'ие', 'ые', 'ую', 'юю', 'ия', 'ья', 'ье', 'ью', 'ов', 'ев', 'ей', 'ам', 'ям', 'ах', 'ях', 'ом', 'ем', 'ою', 'ею', 'ия', 'а', 'я', 'ы', 'и', 'у', 'ю', 'о', 'е', 'ь', 'й'];
export function stem(w) {
  if (w.length <= 4 || !/[а-я]/.test(w)) return w;
  for (const e of ENDINGS) if (w.endsWith(e) && w.length - e.length >= 4) return w.slice(0, -e.length);
  return w;
}

/** Токены для индекса и запроса: слово + стем + латинский ключ для кириллицы */
export function tokenize(text) {
  return normalize(text).split(/[\s-]+/).filter(Boolean);
}
export function processTerm(t) {
  t = normalize(t);
  if (!t) return null;
  const out = new Set([stem(t)]);
  if (/[а-я]/.test(t)) { const l = latKey(translit(t)); if (l.length > 2) out.add(l); }
  else if (/[a-z]/.test(t)) { const l = latKey(t); if (l !== t) out.add(l); }
  return [...out];
}

/** Распознать салон в запросе: возвращает { salon, rest } — «эпиляция жуковка» -> zhukovka + «эпиляция» */
export function extractSalon(q, salonAliases) {
  const words = normalize(q).split(' ');
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w.length < 3) continue;
    for (const [slug, aliases] of Object.entries(salonAliases)) {
      if (aliases.some(a => a.startsWith(w) || (w.length > 5 && w.startsWith(a.slice(0, Math.max(4, a.length - 3)))))) {
        // «в жуковке» — отрезаем и предлог
        const rest = words.filter((_, j) => j !== i && !(j === i - 1 && ['в', 'во', 'на'].includes(words[j])));
        return { salon: slug, rest: rest.join(' ').trim() };
      }
    }
  }
  return { salon: null, rest: normalize(q) };
}

export const SEARCH_OPTIONS = {
  fields: ['name', 'alt', 'terms', 'text'],
  storeFields: ['type', 'name', 'sub', 'url', 'price', 'priceTo', 'prices', 'salons', 'termsList', 'media', 'pass', 'group', 'book'],
  searchOptions: { boost: { name: 4, alt: 3, terms: 3, text: 1 }, prefix: t => t.length > 2, fuzzy: t => (t.length > 4 ? 0.25 : t.length > 3 ? 1 : false), combineWith: 'AND' },
};

/** Поиск с ранжированием (общий для сайта и автотеста scripts/test-search.mjs).
 *  idx — MiniSearch с документами из search-index.json, data — сам индекс (salonAliases), chipSalon — салон, выбранный чипом. */
export function runSearch(idx, data, q, chipSalon = '') {
  const { salon: qs, rest } = extractSalon(q, data.salonAliases);
  const queries = rest ? [rest] : [];
  if (rest) { const sw = swapLayout(rest); if (sw !== rest) queries.push(sw); }
  let hits = [];
  for (const qq of queries) {
    const r = idx.search(qq);
    const r2 = r.length ? r : idx.search(qq, { combineWith: 'OR' });
    if (r2.length) { hits = r2; break; }
  }
  if (!rest && qs) hits = idx.search(data.salonAliases[qs][0]).filter(h => h.type === 'salon');
  const sf = qs || chipSalon; // салон из запроса — фильтр: «эпиляция жуковка»
  const TYPE_W = { device: 1.15, procedure: 1.1, goal: 1, salon: 1, price: .6 };
  hits = hits.map(h => {
    let score = h.score * (TYPE_W[h.type] || 1);
    if (normalize(h.name) === normalize(rest)) score *= 1.6;
    if (sf && h.type !== 'salon' && !(h.salons || []).includes(sf)) score *= .5;
    return { ...h, score };
  }).sort((a, b) => b.score - a.score);
  if (hits.length) { const top = hits[0].score; hits = hits.filter(h => h.score >= top * .2); } // отсечь слабый «хвост» нечёткого поиска
  return { hits, salon: qs };
}
