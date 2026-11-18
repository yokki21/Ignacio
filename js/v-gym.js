// Vistas de gimnasio: rutinas, sesión en curso con temporizador, historial, ejercicios e importación de Hevy.
import { S, G, N, store, exercise } from './ctx.js';
import { esc, r0, r1, n0, fdate, sheet, toast, uid, confirmSheet, lineChart, beep } from './ui.js';
import { rerender, go, on } from './nav.js';

const fmtKg = G.fmtKg;
const session = () => store.get('session');
const saveSession = (s) => store.set('session', s);

export function nextRoutineCard() {
  const s = session();
  if (s) return `<section class="card gymcard"><div><span class="muted small">Entreno en curso</span><b>${esc(s.name)}</b></div><a class="btn primary sm" href="#/gym">Continuar</a></section>`;
  const r = G.nextRoutine(S.routines(), S.workouts());
  if (!r) return '';
  return `<section class="card gymcard"><div><span class="muted small">Siguiente entreno</span><b>${esc(r.name)}</b></div><button class="btn primary sm" data-start-routine="${r.id}">Empezar</button></section>`;
}

export function viewGym(root, params) {
  const [sub, id] = params;
  if (sub === 'rutina') return viewRoutineEditor(root, id);
  if (sub === 'ej') return viewExercise(root, id);
  if (sub === 'w') return viewWorkout(root, id);
  if (sub === 'ejercicios') return viewExerciseList(root);
  if (session()) return viewSession(root);
  viewGymHome(root);
}

// ---------------- inicio gym ----------------
function viewGymHome(root) {
  const routines = S.routines();
  const workouts = S.workouts();
  const next = G.nextRoutine(routines, workouts);
  const vol = G.weeklyVolume(workouts, S.customEx(), new Date(Date.now() - 7 * 864e5).toISOString());
  root.innerHTML = `
    <header class="top"><h1>Gimnasio</h1><span></span></header>
    ${next ? `<section class="card gymcard"><div><span class="muted small">Te toca</span><b>${esc(next.name)}</b></div><button class="btn primary" data-start="${next.id}">Empezar</button></section>` : ''}
    <h2 class="sec">Rutinas</h2>
    <div class="list card">${routines.map(r => `<div class="li"><span><b>${esc(r.name)}</b><small>${r.items.length} ejercicios${r.cardio ? ' · ' + esc(r.cardio) : ''}</small></span>
      <span class="row gap"><a class="btn sm ghost" href="#/gym/rutina/${r.id}">Editar</a><button class="btn sm" data-start="${r.id}">▶</button></span></div>`).join('')}</div>
    <div class="row gap"><a class="btn ghost grow" href="#/gym/rutina/nueva">+ Nueva rutina</a><button class="btn ghost grow" data-start="">Entreno libre</button></div>
    <h2 class="sec">Series esta semana</h2>
    <section class="card">${vol.length ? vol.map(([m, n]) => `<div class="habit"><span>${esc(m)}</span><span class="row gap"><span class="mini-track w"><div style="width:${Math.min(100, n / 20 * 100)}%"></div></span><b>${n}</b></span></div>`).join('') + '<p class="muted small">Referencia orientativa: 10-20 series semanales por músculo.</p>' : '<p class="muted small">Aún no hay entrenos en los últimos 7 días.</p>'}</section>
    <h2 class="sec">Historial</h2>
    <div class="list card">${workouts.slice(0, 25).map(w => {
      const sets = w.exercises.reduce((a, e) => a + G.working(e.sets).length, 0);
      const vol = w.exercises.reduce((a, e) => a + G.working(e.sets).reduce((b, s) => b + s.w * s.r, 0), 0);
      return `<a class="li" href="#/gym/w/${w.id}"><span><b>${esc(w.name)}</b><small class="cap">${fdate(w.date)} · ${sets} series · ${n0(vol)} kg${w.duration ? ' · ' + w.duration + ' min' : ''}</small></span><span class="chev">›</span></a>`;
    }).join('') || '<p class="muted small">Sin entrenos todavía.</p>'}</div>
    <div class="row gap"><a class="btn ghost grow" href="#/gym/ejercicios">Ejercicios y marcas</a><label class="btn ghost grow">Importar de Hevy<input type="file" accept=".csv,text/csv" id="hevy" hidden></label></div>`;
  on(root, '[data-start]', 'click', b => startSession(b.dataset.start));
  on(root, '#hevy', 'change', i => i.files[0] && importHevy(i.files[0]));
}

// ---------------- sesión ----------------
export function startSession(routineId) {
  if (session()) return go('#/gym');
  const r = S.routines().find(x => x.id === routineId);
  const workouts = S.workouts();
  const target = S.settings().targetRir;
  const exercises = (r?.items || []).map(it => newExerciseBlock(it.ex, it.sets, workouts, target));
  saveSession({ id: 'w-' + uid(), routineId: r?.id || null, name: r?.name || 'Entreno libre', start: new Date().toISOString(), exercises, cardio: r?.cardio || '' });
  go('#/gym');
}

function newExerciseBlock(exId, nSets, workouts, targetRir) {
  const ex = exercise(exId);
  const sug = G.suggestion(ex, G.exerciseHistory(exId, workouts), targetRir);
  const sets = Array.from({ length: nSets }, (_, i) => ({ w: sug.w ?? '', r: sug.reps?.[i] ?? sug.r ?? '', rir: targetRir, type: 'n', done: false }));
  return { ex: exId, sets, note: '' };
}

function viewSession(root) {
  const s = session();
  const workouts = S.workouts();
  const target = S.settings().targetRir;
  const mins = Math.round((Date.now() - new Date(s.start)) / 60000);
  root.innerHTML = `
    <header class="top"><div><h1>${esc(s.name)}</h1><p class="muted small">${mins} min${s.cardio ? ' · Al final: ' + esc(s.cardio) : ''}</p></div>
      <button class="btn primary sm" id="fin">Terminar</button></header>
    ${s.exercises.map((b, bi) => {
      const ex = exercise(b.ex);
      const hist = G.exerciseHistory(b.ex, workouts);
      const prev = hist[0]?.sets || [];
      const sug = G.suggestion(ex, hist, target);
      return `<section class="card ex-block" data-b="${bi}">
        <div class="meal-head"><a href="#/gym/ej/${b.ex}"><b>${esc(ex.name)}</b></a><button class="icon-btn" data-exmenu="${bi}">⋯</button></div>
        <p class="small sug sug-${sug.type || 'new'}">${esc(sug.text)} <span class="muted">· ${ex.repMin}-${ex.repMax} reps · RIR ${target}</span></p>
        <table class="sets"><thead><tr><th>#</th><th>Anterior</th><th>kg</th><th>Reps</th><th>RIR</th><th></th></tr></thead><tbody>
        ${b.sets.map((st, si) => `<tr class="${st.done ? 'done' : ''} ${st.type === 'w' ? 'warm' : ''}">
          <td><button class="setno" data-type="${bi}|${si}">${st.type === 'w' ? 'C' : si + 1 - b.sets.slice(0, si).filter(x => x.type === 'w').length}</button></td>
          <td class="muted small">${prev[si] ? `${fmtKg(prev[si].w)}×${prev[si].r}` : '—'}</td>
          <td><input class="input xs" type="number" inputmode="decimal" step="0.25" data-f="w" data-k="${bi}|${si}" value="${st.w}"></td>
          <td><input class="input xs" type="number" inputmode="numeric" data-f="r" data-k="${bi}|${si}" value="${st.r}"></td>
          <td><select class="input xs" data-f="rir" data-k="${bi}|${si}">${[0, 1, 2, 3, 4, 5].map(n => `<option ${+st.rir === n ? 'selected' : ''}>${n}</option>`).join('')}</select></td>
          <td><button class="chk ${st.done ? 'on' : ''}" data-done="${bi}|${si}">✓</button></td></tr>`).join('')}
        </tbody></table>
        <div class="row gap"><button class="btn sm ghost" data-addset="${bi}">+ Serie</button><input class="input grow sm" placeholder="Nota" data-note="${bi}" value="${esc(b.note)}"></div>
      </section>`;
    }).join('')}
    <button class="btn ghost block" id="addex">+ Añadir ejercicio</button>
    <button class="btn danger-ghost block" id="discard">Descartar entreno</button>`;

  const upd = (fn, redraw = false) => { const x = session(); fn(x); saveSession(x); if (redraw) { const y = window.scrollY; viewSession(root); window.scrollTo(0, y); } };
  on(root, '[data-f]', 'change', i => {
    const [bi, si] = i.dataset.k.split('|').map(Number);
    const v = parseFloat(i.value);
    // al poner el peso de una serie, se copia a las siguientes que estén vacías
    const fill = i.dataset.f === 'w' && root.querySelectorAll(`[data-f="w"][data-k^="${bi}|"]`).length > si + 1;
    upd(x => { const sets = x.exercises[bi].sets; sets[si][i.dataset.f] = v; if (i.dataset.f === 'w') sets.slice(si + 1).forEach(st => { if (st.w === '' || st.w == null || isNaN(st.w)) st.w = v; }); }, fill);
  });
  on(root, '[data-note]', 'change', i => upd(x => { x.exercises[+i.dataset.note].note = i.value; }));
  on(root, '[data-done]', 'click', b => {
    const [bi, si] = b.dataset.done.split('|').map(Number);
    upd(x => {
      const st = x.exercises[bi].sets[si];
      st.done = !st.done;
      if (st.done && st.type !== 'w') x.rest = { until: Date.now() + exercise(x.exercises[bi].ex).rest * 1000 };
    }, true);
    tickRest();
  });
  on(root, '[data-type]', 'click', b => { const [bi, si] = b.dataset.type.split('|').map(Number); upd(x => { const st = x.exercises[bi].sets[si]; st.type = st.type === 'w' ? 'n' : 'w'; }, true); });
  on(root, '[data-addset]', 'click', b => upd(x => { const sets = x.exercises[+b.dataset.addset].sets; const l = sets[sets.length - 1] || { w: '', r: '', rir: target }; sets.push({ ...l, type: 'n', done: false }); }, true));
  on(root, '[data-exmenu]', 'click', b => {
    const bi = +b.dataset.exmenu;
    sheet(`<div class="sheet-head"><h3>${esc(exercise(s.exercises[bi].ex).name)}</h3><button class="icon-btn" data-close>✕</button></div>
      <button class="btn ghost block" id="m-up">Subir</button><button class="btn ghost block" id="m-down">Bajar</button>
      <button class="btn ghost block" id="m-rm1">Quitar última serie</button><button class="btn ghost block" id="m-swap">Cambiar por otro ejercicio</button>
      <button class="btn danger-ghost block" id="m-del">Quitar ejercicio</button>`, {
      onMount: (el, close) => {
        const act = (fn) => () => { close(); upd(fn, true); };
        el.querySelector('#m-up').addEventListener('click', act(x => { if (bi > 0) [x.exercises[bi - 1], x.exercises[bi]] = [x.exercises[bi], x.exercises[bi - 1]]; }));
        el.querySelector('#m-down').addEventListener('click', act(x => { if (bi < x.exercises.length - 1) [x.exercises[bi + 1], x.exercises[bi]] = [x.exercises[bi], x.exercises[bi + 1]]; }));
        el.querySelector('#m-rm1').addEventListener('click', act(x => { x.exercises[bi].sets.pop(); }));
        el.querySelector('#m-del').addEventListener('click', act(x => { x.exercises.splice(bi, 1); }));
        el.querySelector('#m-swap').addEventListener('click', () => pickExercise(id => upd(x => { x.exercises[bi] = newExerciseBlock(id, x.exercises[bi].sets.length, S.workouts(), target); }, true)));
      },
    });
  });
  on(root, '#addex', 'click', () => pickExercise(id => upd(x => { x.exercises.push(newExerciseBlock(id, 3, S.workouts(), target)); }, true)));
  on(root, '#discard', 'click', async () => { if (await confirmSheet('¿Descartar el entreno? No se guardará nada.', 'Descartar')) { store.del('session'); rerender(); } });
  on(root, '#fin', 'click', finishSession);
}

async function finishSession() {
  const s = session();
  const exercises = s.exercises.map(b => ({ ...b, sets: b.sets.filter(x => x.done && x.r > 0).map(x => ({ w: +x.w || 0, r: +x.r, rir: +x.rir, type: x.type, done: true })) })).filter(b => b.sets.length);
  if (!exercises.length) {
    if (await confirmSheet('No has marcado ninguna serie. ¿Descartar el entreno?', 'Descartar')) { store.del('session'); rerender(); }
    return;
  }
  const before = S.workouts();
  const prs = [];
  for (const b of exercises) {
    const rec = G.records(b.ex, before);
    const best = Math.max(...G.working(b.sets).map(x => G.e1rm(x.w, x.r)), 0);
    const heavy = Math.max(...G.working(b.sets).map(x => x.w), 0);
    if (rec.best.e1rm && best > rec.best.e1rm) prs.push(`${exercise(b.ex).name}: 1RM estimado ${r1(best)} kg`);
    else if (rec.heaviest.w && heavy > rec.heaviest.w) prs.push(`${exercise(b.ex).name}: máximo peso ${fmtKg(heavy)} kg`);
  }
  const w = { id: s.id, date: s.start, routineId: s.routineId, name: s.name, duration: Math.round((Date.now() - new Date(s.start)) / 60000), exercises, source: 'app' };
  store.set('wk:' + w.id, w);
  store.del('session');
  const sets = exercises.reduce((a, e) => a + G.working(e.sets).length, 0);
  const vol = exercises.reduce((a, e) => a + G.working(e.sets).reduce((b, x) => b + x.w * x.r, 0), 0);
  sheet(`<h2>¡Entreno guardado!</h2><p>${esc(w.name)} · ${w.duration} min · ${sets} series · ${n0(vol)} kg movidos</p>
    ${prs.length ? `<h4>Récords nuevos 🏆</h4><ul>${prs.map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
    <button class="btn primary block" data-close>Cerrar</button>`, { onClose: rerender });
  rerender();
}

// ---------------- temporizador de descanso ----------------
let restTimer = null;
export function tickRest() {
  let bar = document.getElementById('rest-bar');
  const s = session();
  if (!s?.rest) { bar?.remove(); clearInterval(restTimer); restTimer = null; return; }
  if (!bar) {
    bar = document.createElement('div'); bar.id = 'rest-bar';
    bar.innerHTML = `<span>Descanso</span><b id="rest-t"></b><button data-r="-15">−15</button><button data-r="15">+15</button><button data-r="x">Saltar</button>`;
    document.body.appendChild(bar);
    bar.addEventListener('click', e => {
      const v = e.target.dataset?.r; if (!v) return;
      const x = session(); if (!x?.rest) return;
      if (v === 'x') delete x.rest; else x.rest.until += (+v) * 1000;
      saveSession(x); tickRest();
    });
  }
  const left = Math.round((s.rest.until - Date.now()) / 1000);
  if (left <= 0) { const x = session(); delete x.rest; saveSession(x); beep(); toast('¡A por la siguiente serie!'); return tickRest(); }
  bar.querySelector('#rest-t').textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  if (!restTimer) restTimer = setInterval(tickRest, 500);
}
tickRest();

// ---------------- selector de ejercicios ----------------
export function pickExercise(onPick) {
  sheet(`<div class="sheet-head"><h3>Elegir ejercicio</h3><button class="icon-btn" data-close>✕</button></div>
    <input class="input" id="pe-q" placeholder="Buscar por nombre o músculo"><div class="list" id="pe-res"></div>
    <button class="btn ghost block" id="pe-new">+ Crear ejercicio</button>`, {
    full: true,
    onMount: (el, close) => {
      const q = el.querySelector('#pe-q'), res = el.querySelector('#pe-res');
      const draw = () => {
        const n = N.norm(q.value);
        const list = G.allExercises(S.customEx()).filter(e => !n || N.norm(e.name + ' ' + e.muscle).includes(n));
        res.innerHTML = list.map(e => `<button class="li" data-id="${e.id}"><span><b>${esc(e.name)}</b><small>${esc(e.muscle)} · ${esc(e.eq)}</small></span></button>`).join('');
        on(res, '[data-id]', 'click', b => { close(); onPick(b.dataset.id); });
      };
      q.addEventListener('input', draw); draw();
      el.querySelector('#pe-new').addEventListener('click', () => createExercise(onPick));
    },
  });
}

function createExercise(onPick, name = '') {
  sheet(`<div class="sheet-head"><h3>Nuevo ejercicio</h3><button class="icon-btn" data-close>✕</button></div>
    <label class="lbl">Nombre</label><input class="input" id="ce-n" value="${esc(name)}">
    <label class="lbl">Músculo principal</label><input class="input" id="ce-m" list="musc" placeholder="Pecho, Espalda…">
    <datalist id="musc">${[...new Set(G.allExercises().map(e => e.muscle))].map(m => `<option>${esc(m)}</option>`).join('')}</datalist>
    <div class="grid2"><div><label class="lbl">Tipo</label><select class="input" id="ce-k"><option value="c">Compuesto</option><option value="i">Aislamiento</option></select></div>
    <div><label class="lbl">Material</label><select class="input" id="ce-e"><option>barra</option><option>mancuerna</option><option>maquina</option><option>polea</option><option>peso corporal</option></select></div>
    <div><label class="lbl">Reps mín.</label><input class="input" id="ce-a" type="number" value="8"></div><div><label class="lbl">Reps máx.</label><input class="input" id="ce-b" type="number" value="12"></div></div>
    <button class="btn primary block" id="ce-ok">Crear</button>`, {
    onMount: (el, close) => el.querySelector('#ce-ok').addEventListener('click', () => {
      const nm = el.querySelector('#ce-n').value.trim();
      if (!nm) return toast('Pon un nombre');
      const kind = el.querySelector('#ce-k').value, eq = el.querySelector('#ce-e').value;
      const ex = { id: 'cx-' + uid(), name: nm, muscle: el.querySelector('#ce-m').value.trim() || 'Otro', kind, eq,
        repMin: +el.querySelector('#ce-a').value || 8, repMax: +el.querySelector('#ce-b').value || 12, inc: eq === 'mancuerna' ? 2 : 2.5, rest: kind === 'c' ? 150 : 90 };
      store.set('exercises', [...S.customEx(), ex]);
      close(); onPick && onPick(ex.id);
    }),
  });
}

// ---------------- editor de rutinas ----------------
function viewRoutineEditor(root, id) {
  const existing = S.routines().find(r => r.id === id);
  const r = existing ? structuredClone(existing) : { id: 'r-' + uid(), name: '', items: [], cardio: '' };
  const draw = () => {
    root.innerHTML = `
      <header class="top"><a class="icon-btn" href="#/gym">‹</a><h1>${existing ? 'Editar rutina' : 'Nueva rutina'}</h1><span></span></header>
      <label class="lbl">Nombre</label><input class="input" id="rt-n" value="${esc(r.name)}">
      <label class="lbl">Cardio al final (opcional)</label><input class="input" id="rt-c" value="${esc(r.cardio || '')}" placeholder="Ej.: Cinta 20 min">
      <div class="list card">${r.items.map((it, i) => `<div class="li"><span><b>${esc(exercise(it.ex).name)}</b><small>${it.sets} series</small></span>
        <span class="row gap"><button class="icon-btn" data-s="${i}|-1">−</button><button class="icon-btn" data-s="${i}|1">+</button><button class="icon-btn" data-u="${i}">↑</button><button class="icon-btn" data-x="${i}">✕</button></span></div>`).join('') || '<p class="muted small">Añade ejercicios.</p>'}</div>
      <button class="btn ghost block" id="rt-add">+ Ejercicio</button>
      <button class="btn primary block" id="rt-save">Guardar rutina</button>
      ${existing ? '<button class="btn danger-ghost block" id="rt-del">Borrar rutina</button>' : ''}`;
    const keep = () => { r.name = root.querySelector('#rt-n').value; r.cardio = root.querySelector('#rt-c').value; };
    on(root, '[data-s]', 'click', b => { keep(); const [i, d] = b.dataset.s.split('|').map(Number); r.items[i].sets = Math.max(1, r.items[i].sets + d); draw(); });
    on(root, '[data-u]', 'click', b => { keep(); const i = +b.dataset.u; if (i > 0) [r.items[i - 1], r.items[i]] = [r.items[i], r.items[i - 1]]; draw(); });
    on(root, '[data-x]', 'click', b => { keep(); r.items.splice(+b.dataset.x, 1); draw(); });
    on(root, '#rt-add', 'click', () => { keep(); pickExercise(ex => { r.items.push({ ex, sets: 3 }); draw(); }); });
    on(root, '#rt-save', 'click', () => {
      keep();
      if (!r.name.trim() || !r.items.length) return toast('Pon un nombre y algún ejercicio');
      const list = S.routines();
      const i = list.findIndex(x => x.id === r.id);
      if (i >= 0) list[i] = r; else list.push(r);
      store.set('routines', list); toast('Rutina guardada'); go('#/gym');
    });
    on(root, '#rt-del', 'click', async () => { if (await confirmSheet('¿Borrar la rutina?', 'Borrar')) { store.set('routines', S.routines().filter(x => x.id !== r.id)); go('#/gym'); } });
  };
  draw();
}

// ---------------- ejercicios ----------------
function viewExerciseList(root) {
  const workouts = S.workouts();
  const used = new Set(workouts.flatMap(w => w.exercises.map(e => e.ex)));
  const list = G.allExercises(S.customEx()).filter(e => used.has(e.id));
  root.innerHTML = `<header class="top"><a class="icon-btn" href="#/gym">‹</a><h1>Ejercicios</h1><span></span></header>
    <div class="list card">${list.map(e => { const rec = G.records(e.id, workouts); return `<a class="li" href="#/gym/ej/${e.id}"><span><b>${esc(e.name)}</b><small>${esc(e.muscle)} · mejor: ${rec.best.w ? `${fmtKg(rec.best.w)}×${rec.best.r} (1RM est. ${r1(rec.best.e1rm)})` : '—'}</small></span><span class="chev">›</span></a>`; }).join('') || '<p class="muted small">Cuando registres entrenos aparecerán aquí.</p>'}</div>
    <button class="btn ghost block" id="all">Ver toda la biblioteca</button>`;
  on(root, '#all', 'click', () => pickExercise(id => go('#/gym/ej/' + id)));
}

function viewExercise(root, id) {
  const ex = exercise(id);
  const workouts = S.workouts();
  const hist = G.exerciseHistory(id, workouts);
  const rec = G.records(id, workouts);
  const pts = [...hist].reverse().map(h => ({ x: h.date, y: Math.max(...h.sets.map(s => G.e1rm(s.w, s.r))) })).filter(p => p.y > 0);
  root.innerHTML = `<header class="top"><a class="icon-btn" href="javascript:history.back()">‹</a><h1>${esc(ex.name)}</h1><span></span></header>
    <section class="card stats3">
      <div><small>1RM estimado</small><b>${rec.best.e1rm ? r1(rec.best.e1rm) + ' kg' : '—'}</b></div>
      <div><small>Más peso</small><b>${rec.heaviest.w ? fmtKg(rec.heaviest.w) + '×' + rec.heaviest.r : '—'}</b></div>
      <div><small>Sesiones</small><b>${hist.length}</b></div></section>
    <section class="card"><h4>Evolución del 1RM estimado</h4>${lineChart([{ points: pts, color: 'var(--accent)', dots: true }], { unit: 'kg' })}</section>
    <section class="card"><h4>Progresión</h4>
      <div class="grid4"><div><label class="lbl">Reps mín.</label><input class="input" id="x-a" type="number" value="${ex.repMin}"></div><div><label class="lbl">Reps máx.</label><input class="input" id="x-b" type="number" value="${ex.repMax}"></div>
      <div><label class="lbl">Subida kg</label><input class="input" id="x-i" type="number" step="0.25" value="${ex.inc}"></div><div><label class="lbl">Descanso s</label><input class="input" id="x-r" type="number" value="${ex.rest}"></div></div>
      <button class="btn sm" id="x-save">Guardar</button></section>
    <h2 class="sec">Historial</h2>
    <div class="list card">${hist.slice(0, 20).map(h => `<div class="li"><span><b class="cap">${fdate(h.date)}</b><small>${h.sets.map(s => `${fmtKg(s.w)}×${s.r}${s.rir != null ? ' @' + s.rir : ''}`).join(' · ')}</small></span></div>`).join('') || '<p class="muted small">Sin registros.</p>'}</div>`;
  on(root, '#x-save', 'click', () => {
    const v = (s) => parseFloat(root.querySelector(s).value);
    store.update('exsettings', {}, o => { o[id] = { repMin: v('#x-a'), repMax: v('#x-b'), inc: v('#x-i'), rest: v('#x-r') }; });
    toast('Guardado');
  });
}

function viewWorkout(root, id) {
  const w = store.get('wk:' + id);
  if (!w) return go('#/gym');
  root.innerHTML = `<header class="top"><a class="icon-btn" href="#/gym">‹</a><div><h1>${esc(w.name)}</h1><p class="muted small cap">${fdate(w.date)}${w.duration ? ' · ' + w.duration + ' min' : ''}${w.source === 'hevy' ? ' · importado de Hevy' : ''}</p></div><span></span></header>
    ${w.exercises.map(e => `<section class="card"><a href="#/gym/ej/${e.ex}"><b>${esc(exercise(e.ex).name)}</b></a>
      <div class="small">${e.sets.map((s, i) => `<div class="${s.type === 'w' ? 'muted' : ''}">${s.type === 'w' ? 'C' : i + 1}. ${fmtKg(s.w)} kg × ${s.r}${s.rir != null ? ' · RIR ' + r1(s.rir) : ''}</div>`).join('')}</div>
      ${e.note ? `<p class="muted small">${esc(e.note)}</p>` : ''}</section>`).join('')}
    <button class="btn danger-ghost block" id="wdel">Borrar entreno</button>`;
  on(root, '#wdel', 'click', async () => { if (await confirmSheet('¿Borrar este entreno?', 'Borrar')) { store.del('wk:' + id); go('#/gym'); } });
}

// ---------------- importación de Hevy ----------------
async function importHevy(file) {
  let rows;
  try { rows = G.parseCSV(await file.text()); } catch { return toast('No se pudo leer el CSV'); }
  if (!rows.length || !('exercise_title' in rows[0])) return toast('No parece una exportación de Hevy');
  const titles = [...new Set(rows.map(r => r.exercise_title).filter(Boolean))];
  const custom = S.customEx();
  const map = {}; const unmatched = [];
  for (const t of titles) { const m = G.matchExercise(t, custom); if (m) map[t] = m; else unmatched.push(t); }
  const lib = G.allExercises(custom);
  const opts = `<option value="__new">Crear como ejercicio nuevo</option><option value="__skip">No importar</option>` + lib.map(e => `<option value="${e.id}">${esc(e.name)}</option>`).join('');
  sheet(`<div class="sheet-head"><h3>Importar de Hevy</h3><button class="icon-btn" data-close>✕</button></div>
    <p>${rows.length} series de ${titles.length} ejercicios. Reconocidos automáticamente: ${titles.length - unmatched.length}.</p>
    ${unmatched.length ? `<p class="muted small">Empareja los que no he reconocido (así el historial se une a tus rutinas):</p>
      ${unmatched.map((t, i) => `<label class="lbl">${esc(t)}</label><select class="input" data-u="${i}">${opts}</select>`).join('')}` : ''}
    <button class="btn primary block" id="hv-ok">Importar</button>`, {
    full: true,
    onMount: (el, close) => el.querySelector('#hv-ok').addEventListener('click', () => {
      const newEx = [];
      el.querySelectorAll('[data-u]').forEach(s => {
        const t = unmatched[+s.dataset.u];
        if (s.value === '__new') { const ex = { id: 'cx-' + uid(), name: t, hevyName: t, muscle: 'Otro', kind: 'i', eq: '', repMin: 8, repMax: 12, inc: 2.5, rest: 90 }; newEx.push(ex); map[t] = ex.id; }
        else if (s.value !== '__skip') map[t] = s.value;
      });
      if (newEx.length) store.set('exercises', [...custom, ...newEx]);
      const routines = S.routines();
      let n = 0;
      for (const w of G.hevyRowsToWorkouts(rows, map)) {
        if (store.get('wk:' + w.id)) continue;
        const key = (t) => N.norm(t).replace(/[^a-z0-9]/g, '');
        const r = routines.find(x => key(x.name) === key(w.name)) || routines.find(x => key(w.name).includes(key(x.name.split(/[\s/]/)[0])));
        if (r) w.routineId = r.id;
        store.set('wk:' + w.id, w, { silent: true }); n++;
      }
      close(); toast(`${n} entrenos importados`); rerender();
    }),
  });
}
