// Nutrición: volumen (ganar masa muscular al máximo)
// Base: 81 kg · 1,84 m · plan 10K con dobles (carrera por la mañana, fuerza por la tarde) · 4 comidas · poco apetito.

// Los alimentos salen de la base local (foods-db.js) más los que crees tú ("Mis alimentos").
const FOODS = FOOD_DB_MAP;
function getFood(key) {
  const custom = typeof Store !== "undefined" ? Store.foods[key] : null;
  return custom || FOOD_DB_MAP[key] || { key, name: key, k: 0, p: 0, c: 0, f: 0, unit: "g", base: "g" };
}
function allFoods() {
  const custom = typeof Store !== "undefined" ? Object.values(Store.foods) : [];
  return [...custom, ...FOOD_DB.map((x) => FOOD_DB_MAP[x[0]])];
}

// Tipos de día según la sesión del plan 10K (hipertrofia + funcional + carrera)
const DAY_TYPES = {
  doble: { name: "Día doble", short: "Doble", kcal: 4350, p: 215, c: 585, f: 130, why: "Carrera (series o umbral) + fuerza de torso o brazos" },
  pierna: { name: "Día de pierna", short: "Pierna", kcal: 4200, p: 210, c: 550, f: 128, why: "Pierna A o B + funcional" },
  torso: { name: "Día de torso", short: "Torso", kcal: 3650, p: 197, c: 435, f: 120, why: "Torso B o sesiones ligeras" },
  tirada: { name: "Tirada larga", short: "Tirada", kcal: 4050, p: 210, c: 560, f: 108, why: "Tirada larga del domingo o test de 10 km" },
  suave: { name: "Día suave", short: "Suave", kcal: 3450, p: 190, c: 405, f: 118, why: "Rodajes cortos y descargas" },
  descanso: { name: "Descanso", short: "Descanso", kcal: 3100, p: 182, c: 342, f: 113, why: "Sin entreno" },
  carga: { name: "Carga de hidratos", short: "Carga", kcal: 4050, p: 200, c: 650, f: 70, why: "Jueves y viernes antes del 10K: muchos hidratos, poca grasa y fibra" },
  carrera: { name: "Día del 10K", short: "10K", kcal: 3600, p: 190, c: 500, f: 91, why: "Desayuno 3 h antes y a recargar después" },
};
const DAY_ORDER = ["doble", "pierna", "torso", "tirada", "suave", "descanso", "carga", "carrera"];
// Registros guardados con los tipos del plan anterior
const LEGACY_DAY = { duro: "doble", medio: "torso" };
// Días concretos con tipo fijo
const DIET_OVERRIDES = { k15d4: "carga", k15d5: "carga" };

// Tipo de día automático a partir de la sesión
function dietTypeFor(s) {
  if (!s) return "suave";
  if (DIET_OVERRIDES[s.id]) return DIET_OVERRIDES[s.id];
  if (s.kind === "race") return "carrera";
  if (s.kind === "rest") return "descanso";
  const legs = (s.strength || []).some((k) => STRENGTH[k]?.legs);
  if (s.kind === "test") return s.strength?.length ? "doble" : "tirada";
  if (s.kind === "hybrid") return s.intensity === "dura" || s.intensity === "muy" ? "doble" : s.intensity === "media" ? "pierna" : "torso";
  if (s.kind === "strength") return legs && (s.intensity === "dura" || s.intensity === "muy") ? "pierna" : "torso";
  if (s.kind === "run") return s.dow === 7 && s.intensity !== "suave" ? "tirada" : "suave";
  return "suave";
}

// Comidas: gramos por tipo de día en el orden de DAY_ORDER
// [doble, pierna, torso, tirada, suave, descanso, carga, carrera]
const MEALS = [
  {
    id: "des", name: "Desayuno", time: "08:00", note: "2 h antes de la carrera o del entreno de la mañana: hidratos fáciles, poca grasa y fibra. El día del 10K, 3 h antes.",
    options: [
      { id: "A", name: "Tostadas, huevos y zumo", items: [["pan", [170, 160, 150, 170, 130, 110, 190, 150]], ["huevo", [120, 120, 120, 120, 120, 120, 60, 60]], ["aceite", [10, 10, 10, 5, 10, 10, 0, 0]], ["zumo", [400, 350, 300, 400, 300, 250, 500, 300]], ["miel", [20, 15, 10, 25, 10, 0, 40, 30]]] },
      { id: "B", name: "Porridge de avena", items: [["avena", [120, 115, 105, 120, 90, 80, 120, 90]], ["leche", [400, 400, 350, 400, 350, 300, 300, 300]], ["platano", [120, 120, 120, 120, 120, 120, 120, 120]], ["miel", [25, 20, 15, 25, 15, 10, 40, 30]], ["nueces", [20, 20, 20, 15, 20, 20, 0, 0]]] },
    ],
  },
  {
    id: "com", name: "Post-entreno + comida", time: "13:00", note: "Batido nada más terminar la sesión de la mañana y comida en la hora siguiente. Creatina en el batido.",
    options: [
      { id: "A", name: "Batido + arroz con pollo", items: [["whey", [25, 25, 25, 25, 25, 25, 25, 25]], ["creatina", [5, 5, 5, 5, 5, 5, 5, 5]], ["platano", [120, 120, 0, 120, 0, 0, 120, 120]], ["arroz", [200, 190, 160, 190, 140, 110, 240, 170]], ["pollo", [150, 150, 150, 150, 150, 150, 150, 150]], ["aceite", [20, 20, 20, 15, 20, 20, 10, 15]], ["verdura", [150, 150, 200, 100, 200, 200, 50, 100]]] },
      { id: "B", name: "Batido + pasta boloñesa", items: [["whey", [25, 25, 25, 25, 25, 25, 25, 25]], ["creatina", [5, 5, 5, 5, 5, 5, 5, 5]], ["platano", [120, 120, 0, 120, 0, 0, 120, 120]], ["pasta", [190, 180, 150, 180, 130, 110, 230, 160]], ["ternera", [140, 140, 140, 140, 140, 140, 140, 140]], ["tomate", [150, 150, 150, 150, 150, 150, 100, 150]], ["aceite", [15, 15, 15, 10, 15, 15, 5, 10]], ["parmesano", [15, 15, 15, 15, 15, 15, 0, 15]]] },
    ],
  },
  {
    id: "mer", name: "Merienda", time: "17:00", note: "En días dobles, 1–1,5 h antes de la fuerza. Si el batido te pesa antes de entrenar, elige el bocadillo y bébete el batido después.",
    options: [
      { id: "A", name: "Batido ganador casero", items: [["leche", [500, 500, 450, 500, 400, 350, 400, 450]], ["avena", [90, 85, 75, 85, 60, 50, 90, 70]], ["platano", [120, 120, 120, 120, 120, 120, 120, 120]], ["cacahuete", [30, 30, 25, 25, 25, 25, 10, 20]], ["miel", [20, 20, 10, 20, 10, 0, 40, 20]]] },
      { id: "B", name: "Bocadillo de atún, fruta y frutos secos", items: [["pan", [180, 170, 150, 170, 130, 110, 200, 150]], ["atun", [80, 80, 80, 80, 80, 80, 80, 80]], ["aceite", [10, 10, 10, 5, 10, 10, 0, 5]], ["fruta", [200, 200, 150, 200, 150, 150, 200, 150]], ["nueces", [30, 30, 30, 20, 30, 30, 0, 20]]] },
    ],
  },
  {
    id: "cen", name: "Cena", time: "21:00", note: "Después de la fuerza en los días dobles. Skyr al final: proteína lenta para la noche.",
    options: [
      { id: "A", name: "Salmón con patatas", items: [["patata", [600, 550, 480, 550, 400, 320, 700, 500]], ["salmon", [150, 150, 150, 150, 150, 150, 120, 150]], ["aceite", [15, 15, 15, 10, 15, 15, 5, 10]], ["verdura", [150, 150, 150, 100, 150, 150, 50, 100]], ["skyr", [125, 125, 125, 125, 125, 125, 125, 125]]] },
      { id: "B", name: "Wraps de pollo y aguacate", items: [["wrap", [240, 220, 190, 220, 160, 130, 270, 200]], ["pollo", [150, 150, 150, 150, 150, 150, 150, 150]], ["aguacate", [80, 80, 80, 60, 80, 80, 0, 50]], ["verdura", [100, 100, 100, 100, 100, 100, 50, 80]], ["skyr", [125, 125, 125, 125, 125, 125, 125, 125]], ["miel", [15, 15, 10, 15, 10, 10, 30, 15]]] },
    ],
  },
];

// Extras rápidos para llegar al objetivo cuando falte (o al subir calorías)
const EXTRAS = [
  { id: "refuerzo", name: "Refuerzo: leche + cacahuete", items: [["leche", 300], ["cacahuete", 15]] },
  { id: "leche", name: "Vaso de leche entera", items: [["leche", 300]] },
  { id: "nueces", name: "Puñado de frutos secos", items: [["nueces", 30]] },
  { id: "datiles", name: "Dátiles (5 ud)", items: [["datiles", 40]] },
  { id: "pan", name: "Tostada con aceite", items: [["pan", 60], ["aceite", 10]] },
  { id: "skyr", name: "Skyr con miel", items: [["skyr", 200], ["miel", 20]] },
  { id: "zumo", name: "Zumo de naranja", items: [["zumo", 300]] },
  { id: "whey", name: "Batido whey en leche", items: [["whey", 30], ["leche", 300]] },
  { id: "isotonica", name: "Isotónica (series o tirada)", items: [["bebida_isotonica", 500]] },
  { id: "gel", name: "Gel energético", items: [["gel", 40]] },
];

const DIET_RULES = [
  "Objetivo: ganar 0,4–0,7 kg por semana (media de 7 días del peso en ayunas). Más rápido es casi todo grasa y te pesará en el 10K.",
  "Si en 2 semanas la media sube menos de 0,25 kg/semana: +250 kcal/día (botón «Subir 250 kcal»).",
  "Si sube más de 1 kg/semana durante 2 semanas: −250 kcal/día.",
  "Proteína 2,3–2,6 g/kg repartida en 4–5 tomas. Lo que más importa para crecer son las calorías totales y entrenar fuerte.",
  "Más hidratos los días de doble sesión, pierna y tirada; menos los de torso y descanso. El tipo de día sale solo del plan.",
  "Días dobles: entre la carrera y la fuerza, batido + comida grande + merienda. Que no pasen más de 3 h sin comer.",
  "Tirada larga y series de más de 75': 30–60 g de hidratos por hora (isotónica, gel o dátiles) desde el minuto 40.",
  "Poco apetito: bebe las calorías (batido ganador, leche, zumo), usa aceite y frutos secos, y no llenes el plato de verdura en las comidas grandes.",
  "Creatina 5 g todos los días (también los de descanso). No hace falta cargarla.",
  "Agua: 3–4 L/día y más en sesiones largas. Una pizca de sal en el agua de las series si sudas mucho.",
  "Pésate cada mañana después del baño y antes de desayunar. Un día suelto no significa nada: mira la media semanal.",
];

// Gramos de un alimento en un tipo de día
const dayIdx = (type) => Math.max(0, DAY_ORDER.indexOf(LEGACY_DAY[type] || type));
function itemGrams(item, type) { return Array.isArray(item[1]) ? item[1][dayIdx(type)] : item[1]; }
function macrosOf(key, g) {
  const f = getFood(key);
  const m = g / 100;
  return { k: f.k * m, p: f.p * m, c: f.c * m, f: f.f * m };
}
function sumMacros(list) {
  return list.reduce((a, x) => ({ k: a.k + x.k, p: a.p + x.p, c: a.c + x.c, f: a.f + x.f }), { k: 0, p: 0, c: 0, f: 0 });
}
function fmtAmount(key, g) {
  const f = getFood(key);
  if (f.unit === "ud" && f.unitG) {
    const n = Math.round((g / f.unitG) * 2) / 2;
    return `${String(n).replace(".", ",")} ud`;
  }
  return `${Math.round(g)} ${f.base === "ml" || f.unit === "ml" ? "ml" : "g"}`;
}
