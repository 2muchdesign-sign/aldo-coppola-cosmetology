// Открытый машиночитаемый прайс (ТЗ 10.4): процедура, услуга, зона/объём, салон, цена, дата — тот же каталог, что на страницах.
import { C, SALON, PROCEDURE, ZONE, VISIBLE_OFFERS, service } from '../lib/data.js';
import { site } from '../lib/pages.js';

export function GET() {
  const items = VISIBLE_OFFERS.map(o => {
    const s = service(o.service), p = PROCEDURE[s.procedure];
    return {
      procedure: p?.name, procedure_url: p ? site() + `procedury/${p.slug}/` : null,
      service: s.name, service_id: s.id, zones: (s.zones || []).map(z => ZONE[z]?.name).filter(Boolean), volume: s.volume,
      salon: SALON[o.salon].name, salon_address: SALON[o.salon].address, price: o.price, price_to: o.price_to, currency: 'RUB',
      duration_min: o.duration_min, for_men: s.gender === 'men' || undefined,
    };
  });
  const body = { name: 'Цены на косметологию Aldo Coppola', source: 'Прайсы салонов (YClients)', updated: C.built_at,
    note: 'Итоговая стоимость определяется после консультации; не является публичной офертой.', count: items.length, items };
  return new Response(JSON.stringify(body, null, 1), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
