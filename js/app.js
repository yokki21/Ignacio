// Ignacio · nutrición y gimnasio. Arranque, navegación y vistas Hoy y Diario.
import { S, N, store, getDay, saveDay, targetsFor, dayTotals, menuFor, prefs, meals } from './ctx.js';
import { esc, r0, r1, n0, fdate, sheet, toast, ring, bar, uid } from './ui.js';
import { setRenderer, rerender, go, on } from './nav.js';
import { openAddFood, saveSlotAsRecipe } from './v-food.js';
import { openWizard } from './v-cuestionario.js';
import { viewGym, nextRoutineCard } from './v-gym.js';
import { viewProgreso, checkInDue } from './v-progreso.js';
import { viewAjustes } from './v-ajustes.js';
import * as sync from './sync.js';

const main = document.getElementById('main');
const today = () => N.iso();
let diaryDate = today();

const COLORS = { p: 'var(--prot)', c: 'var(--carb)', f: 'var(--fat)' };

// ---------------- arranque ----------------
function boot() {
  setRenderer(render);
  window.addEventListener('hashchange', render);
  store.onChange((k) => { if (k === '*') render(); });
  sync.init();
  sync.onStatus((st) => {
    const dot = document.getElementById('sync-dot');
    if (dot) { dot.dataset.st = st; dot.title = { local: 'Solo en este dispositivo', conectando: 'Conectando…', sincronizado: 'Sincronizado', pendiente: 'Guardando…', error: 'Error de sincronización' }[st]; }
  });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  render();
}

function render() {
  if (!S.profile() || store.get('qdone') !== 2) { main.innerHTML = ''; if (!document.querySelector('#wiz')) openWizard(); return; }
  const [route, ...params] = (location.hash.replace(/^#\/?/, '') || 'hoy').split('/');
  document.querySelectorAll('.bottom-nav a').forEach(a => a.classList.toggle('on', a.dataset.r === route));
  window.scrollTo(0, 0);
  const views = { hoy: viewHoy, diario: viewDiario, gym: viewGym, progreso: viewProgreso, ajustes: viewAjustes };
  (views[route] || viewHoy)(main, params);
}

// ---------------- HOY ----------------
function viewHoy(root) {
  const d = today();
  const prof = S.profile();
  const tgt = targetsFor(d);
  const tot = dayTotals(d);
  const day = getDay(d);
  const set = S.settings();
  const menu = menuFor(d);
  const left = tgt.kcal - tot.kcal;
  const wToday = S.weights().find(w => w.date === d);
  const extra = day.entries.filter(e => !meals().some(m => m.id === e.slot));

  root.innerHTML = `
    <header class="top"><div><h1>Hola${prof.name ? ', ' + esc(prof.name) : ''}</h1><p class="muted cap">${fdate(d)}</p></div><span id="sync-dot" data-st="${sync.getStatus()}"></span></header>
    ${checkInDue() ? `<a class="banner" href="#/progreso">Toca la revisión semanal: ajusta tus calorías con tu peso real ›</a>` : ''}
    <section class="card">
      <div class="kcal-row">
        ${ring(tot.kcal, tgt.kcal, { label: n0(Math.abs(left)), sub: left >= 0 ? 'kcal restantes' : 'kcal de más' })}
        <div class="kcal-side">
          <div><span class="muted small">Objetivo</span><b>${n0(tgt.kcal)} kcal</b></div>
          <div><span class="muted small">Comido</span><b>${n0(tot.kcal)} kcal</b></div>
          ${tgt.kcal !== tgt.base ? `<div class="muted small">${tgt.kcal > tgt.base ? 'Día con margen de finde' : 'Entre semana: algo menos para el finde'}</div>` : ''}
        </div>
      </div>
      ${bar('Proteína', tot.p, tgt.p, COLORS.p)}${bar('Hidratos', tot.c, tgt.c, COLORS.c)}${bar('Grasa', tot.f, tgt.f, COLORS.f)}
      <button class="btn primary block" data-add="">+ Añadir comida</button>
    </section>
    ${S.gym().trains ? nextRoutineCard() : ''}
    <h2 class="sec">Menú de hoy</h2>
    ${menu.map(m => mealCard(m, day)).join('')}
    ${extra.length ? `<section class="card"><div class="meal-head"><b>Picoteo y extras</b><span class="muted small">${r0(N.sumMacros(extra).kcal)} kcal</span></div>
      <ul class="items">${extra.map(e => `<li><span>${esc(e.name)}</span><span class="muted small">${r0(e.kcal)} kcal</span></li>`).join('')}</ul></section>` : ''}
    <h2 class="sec">Hábitos</h2>
    <section class="card">
      <div class="habit"><span>💧 Agua</span><span class="row gap"><button class="icon-btn" data-water="-1">−</button><b>${r1(day.water / 1000)} / ${r1(set.waterGoal / 1000)} L</b><button class="icon-btn" data-water="1">+</button></span></div>
      <div class="mini-track"><div style="width:${Math.min(100, day.water / set.waterGoal * 100)}%"></div></div>
      <div class="habit"><span>👟 Pasos</span><span class="row gap"><input class="input xs w" id="steps" type="number" inputmode="numeric" value="${day.steps ?? ''}" placeholder="0"><span class="muted small">/ ${n0(set.stepGoal)}</span></span></div>
      ${set.supplements.map(s => `<label class="habit check"><span>💊 ${esc(s.name)}</span><input type="checkbox" data-sup="${esc(s.id)}" ${day.supps[s.id] ? 'checked' : ''}></label>`).join('')}
      <div class="habit"><span>⚖️ Peso de hoy</span>${wToday ? `<b>${r1(wToday.kg)} kg</b>` : `<span class="row gap"><input class="input xs w" id="wq" type="number" inputmode="decimal" step="0.1" placeholder="kg"><button class="btn sm" id="wq-ok">Guardar</button></span>`}</div>
    </section>`;

  on(root, '[data-water]', 'click', b => { saveDay(d, x => { x.water = Math.max(0, x.water + (+b.dataset.water) * set.glass); }); rerender(); });
  on(root, '#steps', 'change', i => saveDay(d, x => { x.steps = parseInt(i.value, 10) || null; }));
  on(root, '[data-sup]', 'change', i => saveDay(d, x => { x.supps[i.dataset.sup] = i.checked; }));
  on(root, '#wq-ok', 'click', () => {
    const kg = parseFloat(root.querySelector('#wq').value);
    if (!kg || kg < 30 || kg > 300) return toast('Pon un peso válido');
    store.set('weights', [...S.weights().filter(w => w.date !== d), { date: d, kg }]);
    toast('Peso guardado'); rerender();
  });
  bindMenu(root, d, menu);
  on(root, '[data-start-routine]', 'click', b => { import('./v-gym.js').then(m => m.startSession(b.dataset.startRoutine)); });
}

function mealCard(m, day) {
  const eaten = day.eaten[m.slot.id];
  const logged = N.sumMacros(day.entries.filter(e => e.slot === m.slot.id));
  return `<section class="card meal ${eaten ? 'eaten' : ''}">
    <div class="meal-head"><b>${esc(m.slot.name)}</b><span class="muted small">${r0(m.totals.kcal)} kcal · P ${r0(m.totals.p)} g</span></div>
    <p class="muted small">${esc(m.template)}</p>
    ${m.items.length ? `<ul class="items">${m.items.map(it => `<li><span><b>${fmtQty(it)}</b> ${esc(it.name)}</span><button class="swap" data-swap="${m.slot.id}|${it.idx}" title="Cambiar este alimento" aria-label="Cambiar ${esc(it.name)}">⇄</button></li>`).join('')}</ul>` : '<p class="small warn">No hay alimentos compatibles con tus preferencias para este plato. Cambia el plato o revisa tus alergias en Ajustes.</p>'}
    ${logged.kcal ? `<p class="small ok">Registrado: ${r0(logged.kcal)} kcal · P ${r0(logged.p)} g</p>` : ''}
    <div class="row gap wrap">
      ${eaten ? `<button class="btn sm ghost" data-undo="${m.slot.id}">Deshacer</button>` : `<button class="btn sm primary" data-eat="${m.slot.id}" ${m.items.length ? '' : 'disabled'}>✓ Lo he comido</button>`}
      <button class="btn sm ghost" data-reroll="${m.slot.id}" ${eaten ? 'disabled' : ''}>Cambiar plato</button>
      <button class="btn sm ghost" data-add="${m.slot.id}">+ Añadir</button>
    </div></section>`;
}

function fmtQty(it) {
  const f = N.findFood(it.foodId, S.foods());
  const u = f?.units?.[0];
  if (u && it.g % u.g === 0 && it.g / u.g <= 6 && ['huevo', 'wrap', 'clara', 'tortitas', 'platano', 'manzana', 'naranja', 'kiwi', 'mandarina', 'pera', 'yogpro', 'skyr'].includes(f.id)) {
    const n = it.g / u.g; return `${n} ${u.n}${n > 1 && !u.n.includes('(') ? 's' : ''}`;
  }
  return `${r0(it.g)} ${['lechesemi', 'lechedes'].includes(it.foodId) ? 'ml' : 'g'}`;
}

function bindMenu(root, d, menu) {
  on(root, '[data-eat]', 'click', b => {
    const m = menu.find(x => x.slot.id === b.dataset.eat);
    saveDay(d, x => {
      x.eaten[m.slot.id] = true;
      m.items.forEach(it => x.entries.push({ id: uid(), slot: m.slot.id, foodId: it.foodId, name: it.name, g: it.g, kcal: it.kcal, p: it.p, c: it.c, f: it.f, fromMenu: true }));
    });
    toast('Registrado en el diario'); rerender();
  });
  on(root, '[data-undo]', 'click', b => {
    saveDay(d, x => { x.eaten[b.dataset.undo] = false; x.entries = x.entries.filter(e => !(e.slot === b.dataset.undo && e.fromMenu)); });
    rerender();
  });
  on(root, '[data-reroll]', 'click', b => {
    const m = menu.find(x => x.slot.id === b.dataset.reroll);
    const alts = N.mealAlternatives(m.slot, targetsFor(d), d, prefs(), { exclude: N.mealKey(m) });
    const t = m.targets;
    sheet(`<div class="sheet-head"><h3>Cambiar ${esc(m.slot.name.toLowerCase())}</h3><button class="icon-btn" data-close>✕</button></div>
      <p class="muted small">Objetivo de esta comida: <b>${r0(t.kcal)} kcal</b> · P ${r0(t.p)} · H ${r0(t.c)} · G ${r0(t.f)} g. Elige uno:</p>
      <div class="alts">${alts.map((a, i) => `<button class="alt" data-alt="${i}"><div class="alt-head"><b>${esc(a.template)}</b><span>${r0(a.totals.kcal)} kcal</span></div>
        <div class="small">${a.items.map(it => `${fmtQty(it)} ${esc(it.name)}`).join(' · ')}</div>
        <div class="muted small">P ${r0(a.totals.p)} · H ${r0(a.totals.c)} · G ${r0(a.totals.f)} g</div></button>`).join('') || '<p class="muted">No hay más opciones con tus preferencias.</p>'}</div>`, {
      full: true,
      onMount: (el, close) => on(el, '[data-alt]', 'click', x => {
        const a = alts[+x.dataset.alt];
        saveDay(d, day => { day.seeds[m.slot.id] = a.seed; day.swaps[m.slot.id] = {}; });
        close(); toast('Plato cambiado'); rerender();
      }),
    });
  });
  on(root, '[data-add]', 'click', b => openAddFood(d, b.dataset.add));
  on(root, '[data-swap]', 'click', b => {
    const [slotId, idx] = b.dataset.swap.split('|');
    const m = menu.find(x => x.slot.id === slotId);
    const it = m.items.find(x => String(x.idx) === idx);
    const opts = N.swapOptions(it, prefs());
    sheet(`<div class="sheet-head"><h3>Cambiar ${esc(it.name)}</h3><button class="icon-btn" data-close>✕</button></div>
      <p class="muted small">${it.role === 'X' ? 'Misma cantidad.' : `Cantidad equivalente en ${{ P: 'proteína', C: 'hidratos', F: 'grasa' }[it.role]}.`} El resto del plato se reajusta.</p>
      <div class="list">${opts.map(o => `<button class="li" data-to="${esc(o.food.id)}"><span><b>${r0(o.g)} g ${esc(o.food.name)}</b><small>${r0(o.kcal)} kcal · P ${r1(o.p)} · H ${r1(o.c)} · G ${r1(o.f)}</small></span><span class="small ${o.diff > 0 ? 'warn' : 'ok'}">${o.diff > 0 ? '+' : ''}${r0(o.diff)} kcal</span></button>`).join('') || '<p class="muted">No hay alternativas en este grupo.</p>'}</div>`, {
      full: true,
      onMount: (el, close) => on(el, '[data-to]', 'click', x => {
        saveDay(d, day => { day.swaps[slotId] = { ...(day.swaps[slotId] || {}), [idx]: x.dataset.to }; });
        close(); rerender();
      }),
    });
  });
}

// ---------------- DIARIO ----------------
function viewDiario(root) {
  const d = diaryDate;
  const day = getDay(d);
  const tgt = targetsFor(d);
  const tot = N.sumMacros(day.entries);
  const slots = [...meals(), { id: 'extra', name: 'Picoteo y extras' }];
  const orphan = day.entries.filter(e => !slots.some(s => s.id === e.slot));
  if (orphan.length) slots.push({ id: '__otros', name: 'Otras comidas' });

  root.innerHTML = `
    <header class="top"><h1>Diario</h1><span id="sync-dot" data-st="${sync.getStatus()}"></span></header>
    <div class="datenav"><button class="icon-btn" id="dprev">‹</button><b class="cap">${d === today() ? 'Hoy, ' : ''}${fdate(d)}</b><button class="icon-btn" id="dnext" ${d >= today() ? 'disabled' : ''}>›</button></div>
    <section class="card totals">
      <div><b>${n0(tot.kcal)}</b><small>/ ${n0(tgt.kcal)} kcal</small></div>
      <div style="color:var(--prot)"><b>${r0(tot.p)}</b><small>/ ${tgt.p} P</small></div>
      <div style="color:var(--carb)"><b>${r0(tot.c)}</b><small>/ ${tgt.c} H</small></div>
      <div style="color:var(--fat)"><b>${r0(tot.f)}</b><small>/ ${tgt.f} G</small></div>
    </section>
    ${slots.map(s => {
      const es = s.id === '__otros' ? orphan : day.entries.filter(e => e.slot === s.id);
      const st = N.sumMacros(es);
      return `<section class="card">
        <div class="meal-head"><b>${esc(s.name)}</b><span class="muted small">${r0(st.kcal)} kcal</span></div>
        <div class="list">${es.map(e => `<button class="li" data-e="${e.id}"><span><b>${esc(e.name)}</b><small>${e.servings ? r1(e.servings) + ' ración(es)' : e.g ? r0(e.g) + ' g' : ''} · P ${r0(e.p)} · H ${r0(e.c)} · G ${r0(e.f)}</small></span><span class="small">${r0(e.kcal)}</span></button>`).join('')}</div>
        <div class="row gap"><button class="btn sm ghost" data-add="${s.id === '__otros' ? 'extra' : s.id}">+ Añadir</button>${es.some(e => e.foodId) ? `<button class="btn sm ghost" data-save="${s.id}">Guardar como comida</button>` : ''}</div>
      </section>`;
    }).join('')}
    <h2 class="sec">Actividad</h2>
    <section class="card">
      <div class="list">${day.acts.map((a, i) => `<div class="li"><span><b>${esc(a.type)}</b><small>${a.min} min${a.note ? ' · ' + esc(a.note) : ''}</small></span><button class="icon-btn" data-delact="${i}">✕</button></div>`).join('') || '<p class="muted small">Sin actividad registrada.</p>'}</div>
      <div class="row gap"><select class="input" id="act-t"><option>Fútbol</option><option>Pádel</option><option>Cinta</option><option>Caminar</option><option>Otro</option></select>
        <input class="input xs w" id="act-m" type="number" inputmode="numeric" placeholder="min"><button class="btn sm" id="act-ok">Añadir</button></div>
      <p class="muted small">Las calorías del deporte no se suman al objetivo: el ajuste semanal ya tiene en cuenta tu gasto real.</p>
    </section>
    <label class="habit check card"><span>Día mal registrado (no contar para el ajuste semanal)</span><input type="checkbox" id="excl" ${day.excluded ? 'checked' : ''}></label>`;

  on(root, '#dprev', 'click', () => { diaryDate = N.addDays(d, -1); rerender(); });
  on(root, '#dnext', 'click', () => { diaryDate = N.addDays(d, 1); rerender(); });
  on(root, '[data-add]', 'click', b => openAddFood(d, b.dataset.add));
  on(root, '[data-save]', 'click', b => saveSlotAsRecipe(d, b.dataset.save));
  on(root, '[data-e]', 'click', b => editEntry(d, b.dataset.e));
  on(root, '#act-ok', 'click', () => {
    const min = parseInt(root.querySelector('#act-m').value, 10);
    if (!min) return toast('Pon los minutos');
    saveDay(d, x => { x.acts.push({ type: root.querySelector('#act-t').value, min }); }); rerender();
  });
  on(root, '[data-delact]', 'click', b => { saveDay(d, x => { x.acts.splice(+b.dataset.delact, 1); }); rerender(); });
  on(root, '#excl', 'change', i => saveDay(d, x => { x.excluded = i.checked; }));
}

function editEntry(date, id) {
  const e = getDay(date).entries.find(x => x.id === id);
  if (!e) return;
  const food = e.foodId ? N.findFood(e.foodId, S.foods()) : null;
  sheet(`<div class="sheet-head"><h3>${esc(e.name)}</h3><button class="icon-btn" data-close>✕</button></div>
    ${food ? `<label class="lbl">Gramos</label><input class="input" id="ee-g" type="number" inputmode="decimal" value="${r0(e.g)}">` : e.servings ? `<label class="lbl">Raciones</label><input class="input" id="ee-s" type="number" inputmode="decimal" step="0.25" value="${e.servings}">` : `<p class="muted">${r0(e.kcal)} kcal</p>`}
    <div class="row gap"><button class="btn danger-ghost" id="ee-del">Borrar</button><button class="btn primary grow" id="ee-ok">Guardar</button></div>`, {
    onMount: (el, close) => {
      el.querySelector('#ee-del').addEventListener('click', () => { saveDay(date, d => { d.entries = d.entries.filter(x => x.id !== id); }); close(); rerender(); });
      el.querySelector('#ee-ok').addEventListener('click', () => {
        saveDay(date, d => {
          const x = d.entries.find(y => y.id === id);
          if (food) { const g = parseFloat(el.querySelector('#ee-g').value) || 0; Object.assign(x, { g }, N.macros(food, g)); }
          else if (x.servings) { const s = parseFloat(el.querySelector('#ee-s').value) || 0; const k = s / x.servings; Object.assign(x, { servings: s, g: x.g * k, kcal: x.kcal * k, p: x.p * k, c: x.c * k, f: x.f * k }); }
        });
        close(); rerender();
      });
    },
  });
}

export { diaryDate };
boot();
