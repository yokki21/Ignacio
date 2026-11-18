// Hojas para añadir comida: buscador, escáner de código de barras, añadido rápido, alimento propio y recetas.
import { S, N, store, getDay, saveDay, addRecent, prefs, meals } from './ctx.js';
import { allergenWarning, allowedFood } from './data/foods.js';
import { esc, r0, r1, sheet, closeSheet, toast, uid, confirmSheet } from './ui.js';
import { on, rerender } from './nav.js';

const macroLine = (m) => `<span class="kc">${r0(m.kcal)} kcal</span> · P ${r1(m.p)} · H ${r1(m.c)} · G ${r1(m.f)}`;

export function addEntry(date, entry) {
  saveDay(date, d => { d.entries.push({ id: uid(), ...entry }); });
}
const defaultQty = (food) => store.get('lastqty', {})[food.id] || food.units?.[0]?.g || food.serving || 100;
function rememberQty(food, g) { store.update('lastqty', {}, o => { o[food.id] = g; }); }
function warn(food) {
  const p = prefs();
  const w = allergenWarning(food, p);
  if (!allowedFood(food, p)) w.push('no encaja en tu dieta');
  return w.length ? `<span class="warnchip">⚠ ${esc(w.join(', '))}</span>` : '';
}
function qtyLabel(food, g) {
  const u = food.units?.find(x => Math.abs(g / x.g - Math.round(g / x.g)) < 0.01 && g / x.g <= 6);
  return u ? `${r1(g / u.g)} ${u.n}` : `${r0(g)} g`;
}

// ---------- hoja de añadir comida ----------
// Todo ocurre dentro de la misma hoja: buscar, elegir cantidad, escanear, rápido o crear, y se pueden añadir varias cosas seguidas.
export function openAddFood(date, slotId) {
  const allMeals = [...meals(), { id: 'extra', name: 'Picoteo' }];
  const st = { slot: allMeals.some(m => m.id === slotId) ? slotId : allMeals[0].id, q: '', view: 'search', food: null, recipe: null };
  let el;
  const added = () => getDay(date).entries.filter(e => e.slot === st.slot);

  const head = () => `
    <div class="sheet-head"><h3>Añadir comida</h3><button class="btn sm primary" data-done>Hecho</button></div>
    <div class="mealtabs">${allMeals.map(m => `<button data-slot="${m.id}" class="${m.id === st.slot ? 'on' : ''}">${esc(m.name)}</button>`).join('')}</div>`;
  const foot = () => {
    const a = added(); const t = N.sumMacros(a);
    return `<div class="af-foot">${a.length ? `En ${esc(allMeals.find(m => m.id === st.slot).name)}: <b>${a.length}</b> · ${r0(t.kcal)} kcal · P ${r0(t.p)} g` : 'Toca <b>+</b> para añadir con la cantidad habitual, o el alimento para elegir cantidad.'}</div>`;
  };

  const row = (f) => f.isRecipe
    ? `<div class="frow"><button class="fmain" data-r="${esc(f.id)}"><b>${esc(f.name)}</b><small>Receta · 1 ración · ${macroLine(N.recipeMacros(f, S.foods()))}</small></button><button class="plus" data-qr="${esc(f.id)}">+</button></div>`
    : `<div class="frow"><button class="fmain" data-f="${esc(f.id)}"><b>${esc(f.name)}</b><small>${f.brand ? esc(f.brand) + ' · ' : ''}${qtyLabel(f, defaultQty(f))} · ${macroLine(N.macros(f, defaultQty(f)))}</small>${warn(f)}</button><button class="plus" data-q="${esc(f.id)}">+</button></div>`;

  const views = {
    search: () => {
      const custom = S.foods(), recipes = S.recipes();
      let body;
      if (!st.q.trim()) {
        const rec = S.recent().map(id => N.findFood(id, custom) || recipes.find(r => r.id === id)).filter(Boolean).map(x => (x.items ? { ...x, isRecipe: true } : x));
        body = `
          ${rec.length ? `<h4 class="muted small up">Recientes</h4><div class="list">${rec.slice(0, 15).map(row).join('')}</div>` : ''}
          ${recipes.length ? `<h4 class="muted small up">Mis comidas guardadas</h4><div class="list">${recipes.map(r => row({ ...r, isRecipe: true })).join('')}</div>` : ''}
          ${!rec.length && !recipes.length ? `<h4 class="muted small up">Sugerencias</h4><div class="list">${N.searchFoods('', custom).slice(0, 12).map(row).join('')}</div>` : ''}`;
      } else {
        const res = N.searchFoods(st.q, custom, recipes);
        body = `<div class="list">${res.map(row).join('')}</div>${!res.length ? '<p class="muted">Sin resultados.</p>' : ''}
          <button class="btn ghost block" data-view="create">✏️ Crear «${esc(st.q)}»</button>`;
      }
      const yest = getDay(N.addDays(date, -1)).entries.filter(e => e.slot === st.slot);
      return `<div class="searchbar"><input class="input" id="af-q" type="search" placeholder="Busca un alimento o receta" value="${esc(st.q)}" autocomplete="off"></div>
        <div class="quick4">
          <button data-view="scan">📷<span>Escanear</span></button><button data-view="quick">⚡<span>Solo kcal</span></button>
          <button data-view="create">✏️<span>Crear</span></button><button data-copy ${yest.length ? '' : 'disabled'}>📋<span>Igual que ayer</span></button>
        </div><div id="af-res">${body}</div>`;
    },
    amount: () => {
      const f = st.food; const g0 = defaultQty(f);
      const units = [{ n: 'g', g: 1 }, ...(f.units || []), ...(f.serving ? [{ n: 'ración', g: f.serving }] : [])];
      const chipsQ = [...(f.units || []).flatMap(u => [1, 2].map(k => [k * u.g, `${k} ${u.n}`])), ...(f.serving ? [[f.serving, '1 ración']] : []), [50, '50 g'], [100, '100 g'], [150, '150 g'], [200, '200 g']];
      return `<button class="linkbtn" data-view="search">‹ Volver</button>
        <h3>${esc(f.name)}</h3>${f.brand ? `<p class="muted small">${esc(f.brand)}</p>` : ''}${warn(f)}
        <div class="qtyrow"><input class="input big" id="am-n" type="number" inputmode="decimal" step="any" value="${r0(g0)}"><span class="unit">g</span></div>
        <div class="qchips">${chipsQ.slice(0, 8).map(([g, l]) => `<button type="button" data-g="${g}">${esc(l)}</button>`).join('')}</div>
        <div class="card soft" id="am-prev"></div>
        <button class="btn primary block" id="am-ok">Añadir</button>`;
    },
    recipe: () => {
      const r = st.recipe; const m = N.recipeMacros(r, S.foods());
      return `<button class="linkbtn" data-view="search">‹ Volver</button><h3>${esc(r.name)}</h3>
        <label class="lbl">Raciones (la receta rinde ${r.servings})</label>
        <div class="qchips">${[0.5, 1, 1.5, 2].map(k => `<button type="button" data-s="${k}" class="${k === 1 ? 'on' : ''}">${String(k).replace('.', ',')}</button>`).join('')}</div>
        <input class="input" id="ra-n" type="number" inputmode="decimal" step="0.25" value="1">
        <div class="card soft" id="ra-prev"></div><button class="btn primary block" id="ra-ok">Añadir</button>`;
    },
    scan: () => `<button class="linkbtn" data-view="search">‹ Volver</button>
      <div class="scan-box"><video id="sc-v" playsinline muted></video><div class="scan-line"></div></div>
      <p class="muted small" id="sc-st">Apunta al código de barras.</p>
      <div class="row gap"><input class="input" id="sc-code" inputmode="numeric" placeholder="O escribe el código"><button class="btn" id="sc-go">Buscar</button></div>
      <p class="muted small">Datos de Open Food Facts. Revisa que cuadren con la etiqueta.</p>`,
    quick: () => `<button class="linkbtn" data-view="search">‹ Volver</button>
      <label class="lbl">¿Qué has comido?</label><input class="input" id="q-name" placeholder="Ej.: menú del día" value="${esc(st.q)}">
      <div class="grid4">
        <div><label class="lbl">kcal</label><input class="input" id="q-k" type="number" inputmode="decimal"></div>
        <div><label class="lbl">Prot. g</label><input class="input" id="q-p" type="number" inputmode="decimal"></div>
        <div><label class="lbl">Hidr. g</label><input class="input" id="q-c" type="number" inputmode="decimal"></div>
        <div><label class="lbl">Grasa g</label><input class="input" id="q-f" type="number" inputmode="decimal"></div>
      </div><p class="muted small">Si no sabes los macros, pon solo las calorías.</p>
      <button class="btn primary block" id="q-ok">Añadir</button>`,
    create: () => `<button class="linkbtn" data-view="search">‹ Volver</button>` + foodForm({ name: st.q }) + `<button class="btn primary block" id="cf-ok">Guardar y elegir cantidad</button>`,
  };

  const draw = () => {
    stopScan();
    el.innerHTML = head() + `<div class="af-body">${views[st.view]()}</div>` + foot();
    bind();
  };
  const refreshFoot = () => { el.querySelector('.af-foot').outerHTML = foot(); };
  const quickAdd = (food, g) => {
    addEntry(date, { slot: st.slot, foodId: food.id, name: food.name, g, ...N.macros(food, g) });
    addRecent(food.id); rememberQty(food, g);
    toast(`Añadido: ${qtyLabel(food, g)} de ${food.name}`);
  };
  const addRecipe = (r, k) => {
    const m = N.recipeMacros(r, S.foods());
    addEntry(date, { slot: st.slot, recipeId: r.id, name: r.name, servings: k, g: r0(m.totalG * k), kcal: m.kcal * k, p: m.p * k, c: m.c * k, f: m.f * k });
    addRecent(r.id); toast(`Añadido: ${r.name}`);
  };

  function bind() {
    on(el, '[data-done]', 'click', () => { closeSheet(); });
    on(el, '[data-slot]', 'click', b => { st.slot = b.dataset.slot; draw(); });
    on(el, '.quick4 [data-view], .linkbtn[data-view]', 'click', b => { st.view = b.dataset.view; draw(); });
    on(el, '.quick4 [data-copy]', 'click', () => {
      const yest = getDay(N.addDays(date, -1)).entries.filter(e => e.slot === st.slot);
      saveDay(date, d => { yest.forEach(e => d.entries.push({ ...e, id: uid(), fromMenu: false })); });
      toast(`Copiado: ${yest.length} alimentos de ayer`); refreshFoot();
    });
    const q = el.querySelector('#af-q');
    if (q) {
      q.addEventListener('input', () => {
        st.q = q.value;
        const tmp = document.createElement('div'); tmp.innerHTML = views.search();
        el.querySelector('#af-res').replaceWith(tmp.querySelector('#af-res'));
        bind2();
      });
    }
    bind2();
    if (st.view === 'amount') {
      const f = st.food, n = el.querySelector('#am-n');
      const prev = () => { el.querySelector('#am-prev').innerHTML = `${qtyLabel(f, parseFloat(n.value) || 0)} → ${macroLine(N.macros(f, parseFloat(n.value) || 0))}`; };
      n.addEventListener('input', prev); prev();
      on(el, '[data-g]', 'click', b => { n.value = b.dataset.g; prev(); });
      on(el, '#am-ok', 'click', () => {
        const g = parseFloat(n.value) || 0;
        if (g <= 0) return toast('Pon una cantidad');
        quickAdd(f, g); st.view = 'search'; draw();
      });
      setTimeout(() => n.select(), 200);
    }
    if (st.view === 'recipe') {
      const r = st.recipe, m = N.recipeMacros(r, S.foods()), n = el.querySelector('#ra-n');
      const k = () => parseFloat(n.value) || 0;
      const prev = () => { el.querySelector('#ra-prev').innerHTML = macroLine({ kcal: m.kcal * k(), p: m.p * k(), c: m.c * k(), f: m.f * k() }); };
      n.addEventListener('input', prev); prev();
      on(el, '[data-s]', 'click', b => { n.value = b.dataset.s; prev(); });
      on(el, '#ra-ok', 'click', () => { if (k() <= 0) return toast('Pon las raciones'); addRecipe(r, k()); st.view = 'search'; draw(); });
    }
    if (st.view === 'scan') {
      const stEl = el.querySelector('#sc-st');
      const found = async (code) => {
        stopScan(); stEl.textContent = 'Buscando ' + code + '…';
        const food = await lookupBarcode(code, stEl);
        if (food) { st.food = food; st.view = 'amount'; draw(); }
      };
      on(el, '#sc-go', 'click', () => { const c = el.querySelector('#sc-code').value.trim(); if (c) found(c); });
      startScan(el.querySelector('#sc-v'), found, stEl);
    }
    if (st.view === 'quick') {
      on(el, '#q-ok', 'click', () => {
        const v = (id) => parseFloat(el.querySelector(id).value) || 0;
        let kcal = v('#q-k'); const p = v('#q-p'), c = v('#q-c'), f = v('#q-f');
        if (!kcal) kcal = p * 4 + c * 4 + f * 9;
        if (!kcal) return toast('Pon al menos las calorías');
        addEntry(date, { slot: st.slot, name: el.querySelector('#q-name').value.trim() || 'Añadido rápido', g: 0, kcal, p, c, f });
        toast('Añadido'); st.view = 'search'; st.q = ''; draw();
      });
    }
    if (st.view === 'create') {
      on(el, '#cf-ok', 'click', () => {
        const food = readFoodForm(el);
        if (!food) return;
        store.set('foods', [food, ...S.foods()]);
        st.food = food; st.view = 'amount'; draw();
      });
    }
  }
  function bind2() {
    const res = el.querySelector('#af-res');
    if (!res) return;
    on(res, '[data-f]', 'click', b => { st.food = N.findFood(b.dataset.f, S.foods()); st.view = 'amount'; draw(); });
    on(res, '[data-r]', 'click', b => { st.recipe = S.recipes().find(r => r.id === b.dataset.r); st.view = 'recipe'; draw(); });
    on(res, '[data-q]', 'click', b => { const f = N.findFood(b.dataset.q, S.foods()); quickAdd(f, defaultQty(f)); b.classList.add('done'); refreshFoot(); });
    on(res, '[data-qr]', 'click', b => { addRecipe(S.recipes().find(r => r.id === b.dataset.qr), 1); b.classList.add('done'); refreshFoot(); });
    on(res, '[data-view]', 'click', b => { st.view = b.dataset.view; draw(); });
  }

  sheet('<div id="af"></div>', {
    full: true,
    onMount: (s) => { el = s.querySelector('#af'); draw(); setTimeout(() => el.querySelector('#af-q')?.focus(), 250); },
    onClose: () => { stopScan(); rerender(); },
  });
}

// cantidad (lo usa el editor de recetas)
export function amountSheet(date, slotId, food, { onPick } = {}) {
  if (!food) return;
  sheet(`
    <div class="sheet-head"><h3>${esc(food.name)}</h3><button class="icon-btn" data-close>✕</button></div>
    <div class="qtyrow"><input class="input big" id="am-n" type="number" inputmode="decimal" value="${r0(defaultQty(food))}" step="any"><span class="unit">g</span></div>
    <div class="qchips">${[...(food.units || []).map(u => [u.g, '1 ' + u.n]), [50, '50 g'], [100, '100 g'], [200, '200 g']].map(([g, l]) => `<button type="button" data-g="${g}">${esc(l)}</button>`).join('')}</div>
    <div class="card soft" id="am-prev"></div>
    <button class="btn primary block" id="am-ok">Añadir ingrediente</button>`, {
    onMount: (el, close) => {
      const n = el.querySelector('#am-n');
      const prev = () => { el.querySelector('#am-prev').innerHTML = macroLine(N.macros(food, parseFloat(n.value) || 0)); };
      n.addEventListener('input', prev); prev();
      on(el, '[data-g]', 'click', b => { n.value = b.dataset.g; prev(); });
      el.querySelector('#am-ok').addEventListener('click', () => {
        const g = parseFloat(n.value) || 0;
        if (g <= 0) return toast('Pon una cantidad');
        close(); onPick(food, g);
      });
    },
  });
}

// ---------- escáner ----------
let scanStop = null;
function stopScan() { if (scanStop) { try { scanStop(); } catch { /* */ } scanStop = null; } }


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

async function lookupBarcode(code, st) {
  const custom = S.foods();
  const existing = custom.find(f => f.barcode === code);
  if (existing) return existing;
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,product_name_es,brands,nutriments,serving_quantity,allergens_tags`);
    const j = await r.json();
    const p = j.product;
    const nm = p?.nutriments || {};
    const kcal = nm['energy-kcal_100g'] ?? (nm['energy_100g'] ? nm['energy_100g'] / 4.184 : null);
    if (!p || kcal == null) { st.textContent = 'Producto no encontrado o sin datos. Créalo con «Crear».'; return null; }
    const tags = (p.allergens_tags || []).map(t => ({ 'en:gluten': 'gluten', 'en:milk': 'lactosa', 'en:eggs': 'huevo', 'en:nuts': 'frutos_secos', 'en:peanuts': 'cacahuete', 'en:fish': 'pescado', 'en:crustaceans': 'marisco', 'en:soybeans': 'soja' }[t])).filter(Boolean);
    const food = {
      id: 'off-' + code, barcode: code, src: 'off', groups: [], units: [], tags,
      name: p.product_name_es || p.product_name || 'Producto ' + code, brand: (p.brands || '').split(',')[0],
      kcal: +kcal, p: +(nm.proteins_100g || 0), c: +(nm.carbohydrates_100g || 0), f: +(nm.fat_100g || 0),
      serving: p.serving_quantity ? +p.serving_quantity : null,
    };
    store.set('foods', [food, ...custom.filter(f => f.id !== food.id)]);
    return food;
  } catch (e) { console.error(e); st.textContent = 'Sin conexión o error al buscar. Inténtalo de nuevo.'; return null; }
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
