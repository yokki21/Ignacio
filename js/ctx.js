// Acceso a los datos de la app y cálculos derivados que comparten todas las vistas.
import * as store from './store.js';
import { DEFAULT_SETTINGS, DEFAULT_PROFILE, DEFAULT_GYM, mealLayout } from './data/presets.js';
import * as N from './nutrition.js';
import * as G from './gym.js';

export { store, N, G };

export const S = {
  profile: () => store.get('profile'),
  settings: () => {
    const s = { ...DEFAULT_SETTINGS, ...store.get('settings', {}) };
    if (!s.meals || !s.meals.length) s.meals = mealLayout(4, s.shake);
    return s;
  },
  gym: () => ({ ...DEFAULT_GYM, ...store.get('gym', {}) }),
  plan: () => store.get('plan'),
  weights: () => store.get('weights', []),
  measures: () => store.get('measures', []),
  foods: () => store.get('foods', []),
  recipes: () => store.get('recipes', []),
  routines: () => store.get('routines', []),
  customEx: () => store.get('exercises', []),
  exSettings: () => store.get('exsettings', {}),
  recent: () => store.get('recent', []),
  workouts: () => store.keys('wk:').map(k => store.get(k)).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date)),
};

export const defaultProfile = () => structuredClone(DEFAULT_PROFILE);

// Preferencias de comida para filtrar menús y avisos
export function prefs() {
  const s = S.settings();
  return { custom: S.foods(), dislikes: s.dislikes, allergens: s.allergens, diet: s.diet, shake: s.shake };
}
// comidas del día con el reparto normalizado a 100 %
export function meals() {
  const ms = S.settings().meals;
  const t = ms.reduce((a, m) => a + (m.pct || 0), 0) || 1;
  return ms.map(m => ({ ...m, pct: (m.pct || 0) * 100 / t }));
}

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
export function dayTotals(date) { return N.sumMacros(getDay(date).entries); }

export function menuFor(date) {
  return N.buildDayMenu(meals(), targetsFor(date), date, getDay(date), prefs());
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
