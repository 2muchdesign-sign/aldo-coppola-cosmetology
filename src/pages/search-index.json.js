// Индекс поиска собирается вместе с сайтом: /search-index.json (без сервера).
import { salonCover, MEDIA } from '../lib/media.js';
import { C, PROCEDURES, DEVICES, DEVICE, GOALS, GOAL_GROUPS, SALONS, METHOD_LABEL, ZONE, procedurePrices, u, durationRange, service, VISIBLE_OFFERS } from '../lib/data.js';

const minOf = o => { const v = Object.values(o); return v.length ? Math.min(...v) : null; };
const join = a => a.filter(Boolean).join(' · ');

export const SALON_ALIASES = {
  zhukovka: ['жуковка', 'zhukovka'],
  barvikha: ['барвиха', 'barvikha', 'barviha'],
  'veb-rf': ['вэб', 'веб', 'новинский', 'veb'],
  'vremena-goda': ['времена', 'vremena', 'кутузовский'],
  boscovesna: ['boscovesna', 'босковесна', 'боско', 'bosco', 'весна'],
  unimall: ['юнимолл', 'юнимол', 'unimall'],
  lotte: ['лотте', 'lotte'],
};

export function GET() {
  const docs = [];
  const procSyn = C.synonyms?.procedures || {};
  const goalGroup = Object.fromEntries(GOAL_GROUPS.map(g => [g.slug, g.name]));

  for (const p of PROCEDURES) {
    const prices = procedurePrices(p.slug);
    const devs = p.devices.map(d => DEVICE[d]).filter(Boolean);
    const goalTerms = GOALS.filter(g => g.procedures.includes(p.slug)).flatMap(g => [g.name]);
    docs.push({
      id: 'p:' + p.slug, type: 'procedure', name: p.name, url: u(`procedury/${p.slug}/`),
      alt: [...(procSyn[p.slug] || []), ...devs.flatMap(d => [d.name, d.brand, d.model, ...(d.synonyms || [])]), METHOD_LABEL[p.method]].filter(x => x && x !== 'TODO').join(' '),
      terms: '', text: [...goalTerms, ...p.zones.map(z => ZONE[z]?.name), ...C.services.filter(s => s.procedure === p.slug).map(s => s.name)].join(' '),
      sub: join(devs.map(d => d.name)) || METHOD_LABEL[p.method], prices, price: minOf(prices), salons: Object.keys(prices),
      pass: [['Метод', METHOD_LABEL[p.method]], ['Аппараты', join(devs.map(d => d.name)) || '—'], ['Время', durationRange(p) || '—']],
      book: p.consultation_first ? 'consult' : 'book',
    });
  }
  for (const d of DEVICES) {
    const svc = C.services.filter(s => s.device === d.slug).map(s => s.id);
    const prices = {};
    for (const o of VISIBLE_OFFERS) if (svc.includes(o.service) && service(o.service).gender !== 'men') prices[o.salon] = Math.min(prices[o.salon] ?? Infinity, o.price);
    const procs = [...new Set(C.services.filter(s => s.device === d.slug).map(s => s.procedure))];
    const tech = (d.technologies || [d.technology]).map(t => METHOD_LABEL[t]).filter(Boolean);
    docs.push({
      id: 'd:' + d.slug, type: 'device', name: d.name, url: u(`apparaty/${d.slug}/`),
      alt: [d.brand, d.model, ...(d.synonyms || [])].filter(x => x && x !== 'TODO').join(' '),
      terms: '', text: [...tech, ...procs.map(s => PROCEDURES.find(p => p.slug === s)?.name)].join(' '),
      sub: join([...tech, d.country !== 'TODO' ? d.country : null]), prices, price: minOf(prices), salons: Object.keys(prices),
      pass: [['Технология', join(tech)], ['Процедуры', String(procs.length)], ['Где', join(Object.keys(prices).map(s => SALONS.find(x => x.slug === s)?.name))]],
      book: 'book',
    });
    // строка «Цены» по аппарату: диапазон
    const all = C.services.filter(s => s.device === d.slug && s.gender !== 'men').flatMap(s => VISIBLE_OFFERS.filter(o => o.service === s.id).map(o => o.price));
    if (all.length > 1) {
      const proc = procs[0];
      docs.push({ id: 'pr:' + d.slug, type: 'price', name: `${d.name}: цены`, url: u(`procedury/${proc}/#ceny`),
        alt: [d.name, ...(d.synonyms || [])].join(' '), terms: '', text: 'цена стоимость прайс сколько стоит',
        sub: `${svc.length} позиций`, prices, price: Math.min(...all), priceTo: Math.max(...all), salons: Object.keys(prices), book: 'book' });
    }
  }
  for (const g of GOALS) {
    const procs = g.procedures.map(s => PROCEDURES.find(p => p.slug === s)).filter(Boolean);
    const prices = {};
    for (const p of procs) for (const [s, v] of Object.entries(procedurePrices(p.slug))) prices[s] = Math.min(prices[s] ?? Infinity, v);
    docs.push({
      id: 'g:' + g.slug, type: 'goal', name: g.name, url: u(`celi/${g.slug}/`), alt: '', terms: g.terms.join(' '),
      termsList: g.terms, text: procs.map(p => p.name).join(' '), group: goalGroup[g.group], sub: goalGroup[g.group],
      prices, price: minOf(prices), salons: Object.keys(prices), book: 'consult',
      pass: [['Группа', goalGroup[g.group]], ['Методы', String(procs.length)]],
    });
  }
  for (const s of SALONS) {
    docs.push({
      id: 's:' + s.slug, type: 'salon', name: s.name, url: u(`salony/${s.slug}/`), alt: (SALON_ALIASES[s.slug] || []).join(' '),
      terms: '', text: s.address, sub: s.has_cosmetology ? s.address : 'Косметологии нет — ближайший: БЦ ВЭБ РФ',
      salons: [s.slug], price: null, prices: {}, media: salonCover(s.slug)?.thumb || null, book: 'book',
      pass: [['Адрес', s.address], ['Телефон', s.phone]],
    });
  }
  const body = {
    built: C.built_at, docs, salonAliases: SALON_ALIASES,
    salons: SALONS.map(s => ({ slug: s.slug, name: s.name, short: s.short, cosmo: s.has_cosmetology })),
    popular: ['Morpheus8', 'HydraFacial', 'брыли', 'пигментные пятна', 'ботокс', 'эпиляция в Жуковке', 'SMAS-лифтинг'],
  };
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
