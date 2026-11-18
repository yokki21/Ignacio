// Progreso: peso y tendencia, revisión semanal adaptativa, medidas, fotos e informe semanal.
import { S, N, G, store, getDay, targetsFor, loggedKcal, weightNow } from './ctx.js';
import { esc, r0, r1, n0, fdate, fshort, sheet, toast, uid, confirmSheet, lineChart, compressImage } from './ui.js';
import { rerender, on } from './nav.js';

export function checkInDue() {
  const plan = S.plan();
  if (!plan) return false;
  const today = N.iso();
  const ref = plan.lastCheck || plan.created;
  return N.daysBetween(ref, today) >= 7 && N.daysBetween(plan.created, today) >= 14;
}

export function viewProgreso(root) {
  const today = N.iso();
  const prof = S.profile(), plan = S.plan();
  const ws = S.weights();
  const series = N.trendSeries(ws);
  const last90 = series.filter(s => s.date >= N.addDays(today, -90));
  const tNow = weightNow();
  const t7 = N.trendAt(series, N.addDays(today, -7));
  const t30 = N.trendAt(series, N.addDays(today, -30));
  const goalWeekly = -(prof.rate / 100) * tNow;
  const base = N.baseTarget(prof, plan, tNow);
  const measures = S.measures();

  root.innerHTML = `
    <header class="top"><h1>Progreso</h1><span></span></header>
    <section class="card">
      <div class="row gap"><input class="input" id="w-kg" type="number" inputmode="decimal" step="0.1" placeholder="Peso (kg)"><input class="input" id="w-d" type="date" value="${today}"><button class="btn primary" id="w-ok">Guardar</button></div>
      <p class="muted small">Pésate ${prof.weighFreq || 3} veces por semana, en ayunas y tras ir al baño. Lo que cuenta es la línea de tendencia, no el dato de un día.</p>
      ${lineChart([{ points: last90.map(s => ({ x: s.date, y: s.kg })), color: 'var(--muted)', dots: true, line: false }, { points: last90.map(s => ({ x: s.date, y: s.trend })), color: 'var(--accent)', width: 2.6 }], { unit: 'kg · puntos: pesajes · línea: tendencia' })}
      <div class="stats3">
        <div><small>Tendencia</small><b>${r1(tNow)} kg</b></div>
        <div><small>7 días</small><b>${t7 != null ? signed(tNow - t7) + ' kg' : '—'}</b></div>
        <div><small>30 días</small><b>${t30 != null ? signed(tNow - t30) + ' kg' : '—'}</b></div>
      </div>
      <p class="muted small">Objetivo: ${signed(goalWeekly)} kg/semana (${String(prof.rate).replace('.', ',')} %).</p>
      <details><summary class="small">Ver pesajes</summary><div class="list">${[...ws].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 40).map(w => `<div class="li"><span class="cap">${fdate(w.date)}</span><span class="row gap"><b>${r1(w.kg)}</b><button class="icon-btn" data-dw="${w.date}">✕</button></span></div>`).join('')}</div></details>
    </section>

    <h2 class="sec">Calorías y ajuste semanal</h2>
    <section class="card">
      <div class="stats3"><div><small>Mantenimiento estimado</small><b>${n0(plan.tdee)}</b></div><div><small>Objetivo medio</small><b>${n0(base)}</b></div><div><small>Proteína</small><b>${targetsFor(today).p} g</b></div></div>
      <p class="muted small">Cada semana comparo lo que has comido con cómo ha cambiado tu tendencia de peso y recalculo tu mantenimiento real (como MacroFactor). Necesita al menos 10 días registrados y 4 pesajes en las últimas 3 semanas.</p>
      <button class="btn ${checkInDue() ? 'primary' : 'ghost'} block" id="ci">Hacer revisión semanal</button>
      ${plan.history.length ? `<details><summary class="small">Revisiones anteriores</summary><div class="list">${[...plan.history].reverse().map(h => `<div class="li"><span class="cap">${fdate(h.date)}</span><small>${n0(h.prev)} → <b>${n0(h.tdee)}</b> kcal · ${signed(h.weeklyRate)} kg/sem</small></div>`).join('')}</div></details>` : ''}
    </section>

    <h2 class="sec">Informe de la semana</h2>
    ${weeklyReport(today)}

    <h2 class="sec">Medidas</h2>
    <section class="card">
      <div class="grid3">
        ${[['cintura', 'Cintura cm'], ['pecho', 'Pecho cm'], ['biceps', 'Bíceps cm'], ['grasa', '% grasa'], ['musculo', 'Músculo'], ['visceral', 'Grasa visceral']].map(([k, l]) => `<div><label class="lbl">${l}</label><input class="input" data-m="${k}" type="number" inputmode="decimal" step="0.1"></div>`).join('')}
      </div>
      <label class="habit check small"><span>Usar este % de grasa para recalcular la proteína y el gasto</span><input type="checkbox" id="m-bf" checked></label>
      <button class="btn block" id="m-ok">Guardar medidas de hoy</button>
      ${measures.length ? `<div class="tablewrap"><table class="mtable"><thead><tr><th>Fecha</th><th>Cint.</th><th>Pecho</th><th>Bíc.</th><th>%G</th><th>Músc.</th><th>Visc.</th></tr></thead><tbody>
        ${[...measures].reverse().map(m => `<tr><td>${fshort(m.date)}</td>${['cintura', 'pecho', 'biceps', 'grasa', 'musculo', 'visceral'].map(k => `<td>${m[k] != null ? r1(m[k]) : ''}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : ''}
    </section>

    <h2 class="sec">Fotos de progreso</h2>
    <section class="card">
      <label class="btn ghost block">+ Añadir foto<input type="file" accept="image/*" capture="environment" id="ph" hidden></label>
      <div class="photos" id="photos"></div>
      <p class="muted small">Las fotos se guardan solo en este móvil (no se suben a la nube).</p>
    </section>`;

  on(root, '#w-ok', 'click', () => {
    const kg = parseFloat(root.querySelector('#w-kg').value), d = root.querySelector('#w-d').value;
    if (!kg || !d) return toast('Pon el peso');
    store.set('weights', [...S.weights().filter(w => w.date !== d), { date: d, kg }]);
    toast('Peso guardado'); rerender();
  });
  on(root, '[data-dw]', 'click', b => { store.set('weights', S.weights().filter(w => w.date !== b.dataset.dw)); rerender(); });
  on(root, '#ci', 'click', runCheckIn);
  on(root, '#m-ok', 'click', () => {
    const m = { date: today };
    root.querySelectorAll('[data-m]').forEach(i => { if (i.value !== '') m[i.dataset.m] = parseFloat(i.value); });
    if (Object.keys(m).length === 1) return toast('Rellena alguna medida');
    store.set('measures', [...S.measures().filter(x => x.date !== today), m].sort((a, b) => a.date.localeCompare(b.date)));
    if (m.grasa && root.querySelector('#m-bf').checked) store.set('profile', { ...S.profile(), bodyFat: m.grasa, bfWeight: tNow });
    toast('Medidas guardadas'); rerender();
  });
  on(root, '#ph', 'change', async i => {
    const f = i.files[0]; if (!f) return;
    const data = await compressImage(f);
    await store.savePhoto({ id: uid(), date: N.iso(), data, kg: r1(tNow) });
    drawPhotos(root);
  });
  drawPhotos(root);
}

const signed = (x) => (x > 0 ? '+' : '') + r1(x);

async function drawPhotos(root) {
  const box = root.querySelector('#photos');
  if (!box) return;
  let photos = [];
  try { photos = await store.listPhotos(); } catch { /* sin IndexedDB */ }
  box.innerHTML = photos.map(p => `<button class="ph" data-p="${p.id}"><img src="${p.data}" alt=""><span>${fshort(p.date)} · ${p.kg} kg</span></button>`).join('');
  on(box, '[data-p]', 'click', b => {
    const p = photos.find(x => x.id === b.dataset.p);
    sheet(`<img class="ph-full" src="${p.data}" alt=""><p class="muted cap">${fdate(p.date)} · ${p.kg} kg</p>
      <div class="row gap"><button class="btn danger-ghost" id="phd">Borrar</button><button class="btn grow" data-close>Cerrar</button></div>`, {
      full: true,
      onMount: (el, close) => el.querySelector('#phd').addEventListener('click', async () => { await store.deletePhoto(p.id); close(); drawPhotos(root); }),
    });
  });
}

function runCheckIn() {
  const plan = S.plan(), prof = S.profile();
  const today = N.iso();
  const res = N.weeklyCheckIn({ weights: S.weights(), dayKcal: loggedKcal(), prevTdee: plan.tdee, today });
  if (!res.ok) {
    sheet(`<h3>Aún no hay datos suficientes</h3><p>Del ${fdate(res.start, false)} al ${fdate(res.end, false)}:</p><ul>${res.reasons.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
      <p class="muted small">Mientras tanto se mantiene el objetivo actual.</p><button class="btn primary block" data-close>Entendido</button>`);
    return;
  }
  const w = weightNow();
  const newBase = N.baseTarget(prof, { tdee: res.tdee }, w);
  const oldBase = N.baseTarget(prof, plan, w);
  sheet(`<h3>Revisión semanal</h3>
    <p class="muted small">Del ${fdate(res.start, false)} al ${fdate(res.end, false)} · ${res.loggedDays} días registrados · ${res.weighIns} pesajes</p>
    <div class="list">
      <div class="li"><span>Media comida</span><b>${n0(res.avgIntake)} kcal/día</b></div>
      <div class="li"><span>Ritmo de la tendencia</span><b>${signed(res.weeklyRate)} kg/sem</b></div>
      <div class="li"><span>Mantenimiento observado</span><b>${n0(res.observed)} kcal</b></div>
      <div class="li"><span>Nuevo mantenimiento (suavizado)</span><b>${n0(plan.tdee)} → ${n0(res.tdee)} kcal</b></div>
      <div class="li"><span>Objetivo medio diario</span><b>${n0(oldBase)} → ${n0(newBase)} kcal</b></div>
    </div>
    <p class="muted small">El cambio se limita a ±250 kcal por semana para no reaccionar a una semana rara (retención de líquidos, un finde fuera…).</p>
    <div class="row gap"><button class="btn ghost" data-close>Ahora no</button><button class="btn primary grow" id="ci-ok">Aplicar</button></div>`, {
    onMount: (el, close) => el.querySelector('#ci-ok').addEventListener('click', () => {
      store.set('plan', { ...plan, tdee: res.tdee, lastCheck: today, history: [...plan.history, { date: today, prev: plan.tdee, tdee: res.tdee, observed: res.observed, weeklyRate: res.weeklyRate, avgIntake: res.avgIntake }] });
      close(); toast('Objetivo actualizado'); rerender();
    }),
  });
}

function weeklyReport(today) {
  const days = Array.from({ length: 7 }, (_, i) => N.addDays(today, -6 + i));
  const set = S.settings();
  let kcal = 0, prot = 0, logged = 0, protOk = 0, tgtK = 0, steps = 0, stepDays = 0, water = 0, supp = 0;
  for (const d of days) {
    const day = getDay(d);
    const t = N.sumMacros(day.entries);
    const tg = targetsFor(d);
    if (day.entries.length) { logged++; kcal += t.kcal; prot += t.p; tgtK += tg.kcal; if (t.p >= tg.p * 0.9) protOk++; }
    if (day.steps) { steps += day.steps; stepDays++; }
    water += day.water;
    if (set.supplements.length && set.supplements.every(s => day.supps[s.id])) supp++;
  }
  const since = N.addDays(today, -6);
  const wk = S.workouts().filter(w => w.date.slice(0, 10) >= since);
  const acts = days.reduce((a, d) => a + getDay(d).acts.length, 0);
  return `<section class="card report">
    <div class="li"><span>Días registrados</span><b>${logged}/7</b></div>
    <div class="li"><span>Media de kcal</span><b>${logged ? n0(kcal / logged) + ' / ' + n0(tgtK / logged) : '—'}</b></div>
    <div class="li"><span>Proteína media</span><b>${logged ? r0(prot / logged) + ' g' : '—'}</b></div>
    <div class="li"><span>Días con la proteína cumplida</span><b>${protOk}/${logged || 7}</b></div>
    <div class="li"><span>Entrenos de gimnasio</span><b>${wk.length}</b></div>
    <div class="li"><span>Fútbol, pádel y cardio</span><b>${acts}</b></div>
    <div class="li"><span>Pasos de media</span><b>${stepDays ? n0(steps / stepDays) : '—'}</b></div>
    <div class="li"><span>Agua de media</span><b>${r1(water / 7 / 1000)} L</b></div>
    <div class="li"><span>Días con todos los suplementos</span><b>${supp}/7</b></div>
  </section>`;
}
