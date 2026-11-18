// Ajustes: cuenta, perfil, objetivo, tipos de día, hábitos, alimentos, recetas y copia de datos.
import { S, N, store, weightNow } from './ctx.js';
import { mealLayout } from './data/presets.js';
import { editSection, SECTIONS, sectionSummary, openWizard } from './v-cuestionario.js';
import { esc, r0, n0, sheet, toast, confirmSheet } from './ui.js';
import { rerender, on } from './nav.js';
import { openRecipeEditor, foodForm, readFoodForm } from './v-food.js';
import * as sync from './sync.js';

const DIAS = [['1', 'L'], ['2', 'M'], ['3', 'X'], ['4', 'J'], ['5', 'V'], ['6', 'S'], ['0', 'D']];

export function viewAjustes(root, params) {
  if (params[0] === 'comidas') return viewMeals(root);
  const p = S.profile(), set = S.settings(), plan = S.plan();
  const user = sync.currentUser();
  root.innerHTML = `
    <header class="top"><h1>Ajustes</h1><span></span></header>

    <h2 class="sec">Cuenta</h2>
    <section class="card">
      ${!sync.configured() ? `<p class="small">La sincronización no está configurada: los datos se guardan solo en este dispositivo. Para activarla, pega la configuración de Firebase en <code>firebase-config.js</code> (pasos en el README).</p>`
        : user ? `<div class="li"><span><b>${esc(user.displayName || user.email)}</b><small>${esc(user.email || '')} · ${esc(sync.getStatus())}</small></span><button class="btn sm ghost" id="logout">Salir</button></div>`
        : `<p class="small">Entra con Google para guardar tus datos en la nube y usarlos en cualquier dispositivo.</p><button class="btn primary block" id="login">Entrar con Google</button>`}
    </section>

    <h2 class="sec">Tu perfil</h2>
    <section class="card list">${SECTIONS.map(([id, title]) => `<button class="li" data-sec="${id}"><span><b>${esc(title)}</b><small>${esc(sectionSummary(id))}</small></span><span class="chev">›</span></button>`).join('')}</section>
    <p class="muted small">Al cambiar cualquier respuesta se recalculan tus calorías, macros, menú y, si quieres, tus rutinas.</p>

    <h2 class="sec">Comidas del día</h2>
    <section class="card"><a class="li" href="#/ajustes/comidas"><span><b>${set.meals.map(m => esc(m.name)).join(', ')}</b><small>Nombres y reparto de calorías</small></span><span class="chev">›</span></a></section>

    <h2 class="sec">Ajustes finos</h2>
    <section class="card">
      <div class="grid2">
        <div><label class="lbl">Proteína (g/kg magro)</label><input class="input" data-p="proteinPerKgLbm" data-n type="number" step="0.1" value="${p.proteinPerKgLbm}"></div>
        <div><label class="lbl">Proteína fija (g, opcional)</label><input class="input" data-p="proteinOverride" data-n type="number" value="${p.proteinOverride ?? ''}"></div>
        <div><label class="lbl">Grasa (% de kcal)</label><input class="input" data-p="fatPct" data-n type="number" value="${p.fatPct}"></div>
        <div><label class="lbl">RIR objetivo</label><input class="input" data-s="targetRir" data-n type="number" value="${set.targetRir}"></div>
      </div>
      <label class="lbl">Días con más margen de calorías</label>
      <div class="chips" id="wdays">${DIAS.map(([v, l]) => `<button data-d="${v}" class="${p.weekendDays.includes(+v) ? 'on' : ''}">${l}</button>`).join('')}</div>
      <label class="lbl">Mantenimiento actual (kcal)</label>
      <div class="row gap"><input class="input" id="tdee" type="number" value="${plan.tdee}"><button class="btn sm" id="tdee-ok">Fijar</button></div>
      <p class="muted small">Lo normal es dejar que lo ajuste la revisión semanal. Objetivo medio ahora: ${n0(N.baseTarget(p, plan, weightNow()))} kcal.</p>
    </section>

    <h2 class="sec">Mis recetas y comidas guardadas</h2>
    <section class="card"><div class="list">${S.recipes().map(r => `<button class="li" data-rec="${r.id}"><span><b>${esc(r.name)}</b><small>${r.items.length} ingredientes · ${r0(N.recipeMacros(r, S.foods()).kcal)} kcal/ración</small></span><span class="chev">›</span></button>`).join('') || '<p class="muted small">Ninguna todavía.</p>'}</div>
      <button class="btn ghost block" id="newrec">+ Nueva receta</button></section>

    <h2 class="sec">Mis alimentos</h2>
    <section class="card"><div class="list">${S.foods().map(f => `<button class="li" data-food="${f.id}"><span><b>${esc(f.name)}</b><small>${f.brand ? esc(f.brand) + ' · ' : ''}${r0(f.kcal)} kcal/100 g${f.src === 'off' ? ' · escaneado' : ''}</small></span><span class="chev">›</span></button>`).join('') || '<p class="muted small">Los que crees o escanees aparecerán aquí.</p>'}</div></section>

    <h2 class="sec">Datos</h2>
    <section class="card">
      <button class="btn ghost block" id="exp">Exportar copia (JSON)</button>
      <label class="btn ghost block">Importar copia<input type="file" accept="application/json,.json" id="imp" hidden></label>
      <button class="btn ghost block" id="redo">Repetir el cuestionario completo</button>
      <button class="btn danger-ghost block" id="wipe">Borrar todos los datos de este dispositivo</button>
    </section>
    <p class="muted small center">Ignacio · valores nutricionales aproximados (BEDCA/USDA y Open Food Facts)</p>`;

  const saveP = (k, v) => store.set('profile', { ...S.profile(), [k]: v });
  on(root, '[data-p]', 'change', i => { const v = 'n' in i.dataset ? (i.value === '' ? null : parseFloat(i.value)) : i.value; saveP(i.dataset.p, v); toast('Guardado'); });
  on(root, '[data-s]', 'change', i => { store.update('settings', {}, s => { s[i.dataset.s] = 'n' in i.dataset ? parseFloat(i.value) : i.value; }); toast('Guardado'); });
  on(root, '#wdays button', 'click', b => {
    const d = +b.dataset.d; const cur = S.profile().weekendDays;
    saveP('weekendDays', cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d]); rerender();
  });
  on(root, '#tdee-ok', 'click', () => { const v = parseFloat(root.querySelector('#tdee').value); if (v > 1000) { store.set('plan', { ...S.plan(), tdee: v }); toast('Mantenimiento fijado'); rerender(); } });
  on(root, '[data-sec]', 'click', b => editSection(b.dataset.sec));
  on(root, '#redo', 'click', () => openWizard());
  on(root, '#login', 'click', async () => { try { await sync.login(); rerender(); } catch (e) { toast('No se pudo entrar: ' + (e.code || e.message)); } });
  on(root, '#logout', 'click', async () => { await sync.logout(); rerender(); });
  on(root, '#newrec', 'click', () => openRecipeEditor());
  on(root, '[data-rec]', 'click', b => openRecipeEditor(S.recipes().find(r => r.id === b.dataset.rec)));
  on(root, '[data-food]', 'click', b => editFood(S.foods().find(f => f.id === b.dataset.food)));
  on(root, '#exp', 'click', () => {
    const blob = new Blob([JSON.stringify(store.exportAll())], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `ignacio-${N.iso()}.json` });
    a.click(); URL.revokeObjectURL(a.href);
  });
  on(root, '#imp', 'change', async i => {
    try { store.importAll(JSON.parse(await i.files[0].text())); toast('Copia importada'); } catch (e) { toast('Archivo no válido'); }
  });
  on(root, '#wipe', 'click', async () => {
    if (!await confirmSheet('¿Borrar todos los datos de este dispositivo? Si tienes cuenta, seguirán en la nube.', 'Borrar todo')) return;
    Object.keys(localStorage).filter(k => k.startsWith('ignacio:')).forEach(k => localStorage.removeItem(k));
    location.reload();
  });
}

function editFood(food) {
  sheet(`<div class="sheet-head"><h3>Editar alimento</h3><button class="icon-btn" data-close>✕</button></div>${foodForm(food)}
    <div class="row gap"><button class="btn danger-ghost" id="fd-del">Borrar</button><button class="btn primary grow" id="fd-ok">Guardar</button></div>`, {
    onMount: (el, close) => {
      el.querySelector('#fd-ok').addEventListener('click', () => {
        const f = readFoodForm(el, food); if (!f) return;
        store.set('foods', S.foods().map(x => (x.id === f.id ? f : x))); close(); rerender();
      });
      el.querySelector('#fd-del').addEventListener('click', () => { store.set('foods', S.foods().filter(x => x.id !== food.id)); close(); rerender(); });
    },
  });
}

function viewMeals(root) {
  const ms = S.settings().meals;
  const sum = ms.reduce((a, m) => a + (m.pct || 0), 0);
  root.innerHTML = `<header class="top"><a class="icon-btn" href="#/ajustes">‹</a><h1>Comidas del día</h1><span></span></header>
    <p class="muted small">Nombre de cada comida, qué parte de las calorías del día lleva (debe sumar 100 %) y qué tipo de plato se propone.</p>
    <section class="card">
      ${ms.map((m, i) => `<div class="slotrow">
        <input class="input" data-f="name" data-i="${i}" value="${esc(m.name)}">
        <div class="inwrap"><input class="input" data-f="pct" data-i="${i}" type="number" value="${m.pct}"><span>%</span></div>
        <select class="input" data-f="style" data-i="${i}">${[['desayuno', 'Desayuno'], ['principal', 'Plato principal'], ['batido', 'Batido'], ['snack', 'Tentempié'], ['ligero', 'Ligero']].map(([v, l]) => `<option value="${v}" ${m.style === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <button class="icon-btn" data-del="${i}" ${ms.length <= 1 ? 'disabled' : ''}>✕</button></div>`).join('')}
      <p class="small ${sum === 100 ? 'ok' : 'warn'}">Suma: ${sum} %${sum === 100 ? '' : ' (al guardar se reparte para que sume 100)'}</p>
      <div class="row gap"><button class="btn sm ghost" id="add">+ Comida</button><button class="btn sm ghost" id="norm">Ajustar a 100 %</button></div>
    </section>
    <button class="btn ghost block" id="reset">Restaurar según número de comidas</button>`;
  const save = (fn) => { store.update('settings', {}, s => { s.meals = s.meals || S.settings().meals; fn(s.meals); }); viewMeals(root); };
  on(root, '[data-f]', 'change', i => save(m => { const x = m[+i.dataset.i]; x[i.dataset.f] = i.dataset.f === 'pct' ? Math.max(0, parseFloat(i.value) || 0) : i.value; }));
  on(root, '[data-del]', 'click', b => save(m => { m.splice(+b.dataset.del, 1); }));
  on(root, '#add', 'click', () => save(m => { m.push({ id: 'm' + Date.now().toString(36), name: 'Tentempié', pct: 10, style: 'snack' }); }));
  on(root, '#norm', 'click', () => save(m => { const t = m.reduce((a, x) => a + x.pct, 0) || 1; let acc = 0; m.forEach((x, i) => { x.pct = i === m.length - 1 ? 100 - acc : Math.round(x.pct / t * 100); acc += x.pct; }); }));
  on(root, '#reset', 'click', () => save(m => { const s = S.settings(); m.splice(0, m.length, ...mealLayout(m.length, s.shake !== false)); }));
}
