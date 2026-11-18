// Biblioteca de ejercicios. kind: 'c' compuesto, 'i' aislamiento. eq: barra, mancuerna, maquina, polea, peso corporal
// [id, nombre, músculo principal, kind, equipo, repMin, repMax]
const RAW = [
  // Pecho
  ['press-banca', 'Press de banca con barra', 'Pecho', 'c', 'barra', 6, 10],
  ['press-inclinado-manc', 'Press inclinado con mancuernas', 'Pecho', 'c', 'mancuerna', 8, 12],
  ['press-inclinado-barra', 'Press inclinado con barra', 'Pecho', 'c', 'barra', 6, 10],
  ['press-banca-manc', 'Press de banca con mancuernas', 'Pecho', 'c', 'mancuerna', 8, 12],
  ['press-pecho-maq', 'Press de pecho en máquina', 'Pecho', 'c', 'maquina', 8, 12],
  ['peck-deck', 'Aperturas en máquina (peck deck)', 'Pecho', 'i', 'maquina', 10, 15],
  ['cruce-poleas', 'Cruce de poleas', 'Pecho', 'i', 'polea', 12, 15],
  ['fondos', 'Fondos en paralelas', 'Pecho', 'c', 'peso corporal', 6, 12],
  // Espalda
  ['jalon-pecho', 'Jalón al pecho', 'Espalda', 'c', 'polea', 8, 12],
  ['dominadas', 'Dominadas', 'Espalda', 'c', 'peso corporal', 5, 10],
  ['remo-barra', 'Remo con barra', 'Espalda', 'c', 'barra', 6, 10],
  ['remo-polea', 'Remo en polea baja', 'Espalda', 'c', 'polea', 8, 12],
  ['remo-manc', 'Remo con mancuerna a una mano', 'Espalda', 'c', 'mancuerna', 8, 12],
  ['remo-maq', 'Remo en máquina', 'Espalda', 'c', 'maquina', 8, 12],
  ['pullover-polea', 'Pull-over en polea alta', 'Espalda', 'i', 'polea', 10, 15],
  ['peso-muerto-rumano', 'Peso muerto rumano', 'Femoral', 'c', 'barra', 6, 10],
  ['hiperextensiones', 'Hiperextensiones', 'Lumbar', 'i', 'peso corporal', 10, 15],
  // Hombro
  ['press-militar-manc', 'Press militar con mancuernas', 'Hombro', 'c', 'mancuerna', 6, 10],
  ['press-militar-barra', 'Press militar con barra', 'Hombro', 'c', 'barra', 5, 8],
  ['press-hombro-maq', 'Press de hombro en máquina', 'Hombro', 'c', 'maquina', 8, 12],
  ['elev-laterales', 'Elevaciones laterales con mancuernas', 'Hombro', 'i', 'mancuerna', 12, 20],
  ['elev-laterales-polea', 'Elevaciones laterales en polea', 'Hombro', 'i', 'polea', 12, 20],
  ['face-pull', 'Face pull', 'Hombro posterior', 'i', 'polea', 12, 20],
  ['pajaros-maq', 'Pájaros en máquina (reverse peck deck)', 'Hombro posterior', 'i', 'maquina', 12, 20],
  ['encogimientos', 'Encogimientos con mancuernas', 'Trapecio', 'i', 'mancuerna', 10, 15],
  // Brazo
  ['curl-barra', 'Curl de bíceps con barra', 'Bíceps', 'i', 'barra', 8, 12],
  ['curl-manc', 'Curl de bíceps con mancuernas', 'Bíceps', 'i', 'mancuerna', 8, 12],
  ['curl-martillo', 'Curl martillo', 'Bíceps', 'i', 'mancuerna', 8, 12],
  ['curl-predicador', 'Curl en banco predicador', 'Bíceps', 'i', 'maquina', 8, 12],
  ['curl-inclinado', 'Curl inclinado con mancuernas', 'Bíceps', 'i', 'mancuerna', 8, 12],
  ['curl-polea', 'Curl en polea', 'Bíceps', 'i', 'polea', 10, 15],
  ['press-frances', 'Press francés', 'Tríceps', 'i', 'barra', 8, 12],
  ['ext-triceps-polea', 'Extensión de tríceps en polea', 'Tríceps', 'i', 'polea', 10, 15],
  ['ext-triceps-cuerda', 'Extensión de tríceps con cuerda', 'Tríceps', 'i', 'polea', 10, 15],
  ['ext-triceps-overhead', 'Extensión de tríceps tras nuca en polea', 'Tríceps', 'i', 'polea', 10, 15],
  ['fondos-maq', 'Fondos de tríceps en máquina', 'Tríceps', 'c', 'maquina', 8, 12],
  // Pierna
  ['sentadilla', 'Sentadilla con barra', 'Cuádriceps', 'c', 'barra', 6, 10],
  ['prensa', 'Prensa de piernas', 'Cuádriceps', 'c', 'maquina', 8, 12],
  ['hack', 'Sentadilla hack', 'Cuádriceps', 'c', 'maquina', 8, 12],
  ['bulgara', 'Sentadilla búlgara', 'Cuádriceps', 'c', 'mancuerna', 8, 12],
  ['ext-cuadriceps', 'Curl de cuádriceps (extensión)', 'Cuádriceps', 'i', 'maquina', 10, 15],
  ['curl-femoral', 'Curl de bíceps femoral', 'Femoral', 'i', 'maquina', 10, 15],
  ['hip-thrust', 'Hip thrust', 'Glúteo', 'c', 'barra', 8, 12],
  ['aductor', 'Aductor en máquina', 'Aductor', 'i', 'maquina', 12, 15],
  ['abductor', 'Abductor en máquina', 'Glúteo', 'i', 'maquina', 12, 15],
  ['gemelos-prensa', 'Gemelos en prensa', 'Gemelo', 'i', 'maquina', 10, 15],
  ['gemelos-pie', 'Gemelos de pie', 'Gemelo', 'i', 'maquina', 10, 15],
  // Abdomen
  ['crunch-polea', 'Crunch en polea', 'Abdomen', 'i', 'polea', 10, 15],
  ['elev-piernas', 'Elevación de piernas colgado', 'Abdomen', 'i', 'peso corporal', 10, 15],
  ['crunch-maq', 'Crunch en máquina', 'Abdomen', 'i', 'maquina', 10, 15],
  ['rueda', 'Rueda abdominal', 'Abdomen', 'i', 'peso corporal', 8, 15],
  ['plancha', 'Plancha (segundos en reps)', 'Abdomen', 'i', 'peso corporal', 30, 60],
];

export const EXERCISES = RAW.map(([id, name, muscle, kind, eq, repMin, repMax]) => ({
  id, name, muscle, kind, eq, repMin, repMax,
  inc: eq === 'mancuerna' ? 2 : (kind === 'c' ? 2.5 : 2.5),
  rest: kind === 'c' ? 150 : 90,
}));

// Rutinas de partida (las de Hevy). Editables desde la app.
export const DEFAULT_ROUTINES = [
  { id: 'r-pecho', name: 'Pecho', items: [
    ['press-banca', 4], ['press-inclinado-manc', 3], ['press-pecho-maq', 3], ['peck-deck', 3], ['cruce-poleas', 3]] },
  { id: 'r-espalda', name: 'Espalda / Abs', items: [
    ['jalon-pecho', 4], ['remo-barra', 3], ['remo-polea', 3], ['remo-manc', 3], ['pullover-polea', 3], ['crunch-polea', 3], ['elev-piernas', 3]] },
  { id: 'r-brazo', name: 'Brazo / Abs', items: [
    ['curl-barra', 3], ['press-frances', 3], ['curl-inclinado', 3], ['ext-triceps-cuerda', 3], ['curl-martillo', 3], ['ext-triceps-overhead', 3], ['rueda', 3]] },
  { id: 'r-hombro', name: 'Hombro / Cardio', items: [
    ['press-militar-manc', 4], ['elev-laterales', 4], ['press-hombro-maq', 3], ['pajaros-maq', 3], ['face-pull', 3]], cardio: 'Cinta 20-30 min' },
  { id: 'r-pierna', name: 'Pierna', items: [
    ['sentadilla', 4], ['gemelos-prensa', 4], ['ext-cuadriceps', 3], ['curl-femoral', 3], ['aductor', 3]] },
].map(r => ({ ...r, items: r.items.map(([ex, sets]) => ({ ex, sets })) }));
