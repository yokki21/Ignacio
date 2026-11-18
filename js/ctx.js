// Acceso a los datos de la app y cálculos derivados que comparten todas las vistas.
import * as store from './store.js';
import { DEFAULT_SETTINGS, DEFAULT_DAYTYPES, DEFAULT_PROFILE } from './data/presets.js';
import { DEFAULT_ROUTINES } from './data/exercises.js';
import * as N from './nutrition.js';
import * as G from './gym.js';

export { store, N, G };

export const S = {
  profile: () => store.get('profile'),
  settings: () => ({ ...DEFAULT_SETTINGS, ...store.get('settings', {}) }),
  dayTypes: () => store.get('daytypes', DEFAULT_DAYTYPES),
  plan: () => store.get('plan'),
  weights: () => store.get('weights', []),
  measures: () => store.get('measures', []),
  foods: () => store.get('foods', []),
  recipes: () => store.get('recipes', []),
  routines: () => store.get('routines', DEFAULT_ROUTINES),
  customEx: () => store.get('exercises', []),
  exSettings: () => store.get('exsettings', {}),
  recent: () => store.get('recent', []),
  workouts: () => store.keys('wk:').map(k => store.get(k)).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date)),
};

export const defaultProfile = () => structuredClone(DEFAULT_PROFILE);

const EMPTY_DAY = { entries: [], water: 0, steps: null, supps: {}, acts: [], seeds: {}, swaps: {}, eaten: {} };
export function getDay(date) { return { ...structuredClone(EMPTY_DAY), ...store.get('day:' + date, {}) }; }
export function saveDay(date, fn) {
  const d = getDay(date);
  const r = fn(d);
  store.set('day:' + date, r === undefined ? d : r);
}

export function weightNow() {
  const p = S.profile();
  return N.currentWeight(S.weights(), p?.startWeight || 100);
}
export function targetsFor(date) { return N.dayTargets(S.profile(), S.plan(), weightNow(), date); }
export function dayTypeOf(date) {
  const d = store.get('day:' + date);
  const types = S.dayTypes();
  const t = d?.type || S.settings().defaultDayType;
  return types[t] ? t : Object.keys(types)[0];
}
export function dayTotals(date) { return N.sumMacros(getDay(date).entries); }

export function menuFor(date) {
  const types = S.dayTypes();
  const t = dayTypeOf(date);
  const day = getDay(date);
  return N.buildDayMenu(types[t], targetsFor(date), date, day, { custom: S.foods(), dislikes: S.settings().dislikes });
}

export function exercise(id) {
  const base = G.findExercise(id, S.customEx());
  if (!base) return { id, name: id, muscle: 'Otro', kind: 'i', eq: '', repMin: 8, repMax: 12, inc: 2.5, rest: 90 };
  return { ...base, ...(S.exSettings()[id] || {}) };
}

export function addRecent(foodId) {
  store.update('recent', [], r => [foodId, ...r.filter(x => x !== foodId)].slice(0, 25));
}

// kcal de los días con registro válido (para la revisión semanal)
export function loggedKcal() {
  const out = {};
  for (const k of store.keys('day:')) {
    const d = store.get(k);
    if (!d?.entries?.length || d.excluded) continue;
    out[k.slice(4)] = N.sumMacros(d.entries).kcal;
  }
  return out;
}
