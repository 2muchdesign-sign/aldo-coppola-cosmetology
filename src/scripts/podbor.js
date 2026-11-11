// Мастер подбора /podbor/: 4 шага, прогресс, «назад» без потери ответов. Правила — data/podbor.yaml (через catalog.json).
// Результат — консультация первой карточкой + 2–3 процедуры. Контакты не спрашиваем. Это варианты для обсуждения с врачом.
const box = document.querySelector('[data-acc-podbor]');
if (box) {
  const D = JSON.parse(document.getElementById('acc-podbor-data').textContent);
  const P = Object.fromEntries(D.procedures.map(p => [p.slug, p]));
  const G = Object.fromEntries(D.goals.map(g => [g.slug, g]));
  const SAL = Object.fromEntries(D.salons.map(s => [s.slug, s]));
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rub = n => new Intl.NumberFormat('ru-RU').format(n).replace(/\s/g, ' ') + ' ₽';
  const goal = (n, p) => window.ACC?.goal?.(n, p);
  const st = { step: 0, area: '', goals: new Set(), prefs: new Set(), budget: 0, salon: (window.ACC?.salon) || '' };
  const STEPS = ['Зона', 'Цель', 'Что важно', 'Салон'];
  const stage = box.querySelector('[data-pb-stage]');

  const opt = (attrs, title, sub, on, role = 'button') =>
    `<button type="button" class="acc-wiz__opt" ${attrs} ${role === 'radio' ? `role="radio" aria-checked="${on}"` : `aria-pressed="${on}"`}><b>${esc(title)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}</button>`;

  function render() {
    box.querySelectorAll('.acc-wiz__prog i').forEach((i, k) => i.classList.toggle('acc-is-on', k <= Math.min(st.step, 3)));
    box.querySelector('[data-pb-n]').textContent = st.step < 4 ? `Шаг ${st.step + 1} из 4 · ${STEPS[st.step]}` : 'Результат';
    let h = '';
    if (st.step === 0) {
      h = `<h2 class="acc-h2">Что хотите <span class="acc-it">улучшить?</span></h2>
        <div class="acc-wiz__opts" role="radiogroup" aria-label="Зона">${D.areas.map(a => opt(`data-pb-area="${a.slug}"`, a.name, a.hint, st.area === a.slug, 'radio')).join('')}</div>`;
    } else if (st.step === 1) {
      const area = D.areas.find(a => a.slug === st.area);
      h = `<h2 class="acc-h2">Какой результат <span class="acc-it">нужен?</span></h2><p class="acc-muted">Можно выбрать несколько.</p>
        <div class="acc-wiz__opts">${area.goals.filter(g => G[g]).map(g => opt(`data-pb-goal="${g}"`, G[g].name, G[g].terms.slice(0, 3).join(', '), st.goals.has(g))).join('')}</div>`;
    } else if (st.step === 2) {
      h = `<h2 class="acc-h2">Что для вас <span class="acc-it">важно?</span></h2><p class="acc-muted">Можно пропустить или выбрать несколько.</p>
        <div class="acc-wiz__opts">${D.prefs.map(p => opt(`data-pb-pref="${p.slug}"`, p.name, p.budgets ? (st.budget ? `до ${rub(st.budget)}` : 'выберите сумму') : '', st.prefs.has(p.slug))).join('')}</div>
        ${st.prefs.has('byudzhet') ? `<div class="acc-wiz__budget" role="radiogroup" aria-label="Бюджет">${D.prefs.find(p => p.budgets).budgets.map(b => `<button type="button" class="acc-chip" role="radio" aria-checked="${st.budget === b}" aria-pressed="${st.budget === b}" data-pb-budget="${b}">до ${rub(b)}</button>`).join('')}</div>` : ''}`;
    } else if (st.step === 3) {
      h = `<h2 class="acc-h2">Где вам <span class="acc-it">удобно?</span></h2>
        <div class="acc-wiz__opts" role="radiogroup" aria-label="Салон">${opt('data-pb-salon=""', 'Любой салон', 'Покажем, где есть', st.salon === '', 'radio')}${D.salons.filter(s => s.cosmo).map(s => opt(`data-pb-salon="${s.slug}"`, s.name, s.address, st.salon === s.slug, 'radio')).join('')}</div>`;
    } else h = resultHTML();
    const canNext = st.step === 0 ? !!st.area : st.step === 1 ? st.goals.size > 0 : st.step === 2 ? !(st.prefs.has('byudzhet') && !st.budget) : true;
    h += st.step < 4
      ? `<div class="acc-wiz__nav">${st.step ? '<button type="button" class="acc-btn acc-btn--secondary" data-pb-back>← Назад</button>' : ''}<span class="acc-sp"></span>
         <button type="button" class="acc-btn acc-btn--dark acc-btn--lg" data-pb-next ${canNext ? '' : 'disabled aria-disabled="true" style="opacity:.4;cursor:default"'}>${st.step === 3 ? 'Показать варианты' : 'Дальше'}</button></div>`
      : `<div class="acc-wiz__nav"><button type="button" class="acc-btn acc-btn--secondary" data-pb-back>← Изменить ответы</button><span class="acc-sp"></span><button type="button" class="acc-link" data-pb-restart>Начать заново</button></div>`;
    box.classList.toggle('acc-wiz--res', st.step === 4);
    stage.innerHTML = `<div class="acc-wiz__step">${h}</div>`;
  }

  function pick() {
    const prefs = D.prefs.filter(p => st.prefs.has(p.slug));
    const exDir = new Set(prefs.flatMap(p => p.exclude_directions || []));
    const exProc = new Set(prefs.flatMap(p => p.exclude || []));
    const prefer = new Set(prefs.flatMap(p => p.prefer || []));
    const score = {};
    for (const g of st.goals) for (const s of G[g]?.procedures || []) score[s] = (score[s] || 0) + 3;
    const price = p => (st.salon ? p.prices[st.salon] : Math.min(...Object.values(p.prices)));
    let list = Object.keys(score).map(s => P[s]).filter(Boolean)
      .filter(p => !exDir.has(p.direction) && !exProc.has(p.slug))
      .filter(p => !st.salon || p.prices[st.salon] != null)
      .filter(p => !st.budget || price(p) <= st.budget);
    list.forEach(p => { if (prefer.has(p.slug)) score[p.slug] += 2; });
    list.sort((a, b) => score[b.slug] - score[a.slug] || price(a) - price(b));
    return { list: list.slice(0, D.max), price, why: p => [...st.goals].filter(g => G[g]?.procedures.includes(p.slug)).map(g => G[g].name) };
  }

  function card(p, price, why) {
    const dots = D.salons.map(s => `<span class="acc-dot${p.prices[s.slug] != null ? ' acc-dot--on' : ''}${s.slug === st.salon ? ' acc-dot--sel' : ''}"></span>`).join('');
    return `<article class="acc-card">
      <div class="acc-ph acc-card__media" style="aspect-ratio:4/5"><div class="acc-ph__hint"><span class="acc-mono">${esc(p.method)}</span></div></div>
      <div class="acc-card__meta"><span class="acc-chip acc-chip--sm acc-chip--static">${esc(p.method)}</span><span class="acc-dots acc-dots--sm" role="img" aria-label="Где есть: ${esc(Object.keys(p.prices).map(s => SAL[s].name).join(', '))}">${dots}</span></div>
      <h3 class="acc-card__name"><a href="${p.url}${st.salon ? `?salon=${st.salon}` : ''}">${esc(p.name)}</a></h3>
      <p class="acc-card__line">${esc(p.line)}</p>
      <p class="acc-wiz__why">Подходит для: ${esc(why.join(', '))}</p>
      <div class="acc-card__foot"><span class="acc-card__price">от ${rub(price)}</span>
      <button type="button" class="acc-btn acc-btn--primary acc-card__book" data-book data-procedure="${p.slug}" data-name="${esc(p.name)}" ${p.consult ? 'data-consult="1"' : ''} ${st.salon ? `data-salon="${st.salon}"` : ''}>${p.consult ? 'Консультация' : 'Записаться'}</button></div>
    </article>`;
  }

  function resultHTML() {
    const { list, price, why } = pick();
    goal('podbor_result', { area: st.area, goals: [...st.goals].join(','), salon: st.salon, n: list.length });
    const goalsTxt = [...st.goals].map(g => G[g]?.name).join(', ');
    const consult = `<article class="acc-wiz__consult"><div style="display:flex;flex-direction:column;gap:12px"><span class="acc-mono acc-mono--red">Первый шаг</span>
      <h3 class="acc-h3">Консультация <span class="acc-it">косметолога</span></h3>
      <p class="acc-muted">Врач осмотрит кожу, учтёт противопоказания и выберет из вариантов ниже — или предложит другой план.${st.salon ? ` Салон: ${esc(SAL[st.salon].name)}.` : ''}</p></div>
      <button type="button" class="acc-btn acc-btn--primary acc-btn--block" data-book data-consult="1" data-name="Консультация косметолога" ${st.salon ? `data-salon="${st.salon}"` : ''}>Записаться на консультацию</button></article>`;
    const prefNote = [...st.prefs].filter(s => ['bez-vosstanovleniya', 'bystryy-effekt'].includes(s)).map(s => D.prefs.find(p => p.slug === s).name.toLowerCase());
    return `<h2 class="acc-h2">Варианты для <span class="acc-it">обсуждения</span></h2>
      <p class="acc-wiz__note">Варианты для обсуждения с врачом, не диагноз. Подобрано по ответам: ${esc(goalsTxt)}${st.salon ? ` · ${esc(SAL[st.salon].name)}` : ''}.${prefNote.length ? ` Пожелания «${esc(prefNote.join('», «'))}» врач учтёт на консультации.` : ''}</p>
      <div class="acc-wiz__res">${consult}${list.map(p => card(p, price(p), why(p))).join('')}</div>
      ${list.length ? '' : `<p class="acc-muted">Под все условия процедур не нашлось${st.salon ? ` в салоне ${esc(SAL[st.salon].name)}` : ''}. Попробуйте другой салон или бюджет — или обсудите задачу на консультации.</p>`}
      <p class="acc-note">Имеются противопоказания. Необходима консультация специалиста. Цены «от» — из прайсов салонов; итоговая стоимость — после консультации.</p>`;
  }

  box.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t || t.disabled) return;
    if (t.dataset.pbArea !== undefined) { if (st.area !== t.dataset.pbArea) st.goals.clear(); st.area = t.dataset.pbArea; render(); return; }
    if (t.dataset.pbGoal) { st.goals.has(t.dataset.pbGoal) ? st.goals.delete(t.dataset.pbGoal) : st.goals.add(t.dataset.pbGoal); render(); return; }
    if (t.dataset.pbPref) { const s = t.dataset.pbPref; st.prefs.has(s) ? st.prefs.delete(s) : st.prefs.add(s); if (s === 'byudzhet' && !st.prefs.has(s)) st.budget = 0; render(); return; }
    if (t.dataset.pbBudget) { st.budget = +t.dataset.pbBudget; render(); return; }
    if (t.dataset.pbSalon !== undefined) { st.salon = t.dataset.pbSalon; render(); return; }
    if (t.hasAttribute('data-pb-next')) { st.step++; goal('podbor_step', { step: st.step }); render(); box.scrollIntoView({ block: 'start' }); stage.querySelector('h2')?.focus?.(); return; }
    if (t.hasAttribute('data-pb-back')) { st.step = Math.max(0, st.step - 1); render(); return; }
    if (t.hasAttribute('data-pb-restart')) { Object.assign(st, { step: 0, area: '', budget: 0 }); st.goals.clear(); st.prefs.clear(); render(); }
  });
  box.querySelector('[data-pb-fallback]')?.remove();
  render();
}
