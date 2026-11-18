// Valores iniciales: perfil, ajustes, gimnasio, comidas del día y plantillas de platos.

export const DEFAULT_PROFILE = {
  name: '', sex: 'h', age: null, height: null, bodyFat: null,
  job: 'sentado', steps: 7000, sportDays: 0,
  goal: 'perder', rate: 0.5, weighFreq: 3,
  proteinPerKgLbm: 2.2, fatPct: 28,
  weekendBoost: 0, weekendDays: [6, 0],
  manualTdee: null, activity: 1.4,
};

export const DEFAULT_SETTINGS = {
  waterGoal: 2500, glass: 250, stepGoal: 8000,
  supplements: [],
  dislikes: [], allergens: [], diet: 'omnivora', shake: true,
  meals: null, // se genera con mealLayout()
  targetRir: 2,
};

export const DEFAULT_GYM = {
  trains: true, days: 3, experience: 'intermedio', equipment: 'gym', pullupBar: false,
  injuries: [], avoid: [], sessionMin: 60, goal: 'hipertrofia', split: null,
};

// Comidas del día según cuántas hace. pct = parte de las calorías del día.
export function mealLayout(n = 4, shake = true) {
  const snack = shake ? 'batido' : 'snack';
  const L = {
    2: [['com', 'Comida', 50, 'principal'], ['cen', 'Cena', 50, 'principal']],
    3: [['des', 'Desayuno', 28, 'desayuno'], ['com', 'Comida', 40, 'principal'], ['cen', 'Cena', 32, 'principal']],
    4: [['des', 'Desayuno', 25, 'desayuno'], ['com', 'Comida', 35, 'principal'], ['mer', 'Merienda', 12, snack], ['cen', 'Cena', 28, 'principal']],
    5: [['des', 'Desayuno', 22, 'desayuno'], ['mm', 'Media mañana', 10, 'snack'], ['com', 'Comida', 32, 'principal'], ['mer', 'Merienda', 12, snack], ['cen', 'Cena', 24, 'principal']],
    6: [['des', 'Desayuno', 20, 'desayuno'], ['mm', 'Media mañana', 10, 'snack'], ['com', 'Comida', 28, 'principal'], ['mer', 'Merienda', 12, snack], ['cen', 'Cena', 22, 'principal'], ['rec', 'Antes de dormir', 8, 'ligero']],
  };
  return (L[n] || L[4]).map(([id, name, pct, style]) => ({ id, name, pct, style }));
}

// Plantillas de platos por estilo de comida.
// Cada componente: { r: rol, g: grupo o id fijo, q: gramos fijos (solo para fijos) }
// Roles: P proteína (se ajusta a la proteína objetivo), C hidrato (se ajusta a hidratos), F grasa (se ajusta a grasa),
//        X fijo (gramos fijos)
export const MEAL_TEMPLATES = {
  desayuno: [
    { name: 'Tostadas con fiambre o atún y AOVE + fruta', parts: [{ r: 'X', g: 'fr', q: 1 }, { r: 'P', g: 'pd' }, { r: 'C', g: 'cd' }, { r: 'F', g: 'aove' }] },
    { name: 'Avena con leche y whey + fruta', parts: [{ r: 'X', g: 'lechesemi', q: 250 }, { r: 'X', g: 'fr', q: 1 }, { r: 'P', g: 'wh' }, { r: 'C', g: 'avena' }, { r: 'F', g: 'fa' }] },
    { name: 'Huevos revueltos con pan + fruta', parts: [{ r: 'X', g: 'fr', q: 1 }, { r: 'P', g: 'huevo' }, { r: 'C', g: 'cd' }] },
    { name: 'Bol de lácteo proteico, avena y frutos secos', parts: [{ r: 'X', g: 'fr', q: 1 }, { r: 'P', g: 'pl' }, { r: 'C', g: 'avena' }, { r: 'F', g: 'fa' }] },
  ],
  principal: [
    { name: 'Plato: proteína + hidrato + verdura', w: 3, parts: [{ r: 'X', g: 've', q: 150 }, { r: 'P', g: 'pm' }, { r: 'C', g: 'cm' }, { r: 'F', g: 'aove' }] },
    { name: 'Plato: proteína + hidrato + ensalada', w: 2, parts: [{ r: 'X', g: 'lechuga', q: 80 }, { r: 'X', g: 'tomate', q: 120 }, { r: 'P', g: 'pm' }, { r: 'C', g: 'cm' }, { r: 'F', g: 'aove' }] },
    { name: 'Wrap de proteína', w: 1, parts: [{ r: 'X', g: 'lechuga', q: 40 }, { r: 'X', g: 'tomate', q: 60 }, { r: 'P', g: 'pw' }, { r: 'C', g: 'wrap' }, { r: 'F', g: 'aguacate' }] },
  ],
  batido: [
    { name: 'Batido de proteína con leche', parts: [{ r: 'P', g: 'wh' }, { r: 'X', g: 'lechesemi', q: 250 }, { r: 'C', g: 'fr' }] },
    { name: 'Batido de proteína + tortitas', parts: [{ r: 'P', g: 'wh' }, { r: 'X', g: 'lechedes', q: 250 }, { r: 'C', g: 'tortitas' }, { r: 'F', g: 'crcacahuete' }] },
  ],
  snack: [
    { name: 'Bocadillo de fiambre o atún', parts: [{ r: 'P', g: 'pd' }, { r: 'C', g: 'pan' }, { r: 'F', g: 'aove' }] },
    { name: 'Lácteo proteico + fruta + frutos secos', parts: [{ r: 'P', g: 'pl' }, { r: 'C', g: 'fr' }, { r: 'F', g: 'fa' }] },
    { name: 'Wrap de pollo', parts: [{ r: 'X', g: 'lechuga', q: 30 }, { r: 'P', g: 'pollo' }, { r: 'C', g: 'wrap' }, { r: 'F', g: 'aguacate' }] },
  ],
  ligero: [
    { name: 'Lácteo proteico + fruta', parts: [{ r: 'P', g: 'pl' }, { r: 'C', g: 'fr' }] },
    { name: 'Tostada con fiambre', parts: [{ r: 'P', g: 'pd' }, { r: 'C', g: 'cd' }] },
  ],
};
