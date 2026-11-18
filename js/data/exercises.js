// Biblioteca de ejercicios.
// [id, nombre, músculo, tipo (c compuesto / i aislamiento), material, repMin, repMax, patrón, lesiones a evitar]
// Material: barra, mancuerna, maquina, polea, peso corporal, dominadas (necesita barra de dominadas)
const RAW = [
  // Pecho
  ['press-banca', 'Press de banca con barra', 'Pecho', 'c', 'barra', 6, 10, 'push_h', ''],
  ['press-banca-manc', 'Press de banca con mancuernas', 'Pecho', 'c', 'mancuerna', 8, 12, 'push_h', ''],
  ['press-pecho-maq', 'Press de pecho en máquina', 'Pecho', 'c', 'maquina', 8, 12, 'push_h', ''],
  ['flexiones', 'Flexiones', 'Pecho', 'c', 'peso corporal', 8, 20, 'push_h', 'muneca'],
  ['press-inclinado-barra', 'Press inclinado con barra', 'Pecho', 'c', 'barra', 6, 10, 'push_i', 'hombro'],
  ['press-inclinado-manc', 'Press inclinado con mancuernas', 'Pecho', 'c', 'mancuerna', 8, 12, 'push_i', ''],
  ['flexiones-declinadas', 'Flexiones con pies elevados', 'Pecho', 'c', 'peso corporal', 8, 20, 'push_i', 'muneca hombro'],
  ['peck-deck', 'Aperturas en máquina (peck deck)', 'Pecho', 'i', 'maquina', 10, 15, 'chest_iso', ''],
  ['cruce-poleas', 'Cruce de poleas', 'Pecho', 'i', 'polea', 12, 15, 'chest_iso', ''],
  ['aperturas-manc', 'Aperturas con mancuernas', 'Pecho', 'i', 'mancuerna', 10, 15, 'chest_iso', 'hombro'],
  ['fondos', 'Fondos en paralelas', 'Pecho', 'c', 'peso corporal', 6, 12, 'dip', 'hombro'],
  // Espalda
  ['jalon-pecho', 'Jalón al pecho', 'Espalda', 'c', 'polea', 8, 12, 'pull_v', ''],
  ['dominadas', 'Dominadas', 'Espalda', 'c', 'dominadas', 4, 10, 'pull_v', 'hombro'],
  ['jalon-unilateral', 'Jalón unilateral en polea', 'Espalda', 'c', 'polea', 10, 15, 'pull_v', ''],
  ['remo-barra', 'Remo con barra', 'Espalda', 'c', 'barra', 6, 10, 'pull_h', 'lumbar'],
  ['remo-polea', 'Remo en polea baja', 'Espalda', 'c', 'polea', 8, 12, 'pull_h', ''],
  ['remo-manc', 'Remo con mancuerna a una mano', 'Espalda', 'c', 'mancuerna', 8, 12, 'pull_h', ''],
  ['remo-maq', 'Remo en máquina', 'Espalda', 'c', 'maquina', 8, 12, 'pull_h', ''],
  ['remo-invertido', 'Remo invertido (mesa o barra baja)', 'Espalda', 'c', 'peso corporal', 8, 15, 'pull_h', ''],
  ['pullover-polea', 'Pull-over en polea alta', 'Espalda', 'i', 'polea', 10, 15, 'pullover', ''],
  ['pullover-manc', 'Pull-over con mancuerna', 'Espalda', 'i', 'mancuerna', 10, 15, 'pullover', 'hombro'],
  ['peso-muerto-rumano', 'Peso muerto rumano', 'Femoral', 'c', 'barra', 6, 10, 'hinge', 'lumbar'],
  ['rumano-manc', 'Peso muerto rumano con mancuernas', 'Femoral', 'c', 'mancuerna', 8, 12, 'hinge', 'lumbar'],
  ['hiperextensiones', 'Hiperextensiones', 'Lumbar', 'i', 'peso corporal', 10, 15, 'hinge2', 'lumbar'],
  // Hombro
  ['press-militar-manc', 'Press militar con mancuernas', 'Hombro', 'c', 'mancuerna', 6, 10, 'push_v', 'hombro'],
  ['press-militar-barra', 'Press militar con barra', 'Hombro', 'c', 'barra', 5, 8, 'push_v', 'hombro lumbar'],
  ['press-hombro-maq', 'Press de hombro en máquina', 'Hombro', 'c', 'maquina', 8, 12, 'push_v', ''],
  ['pike', 'Flexiones en pica (pike push-up)', 'Hombro', 'c', 'peso corporal', 6, 15, 'push_v', 'hombro muneca'],
  ['elev-laterales', 'Elevaciones laterales con mancuernas', 'Hombro', 'i', 'mancuerna', 12, 20, 'lateral', ''],
  ['elev-laterales-polea', 'Elevaciones laterales en polea', 'Hombro', 'i', 'polea', 12, 20, 'lateral', ''],
  ['face-pull', 'Face pull', 'Hombro posterior', 'i', 'polea', 12, 20, 'rear', ''],
  ['pajaros-maq', 'Pájaros en máquina (reverse peck deck)', 'Hombro posterior', 'i', 'maquina', 12, 20, 'rear', ''],
  ['pajaros-manc', 'Pájaros con mancuernas', 'Hombro posterior', 'i', 'mancuerna', 12, 20, 'rear', 'lumbar'],
  ['encogimientos', 'Encogimientos con mancuernas', 'Trapecio', 'i', 'mancuerna', 10, 15, 'trap', ''],
  // Brazo
  ['curl-barra', 'Curl de bíceps con barra', 'Bíceps', 'i', 'barra', 8, 12, 'biceps', 'codo muneca'],
  ['curl-manc', 'Curl de bíceps con mancuernas', 'Bíceps', 'i', 'mancuerna', 8, 12, 'biceps', ''],
  ['curl-martillo', 'Curl martillo', 'Bíceps', 'i', 'mancuerna', 8, 12, 'biceps', ''],
  ['curl-predicador', 'Curl en banco predicador', 'Bíceps', 'i', 'maquina', 8, 12, 'biceps', 'codo'],
  ['curl-inclinado', 'Curl inclinado con mancuernas', 'Bíceps', 'i', 'mancuerna', 8, 12, 'biceps', 'hombro'],
  ['curl-polea', 'Curl en polea', 'Bíceps', 'i', 'polea', 10, 15, 'biceps', ''],
  ['press-frances', 'Press francés', 'Tríceps', 'i', 'barra', 8, 12, 'triceps', 'codo'],
  ['ext-triceps-polea', 'Extensión de tríceps en polea', 'Tríceps', 'i', 'polea', 10, 15, 'triceps', ''],
  ['ext-triceps-cuerda', 'Extensión de tríceps con cuerda', 'Tríceps', 'i', 'polea', 10, 15, 'triceps', ''],
  ['ext-triceps-overhead', 'Extensión de tríceps tras nuca en polea', 'Tríceps', 'i', 'polea', 10, 15, 'triceps', 'codo hombro'],
  ['ext-triceps-manc', 'Extensión de tríceps tras nuca con mancuerna', 'Tríceps', 'i', 'mancuerna', 10, 15, 'triceps', 'codo hombro'],
  ['patada-triceps', 'Patada de tríceps con mancuerna', 'Tríceps', 'i', 'mancuerna', 12, 15, 'triceps', ''],
  ['fondos-banco', 'Fondos de tríceps entre bancos', 'Tríceps', 'c', 'peso corporal', 8, 15, 'triceps', 'hombro muneca'],
  ['fondos-maq', 'Fondos de tríceps en máquina', 'Tríceps', 'c', 'maquina', 8, 12, 'triceps', ''],
  // Pierna
  ['sentadilla', 'Sentadilla con barra', 'Cuádriceps', 'c', 'barra', 6, 10, 'squat', 'lumbar rodilla'],
  ['prensa', 'Prensa de piernas', 'Cuádriceps', 'c', 'maquina', 8, 12, 'squat', ''],
  ['hack', 'Sentadilla hack', 'Cuádriceps', 'c', 'maquina', 8, 12, 'squat', 'rodilla'],
  ['goblet', 'Sentadilla goblet con mancuerna', 'Cuádriceps', 'c', 'mancuerna', 8, 15, 'squat', 'rodilla'],
  ['sentadilla-corporal', 'Sentadilla con peso corporal', 'Cuádriceps', 'c', 'peso corporal', 12, 25, 'squat', 'rodilla'],
  ['bulgara', 'Sentadilla búlgara', 'Cuádriceps', 'c', 'mancuerna', 8, 12, 'lunge', 'rodilla'],
  ['zancadas', 'Zancadas', 'Cuádriceps', 'c', 'peso corporal', 10, 15, 'lunge', 'rodilla'],
  ['ext-cuadriceps', 'Curl de cuádriceps (extensión)', 'Cuádriceps', 'i', 'maquina', 10, 15, 'quad', 'rodilla'],
  ['curl-femoral', 'Curl de bíceps femoral', 'Femoral', 'i', 'maquina', 10, 15, 'ham', ''],
  ['hip-thrust', 'Hip thrust', 'Glúteo', 'c', 'barra', 8, 12, 'glute', ''],
  ['puente-gluteo', 'Puente de glúteo', 'Glúteo', 'i', 'peso corporal', 12, 20, 'glute', ''],
  ['aductor', 'Aductor en máquina', 'Aductor', 'i', 'maquina', 12, 15, 'adductor', ''],
  ['abductor', 'Abductor en máquina', 'Glúteo', 'i', 'maquina', 12, 15, 'abductor', ''],
  ['gemelos-prensa', 'Gemelos en prensa', 'Gemelo', 'i', 'maquina', 10, 15, 'calf', ''],
  ['gemelos-pie', 'Gemelos de pie', 'Gemelo', 'i', 'maquina', 10, 15, 'calf', ''],
  ['gemelos-corporal', 'Elevación de talones', 'Gemelo', 'i', 'peso corporal', 15, 25, 'calf', ''],
  // Abdomen
  ['crunch-polea', 'Crunch en polea', 'Abdomen', 'i', 'polea', 10, 15, 'core', ''],
  ['elev-piernas', 'Elevación de piernas colgado', 'Abdomen', 'i', 'dominadas', 10, 15, 'core', ''],
  ['crunch-maq', 'Crunch en máquina', 'Abdomen', 'i', 'maquina', 10, 15, 'core', ''],
  ['rueda', 'Rueda abdominal', 'Abdomen', 'i', 'peso corporal', 8, 15, 'core', 'lumbar'],
  ['crunch', 'Crunch en el suelo', 'Abdomen', 'i', 'peso corporal', 15, 25, 'core', ''],
  ['plancha', 'Plancha (segundos en reps)', 'Abdomen', 'i', 'peso corporal', 30, 60, 'core', ''],
];

export const EXERCISES = RAW.map(([id, name, muscle, kind, eq, repMin, repMax, pattern, avoid]) => ({
  id, name, muscle, kind, eq, repMin, repMax, pattern, avoid: avoid ? avoid.split(' ') : [],
  inc: eq === 'mancuerna' ? 2 : 2.5,
  rest: kind === 'c' ? 150 : 90,
}));

export const INJURIES = [['hombro', 'Hombro'], ['rodilla', 'Rodilla'], ['lumbar', 'Zona lumbar'], ['codo', 'Codo'], ['muneca', 'Muñeca']];

// Plantillas de sesión: lista de patrones por prioridad (los últimos se quitan si la sesión es corta).
// "patrón:2" = segunda variante distinta del mismo patrón.
export const SESSION_TEMPLATES = {
  fbA: { name: 'Cuerpo completo A', p: ['squat', 'push_h', 'pull_v', 'hinge', 'lateral', 'biceps', 'core', 'calf'] },
  fbB: { name: 'Cuerpo completo B', p: ['hinge', 'push_i', 'pull_h', 'lunge', 'push_v', 'triceps', 'core', 'rear'] },
  fbC: { name: 'Cuerpo completo C', p: ['squat:2', 'push_h:2', 'pull_v:2', 'glute', 'rear', 'biceps:2', 'triceps:2', 'calf'] },
  upA: { name: 'Torso A', p: ['push_h', 'pull_v', 'push_v', 'pull_h', 'lateral', 'biceps', 'triceps', 'rear'] },
  upB: { name: 'Torso B', p: ['push_i', 'pull_h', 'pull_v:2', 'push_h:2', 'chest_iso', 'rear', 'biceps:2', 'triceps:2'] },
  loA: { name: 'Pierna A', p: ['squat', 'hinge', 'quad', 'ham', 'calf', 'core', 'adductor'] },
  loB: { name: 'Pierna B', p: ['hinge', 'lunge', 'squat:2', 'ham', 'glute', 'calf', 'core'] },
  push: { name: 'Empuje', p: ['push_h', 'push_i', 'push_v', 'chest_iso', 'lateral', 'triceps', 'triceps:2'] },
  pull: { name: 'Tirón', p: ['pull_v', 'pull_h', 'pull_h:2', 'rear', 'biceps', 'biceps:2', 'trap'] },
  legs: { name: 'Pierna', p: ['squat', 'hinge', 'quad', 'ham', 'calf', 'core', 'adductor'] },
  push2: { name: 'Empuje B', p: ['push_i', 'push_v', 'push_h:2', 'lateral', 'chest_iso', 'triceps:2', 'triceps'] },
  pull2: { name: 'Tirón B', p: ['pull_h', 'pull_v:2', 'pullover', 'rear', 'biceps:2', 'biceps', 'core'] },
  legs2: { name: 'Pierna B', p: ['hinge', 'lunge', 'squat:2', 'ham', 'glute', 'calf', 'core'] },
  pecho: { name: 'Pecho', p: ['push_h', 'push_i', 'push_h:2', 'chest_iso', 'dip', 'chest_iso:2'] },
  espalda: { name: 'Espalda / Abs', p: ['pull_v', 'pull_h', 'pull_h:2', 'pull_v:2', 'pullover', 'core', 'core:2'] },
  brazo: { name: 'Brazo / Abs', p: ['biceps', 'triceps', 'biceps:2', 'triceps:2', 'biceps:3', 'triceps:3', 'core'] },
  hombro: { name: 'Hombro', p: ['push_v', 'lateral', 'rear', 'push_v:2', 'lateral:2', 'trap'] },
  pierna: { name: 'Pierna', p: ['squat', 'hinge', 'quad', 'ham', 'calf', 'adductor', 'lunge'] },
};

export const SPLITS = {
  fullbody: { name: 'Cuerpo completo', days: { 1: ['fbA'], 2: ['fbA', 'fbB'], 3: ['fbA', 'fbB', 'fbC'], 4: ['fbA', 'fbB', 'fbC', 'fbA'] } },
  torsopierna: { name: 'Torso / pierna', days: { 2: ['upA', 'loA'], 3: ['upA', 'loA', 'upB'], 4: ['upA', 'loA', 'upB', 'loB'], 5: ['upA', 'loA', 'upB', 'loB', 'upA'], 6: ['upA', 'loA', 'upB', 'loB', 'upA', 'loA'] } },
  ppl: { name: 'Empuje / tirón / pierna', days: { 3: ['push', 'pull', 'legs'], 5: ['push', 'pull', 'legs', 'upA', 'loB'], 6: ['push', 'pull', 'legs', 'push2', 'pull2', 'legs2'] } },
  grupos: { name: 'Por grupos musculares', days: { 4: ['pecho', 'espalda', 'pierna', 'hombro'], 5: ['pecho', 'espalda', 'brazo', 'hombro', 'pierna'], 6: ['pecho', 'espalda', 'pierna', 'hombro', 'brazo', 'pierna'] } },
};

export function recommendedSplit(days) {
  if (days <= 3) return 'fullbody';
  if (days === 4) return 'torsopierna';
  return 'ppl';
}
export function splitsFor(days) {
  return Object.entries(SPLITS).filter(([, s]) => s.days[days]).map(([k, s]) => [k, s.name]);
}
