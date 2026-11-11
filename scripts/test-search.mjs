// Критерий приёмки №4: тестовые запросы из раздела 5 ТЗ дают ожидаемый первый результат.
// Запуск после сборки: PATH="$HOME/.local/node/bin:$PATH" node scripts/test-search.mjs
import fs from 'node:fs';
import MiniSearch from 'minisearch';
import { tokenize, processTerm, runSearch, SEARCH_OPTIONS } from '../src/scripts/search-core.js';

const data = JSON.parse(fs.readFileSync(new URL('../dist/search-index.json', import.meta.url)));
const idx = new MiniSearch({ ...SEARCH_OPTIONS, tokenize, processTerm });
idx.addAll(data.docs);
const CASES = [
  ['морфеус', h => h.name === 'InMode Morpheus8' && h.price === 71700 && h.salons.join() === 'veb-rf'],
  ['ультраформер', h => h.name === 'Ultraformer' && h.salons.sort().join() === 'barvikha,zhukovka'],
  ['пигмент', h => h.type === 'goal' && h.name === 'Ровный тон'],
  ['второй подбородок', h => h.type === 'goal' && h.name === 'Подтянутый подбородок'],
  ['брыли', h => h.type === 'goal' && h.name === 'Чёткий овал'],
  ['эпиляция жуковка', (h, r) => h.name === 'Лазерная эпиляция' && r.salon === 'zhukovka' && h.prices.zhukovka != null],
  ['hydrafacial', h => /HydraFacial/.test(h.name) && h.price === 19500 && h.salons.length === 6 && !h.salons.includes('lotte')],
  ['ботокс', h => h.name === 'Ботулинотерапия'],
  ['гидрафейшл', h => /HydraFacial/.test(h.name)],
  ['жук', h => h.type === 'salon' && h.name === 'Жуковка'],
  // дополнительные
  ['постакне', h => h.type === 'goal' && h.name === 'Гладкий рельеф'],
  ['гдекфащкьук', h => h.name === 'Ultraformer'],
  ['ботох', h => h.name === 'Ботулинотерапия'],
];
let fail = 0;
for (const [q, ok] of CASES) {
  const r = runSearch(idx, data, q);
  const h = r.hits[0];
  const pass = h && ok(h, r);
  if (!pass) fail++;
  console.log(`${pass ? 'OK  ' : 'FAIL'} «${q}» → ${h ? `${h.name} (${h.type})${h.price ? `, от ${h.price}` : ''}${r.salon ? ` · салон ${r.salon}` : ''}` : 'нет результатов'}`);
}
console.log(`\n${CASES.length - fail} из ${CASES.length}`);
process.exit(fail ? 1 : 0);
