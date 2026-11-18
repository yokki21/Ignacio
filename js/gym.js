// Lógica de gimnasio: ejercicios, historial, sobrecarga progresiva, récords e importación de Hevy.
import { EXERCISES } from './data/exercises.js';
import { norm } from './nutrition.js';

export function allExercises(custom = []) { return [...EXERCISES, ...custom]; }
export function findExercise(id, custom = []) { return EXERCISES.find(e => e.id === id) || custom.find(e => e.id === id) || null; }

export const e1rm = (w, r) => (r > 0 && w > 0 ? w * (1 + Math.min(r, 12) / 30) : 0);
export const working = (sets) => sets.filter(s => s.type !== 'w' && s.done !== false && s.r > 0);

// Sesiones de un ejercicio, de más reciente a más antigua
export function exerciseHistory(exId, workouts) {
  return workouts
    .filter(w => w.exercises.some(e => e.ex === exId))
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(w => ({ date: w.date, workoutId: w.id, sets: working(w.exercises.find(e => e.ex === exId).sets) }))
    .filter(s => s.sets.length);
}

export function records(exId, workouts) {
  let best = { e1rm: 0 }, heaviest = { w: 0 }, volume = { v: 0 };
  for (const s of exerciseHistory(exId, workouts)) {
    let vol = 0;
    for (const set of s.sets) {
      const e = e1rm(set.w, set.r);
      if (e > best.e1rm) best = { e1rm: e, w: set.w, r: set.r, date: s.date };
      if (set.w > heaviest.w) heaviest = { w: set.w, r: set.r, date: s.date };
      vol += set.w * set.r;
    }
    if (vol > volume.v) volume = { v: vol, date: s.date };
  }
  return { best, heaviest, volume };
}

// Doble progresión con RIR objetivo:
//  - todas las series en el tope del rango y RIR >= objetivo-0,5 → subir peso, volver al mínimo de reps
//  - todas dentro del rango → mismo peso, +1 rep
//  - alguna por debajo del mínimo → mantener; si pasa dos sesiones seguidas → bajar ~7,5 %
export function suggestion(ex, history, targetRir = 2) {
  if (!history.length) return { text: `Elige un peso con el que hagas ${ex.repMin}-${ex.repMax} reps dejando ${targetRir} en recámara`, w: null, r: ex.repMin };
  const last = history[0].sets;
  const topW = Math.max(...last.map(s => s.w));
  const top = last.filter(s => s.w === topW);
  const rirs = top.map(s => (s.rir ?? targetRir));
  const avgRir = rirs.reduce((a, b) => a + b, 0) / rirs.length;
  const allTop = top.every(s => s.r >= ex.repMax);
  const anyLow = top.some(s => s.r < ex.repMin);
  const round = (w) => Math.round(w / (ex.inc || 2.5)) * (ex.inc || 2.5);
  if (allTop && avgRir >= targetRir - 0.5) {
    const w = topW + ex.inc;
    return { w, r: ex.repMin, type: 'up', text: `Sube a ${fmtKg(w)} kg × ${ex.repMin}-${ex.repMax}` };
  }
  if (allTop) return { w: topW, r: ex.repMax, type: 'hold', text: `Mantén ${fmtKg(topW)} kg; llegaste al tope pero muy cerca del fallo` };
  if (anyLow) {
    const prev = history[1]?.sets;
    const prevLow = prev && prev.some(s => s.w === topW && s.r < ex.repMin);
    if (prevLow) { const w = round(topW * 0.925); return { w, r: ex.repMin + 1, type: 'down', text: `Baja a ${fmtKg(w)} kg y vuelve a construir` }; }
    return { w: topW, r: ex.repMin, type: 'hold', text: `Mantén ${fmtKg(topW)} kg y busca llegar a ${ex.repMin} reps` };
  }
  const reps = top.map(s => Math.min(ex.repMax, s.r + 1));
  return { w: topW, r: reps[0], reps, type: 'reps', text: `${fmtKg(topW)} kg: intenta +1 rep por serie (${reps.join(', ')})` };
}

export const fmtKg = (w) => (Math.round(w * 100) / 100).toString().replace('.', ',');

// Rutina que toca: la que hace más tiempo que no se hace (respetando el orden)
export function nextRoutine(routines, workouts) {
  let best = null, bestDate = null;
  for (const r of routines) {
    const last = workouts.filter(w => w.routineId === r.id).map(w => w.date).sort().pop() || '';
    if (best === null || last < bestDate) { best = r; bestDate = last; }
  }
  return best;
}

export function weeklyVolume(workouts, custom, sinceIso) {
  const out = {};
  for (const w of workouts.filter(w => w.date >= sinceIso)) {
    for (const e of w.exercises) {
      const ex = findExercise(e.ex, custom);
      const m = ex?.muscle || 'Otro';
      out[m] = (out[m] || 0) + working(e.sets).length;
    }
  }
  return Object.entries(out).sort((a, b) => b[1] - a[1]);
}

// ---------- Importación de Hevy (CSV) ----------
export function parseCSV(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const header = rows.shift().map(h => h.trim().replace(/^﻿/, ''));
  return rows.filter(r => r.length > 1).map(r => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

const MONTHS = { jan: 0, ene: 0, feb: 1, mar: 2, apr: 3, abr: 3, may: 4, jun: 5, jul: 6, aug: 7, ago: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11, dic: 11 };
export function parseHevyDate(s) {
  if (!s) return null;
  const m = s.match(/(\d{1,2})\s+([A-Za-zé]{3,4})\.?\s+(\d{4}),?\s+(\d{1,2}):(\d{2})/);
  if (m) {
    const mon = MONTHS[norm(m[2]).slice(0, 3)];
    if (mon !== undefined) return new Date(+m[3], mon, +m[1], +m[4], +m[5]);
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

// Alias de nombres de Hevy (inglés y español) → id de la biblioteca
const ALIASES = {
  'bench press (barbell)': 'press-banca', 'press de banca (barra)': 'press-banca', 'press banca (barra)': 'press-banca',
  'incline bench press (dumbbell)': 'press-inclinado-manc', 'press inclinado (mancuerna)': 'press-inclinado-manc', 'press de banca inclinado (mancuerna)': 'press-inclinado-manc',
  'incline bench press (barbell)': 'press-inclinado-barra', 'press de banca inclinado (barra)': 'press-inclinado-barra',
  'bench press (dumbbell)': 'press-banca-manc', 'press de banca (mancuerna)': 'press-banca-manc',
  'chest press (machine)': 'press-pecho-maq', 'press de pecho (maquina)': 'press-pecho-maq',
  'butterfly (pec deck)': 'peck-deck', 'chest fly (machine)': 'peck-deck', 'aperturas (maquina)': 'peck-deck',
  'cable crossover': 'cruce-poleas', 'cruce de poleas': 'cruce-poleas', 'chest dip': 'fondos', 'fondos': 'fondos',
  'lat pulldown (cable)': 'jalon-pecho', 'jalon al pecho (polea)': 'jalon-pecho', 'jalon al pecho': 'jalon-pecho',
  'pull up': 'dominadas', 'dominadas': 'dominadas', 'bent over row (barbell)': 'remo-barra', 'remo inclinado (barra)': 'remo-barra', 'remo con barra': 'remo-barra',
  'seated cable row - v grip (cable)': 'remo-polea', 'seated row (cable)': 'remo-polea', 'remo sentado (polea)': 'remo-polea',
  'dumbbell row': 'remo-manc', 'remo con mancuerna': 'remo-manc', 'seated row (machine)': 'remo-maq', 'remo sentado (maquina)': 'remo-maq',
  'romanian deadlift (barbell)': 'peso-muerto-rumano', 'peso muerto rumano (barra)': 'peso-muerto-rumano',
  'overhead press (dumbbell)': 'press-militar-manc', 'shoulder press (dumbbell)': 'press-militar-manc', 'press militar (mancuerna)': 'press-militar-manc', 'press de hombros (mancuerna)': 'press-militar-manc',
  'overhead press (barbell)': 'press-militar-barra', 'press militar (barra)': 'press-militar-barra',
  'shoulder press (machine)': 'press-hombro-maq', 'press de hombros (maquina)': 'press-hombro-maq',
  'lateral raise (dumbbell)': 'elev-laterales', 'elevacion lateral (mancuerna)': 'elev-laterales', 'elevaciones laterales (mancuerna)': 'elev-laterales',
  'lateral raise (cable)': 'elev-laterales-polea', 'elevacion lateral (polea)': 'elev-laterales-polea',
  'face pull': 'face-pull', 'face pull (cable)': 'face-pull', 'rear delt reverse fly (machine)': 'pajaros-maq', 'aperturas invertidas (maquina)': 'pajaros-maq',
  'shrug (dumbbell)': 'encogimientos', 'encogimiento de hombros (mancuerna)': 'encogimientos',
  'bicep curl (barbell)': 'curl-barra', 'curl de biceps (barra)': 'curl-barra', 'bicep curl (dumbbell)': 'curl-manc', 'curl de biceps (mancuerna)': 'curl-manc',
  'hammer curl (dumbbell)': 'curl-martillo', 'curl martillo (mancuerna)': 'curl-martillo', 'preacher curl (machine)': 'curl-predicador', 'preacher curl (barbell)': 'curl-predicador', 'curl predicador (maquina)': 'curl-predicador',
  'incline curl (dumbbell)': 'curl-inclinado', 'curl inclinado (mancuerna)': 'curl-inclinado', 'bicep curl (cable)': 'curl-polea', 'curl de biceps (polea)': 'curl-polea',
  'skullcrusher (barbell)': 'press-frances', 'press frances (barra)': 'press-frances', 'triceps pushdown': 'ext-triceps-polea', 'extension de triceps (polea)': 'ext-triceps-polea',
  'triceps rope pushdown': 'ext-triceps-cuerda', 'extension de triceps con cuerda': 'ext-triceps-cuerda', 'overhead triceps extension (cable)': 'ext-triceps-overhead', 'extension de triceps sobre la cabeza (polea)': 'ext-triceps-overhead',
  'squat (barbell)': 'sentadilla', 'sentadilla (barra)': 'sentadilla', 'leg press (machine)': 'prensa', 'leg press': 'prensa', 'prensa de piernas (maquina)': 'prensa', 'prensa de piernas': 'prensa',
  'hack squat (machine)': 'hack', 'sentadilla hack (maquina)': 'hack', 'bulgarian split squat': 'bulgara', 'sentadilla bulgara': 'bulgara',
  'leg extension (machine)': 'ext-cuadriceps', 'extension de piernas (maquina)': 'ext-cuadriceps', 'extension de cuadriceps (maquina)': 'ext-cuadriceps',
  'seated leg curl (machine)': 'curl-femoral', 'lying leg curl (machine)': 'curl-femoral', 'curl femoral sentado (maquina)': 'curl-femoral', 'curl femoral tumbado (maquina)': 'curl-femoral',
  'hip thrust (barbell)': 'hip-thrust', 'hip adduction (machine)': 'aductor', 'aductor (maquina)': 'aductor', 'hip abduction (machine)': 'abductor', 'abductor (maquina)': 'abductor',
  'calf press (machine)': 'gemelos-prensa', 'gemelos en prensa (maquina)': 'gemelos-prensa', 'standing calf raise (machine)': 'gemelos-pie', 'elevacion de gemelos de pie (maquina)': 'gemelos-pie',
  'cable crunch': 'crunch-polea', 'crunch en polea': 'crunch-polea', 'hanging leg raise': 'elev-piernas', 'elevacion de piernas colgado': 'elev-piernas',
  'crunch (machine)': 'crunch-maq', 'ab wheel': 'rueda', 'rueda abdominal': 'rueda', 'plank': 'plancha', 'plancha': 'plancha',
};

export function matchExercise(title, custom = []) {
  const n = norm(title.trim());
  if (ALIASES[n]) return ALIASES[n];
  const all = allExercises(custom);
  const exact = all.find(e => norm(e.name) === n || norm(e.hevyName || '') === n);
  return exact ? exact.id : null;
}

// Agrupa filas del CSV en entrenos. map: { 'Título Hevy': exId }
export function hevyRowsToWorkouts(rows, map) {
  const byKey = new Map();
  for (const row of rows) {
    const key = `${row.start_time}|${row.title}`;
    if (!byKey.has(key)) {
      const start = parseHevyDate(row.start_time), end = parseHevyDate(row.end_time);
      if (!start) continue;
      byKey.set(key, {
        id: 'hevy-' + start.getTime(), date: start.toISOString(), name: row.title || 'Entreno', routineId: null,
        duration: end ? Math.round((end - start) / 60000) : null, source: 'hevy', exercises: [],
      });
    }
    const w = byKey.get(key);
    const exId = map[row.exercise_title];
    if (!exId) continue;
    let ex = w.exercises.find(e => e.ex === exId);
    if (!ex) { ex = { ex: exId, sets: [], note: row.exercise_notes || '' }; w.exercises.push(ex); }
    const kg = row.weight_kg !== undefined && row.weight_kg !== '' ? parseFloat(row.weight_kg) : (row.weight_lbs ? parseFloat(row.weight_lbs) * 0.4536 : 0);
    const rpe = parseFloat(row.rpe);
    ex.sets.push({
      w: Math.round((kg || 0) * 100) / 100, r: parseInt(row.reps, 10) || 0,
      rir: isNaN(rpe) ? null : Math.max(0, 10 - rpe), type: row.set_type === 'warmup' ? 'w' : 'n', done: true,
    });
  }
  return [...byKey.values()].filter(w => w.exercises.length);
}
