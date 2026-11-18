// Ignacio · nutrición y gimnasio. Arranque, navegación y vistas Hoy y Diario.
import { S, N, store, getDay, saveDay, targetsFor, dayTypeOf, dayTotals, menuFor, defaultProfile, weightNow } from './ctx.js';
import { esc, r0, r1, n0, fdate, sheet, toast, ring, bar, uid, confirmSheet } from './ui.js';
import { setRenderer, rerender, go, on } from './nav.js';
import { openAddFood, addEntry, amountSheet, saveSlotAsRecipe } from './v-food.js';
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
  if (!S.profile()) onboarding(); else render();
}

function render() {
  if (!S.profile()) return onboarding();
  const [route, ...params] = (location.hash.replace(/^#\/?/, '') || 'hoy').split('/');
  document.querySelectorAll('.bottom-nav a').forEach(a => a.classList.toggle('on', a.dataset.r === route));
  window.scrollTo(0, 0);
  const views = { hoy: viewHoy, diario: viewDiario, gym: viewGym, progreso: viewProgreso, ajustes: viewAjustes };
  (views[route] || viewHoy)(main, params);
}

// ---------------- configuración inicial ----------------
function onboarding() {
  const p = defaultProfile();
  main.innerHTML = '';
  sheet(`
    <h2>Bienvenido a Ignacio</h2>
    <p class="muted">Configura tu perfil. Los datos de partida ya están puestos; revísalos y añade tu peso de hoy.</p>
    <div class="grid2">
      <div><label class="lbl">Nombre</label><input class="input" id="ob-name" value="${esc(p.name)}"></div>
      <div><label class="lbl">Sexo</label><select class="input" id="ob-sex"><option value="h">Hombre</option><option value="m">Mujer</option></select></div>
      <div><label class="lbl">Edad</label><input class="input" id="ob-age" type="number" value="${p.age}"></div>
      <div><label class="lbl">Altura (cm)</label><input class="input" id="ob-h" type="number" value="${p.height}"></div>
      <div><label class="lbl">Peso hoy (kg)</label><input class="input" id="ob-w" type="number" inputmode="decimal" step="0.1" placeholder="En ayunas"></div>
      <div><label class="lbl">% grasa (báscula)</label><input class="input" id="ob-bf" type="number" inputmode="decimal" step="0.1" value="${p.bodyFat}"></div>
    </div>
    <label class="lbl">Actividad (gimnasio, deporte, pasos y trabajo)</label>
    <select class="input" id="ob-act">
      <option value="1.3">Poco activo</option><option value="1.4">Algo activo</option>
      <option value="1.5" selected>Activo: gym 5 días + deporte + ~10k pasos</option><option value="1.65">Muy activo</option>
    </select>
    <label class="lbl">Ritmo de pérdida</label>
    <select class="input" id="ob-rate"><option value="0.5">0,5 % del peso/semana</option><option value="0.75" selected>0,75 % del peso/semana</option><option value="1">1 % del peso/semana</option></select>
    <label class="lbl">¿Conoces tu mantenimiento? (kcal, opcional)</label>
    <input class="input" id="ob-tdee" type="number" placeholder="Si no, se estima y se ajusta solo">
    <p class="muted small">El objetivo se recalcula cada semana con tu peso real y lo que registras, así que el cálculo inicial solo es el punto de partida.</p>
    <button class="btn primary block" id="ob-ok">Empezar</button>`, {
    full: true,
    onMount: (el, close) => {
      el.parentElement.querySelector('.sheet-bg').replaceWith(Object.assign(document.createElement('div'), { className: 'sheet-bg' }));
      el.querySelector('#ob-ok').addEventListener('click', () => {
        const v = (id) => parseFloat(el.querySelector(id).value);
        const w = v('#ob-w');
        if (!w || w < 30) return toast('Pon tu peso de hoy');
        const prof = { ...p, name: el.querySelector('#ob-name').value.trim() || 'Yo', sex: el.querySelector('#ob-sex').value, age: v('#ob-age'), height: v('#ob-h'),
          bodyFat: v('#ob-bf') || null, bfWeight: w, startWeight: w, activity: v('#ob-act'), rate: v('#ob-rate'), manualTdee: v('#ob-tdee') || null };
        store.set('profile', prof);
        store.set('weights', [{ date: today(), kg: w }]);
        store.set('plan', { tdee: N.initialTdee(prof, w), created: today(), lastCheck: null, history: [] });
        close(); render();
      });
    },
  });
}

// ---------------- HOY ----------------
function viewHoy(root) {
  const d = today();
  const prof = S.profile();
  const tgt = targetsFor(d);
  const tot = dayTotals(d);
  const day = getDay(d);
  const types = S.dayTypes();
  const curType = dayTypeOf(d);
  const set = S.settings();
  const menu = menuFor(d);
  const left = tgt.kcal - tot.kcal;
  const wToday = S.weights().find(w => w.date === d);

  root.innerHTML = `
    <header class="top"><div><h1>Hola, ${esc(prof.name)}</h1><p class="muted cap">${fdate(d)}</p></div><span id="sync-dot" data-st="${sync.getStatus()}"></span></header>
    <div class="seg" id="dtype">${Object.entries(types).map(([k, t]) => `<button data-t="${k}" class="${k === curType ? 'on' : ''}">${esc(t.name)}</button>`).join('')}</div>
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
    </section>
    ${nextRoutineCard()}
    <h2 class="sec">Menú de hoy</h2>
    ${menu.map(m => mealCard(m, day)).join('')}
    <h2 class="sec">Hábitos</h2>
    <section class="card">
      <div class="habit"><span>💧 Agua</span><span class="row gap"><button class="icon-btn" data-water="-1">−</button><b>${r1(day.water / 1000)} / ${r1(set.waterGoal / 1000)} L</b><button class="icon-btn" data-water="1">+</button></span></div>
      <div class="mini-track"><div style="width:${Math.min(100, day.water / set.waterGoal * 100)}%"></div></div>
      <div class="habit"><span>👟 Pasos</span><input class="input xs w" id="steps" type="number" inputmode="numeric" value="${day.steps ?? ''}" placeholder="0"><span class="muted small">/ ${n0(set.stepGoal)}</span></div>
      ${set.supplements.map(s => `<label class="habit check"><span>💊 ${esc(s.name)}</span><input type="checkbox" data-sup="${esc(s.id)}" ${day.supps[s.id] ? 'checked' : ''}></label>`).join('')}
      <div class="habit"><span>⚖️ Peso de hoy</span>${wToday ? `<b>${r1(wToday.kg)} kg</b>` : `<span class="row gap"><input class="input xs w" id="wq" type="number" inputmode="decimal" step="0.1" placeholder="kg"><button class="btn sm" id="wq-ok">Guardar</button></span>`}</div>
    </section>`;

  on(root, '#dtype button', 'click', b => { saveDay(d, x => { x.type = b.dataset.t; x.swaps = {}; }); rerender(); });
  on(root, '[data-water]', 'click', b => { saveDay(d, x => { x.water = Math.max(0, x.water + (+b.dataset.water) * set.glass); }); rerender(); });
  on(root, '#steps', 'change', i => saveDay(d, x => { x.steps = parseInt(i.value, 10) || null; }));
  on(root, '[data-sup]', 'change', i => saveDay(d, x => { x.supps[i.dataset.sup] = i.checked; }));
  on(root, '#wq-ok', 'click', () => {
    const kg = parseFloat(root.querySelector('#wq').value);
    if (!kg) return;
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
    <div class="meal-head"><div><span class="time">${esc(m.slot.time)}</span> <b>${esc(m.slot.name)}</b>${m.slot.tupper ? ' <span class="tag">tupper</span>' : ''}</div>
      <span class="muted small">${r0(m.totals.kcal)} kcal · P ${r0(m.totals.p)}</span></div>
    <p class="muted small">${esc(m.template)}</p>
    <ul class="items">${m.items.map(it => `<li><span><b>${fmtQty(it)}</b> ${esc(it.name)}</span><button class="swap" data-swap="${m.slot.id}|${it.idx}" title="Intercambiar">⇄</button></li>`).join('')}</ul>
    ${logged.kcal ? `<p class="small ok">Registrado: ${r0(logged.kcal)} kcal · P ${r0(logged.p)} g</p>` : ''}
    <div class="row gap wrap">
      ${eaten ? `<button class="btn sm ghost" data-undo="${m.slot.id}">Deshacer</button>` : `<button class="btn sm primary" data-eat="${m.slot.id}">✓ Lo he comido</button>`}
      <button class="btn sm ghost" data-reroll="${m.slot.id}">Otro plato</button>
      <button class="btn sm ghost" data-add="${m.slot.id}">+ Otra cosa</button>
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
  on(root, '[data-reroll]', 'click', b => { saveDay(d, x => { x.seeds[b.dataset.reroll] = (x.seeds[b.dataset.reroll] || 0) + 1; x.swaps[b.dataset.reroll] = {}; }); rerender(); });
  on(root, '[data-add]', 'click', b => openAddFood(d, b.dataset.add));
  on(root, '[data-swap]', 'click', b => {
    const [slotId, idx] = b.dataset.swap.split('|');
    const m = menu.find(x => x.slot.id === slotId);
    const it = m.items.find(x => String(x.idx) === idx);
    const opts = N.swapOptions(it, { custom: S.foods(), dislikes: S.settings().dislikes, tupper: !!m.slot.tupper });
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
  const t = S.dayTypes()[dayTypeOf(d)];
  const slots = [...t.slots, { id: 'extra', name: 'Extra / picoteo' }];
  const orphan = day.entries.filter(e => !slots.some(s => s.id === e.slot));
  if (orphan.length) slots.push({ id: '__otros', name: 'Otras comidas' });

  root.innerHTML = `
    <header class="top"><h1>Diario</h1><span id="sync-dot" data-st="${sync.getStatus()}"></span></header>
    <div class="datenav"><button class="icon-btn" id="dprev">‹</button><b class="cap">${d === today() ? 'Hoy, ' : ''}${fdate(d)}</b><button class="icon-btn" id="dnext" ${d >= today() ? 'disabled' : ''}>›</button></div>
    <p class="muted small center">${esc(t.name)}</p>
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
