// /llms.txt — краткое описание сети и ключевые страницы в Markdown (ТЗ 10.4). Генерируется из каталога.
import { routes } from '../lib/routes.js';
import { C, COSMO_SALONS, PROCEDURES, DEVICES, rub, fmtDate } from '../lib/data.js';
import { site } from '../lib/pages.js';
export function GET() {
  const R = routes(), g = name => R.filter(r => r.group === name);
  const lines = [
    '# Косметология Aldo Coppola',
    '',
    `> Сеть салонов красоты Aldo Coppola (итальянский бренд, в России с 1996 года): аппаратная, инъекционная и эстетическая косметология в ${COSMO_SALONS.length} центрах Москвы и Подмосковья. ${PROCEDURES.length} процедур, ${DEVICES.length} аппаратов; цены из прайсов салонов, обновлены ${fmtDate(C.built_at)} Имеются противопоказания, необходима консультация специалиста.`,
    '',
    `Салоны с косметологией: ${COSMO_SALONS.map(s => `${s.name} (${s.address}, ${s.phone})`).join('; ')}. В салоне Лотте Отель косметологии нет.`,
    '',
    ...['Главное', 'Направления', 'Салоны', 'Процедуры'].flatMap(name => ['', `## ${name}`, '', ...g(name).map(r => `- [${r.title}](${site()}${r.path})${r.item?.price_from ? `: от ${rub(r.item.price_from).replace(/ /g, ' ')}` : ''}`)]),
    '', '## Данные', '',
    `- [Прайс в JSON](${site()}ceny.json): процедура, услуга, зона, салон, цена, дата`,
    `- [Полная версия для ИИ](${site()}llms-full.txt)`,
    `- [Карта сайта](${site()}sitemap.xml)`,
  ];
  return new Response(lines.join('\n') + '\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
