// Cuestionario inicial (y editores de perfil desde Ajustes): persona, actividad, objetivo, alimentación, gimnasio y hábitos.
import { S, N, store, defaultProfile, weightNow } from './ctx.js';
import { DEFAULT_SETTINGS, DEFAULT_GYM, mealLayout } from './data/presets.js';
import { ALLERGENS, DIETS } from './data/foods.js';
import { INJURIES, splitsFor, recommendedSplit, SPLITS } from './data/exercises.js';
import { generateRoutines } from './routines.js';
import { esc, sheet, toast, n0, r1, confirmSheet } from './ui.js';
import { rerender, on } from './nav.js';

const COMMON_DISLIKES = ['Brócoli', 'Coliflor', 'Pescado', 'Champiñones', 'Cebolla', 'Pimiento', 'Espinacas', 'Aguacate', 'Lentejas', 'Garbanzos', 'Atún', 'Queso', 'Tofu', 'Plátano'];
const SUPPS = ['Creatina', 'Proteína en polvo', 'Multivitamínico', 'Omega 3', 'Cafeína', 'Vitamina D'];

// ---------- utilidades de formulario ----------
const get = (o, path) => path.split('.').reduce((a, k) => a?.[k], o);
function set(o, path, v) { const ks = path.split('.'); const last = ks.pop(); ks.reduce((a, k) => (a[k] ??= {}), o)[last] = v; }

function chips(q, path, options, { multi = false, num = false, cls = '' } = {}) {
  const cur = get(q, path);
  const isOn = (v) => (multi ? (cur || []).includes(v) : cur === v);
  return `<div class="qchips ${cls}" data-k="${path}" data-multi="${multi ? 1 : 0}" data-num="${num ? 1 : 0}">${options.map(([v, l, sub]) =>
    `<button type="button" data-v="${esc(v)}" class="${isOn(num ? +v : v) ? 'on' : ''}">${esc(l)}${sub ? `<small>${esc(sub)}</small>` : ''}</button>`).join('')}</div>`;
}
function num(q, path, label, { step = 1, ph = '', suffix = '' } = {}) {
  const v = get(q, path);
  return `<div><label class="lbl">${esc(label)}</label><div class="inwrap"><input class="input" type="number" inputmode="decimal" step="${step}" data-k="${path}" value="${v ?? ''}" placeholder="${esc(ph)}">${suffix ? `<span>${esc(suffix)}</span>` : ''}</div></div>`;
}
function bindForm(el, q, redraw) {
  on(el, '.qchips button', 'click', b => {
    const box = b.parentElement;
    const path = box.dataset.k, multi = box.dataset.multi === '1';
    const v = box.dataset.num === '1' ? +b.dataset.v : b.dataset.v === 'true' ? true : b.dataset.v === 'false' ? false : b.dataset.v;
    if (multi) { const arr = new Set(get(q, path) || []); arr.has(v) ? arr.delete(v) : arr.add(v); set(q, path, [...arr]); }
    else set(q, path, v);
    redraw();
  });
  on(el, 'input[data-k], select[data-k]', 'change', i => {
    const v = i.type === 'number' ? (i.value === '' ? null : parseFloat(i.value)) : i.value;
    set(q, i.dataset.k, v);
    if (i.dataset.redraw) redraw();
  });
  on(el, '[data-addtag]', 'click', b => {
    const inp = el.querySelector(`#${b.dataset.addtag}`);
    const vals = inp.value.split(',').map(x => x.trim()).filter(Boolean);
    if (!vals.length) return;
    const path = b.dataset.path;
    set(q, path, [...new Set([...(get(q, path) || []), ...vals])]);
    redraw();
  });
  on(el, '[data-deltag]', 'click', b => { const [path, i] = b.dataset.deltag.split('|'); const arr = get(q, path); arr.splice(+i, 1); redraw(); });
}
function tagList(q, path, inputId, ph) {
  const arr = get(q, path) || [];
  return `<div class="tags">${arr.map((t, i) => `<span class="tagx">${esc(t)}<button type="button" data-deltag="${path}|${i}">✕</button></span>`).join('')}</div>
    <div class="row gap"><input class="input" id="${inputId}" placeholder="${esc(ph)}"><button type="button" class="btn sm" data-addtag="${inputId}" data-path="${path}">Añadir</button></div>`;
}

// ---------- pasos ----------
const STEPS = {
  persona: {
    title: 'Sobre ti', sub: 'Lo básico para calcular tu gasto de energía.',
    html: (q, ctx) => `
      <label class="lbl">¿Cómo te llamas?</label><input class="input" data-k="profile.name" value="${esc(q.profile.name || '')}" placeholder="Tu nombre">
      <label class="lbl">Sexo</label>${chips(q, 'profile.sex', [['h', 'Hombre'], ['m', 'Mujer']])}
      <div class="grid3">
        ${num(q, 'profile.age', 'Edad', { suffix: 'años' })}
        ${num(q, 'profile.height', 'Altura', { suffix: 'cm' })}
        ${ctx.onboarding ? num(q, 'weight', 'Peso hoy', { step: 0.1, suffix: 'kg' }) : ''}
      </div>
      ${num(q, 'profile.bodyFat', '% de grasa corporal (opcional)', { step: 0.1, ph: 'Si lo sabes (báscula o medición)', suffix: '%' })}
      <p class="muted small">Si conoces tu % de grasa, el cálculo de proteína y gasto es más preciso.</p>`,
    validate: (q, ctx) => {
      if (!q.profile.age || q.profile.age < 14 || q.profile.age > 100) return 'Pon una edad válida';
      if (!q.profile.height || q.profile.height < 120 || q.profile.height > 230) return 'Pon tu altura en cm';
      if (ctx.onboarding && (!q.weight || q.weight < 30 || q.weight > 300)) return 'Pon tu peso de hoy en kg';
      if (q.profile.bodyFat != null && (q.profile.bodyFat < 3 || q.profile.bodyFat > 60)) return 'El % de grasa no parece correcto';
      return null;
    },
  },
  actividad: {
    title: 'Tu actividad', sub: 'Para estimar cuánto gastas al día.',
    html: (q) => `
      <label class="lbl">En tu trabajo o estudios pasas la mayor parte del tiempo…</label>
      ${chips(q, 'profile.job', [['sentado', 'Sentado', 'oficina, estudio, conducir'], ['depie', 'De pie / moviéndome', 'tienda, profesor, sanidad'], ['fisico', 'Esfuerzo físico', 'obra, almacén, campo']], { cls: 'col' })}
      <label class="lbl">Pasos al día (aprox.)</label>
      ${chips(q, 'profile.steps', [[4000, 'Menos de 5.000'], [6500, '5.000-8.000'], [9500, '8.000-11.000'], [12500, 'Más de 11.000']], { num: true })}
      <label class="lbl">Otros deportes (fútbol, pádel, correr…): días por semana</label>
      ${chips(q, 'profile.sportDays', [0, 1, 2, 3, 4, 5].map(n => [n, String(n)]), { num: true })}`,
  },
  objetivo: {
    title: 'Tu objetivo', sub: '',
    html: (q) => {
      const g = q.profile.goal;
      const rates = g === 'ganar' ? [[0.25, '0,25 %/sem', 'lento, poca grasa'], [0.5, '0,5 %/sem', 'más rápido']] : [[0.25, '0,25 %/sem', 'suave'], [0.5, '0,5 %/sem', 'recomendado'], [0.75, '0,75 %/sem', 'exigente'], [1, '1 %/sem', 'agresivo']];
      return `
      ${chips(q, 'profile.goal', [['perder', 'Perder grasa'], ['mantener', 'Mantener / recomposición'], ['ganar', 'Ganar músculo']], { cls: 'col' })}
      ${g !== 'mantener' ? `<label class="lbl">Ritmo (% de tu peso por semana)</label>${chips(q, 'profile.rate', rates, { num: true })}` : ''}
      <label class="lbl">¿Quieres más margen de calorías el fin de semana? (mismo total semanal)</label>
      ${chips(q, 'profile.weekendBoost', [[0, 'No, igual todos los días'], [10, 'Algo (+10 %)'], [15, 'Bastante (+15 %)']], { num: true })}
      ${num(q, 'profile.manualTdee', 'Tu mantenimiento, si lo conoces (opcional)', { ph: 'kcal/día', suffix: 'kcal' })}
      <p class="muted small">No hace falta: la app lo calcula y lo ajusta cada semana con tu peso real.</p>`;
    },
    validate: (q) => (q.profile.goal !== 'mantener' && !q.profile.rate ? 'Elige un ritmo' : null),
  },
  comida: {
    title: 'Tu alimentación', sub: 'Puedes dejar en blanco lo que no sepas y completarlo después en Ajustes.',
    html: (q) => `
      <label class="lbl">¿Cuántas comidas haces al día?</label>${chips(q, 'settings.mealsN', [2, 3, 4, 5, 6].map(n => [n, String(n)]), { num: true })}
      <label class="lbl">Tipo de alimentación</label>${chips(q, 'settings.diet', DIETS)}
      <label class="lbl">¿Tomas batidos de proteína?</label>${chips(q, 'settings.shake', [[true, 'Sí'], [false, 'No']])}
      <label class="lbl">Alergias o intolerancias</label>${chips(q, 'settings.allergens', ALLERGENS, { multi: true })}
      <label class="lbl">Alimentos que no te gustan</label>
      ${chips(q, 'settings.dislikes', COMMON_DISLIKES.map(d => [d, d]), { multi: true })}
      ${tagList({ x: (q.settings.dislikes || []).filter(d => !COMMON_DISLIKES.includes(d)) }, 'x', 'dl-in', 'Otros, separados por comas').replace(/data-path="x"/, 'data-path="settings.dislikes"').replace(/data-deltag="x\|/g, 'data-deltagx="')}`,
  },
  gym: {
    title: 'Tu entrenamiento', sub: 'Con esto se generan tus rutinas. Lo puedes cambiar cuando quieras.',
    html: (q) => {
      const g = q.gym;
      if (!g.trains) return `<label class="lbl">¿Entrenas fuerza (gimnasio o en casa)?</label>${chips(q, 'gym.trains', [[true, 'Sí'], [false, 'No, de momento no']])}`;
      const splits = splitsFor(g.days);
      return `
      <label class="lbl">¿Entrenas fuerza (gimnasio o en casa)?</label>${chips(q, 'gym.trains', [[true, 'Sí'], [false, 'No, de momento no']])}
      <label class="lbl">Días por semana</label>${chips(q, 'gym.days', [1, 2, 3, 4, 5, 6].map(n => [n, String(n)]), { num: true })}
      <label class="lbl">¿Dónde entrenas?</label>${chips(q, 'gym.equipment', [['gym', 'Gimnasio'], ['casa_manc', 'Casa con mancuernas'], ['corporal', 'Solo peso corporal']], { cls: 'col' })}
      ${g.equipment !== 'gym' ? `<label class="lbl">¿Tienes barra de dominadas?</label>${chips(q, 'gym.pullupBar', [[true, 'Sí'], [false, 'No']])}` : ''}
      <label class="lbl">Experiencia</label>${chips(q, 'gym.experience', [['principiante', 'Principiante', 'menos de 1 año'], ['intermedio', 'Intermedio', '1-3 años'], ['avanzado', 'Avanzado', 'más de 3 años']], { cls: 'col' })}
      <label class="lbl">Objetivo del entreno</label>${chips(q, 'gym.goal', [['hipertrofia', 'Ganar músculo'], ['fuerza', 'Ganar fuerza'], ['salud', 'Salud y forma']])}
      <label class="lbl">Duración de cada sesión</label>${chips(q, 'gym.sessionMin', [[30, '30 min'], [45, '45 min'], [60, '1 h'], [75, '1 h 15'], [90, '1 h 30']], { num: true })}
      <label class="lbl">Tipo de rutina</label>${chips(q, 'gym.split', [['', `Recomendada (${SPLITS[recommendedSplit(g.days)].name.toLowerCase()})`], ...splits.filter(([k]) => k !== recommendedSplit(g.days))], { cls: 'col' })}
      <label class="lbl">Lesiones o molestias</label>${chips(q, 'gym.injuries', INJURIES, { multi: true })}
      <label class="lbl">Ejercicios que no quieres hacer</label>
      ${tagList(q, 'gym.avoid', 'av-in', 'Ej.: sentadilla, dominadas')}`;
    },
  },
  habitos: {
    title: 'Hábitos', sub: 'Lo que quieres llevar controlado cada día.',
    html: (q) => `
      <div class="grid2">${num(q, 'settings.waterGoal', 'Agua al día', { step: 250, suffix: 'ml' })}${num(q, 'settings.stepGoal', 'Objetivo de pasos', { step: 500 })}</div>
      <label class="lbl">Suplementos que tomas</label>
      ${chips(q, 'suppNames', SUPPS.map(s => [s, s]), { multi: true })}
      ${tagList({ x: (q.suppNames || []).filter(d => !SUPPS.includes(d)) }, 'x', 'sp-in', 'Otros, separados por comas').replace(/data-path="x"/, 'data-path="suppNames"').replace(/data-deltag="x\|/g, 'data-deltagx="')}`,
  },
};
const ORDER = ['persona', 'actividad', 'objetivo', 'comida', 'gym', 'habitos'];

// ---------- estado del cuestionario a partir de lo guardado ----------
function loadQ() {
  const profile = { ...defaultProfile(), ...(S.profile() || {}) };
  const settings = { ...DEFAULT_SETTINGS, ...store.get('settings', {}) };
  settings.mealsN = settings.meals?.length || 4;
  const gym = { ...DEFAULT_GYM, ...store.get('gym', {}) };
  gym.split = gym.split || '';
  const suppNames = (settings.supplements || []).map(s => s.name);
  return { profile, settings, gym, suppNames, weight: null };
}

// Guarda y recalcula todo lo que depende de las respuestas
export async function applyQ(q, { onboarding = false, changed = ORDER } = {}) {
  const prevGym = store.get('gym');
  const s = q.settings;
  const layout = mealLayout(s.mealsN || 4, s.shake !== false);
  const prevMeals = store.get('settings')?.meals;
  let meals = layout;
  if (!onboarding && prevMeals?.length) {
    if (!changed.includes('comida')) meals = prevMeals;
    else if (prevMeals.length === layout.length) meals = prevMeals.map((m, i) => ({ ...m, style: layout[i].style })); // conserva nombres y reparto
  }
  const settings = { ...s, meals, supplements: (q.suppNames || []).map(name => ({ id: N.norm(name).replace(/[^a-z0-9]+/g, '-'), name })) };
  delete settings.mealsN;
  store.set('settings', settings);
  const gym = { ...q.gym, split: q.gym.split || null };
  store.set('gym', gym);

  const profile = { ...q.profile, activity: N.activityFactor(q.profile, gym) };
  if (!profile.goal || profile.goal === 'mantener') profile.rate = profile.rate || 0;
  if (onboarding) { profile.startWeight = q.weight; profile.bfWeight = q.weight; }
  else if (profile.bodyFat !== S.profile()?.bodyFat) profile.bfWeight = weightNow();
  store.set('profile', profile);

  const w = onboarding ? q.weight : weightNow();
  if (onboarding) {
    store.set('weights', [...S.weights().filter(x => x.date !== N.iso()), { date: N.iso(), kg: q.weight }]);
    store.set('plan', { tdee: N.initialTdee(profile, w), created: N.iso(), lastCheck: null, history: [] });
  } else {
    // el mantenimiento se recalcula mientras no haya revisiones semanales reales
    const plan = S.plan();
    if (profile.manualTdee) store.set('plan', { ...plan, tdee: profile.manualTdee });
    else if (!plan.history.length) store.set('plan', { ...plan, tdee: N.initialTdee(profile, w) });
  }

  // rutinas
  const gymChanged = JSON.stringify(prevGym || {}) !== JSON.stringify(gym);
  if (gym.trains && (onboarding || (gymChanged && changed.includes('gym')))) {
    const has = S.routines().length > 0;
    if (!has || onboarding || await confirmSheet('Has cambiado tu entrenamiento. ¿Rehago tus rutinas con estas respuestas? (el historial se mantiene)', 'Rehacer rutinas')) {
      const { routines, exSettings } = generateRoutines(gym);
      store.set('routines', [...S.routines().filter(r => !r.generated), ...routines]);
      store.update('exsettings', {}, o => Object.assign(o, exSettings));
    }
  }
  store.set('qdone', 2);
}

// ---------- asistente inicial ----------
export function openWizard() {
  const q = loadQ();
  const ctx = { onboarding: true };
  let i = 0;
  const draw = (el) => {
    const id = ORDER[i], st = STEPS[id];
    el.innerHTML = `
      <div class="wiz-top"><div class="wiz-bar"><div style="width:${((i + 1) / (ORDER.length + 1)) * 100}%"></div></div><span class="muted small">${i + 1}/${ORDER.length}</span></div>
      ${i === 0 ? '<h2>Vamos a personalizar tu plan</h2><p class="muted">Unas preguntas sobre ti, tu alimentación y tu entrenamiento. Lo que no sepas, déjalo: puedes completarlo después en Ajustes.</p>' : ''}
      <h3 class="wiz-title">${st.title}</h3>${st.sub ? `<p class="muted small">${st.sub}</p>` : ''}
      <div class="wiz-body">${st.html(q, ctx)}</div>
      <div class="wiz-nav">${i > 0 ? '<button class="btn ghost" id="wz-back">Atrás</button>' : '<span></span>'}
        <button class="btn primary grow" id="wz-next">${i === ORDER.length - 1 ? 'Ver mi plan' : 'Siguiente'}</button></div>`;
    bindForm(el, q, () => { syncInputs(el, q); draw(el); });
    bindExtra(el, q, () => draw(el));
    on(el, '#wz-back', 'click', () => { syncInputs(el, q); i--; draw(el); el.scrollTop = 0; });
    on(el, '#wz-next', 'click', () => {
      syncInputs(el, q);
      const err = st.validate?.(q, ctx);
      if (err) return toast(err);
      if (i < ORDER.length - 1) { i++; draw(el); el.scrollTop = 0; } else summary(el, q, () => { i = 0; draw(el); });
    });
  };
  sheet('<div id="wiz"></div>', {
    full: true,
    onMount: (el) => {
      el.parentElement.querySelector('.sheet-bg').replaceWith(Object.assign(document.createElement('div'), { className: 'sheet-bg' }));
      draw(el.querySelector('#wiz'));
    },
  });
}

function syncInputs(el, q) {
  el.querySelectorAll('input[data-k]').forEach(i => set(q, i.dataset.k, i.type === 'number' ? (i.value === '' ? null : parseFloat(i.value)) : i.value));
}
// borrar etiquetas de las listas "otros"
function bindExtra(el, q, redraw) {
  on(el, '[data-deltagx]', 'click', b => {
    const box = b.closest('.tags').nextElementSibling.querySelector('[data-path]');
    const path = box.dataset.path;
    const custom = (get(q, path) || []).filter(d => !(path === 'suppNames' ? SUPPS : COMMON_DISLIKES).includes(d));
    const val = custom[+b.dataset.deltagx];
    set(q, path, (get(q, path) || []).filter(x => x !== val));
    redraw();
  });
}

async function summary(el, q, back) {
  const prof = { ...q.profile, activity: N.activityFactor(q.profile, q.gym) };
  const tdee = N.initialTdee(prof, q.weight);
  const t = N.dayTargets(prof, { tdee }, q.weight, '2026-01-07');
  const gen = q.gym.trains ? generateRoutines({ ...q.gym, split: q.gym.split || null }) : null;
  el.innerHTML = `
    <h2>Tu plan${q.profile.name ? ', ' + esc(q.profile.name) : ''}</h2>
    <section class="card">
      <div class="stats3"><div><small>Mantenimiento estimado</small><b>${n0(tdee)}</b></div><div><small>Objetivo diario</small><b>${n0(N.baseTarget(prof, { tdee }, q.weight))}</b></div><div><small>Proteína</small><b>${t.p} g</b></div></div>
      <p class="muted small">${q.profile.goal === 'perder' ? `Para perder un ${r1(q.profile.rate)} % de tu peso por semana.` : q.profile.goal === 'ganar' ? `Para ganar un ${r1(q.profile.rate)} % de tu peso por semana.` : 'Para mantener tu peso.'} Cada semana se ajusta con tu peso real y lo que registras.</p>
    </section>
    ${gen ? `<section class="card"><b>Tus rutinas (${gen.routines.length} días)</b>
      ${gen.routines.map(r => `<p class="small"><b>${esc(r.name)}</b>: ${r.items.length} ejercicios</p>`).join('')}
      <p class="muted small">Podrás editarlas, cambiar ejercicios o crear las tuyas.</p></section>` : ''}
    <button class="btn primary block" id="wz-ok">Empezar</button>
    <button class="btn ghost block" id="wz-edit">Revisar respuestas</button>`;
  on(el, '#wz-edit', 'click', back);
  on(el, '#wz-ok', 'click', async () => {
    await applyQ(q, { onboarding: true });
    document.querySelectorAll('.sheet-wrap').forEach(w => w.remove());
    document.body.classList.remove('noscroll');
    location.hash = '#/hoy';
    rerender();
  });
}

// ---------- editar una sección desde Ajustes ----------
export function editSection(id) {
  const q = loadQ();
  const st = STEPS[id];
  const draw = (el) => {
    el.innerHTML = `<div class="sheet-head"><h3>${st.title}</h3><button class="icon-btn" data-close>✕</button></div>
      ${st.sub ? `<p class="muted small">${st.sub}</p>` : ''}<div class="wiz-body">${st.html(q, {})}</div>
      <button class="btn primary block" id="sec-ok">Guardar</button>`;
    bindForm(el, q, () => { syncInputs(el, q); draw(el); });
    bindExtra(el, q, () => draw(el));
    el.querySelector('[data-close]').addEventListener('click', () => document.querySelector('.sheet-bg')?.click());
    on(el, '#sec-ok', 'click', async () => {
      syncInputs(el, q);
      const err = st.validate?.(q, {});
      if (err) return toast(err);
      await applyQ(q, { changed: [id] });
      document.querySelector('.sheet-bg')?.click();
      toast('Guardado y actualizado');
      rerender();
    });
  };
  sheet('<div id="sec"></div>', { full: true, onMount: (el) => draw(el.querySelector('#sec')) });
}

export const SECTIONS = ORDER.map(id => [id, STEPS[id].title]);
export function sectionSummary(id) {
  const p = S.profile() || {}, s = S.settings(), g = S.gym();
  switch (id) {
    case 'persona': return `${p.age || '?'} años · ${p.height || '?'} cm${p.bodyFat ? ' · ' + r1(p.bodyFat) + ' % grasa' : ''}`;
    case 'actividad': return `${{ sentado: 'Sentado', depie: 'De pie', fisico: 'Físico' }[p.job] || '—'} · ~${n0(p.steps)} pasos · ${p.sportDays || 0} días de deporte`;
    case 'objetivo': return `${{ perder: 'Perder grasa', mantener: 'Mantener', ganar: 'Ganar músculo' }[p.goal]}${p.goal !== 'mantener' ? ' · ' + r1(p.rate) + ' %/sem' : ''}`;
    case 'comida': return `${s.meals.length} comidas · ${DIETS.find(d => d[0] === s.diet)?.[1]}${s.allergens.length ? ' · alergias: ' + s.allergens.length : ''}${s.dislikes.length ? ' · no le gusta: ' + s.dislikes.length : ''}`;
    case 'gym': return g.trains ? `${g.days} días · ${{ gym: 'gimnasio', casa_manc: 'casa', corporal: 'peso corporal' }[g.equipment]} · ${g.experience}` : 'No entrena fuerza';
    case 'habitos': return `${r1(s.waterGoal / 1000)} L · ${n0(s.stepGoal)} pasos · ${s.supplements.length} suplementos`;
    default: return '';
  }
}
