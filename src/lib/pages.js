// Тексты и разметка, которые собираются из каталога: «Коротко», FAQ, таблицы цен, JSON-LD.
// Только факты из прайсов и справочников — без обещаний результата и выдуманных цифр.
import { salonCover } from './media.js';
import { C, SALONS, SALON, COSMO_SALONS, DEVICE, DEVICES, PROCEDURES, PROCEDURE, GOALS, GOAL_GROUPS, ZONE, DIRECTION, METHOD_LABEL,
  VISIBLE_OFFERS, service, procedurePrices, rub, u, durationRange } from './data.js';

export const LOC = { zhukovka: 'Жуковке', barvikha: 'Барвихе', unimall: 'Юнимолле' };
export const inSalon = s => (LOC[s] ? `в ${LOC[s]}` : `в ${SALON[s].name}`);
export const listAnd = a => (a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' и ' + a.at(-1));
export const salonNames = slugs => listAnd(slugs.map(s => SALON[s].name));
export const plural = (n, one, few, many) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many; };
const nbsp = s => s.replace(/ (\d)/g, ' $1');

/** Полное имя аппарата при первом упоминании: «Ultraformer (Classys, Южная Корея)» */
export function deviceFull(d) {
  const parts = [d.manufacturer && d.manufacturer !== 'TODO' && d.manufacturer !== d.name.split(' ')[0] ? d.manufacturer : null, d.country && d.country !== 'TODO' ? d.country : null].filter(Boolean);
  return parts.length ? `${d.name} (${parts.join(', ')})` : d.name;
}

/** Заголовок с одним словом курсивом: последнее слово (если слов больше одного) */
export function splitAccent(name) {
  const w = name.split(' ');
  if (w.length < 2) return [name, ''];
  return [w.slice(0, -1).join(' ') + ' ', w.at(-1)];
}

/** Строки услуг процедуры: [{ id, name, volume, zones, gender, duration, prices: {salon: price}, priceTo: {salon} }] */
export function serviceRows(filter) {
  const rows = [];
  for (const s of C.services.filter(filter)) {
    const offers = VISIBLE_OFFERS.filter(o => o.service === s.id);
    if (!offers.length) continue;
    const prices = {}, to = {};
    for (const o of offers) { prices[o.salon] = o.price; if (o.price_to) to[o.salon] = o.price_to; }
    rows.push({ id: s.id, name: s.name, volume: s.volume, zones: s.zones, gender: s.gender, device: s.device, procedure: s.procedure,
      duration: offers[0].duration_min, prices, priceTo: to, min: Math.min(...Object.values(prices)) });
  }
  return rows.sort((a, b) => (a.gender === 'men') - (b.gender === 'men') || (a.device || '').localeCompare(b.device || '') || a.min - b.min);
}

export const priceSpan = rows => {
  const all = rows.filter(r => r.gender !== 'men').flatMap(r => Object.values(r.prices));
  const a = all.length ? all : rows.flatMap(r => Object.values(r.prices));
  return a.length ? [Math.min(...a), Math.max(...a)] : [null, null];
};

/** «Коротко» для процедуры: 40–70 слов, понятно без остальной страницы */
export function procedureShort(p) {
  const devs = p.devices.map(d => DEVICE[d]).filter(Boolean);
  const rows = serviceRows(s => s.procedure === p.slug);
  const [lo, hi] = priceSpan(rows);
  const where = p.salons.filter(s => SALON[s].has_cosmetology);
  const zones = p.zones.map(z => ZONE[z]?.name.toLowerCase()).filter(Boolean);
  const parts = [];
  parts.push(`${p.name} в Aldo Coppola ${devs.length ? `проводят на ${devs.length > 1 ? 'аппаратах' : 'аппарате'} ${listAnd(devs.map(deviceFull))}` : `проводят врачи-косметологи и специалисты сети`}${zones.length ? `; зоны: ${zones.slice(0, 5).join(', ')}` : ''}.`);
  parts.push(`Процедура доступна ${where.length === COSMO_SALONS.length ? 'во всех шести центрах косметологии' : `в ${where.length} ${plural(where.length, 'салоне', 'салонах', 'салонах')}`}: ${salonNames(where)}.`);
  if (lo != null) parts.push(lo === hi ? `Стоимость — ${rub(lo)}.` : `Стоимость — от ${rub(lo)} до ${rub(hi)} в зависимости от зоны, объёма и салона.`);
  parts.push(p.consultation_first ? 'Перед процедурой нужна консультация врача-косметолога.' : 'Подойдёт ли процедура, подскажет врач-косметолог на консультации.');
  if (p.summary && p.summary !== 'TODO') parts.push(p.summary);
  return nbsp(parts.join(' '));
}

/** FAQ процедуры — живые вопросы, ответ первым предложением; только факты из каталога */
export function procedureFaq(p) {
  const devs = p.devices.map(d => DEVICE[d]).filter(Boolean);
  const rows = serviceRows(s => s.procedure === p.slug);
  const [lo, hi] = priceSpan(rows);
  const where = p.salons;
  const q = [];
  if (lo != null) q.push([`Сколько стоит ${p.name.toLowerCase().startsWith('smas') || /^[A-Z]/.test(p.name) ? p.name : p.name.charAt(0).toLowerCase() + p.name.slice(1)} в Москве?`,
    `В салонах Aldo Coppola — от ${rub(lo)}${hi !== lo ? ` до ${rub(hi)}` : ''}. Цена зависит от зоны, объёма и салона; ${rows.length > 1 ? `в прайсе ${rows.length} ${plural(rows.length, 'позиция', 'позиции', 'позиций')}, все цены — в таблице на этой странице` : 'точная цена — в таблице на этой странице'}. Итоговая стоимость определяется после консультации.`]);
  q.push([`Где сделать ${p.name.charAt(0).toLowerCase() + p.name.slice(1)} в Aldo Coppola?`,
    `${where.length === COSMO_SALONS.length ? 'Во всех шести центрах косметологии' : `В ${where.length} ${plural(where.length, 'салоне', 'салонах', 'салонах')}`}: ${listAnd(where.map(s => `${SALON[s].name} (${SALON[s].address})`))}.`]);
  if (devs.length) q.push([`На каком аппарате делают процедуру?`, `${listAnd(devs.map(deviceFull))}. ${devs.length > 1 ? 'Аппарат зависит от салона — смотрите сравнение на этой странице.' : ''}`.trim()]);
  if (devs.length === 2) {
    const [a, b] = devs;
    const sa = Object.keys(procedurePricesByDevice(p.slug, a.slug)), sb = Object.keys(procedurePricesByDevice(p.slug, b.slug));
    q.push([`Чем ${a.name} отличается от ${b.name}?`,
      `Оба аппарата используются для процедуры «${p.name}». ${a.name} есть ${listAnd(sa.map(inSalon))}, ${b.name} — ${listAnd(sb.map(inSalon))}. Цены отличаются: ${a.name} — от ${rub(minOf(procedurePricesByDevice(p.slug, a.slug)))}, ${b.name} — от ${rub(minOf(procedurePricesByDevice(p.slug, b.slug)))}. Какой подойдёт вам, решает врач на консультации.`]);
  }
  q.push([`Нужна ли консультация перед процедурой?`, p.consultation_first
    ? 'Да. Для этой процедуры консультация врача-косметолога — первый шаг: врач оценит показания и противопоказания и составит план.'
    : 'Отдельная консультация не обязательна, но специалист перед процедурой уточнит показания и противопоказания. Имеются противопоказания, необходима консультация специалиста.']);
  const dur = durationRange(p);
  if (dur) q.push([`Сколько времени занимает процедура?`, `В записи на процедуру отводится ${dur}, в зависимости от зоны и объёма.`]);
  return q;
}

const minOf = o => { const v = Object.values(o); return v.length ? Math.min(...v) : null; };
export function procedurePricesByDevice(proc, dev) {
  const out = {};
  for (const r of serviceRows(s => s.procedure === proc && s.device === dev && s.gender !== 'men'))
    for (const [s, v] of Object.entries(r.prices)) out[s] = Math.min(out[s] ?? Infinity, v);
  return out;
}
export const minPrice = minOf;

/** Похожие процедуры: общие цели, затем то же направление */
export function relatedProcedures(p, n = 8) {
  const goals = GOALS.filter(g => g.procedures.includes(p.slug));
  const score = {};
  for (const g of goals) for (const s of g.procedures) if (s !== p.slug) score[s] = (score[s] || 0) + 2;
  for (const q of PROCEDURES) if (q.slug !== p.slug && q.direction === p.direction) score[q.slug] = (score[q.slug] || 0) + 1;
  return Object.entries(score).sort((a, b) => b[1] - a[1]).map(([s]) => PROCEDURE[s]).filter(Boolean).slice(0, n);
}

export const goalsOf = p => GOALS.filter(g => g.procedures.includes(p.slug));
export const goalGroup = slug => GOAL_GROUPS.find(g => g.slug === slug);
export const procsOfGoal = g => g.procedures.map(s => PROCEDURE[s]).filter(Boolean);
export const procsOfDevice = d => [...new Set(C.services.filter(s => s.device === d.slug).map(s => s.procedure))].map(s => PROCEDURE[s]).filter(Boolean);
export const procsOfSalon = s => PROCEDURES.filter(p => p.salons.includes(s));
export const devicesOfSalon = s => DEVICES.filter(d => VISIBLE_OFFERS.some(o => o.salon === s && service(o.service).device === d.slug && service(o.service).gender !== 'men'));
export const salonsOfDevice = d => SALONS.filter(s => VISIBLE_OFFERS.some(o => o.salon === s.slug && service(o.service).device === d.slug && service(o.service).gender !== 'men')).map(s => s.slug);

/** «Коротко» для цели */
export function goalShort(g) {
  const procs = procsOfGoal(g);
  const prices = procs.flatMap(p => Object.values(procedurePrices(p.slug)));
  const salons = [...new Set(procs.flatMap(p => p.salons))].filter(s => SALON[s].has_cosmetology);
  const t = [`${g.name} — направление косметологии Aldo Coppola, которое обычно выбирают${g.terms.length ? `, когда беспокоят ${listAnd(g.terms.slice(0, 3))}` : ''}.`,
    `Врачи сети предлагают ${procs.length} ${plural(procs.length, 'метод', 'метода', 'методов')}: ${listAnd(procs.slice(0, 5).map(p => p.name))}${procs.length > 5 ? ' и другие' : ''}.`,
    prices.length ? `Цены — от ${rub(Math.min(...prices))}, процедуры доступны в ${salons.length} ${plural(salons.length, 'салоне', 'салонах', 'салонах')}.` : '',
    'Какой метод подойдёт, врач-косметолог решает на консультации; это не диагноз.'];
  return nbsp(t.filter(Boolean).join(' '));
}

export function goalFaq(g) {
  const procs = procsOfGoal(g);
  const prices = procs.flatMap(p => Object.values(procedurePrices(p.slug)));
  const term = g.terms[0];
  const q = [];
  if (term) q.push([`Как убрать ${term} без операции?`, `В Aldo Coppola для этого используют ${listAnd(procs.slice(0, 4).map(p => p.name.charAt(0).toLowerCase() + p.name.slice(1)))}${procs.length > 4 ? ' и другие методы' : ''}. Какой метод подойдёт, врач-косметолог решает на очной консультации — сайт не ставит диагноз.`]);
  if (prices.length) q.push([`Сколько стоит ${g.name.charAt(0).toLowerCase() + g.name.slice(1)} в Москве?`, `Процедуры по этой цели стоят от ${rub(Math.min(...prices))}. Цена зависит от метода, зоны и салона — подробности в таблице методов на этой странице. Итоговая стоимость определяется после консультации.`]);
  q.push(['С чего начать?', 'С консультации врача-косметолога: он осмотрит кожу, учтёт противопоказания и предложит план — одну процедуру или комбинацию.']);
  return q;
}

/** JSON-LD */
export const site = () => new URL(import.meta.env.BASE_URL, import.meta.env.SITE).href;
export function faqLD(faq) {
  return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
}
export function salonLD(s) {
  return {
    '@context': 'https://schema.org', '@type': ['MedicalClinic', 'BeautySalon'], '@id': site() + `salony/${s.slug}/#place`,
    name: `Aldo Coppola — ${s.name}`, url: site() + `salony/${s.slug}/`, telephone: s.phone,
    address: { '@type': 'PostalAddress', streetAddress: s.address, addressLocality: s.region === 'Москва' ? 'Москва' : 'Московская область', addressCountry: 'RU' },
    image: salonCover(s.slug) ? new URL(salonCover(s.slug).src, import.meta.env.SITE).href : undefined, parentOrganization: { '@id': site() + '#org' },
    // geo, openingHoursSpecification, sameAs (Яндекс Карты, 2ГИС) — TODO: данные заказчика
  };
}
export function offersLD(p) {
  const prices = procedurePrices(p.slug);
  return Object.entries(prices).map(([s, v]) => ({ '@type': 'Offer', price: v, priceCurrency: 'RUB', name: `${p.name} — ${SALON[s].name}`,
    availableAtOrFrom: { '@id': site() + `salony/${s}/#place` }, url: site() + `procedury/${p.slug}/?salon=${s}` }));
}
