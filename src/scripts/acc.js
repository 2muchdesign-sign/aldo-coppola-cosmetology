// Клиентский скрипт сайта косметологии Aldo Coppola.
// Единственная глобальная переменная — window.ACC. Всё работает поверх готового HTML (страница читается и без JS).
import { normalize, tokenize, processTerm, runSearch, SEARCH_OPTIONS } from './search-core.js';

const root = document.querySelector('.acc-root');
const DATA = JSON.parse(document.getElementById('acc-data')?.textContent || '{}');
const CONFIG = DATA.config || {};
const SAL = Object.fromEntries((DATA.salons || []).map(s => [s.slug, s]));
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rub = n => (n == null ? '—' : new Intl.NumberFormat('ru-RU').format(n).replace(/\s/g, ' ') + ' ₽');
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* приватный режим */ } },
};
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
root?.classList.add('acc-js');

/* ---------- аналитика (Яндекс Метрика; ID — CONFIG.metrika, TODO) ---------- */
function goal(name, params) {
  try { if (CONFIG.metrika && window.ym) window.ym(CONFIG.metrika, 'reachGoal', name, params); } catch { /* нет метрики */ }
}

/* ---------- склонение салонов: «есть в Жуковке и Барвихе» ---------- */
const listLoc = slugs => {
  const n = slugs.map(s => SAL[s]?.loc || SAL[s]?.name);
  return n.length <= 1 ? n.join('') : n.slice(0, -1).join(', ') + ' и ' + n[n.length - 1];
};

/* =====================================================================
   СКВОЗНОЙ ВЫБОР САЛОНА: ?salon= и localStorage
   ===================================================================== */
let salon = (() => {
  const q = new URLSearchParams(location.search).get('salon');
  if (q !== null) return SAL[q] ? q : '';
  const s = store.get('acc-salon');
  return SAL[s] ? s : '';
})();

function setSalon(s, { push = true } = {}) {
  salon = SAL[s] ? s : '';
  store.set('acc-salon', salon || null);
  if (push) {
    const url = new URL(location.href);
    salon ? url.searchParams.set('salon', salon) : url.searchParams.delete('salon');
    history.replaceState(null, '', url);
  }
  applySalon();
  document.dispatchEvent(new CustomEvent('acc:salon', { detail: { salon } }));
}

function applySalon() {
  const s = SAL[salon];
  $$('[data-acc-salonname]').forEach(el => (el.textContent = s ? s.name : 'Все салоны'));
  $$('.acc-salonsel__btn').forEach(b => (b.dataset.on = s ? '1' : '0'));
  $$('.acc-salonsel__opt').forEach(o => o.setAttribute('aria-checked', String(o.dataset.salon === salon)));
  $$('[data-acc-salonchips] .acc-chip, [data-pal-salon]').forEach(c => c.setAttribute('aria-pressed', String((c.dataset.salon ?? c.dataset.palSalon) === salon)));
  $$('[data-salon-dot]').forEach(d => {
    const dot = d.classList.contains('acc-dot') ? d : d.querySelector('.acc-dot');
    dot?.classList.toggle('acc-dot--sel', d.dataset.salonDot === salon);
  });
  // карточки и любые элементы с ценами по салонам
  $$('[data-prices]').forEach(el => {
    if (el.dataset.fixedSalon) return; // карточки на странице салона — всегда цены этого салона
    const prices = JSON.parse(el.dataset.prices || '{}');
    const keys = Object.keys(prices);
    const price = el.querySelector('[data-price]'), avail = el.querySelector('[data-avail]');
    const min = keys.length ? Math.min(...Object.values(prices)) : null;
    if (!s) {
      el.classList.remove('acc-card--na');
      if (price) price.textContent = 'от ' + rub(min) + (price.dataset.unit ? ' ' + price.dataset.unit : '');
      if (avail) avail.textContent = '';
    } else if (prices[salon] != null) {
      el.classList.remove('acc-card--na');
      if (price) price.textContent = 'от ' + rub(prices[salon]) + (price.dataset.unit ? ' ' + price.dataset.unit : '');
      if (avail) avail.textContent = `Цена в салоне ${s.name}`;
    } else {
      el.classList.add('acc-card--na');
      if (price) price.textContent = 'от ' + rub(min) + (price.dataset.unit ? ' ' + price.dataset.unit : '');
      if (avail) avail.textContent = keys.length ? `Нет в этом салоне, есть в ${listLoc(keys)}` : '';
    }
  });
  // таблицы цен: строки с data-salon
  $$('[data-acc-salonfilter]').forEach(t => {
    $$('[data-row-salon]', t).forEach(r => (r.hidden = !!salon && r.dataset.rowSalon !== salon));
  });
}

// меню выбора салона в шапке
$$('[data-acc-salonsel]').forEach(box => {
  const btn = $('.acc-salonsel__btn', box), menu = $('.acc-salonsel__menu', box);
  const close = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
  btn.addEventListener('click', e => { e.stopPropagation(); menu.hidden = !menu.hidden; btn.setAttribute('aria-expanded', String(!menu.hidden)); if (!menu.hidden) $('[aria-checked="true"]', menu)?.focus(); });
  menu.addEventListener('click', e => { const o = e.target.closest('[data-salon]'); if (o) { setSalon(o.dataset.salon); close(); btn.focus(); } });
  menu.addEventListener('keydown', e => {
    const opts = $$('.acc-salonsel__opt', menu), i = opts.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); opts[(i + 1) % opts.length].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); opts[(i - 1 + opts.length) % opts.length].focus(); }
    if (e.key === 'Escape') { close(); btn.focus(); }
  });
  document.addEventListener('click', e => { if (!box.contains(e.target)) close(); });
});
document.addEventListener('click', e => { const c = e.target.closest('[data-acc-salonchips] [data-salon]'); if (c) setSalon(c.dataset.salon); });

/* =====================================================================
   ЗАПИСЬ: openBooking + адаптеры (yclients сейчас, 1С потом)
   ===================================================================== */
const bookingProviders = {
  // Формат проверен 11.11.2026: /company/<ID филиала>/personal/select-time?o=s<ID услуги> — услуга передаётся в виджет.
  yclients({ salon: s, service }) {
    const x = SAL[s]; if (!x?.booking) return false;
    const base = x.booking.replace(/\/$/, '');
    const url = !x.branch ? base
      : service ? `${base}/company/${x.branch}/personal/select-time?o=s${encodeURIComponent(service)}`
      : `${base}/company/${x.branch}/personal/select-services`;
    window.open(url, '_blank', 'noopener');
    return true;
  },
  // onec({ salon, service }) { … } — виджет 1С подключится здесь, страницы не меняются
};
const PROVIDER = 'yclients';

function openBooking({ salon: s = salon, procedure, service, specialist, name, consult } = {}) {
  const avail = procedure ? (DATA.avail?.[procedure] || []) : Object.keys(SAL).filter(k => SAL[k].cosmo);
  if (s && (!procedure || avail.includes(s)) && SAL[s]?.cosmo) {
    goal('book_click', { procedure, salon: s });
    if (!bookingProviders[PROVIDER]({ salon: s, procedure, service, specialist })) callSheet(s);
    return;
  }
  const title = consult ? 'Консультация косметолога' : 'Записаться';
  sheet(`<span class="acc-mono">${esc(name || 'Косметология Aldo Coppola')}</span>
    <h2 class="acc-h3">${title}: выберите <span class="acc-it acc-it--red">салон</span></h2>
    <div class="acc-sheet__list">${Object.values(SAL).filter(x => x.cosmo).map(x => {
      const ok = avail.includes(x.slug);
      return `<button type="button" class="acc-sheet__opt" data-sheet-book="${x.slug}" ${ok ? '' : 'aria-disabled="true"'}>
        <span>${esc(x.name)}<small>${ok ? esc(x.address) : 'Этой процедуры здесь нет'}</small></span><span aria-hidden="true">${ok ? '→' : ''}</span></button>`;
    }).join('')}</div>
    <p class="acc-muted" style="font-size:13px">Запись откроется в YClients в новой вкладке. Выбранный салон запомнится для цен на сайте.</p>`,
  box => box.addEventListener('click', e => {
    const b = e.target.closest('[data-sheet-book]');
    if (!b || b.getAttribute('aria-disabled')) return;
    closeSheet(); setSalon(b.dataset.sheetBook);
    openBooking({ salon: b.dataset.sheetBook, procedure, service, specialist, name, consult });
  }));
}

function callSheet(only) {
  const list = Object.values(SAL).filter(x => (only ? x.slug === only : true));
  sheet(`<span class="acc-mono">Позвонить</span><h2 class="acc-h3">Телефоны <span class="acc-it acc-it--red">салонов</span></h2>
    <div class="acc-sheet__list">${list.map(x => `<a class="acc-sheet__opt" href="tel:${x.phone.replace(/[^\d+]/g, '')}" data-goal="phone_click">
      <span>${esc(x.name)}<small>${esc(x.address)}</small></span><span>${esc(x.phone)}</span></a>`).join('')}</div>`);
}

// WhatsApp — мобильные номера салонов (решение заказчика 11.11.2026). Салон выбран — сразу в его чат, иначе выбор.
function whatsapp(text, s = salon) {
  const msg = text || 'Здравствуйте! Хочу записаться в косметологию Aldo Coppola.';
  const open = x => { goal('whatsapp_click', { salon: x.slug }); window.open(`https://wa.me/${x.wa}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener'); };
  if (s && SAL[s]?.wa && SAL[s].cosmo) return open(SAL[s]);
  if (CONFIG.whatsapp) { goal('whatsapp_click'); window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener'); return; }
  sheet(`<span class="acc-mono">WhatsApp</span><h2 class="acc-h3">Написать <span class="acc-it acc-it--red">в салон</span></h2>
    <div class="acc-sheet__list">${Object.values(SAL).filter(x => x.cosmo && x.wa).map(x => `<button type="button" class="acc-sheet__opt" data-sheet-wa="${x.slug}">
      <span>${esc(x.name)}<small>${esc(x.address)}</small></span><span aria-hidden="true">→</span></button>`).join('')}</div>`,
  box => box.addEventListener('click', e => { const b = e.target.closest('[data-sheet-wa]'); if (b) { closeSheet(); open(SAL[b.dataset.sheetWa]); } }));
}

/* ---------- модальное окно-шторка ---------- */
let sheetEl = null, sheetFocus = null;
function sheet(html, init) {
  closeSheet();
  sheetFocus = document.activeElement;
  sheetEl = document.createElement('div');
  sheetEl.className = 'acc-sheet';
  sheetEl.innerHTML = `<div class="acc-sheet__bg" data-sheet-close></div><div class="acc-sheet__box" role="dialog" aria-modal="true">${html}<button type="button" class="acc-sheet__x" data-sheet-close aria-label="Закрыть">✕</button></div>`;
  root.appendChild(sheetEl);
  sheetEl.addEventListener('click', e => { if (e.target.closest('[data-sheet-close]')) closeSheet(); const g = e.target.closest('[data-goal]'); if (g) goal(g.dataset.goal); });
  init?.(sheetEl.querySelector('.acc-sheet__box'));
  (sheetEl.querySelector('.acc-sheet__opt:not([aria-disabled])') || sheetEl.querySelector('.acc-sheet__x')).focus();
  lockScroll(true);
}
function closeSheet() { if (!sheetEl) return; sheetEl.remove(); sheetEl = null; lockScroll(false); sheetFocus?.focus?.(); }

let locks = 0;
function lockScroll(on) { locks = Math.max(0, locks + (on ? 1 : -1)); document.documentElement.style.overflow = locks ? 'hidden' : ''; }

document.addEventListener('click', e => {
  const b = e.target.closest('[data-book]');
  if (b) { e.preventDefault(); openBooking({ procedure: b.dataset.procedure, service: b.dataset.service, name: b.dataset.name, consult: !!b.dataset.consult, salon: b.dataset.salon || salon }); return; }
  if (e.target.closest('[data-acc-call]')) { e.preventDefault(); goal('phone_click'); callSheet(salon || null); return; }
  if (e.target.closest('[data-acc-wa]')) { e.preventDefault(); whatsapp(); return; }
});

/* =====================================================================
   ШАПКА: сжатие при скролле вниз, мобильное меню
   ===================================================================== */
const hdr = $('[data-acc-hdr]');
let lastY = scrollY;
addEventListener('scroll', () => {
  const y = scrollY;
  if (hdr) hdr.classList.toggle('acc-hdr--compact', y > 120 && y > lastY);
  if (y < 60) hdr?.classList.remove('acc-hdr--compact');
  lastY = y;
}, { passive: true });

const drawer = $('[data-acc-drawer]');
$$('[data-acc-menu]').forEach(b => b.addEventListener('click', () => { drawer.hidden = false; b.setAttribute('aria-expanded', 'true'); lockScroll(true); $('a', drawer)?.focus(); }));
$$('[data-acc-menu-close]').forEach(b => b.addEventListener('click', closeDrawer));
function closeDrawer() { if (!drawer || drawer.hidden) return; drawer.hidden = true; lockScroll(false); $('[data-acc-menu]')?.setAttribute('aria-expanded', 'false'); }

/* =====================================================================
   КАРУСЕЛИ (scroll-snap), ВИДЕО В ЗОНЕ ВИДИМОСТИ, ЛАЙТБОКС
   ===================================================================== */
const videoIO = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
  const v = e.target;
  if (e.isIntersecting && !reduce) {
    if (v.dataset.mobile && innerWidth < 900 && !v.dataset.swapped) { v.dataset.swapped = '1'; v.src = v.dataset.mobile; } // облегчённая 720p на телефоне
    v.preload = 'auto'; const p = v.play(); p?.catch?.(() => {});
  } else v.pause();
}), { threshold: .5 }) : null;
$$('video[data-acc-autoplay]').forEach(v => videoIO?.observe(v));

const pad = n => String(n).padStart(2, '0');
$$('[data-acc-car]').forEach(car => {
  const track = $('.acc-car__track', car), bar = $('.acc-car__bar i', car);
  const nav = car.id ? $(`[data-acc-carnav="${car.id}"]`) : null;
  const count = nav && $('.acc-car__count', nav), prev = nav && $('[data-prev]', nav), next = nav && $('[data-next]', nav);
  const slides = () => [...track.children];
  const step = () => { const s = slides()[0]; return s ? s.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 20) : track.clientWidth; };
  const update = () => {
    const max = track.scrollWidth - track.clientWidth, n = slides().length;
    const idx = Math.min(n - 1, Math.round(track.scrollLeft / step()));
    if (count) count.textContent = `${pad(idx + 1)} / ${pad(n)}`;
    if (prev) prev.disabled = track.scrollLeft <= 2;
    if (next) next.disabled = track.scrollLeft >= max - 2;
    const vis = Math.min(1, track.clientWidth / Math.max(1, track.scrollWidth));
    if (bar) { bar.style.width = vis * 100 + '%'; bar.style.left = (max > 0 ? (track.scrollLeft / max) * (1 - vis) * 100 : 0) + '%'; }
    car.querySelector('.acc-car__bar').hidden = vis >= .999;
  };
  prev?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: reduce ? 'auto' : 'smooth' }));
  next?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: reduce ? 'auto' : 'smooth' }));
  track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  track.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { e.preventDefault(); next?.click() ?? track.scrollBy({ left: step() }); } if (e.key === 'ArrowLeft') { e.preventDefault(); prev?.click() ?? track.scrollBy({ left: -step() }); } });
  addEventListener('resize', update);
  update();
  track.addEventListener('click', e => {
    const s = e.target.closest('[data-lb]'); if (!s) return;
    const items = $$('[data-lb]', track).map(x => JSON.parse(x.dataset.lb));
    openLightbox(items, $$('[data-lb]', track).indexOf(s));
  });
});

let lb = null, lbItems = [], lbIdx = 0, lbFocus = null;
function openLightbox(items, i) {
  lbFocus = document.activeElement; lbItems = items; lbIdx = i;
  lb = document.createElement('div');
  lb.className = 'acc-lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Просмотр');
  lb.innerHTML = `<div class="acc-lb__stage"></div><p class="acc-mono acc-lb__cap"></p>
    <button type="button" class="acc-sqbtn acc-lb__x" aria-label="Закрыть">✕</button>
    <button type="button" class="acc-sqbtn acc-lb__p" aria-label="Назад">←</button><button type="button" class="acc-sqbtn acc-lb__n" aria-label="Вперёд">→</button>`;
  root.appendChild(lb); lockScroll(true);
  lb.addEventListener('click', e => {
    if (e.target === lb || e.target.closest('.acc-lb__x')) closeLightbox();
    if (e.target.closest('.acc-lb__p')) moveLB(-1);
    if (e.target.closest('.acc-lb__n')) moveLB(1);
  });
  let tx = null;
  lb.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => { if (tx == null) return; const dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 50) moveLB(dx < 0 ? 1 : -1); tx = null; });
  renderLB(); $('.acc-lb__x', lb).focus();
}
function renderLB() {
  const it = lbItems[lbIdx];
  $('.acc-lb__stage', lb).innerHTML = it.video
    ? `<video src="${esc(it.mobile && innerWidth < 900 ? it.mobile : it.video)}" ${it.poster ? `poster="${esc(it.poster)}"` : ''} controls autoplay playsinline muted></video>`
    : `<img src="${esc(it.src)}" alt="${esc(it.alt || '')}">`;
  $('.acc-lb__cap', lb).textContent = `${it.caption || it.alt || ''}  ${pad(lbIdx + 1)} / ${pad(lbItems.length)}`;
  $$('.acc-lb__p, .acc-lb__n', lb).forEach(b => (b.hidden = lbItems.length < 2));
}
function moveLB(d) { lbIdx = (lbIdx + d + lbItems.length) % lbItems.length; renderLB(); }
function closeLightbox() { if (!lb) return; lb.remove(); lb = null; lockScroll(false); lbFocus?.focus?.(); }

/* =====================================================================
   ПОИСК-ПАЛИТРА
   ===================================================================== */
const pal = $('[data-acc-pal]');
const input = pal && $('[data-acc-pal-input]', pal), list = pal && $('[data-acc-pal-list]', pal), pre = pal && $('[data-acc-pal-pre]', pal);
let idx = null, idxData = null, results = [], sel = 0, palSalon = '', curSalon = '', lastQuery = '', palFocus = null;
const GROUPS = [['goal', 'Цели'], ['procedure', 'Процедуры'], ['device', 'Аппараты'], ['salon', 'Салоны'], ['price', 'Цены']];

async function loadIndex() {
  if (idx) return;
  const [{ default: MiniSearch }, res] = await Promise.all([import('minisearch'), fetch(DATA.searchIndex)]);
  idxData = await res.json();
  idx = new MiniSearch({ ...SEARCH_OPTIONS, tokenize, processTerm });
  idx.addAll(idxData.docs);
}

function openPalette(q = '') {
  if (!pal) return;
  palFocus = document.activeElement;
  closeDrawer();
  pal.hidden = false; lockScroll(true);
  palSalon = salon; syncPalSalon();
  input.value = q; input.focus();
  loadIndex().then(run).catch(() => { list.innerHTML = '<p class="acc-pal__empty acc-muted">Поиск временно недоступен.</p>'; });
  run();
}
function closePalette() { if (!pal || pal.hidden) return; pal.hidden = true; lockScroll(false); palFocus?.focus?.(); }
function syncPalSalon() { $$('[data-pal-salon]', pal).forEach(c => c.setAttribute('aria-pressed', String(c.dataset.palSalon === palSalon))); }

const recent = () => { try { return JSON.parse(store.get('acc-recent') || '[]'); } catch { return []; } };
function remember(r) { const l = recent().filter(x => x.url !== r.url); l.unshift({ name: r.name, url: r.url, type: r.type }); store.set('acc-recent', JSON.stringify(l.slice(0, 5))); }

function search(q) {
  if (!idx) return { hits: [], salon: null };
  return runSearch(idx, idxData, q, palSalon);
}

function itemHTML(h, i, sf) {
  const price = sf && h.prices?.[sf] != null ? h.prices[sf] : h.price;
  const priceTxt = h.type === 'price' && h.priceTo ? `${rub(h.price).replace(' ₽', '')} – ${rub(h.priceTo)}` : price != null ? 'от ' + rub(price) : '';
  const dots = h.type === 'salon' ? '' : `<span class="acc-dots acc-dots--sm" aria-hidden="true">${Object.keys(SAL).map(s => `<span class="acc-dot${(h.salons || []).includes(s) ? ' acc-dot--on' : ''}${s === sf ? ' acc-dot--sel' : ''}"></span>`).join('')}</span>`;
  const term = h.term ? ` <span class="acc-pal__term">· ${esc(h.term)}</span>` : '';
  const na = sf && h.type !== 'salon' && h.salons?.length && !h.salons.includes(sf) ? ` · нет в салоне ${esc(SAL[sf]?.name)}` : '';
  return `<div class="acc-pal__item" role="option" id="acc-opt-${i}" aria-selected="${i === sel}" data-i="${i}">
    <div><span class="acc-pal__name">${esc(h.name)}${term}</span><span class="acc-mono acc-pal__sub">${esc(h.sub || '')}${na}</span></div>
    ${dots}<span class="acc-pal__price">${priceTxt}</span></div>`;
}

function run() {
  if (!pal || pal.hidden) return;
  const q = input.value.trim();
  const recog = $('[data-acc-pal-recog]', pal);
  if (q.length < 2) {
    results = recent().map(r => ({ ...r, sub: 'Недавно смотрели' }));
    sel = 0; recog.textContent = '';
    list.innerHTML = `<div class="acc-pal__empty">
      <span class="acc-mono">Популярные запросы</span>
      <div class="acc-chips">${(idxData?.popular || ['Morpheus8', 'HydraFacial', 'брыли', 'ботокс']).map(p => `<button type="button" class="acc-chip" data-pal-q="${esc(p)}">${esc(p)}</button>`).join('')}</div>
      ${results.length ? `<span class="acc-mono" style="margin-top:12px">Недавно смотрели</span>${results.map((r, i) => itemHTML(r, i, null)).join('')}` : ''}
      <div class="acc-chips" style="margin-top:12px"><a class="acc-link" href="${DATA.base}podbor/">Подобрать по цели</a><a class="acc-link acc-link--red" href="${DATA.base}konsultaciya/">Консультация врача</a></div>
    </div>`;
    pre.innerHTML = previewHTML(null);
    return;
  }
  const { hits, salon: qs } = search(q);
  // салон из запроса действует, пока он есть в строке; чипы — выбор пользователя
  const sf = qs || palSalon;
  $$('[data-pal-salon]', pal).forEach(c => c.setAttribute('aria-pressed', String(c.dataset.palSalon === sf)));
  curSalon = sf;
  // клинический термин, по которому найдена цель
  hits.forEach(h => {
    if (h.type === 'goal' && h.termsList) {
      const qt = tokenize(q).flatMap(t => processTerm(t) || []);
      h.term = h.termsList.find(t => tokenize(t).some(w => qt.some(x => (processTerm(w) || []).some(y => y.startsWith(x) || x.startsWith(y))))) || '';
    }
  });
  const top = hits.slice(0, 24);
  const byType = GROUPS.map(([t, title]) => [title, top.filter(h => h.type === t)]).filter(([, a]) => a.length);
  // порядок групп — по лучшему результату
  byType.sort((a, b) => b[1][0].score - a[1][0].score);
  results = byType.flatMap(([, a]) => a.slice(0, 5));
  sel = 0;
  const firstDev = hits.find(h => h.type === 'device' && normalize(q).length > 3);
  recog.textContent = firstDev && hits[0] === firstDev && normalize(firstDev.name) !== normalize(q) ? `распознано: ${firstDev.name}` : qs ? `салон: ${SAL[qs]?.name}` : '';
  let i = 0;
  list.innerHTML = results.length
    ? byType.map(([title, a]) => `<div class="acc-mono acc-pal__grp">${title}</div>${a.slice(0, 5).map(h => itemHTML(h, i++, sf)).join('')}`).join('')
    : `<div class="acc-pal__empty"><h3 class="acc-h4">Ничего не нашли по запросу «${esc(q)}»</h3>
       <p class="acc-muted">Опишите задачу косметологу — он подскажет, какая процедура подойдёт.</p>
       <div class="acc-chips"><button type="button" class="acc-btn acc-btn--primary" data-acc-wa-q>Опишите задачу косметологу</button><a class="acc-btn acc-btn--secondary" href="${DATA.base}podbor/">Подбор процедуры</a></div></div>`;
  $('[data-acc-pal-count]', pal).textContent = results.length ? `Найдено: ${results.length}` : 'Ничего не найдено';
  pre.innerHTML = previewHTML(results[0], sf);
  input.setAttribute('aria-activedescendant', results.length ? 'acc-opt-0' : '');
  clearTimeout(run.t);
  run.t = setTimeout(() => { if (q !== lastQuery) { lastQuery = q; goal(results.length ? 'search_query' : 'search_zero', { q }); } }, 1200);
}

function previewHTML(h, sf) {
  if (!h) return `<span class="acc-mono">Подсказка</span><p class="acc-muted" style="font-size:15px;line-height:1.55">Ищите своими словами: по цели («брыли», «пигментные пятна»), процедуре, аппарату или салону. Можно с ошибкой или в другой раскладке.</p>`;
  const price = sf && h.prices?.[sf] != null ? h.prices[sf] : h.price;
  const media = h.media ? `<div class="acc-media"><img src="${esc(h.media)}" alt=""></div>` : `<div class="acc-media acc-ph"><div class="acc-ph__hint"><span class="acc-mono">Видео · кадр заказчика</span></div></div>`;
  const pass = (h.pass || []).map(([k, v]) => `<div><span class="acc-mono">${esc(k)}</span><span>${esc(v)}</span></div>`).join('');
  const consult = h.book === 'consult';
  return `${media}<span class="acc-mono">${h.type === 'salon' ? 'Салон' : 'Паспорт'}</span><div class="acc-kv">${pass}${price != null ? `<div><span class="acc-mono">Цена</span><span>от ${rub(price)}</span></div>` : ''}</div>
    <span style="flex:1"></span>
    <a class="acc-btn acc-btn--secondary acc-btn--block" href="${esc(h.url)}">Открыть</a>
    ${h.type === 'procedure' ? `<button type="button" class="acc-btn acc-btn--primary acc-btn--block" data-book data-procedure="${esc(h.url.split('/').filter(Boolean).pop())}" data-name="${esc(h.name)}" ${consult ? 'data-consult="1"' : ''} ${sf ? `data-salon="${sf}"` : ''}>${consult ? 'Записаться на консультацию' : 'Записаться'}</button>` : ''}`;
}

function select(i) {
  const items = $$('.acc-pal__item', list);
  if (!items.length) return;
  sel = (i + items.length) % items.length;
  items.forEach((el, j) => el.setAttribute('aria-selected', String(j === sel)));
  items[sel].scrollIntoView({ block: 'nearest' });
  input.setAttribute('aria-activedescendant', items[sel].id);
  pre.innerHTML = previewHTML(results[sel], curSalon);
}
function go(i) {
  const r = results[i]; if (!r) return;
  remember(r);
  let url = r.url;
  if (curSalon && r.type !== 'salon') { setSalon(curSalon, { push: false }); url += (url.includes('?') ? '&' : '?') + 'salon=' + curSalon; }
  location.href = url;
}

if (pal) {
  input.addEventListener('input', run);
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); select(sel + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); select(sel - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); go(sel); }
    else if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
  });
  list.addEventListener('mousemove', e => { const it = e.target.closest('.acc-pal__item'); if (it && +it.dataset.i !== sel) select(+it.dataset.i); });
  list.addEventListener('click', e => {
    const it = e.target.closest('.acc-pal__item'); if (it) return go(+it.dataset.i);
    const c = e.target.closest('[data-pal-q]'); if (c) { input.value = c.dataset.palQ; input.focus(); run(); }
    if (e.target.closest('[data-acc-wa-q]')) whatsapp(`Здравствуйте! Подскажите, пожалуйста: ${input.value.trim()}`);
  });
  pal.addEventListener('click', e => {
    if (e.target.closest('[data-acc-pal-close]')) closePalette();
    const c = e.target.closest('[data-pal-salon]'); if (c) { palSalon = c.dataset.palSalon; syncPalSalon(); run(); input.focus(); }
    if (e.target.closest('[data-acc-ask]')) { e.preventDefault(); whatsapp(input.value.trim() ? `Здравствуйте! Подскажите, пожалуйста: ${input.value.trim()}` : undefined); }
  });
  // ловушка фокуса
  pal.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const f = $$('button, a[href], input', $('.acc-pal__box', pal)).filter(x => x.offsetParent);
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
    else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
  });
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-acc-search]');
  if (t) { e.preventDefault(); openPalette(t.dataset.q || ''); }
});
// поле поиска на странице (hero): ввод открывает палитру с текстом
$$('[data-acc-search-input]').forEach(f => {
  const inp = f.querySelector('input');
  f.addEventListener('submit', e => { e.preventDefault(); openPalette(inp.value); });
  inp.addEventListener('input', () => { if (inp.value.trim().length >= 2) { const v = inp.value; inp.value = ''; openPalette(v); } });
});
// «бегущие» примеры в плейсхолдере
$$('[data-acc-typing]').forEach(inp => {
  if (reduce) return;
  const ex = JSON.parse(inp.dataset.accTyping); let k = 0;
  setInterval(() => { if (document.activeElement !== inp && !inp.value) { k = (k + 1) % ex.length; inp.placeholder = 'Например: ' + ex[k]; } }, 2600);
});

const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
$$('[data-acc-kbd]').forEach(k => (k.textContent = isMac ? '⌘K' : 'Ctrl K'));
document.addEventListener('keydown', e => {
  const typing = /input|textarea|select/i.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
  if ((e.key === 'k' || e.key === 'K' || e.key === 'л' || e.key === 'Л') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); pal?.hidden ? openPalette() : closePalette(); return; }
  if (e.key === '/' && !typing && pal?.hidden) { e.preventDefault(); openPalette(); return; }
  if (e.key === 'Escape') { if (lb) closeLightbox(); else if (sheetEl) closeSheet(); else if (drawer && !drawer.hidden) closeDrawer(); }
  if (lb && e.key === 'ArrowLeft') moveLB(-1);
  if (lb && e.key === 'ArrowRight') moveLB(1);
});

/* =====================================================================
   ДВИЖЕНИЕ: линии и блоки при появлении
   ===================================================================== */
if ('IntersectionObserver' in window && !reduce) {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('acc-in'); io.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  $$('.acc-reveal, .acc-sechead').forEach(el => io.observe(el));
} else $$('.acc-reveal, .acc-sechead').forEach(el => el.classList.add('acc-in'));

/* ---------- cookie ---------- */
if (!store.get('acc-cookie')) {
  const c = document.createElement('div');
  c.className = 'acc-cookie';
  c.innerHTML = '<span>Сайт использует cookie, чтобы запоминать выбранный салон и улучшать работу сервиса.</span><button type="button" class="acc-btn acc-btn--dark" style="min-height:40px;padding:0 16px">Понятно</button>';
  c.querySelector('button').onclick = () => { store.set('acc-cookie', '1'); c.remove(); };
  root?.appendChild(c);
}

/* =====================================================================
   КАТАЛОГ С ФИЛЬТРАМИ
   ===================================================================== */
const plural = (n, a, b, c) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c; };
$$('[data-acc-cat]').forEach(cat => {
  const items = $$('.acc-cat__item', cat), grid = $('[data-cat-grid]', cat), panel = $('[data-cat-panel]', cat);
  const MULTI = ['napr', 'zona', 'metod'];
  const st = { napr: new Set(), zona: new Set(), metod: new Set(), dlit: '', cel: '', ot: '', do: '' };
  const qp = new URLSearchParams(location.search);
  MULTI.forEach(k => (qp.get(k) || '').split(',').filter(Boolean).forEach(v => st[k].add(v)));
  ['dlit', 'cel', 'ot', 'do'].forEach(k => (st[k] = qp.get(k) || ''));
  const sel = $('[data-f-select="cel"]', cat); if (sel) sel.value = st.cel;
  $$('[data-f-num]', cat).forEach(i => (i.value = st[i.dataset.fNum]));

  const has = (el, k, v) => (el.dataset[k] || '').split(' ').includes(v);
  const fixedSalon = JSON.parse(cat.dataset.fixed || '{}').salon || '';
  const cs = () => fixedSalon || salon;
  function match(el, skip) {
    for (const k of MULTI) if (k !== skip && st[k].size && ![...st[k]].some(v => has(el, k, v))) return false;
    if (skip !== 'salon' && cs() && !has(el, 'salon', cs())) return false;
    if (skip !== 'cel' && st.cel && !has(el, 'cel', st.cel)) return false;
    if (skip !== 'dlit' && st.dlit) { const d = +el.dataset.dlit; if (st.dlit === '30' ? d > 30 : st.dlit === '60' ? d > 60 : d <= 60) return false; }
    const p = +el.dataset.price;
    if (skip !== 'price' && st.ot && p < +st.ot) return false;
    if (skip !== 'price' && st.do && p > +st.do) return false;
    return true;
  }
  function sync(push) {
    let n = 0;
    items.forEach(el => { const ok = match(el); el.hidden = !ok; if (ok) n++; });
    // числа у значений: сколько будет, если выбрать это значение (при прочих фильтрах)
    $$('[data-f]', cat).forEach(c => {
      const k = c.dataset.f, v = c.dataset.v;
      const on = k === 'salon' ? salon === v : k === 'dlit' ? st.dlit === v : st[k].has(v);
      c.setAttribute('aria-pressed', String(on));
      const cnt = items.filter(el => match(el, k) && (k === 'dlit' ? (v === '30' ? +el.dataset.dlit <= 30 : v === '60' ? +el.dataset.dlit <= 60 : +el.dataset.dlit > 60) : has(el, k, v))).length;
      $('[data-n]', c).textContent = on ? '' : cnt;
      c.toggleAttribute('data-zero', !on && cnt === 0);
      if (!on && cnt === 0 && k !== 'salon') {
        const where = [...new Set(items.filter(el => has(el, k, v)).flatMap(el => el.dataset.salon.split(' ')))].filter(Boolean);
        c.title = salon && where.length && !where.includes(salon) ? `Есть только ${where.length === 1 ? 'в салоне' : 'в салонах'}: ${listLoc(where).replace(/^/, '')}` : 'Нет при выбранных фильтрах';
      } else c.removeAttribute('title');
    });
    $$('[data-cat-n], [data-cat-n2]', cat).forEach(x => (x.textContent = n));
    $('[data-cat-w]', cat).textContent = plural(n, 'процедура', 'процедуры', 'процедур');
    const active = MULTI.reduce((a, k) => a + st[k].size, 0) + ['dlit', 'cel', 'ot', 'do'].filter(k => st[k]).length + (salon && !fixedSalon ? 1 : 0);
    $('[data-cat-fn]', cat).textContent = active ? `· ${active}` : '';
    const empty = $('[data-cat-empty]', cat); empty.hidden = n > 0;
    if (!n) {
      const alt = items.filter(el => match(el, 'salon'));
      const where = [...new Set(alt.flatMap(el => el.dataset.salon.split(' ')))].filter(Boolean);
      $('[data-cat-hint]', cat).textContent = cs() && alt.length && !fixedSalon ? `В салоне ${SAL[cs()].name} таких процедур нет. Есть в ${listLoc(where)} — выберите другой салон.` : 'Попробуйте убрать часть фильтров.';
    }
    if (push) {
      const url = new URL(location.href);
      MULTI.forEach(k => (st[k].size ? url.searchParams.set(k, [...st[k]].join(',')) : url.searchParams.delete(k)));
      ['dlit', 'cel', 'ot', 'do'].forEach(k => (st[k] ? url.searchParams.set(k, st[k]) : url.searchParams.delete(k)));
      history.replaceState(null, '', url);
      goal('filter_used');
    }
  }
  cat.addEventListener('click', e => {
    const c = e.target.closest('[data-f]');
    if (c) {
      const k = c.dataset.f, v = c.dataset.v;
      if (k === 'salon') { setSalon(salon === v ? '' : v); return; }
      if (k === 'dlit') st.dlit = st.dlit === v ? '' : v;
      else st[k].has(v) ? st[k].delete(v) : st[k].add(v);
      sync(true); return;
    }
    if (e.target.closest('[data-cat-reset]')) {
      MULTI.forEach(k => st[k].clear()); ['dlit', 'cel', 'ot', 'do'].forEach(k => (st[k] = ''));
      if (sel) sel.value = ''; $$('[data-f-num]', cat).forEach(i => (i.value = ''));
      if (salon) setSalon(''); else sync(true);
    }
    if (e.target.closest('[data-cat-open]')) openPanel(true);
    if (e.target.closest('[data-cat-close]')) openPanel(false);
  });
  sel?.addEventListener('change', () => { st.cel = sel.value; sync(true); });
  $$('[data-f-num]', cat).forEach(i => i.addEventListener('input', () => { st[i.dataset.fNum] = i.value; clearTimeout(i.t); i.t = setTimeout(() => sync(true), 300); }));
  const sortSel = $('[data-cat-sort]', cat);
  sortSel?.addEventListener('change', () => {
    const v = sortSel.value, arr = [...items];
    if (v === 'price') arr.sort((a, b) => a.dataset.price - b.dataset.price);
    else if (v === 'price-desc') arr.sort((a, b) => b.dataset.price - a.dataset.price);
    else if (v === 'name') arr.sort((a, b) => a.dataset.name.localeCompare(b.dataset.name, 'ru'));
    else arr.sort((a, b) => a.dataset.i - b.dataset.i);
    const empty = $('[data-cat-empty]', cat);
    arr.forEach(el => grid.insertBefore(el, empty));
  });
  let shade = null;
  function openPanel(on) {
    panel.classList.toggle('acc-is-open', on);
    if (on) { shade = document.createElement('div'); shade.className = 'acc-cat__shade'; shade.onclick = () => openPanel(false); root.appendChild(shade); lockScroll(true); }
    else if (shade) { shade.remove(); shade = null; lockScroll(false); }
  }
  document.addEventListener('acc:salon', () => sync(false));
  sync(false);
});

/* ---------- таблицы цен: колонка выбранного салона ---------- */
function markCols() {
  $$('[data-acc-pm]').forEach(pm => {
    const has = salon && pm.querySelector(`[data-col="${salon}"]`);
    pm.toggleAttribute('data-sel', !!has); // на телефоне при выбранном салоне видна только его колонка
    $$('[data-col]', pm).forEach(c => c.classList.toggle('acc-is-sel', c.dataset.col === salon));
    $$('tbody tr', pm).forEach(tr => tr.toggleAttribute('data-na', !!has && JSON.parse(tr.dataset.prices || '{}')[salon] == null));
  });
}
document.addEventListener('acc:salon', markCols);
markCols();

/* ---------- закреплённая панель записи (процедура) ---------- */
const stick = $('[data-acc-stick]'), heroCta = $('[data-acc-hero-cta]');
if (stick && heroCta && 'IntersectionObserver' in window) {
  stick.hidden = false;
  new IntersectionObserver(([e]) => stick.classList.toggle('acc-is-on', !e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 }).observe(heroCta);
}

/* ---------- прайс: поиск по странице ---------- */
$$('[data-acc-pfind]').forEach(inp => {
  const scope = $(inp.dataset.accPfind);
  inp.addEventListener('input', () => {
    const q = normalize(inp.value);
    $$('tbody tr', scope).forEach(tr => (tr.hidden = !!q && !normalize(tr.textContent).includes(q)));
    $$('.acc-price-proc', scope).forEach(b => (b.hidden = !!q && !$$('tbody tr', b).some(tr => !tr.hidden) && !normalize($('h3', b).textContent).includes(q)));
    $$('.acc-price-proc', scope).forEach(b => { if (!b.hidden && q && normalize($('h3', b).textContent).includes(q)) $$('tbody tr', b).forEach(tr => (tr.hidden = false)); });
    $$('.acc-price-dir', scope).forEach(d => (d.hidden = !!q && !$$('.acc-price-proc', d).some(b => !b.hidden)));
  });
});

/* ---------- карта по клику (без загрузки при открытии страницы) ---------- */
document.addEventListener('click', e => {
  const m = e.target.closest('[data-acc-map]'); if (!m) return;
  const box = m.closest('.acc-map');
  box.innerHTML = `<iframe title="Карта: ${esc(m.dataset.title || '')}" loading="lazy" src="https://yandex.ru/map-widget/v1/?text=${encodeURIComponent(m.dataset.accMap)}&z=16"></iframe>`;
  box.classList.remove('acc-ph');
});
/* ---------- видеотур по клику ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-acc-tour]'); if (!t) return;
  e.preventDefault(); openLightbox([JSON.parse(t.dataset.accTour)], 0);
});

/* ---------- схема зон ---------- */
$$('[data-acc-zm]').forEach(zm => {
  const show = slug => {
    const p = $(`[data-zm-panel="${slug}"]`, zm); if (!p) return;
    $$('[data-zm-panel]', zm).forEach(x => (x.hidden = x !== p));
    $$('[data-zm-zone]', zm).forEach(x => x.classList.toggle('acc-is-on', x.dataset.zmZone === slug));
  };
  const last = { face: $('[data-zm-svg="face"] .acc-is-on', zm)?.dataset.zmZone, body: $('[data-zm-svg="body"] .acc-is-on', zm)?.dataset.zmZone };
  zm.addEventListener('click', e => {
    const b = e.target.closest('[data-zm-mode]'); if (!b) return;
    const mode = b.dataset.zmMode;
    $$('[data-zm-mode]', zm).forEach(x => x.setAttribute('aria-selected', String(x === b)));
    $$('[data-zm-svg]', zm).forEach(s => s.toggleAttribute('hidden', s.dataset.zmSvg !== mode)); // у SVG нет свойства .hidden
    show(last[mode] || $(`[data-zm-svg="${mode}"] [data-zm-zone]`, zm)?.dataset.zmZone);
  });
  $$('[data-zm-zone]', zm).forEach(pt => {
    const on = () => { show(pt.dataset.zmZone); last[pt.closest('[data-zm-svg]').dataset.zmSvg] = pt.dataset.zmZone; };
    pt.addEventListener('mouseenter', on); pt.addEventListener('focus', on);
  });
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { zm.classList.add('acc-in'); io.disconnect(); } }, { threshold: .2 });
    io.observe(zm);
  } else zm.classList.add('acc-in');
});

applySalon();

window.ACC = { config: CONFIG, get salon() { return salon; }, setSalon, openBooking, bookingProviders, openSearch: openPalette, goal };
