// Lógica de nutrición: gasto, objetivo adaptativo, macros, alimentos y generador de menús.
import { FOODS } from './data/foods.js';
import { MEAL_TEMPLATES, NOT_TUPPER } from './data/presets.js';

export const KCAL_PER_KG = 7700;

// ---------- utilidades de fecha ----------
export const iso = (d = new Date()) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};
export const addDays = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
export const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
export const dow = (s) => new Date(s + 'T12:00:00').getDay();

// ---------- alimentos ----------
export function allFoods(custom = []) { return [...custom, ...FOODS]; }
export function findFood(id, custom = []) { return custom.find(f => f.id === id) || FOODS.find(f => f.id === id) || null; }
export function macros(food, g) {
  const k = g / 100;
  return { kcal: food.kcal * k, p: food.p * k, c: food.c * k, f: food.f * k };
}
export function sumMacros(list) {
  return list.reduce((a, x) => ({ kcal: a.kcal + (x.kcal || 0), p: a.p + (x.p || 0), c: a.c + (x.c || 0), f: a.f + (x.f || 0) }), { kcal: 0, p: 0, c: 0, f: 0 });
}
export const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export function searchFoods(q, custom = [], recipes = []) {
  const n = norm(q.trim());
  const foods = allFoods(custom);
  if (!n) return foods.slice(0, 40);
  const words = n.split(/\s+/);
  const match = (name) => words.every(w => norm(name).includes(w));
  return [
    ...recipes.filter(r => match(r.name)).map(r => ({ ...r, isRecipe: true })),
    ...foods.filter(f => match(f.name) || (f.brand && match(f.brand))),
  ].slice(0, 60);
}
export function recipeMacros(recipe, custom = []) {
  const tot = sumMacros(recipe.items.map(it => { const f = findFood(it.foodId, custom); return f ? macros(f, it.g) : {}; }));
  const s = recipe.servings || 1;
  return { kcal: tot.kcal / s, p: tot.p / s, c: tot.c / s, f: tot.f / s, totalG: recipe.items.reduce((a, i) => a + i.g, 0) / s };
}

// ---------- peso: tendencia ----------
// Media exponencial ajustada al tiempo entre pesajes (equivale a un 10 % diario).
export function trendSeries(weights) {
  const ws = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const out = [];
  let trend = null, last = null;
  for (const w of ws) {
    if (trend === null) trend = w.kg;
    else {
      const dt = Math.max(1, daysBetween(last, w.date));
      const a = 1 - Math.pow(0.9, dt);
      trend = trend + a * (w.kg - trend);
    }
    last = w.date;
    out.push({ date: w.date, kg: w.kg, trend });
  }
  return out;
}
export function trendAt(series, date) {
  let v = null;
  for (const s of series) { if (s.date <= date) v = s.trend; else break; }
  return v;
}
export function currentWeight(weights, fallback) {
  const s = trendSeries(weights);
  return s.length ? s[s.length - 1].trend : fallback;
}

// ---------- gasto energético ----------
export function leanMass(profile, weight) {
  if (profile.bodyFat) {
    const refW = profile.bfWeight || weight;
    const lbm = refW * (1 - profile.bodyFat / 100);
    return Math.min(lbm, weight * 0.95);
  }
  return null;
}
export function bmr(profile, weight) {
  const lbm = leanMass(profile, weight);
  if (lbm) return 370 + 21.6 * lbm; // Katch-McArdle
  const s = profile.sex === 'm' ? -161 : 5; // Mifflin-St Jeor
  return 10 * weight + 6.25 * profile.height - 5 * profile.age + s;
}
export function initialTdee(profile, weight) {
  if (profile.manualTdee) return profile.manualTdee;
  return Math.round(bmr(profile, weight) * profile.activity);
}

// Calorías medias diarias objetivo (antes del reparto semanal)
export function baseTarget(profile, plan, weight) {
  const deficit = (profile.rate / 100) * weight * KCAL_PER_KG / 7;
  const floor = Math.max(1500, Math.round(bmr(profile, weight) * 0.95));
  return Math.max(floor, Math.round(plan.tdee - deficit));
}

export function dayTargets(profile, plan, weight, date) {
  const base = baseTarget(profile, plan, weight);
  const wd = profile.weekendDays || [];
  const n = wd.length, b = (profile.weekendBoost || 0) / 100;
  let kcal = base;
  if (n > 0 && n < 7 && b) kcal = wd.includes(dow(date)) ? base * (1 + b) : base * (1 - (n * b) / (7 - n));
  kcal = Math.round(kcal / 5) * 5;
  const lbm = leanMass(profile, weight);
  const refW = lbm ? null : Math.min(weight, 25 * (profile.height / 100) ** 2);
  let p = profile.proteinOverride || Math.round(lbm ? profile.proteinPerKgLbm * lbm : 2 * refW);
  let f = Math.round((kcal * (profile.fatPct / 100)) / 9);
  let c = Math.round((kcal - 4 * p - 9 * f) / 4);
  if (c < 50) { c = 50; f = Math.max(30, Math.round((kcal - 4 * p - 4 * c) / 9)); }
  return { kcal, p, c, f, base };
}

// ---------- revisión semanal (ajuste adaptativo) ----------
// dayKcal: { 'YYYY-MM-DD': kcal registradas } (días con registro). El ritmo de cambio de peso se calcula
// con una regresión lineal de los pesajes de la ventana: no arrastra el retraso de la media móvil.
export function weeklyCheckIn({ weights, dayKcal, prevTdee, today, windowDays = 21 }) {
  const end = addDays(today, -1);
  const start = addDays(end, -(windowDays - 1));
  const inWindow = weights.filter(w => w.date >= start && w.date <= end).sort((x, y) => x.date.localeCompare(y.date));
  const logged = Object.entries(dayKcal).filter(([d, k]) => d >= start && d <= end && k >= 800);
  const reasons = [];
  if (inWindow.length < 4) reasons.push(`pocos pesajes (${inWindow.length}; hacen falta 4)`);
  if (logged.length < 10) reasons.push(`pocos días registrados (${logged.length}; hacen falta 10)`);
  if (inWindow.length >= 2 && daysBetween(inWindow[0].date, inWindow[inWindow.length - 1].date) < 10) reasons.push('menos de 10 días entre el primer y el último pesaje');
  if (reasons.length) return { ok: false, reasons, start, end };
  const xs = inWindow.map(w => daysBetween(start, w.date)), ys = inWindow.map(w => w.kg);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0, den = 0;
  xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); den += (x - mx) ** 2; });
  const slope = num / den; // kg por día
  const avgIntake = logged.reduce((a, [, k]) => a + k, 0) / logged.length;
  const observed = avgIntake - slope * KCAL_PER_KG;
  let next = prevTdee + 0.5 * (observed - prevTdee);
  next = Math.max(prevTdee - 250, Math.min(prevTdee + 250, next));
  return {
    ok: true, start, end, avgIntake: Math.round(avgIntake), weeklyRate: slope * 7,
    observed: Math.round(observed), tdee: Math.round(next), loggedDays: logged.length, weighIns: inWindow.length,
  };
}

// ---------- generador de menús ----------
function hash(str) { let h = 1779033703 ^ str.length; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return h >>> 0; }
export function rng(seedStr) {
  let a = hash(seedStr);
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

function isDisliked(food, dislikes) { return dislikes.some(d => d && norm(food.name).includes(norm(d))); }

export function candidates(groupOrId, { custom = [], dislikes = [], tupper = false } = {}) {
  const foods = allFoods(custom);
  const byId = foods.find(f => f.id === groupOrId);
  if (byId) return [byId];
  return foods.filter(f => f.groups?.includes(groupOrId) && !isDisliked(f, dislikes) && !(tupper && NOT_TUPPER.includes(f.id)));
}

const ROLE_KEY = { P: 'p', C: 'c', F: 'f' };
const LIMITS = { P: [30, 350], C: [0, 400], F: [0, 50] };

export function roundGrams(food, g) {
  const u = food.units?.[0];
  if (u && ['huevo', 'wrap', 'tortitas', 'clara'].includes(food.id)) return Math.max(u.g, Math.round(g / u.g) * u.g);
  if (food.id === 'aove') return Math.max(0, Math.round(g / 5) * 5);
  return Math.max(0, Math.round(g / 5) * 5);
}

function solveGrams(food, role, remaining, round = true) {
  const key = ROLE_KEY[role];
  const per = food[key] / 100;
  if (per <= 0) return 0;
  let g = remaining[key] / per;
  let [lo, hi] = LIMITS[role];
  if (food.groups?.includes('wh')) { lo = 15; hi = 60; }
  if (food.groups?.includes('fr') && role === 'C') { lo = 80; hi = 300; }
  if (role === 'C' && ['pan', 'panint', 'panmolde', 'avena'].includes(food.id)) hi = 150;
  g = Math.min(hi, Math.max(lo, g));
  return round ? roundGrams(food, g) : g;
}

// Genera un plato para una comida.
// Los gramos de proteína, hidrato y grasa se resuelven a la vez (cada alimento aporta de todo),
// iterando hasta que el plato cuadra con los macros de esa comida.
function pickWeighted(r, templates) {
  const total = templates.reduce((a, t) => a + (t.w || 1), 0);
  let x = r() * total;
  for (const t of templates) { x -= (t.w || 1); if (x <= 0) return t; }
  return templates[templates.length - 1];
}

export function buildMeal(slotTargets, style, seedStr, opts = {}) {
  const r = rng(seedStr);
  const templates = MEAL_TEMPLATES[style] || MEAL_TEMPLATES.principal;
  const tpl = pickWeighted(r, templates);
  const swaps = opts.swaps || {};
  const parts = tpl.parts.map((part, i) => {
    const cands = candidates(part.g, opts);
    const swapId = swaps[i];
    const food = (swapId && findFood(swapId, opts.custom)) || pick(r, cands.length ? cands : candidates(part.g, { custom: opts.custom }));
    const g = part.r === 'X' && food ? (part.q <= 5 ? part.q * (food.units?.[0]?.g || 150) : part.q) : 0;
    return { part, food, idx: i, g };
  }).filter(x => x.food);
  const vars = parts.filter(x => x.part.r !== 'X').sort((a, b) => 'PCF'.indexOf(a.part.r) - 'PCF'.indexOf(b.part.r));
  for (let it = 0; it < 6; it++) {
    for (const v of vars) {
      const others = sumMacros(parts.filter(x => x !== v).map(x => macros(x.food, x.g)));
      const rem = { kcal: slotTargets.kcal - others.kcal, p: slotTargets.p - others.p, c: slotTargets.c - others.c, f: slotTargets.f - others.f };
      v.g = solveGrams(v.food, v.part.r, rem, false);
    }
  }
  const items = [];
  for (const x of parts) {
    const g = x.part.r === 'X' ? x.g : roundGrams(x.food, x.g);
    if (g <= 0 || (x.part.r === 'F' && g < 3)) continue;
    items.push({ idx: x.idx, foodId: x.food.id, name: x.food.name, g, role: x.part.r, group: x.part.g, ...macros(x.food, g) });
  }
  items.sort((a, b) => a.idx - b.idx);
  return { template: tpl.name, items };
}

export function buildDayMenu(dayTypeDef, targets, date, state = {}, opts = {}) {
  return dayTypeDef.slots.map(slot => {
    const st = { kcal: targets.kcal * slot.pct / 100, p: targets.p * slot.pct / 100, c: targets.c * slot.pct / 100, f: targets.f * slot.pct / 100 };
    const seed = `${date}|${slot.id}|${state.seeds?.[slot.id] || 0}`;
    const meal = buildMeal(st, slot.style, seed, { ...opts, tupper: !!slot.tupper, swaps: state.swaps?.[slot.id] });
    return { slot, targets: st, ...meal, totals: sumMacros(meal.items) };
  });
}

// Alternativas equivalentes para un componente del plato
export function swapOptions(item, opts = {}) {
  const fixed = findFood(item.group, opts.custom);
  const cands = candidates(fixed ? (fixed.groups[0] || item.group) : item.group, opts);
  const key = ROLE_KEY[item.role];
  const base = key ? item[key] : item.kcal;
  return cands.filter(f => f.id !== item.foodId).map(f => {
    const per = key ? f[key] / 100 : f.kcal / 100;
    if (per <= 0) return null;
    // los fijos (verdura, fruta, leche) se cambian por la misma cantidad
    const g = item.role === 'X' ? (f.groups.includes('fr') && f.units[0] ? f.units[0].g : item.g) : roundGrams(f, base / per);
    const m = macros(f, g);
    return { food: f, g, ...m, diff: m.kcal - item.kcal };
  }).filter(Boolean).sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff));
}
