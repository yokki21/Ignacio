// Valores iniciales: perfil, plantillas de día y plantillas de platos.

export const DEFAULT_PROFILE = {
  name: 'Joaquín', sex: 'h', age: 24, height: 168, bodyFat: 32.8,
  activity: 1.5, rate: 0.75, weighFreq: 3,
  proteinPerKgLbm: 2.2, fatPct: 28,
  weekendBoost: 15, weekendDays: [6, 0], // sábado y domingo
  manualTdee: null,
};

export const DEFAULT_SETTINGS = {
  waterGoal: 3000, glass: 250, stepGoal: 10000,
  supplements: [{ id: 'creatina', name: 'Creatina 5 g' }, { id: 'whey', name: 'Proteína whey' }],
  dislikes: ['brócoli', 'coliflor', 'puerro', 'apio'],
  targetRir: 2,
  defaultDayType: 'libre',
};

// Tipos de día. pct = reparto de las calorías del día entre comidas (suman 100).
export const DEFAULT_DAYTYPES = {
  libre: { name: 'Libre', slots: [
    { id: 'des', name: 'Desayuno', time: '10:00', pct: 25, style: 'desayuno' },
    { id: 'com', name: 'Comida', time: '14:30', pct: 35, style: 'principal' },
    { id: 'mer', name: 'Merienda', time: '19:00', pct: 12, style: 'batido' },
    { id: 'cen', name: 'Cena', time: '22:00', pct: 28, style: 'principal' },
  ] },
  dia: { name: 'Turno día', slots: [
    { id: 'des', name: 'Desayuno', time: '8:30', pct: 25, style: 'desayuno' },
    { id: 'com', name: 'Comida (tupper)', time: '14:00', pct: 33, style: 'principal', tupper: true },
    { id: 'mer', name: 'Merienda (trabajo)', time: '18:00', pct: 12, style: 'batido', tupper: true },
    { id: 'cen', name: 'Cena', time: '22:45', pct: 30, style: 'principal' },
  ] },
  noche: { name: 'Turno noche', slots: [
    { id: 'com', name: 'Comida', time: '14:00', pct: 30, style: 'principal' },
    { id: 'mer', name: 'Merienda', time: '18:00', pct: 12, style: 'batido' },
    { id: 'cen', name: 'Cena (antes del turno)', time: '21:00', pct: 30, style: 'principal' },
    { id: 'noc', name: 'Tentempié (tupper)', time: '2:30', pct: 18, style: 'snack', tupper: true },
    { id: 'lle', name: 'Al llegar (ligero)', time: '10:30', pct: 10, style: 'ligero' },
  ] },
};

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

// Alimentos que no se usan en el tupper (mejor recién hechos)
export const NOT_TUPPER = ['salmon', 'gambas'];
