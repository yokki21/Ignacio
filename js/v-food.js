// Hojas para añadir comida: buscador, escáner de código de barras, añadido rápido, alimento propio y recetas.
import { S, N, store, getDay, saveDay, addRecent, dayTypeOf } from './ctx.js';
import { esc, r0, r1, sheet, closeSheet, toast, uid, confirmSheet } from './ui.js';
import { on, rerender } from './nav.js';

const macroLine = (m) => `<span class="kc">${r0(m.kcal)} kcal</span> · P ${r1(m.p)} · H ${r1(m.c)} · G ${r1(m.f)}`;

function slotOptions(date, selected) {
  const t = S.dayTypes()[dayTypeOf(date)];
  return t.slots.map(s => `<option value="${s.id}" ${s.id === selected ? 'selected' : ''}>${esc(s.name)}</option>`).join('') + `<option value="extra" ${selected === 'extra' ? 'selected' : ''}>Extra / picoteo</option>`;
}

export function addEntry(date, entry) {
  saveDay(date, d => { d.entries.push({ id: uid(), ...entry }); });
}

// ---------- hoja principal ----------
export function openAddFood(date, slotId) {
  const html = `
    <div class="sheet-head"><h3>Añadir comida</h3><button class="icon-btn" data-close>✕</button></div>
    <div class="tabs" id="af-tabs">
      <button data-t="buscar" class="on">Buscar</button><button data-t="escanear">Escanear</button>
      <button data-t="rapido">Rápido</button><button data-t="crear">Crear</button>
    </div>
    <div id="af-body"></div>`;
  sheet(html, {
    full: true,
    onMount: (el) => {
      const body = el.querySelector('#af-body');
      const tabs = { buscar: tabSearch, escanear: tabScan, rapido: tabQuick, crear: tabCreate };
      const show = (t) => {
        el.querySelectorAll('#af-tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
        stopScan();
        tabs[t](body, date, slotId);
      };
      on(el, '#af-tabs button', 'click', b => show(b.dataset.t));
      show('buscar');
    },
    onClose: stopScan,
  });
}

function tabSearch(body, date, slotId) {
  body.innerHTML = `<input class="input" id="af-q" placeholder="Busca: pollo, arroz, mis recetas…" autocomplete="off"><div id="af-res" class="list"></div>`;
  const q = body.querySelector('#af-q');
  const res = body.querySelector('#af-res');
  const draw = () => {
    const custom = S.foods(), recipes = S.recipes();
    let list;
    if (!q.value.trim()) {
      const rec = S.recent().map(id => N.findFood(id, custom) || recipes.find(r => r.id === id)).filter(Boolean);
      list = [...recipes.map(r => ({ ...r, isRecipe: true })), ...rec.filter(x => !x.items)];
      if (!list.length) list = N.searchFoods('', custom);
    } else list = N.searchFoods(q.value, custom, recipes);
    res.innerHTML = list.map(f => f.isRecipe
      ? `<button class="li" data-r="${esc(f.id)}"><span><b>${esc(f.name)}</b><small>Receta · ${macroLine(N.recipeMacros(f, custom))} por ración</small></span><span class="chev">›</span></button>`
      : `<button class="li" data-f="${esc(f.id)}"><span><b>${esc(f.name)}</b><small>${f.brand ? esc(f.brand) + ' · ' : ''}${macroLine(f)} /100 g</small></span><span class="chev">›</span></button>`).join('')
      || '<p class="muted">Sin resultados. Prueba en «Crear» o «Escanear».</p>';
    on(res, '[data-f]', 'click', b => amountSheet(date, slotId, N.findFood(b.dataset.f, S.foods())));
    on(res, '[data-r]', 'click', b => recipeAmount(date, slotId, S.recipes().find(r => r.id === b.dataset.r)));
  };
  q.addEventListener('input', draw);
  draw();
  setTimeout(() => q.focus(), 250);
}

export function amountSheet(date, slotId, food, { onPick } = {}) {
  if (!food) return;
  const units = [{ n: 'g', g: 1 }, ...(food.units || [])];
  if (food.serving) units.push({ n: 'ración', g: food.serving });
  sheet(`
    <div class="sheet-head"><h3>${esc(food.name)}</h3><button class="icon-btn" data-close>✕</button></div>
    ${food.brand ? `<p class="muted small">${esc(food.brand)}</p>` : ''}
    <div class="row gap">
      <input class="input" id="am-n" type="number" inputmode="decimal" value="${food.units?.[0] ? 1 : 100}" step="any">
      <select class="input" id="am-u">${units.map((u, i) => `<option value="${i}" ${food.units?.[0] && i === 1 ? 'selected' : ''}>${esc(u.n)}${u.n !== 'g' ? ` (${u.g} g)` : ''}</option>`).join('')}</select>
    </div>
    ${onPick ? '' : `<label class="lbl">Comida</label><select class="input" id="am-slot">${slotOptions(date, slotId)}</select>`}
    <div class="card soft" id="am-prev"></div>
    <button class="btn primary block" id="am-ok">${onPick ? 'Añadir ingrediente' : 'Añadir'}</button>`, {
    onMount: (el, close) => {
      const n = el.querySelector('#am-n'), u = el.querySelector('#am-u');
      const grams = () => (parseFloat(n.value) || 0) * units[+u.value].g;
      const prev = () => { el.querySelector('#am-prev').innerHTML = `${r0(grams())} g → ${macroLine(N.macros(food, grams()))}`; };
      n.addEventListener('input', prev); u.addEventListener('change', prev); prev();
      el.querySelector('#am-ok').addEventListener('click', () => {
        const g = grams();
        if (g <= 0) return toast('Pon una cantidad');
        if (onPick) { close(); onPick(food, g); return; }
        addEntry(date, { slot: el.querySelector('#am-slot').value, foodId: food.id, name: food.name, g, ...N.macros(food, g) });
        addRecent(food.id);
        close(); toast('Añadido'); rerender();
      });
    },
  });
}

function recipeAmount(date, slotId, recipe) {
  const m = N.recipeMacros(recipe, S.foods());
  sheet(`
    <div class="sheet-head"><h3>${esc(recipe.name)}</h3><button class="icon-btn" data-close>✕</button></div>
    <label class="lbl">Raciones (la receta rinde ${recipe.servings})</label>
    <input class="input" id="ra-n" type="number" inputmode="decimal" value="1" step="0.25">
    <label class="lbl">Comida</label><select class="input" id="ra-slot">${slotOptions(date, slotId)}</select>
    <div class="card soft" id="ra-prev"></div>
    <button class="btn primary block" id="ra-ok">Añadir</button>`, {
    onMount: (el, close) => {
      const n = el.querySelector('#ra-n');
      const k = () => parseFloat(n.value) || 0;
      const prev = () => { el.querySelector('#ra-prev').innerHTML = macroLine({ kcal: m.kcal * k(), p: m.p * k(), c: m.c * k(), f: m.f * k() }); };
      n.addEventListener('input', prev); prev();
      el.querySelector('#ra-ok').addEventListener('click', () => {
        addEntry(date, { slot: el.querySelector('#ra-slot').value, recipeId: recipe.id, name: recipe.name, servings: k(), g: r0(m.totalG * k()), kcal: m.kcal * k(), p: m.p * k(), c: m.c * k(), f: m.f * k() });
        addRecent(recipe.id); close(); toast('Añadido'); rerender();
      });
    },
  });
}

// ---------- escáner ----------
let scanStop = null;
function stopScan() { if (scanStop) { try { scanStop(); } catch { /* */ } scanStop = null; } }

function tabScan(body, date, slotId) {
  body.innerHTML = `
    <div class="scan-box"><video id="sc-v" playsinline muted></video><div class="scan-line"></div></div>
    <p class="muted small" id="sc-st">Apunta al código de barras.</p>
    <div class="row gap"><input class="input" id="sc-code" inputmode="numeric" placeholder="O escribe el código"><button class="btn" id="sc-go">Buscar</button></div>
    <p class="muted small">Datos de Open Food Facts. Revisa que los valores cuadren con la etiqueta.</p>`;
  const st = body.querySelector('#sc-st');
  const found = async (code) => { stopScan(); st.textContent = 'Buscando ' + code + '…'; await lookupBarcode(code, date, slotId, st); };
  body.querySelector('#sc-go').addEventListener('click', () => { const c = body.querySelector('#sc-code').value.trim(); if (c) found(c); });
  startScan(body.querySelector('#sc-v'), found, st);
}

async function startScan(video, onCode, st) {
  try {
    if ('BarcodeDetector' in window) {
      const det = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      video.srcObject = stream; await video.play();
      let alive = true;
      scanStop = () => { alive = false; stream.getTracks().forEach(t => t.stop()); };
      const loop = async () => {
        if (!alive) return;
        try { const codes = await det.detect(video); if (codes.length) return onCode(codes[0].rawValue); } catch { /* */ }
        setTimeout(loop, 250);
      };
      loop();
    } else {
      // Navegadores sin BarcodeDetector (iPhone): ZXing desde CDN
      const { BrowserMultiFormatReader } = await import('https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm');
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(undefined, video, (result) => { if (result) onCode(result.getText()); });
      scanStop = () => controls.stop();
    }
  } catch (e) {
    console.error(e);
    st.textContent = 'No se pudo abrir la cámara. Escribe el código a mano.';
  }
}

async function lookupBarcode(code, date, slotId, st) {
  const custom = S.foods();
  const existing = custom.find(f => f.barcode === code);
  if (existing) return amountSheet(date, slotId, existing);
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,product_name_es,brands,nutriments,serving_quantity`);
    const j = await r.json();
    const p = j.product;
    const nm = p?.nutriments || {};
    const kcal = nm['energy-kcal_100g'] ?? (nm['energy_100g'] ? nm['energy_100g'] / 4.184 : null);
    if (!p || kcal == null) { st.textContent = 'Producto no encontrado o sin datos. Créalo en «Crear».'; return; }
    const food = {
      id: 'off-' + code, barcode: code, src: 'off', groups: [], units: [],
      name: p.product_name_es || p.product_name || 'Producto ' + code, brand: (p.brands || '').split(',')[0],
      kcal: +kcal, p: +(nm.proteins_100g || 0), c: +(nm.carbohydrates_100g || 0), f: +(nm.fat_100g || 0),
      serving: p.serving_quantity ? +p.serving_quantity : null,
    };
    store.set('foods', [food, ...custom.filter(f => f.id !== food.id)]);
    amountSheet(date, slotId, food);
  } catch (e) { console.error(e); st.textContent = 'Sin conexión o error al buscar. Inténtalo de nuevo.'; }
}

// ---------- rápido ----------
function tabQuick(body, date, slotId) {
  body.innerHTML = `
    <label class="lbl">Descripción</label><input class="input" id="q-name" placeholder="Ej.: menú del día">
    <div class="grid4">
      <div><label class="lbl">kcal</label><input class="input" id="q-k" type="number" inputmode="decimal"></div>
      <div><label class="lbl">Prot. g</label><input class="input" id="q-p" type="number" inputmode="decimal"></div>
      <div><label class="lbl">Hidr. g</label><input class="input" id="q-c" type="number" inputmode="decimal"></div>
      <div><label class="lbl">Grasa g</label><input class="input" id="q-f" type="number" inputmode="decimal"></div>
    </div>
    <label class="lbl">Comida</label><select class="input" id="q-slot">${slotOptions(date, slotId)}</select>
    <button class="btn primary block" id="q-ok">Añadir</button>`;
  body.querySelector('#q-ok').addEventListener('click', () => {
    const v = (id) => parseFloat(body.querySelector(id).value) || 0;
    let kcal = v('#q-k');
    const p = v('#q-p'), c = v('#q-c'), f = v('#q-f');
    if (!kcal) kcal = p * 4 + c * 4 + f * 9;
    if (!kcal) return toast('Pon al menos las calorías');
    addEntry(date, { slot: body.querySelector('#q-slot').value, name: body.querySelector('#q-name').value || 'Añadido rápido', g: 0, kcal, p, c, f });
    closeSheet(); toast('Añadido'); rerender();
  });
}

// ---------- crear alimento ----------
export function foodForm(food = {}) {
  return `
    <label class="lbl">Nombre</label><input class="input" id="cf-name" value="${esc(food.name || '')}">
    <label class="lbl">Marca (opcional)</label><input class="input" id="cf-brand" value="${esc(food.brand || '')}">
    <p class="muted small">Valores por 100 g (o 100 ml), como en la etiqueta.</p>
    <div class="grid4">
      <div><label class="lbl">kcal</label><input class="input" id="cf-k" type="number" inputmode="decimal" value="${food.kcal ?? ''}"></div>
      <div><label class="lbl">Prot.</label><input class="input" id="cf-p" type="number" inputmode="decimal" value="${food.p ?? ''}"></div>
      <div><label class="lbl">Hidr.</label><input class="input" id="cf-c" type="number" inputmode="decimal" value="${food.c ?? ''}"></div>
      <div><label class="lbl">Grasa</label><input class="input" id="cf-f" type="number" inputmode="decimal" value="${food.f ?? ''}"></div>
    </div>
    <label class="lbl">Ración habitual en gramos (opcional)</label><input class="input" id="cf-s" type="number" inputmode="decimal" value="${food.serving ?? ''}">`;
}
export function readFoodForm(el, prev = {}) {
  const v = (id) => parseFloat(el.querySelector(id).value);
  const name = el.querySelector('#cf-name').value.trim();
  if (!name || isNaN(v('#cf-k'))) { toast('Faltan el nombre o las kcal'); return null; }
  return { groups: [], units: [], src: 'propio', ...prev, id: prev.id || 'c-' + uid(), name, brand: el.querySelector('#cf-brand').value.trim(),
    kcal: v('#cf-k'), p: v('#cf-p') || 0, c: v('#cf-c') || 0, f: v('#cf-f') || 0, serving: v('#cf-s') || null };
}

function tabCreate(body, date, slotId) {
  body.innerHTML = foodForm() + `<button class="btn primary block" id="cf-ok">Guardar y añadir</button>`;
  body.querySelector('#cf-ok').addEventListener('click', () => {
    const food = readFoodForm(body);
    if (!food) return;
    store.set('foods', [food, ...S.foods()]);
    amountSheet(date, slotId, food);
  });
}

// ---------- recetas ----------
export function openRecipeEditor(recipe = null, prefillItems = null) {
  const r = recipe ? structuredClone(recipe) : { id: 'rec-' + uid(), name: '', servings: 1, items: prefillItems || [] };
  const draw = (el) => {
    const custom = S.foods();
    const m = N.recipeMacros(r, custom);
    el.querySelector('#re-items').innerHTML = r.items.map((it, i) => {
      const f = N.findFood(it.foodId, custom);
      return `<div class="li"><span><b>${esc(f?.name || '¿?')}</b><small>${r0(it.g)} g</small></span>
        <span class="row gap"><input class="input xs" type="number" inputmode="decimal" data-i="${i}" value="${r0(it.g)}"><button class="icon-btn" data-del="${i}">✕</button></span></div>`;
    }).join('') || '<p class="muted small">Sin ingredientes todavía.</p>';
    el.querySelector('#re-tot').innerHTML = `Por ración: ${macroLine(m)}`;
    on(el, '#re-items [data-i]', 'change', inp => { r.items[+inp.dataset.i].g = parseFloat(inp.value) || 0; draw(el); });
    on(el, '#re-items [data-del]', 'click', b => { r.items.splice(+b.dataset.del, 1); draw(el); });
  };
  const mount = (el, close) => {
    draw(el);
    el.querySelector('#re-name').addEventListener('input', e => { r.name = e.target.value; });
    el.querySelector('#re-serv').addEventListener('input', e => { r.servings = parseFloat(e.target.value) || 1; });
    el.querySelector('#re-add').addEventListener('click', () => pickFood((food, g) => { r.items.push({ foodId: food.id, g }); openRecipeEditor(r); }, r));
    el.querySelector('#re-save').addEventListener('click', () => {
      r.name = el.querySelector('#re-name').value.trim(); r.servings = parseFloat(el.querySelector('#re-serv').value) || 1;
      if (!r.name || !r.items.length) return toast('Pon un nombre y al menos un ingrediente');
      store.set('recipes', [r, ...S.recipes().filter(x => x.id !== r.id)]);
      close(); toast('Receta guardada'); rerender();
    });
    const del = el.querySelector('#re-del');
    if (del) del.addEventListener('click', async () => {
      if (await confirmSheet('¿Borrar esta receta?', 'Borrar')) { store.set('recipes', S.recipes().filter(x => x.id !== r.id)); rerender(); }
    });
  };
  const exists = S.recipes().some(x => x.id === r.id);
  sheet(`
    <div class="sheet-head"><h3>${exists ? 'Editar' : 'Nueva'} receta / comida guardada</h3><button class="icon-btn" data-close>✕</button></div>
    <label class="lbl">Nombre</label><input class="input" id="re-name" value="${esc(r.name)}" placeholder="Ej.: Lentejas de mi madre">
    <label class="lbl">Raciones que salen</label><input class="input" id="re-serv" type="number" inputmode="decimal" value="${r.servings}">
    <h4>Ingredientes (en crudo)</h4><div id="re-items" class="list"></div>
    <button class="btn ghost block" id="re-add">+ Ingrediente</button>
    <div class="card soft" id="re-tot"></div>
    <button class="btn primary block" id="re-save">Guardar</button>
    ${exists ? '<button class="btn danger-ghost block" id="re-del">Borrar receta</button>' : ''}`, { full: true, onMount: mount });
}

// buscador sencillo para elegir un alimento (recetas)
function pickFood(onPick, recipeDraft) {
  sheet(`<div class="sheet-head"><h3>Elegir ingrediente</h3><button class="icon-btn" id="pf-back">‹ Volver</button></div>
    <input class="input" id="pf-q" placeholder="Buscar alimento"><div id="pf-res" class="list"></div>`, {
    full: true,
    onMount: (el) => {
      el.querySelector('#pf-back').addEventListener('click', () => openRecipeEditor(recipeDraft));
      const q = el.querySelector('#pf-q'), res = el.querySelector('#pf-res');
      const draw = () => {
        res.innerHTML = N.searchFoods(q.value, S.foods()).map(f => `<button class="li" data-f="${esc(f.id)}"><span><b>${esc(f.name)}</b><small>${macroLine(f)} /100 g</small></span><span class="chev">›</span></button>`).join('');
        on(res, '[data-f]', 'click', b => amountSheet(null, null, N.findFood(b.dataset.f, S.foods()), { onPick }));
      };
      q.addEventListener('input', draw); draw();
    },
  });
}

// Guarda las entradas de una comida del diario como comida guardada
export function saveSlotAsRecipe(date, slotId) {
  const items = getDay(date).entries.filter(e => e.slot === slotId && e.foodId).map(e => ({ foodId: e.foodId, g: e.g }));
  if (!items.length) return toast('No hay alimentos de la base en esa comida');
  openRecipeEditor(null, items);
}
