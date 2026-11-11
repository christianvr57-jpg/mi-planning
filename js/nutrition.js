// Nutrición: volumen (ganar masa muscular al máximo)
// Base: 81 kg · 1,84 m · entreno a media mañana · 4 comidas · poco apetito → calorías líquidas.
// Valores por 100 g (o 100 ml). Para "ud", unitG = gramos por unidad.

const FOODS = {
  avena: { name: "Copos de avena", k: 375, p: 13.5, c: 60, f: 7, unit: "g" },
  leche: { name: "Leche entera", k: 63, p: 3.2, c: 4.7, f: 3.5, unit: "ml" },
  whey: { name: "Proteína whey", k: 400, p: 78, c: 8, f: 6, unit: "g" },
  platano: { name: "Plátano", k: 89, p: 1.1, c: 23, f: 0.3, unit: "ud", unitG: 120 },
  cacahuete: { name: "Crema de cacahuete", k: 600, p: 25, c: 14, f: 50, unit: "g" },
  huevo: { name: "Huevos", k: 143, p: 12.6, c: 0.7, f: 9.5, unit: "ud", unitG: 60 },
  pan: { name: "Pan", k: 265, p: 9, c: 50, f: 2.5, unit: "g" },
  aceite: { name: "Aceite de oliva", k: 884, p: 0, c: 0, f: 100, unit: "g" },
  arroz: { name: "Arroz (en crudo)", k: 355, p: 7, c: 79, f: 0.6, unit: "g" },
  pasta: { name: "Pasta (en crudo)", k: 355, p: 12.5, c: 72, f: 1.5, unit: "g" },
  patata: { name: "Patata (en crudo)", k: 77, p: 2, c: 17, f: 0.1, unit: "g" },
  pollo: { name: "Pechuga de pollo (en crudo)", k: 110, p: 23, c: 0, f: 1.5, unit: "g" },
  ternera: { name: "Ternera picada 5 % (en crudo)", k: 135, p: 21, c: 0, f: 5.5, unit: "g" },
  salmon: { name: "Salmón", k: 200, p: 20, c: 0, f: 13, unit: "g" },
  atun: { name: "Atún al natural (escurrido)", k: 110, p: 25, c: 0, f: 1, unit: "g" },
  skyr: { name: "Skyr o yogur proteico", k: 63, p: 11, c: 4, f: 0.2, unit: "g" },
  miel: { name: "Miel", k: 304, p: 0.3, c: 82, f: 0, unit: "g" },
  nueces: { name: "Frutos secos", k: 620, p: 18, c: 10, f: 55, unit: "g" },
  verdura: { name: "Verdura", k: 30, p: 2, c: 5, f: 0.3, unit: "g" },
  tomate: { name: "Tomate triturado", k: 40, p: 1.5, c: 7, f: 1, unit: "g" },
  zumo: { name: "Zumo de naranja", k: 45, p: 0.7, c: 10.4, f: 0.2, unit: "ml" },
  parmesano: { name: "Queso parmesano", k: 400, p: 33, c: 0, f: 28, unit: "g" },
  wrap: { name: "Tortillas de trigo", k: 300, p: 8.5, c: 50, f: 7, unit: "g" },
  aguacate: { name: "Aguacate", k: 160, p: 2, c: 9, f: 15, unit: "g" },
  fruta: { name: "Fruta (manzana, naranja…)", k: 52, p: 0.3, c: 13, f: 0.2, unit: "g" },
  datiles: { name: "Dátiles", k: 280, p: 2.5, c: 75, f: 0.4, unit: "g" },
  creatina: { name: "Creatina monohidrato", k: 0, p: 0, c: 0, f: 0, unit: "g" },
};

// Tipos de día según la sesión del plan
const DAY_TYPES = {
  duro: { name: "Día duro", short: "Duro", kcal: 4200, p: 200, c: 580, f: 125, why: "Series, fuerza pesada, simulacros" },
  medio: { name: "Día medio", short: "Medio", kcal: 3900, p: 195, c: 510, f: 120, why: "Fuerza C + ergo" },
  suave: { name: "Día suave", short: "Suave", kcal: 3450, p: 185, c: 405, f: 118, why: "Rodaje Z2, tirada larga" },
  descanso: { name: "Descanso", short: "Descanso", kcal: 3100, p: 180, c: 340, f: 112, why: "Sin entreno" },
};
const DAY_ORDER = ["duro", "medio", "suave", "descanso"];
const INTENSITY_TO_DAY = { muy: "duro", dura: "duro", carrera: "duro", media: "medio", suave: "suave", libre: "descanso" };

// Comidas: cada alimento lleva gramos por tipo de día [duro, medio, suave, descanso]
const MEALS = [
  {
    id: "des", name: "Desayuno", time: "08:00", note: "2 h antes de entrenar: hidratos fáciles de digerir y poca grasa.",
    options: [
      { id: "A", name: "Tostadas, huevos y zumo", items: [["pan", [170, 150, 130, 110]], ["huevo", [120, 120, 120, 120]], ["aceite", [10, 10, 10, 10]], ["zumo", [400, 350, 300, 250]], ["miel", [20, 15, 10, 0]]] },
      { id: "B", name: "Porridge de avena", items: [["avena", [120, 110, 90, 80]], ["leche", [400, 400, 350, 300]], ["platano", [120, 120, 120, 120]], ["miel", [25, 20, 15, 10]], ["nueces", [20, 20, 20, 20]]] },
    ],
  },
  {
    id: "com", name: "Post-entreno + comida", time: "13:00", note: "Batido nada más terminar y comida en la hora siguiente. Añade la creatina al batido.",
    options: [
      { id: "A", name: "Batido + arroz con pollo", items: [["whey", [25, 25, 25, 25]], ["creatina", [5, 5, 5, 5]], ["platano", [120, 120, 0, 0]], ["arroz", [200, 170, 140, 110]], ["pollo", [150, 150, 150, 150]], ["aceite", [20, 20, 20, 20]], ["verdura", [150, 150, 200, 200]]] },
      { id: "B", name: "Batido + pasta boloñesa", items: [["whey", [25, 25, 25, 25]], ["creatina", [5, 5, 5, 5]], ["platano", [120, 120, 0, 0]], ["pasta", [190, 160, 130, 110]], ["ternera", [140, 140, 140, 140]], ["tomate", [150, 150, 150, 150]], ["aceite", [15, 15, 15, 15]], ["parmesano", [15, 15, 15, 15]]] },
    ],
  },
  {
    id: "mer", name: "Merienda", time: "17:30", note: "El batido casero es la forma más fácil de meter ~1.000 kcal sin llenarte.",
    options: [
      { id: "A", name: "Batido ganador casero", items: [["leche", [500, 450, 400, 350]], ["avena", [90, 80, 60, 50]], ["platano", [120, 120, 120, 120]], ["cacahuete", [30, 30, 25, 25]], ["miel", [20, 15, 10, 0]]] },
      { id: "B", name: "Bocadillo de atún, fruta y frutos secos", items: [["pan", [180, 160, 130, 110]], ["atun", [80, 80, 80, 80]], ["aceite", [10, 10, 10, 10]], ["fruta", [200, 200, 150, 150]], ["nueces", [30, 30, 30, 30]]] },
    ],
  },
  {
    id: "cen", name: "Cena", time: "21:00", note: "Proteína lenta antes de dormir (skyr). Si no tienes hambre, deja el skyr para la última hora.",
    options: [
      { id: "A", name: "Salmón con patatas", items: [["patata", [600, 500, 400, 320]], ["salmon", [150, 150, 150, 150]], ["aceite", [15, 15, 15, 15]], ["verdura", [150, 150, 150, 150]], ["skyr", [125, 125, 125, 125]]] },
      { id: "B", name: "Wraps de pollo y aguacate", items: [["wrap", [240, 200, 160, 130]], ["pollo", [150, 150, 150, 150]], ["aguacate", [80, 80, 80, 80]], ["verdura", [100, 100, 100, 100]], ["skyr", [125, 125, 125, 125]], ["miel", [15, 15, 10, 10]]] },
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
];

const DIET_RULES = [
  "Objetivo: ganar 0,4–0,7 kg por semana (media de 7 días del peso en ayunas). Más rápido es casi todo grasa.",
  "Si en 2 semanas la media sube menos de 0,25 kg/semana: +250 kcal/día (botón «Subir 250 kcal»).",
  "Si sube más de 1 kg/semana durante 2 semanas: −250 kcal/día.",
  "Proteína 2,2–2,5 g/kg repartida en 4–5 tomas. Lo que más importa para crecer son las calorías totales y entrenar fuerte.",
  "Poco apetito: bebe las calorías (batido ganador, leche, zumo), usa aceite y frutos secos, y no llenes el plato de verdura en las comidas grandes.",
  "Creatina 5 g todos los días (también los de descanso). No hace falta cargarla.",
  "Agua: 3–4 L/día y más en sesiones largas. Una pizca de sal en el agua del entreno si sudas mucho.",
  "Pésate cada mañana después del baño y antes de desayunar. Un día suelto no significa nada: mira la media semanal.",
];

// Gramos de un alimento en un tipo de día
const dayIdx = (type) => Math.max(0, DAY_ORDER.indexOf(type));
function itemGrams(item, type) { return Array.isArray(item[1]) ? item[1][dayIdx(type)] : item[1]; }
function macrosOf(key, g) {
  const f = FOODS[key];
  const m = g / 100;
  return { k: f.k * m, p: f.p * m, c: f.c * m, f: f.f * m };
}
function sumMacros(list) {
  return list.reduce((a, x) => ({ k: a.k + x.k, p: a.p + x.p, c: a.c + x.c, f: a.f + x.f }), { k: 0, p: 0, c: 0, f: 0 });
}
function fmtAmount(key, g) {
  const f = FOODS[key];
  if (f.unit === "ud") {
    const n = Math.round((g / f.unitG) * 2) / 2;
    return `${String(n).replace(".", ",")} ud`;
  }
  return `${Math.round(g)} ${f.unit === "ml" ? "ml" : "g"}`;
}
