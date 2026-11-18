// Base de alimentos genéricos. Valores aproximados por 100 g (o 100 ml), referencias BEDCA/USDA.
// [id, nombre, kcal, proteína, hidratos, grasa, grupos, unidades]
// Grupos (para el generador de menús e intercambios):
//  pm = proteína principal (comida/cena) · pw = proteína para wrap · pd = proteína desayuno/bocadillo · pl = proteína láctea
//  wh = proteína en polvo · cm = hidrato principal · cd = hidrato desayuno · fr = fruta
//  ve = verdura · fa = grasa · lq = leche · ot = otros
const RAW = [
  // Proteínas (pesos en crudo)
  ['pollo', 'Pechuga de pollo (cruda)', 113, 23, 0, 1.9, ['pm', 'pw'], []],
  ['muslo', 'Muslo de pollo sin piel (crudo)', 121, 19.7, 0, 4.1, ['pm'], []],
  ['pavo', 'Pechuga de pavo (cruda)', 105, 24, 0, 1, ['pm', 'pw'], []],
  ['ternera', 'Ternera magra, filete (crudo)', 135, 22, 0, 5, ['pm', 'pw'], []],
  ['picada5', 'Carne picada de ternera 5 % (cruda)', 137, 21.4, 0, 5, ['pm', 'pw'], []],
  ['picada20', 'Carne picada mixta 20 % (cruda)', 254, 17.2, 0, 20, [], []],
  ['lomo', 'Lomo de cerdo (crudo)', 145, 21, 0, 6.5, ['pm', 'pw'], []],
  ['merluza', 'Merluza (cruda)', 75, 16, 0, 1, ['pm'], []],
  ['salmon', 'Salmón (crudo)', 208, 20.4, 0, 13.4, ['pm'], []],
  ['gambas', 'Gambas / langostinos (crudos)', 85, 20.1, 0, 0.5, ['pm'], []],
  ['atun', 'Atún al natural (escurrido)', 116, 25.5, 0, 0.8, ['pm', 'pd', 'pw'], [['lata', 56]]],
  ['atunac', 'Atún en aceite (escurrido)', 198, 29, 0, 8.2, ['pd'], [['lata', 56]]],
  ['huevo', 'Huevo entero', 143, 12.6, 0.7, 9.5, ['pm', 'pd'], [['unidad', 60]]],
  ['clara', 'Clara de huevo', 52, 10.9, 0.7, 0.2, [], [['clara', 33]]],
  ['york', 'Jamón cocido extra', 110, 19, 1, 3.5, ['pd'], [['loncha', 15]]],
  ['pavofi', 'Pechuga de pavo (fiambre)', 100, 18, 3, 1.5, ['pd'], [['loncha', 15]]],
  ['serrano', 'Jamón serrano', 240, 30, 0, 13, ['pd'], [['loncha', 15]]],
  ['chorizo', 'Chorizo', 455, 24, 2, 38, [], [['loncha', 8]]],
  ['frankfurt', 'Salchicha tipo Frankfurt', 270, 12, 2, 24, [], [['unidad', 40]]],
  ['quesobat', 'Queso fresco batido 0 %', 46, 8, 3.5, 0.2, ['pl'], []],
  ['yogpro', 'Yogur alto en proteína natural', 60, 10, 4, 0.2, ['pl'], [['unidad', 120]]],
  ['skyr', 'Skyr natural', 63, 11, 4, 0.2, ['pl'], [['unidad', 150]]],
  ['yogdes', 'Yogur natural desnatado', 42, 4.3, 5.8, 0.1, [], [['unidad', 125]]],
  ['burgos0', 'Queso fresco Burgos 0 %', 72, 13, 3.5, 0.5, ['pd'], [['tarrina', 60]]],
  ['curado', 'Queso curado', 400, 26, 0.5, 33, [], [['loncha', 15]]],
  ['whey', 'Proteína whey (polvo)', 390, 78, 6, 6, ['wh'], [['cacito', 30]]],
  ['lentejas', 'Lentejas cocidas', 116, 9, 20, 0.4, ['cm', 'leg'], []],
  ['garbanzos', 'Garbanzos cocidos', 140, 7.5, 21, 2.5, ['cm', 'leg'], []],
  ['alubias', 'Alubias cocidas', 115, 7.5, 20, 0.4, ['leg'], []],
  // Proteína vegetal y alternativas
  ['tofu', 'Tofu firme', 144, 17.3, 2.8, 8.7, ['pm', 'pw'], []],
  ['sojatex', 'Soja texturizada (seca)', 327, 51, 16, 1.2, ['pm'], []],
  ['seitan', 'Seitán', 130, 25, 4, 2, ['pm', 'pw'], []],
  ['edamame', 'Edamame', 121, 11.9, 8.9, 5.2, [], []],
  ['yogsoja', 'Yogur de soja natural', 50, 4.2, 2.5, 2.4, ['pl'], [['unidad', 125]]],
  ['protveg', 'Proteína vegetal en polvo', 380, 78, 5, 7, ['wh'], [['cacito', 30]]],
  ['bebsoja', 'Bebida de soja', 39, 3.3, 2.5, 1.8, ['lq'], [['vaso', 250]]],
  ['lechesl', 'Leche sin lactosa semidesnatada', 46, 3.2, 4.7, 1.6, ['lq'], [['vaso', 250]]],
  ['pansg', 'Pan sin gluten', 250, 4, 45, 5, ['cd', 'cm'], [['rebanada', 30]]],
  // Lácteos líquidos
  ['lechesemi', 'Leche semidesnatada', 46, 3.2, 4.7, 1.6, ['lq'], [['vaso', 250]]],
  ['lechedes', 'Leche desnatada', 35, 3.4, 4.9, 0.2, ['lq'], [['vaso', 250]]],
  // Hidratos
  ['arroz', 'Arroz blanco (crudo)', 360, 7, 79, 0.6, ['cm'], []],
  ['arrozc', 'Arroz blanco (cocido)', 130, 2.7, 28, 0.3, [], []],
  ['pasta', 'Pasta (cruda)', 360, 12.5, 72, 1.5, ['cm'], []],
  ['pastac', 'Pasta (cocida)', 158, 5.8, 31, 0.9, [], []],
  ['patata', 'Patata (cruda)', 77, 2, 17, 0.1, ['cm'], [['mediana', 200]]],
  ['boniato', 'Boniato (crudo)', 86, 1.6, 20, 0.1, ['cm'], []],
  ['cuscus', 'Cuscús (crudo)', 376, 12.8, 77, 0.6, ['cm'], []],
  ['quinoa', 'Quinoa (cruda)', 368, 14, 64, 6, ['cm'], []],
  ['wrap', 'Tortilla de trigo (wrap)', 310, 8.5, 52, 7, ['cm', 'cd'], [['unidad', 60]]],
  ['pan', 'Pan blanco de barra', 265, 9, 52, 1.5, ['cm', 'cd'], [['rebanada', 30]]],
  ['panint', 'Pan integral de molde', 250, 10, 41, 4, ['cd'], [['rebanada', 25]]],
  ['panmolde', 'Pan de molde blanco', 265, 8, 48, 4, ['cd'], [['rebanada', 25]]],
  ['avena', 'Copos de avena', 375, 13.5, 59, 7, ['cd'], []],
  ['tortitas', 'Tortitas de arroz', 385, 8, 81, 3, ['cd'], [['unidad', 8]]],
  ['cereales', 'Copos de maíz', 378, 7, 84, 0.9, [], []],
  ['galletas', 'Galletas tipo María', 440, 7, 74, 12, [], [['unidad', 6]]],
  // Fruta
  ['platano', 'Plátano', 89, 1.1, 22.8, 0.3, ['fr'], [['unidad (sin piel)', 120]]],
  ['manzana', 'Manzana', 52, 0.3, 13.8, 0.2, ['fr'], [['unidad', 180]]],
  ['naranja', 'Naranja', 47, 0.9, 11.8, 0.1, ['fr'], [['unidad', 180]]],
  ['mandarina', 'Mandarina', 53, 0.8, 13.3, 0.3, ['fr'], [['unidad', 80]]],
  ['pera', 'Pera', 57, 0.4, 15, 0.1, ['fr'], [['unidad', 170]]],
  ['kiwi', 'Kiwi', 61, 1.1, 14.7, 0.5, ['fr'], [['unidad', 75]]],
  ['fresas', 'Fresas', 32, 0.7, 7.7, 0.3, ['fr'], []],
  ['arandanos', 'Arándanos', 57, 0.7, 14.5, 0.3, ['fr'], []],
  ['uvas', 'Uvas', 69, 0.7, 18, 0.2, ['fr'], []],
  ['melon', 'Melón', 34, 0.8, 8.2, 0.2, ['fr'], []],
  ['sandia', 'Sandía', 30, 0.6, 7.6, 0.2, ['fr'], []],
  // Verdura
  ['lechuga', 'Lechuga / ensalada', 15, 1.4, 2.9, 0.2, ['ve'], []],
  ['tomate', 'Tomate', 18, 0.9, 3.9, 0.2, ['ve'], [['unidad', 120]]],
  ['pepino', 'Pepino', 15, 0.7, 3.6, 0.1, ['ve'], []],
  ['pimrojo', 'Pimiento rojo', 31, 1, 6, 0.3, ['ve'], []],
  ['pimverde', 'Pimiento verde', 20, 0.9, 4.6, 0.2, ['ve'], []],
  ['cebolla', 'Cebolla', 40, 1.1, 9.3, 0.1, [], []],
  ['calabacin', 'Calabacín', 17, 1.2, 3.1, 0.3, ['ve'], []],
  ['berenjena', 'Berenjena', 25, 1, 5.9, 0.2, ['ve'], []],
  ['judias', 'Judías verdes', 31, 1.8, 7, 0.2, ['ve'], []],
  ['espinacas', 'Espinacas', 23, 2.9, 3.6, 0.4, ['ve'], []],
  ['champi', 'Champiñones', 22, 3.1, 3.3, 0.3, ['ve'], []],
  ['zanahoria', 'Zanahoria', 41, 0.9, 9.6, 0.2, ['ve'], []],
  ['esparragos', 'Espárragos verdes', 20, 2.2, 3.9, 0.1, ['ve'], []],
  ['tomfrito', 'Tomate frito', 80, 1.5, 11, 3.3, [], [['cucharada', 15]]],
  // Grasas
  ['aove', 'Aceite de oliva virgen extra', 884, 0, 0, 100, ['fa'], [['cucharada', 10], ['cucharadita', 5]]],
  ['aguacate', 'Aguacate', 160, 2, 8.5, 14.7, ['fa'], [['medio', 70]]],
  ['almendras', 'Almendras', 579, 21, 21.6, 50, ['fa'], [['puñado', 25]]],
  ['nueces', 'Nueces', 654, 15, 13.7, 65, ['fa'], [['puñado', 25]]],
  ['cacahuetes', 'Cacahuetes', 567, 25.8, 16, 49, ['fa'], [['puñado', 25]]],
  ['crcacahuete', 'Crema de cacahuete 100 %', 600, 25, 15, 50, ['fa'], [['cucharada', 15]]],
  ['mantequilla', 'Mantequilla', 717, 0.9, 0.1, 81, [], [['porción', 10]]],
  ['aceitunas', 'Aceitunas', 145, 1, 3.8, 15.3, [], [['unidad', 4]]],
  ['mayonesa', 'Mayonesa', 680, 1, 0.6, 75, [], [['cucharada', 15]]],
  ['choco85', 'Chocolate negro 85 %', 590, 11, 20, 50, [], [['onza', 10]]],
  // Bebidas (por 100 ml)
  ['cerveza', 'Cerveza', 43, 0.5, 3.6, 0, ['ot'], [['caña', 200], ['tercio', 330]]],
  ['cerveza0', 'Cerveza sin alcohol', 22, 0.3, 5, 0, ['ot'], [['tercio', 330]]],
  ['cocazero', 'Coca-Cola Zero', 0.3, 0, 0, 0, ['ot'], [['lata', 330]]],
  ['cola', 'Refresco de cola', 42, 0, 10.6, 0, ['ot'], [['lata', 330]]],
  ['ron', 'Ron', 231, 0, 0, 0, ['ot'], [['chupito / copa', 50]]],
  ['zumo', 'Zumo de naranja', 45, 0.7, 10.4, 0.2, ['ot'], [['vaso', 200]]],
  // Otros
  ['miel', 'Miel', 304, 0.3, 82, 0, [], [['cucharadita', 7]]],
  ['azucar', 'Azúcar', 400, 0, 100, 0, [], [['sobre', 8]]],
  ['mermelada', 'Mermelada', 250, 0.4, 60, 0.1, [], [['cucharada', 15]]],
  ['ketchup', 'Kétchup', 112, 1.2, 26, 0.1, [], [['cucharada', 15]]],
  ['hummus', 'Hummus', 166, 7.9, 14, 9.6, [], [['cucharada', 20]]],
  ['tortilla', 'Tortilla de patatas', 185, 6.5, 14, 11.5, [], [['pincho', 120]]],
  ['pizza', 'Pizza (media)', 250, 10, 30, 10, [], [['porción', 100]]],
  ['patfritas', 'Patatas fritas de bolsa', 536, 7, 53, 34.6, [], []],
];

// Etiquetas: tipo (carne, pescado, marisco, lacteo, huevo, miel) y alérgenos
// (gluten, lactosa, huevo, frutos_secos, cacahuete, pescado, marisco, soja). 'alt' = alternativa que el menú
// solo propone cuando la dieta o las alergias quitan opciones de ese grupo
const TAGS = {
  pollo: 'carne', muslo: 'carne', pavo: 'carne', ternera: 'carne', picada5: 'carne', picada20: 'carne', lomo: 'carne',
  york: 'carne', pavofi: 'carne', serrano: 'carne', chorizo: 'carne', frankfurt: 'carne',
  merluza: 'pescado', salmon: 'pescado', atun: 'pescado', atunac: 'pescado', gambas: 'marisco',
  huevo: 'huevo', clara: 'huevo', tortilla: 'huevo', mayonesa: 'huevo',
  quesobat: 'lacteo lactosa', yogpro: 'lacteo lactosa', skyr: 'lacteo lactosa', yogdes: 'lacteo lactosa', burgos0: 'lacteo lactosa',
  curado: 'lacteo lactosa', whey: 'lacteo lactosa', lechesemi: 'lacteo lactosa', lechedes: 'lacteo lactosa', lechesl: 'lacteo',
  mantequilla: 'lacteo lactosa', pizza: 'lacteo lactosa gluten', choco85: 'lactosa',
  pasta: 'gluten', pastac: 'gluten', cuscus: 'gluten', wrap: 'gluten', pan: 'gluten', panint: 'gluten', panmolde: 'gluten',
  avena: 'gluten', galletas: 'gluten huevo', cerveza: 'gluten', cerveza0: 'gluten', cereales: 'gluten',
  almendras: 'frutos_secos', nueces: 'frutos_secos', cacahuetes: 'cacahuete', crcacahuete: 'cacahuete',
  tofu: 'soja alt', sojatex: 'soja alt', edamame: 'soja', yogsoja: 'soja alt', bebsoja: 'soja alt', miel: 'miel',
  seitan: 'gluten alt', protveg: 'alt', lechesl: 'lacteo alt', pansg: 'alt',
};

export const FOODS = RAW.map(([id, name, kcal, p, c, f, groups, units]) => ({
  id, name, kcal, p, c, f, groups, units: units.map(([n, g]) => ({ n, g })), src: 'base', tags: (TAGS[id] || '').split(' ').filter(Boolean),
}));

export const ALLERGENS = [
  ['gluten', 'Gluten'], ['lactosa', 'Lactosa'], ['huevo', 'Huevo'], ['frutos_secos', 'Frutos secos'],
  ['cacahuete', 'Cacahuete'], ['pescado', 'Pescado'], ['marisco', 'Marisco'], ['soja', 'Soja'],
];
export const DIETS = [['omnivora', 'Como de todo'], ['pescetariana', 'Pescetariana'], ['vegetariana', 'Vegetariana'], ['vegana', 'Vegana']];
const DIET_EXCLUDES = { omnivora: [], pescetariana: ['carne'], vegetariana: ['carne', 'pescado', 'marisco'], vegana: ['carne', 'pescado', 'marisco', 'lacteo', 'huevo', 'miel'] };

// ¿Puede comer este alimento según su dieta y alergias?
export function allowedFood(food, prefs = {}) {
  const tags = food.tags || [];
  const ex = DIET_EXCLUDES[prefs.diet || 'omnivora'] || [];
  if (tags.some(t => ex.includes(t))) return false;
  if ((prefs.allergens || []).some(a => tags.includes(a))) return false;
  return true;
}
export function allergenWarning(food, prefs = {}) {
  const hits = (prefs.allergens || []).filter(a => (food.tags || []).includes(a));
  return hits.map(h => ALLERGENS.find(x => x[0] === h)?.[1] || h);
}
