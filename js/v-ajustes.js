// Ajustes: cuenta, perfil, objetivo, tipos de día, hábitos, alimentos, recetas y copia de datos.
import { S, N, store, weightNow } from './ctx.js';
import { DEFAULT_DAYTYPES } from './data/presets.js';
import { esc, r0, n0, sheet, toast, confirmSheet } from './ui.js';
import { rerender, on } from './nav.js';
import { openRecipeEditor, foodForm, readFoodForm } from './v-food.js';
import * as sync from './sync.js';

const DIAS = [['1', 'L'], ['2', 'M'], ['3', 'X'], ['4', 'J'], ['5', 'V'], ['6', 'S'], ['0', 'D']];

export function viewAjustes(root, params) {
  if (params[0] === 'dias') return viewDayTypes(root);
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

    <h2 class="sec">Perfil</h2>
    <section class="card">
      <div class="grid2">
        <div><label class="lbl">Nombre</label><input class="input" data-p="name" value="${esc(p.name)}"></div>
        <div><label class="lbl">Sexo</label><select class="input" data-p="sex"><option value="h" ${p.sex === 'h' ? 'selected' : ''}>Hombre</option><option value="m" ${p.sex === 'm' ? 'selected' : ''}>Mujer</option></select></div>
        <div><label class="lbl">Edad</label><input class="input" data-p="age" data-n type="number" value="${p.age}"></div>
        <div><label class="lbl">Altura (cm)</label><input class="input" data-p="height" data-n type="number" value="${p.height}"></div>
        <div><label class="lbl">% grasa</label><input class="input" data-p="bodyFat" data-n type="number" step="0.1" value="${p.bodyFat ?? ''}"></div>
        <div><label class="lbl">Pesajes/semana</label><input class="input" data-p="weighFreq" data-n type="number" value="${p.weighFreq || 3}"></div>
      </div>
    </section>

    <h2 class="sec">Objetivo</h2>
    <section class="card">
      <label class="lbl">Ritmo de pérdida (% del peso por semana)</label>
      <select class="input" data-p="rate" data-n>${[0, 0.25, 0.5, 0.75, 1].map(v => `<option value="${v}" ${+p.rate === v ? 'selected' : ''}>${v === 0 ? 'Mantener' : String(v).replace('.', ',') + ' %'}</option>`).join('')}</select>
      <label class="lbl">Días con más margen</label>
      <div class="chips" id="wdays">${DIAS.map(([v, l]) => `<button data-d="${v}" class="${p.weekendDays.includes(+v) ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="grid2">
        <div><label class="lbl">Margen esos días (%)</label><input class="input" data-p="weekendBoost" data-n type="number" value="${p.weekendBoost}"></div>
        <div><label class="lbl">Grasa (% de kcal)</label><input class="input" data-p="fatPct" data-n type="number" value="${p.fatPct}"></div>
        <div><label class="lbl">Proteína (g/kg magro)</label><input class="input" data-p="proteinPerKgLbm" data-n type="number" step="0.1" value="${p.proteinPerKgLbm}"></div>
        <div><label class="lbl">Proteína fija (g, opcional)</label><input class="input" data-p="proteinOverride" data-n type="number" value="${p.proteinOverride ?? ''}"></div>
      </div>
      <label class="lbl">Mantenimiento actual (kcal)</label>
      <div class="row gap"><input class="input" id="tdee" type="number" value="${plan.tdee}"><button class="btn sm" id="tdee-ok">Fijar</button></div>
      <p class="muted small">Lo normal es dejar que lo ajuste la revisión semanal. Objetivo medio ahora: ${n0(N.baseTarget(p, plan, weightNow()))} kcal.</p>
    </section>

    <h2 class="sec">Comidas y turnos</h2>
    <section class="card">
      <a class="li" href="#/ajustes/dias"><span><b>Tipos de día</b><small>${Object.values(S.dayTypes()).map(t => esc(t.name)).join(', ')} · horarios y reparto</small></span><span class="chev">›</span></a>
      <label class="lbl">Tipo de día por defecto</label>
      <select class="input" data-s="defaultDayType">${Object.entries(S.dayTypes()).map(([k, t]) => `<option value="${k}" ${set.defaultDayType === k ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select>
      <label class="lbl">Alimentos que no quieres en el menú (separados por comas)</label>
      <input class="input" id="dislikes" value="${esc(set.dislikes.join(', '))}">
    </section>

    <h2 class="sec">Hábitos y gimnasio</h2>
    <section class="card">
      <div class="grid2">
        <div><label class="lbl">Agua diaria (ml)</label><input class="input" data-s="waterGoal" data-n type="number" value="${set.waterGoal}"></div>
        <div><label class="lbl">Vaso (ml)</label><input class="input" data-s="glass" data-n type="number" value="${set.glass}"></div>
        <div><label class="lbl">Pasos diarios</label><input class="input" data-s="stepGoal" data-n type="number" value="${set.stepGoal}"></div>
        <div><label class="lbl">RIR objetivo</label><input class="input" data-s="targetRir" data-n type="number" value="${set.targetRir}"></div>
      </div>
      <label class="lbl">Suplementos (separados por comas)</label>
      <input class="input" id="supps" value="${esc(set.supplements.map(s => s.name).join(', '))}">
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
  on(root, '#dislikes', 'change', i => { store.update('settings', {}, s => { s.dislikes = i.value.split(',').map(x => x.trim()).filter(Boolean); }); toast('Guardado'); });
  on(root, '#supps', 'change', i => { store.update('settings', {}, s => { s.supplements = i.value.split(',').map(x => x.trim()).filter(Boolean).map(name => ({ id: N.norm(name).replace(/[^a-z0-9]+/g, '-'), name })); }); toast('Guardado'); });
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

function viewDayTypes(root) {
  const types = S.dayTypes();
  root.innerHTML = `<header class="top"><a class="icon-btn" href="#/ajustes">‹</a><h1>Tipos de día</h1><span></span></header>
    <p class="muted small">Horario de cada comida y qué parte de las calorías del día lleva (la suma debe dar 100 %). Estilos: desayuno, principal, batido, snack, ligero.</p>
    ${Object.entries(types).map(([k, t]) => {
      const sum = t.slots.reduce((a, s) => a + s.pct, 0);
      return `<section class="card" data-type="${k}">
        <div class="meal-head"><input class="input" data-tn="${k}" value="${esc(t.name)}"><span class="small ${sum === 100 ? 'ok' : 'warn'}">${sum} %</span></div>
        ${t.slots.map((s, i) => `<div class="slotrow">
          <input class="input xs" data-f="time" data-k="${k}|${i}" value="${esc(s.time)}">
          <input class="input" data-f="name" data-k="${k}|${i}" value="${esc(s.name)}">
          <input class="input xs" data-f="pct" data-k="${k}|${i}" type="number" value="${s.pct}">
          <select class="input xs" data-f="style" data-k="${k}|${i}">${['desayuno', 'principal', 'batido', 'snack', 'ligero'].map(st => `<option ${s.style === st ? 'selected' : ''}>${st}</option>`).join('')}</select>
          <label class="small"><input type="checkbox" data-f="tupper" data-k="${k}|${i}" ${s.tupper ? 'checked' : ''}> tupper</label>
          <button class="icon-btn" data-del="${k}|${i}">✕</button></div>`).join('')}
        <button class="btn sm ghost" data-add="${k}">+ Comida</button>
      </section>`;
    }).join('')}
    <button class="btn ghost block" id="reset">Restaurar los tipos de día por defecto</button>`;
  const save = (fn) => { const t = S.dayTypes(); fn(t); store.set('daytypes', t); viewDayTypes(root); };
  on(root, '[data-tn]', 'change', i => save(t => { t[i.dataset.tn].name = i.value; }));
  on(root, '[data-f]', 'change', i => {
    const [k, idx] = i.dataset.k.split('|');
    save(t => { const s = t[k].slots[+idx]; const f = i.dataset.f; s[f] = f === 'pct' ? parseFloat(i.value) || 0 : f === 'tupper' ? i.checked : i.value; });
  });
  on(root, '[data-del]', 'click', b => { const [k, idx] = b.dataset.del.split('|'); save(t => { t[k].slots.splice(+idx, 1); }); });
  on(root, '[data-add]', 'click', b => save(t => { t[b.dataset.add].slots.push({ id: 's' + Date.now().toString(36), name: 'Comida', time: '12:00', pct: 0, style: 'principal' }); }));
  on(root, '#reset', 'click', () => { store.set('daytypes', structuredClone(DEFAULT_DAYTYPES)); viewDayTypes(root); });
}
