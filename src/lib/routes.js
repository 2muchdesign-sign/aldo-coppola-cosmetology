// Все страницы сайта — для sitemap.xml и llms.txt (один источник).
import { PROCEDURES, GOALS, DEVICES, SALONS, ZONES, DIRECTIONS, builtAt } from './data.js';

export function routes() {
  const zonesUsed = ZONES.filter(z => PROCEDURES.some(p => p.zones.includes(z.slug)));
  return [
    { path: '', title: 'Косметология Aldo Coppola в Москве', group: 'Главное', priority: 1 },
    { path: 'procedury/', title: 'Все процедуры', group: 'Главное', priority: .9 },
    { path: 'celi/', title: 'Цели: подбор по желаемому результату', group: 'Главное', priority: .8 },
    { path: 'zony/', title: 'Зоны лица и тела', group: 'Главное', priority: .7 },
    { path: 'apparaty/', title: 'Аппараты', group: 'Главное', priority: .8 },
    { path: 'salony/', title: 'Салоны и адреса', group: 'Главное', priority: .8 },
    { path: 'ceny/', title: 'Цены (прайс)', group: 'Главное', priority: .9 },
    { path: 'podbor/', title: 'Подбор процедуры', group: 'Главное', priority: .5 },
    { path: 'konsultaciya/', title: 'Консультация врача-косметолога', group: 'Главное', priority: .6 },
    { path: 'vrachi/', title: 'Врачи', group: 'Главное', priority: .3 },
    ...DIRECTIONS.map(d => ({ path: `${d.slug}/`, title: d.name, group: 'Направления', priority: .8 })),
    ...PROCEDURES.map(p => ({ path: `procedury/${p.slug}/`, title: p.name, group: 'Процедуры', priority: .9, item: p })),
    ...GOALS.map(g => ({ path: `celi/${g.slug}/`, title: `${g.name}${g.terms.length ? ` (${g.terms.slice(0, 3).join(', ')})` : ''}`, group: 'Цели', priority: .7, item: g })),
    ...DEVICES.map(d => ({ path: `apparaty/${d.slug}/`, title: d.name, group: 'Аппараты', priority: .7, item: d })),
    ...SALONS.map(s => ({ path: `salony/${s.slug}/`, title: `${s.name} — ${s.address}`, group: 'Салоны', priority: .8, item: s })),
    ...zonesUsed.map(z => ({ path: `zony/${z.slug}/`, title: z.name, group: 'Зоны', priority: .5 })),
  ].map(r => ({ ...r, lastmod: builtAt }));
}
