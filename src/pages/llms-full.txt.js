// /llms-full.txt — подробная версия: каждая процедура с «Коротко», аппаратами, салонами и ценами.
import { routes } from '../lib/routes.js';
import { C, PROCEDURES, GOALS, DEVICE, SALON, rub, fmtDate } from '../lib/data.js';
import { site, procedureShort, goalShort, serviceRows } from '../lib/pages.js';
const r = n => rub(n).replace(/ /g, ' ');
export function GET() {
  const out = ['# Косметология Aldo Coppola — полная справка', '', `Цены из прайсов салонов (YClients), обновлены ${fmtDate(C.built_at)}. Итоговая стоимость определяется после консультации; не является публичной офертой. Имеются противопоказания, необходима консультация специалиста.`, ''];
  out.push('## Процедуры', '');
  for (const p of PROCEDURES) {
    out.push(`### ${p.name}`, `${site()}procedury/${p.slug}/`, '', procedureShort(p).replace(/ /g, ' '), '');
    if (p.devices.length) out.push(`Аппараты: ${p.devices.map(d => DEVICE[d]?.name).join(', ')}.`);
    out.push(`Салоны: ${p.salons.map(s => SALON[s].name).join(', ')}.`, '');
    for (const row of serviceRows(s => s.procedure === p.slug)) out.push(`- ${row.name}: ${Object.entries(row.prices).map(([s, v]) => `${SALON[s].name} ${r(v)}`).join('; ')}`);
    out.push('');
  }
  out.push('## Цели', '');
  for (const g of GOALS) out.push(`### ${g.name}`, `${site()}celi/${g.slug}/`, '', goalShort(g).replace(/ /g, ' '), '');
  out.push('## Все страницы', '', ...routes().map(x => `- ${x.title}: ${site()}${x.path}`));
  return new Response(out.join('\n') + '\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
