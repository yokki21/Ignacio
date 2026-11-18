// Lógica de nutrición: gasto, objetivo adaptativo, macros, alimentos y generador de menús.
import { FOODS, allowedFood } from './data/foods.js';
import { MEAL_TEMPLATES } from './data/presets.js';

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
// Factor de actividad a partir del cuestionario (trabajo, pasos, gimnasio y otros deportes)
export function activityFactor(profile, gym = {}) {
  const base = { sentado: 1.2, depie: 1.35, fisico: 1.5 }[profile.job] || 1.25;
  const gymDays = gym.trains === false ? 0 : (gym.days || 0);
  const steps = Math.min(0.08, Math.max(0, ((profile.steps || 5000) - 5000) / 1000 * 0.01));
  return Math.round(Math.min(1.9, base + gymDays * 0.03 + (profile.sportDays || 0) * 0.035 + steps) * 100) / 100;
}

export function initialTdee(profile, weight) {
  if (profile.manualTdee) return profile.manualTdee;
  return Math.round(bmr(profile, weight) * profile.activity);
}

// Calorías medias diarias objetivo (antes del reparto semanal)
export function baseTarget(profile, plan, weight) {
  const goal = profile.goal || 'perder';
  const rate = goal === 'mantener' ? 0 : (profile.rate || 0) * (goal === 'ganar' ? -1 : 1);
  const deficit = (rate / 100) * weight * KCAL_PER_KG / 7;
  const target = Math.round(plan.tdee - deficit);
  if (deficit <= 0) return target;
  const floor = Math.max(profile.sex === 'm' ? 1200 : 1500, Math.round(bmr(profile, weight) * 0.95));
  return Math.max(floor, target);
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

function isDisliked(food, dislikes = []) { return dislikes.some(d => d && norm(food.name).includes(norm(d))); }

// Si un grupo se queda vacío por dieta o alergias, se busca en estos
const FALLBACK_GROUPS = { pd: ['pl', 'pm', 'wh', 'leg'], pl: ['pd', 'pm', 'wh', 'leg'], wh: ['pl', 'pd', 'pm'], pw: ['pm', 'leg'], pm: ['leg', 'wh'], cd: ['cm'], cm: ['cd'], lq: [] };

export function canEat(food, opts = {}) {
  if (!allowedFood(food, opts)) return false;
  if (isDisliked(food, opts.dislikes)) return false;
  if (opts.shake === false && food.groups?.includes('wh')) return false;
  return true;
}

export function candidates(groupOrId, opts = {}) {
  const foods = allFoods(opts.custom);
  let group = groupOrId;
  const byId = foods.find(f => f.id === groupOrId);
  if (byId) {
    if (canEat(byId, opts)) return [byId];
    group = byId.groups[0];
  }
  for (const g of [group, ...(FALLBACK_GROUPS[group] || [])]) {
    const all = foods.filter(f => f.groups?.includes(g));
    const regular = all.filter(f => !f.tags?.includes('alt'));
    const okRegular = regular.filter(f => canEat(f, opts));
    // las alternativas (tofu, bebida de soja, pan sin gluten…) solo entran si la dieta o las alergias quitan algo del grupo
    const list = okRegular.length === regular.length ? okRegular : all.filter(f => canEat(f, opts));
    if (list.length) return list;
  }
  return [];
}

const ROLE_KEY = { P: 'p', C: 'c', F: 'f' };
const LIMITS = { P: [30, 400], C: [0, 450], F: [0, 60] };

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

function scoreItems(items, st) {
  const t = sumMacros(items);
  return Math.abs(t.kcal - st.kcal) / Math.max(1, st.kcal) + 0.8 * Math.abs(t.p - st.p) / Math.max(8, st.p);
}

export function buildMeal(slotTargets, style, seedStr, opts = {}) {
  const r = rng(seedStr);
  const templates = MEAL_TEMPLATES[style] || MEAL_TEMPLATES.principal;
  const tpl = pickWeighted(r, templates);
  const swaps = opts.swaps || {};
  // candidatos por parte; para objetivos grandes se prefieren alimentos densos (no 800 g de patata)
  const candList = tpl.parts.map(part => {
    let cands = candidates(part.g, opts);
    if (part.r === 'C') { const dense = cands.filter(f => f.c * 4.5 >= slotTargets.c * 0.9); if (dense.length) cands = dense; }
    if (part.r === 'P') { const dense = cands.filter(f => f.p * 3 >= slotTargets.p * 0.9); if (dense.length) cands = dense; }
    return cands;
  });
  let best = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const parts = tpl.parts.map((part, i) => {
      // variedad: si se puede, no repetir el alimento principal de otra comida del día
      const fresh = (part.r === 'P' || part.r === 'C') && opts.avoid ? candList[i].filter(f => !opts.avoid.has(f.id)) : candList[i];
      const pool = fresh.length ? fresh : candList[i];
      const food = (swaps[i] && findFood(swaps[i], opts.custom)) || (pool.length ? pick(r, pool) : null);
      const g = part.r === 'X' && food ? (part.q <= 5 ? part.q * (food.units?.[0]?.g || 150) : part.q) : 0;
      return { part, food, idx: i, g };
    }).filter(x => x.food);
    const items = solveMeal(parts, slotTargets);
    const score = scoreItems(items, slotTargets);
    if (!best || score < best.score) best = { items, score };
    if (score < 0.07) break;
  }
  return { template: mealTitle(best.items, style) || tpl.name, items: best.items };
}

function solveMeal(parts, slotTargets) {
  let vars = parts.filter(x => x.part.r !== 'X').sort((a, b) => 'PCF'.indexOf(a.part.r) - 'PCF'.indexOf(b.part.r));
  const solve = () => {
    for (let it = 0; it < 8; it++) {
      for (const v of vars) {
        const others = sumMacros(parts.filter(x => x !== v).map(x => macros(x.food, x.g)));
        const rem = { kcal: slotTargets.kcal - others.kcal, p: slotTargets.p - others.p, c: slotTargets.c - others.c, f: slotTargets.f - others.f };
        v.g = solveGrams(v.food, v.part.r, rem, false);
      }
    }
  };
  solve();
  // cantidades testimoniales (5 g de arroz) se quitan y se recalcula el resto
  const tiny = vars.filter(v => v.part.r !== 'P' && (v.g * v.food.kcal / 100 < 35 || v.g < 8));
  if (tiny.length) {
    tiny.forEach(v => { v.g = 0; });
    vars = vars.filter(v => !tiny.includes(v));
    solve();
  }
  const items = [];
  for (const x of parts) {
    const g = x.part.r === 'X' ? x.g : roundGrams(x.food, x.g);
    if (g <= 0) continue;
    items.push({ idx: x.idx, foodId: x.food.id, name: x.food.name, g, role: x.part.r, group: x.part.g, ...macros(x.food, g) });
  }
  return items.sort((a, b) => a.idx - b.idx);
}

const short = (n) => (/^lechuga/i.test(n) ? 'Ensalada' : n.replace(/\s*\(.*?\)/g, '').split(/ \/ |,/)[0].trim());
const low = (n) => short(n).charAt(0).toLowerCase() + short(n).slice(1);
// Nombre del plato a partir de lo que lleva realmente
export function mealTitle(items, style) {
  const P = items.find(i => i.role === 'P'), C = items.find(i => i.role === 'C');
  const veg = items.find(i => i.role === 'X' && ['ve', 'lechuga'].includes(i.group));
  const fruit = items.find(i => i.role === 'X' && i.group === 'fr');
  if (!P && !C) return '';
  if (style === 'batido' && P) return `Batido de ${low(P.name)}${C ? ' + ' + low(C.name) : ''}`;
  let t;
  if (style === 'desayuno' && P && C) t = `${short(C.name)} con ${low(P.name)}`;
  else t = P ? short(P.name) + (C ? ` con ${low(C.name)}` : '') : short(C.name);
  if (veg) t += ` y ${low(veg.name)}`;
  if (fruit) t += ` + ${low(fruit.name)}`;
  return t;
}

export function slotTargetsOf(slot, targets) {
  const k = slot.pct / 100;
  return { kcal: targets.kcal * k, p: targets.p * k, c: targets.c * k, f: targets.f * k };
}

export function buildDayMenu(meals, targets, date, state = {}, opts = {}) {
  const avoid = new Set();
  return meals.map(slot => {
    const st = slotTargetsOf(slot, targets);
    const seed = `${date}|${slot.id}|${state.seeds?.[slot.id] || 0}`;
    const meal = buildMeal(st, slot.style, seed, { ...opts, swaps: state.swaps?.[slot.id], avoid });
    meal.items.filter(i => i.role === 'P' || i.role === 'C').forEach(i => avoid.add(i.foodId));
    return { slot, targets: st, ...meal, totals: sumMacros(meal.items) };
  });
}

// Platos alternativos para una comida, ordenados por lo bien que cuadran con sus macros
export function mealAlternatives(slot, targets, date, opts = {}, { n = 8, exclude = null } = {}) {
  const st = slotTargetsOf(slot, targets);
  const seen = new Set(exclude ? [exclude] : []);
  const out = [];
  for (let seed = 0; seed < 80 && out.length < n * 2; seed++) {
    const meal = buildMeal(st, slot.style, `${date}|${slot.id}|${seed}`, opts);
    const key = meal.items.map(i => i.foodId).sort().join(',');
    if (!meal.items.length || seen.has(key)) continue;
    seen.add(key);
    const t = sumMacros(meal.items);
    const err = Math.abs(t.kcal - st.kcal) / Math.max(1, st.kcal) + Math.abs(t.p - st.p) / Math.max(10, st.p);
    out.push({ seed, ...meal, totals: t, err, key });
  }
  const sorted = out.sort((a, b) => a.err - b.err);
  const good = sorted.filter(a => a.err < 0.3);
  return (good.length >= 3 ? good : sorted).slice(0, n);
}
export const mealKey = (meal) => meal.items.map(i => i.foodId).sort().join(',');

// Alternativas equivalentes para un componente del plato
export function swapOptions(item, opts = {}) {
  const fixed = findFood(item.group, opts.custom);
  const group = fixed ? (fixed.groups[0] || item.group) : item.group;
  // para intercambiar se ofrecen todas las opciones del grupo (también las alternativas) y, si son pocas, las de grupos parecidos
  const foods = allFoods(opts.custom);
  let cands = foods.filter(f => f.groups?.includes(group) && canEat(f, opts));
  for (const g of FALLBACK_GROUPS[group] || []) {
    if (cands.filter(f => f.id !== item.foodId).length >= 4) break;
    cands = [...cands, ...foods.filter(f => f.groups?.includes(g) && canEat(f, opts) && !cands.includes(f))];
  }
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
