// Planificación: hipertrofia + funcional + 10K (15 semanas, 23 nov 2026 – 7 mar 2027)
// Prioridad: ganar músculo. La carrera se entrena 3 días (series, umbral y tirada larga).
// Cada día: [título, tipo, intensidad, duración, detalle (pasos separados por " · "), fuerza[], métricas]
// tipo: run | strength | hybrid | test | rest | race
// intensidad: suave | media | dura | muy | carrera | libre

const PLAN_START = "2026-11-23"; // lunes S1
const RACE_DATE = "2027-03-06"; // sábado: 10K
const PLAN_END = "2027-03-07";

const ATHLETE = {
  weightRef: 81,
  goal: "10K · 6 mar 2027",
  targets: {
    A: { label: "Objetivo A (sub-38)", pace: "3:48/km", total: "37:59" },
    B: { label: "Objetivo B (39:30)", pace: "3:57/km", total: "39:30" },
  },
};

const PHASES = {
  base: { name: "Base", color: "phase-base" },
  descarga: { name: "Descarga", color: "phase-deload" },
  desarrollo: { name: "Desarrollo", color: "phase-esp1" },
  especifica: { name: "Específica 10K", color: "phase-esp2" },
  afinado: { name: "Afinado", color: "phase-taper" },
  carrera: { name: "Semana del 10K", color: "phase-race" },
};

const METRIC_SETS = {
  test5k: [
    { key: "t5k", label: "Tiempo 5 km", unit: "m:ss", hint: "19:45" },
    { key: "t5k_hr", label: "FC media", unit: "ppm", hint: "" },
  ],
  test10k: [
    { key: "t10k", label: "Tiempo 10 km", unit: "m:ss", hint: "39:30" },
    { key: "t10k_hr", label: "FC media", unit: "ppm", hint: "" },
  ],
  race10k: [
    { key: "race10k", label: "Tiempo oficial 10K", unit: "m:ss", hint: "37:59" },
    { key: "race_hr", label: "FC media", unit: "ppm", hint: "" },
  ],
};

const D = (title, kind, intensity, duration, detail, strength = [], metrics = null) =>
  ({ title, kind, intensity, duration, detail, strength, metrics });

// Finishers funcionales por fase (sin castigar la pierna antes de correr)
const FX = {
  base1: "Funcional 10': 3 rondas de 250 m remo + 10 KB swings (24 kg) + 20 m farmers (2 × 32 kg); 1' entre rondas",
  base2: "Funcional 10': 4 × (25 m sled push moderado + 10 wall balls), rec 1'",
  des1: "Funcional EMOM 12': min 1, 12 cal remo · min 2, 12 KB swings · min 3, 40 m farmers",
  des2: "Funcional AMRAP 12': 200 m SkiErg + 10 burpees + 15 wall balls",
  esp1: "Funcional 10': 5 × (10 cal SkiErg + 8 thrusters con mancuernas 2 × 15 kg), rec 45\"",
  esp2: "Funcional 10': 4 × (25 m sled push pesado + 20 m sandbag carry), rec 1'",
  afi1: "Funcional 8': 4 × (200 m remo progresivo + 10 KB swings), suave",
  core: "Core 10': plancha 3 × 40\" · Pallof 3 × 12/lado · dead bug 3 × 10",
};

const WEEKS = [
  {
    week: 1, phase: "base", title: "Vuelta a correr", focus: "Trote suave con pausas andando; cargas de fuerza a RIR 3",
    key: "Correr 3 días sin molestias", sunday: "35' trote + andar", km: 12,
    notes: ["Llevas meses sin correr: esta semana solo se trata de que tendones y articulaciones se vuelvan a acostumbrar. Todo en Z1–Z2, debes poder hablar.",
      "Si algo molesta (tibia, gemelo, rodilla, Aquiles), alarga las pausas andando. No hay test hasta la S4.",
      "En fuerza, busca cargas a RIR 3 (cómodas). Apunta todo."],
    days: [
      D("Rodaje suave + Torso A", "hybrid", "suave", "25' + 60'", "Mañana: 5' andando rápido · 4 × (4' trote Z1–Z2 + 1' andando) · 5' andando · Tarde: Torso A (buscar cargas a RIR 3)", ["TA"]),
      D("Pierna A + funcional", "strength", "dura", "75'", "Pierna A (buscar cargas a RIR 3) · " + FX.base1, ["PA"]),
      D("Torso B", "strength", "media", "65'", "Torso B · 10' de movilidad de cadera y tobillo", ["TB"]),
      D("Rodaje suave + Brazos", "hybrid", "suave", "30' + 45'", "Mañana: 5' andando · 4 × (5' trote Z2 + 1' andando) · Tarde: Brazos y hombro", ["BR"]),
      D("Pierna B + funcional", "strength", "dura", "75'", "Pierna B (buscar cargas a RIR 3) · " + FX.base2, ["PB"]),
      D("Descanso", "rest", "libre", "—", "Descanso total · Paseo si te apetece"),
      D("Rodaje largo suave", "run", "suave", "35'", "5' andando · 5 × (5' trote Z2 + 1' andando) · Si vas muy bien, los dos últimos bloques sin andar"),
    ],
  },
  {
    week: 2, phase: "base", title: "Vuelta a correr: continuo", focus: "Rodajes continuos en Z2 y primeras aceleraciones",
    key: "Dom: 45' continuos en Z2", sunday: "45' Z2", km: 17,
    notes: ["Ya sin pausas andando si la S1 fue bien. Si no, repite la S1."],
    days: [
      D("Rodaje + Torso A", "hybrid", "suave", "30' + 60'", "Mañana: 30' continuos en Z2 · 4 × 15\" progresivos (sin esprintar), rec andando · Tarde: Torso A", ["TA"]),
      D("Pierna A + funcional", "strength", "dura", "75'", "Pierna A · " + FX.base1, ["PA"]),
      D("Torso B", "strength", "media", "65'", "Torso B", ["TB"]),
      D("Rodaje + Brazos", "hybrid", "suave", "35' + 45'", "Mañana: 35' continuos en Z2 · 4 × 20\" progresivos · Tarde: Brazos y hombro", ["BR"]),
      D("Pierna B + funcional", "strength", "dura", "75'", "Pierna B · " + FX.base2, ["PB"]),
      D("Descanso", "rest", "libre", "—", "Descanso total"),
      D("Rodaje largo", "run", "suave", "45'", "45' continuos en Z2 (≈ 8 km)"),
    ],
  },
  {
    week: 3, phase: "base", title: "Base: primer cambio de ritmo", focus: "Fartlek suave y tirada de 10 km",
    key: "Jue: fartlek 6 × 2'", sunday: "10 km Z2", km: 22,
    notes: ["Primer contacto con ritmos algo más rápidos: cómodo-fuerte, nunca a tope. La semana que viene, test de 5 km."],
    days: [
      D("Rodaje + Torso A", "hybrid", "suave", "40' + 60'", "Mañana: 35' Z2 · 6 × 100 m progresivos, rec andando · Tarde: Torso A", ["TA"]),
      D("Pierna A + funcional", "strength", "dura", "75'", "Pierna A · " + FX.base1, ["PA"]),
      D("Torso B", "strength", "media", "65'", "Torso B", ["TB"]),
      D("Fartlek + Brazos", "hybrid", "media", "40' + 45'", "Mañana: C · 6 × 2' cómodo-fuerte (Z3), rec 2' trote · VC · Tarde: Brazos y hombro", ["BR"]),
      D("Pierna B + funcional", "strength", "dura", "75'", "Pierna B · " + FX.base2, ["PB"]),
      D("Descanso", "rest", "libre", "—", "Descanso total"),
      D("Tirada larga", "run", "media", "55'", "10 km Z2"),
    ],
  },
  {
    week: 4, phase: "descarga", title: "Descarga y test de 5 km", focus: "Test de 5 km fresco; −40 % de volumen",
    key: "Lun: test de 5 km", sunday: "9 km Z2", km: 20,
    notes: ["Test de 5 km el lunes, con la fatiga baja de la descarga: con él fijamos tus ritmos reales y la predicción del 10K.",
      "Sal controlado el primer km y aprieta desde el 3. Mejor regular que heroico."],
    days: [
      D("Test 5 km + Torso A", "test", "dura", "45' + 45'", "Mañana: C (15') con 3 × 100 m progresivos · Test de 5 km, a tope y regular · 2 km Z1 · Tarde: Torso A (descarga)", ["TA"], "test5k"),
      D("Pierna A", "strength", "media", "50'", "Pierna A (descarga) · Sin funcional", ["PA"]),
      D("Torso B", "strength", "suave", "45'", "Torso B (descarga)", ["TB"]),
      D("Rodaje + Brazos", "hybrid", "suave", "35' + 35'", "Mañana: 30' Z2 · 4 × 100 m progresivos · Tarde: Brazos y hombro (descarga)", ["BR"]),
      D("Pierna B ligera", "strength", "suave", "50'", "Pierna B (descarga) · " + FX.core, ["PB"]),
      D("Descanso", "rest", "libre", "—", "Descanso total"),
      D("Tirada suave", "run", "suave", "50'", "9 km Z2"),
    ],
  },
  {
    week: 5, phase: "desarrollo", title: "Desarrollo (Navidad)", focus: "Primeras series y umbral; más volumen de hipertrofia",
    key: "Lun: 6 × 800 m", sunday: "11 km Z2", km: 28,
    notes: ["Los ritmos de las series salen de tu test de 5 km (Z4 y Z5 en la Guía).",
      "Viernes 25 (Navidad): si no puedes entrenar, pasa Pierna B al sábado 26.",
      "Desde esta semana, rodaje opcional de 30' Z2 el miércoles por la mañana si te ves bien: suma volumen para el 10K."],
    days: [
      D("Series + Torso A", "hybrid", "dura", "50' + 65'", "Mañana: C · 6 × 800 m en Z5 (ritmo de tu test de 5 km), rec 400 m trote · VC · Tarde: Torso A", ["TA"]),
      D("Pierna A + funcional", "strength", "dura", "80'", "Pierna A · " + FX.des1, ["PA"]),
      D("Torso B", "strength", "media", "65'", "Opcional por la mañana: 30' Z2 · Torso B", ["TB"]),
      D("Umbral + Brazos", "hybrid", "dura", "50' + 45'", "Mañana: C · 3 × 2 km en Z4, rec 2' · VC · Tarde: Brazos y hombro", ["BR"]),
      D("Pierna B + funcional", "strength", "dura", "80'", "Pierna B · " + FX.des2, ["PB"]),
      D("Descanso", "rest", "libre", "—", "Descanso (o Pierna B si la moviste)"),
      D("Tirada larga", "run", "media", "60'", "11 km Z2 · 6 × 100 m progresivos"),
    ],
  },
  {
    week: 6, phase: "desarrollo", title: "Desarrollo (Año Nuevo)", focus: "Series de 1 km y umbral continuo",
    key: "Lun: 5 × 1.000 m", sunday: "13 km Z2", km: 32,
    notes: ["Viernes 1 de enero: si no entrenas, pasa Pierna B al sábado 2."],
    days: [
      D("Series + Torso A", "hybrid", "dura", "55' + 65'", "Mañana: C · 5 × 1.000 m en Z5, rec 2' trotando · VC · Tarde: Torso A", ["TA"]),
      D("Pierna A + funcional", "strength", "dura", "80'", "Pierna A · " + FX.des1, ["PA"]),
      D("Torso B", "strength", "media", "65'", "Opcional por la mañana: 30' Z2 · Torso B", ["TB"]),
      D("Umbral + Brazos", "hybrid", "dura", "50' + 45'", "Mañana: C · 25' continuos en Z4 · VC · Tarde: Brazos y hombro", ["BR"]),
      D("Pierna B + funcional", "strength", "dura", "80'", "Pierna B · " + FX.des2, ["PB"]),
      D("Descanso", "rest", "libre", "—", "Descanso (o Pierna B si la moviste)"),
      D("Tirada larga", "run", "media", "70'", "13 km Z2"),
    ],
  },
  {
    week: 7, phase: "desarrollo", title: "Desarrollo: ritmo objetivo", focus: "Series a ritmo objetivo y umbral largo",
    key: "Lun: 5 × 1.200 m a RO", sunday: "14 km, 3 últimos a 4:30", km: 35, notes: [],
    days: [
      D("Series a RO + Torso A", "hybrid", "dura", "55' + 65'", "Mañana: C · 5 × 1.200 m a RO, rec 2' · VC · Tarde: Torso A", ["TA"]),
      D("Pierna A + funcional", "strength", "dura", "80'", "Pierna A · " + FX.des1, ["PA"]),
      D("Torso B", "strength", "media", "65'", "Opcional por la mañana: 30' Z2 · Torso B", ["TB"]),
      D("Umbral + Brazos", "hybrid", "dura", "55' + 45'", "Mañana: C · 2 × 4 km en Z4, rec 3' · VC · Tarde: Brazos y hombro", ["BR"]),
      D("Pierna B + funcional", "strength", "dura", "80'", "Pierna B · " + FX.des2, ["PB"]),
      D("Descanso", "rest", "libre", "—", "Descanso total"),
      D("Tirada larga", "run", "media", "75'", "14 km Z2, los 3 últimos a 4:30"),
    ],
  },
  {
    week: 8, phase: "descarga", title: "Descarga y retest de 5 km", focus: "Medir progreso con la fatiga baja",
    key: "Lun: retest de 5 km", sunday: "10 km Z2", km: 24,
    notes: ["Retest de 5 km el lunes: con él ajustamos RO y la predicción del 10K. Para el sub-38 deberías rondar 18:30.",
      "Descarga: columna Descarga en fuerza y sin funcional pesado."],
    days: [
      D("Retest 5 km + Torso A", "test", "dura", "45' + 45'", "Mañana: C (15') con 3 × 100 m progresivos · Retest de 5 km, a tope · 2 km Z1 · Tarde: Torso A (descarga)", ["TA"], "test5k"),
      D("Pierna A", "strength", "media", "50'", "Pierna A (descarga)", ["PA"]),
      D("Torso B", "strength", "suave", "45'", "Torso B (descarga)", ["TB"]),
      D("Tempo corto + Brazos", "hybrid", "media", "40' + 35'", "Mañana: C · 20' en Z4 bajo · VC · Tarde: Brazos y hombro (descarga)", ["BR"]),
      D("Pierna B ligera", "strength", "suave", "50'", "Pierna B (descarga) · " + FX.core, ["PB"]),
      D("Descanso", "rest", "libre", "—", "Descanso total"),
      D("Tirada suave", "run", "suave", "55'", "10 km Z2"),
    ],
  },
  {
    week: 9, phase: "especifica", title: "Específica: ritmo 10K", focus: "Bloques largos cerca de RO",
    key: "Lun: 4 × 2 km", sunday: "16 km Z2", km: 38,
    notes: ["Fase específica: la pierna baja algo de volumen (columna S9–S11) para que las series salgan a ritmo. El torso sigue a tope."],
    days: [
      D("Series + Torso A", "hybrid", "dura", "60' + 65'", "Mañana: C · 4 × 2 km a 3:50, rec 2'30\" · VC · Tarde: Torso A", ["TA"]),
      D("Pierna A + funcional", "strength", "dura", "70'", "Pierna A · " + FX.esp1, ["PA"]),
      D("Torso B", "strength", "media", "65'", "Opcional por la mañana: 30' Z2 · Torso B", ["TB"]),
      D("Progresivo + Brazos", "hybrid", "dura", "50' + 45'", "Mañana: C · 8 km progresivos de 4:30 a 4:00 · VC · Tarde: Brazos y hombro", ["BR"]),
      D("Pierna B + funcional", "strength", "dura", "70'", "Pierna B · " + FX.esp2, ["PB"]),
      D("Descanso", "rest", "libre", "—", "Descanso total"),
      D("Tirada larga", "run", "media", "85'", "16 km Z2"),
    ],
  },
  {
    week: 10, phase: "especifica", title: "Test de 10 km", focus: "Simulacro de 10K para fijar el ritmo",
    key: "Dom: test de 10 km", sunday: "Test de 10 km", km: 34,
    notes: ["El domingo, test de 10 km a tope: decide si sales a 3:48 (A) o a 3:57 (B).",
      "Pierna B del viernes, sin funcional y con una serie menos por ejercicio para llegar fresco."],
    days: [
      D("Series cortas + Torso A", "hybrid", "dura", "55' + 65'", "Mañana: C · 3 series de 4 × 400 m en 1:28, rec 1'; 3' entre series · VC · Tarde: Torso A", ["TA"]),
      D("Pierna A + funcional", "strength", "dura", "70'", "Pierna A · " + FX.esp1, ["PA"]),
      D("Torso B", "strength", "media", "65'", "Opcional por la mañana: 30' Z2 · Torso B", ["TB"]),
      D("Umbral + Brazos", "hybrid", "dura", "55' + 45'", "Mañana: C · 3 × 3 km a 3:55, rec 2' · VC · Tarde: Brazos y hombro", ["BR"]),
      D("Pierna B reducida", "strength", "media", "50'", "Pierna B con una serie menos por ejercicio · Sin funcional", ["PB"]),
      D("Descanso", "rest", "libre", "—", "Descanso total · Cena y desayuno como el día del 10K"),
      D("Test 10 km", "test", "muy", "60'", "C (15') con 2 × 200 m a ritmo · 10 km a tope: primer km a RO, nunca más rápido · Apunta los parciales · 2 km Z1", [], "test10k"),
    ],
  },
  {
    week: 11, phase: "especifica", title: "Pico de carrera", focus: "Semana más dura de carrera",
    key: "Lun: 5 × 1.600 m", sunday: "16 km, 4 últimos a 4:15", km: 40,
    notes: ["Tras el test: si bajaste de 39:00, entrena con RO = 3:48 (A); si no, RO = 3:57 (B). Cámbialo en Datos."],
    days: [
      D("Series + Torso A", "hybrid", "dura", "60' + 65'", "Mañana: C · 5 × 1.600 m a 3:46, rec 2' · VC · Tarde: Torso A", ["TA"]),
      D("Pierna A + funcional", "strength", "dura", "70'", "Pierna A · " + FX.esp1, ["PA"]),
      D("Torso B", "strength", "media", "65'", "Opcional por la mañana: 30' Z2 · Torso B", ["TB"]),
      D("Umbral largo + Brazos", "hybrid", "dura", "60' + 45'", "Mañana: C · 2 × 5 km a 4:00, rec 3' · VC · Tarde: Brazos y hombro", ["BR"]),
      D("Pierna B + funcional", "strength", "dura", "70'", "Pierna B · " + FX.esp2, ["PB"]),
      D("Descanso", "rest", "libre", "—", "Descanso total"),
      D("Tirada larga", "run", "media", "85'", "16 km Z2, los 4 últimos a 4:15"),
    ],
  },
  {
    week: 12, phase: "descarga", title: "Descarga", focus: "−40 % de volumen antes del bloque final",
    key: "Lun: 6 × 800 m", sunday: "11 km Z2", km: 27, notes: ["Descarga: columna Descarga en fuerza."],
    days: [
      D("Series + Torso A", "hybrid", "media", "45' + 45'", "Mañana: C · 6 × 800 m en 3:00 (3:45/km), rec 2' · VC · Tarde: Torso A (descarga)", ["TA"]),
      D("Pierna A", "strength", "media", "50'", "Pierna A (descarga)", ["PA"]),
      D("Torso B", "strength", "suave", "45'", "Torso B (descarga)", ["TB"]),
      D("Tempo + Brazos", "hybrid", "media", "45' + 35'", "Mañana: C · 25' a 4:05 · VC · Tarde: Brazos y hombro (descarga)", ["BR"]),
      D("Pierna B ligera", "strength", "suave", "50'", "Pierna B (descarga) · " + FX.core, ["PB"]),
      D("Descanso", "rest", "libre", "—", "Descanso total"),
      D("Tirada suave", "run", "suave", "60'", "11 km Z2"),
    ],
  },
  {
    week: 13, phase: "afinado", title: "Afinado: último bloque duro", focus: "Ritmo de carrera; pierna en mantenimiento",
    key: "Lun: 3 × 3 km a RO", sunday: "14 km con 5 a 4:05", km: 38,
    notes: ["Última semana dura. Pierna en mantenimiento (columna S13–S14): pesado pero pocas series, sin llegar cerca del fallo."],
    days: [
      D("Ritmo 10K + Torso A", "hybrid", "dura", "60' + 60'", "Mañana: C · 3 × 3 km a RO, rec 2' · VC · Tarde: Torso A", ["TA"]),
      D("Pierna A + funcional", "strength", "dura", "60'", "Pierna A · " + FX.afi1, ["PA"]),
      D("Torso B", "strength", "media", "60'", "Opcional por la mañana: 30' Z2 · Torso B", ["TB"]),
      D("Series + Brazos", "hybrid", "dura", "55' + 40'", "Mañana: C · 6 × 1 km a 3:42, rec 1'30\" · VC · Tarde: Brazos y hombro", ["BR"]),
      D("Pierna B + core", "strength", "media", "55'", "Pierna B · " + FX.core, ["PB"]),
      D("Descanso", "rest", "libre", "—", "Descanso total"),
      D("Tirada con ritmo", "run", "media", "75'", "14 km: 9 km Z2 + 5 km a 4:05"),
    ],
  },
  {
    week: 14, phase: "afinado", title: "Afinado: −30 %", focus: "Menos volumen, intensidad intacta",
    key: "Lun: 4 × 1.600 m a RO", sunday: "10 km Z2", km: 30,
    notes: ["Último entreno de pierna pesada el martes. A partir de aquí, la pierna solo se mantiene."],
    days: [
      D("Ritmo 10K + Torso A", "hybrid", "dura", "55' + 55'", "Mañana: C · 4 × 1.600 m a RO, rec 2' · VC · Tarde: Torso A", ["TA"]),
      D("Pierna A (última pesada)", "strength", "media", "50'", "Pierna A, columna S13–S14 · Sin funcional", ["PA"]),
      D("Torso B", "strength", "media", "55'", "Torso B", ["TB"]),
      D("Umbral + Brazos", "hybrid", "media", "45' + 40'", "Mañana: C · 4 km a 4:05 + 4 × 400 m en 1:28, rec 1' · VC · Tarde: Brazos y hombro", ["BR"]),
      D("Pierna B ligera", "strength", "suave", "40'", "Pierna B, columna S13–S14, solo 2 series por ejercicio · " + FX.core, ["PB"]),
      D("Descanso", "rest", "libre", "—", "Descanso total"),
      D("Rodaje", "run", "suave", "55'", "10 km Z2 · 4 × 100 m"),
    ],
  },
  {
    week: 15, phase: "carrera", title: "Semana del 10K", focus: "Frescura: poco volumen, toques de ritmo",
    key: "Sáb: 10K", sunday: "Descanso", km: 20,
    notes: ["Jueves y viernes: hidratos altos (7–8 g/kg) y poca fibra el viernes.",
      "Sábado: desayuno 3 h antes; calentamiento de 20' que termine 10' antes de la salida."],
    days: [
      D("Toque de ritmo + Torso A ligero", "hybrid", "media", "40' + 45'", "Mañana: C · 3 × 1 km a RO, rec 2' · VC · Tarde: Torso A, columna S15", ["TA"]),
      D("Torso B ligero", "strength", "suave", "40'", "Torso B, columna S15 · Nada de pierna", ["TB"]),
      D("Rodaje suave", "run", "suave", "30'", "25' Z2 + 4 × 100 m progresivos"),
      D("Activación + Brazos ligero", "hybrid", "suave", "30' + 30'", "Mañana: C · 2 km a RO + 4 × 200 m rápidos, rec 200 m · Tarde: Brazos y hombro, columna S15", ["BR"]),
      D("Soltar piernas", "run", "suave", "20'", "15' Z1 + 4 × 100 m · Prepara dorsal, zapatillas y gel"),
      D("10K", "race", "carrera", "~38'", "Desayuno 3 h antes · Calentamiento 20': 10' trote, movilidad, 3 × 100 m progresivos · Km 1 a RO, nunca más rápido · Km 2–7 a RO, sin mirar a nadie · Km 8–10: si vas bien, aprieta · Apunta el tiempo oficial y los parciales", [], "race10k"),
      D("Descanso", "rest", "libre", "—", "Paseo suave · Vuelves al gimnasio el martes"),
    ],
  },
];

// ——— Hipertrofia: Torso/Pierna + brazos ———
// Columnas: S1 (adaptación) · S2–S3 · Descarga (S4, S8, S12) · S5–S7 · S9–S11 · S13–S14 · S15
const COLS = ["S1", "S2–S3", "Descarga", "S5–S7", "S9–S11", "S13–S14", "S15"];
const WEEK_COL = { 1: 0, 2: 1, 3: 1, 4: 2, 5: 3, 6: 3, 7: 3, 8: 2, 9: 4, 10: 4, 11: 4, 12: 2, 13: 5, 14: 5, 15: 6 };

const STRENGTH = {
  TA: {
    name: "Torso A — fuerza e hipertrofia", label: "Torso A", day: "Lunes (tarde)", legs: false,
    cols: COLS, weekCol: WEEK_COL,
    rows: [
      { ex: "Press banca con barra", values: ["4×8 RIR3", "4×6–8 RIR2", "3×6 RIR4", "4×5–7 RIR1–2", "4×6–8 RIR1", "3×6 RIR2", "2×5 RIR3"] },
      { ex: "Dominadas (lastre si haces más de 8)", values: ["4×máx−2", "4×6–8 RIR2", "3×6", "4×6–8 RIR1–2", "4×6–8 RIR1", "3×6 RIR2", "2×5"] },
      { ex: "Press militar con mancuernas", values: ["3×10", "3×8–10 RIR2", "2×8", "4×8–10 RIR1–2", "3×8–10 RIR1", "3×8", "—"] },
      { ex: "Remo con barra", values: ["3×10", "3×8–10 RIR2", "2×8", "4×8–10 RIR1–2", "3×8–10 RIR1", "3×8", "2×8"] },
      { ex: "Press inclinado con mancuernas", values: ["3×10–12", "3×10–12 RIR2", "2×10", "3×10–12 RIR1", "3×10–12 RIR1", "2×10", "—"] },
      { ex: "Face pull", values: ["3×15", "3×15", "2×15", "3×15–20", "3×15–20", "2×15", "2×15"] },
    ],
  },
  PA: {
    name: "Pierna A — sentadilla y cuádriceps", label: "Pierna A", day: "Martes", legs: true,
    cols: COLS, weekCol: WEEK_COL,
    note: "Nunca al fallo en los básicos: la pierna tiene que llegar viva a las series de carrera.",
    rows: [
      { ex: "Sentadilla trasera", values: ["4×8 RIR3", "4×6–8 RIR2", "3×5 RIR4", "4×6–8 RIR2", "4×6 RIR2", "3×5 RIR3", "—"] },
      { ex: "Prensa de piernas", values: ["3×10–12", "3×10–12 RIR2", "2×10", "4×10–12 RIR1", "3×10–12 RIR2", "2×10", "—"] },
      { ex: "Peso muerto rumano", values: ["3×10", "3×8–10 RIR2", "2×8", "3×8–10 RIR2", "3×8 RIR2", "2×8", "—"] },
      { ex: "Extensión de cuádriceps", values: ["3×12–15", "3×12–15 RIR1", "2×12", "4×12–15 RIR0–1", "3×12–15 RIR1", "2×12", "—"] },
      { ex: "Gemelo de pie", values: ["4×10–12", "4×10–12", "2×12", "4×10–12", "4×10–12", "3×12", "—"] },
      { ex: "Rueda abdominal", values: ["3×10", "3×10–12", "2×10", "3×12", "3×12", "2×10", "—"] },
    ],
  },
  TB: {
    name: "Torso B — hipertrofia", label: "Torso B", day: "Miércoles", legs: false,
    cols: COLS, weekCol: WEEK_COL,
    rows: [
      { ex: "Press inclinado con barra", values: ["4×10 RIR3", "4×8–10 RIR2", "3×8", "4×8–10 RIR1", "4×8–10 RIR1", "3×8 RIR2", "2×8 RIR3"] },
      { ex: "Jalón al pecho", values: ["4×10–12", "4×10–12 RIR2", "3×10", "4×10–12 RIR1", "4×10–12 RIR1", "3×10", "2×10"] },
      { ex: "Remo en polea baja", values: ["3×10–12", "3×10–12 RIR2", "2×10", "4×10–12 RIR1", "3×10–12 RIR1", "3×10", "2×10"] },
      { ex: "Fondos en paralelas (lastre si puedes)", values: ["3×8–10", "3×8–10 RIR2", "2×8", "3×8–12 RIR1", "3×8–12 RIR1", "2×8", "—"] },
      { ex: "Aperturas en máquina o polea", values: ["3×12–15", "3×12–15", "2×12", "3×12–15 RIR0–1", "3×12–15 RIR1", "2×12", "—"] },
      { ex: "Elevaciones laterales", values: ["4×12–15", "4×12–20", "2×15", "5×12–20", "4×12–20", "3×15", "2×15"] },
    ],
  },
  BR: {
    name: "Brazos y hombro", label: "Brazos y hombro", day: "Jueves (tarde)", legs: false,
    cols: COLS, weekCol: WEEK_COL,
    rows: [
      { ex: "Curl con barra Z", values: ["3×10", "4×8–12 RIR2", "2×10", "4×8–12 RIR1", "4×8–12 RIR1", "3×10", "2×10"] },
      { ex: "Press francés", values: ["3×10", "4×8–12 RIR2", "2×10", "4×8–12 RIR1", "4×8–12 RIR1", "3×10", "2×10"] },
      { ex: "Curl inclinado con mancuernas", values: ["3×10–12", "3×10–12", "2×10", "3×10–12 RIR0–1", "3×10–12 RIR1", "2×10", "—"] },
      { ex: "Extensión de tríceps en polea", values: ["3×12–15", "3×12–15", "2×12", "3×12–15 RIR0–1", "3×12–15 RIR1", "2×12", "—"] },
      { ex: "Elevaciones laterales en polea", values: ["3×15", "4×12–15", "2×15", "4×15–20", "4×15", "3×15", "2×15"] },
      { ex: "Pájaros (deltoides posterior)", values: ["3×15", "3×15", "2×15", "3×15–20", "3×15", "2×15", "—"] },
      { ex: "Curl martillo", values: ["2×12", "3×12", "2×12", "3×12", "3×12", "2×12", "—"] },
    ],
  },
  PB: {
    name: "Pierna B — bisagra y glúteo", label: "Pierna B", day: "Viernes", legs: true,
    cols: COLS, weekCol: WEEK_COL,
    note: "Vigila lumbar y cadera en el peso muerto: técnica antes que kilos.",
    rows: [
      { ex: "Peso muerto convencional", values: ["4×6 RIR3", "4×5 RIR2", "3×4 RIR4", "4×5 RIR2", "3×5 RIR2", "3×4 RIR3", "—"] },
      { ex: "Zancada búlgara (mancuernas)", values: ["3×8/pierna", "3×8–10 RIR2", "2×8", "3×10 RIR1–2", "3×8 RIR2", "2×8", "—"] },
      { ex: "Hip thrust", values: ["3×10", "4×8–10 RIR2", "2×10", "4×8–12 RIR1", "3×8–10 RIR1", "2×10", "—"] },
      { ex: "Curl femoral", values: ["3×10–12", "4×10–12 RIR1", "2×10", "4×10–12 RIR0–1", "3×10–12 RIR1", "2×10", "—"] },
      { ex: "Gemelo sentado", values: ["3×15", "4×12–15", "2×15", "4×15", "4×15", "3×15", "—"] },
      { ex: "Elevación de piernas colgado", values: ["3×10", "3×12", "2×10", "3×12–15", "3×12–15", "2×12", "—"] },
    ],
  },
};
const STRENGTH_ORDER = ["TA", "PA", "TB", "BR", "PB"];

const STRENGTH_RULES = [
  "RIR = repeticiones en reserva. RIR 2 es acabar sabiendo que podías hacer 2 más. RIR 0–1 solo en aislamientos.",
  "Doble progresión: cuando hagas todas las series en el máximo del rango de reps con el RIR objetivo, sube 2,5 kg en torso y brazos, y 5 kg en pierna.",
  "Pierna: nunca al fallo en sentadilla y peso muerto. Si el día siguiente hay series de carrera, quita una serie antes que apurar.",
  "Calienta 5' en ergo y haz 2–3 series de aproximación del primer ejercicio.",
  "Dobles: carrera por la mañana y fuerza por la tarde, con al menos 6 h entre medias y una comida.",
  "Volumen orientativo por semana: 14–20 series de pecho, espalda y hombro; 10–14 de cuádriceps y femoral; 10–12 de bíceps y tríceps.",
];

const ZONES = [
  { z: "Z1", name: "Recuperación", use: "Calentar, enfriar", pace: "5:40–6:10/km", erg: "—", hr: "<80 %" },
  { z: "Z2", name: "Aeróbico", use: "Tiradas y rodajes", pace: "5:00–5:30/km", erg: "—", hr: "80–88 %" },
  { z: "Z3", name: "Ritmo medio", use: "Progresivos", pace: "4:25–4:40/km", erg: "—", hr: "89–94 %" },
  { z: "Z4", name: "Umbral", use: "Tempo y bloques largos", pace: "4:00–4:12/km", erg: "—", hr: "95–100 %" },
  { z: "RO", name: "Ritmo 10K", use: "A: 3:48 · B: 3:57", pace: "3:48/km", erg: "—", hr: "100–104 %" },
  { z: "Z5", name: "VO2máx", use: "Series de 600–1.600 m", pace: "3:40–3:50/km", erg: "—", hr: ">102 %" },
  { z: "VEL", name: "Velocidad", use: "200–400 m", pace: "3:30–3:38/km", erg: "—", hr: "—" },
];

const FATIGUE = {
  signals: [
    "FC en reposo 7+ ppm por encima de tu media de la semana.",
    "VFC nocturna por debajo de tu rango normal dos noches seguidas.",
    "Menos de 6 h de sueño.",
    "Piernas pesadas en el calentamiento, o RPE 1–2 puntos más alto al mismo ritmo o peso.",
  ],
  lights: [
    { c: "verde", when: "0 señales", what: "Sesión tal cual." },
    { c: "amarillo", when: "1–2 señales", what: "Series de carrera a Z2 o un 30 % menos. En fuerza, una serie menos por ejercicio y RIR +1." },
    { c: "rojo", when: "3–4 señales, dolor articular, fiebre", what: "Descanso, o 30' Z1 / movilidad. Vuelve a valorar mañana." },
  ],
  missed: [
    "Prioridad si vas justo de tiempo: Torso A > Pierna A > series del lunes > tirada larga > Torso B > Pierna B > Brazos > umbral.",
    "Sesión perdida: no la recuperes juntándola con otra. Sigue la semana tal cual.",
    "Si pierdes las series del lunes, haz el umbral del jueves y las series el sábado (descanso) solo si estás fresco.",
    "Nunca pongas Pierna A o B el día antes de series o test.",
    "Semana entera perdida: la siguiente es de descarga y luego retomas donde lo dejaste.",
  ],
};

const ABBR = [
  ["C", "Calentamiento: 2 km Z1–Z2, 5' de movilidad dinámica y 4 × 80 m progresivos."],
  ["VC", "Vuelta a la calma: 1,5 km en Z1."],
  ["rec", "Recuperación entre series (trotando salvo que diga «andando»)."],
  ["RO", "Ritmo objetivo del 10K: 3:48/km (A, sub-38) o 3:57/km (B, 39:30)."],
  ["RIR", "Repeticiones en reserva al acabar la serie."],
];

const RACE_TIPS = [
  "Km 1: el más peligroso. Sal a RO y nunca más rápido; 5\" de más ahí se pagan con 30\" al final.",
  "Km 2–7: ritmo constante a RO. Corre tu carrera, no la de los de alrededor.",
  "Km 8–10: si vas bien, aprieta poco a poco; los últimos 400 m, todo.",
  "Reloj: vuelta automática cada km y en pantalla el ritmo de la vuelta.",
  "Gel o nada: para 38–40' no hace falta comer. Un sorbo de agua si hay avituallamiento y hace calor.",
  "Zapatillas y ropa: nada nuevo. Prueba lo que llevarás en el test de 10 km (S10).",
];

// ——— Construcción de sesiones con fechas ———
const DOW = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function addDays(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

WEEKS.forEach((w) => {
  w.id = "k" + String(w.week).padStart(2, "0"); // "k" = plan 10K (no choca con registros de planes anteriores)
  w.start = addDays(PLAN_START, (w.week - 1) * 7);
  w.end = addDays(w.start, 6);
  w.sessions = w.days.map((d, i) => {
    const date = addDays(w.start, i);
    const dd = Number(date.slice(8, 10));
    return {
      ...d,
      id: `${w.id}d${i + 1}`,
      week: w.week,
      dow: i + 1,
      date,
      day: `${DOW[i]} ${dd}`,
      steps: d.detail.split(" · ").map((s) => s.trim()).filter(Boolean),
    };
  });
});
