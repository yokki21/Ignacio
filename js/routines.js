// Generador de rutinas a partir del cuestionario de gimnasio.
import { EXERCISES, SESSION_TEMPLATES, SPLITS, recommendedSplit } from './data/exercises.js';
import { norm } from './nutrition.js';

const EQUIP = {
  gym: null, // todo
  casa_manc: ['mancuerna', 'peso corporal'],
  corporal: ['peso corporal'],
};
// si no hay ejercicio para un patrón, se usa este otro
const FALLBACK = { pull_v: 'pull_h', push_i: 'push_h', dip: 'triceps', quad: 'squat', ham: 'hinge', chest_iso: 'push_h', pullover: 'pull_h', glute: 'hinge', lunge: 'squat', hinge: 'glute', squat: 'lunge' };
const ORDER = {
  principiante: ['maquina', 'polea', 'mancuerna', 'peso corporal', 'dominadas', 'barra'],
  intermedio: ['barra', 'mancuerna', 'maquina', 'polea', 'dominadas', 'peso corporal'],
  avanzado: ['barra', 'dominadas', 'mancuerna', 'maquina', 'polea', 'peso corporal'],
};
const MAX_EX = { 30: 4, 45: 5, 60: 6, 75: 7, 90: 8 };

export function availableExercises(gym) {
  const eqs = EQUIP[gym.equipment || 'gym'];
  const avoidNames = (gym.avoid || []).map(norm).filter(Boolean);
  return EXERCISES.filter(e => {
    if (eqs && !eqs.includes(e.eq) && !(e.eq === 'dominadas' && gym.pullupBar)) return false;
    if ((gym.injuries || []).some(i => e.avoid.includes(i))) return false;
    if (avoidNames.some(a => norm(e.name).includes(a))) return false;
    return true;
  });
}

function pickFor(pattern, variant, pool, used, order) {
  const list = pool.filter(e => e.pattern === pattern && !used.has(e.id))
    .sort((a, b) => order.indexOf(a.eq) - order.indexOf(b.eq));
  return list[Math.min(variant - 1, list.length - 1)] || null;
}

export function generateRoutines(gym) {
  const days = Math.max(1, Math.min(6, gym.days || 3));
  const splitKey = gym.split && SPLITS[gym.split]?.days[days] ? gym.split : recommendedSplit(days);
  const sessions = SPLITS[splitKey].days[days] || SPLITS.fullbody.days[Math.min(days, 4)];
  const pool = availableExercises(gym);
  const order = ORDER[gym.experience || 'intermedio'];
  const maxEx = MAX_EX[gym.sessionMin || 60] || 6;
  const seen = {};
  const exSettings = {};
  const routines = sessions.map((key, si) => {
    const tpl = SESSION_TEMPLATES[key];
    seen[key] = (seen[key] || 0) + 1;
    const used = new Set();
    const items = [];
    for (const slot of tpl.p) {
      if (items.length >= maxEx) break;
      const [pattern, v] = slot.split(':');
      let ex = pickFor(pattern, +(v || 1), pool, used, order);
      if (!ex && FALLBACK[pattern]) ex = pickFor(FALLBACK[pattern], +(v || 1), pool, used, order);
      if (!ex) continue;
      used.add(ex.id);
      const first = items.length === 0 && ex.kind === 'c';
      const sets = first && gym.experience !== 'principiante' ? 4 : 3;
      items.push({ ex: ex.id, sets });
      if (gym.goal === 'fuerza' && ex.kind === 'c' && ex.eq !== 'peso corporal') exSettings[ex.id] = { repMin: Math.max(3, ex.repMin - 2), repMax: Math.max(ex.repMin + 1, ex.repMax - 3) };
      if (gym.goal === 'salud' && ex.kind === 'c' && ex.repMin < 8) exSettings[ex.id] = { repMin: 8, repMax: 12 };
    }
    return { id: `r-gen-${si}`, name: tpl.name + (seen[key] > 1 ? ` (${seen[key]})` : ''), items, generated: true };
  }).filter(r => r.items.length);
  return { routines, exSettings, split: splitKey };
}
