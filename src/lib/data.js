// Доступ к каталогу (data/catalog.json) и общие помощники для шаблонов.
import catalog from '../../data/catalog.json';

export const C = catalog;
export const SALONS = catalog.salons;
export const SALON = Object.fromEntries(SALONS.map(s => [s.slug, s]));
export const COSMO_SALONS = SALONS.filter(s => s.has_cosmetology);
export const DEVICES = catalog.devices;
export const DEVICE = Object.fromEntries(DEVICES.map(d => [d.slug, d]));
export const PROCEDURES = catalog.procedures.filter(p => p.published);
export const PROCEDURE = Object.fromEntries(PROCEDURES.map(p => [p.slug, p]));
export const GOALS = catalog.goals;
export const GOAL_GROUPS = catalog.goal_groups;
export const ZONES = catalog.zones;
export const ZONE = Object.fromEntries(ZONES.map(z => [z.slug, z]));
const SERVICE = Object.fromEntries(catalog.services.map(s => [s.id, s]));
export const service = id => SERVICE[id];
export const VISIBLE_OFFERS = catalog.offers.filter(o => !o.hidden);

export const DIRECTIONS = [
  { slug: 'apparatnaya', name: 'Аппаратная косметология', short: 'Аппаратная' },
  { slug: 'inekcii', name: 'Инъекционная косметология', short: 'Инъекции' },
  { slug: 'uhody', name: 'Уходы и пилинги', short: 'Уходы' },
  { slug: 'lazernaya-epilyaciya', name: 'Лазерная эпиляция и депиляция', short: 'Эпиляция' },
  { slug: 'telo', name: 'Тело', short: 'Тело' },
  { slug: 'kapelnicy', name: 'Капельницы', short: 'Капельницы' },
];
export const DIRECTION = Object.fromEntries(DIRECTIONS.map(d => [d.slug, d]));

export const METHOD_LABEL = {
  hifu: 'HIFU', rf: 'RF', 'rf-microneedle': 'RF-иглы', laser: 'Лазер', ipl: 'Свет IPL', microcurrent: 'Микротоки',
  ems: 'Миостимуляция', vacuum: 'Вакуум', cryo: 'Крио', plasma: 'Плазма', pressotherapy: 'Прессотерапия',
  magnetic: 'Магнитотерапия', 'led-pdt': 'ФДТ', hydrodermabrasion: 'Гидропилинг', injection: 'Инъекции',
  threads: 'Нити', care: 'Уход', peel: 'Пилинг', massage: 'Массаж', wrap: 'Обёртывание', drip: 'Капельница',
  wax: 'Воск', infrared: 'ИК-свет',
};

/** Цена: 30000 -> «30 000 ₽» (неразрывные пробелы) */
export const rub = n => (n == null ? '—' : new Intl.NumberFormat('ru-RU').format(n).replace(/\s/g, ' ') + ' ₽');

/** Путь от BASE_PATH */
export const u = (p = '') => {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  return base + String(p).replace(/^\//, '');
};

/** Минимальная видимая цена процедуры в каждом салоне: {salon: price} (без мужских позиций, если есть общие) */
export function procedurePrices(slug) {
  const out = {}, outMen = {};
  for (const o of VISIBLE_OFFERS) {
    const s = SERVICE[o.service];
    if (!s || s.procedure !== slug) continue;
    const t = s.gender === 'men' ? outMen : out;
    if (t[o.salon] == null || o.price < t[o.salon]) t[o.salon] = o.price;
  }
  return Object.keys(out).length ? out : outMen;
}

/** Состояния точек салонов в постоянном порядке: 'on' | 'off' | 'travel' */
export function salonDots(salonSlugs, travels = false) {
  return SALONS.map(s => ({ slug: s.slug, short: s.short, name: s.name,
    state: salonSlugs.includes(s.slug) ? (travels ? 'travel' : 'on') : 'off' }));
}

/** Строка «что это» для карточки — только факты из каталога (аппараты / зоны), без обещаний эффекта */
export function procedureLine(p) {
  const devs = p.devices.map(d => DEVICE[d]?.name).filter(Boolean);
  if (devs.length) return devs.join(' · ');
  const z = p.zones.map(z => ZONE[z]?.name).filter(Boolean);
  return z.length ? z.slice(0, 4).join(' · ') : DIRECTION[p.direction]?.name || '';
}

export const durationRange = p => {
  const ds = catalog.services.filter(s => s.procedure === p.slug).flatMap(s =>
    VISIBLE_OFFERS.filter(o => o.service === s.id).map(o => o.duration_min)).filter(Boolean);
  if (!ds.length) return null;
  const a = Math.min(...ds), b = Math.max(...ds);
  return a === b ? `${a} мин` : `${a}–${b} мин`;
};

export const builtAt = catalog.built_at;
export const fmtDate = iso => new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

/** Единица цены «от», если самая дешёвая позиция — поштучная (ботулинотерапия: «1 ед.») */
export function priceUnit(slug) {
  let best = null;
  for (const o of VISIBLE_OFFERS) {
    const s = SERVICE[o.service];
    if (!s || s.procedure !== slug || s.gender === 'men') continue;
    if (!best || o.price < best.price) best = { price: o.price, s };
  }
  return best && /(^|\D)1 ед\./.test(best.s.volume || best.s.name) ? 'за ед.' : '';
}
/** «от» для набора процедур без поштучных позиций (иначе «от 500 ₽» — цена одной единицы препарата) */
export const fromPrice = list => { const a = list.filter(p => p.price_from && !priceUnit(p.slug)).map(p => p.price_from); return a.length ? Math.min(...a) : Math.min(...list.map(p => p.price_from).filter(Boolean)); };
