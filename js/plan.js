// Planificación de entrenamiento — 13 semanas
// Cada día: [título, tipo, intensidad, duración, detalle (pasos separados por " · "), fuerza[], métricas]
// tipo: run | strength | hybrid | test | sim | rest | race (prueba final)
// intensidad: suave | media | dura | muy | carrera | libre

const PLAN_START = "2026-11-09"; // lunes S1
const RACE_DATE = "2027-02-06"; // día clave de la semana 13
const PLAN_END = "2027-02-07";

const ATHLETE = {
  weightRef: 81,
  targets: {
    A: { label: "Ritmo objetivo A", pace: "4:00/km", total: "59:50" },
    B: { label: "Ritmo objetivo B", pace: "4:12/km", total: "64:51" },
  },
};

const PHASES = {
  base: { name: "Base y técnica", color: "phase-base" },
  descarga: { name: "Descarga", color: "phase-deload" },
  esp1: { name: "Específica I", color: "phase-esp1" },
  esp2: { name: "Específica II", color: "phase-esp2" },
  taper: { name: "Puesta a punto", color: "phase-taper" },
  carrera: { name: "Semana final", color: "phase-race" },
};

// Métricas por tipo de sesión
const METRIC_SETS = {
  test30: [
    { key: "dist30", label: "Distancia 30'", unit: "m", hint: "p. ej. 7600" },
    { key: "pace30", label: "Ritmo medio", unit: "min/km", hint: "3:57" },
    { key: "hr20", label: "FC media últimos 20'", unit: "ppm", hint: "FC umbral" },
    { key: "bench", label: "Press banca (carga 4×8)", unit: "kg", hint: "" },
  ],
  test5rm: [
    { key: "sq5rm", label: "5RM sentadilla", unit: "kg", hint: "" },
    { key: "dl5rm", label: "5RM peso muerto", unit: "kg", hint: "" },
  ],
  testErg: [
    { key: "ski1000", label: "1.000 m SkiErg", unit: "m:ss", hint: "3:45" },
    { key: "row1000", label: "1.000 m remo", unit: "m:ss", hint: "3:35" },
  ],
  retestErg: [
    { key: "ski1000r", label: "Retest 1.000 m SkiErg", unit: "m:ss", hint: "" },
    { key: "row1000r", label: "Retest 1.000 m remo", unit: "m:ss", hint: "" },
  ],
  testStations: [
    { key: "push50", label: "Sled push 50 m (152 kg)", unit: "m:ss", hint: "" },
    { key: "pull50", label: "Sled pull 50 m (103 kg)", unit: "m:ss", hint: "" },
    { key: "farm200", label: "Farmers 200 m (2×24)", unit: "m:ss", hint: "" },
    { key: "lunge100", label: "Lunges 100 m (20 kg)", unit: "m:ss", hint: "" },
    { key: "bbj40", label: "Burpee broad jumps 40 m", unit: "m:ss", hint: "×2 = 80 m" },
    { key: "wbmax", label: "Wall balls seguidas", unit: "reps", hint: "" },
    { key: "wb100", label: "100 wall balls", unit: "m:ss", hint: "" },
  ],
  simHalf1: [
    { key: "half1", label: "Tiempo total", unit: "m:ss", hint: "" },
    { key: "runavg", label: "Ritmo medio carrera", unit: "min/km", hint: "" },
    { key: "s_ski", label: "SkiErg 1.000 m", unit: "m:ss", hint: "" },
    { key: "s_push", label: "Sled push 50 m", unit: "m:ss", hint: "" },
    { key: "s_pull", label: "Sled pull 50 m", unit: "m:ss", hint: "" },
    { key: "s_bbj", label: "Burpee broad jumps 80 m", unit: "m:ss", hint: "" },
  ],
  simHalf2: [
    { key: "half2", label: "Tiempo total", unit: "m:ss", hint: "" },
    { key: "runavg", label: "Ritmo medio carrera", unit: "min/km", hint: "" },
    { key: "s_row", label: "Remo 1.000 m", unit: "m:ss", hint: "" },
    { key: "s_farm", label: "Farmers 200 m", unit: "m:ss", hint: "" },
    { key: "s_lunge", label: "Lunges 100 m", unit: "m:ss", hint: "" },
    { key: "s_wb", label: "100 wall balls", unit: "m:ss", hint: "" },
  ],
  simFull: [
    { key: "total", label: "Tiempo total", unit: "h:mm:ss", hint: "1:02:30" },
    { key: "run", label: "Carrera total (8 km)", unit: "m:ss", hint: "" },
    { key: "runavg", label: "Ritmo medio carrera", unit: "min/km", hint: "" },
    { key: "s_ski", label: "SkiErg", unit: "m:ss", hint: "" },
    { key: "s_push", label: "Sled push", unit: "m:ss", hint: "" },
    { key: "s_pull", label: "Sled pull", unit: "m:ss", hint: "" },
    { key: "s_bbj", label: "Burpee broad jumps", unit: "m:ss", hint: "" },
    { key: "s_row", label: "Remo", unit: "m:ss", hint: "" },
    { key: "s_farm", label: "Farmers carry", unit: "m:ss", hint: "" },
    { key: "s_lunge", label: "Sandbag lunges", unit: "m:ss", hint: "" },
    { key: "s_wb", label: "Wall balls", unit: "m:ss", hint: "" },
    { key: "weak", label: "Estación más débil", unit: "texto", hint: "" },
  ],
  blocks: [
    { key: "blocks", label: "Tiempo total", unit: "m:ss", hint: "" },
    { key: "runavg", label: "Ritmo medio carrera", unit: "min/km", hint: "" },
  ],
};

const D = (title, kind, intensity, duration, detail, strength = [], metrics = null) =>
  ({ title, kind, intensity, duration, detail, strength, metrics });

const WEEKS = [
  {
    week: 1, phase: "base", title: "Tests y técnica", focus: "Tests y técnica de estaciones",
    key: "Sáb: tests de estaciones", sunday: "10 km Z2", km: 32,
    notes: ["Arranque prudente: si has corrido poco, recorta un 20 % el rodaje del miércoles y la tirada del domingo.",
      "Apunta todos los resultados de los tests: recalcularemos zonas, cargas y tiempo estimado."],
    days: [
      D("Test 30' + Fuerza B", "test", "dura", "90'", "C (15') · Test de 30' en pista: a tope y lo más regular posible, solo · 2 km Z1 · Fuerza B, columna S1 (buscar cargas)", ["B"], "test30"),
      D("Fuerza A (test) + técnica de trineos", "test", "dura", "90'", "Test 5RM de sentadilla y peso muerto · Resto de Fuerza A S1 · Sled push 4 × 12,5 m con ~110 kg con trineo, rec 90\" · Sled pull 4 × 12,5 m con ~80 kg, rec 90\"", ["A"], "test5rm"),
      D("Rodaje Z2", "run", "suave", "55'", "40' Z2 · 6 × 80 m progresivos · 15' de movilidad de cadera y tobillo"),
      D("Tests de ergos + técnica", "test", "dura", "70'", "10' remo Z1–Z2 · 1.000 m SkiErg a tope (damper 5–6) · 15' suave · 1.000 m remo a tope · Wall balls 5 × 10 (6 kg, 3 m), rec 1' · Burpee broad jumps 4 × 8, rec 1'", [], "testErg"),
      D("Fuerza C + ergo", "strength", "media", "70'", "Fuerza C · 25' remo Z2", ["C"]),
      D("Tests de estaciones", "test", "muy", "90'", "C · Sled push 50 m a 152 kg (tiempo) · 5' · Sled pull 50 m a 103 kg · 5' · Farmers carry 200 m con 2 × 24 kg · 3' · Lunges 100 m con 20 kg · 3' · Burpee broad jumps 40 m (tiempo × 2 = estimación de 80 m) · 3' · Wall balls: máximo seguido y luego completar 100 (tiempo total)", [], "testStations"),
      D("Tirada larga", "run", "suave", "55'", "10 km Z2 · 10' de movilidad"),
    ],
  },
  {
    week: 2, phase: "base", title: "Volumen aeróbico", focus: "Volumen aeróbico, fuerza 4×6",
    key: "Sáb: híbrido largo 3 rondas Z3", sunday: "11 km Z2", km: 42, notes: [],
    days: [
      D("Pista VO2 + Fuerza B", "hybrid", "dura", "90'", "C · 5 × 800 m en 3:08 (3:55/km), rec 400 m trote · VC · Fuerza B S2", ["B"]),
      D("Fuerza A + trineos", "strength", "dura", "85'", "Fuerza A S2 · Sled push 6 × 12,5 m a 152 kg, rec 90\" · Sled pull 4 × 12,5 m a 103 kg, rec 90\"", ["A"]),
      D("Rodaje Z2", "run", "suave", "50'", "35' Z2 · 6 × 80 m · Movilidad"),
      D("Umbral + estaciones", "hybrid", "dura", "70'", "C · 3 rondas: 1.200 m a 4:15 + 500 m SkiErg a 2:00 + 20 wall balls; 2' entre rondas · VC"),
      D("Fuerza C + ergo", "strength", "media", "70'", "Fuerza C · 25' alternando 5' SkiErg y 5' remo en Z2", ["C"]),
      D("Híbrido largo Z3", "hybrid", "muy", "90'", "C · 3 rondas: 1 km a 4:35 + 500 m remo a 2:05 + 1 km a 4:35 + 100 m farmers (2 × 24 kg) + 25 m lunges (20 kg) + 25 wall balls; 3' entre rondas · VC"),
      D("Tirada larga", "run", "suave", "60'", "11 km Z2"),
    ],
  },
  {
    week: 3, phase: "base", title: "Primer bloque específico", focus: "Trineos pesados, primera carrera comprometida",
    key: "Sáb: parcial 1.ª mitad", sunday: "12 km Z2", km: 48, notes: [],
    days: [
      D("Pista + Fuerza B", "hybrid", "dura", "90'", "C · 5 × 1.000 m a 3:55, rec 2' · 4 × 200 m en 43\", rec 200 m andando · VC · Fuerza B S3", ["B"]),
      D("Fuerza A + trineos pesados", "strength", "dura", "90'", "Fuerza A S3 · Sled push 5 × 12,5 m a ~180 kg, rec 2', y 3 × 12,5 m a 152 kg rápido · Sled pull 4 × 12,5 m a ~120 kg y 2 × 25 m a 103 kg, rec 2'", ["A"]),
      D("Rodaje Z2", "run", "suave", "60'", "45' Z2 · 6 × 80 m · Movilidad"),
      D("Carrera comprometida", "hybrid", "dura", "75'", "C · 4 rondas de estación + 1 km a 4:15–4:20 justo después; 2' entre rondas · Estaciones: 500 m SkiErg fuerte · 25 m sled push a 152 kg · 20 burpee broad jumps · 500 m remo fuerte · VC · Los primeros 200 m tras cada estación, controlados; después, al ritmo"),
      D("Fuerza C + ergo", "strength", "media", "75'", "Fuerza C · 30' remo Z2", ["C"]),
      D("Simulacro parcial: 1.ª mitad", "sim", "muy", "75'", "C · 1 km + SkiErg 1.000 m + 1 km + sled push 50 m + 1 km + sled pull 50 m + 1 km + burpee broad jumps 80 m, sin pausas · Carrera a 4:15–4:20 y estaciones a RPE 8 · Apunta cada parcial · VC", [], "simHalf1"),
      D("Tirada larga", "run", "suave", "65'", "12 km Z2"),
    ],
  },
  {
    week: 4, phase: "descarga", title: "Descarga", focus: "−40 % volumen, retest ergos",
    key: "Sáb: retest SkiErg y remo", sunday: "8 km Z2", km: 28, notes: ["Semana de descarga: −40 % de volumen. Llega fresco al retest del sábado."],
    days: [
      D("Pista suave + Fuerza B", "hybrid", "media", "75'", "C · 4 × 800 m en 3:08, rec 2' · VC · Fuerza B S4", ["B"]),
      D("Fuerza A + técnica", "strength", "media", "70'", "Fuerza A S4 · Sled push 4 × 12,5 m a 152 kg y sled pull 4 × 12,5 m a 103 kg, solo técnica, rec 2'", ["A"]),
      D("Rodaje", "run", "suave", "40'", "35' Z2 · 4 × 80 m"),
      D("Técnica de estaciones", "hybrid", "media", "50'", "10' remo Z2 · Wall balls 5 × 15, rec 1' (espira al lanzar) · Burpee broad jumps 3 × 10 · Lunges 2 × 25 m · 10' SkiErg Z2"),
      D("Fuerza C ligera", "strength", "suave", "50'", "Fuerza C, columna de descarga · Si vas cargado, 30' de natación suave + movilidad", ["C"]),
      D("Retest de ergos", "test", "dura", "60'", "10' remo Z1–Z2 · 1.000 m SkiErg a tope · 15' suave · 1.000 m remo a tope · 20' rodaje Z2", [], "retestErg"),
      D("Tirada corta", "run", "suave", "45'", "8 km Z2, o descanso total si la semana se te ha hecho pesada"),
    ],
  },
  {
    week: 5, phase: "esp1", title: "Umbral y wall balls", focus: "Umbral, wall balls en volumen",
    key: "Sáb: parcial 2.ª mitad con prefatiga", sunday: "13 km Z2", km: 50, notes: [],
    days: [
      D("Pista + Fuerza B", "hybrid", "dura", "90'", "C · 3 bloques de 1.000 m a 3:55 (rec 2') + 600 m a 3:45; 3' entre bloques · VC · Fuerza B S5–S7", ["B"]),
      D("Fuerza A + trineos", "strength", "dura", "90'", "Fuerza A S5–S7 · Sled push 4 × 25 m (dos tramos seguidos) a 152 kg, rec 2' · Sled pull 4 × 25 m a 103 kg, rec 2'", ["A"]),
      D("Rodaje Z2", "run", "suave", "60'", "45' Z2 · 6 × 80 m · Movilidad"),
      D("Umbral comprometido", "hybrid", "dura", "75'", "C · 4 rondas: 1.500 m a 4:12 + 30 wall balls (seguidos o 15 + 15); 2' entre rondas · VC"),
      D("Fuerza C + ergo", "strength", "media", "75'", "Fuerza C · 30' alternando SkiErg y remo en Z2", ["C"]),
      D("Simulacro parcial: 2.ª mitad con prefatiga", "sim", "muy", "90'", "C · Prefatiga: 2 km a 4:30 + 500 m SkiErg + 25 m sled push · 3' · Después, sin pausas: 1 km + remo 1.000 m + 1 km + farmers 200 m + 1 km + lunges 100 m + 1 km + 100 wall balls · Carrera a 4:15 y estaciones a RPE 8–9 · VC", [], "simHalf2"),
      D("Tirada larga", "run", "suave", "70'", "13 km Z2, los 2 últimos a 4:40"),
    ],
  },
  {
    week: 6, phase: "esp1", title: "Semana del simulacro #1", focus: "Semana de simulacro",
    key: "Sáb: completo #1 (90 %)", sunday: "8 km Z1", km: 46,
    notes: ["Tras el simulacro #1: si el total baja de 66', entrenamos con los ritmos del objetivo A; si pasa de 68', con los del B.",
      "La estación que más se aleje de su objetivo recibe una ronda extra cada jueves hasta la S11."],
    days: [
      D("Pista + Fuerza B", "hybrid", "dura", "90'", "C · 8 × 600 m en 2:17 (3:48/km), rec 1'30\" · VC · Fuerza B", ["B"]),
      D("Fuerza A + trineos pesados", "strength", "dura", "90'", "Fuerza A · Sled push 5 × 12,5 m a ~190 kg, rec 2', y 3 × 12,5 m a 152 kg rápido · Sled pull 4 × 12,5 m a ~125 kg, rec 2'", ["A"]),
      D("Rodaje Z2", "run", "suave", "50'", "40' Z2 · 6 × 80 m"),
      D("Tempo", "run", "dura", "60'", "C · 5 km seguidos a 4:15 (pista, o cinta al 1 %) · 3 × 20 wall balls, rec 1' · VC"),
      D("Fuerza C reducida", "strength", "suave", "45'", "Solo torso, 2 series por ejercicio y sin farmers · 20' remo Z2", ["C"]),
      D("Simulacro completo #1 (90 %)", "sim", "muy", "100'", "Rutina de día clave: desayuno 3 h antes y C de 15' con 2 × 200 m a ritmo · Circuito completo con las 8 estaciones a peso de referencia · Carrera a 4:15–4:20, estaciones a RPE 8, wall balls en series 25-25-20-15-15 · Apunta los 8 km, las 8 estaciones y el total; las transiciones salen por diferencia · VC", [], "simFull"),
      D("Recuperación", "run", "suave", "45'", "8 km Z1, o 30' de natación suave + movilidad"),
    ],
  },
  {
    week: 7, phase: "esp1", title: "Pico de volumen (Navidad)", focus: "Pico de volumen; Navidad flexible",
    key: "Jue 24: comprometida larga", sunday: "14 km Z2", km: 52,
    notes: ["La sesión clave pasa al jueves 24 por la mañana y el viernes 25 queda libre."],
    days: [
      D("Pista + Fuerza B", "hybrid", "dura", "90'", "C · 6 × 1.000 m a 3:55, rec 1'45\" · VC · Fuerza B", ["B"]),
      D("Fuerza A + estaciones de fuerza", "strength", "dura", "90'", "Fuerza A · Sled push 4 × 25 m a 152 kg, rec 90\" · Farmers 4 × 100 m con 2 × 28 kg · Lunges 4 × 25 m con 25 kg", ["A"]),
      D("Rodaje Z2", "run", "suave", "60'", "45' Z2 · 6 × 80 m"),
      D("Carrera comprometida larga", "sim", "muy", "90'", "C · 6 rondas sin pausa extra: 1 km a 4:10 + una estación al 50 % · Por orden: 500 m SkiErg · 25 m sled push · 25 m sled pull · 40 m burpee broad jumps · 500 m remo · 50 wall balls · VC"),
      D("Libre", "rest", "libre", "—", "Navidad · Si te apetece, paseo largo o 30' de natación suave"),
      D("Umbral + Fuerza C", "hybrid", "dura", "90'", "C · 3 × 2 km a 4:12–4:15, rec 2' · VC · Fuerza C", ["C"]),
      D("Tirada larga", "run", "suave", "75'", "14 km Z2"),
    ],
  },
  {
    week: 8, phase: "descarga", title: "Descarga", focus: "−40 % volumen, técnica",
    key: "Sáb: rodaje con 15' Z3", sunday: "9 km Z2", km: 32, notes: ["Semana de descarga: −40 % de volumen."],
    days: [
      D("Pista suave + Fuerza B", "hybrid", "media", "75'", "C · 4 × 800 m en 3:06, rec 2' · VC · Fuerza B S8", ["B"]),
      D("Fuerza A + técnica", "strength", "media", "60'", "Fuerza A S8 · Sled push y sled pull 3 × 12,5 m cada uno, solo técnica", ["A"]),
      D("Rodaje", "run", "suave", "40'", "35' Z2 · 4 × 80 m"),
      D("Técnica de estaciones", "hybrid", "media", "50'", "Wall balls 4 × 25, rec 1' · Burpee broad jumps 2 × 20 · Farmers 2 × 100 m · 15' remo Z2"),
      D("Libre", "rest", "libre", "—", "Descanso, paseo o natación suave"),
      D("Rodaje con ritmo", "run", "media", "45'", "40' en total: 15' Z2 + 15' Z3 (4:35) + 10' Z2 · 4 × 80 m"),
      D("Tirada corta", "run", "suave", "50'", "9 km Z2"),
    ],
  },
  {
    week: 9, phase: "esp2", title: "Ritmo tras estación", focus: "Ritmo de carrera tras estación",
    key: "Sáb: parcial 2.ª mitad a ritmo", sunday: "14 km Z2", km: 52,
    notes: ["RO = ritmo objetivo: 4:00/km (A) o 4:12/km (B), según el simulacro #1."],
    days: [
      D("Pista + Fuerza B", "hybrid", "dura", "90'", "C · 4 × 1.200 m en 4:38 (3:52/km), rec 2' · 4 × 200 m en 42\", rec 200 m andando · VC · Fuerza B S9–S11", ["B"]),
      D("Fuerza A + trineos rápidos", "strength", "dura", "85'", "Fuerza A S9–S11 · Sled push 6 × 12,5 m a 152 kg a máxima velocidad, rec 2' · Sled pull 6 × 12,5 m a 103 kg, rec 90\"", ["A"]),
      D("Rodaje Z2", "run", "suave", "60'", "45' Z2 · 6 × 80 m"),
      D("Comprometida a ritmo", "hybrid", "dura", "75'", "C · 5 rondas: 1 km a RO + 25 wall balls (rondas impares) o 20 burpee broad jumps (pares); rec 1'30\" · Ronda extra de tu estación más débil · VC"),
      D("Fuerza C + ergo", "strength", "media", "70'", "Fuerza C · 25' SkiErg Z2", ["C"]),
      D("Simulacro parcial: 2.ª mitad a ritmo", "sim", "muy", "100'", "C · Prefatiga a ritmo de carrera: 1 km + 500 m SkiErg + 1 km + 25 m sled push + 1 km + 25 m sled pull · Sin pausa, la 2.ª mitad completa: 1 km + remo 1.000 m + 1 km + farmers 200 m + 1 km + lunges 100 m + 1 km + 100 wall balls · Todo a RO y a los tiempos objetivo de cada estación · VC", [], "simHalf2"),
      D("Tirada larga", "run", "suave", "75'", "14 km Z2, los 3 últimos a 4:30"),
    ],
  },
  {
    week: 10, phase: "esp2", title: "Semana del simulacro #2", focus: "Semana de simulacro",
    key: "Sáb: completo #2 a ritmo", sunday: "8 km Z1", km: 46,
    notes: ["Decisión tras el simulacro #2: ≤61' → plan A (4:00/km) · 61–64' → salir a 4:05/km y apretar desde la estación 6 · >64' → plan B (4:12/km).",
      "Prueba aquí el protocolo de nutrición: el día de la prueba final no se estrena nada."],
    days: [
      D("Pista + Fuerza B", "hybrid", "dura", "90'", "C · 5 × 1.000 m a 3:55, rec 2' · VC · Fuerza B", ["B"]),
      D("Fuerza A + trineos", "strength", "dura", "80'", "Fuerza A · Sled push 3 × 25 m a 152 kg rápido, rec 2' · Sled pull 3 × 25 m a 103 kg, rec 2'", ["A"]),
      D("Rodaje Z2", "run", "suave", "60'", "45' Z2 · 6 × 80 m"),
      D("Ritmo objetivo corto", "run", "dura", "60'", "C · 4 × 1 km a RO, rec 2' · 2 × 20 wall balls · VC"),
      D("Fuerza C reducida", "strength", "suave", "45'", "Solo torso, 2 series y sin farmers · 20' ergo Z2", ["C"]),
      D("Simulacro completo #2 a ritmo objetivo", "sim", "muy", "100'", "Ensayo real: la misma cena el viernes, el mismo desayuno, calentamiento, ropa y zapatillas que el día de la prueba final · El primer km, como mucho 5\" más rápido que RO · Estaciones a tiempo objetivo · VC", [], "simFull"),
      D("Recuperación", "run", "suave", "45'", "8 km Z1, o natación suave + movilidad"),
    ],
  },
  {
    week: 11, phase: "esp2", title: "Último bloque duro", focus: "Último bloque duro",
    key: "Sáb: circuito por bloques", sunday: "12 km Z2", km: 50, notes: [],
    days: [
      D("Pista + Fuerza B", "hybrid", "dura", "90'", "C · 3 series de 3 × 400 m en 1:28, rec 1'; 3' entre series · VC · Fuerza B", ["B"]),
      D("Fuerza A + trineos", "strength", "dura", "80'", "Fuerza A · Sled push 4 × 12,5 m a 152 kg · Sled pull 4 × 12,5 m a 103 kg, rec 2'", ["A"]),
      D("Rodaje Z2", "run", "suave", "60'", "45' Z2 · 6 × 80 m"),
      D("Umbral + wall balls", "hybrid", "dura", "70'", "C · 2 × 3 km a 4:10, rec 2' · 50 wall balls por tiempo · VC"),
      D("Fuerza C + ergo", "strength", "media", "70'", "Fuerza C · 25' remo Z2", ["C"]),
      D("Circuito por bloques", "sim", "muy", "100'", "C · 8 rondas seguidas: 1 km a RO + estación al 60 % · 600 m SkiErg · 25 m sled push · 25 m sled pull · 50 m burpee broad jumps · 600 m remo · 120 m farmers · 60 m lunges · 60 wall balls · Practica las transiciones: entra y sal de cada estación sin pararte · VC", [], "blocks"),
      D("Tirada larga", "run", "suave", "65'", "12 km Z2"),
    ],
  },
  {
    week: 12, phase: "taper", title: "Puesta a punto", focus: "−25–30 % volumen, intensidad intacta",
    key: "Sáb: ensayo general corto", sunday: "8 km Z2", km: 38,
    notes: ["No intentes recuperar entrenos perdidos en la puesta a punto."],
    days: [
      D("Pista + Fuerza B", "hybrid", "dura", "80'", "C · 4 × 1.000 m a 3:55, rec 2' · VC · Fuerza B S12–S13", ["B"]),
      D("Fuerza A + trineos", "strength", "media", "70'", "Fuerza A S12 · Sled push 3 × 12,5 m y sled pull 3 × 12,5 m a peso de referencia, rápidos, rec 2'", ["A"]),
      D("Rodaje Z2", "run", "suave", "50'", "35' Z2 · 6 × 80 m"),
      D("Ritmo + wall balls", "hybrid", "dura", "60'", "C · 3 rondas: 1 km a RO + 25 wall balls; rec 2' · VC"),
      D("Fuerza C ligera", "strength", "suave", "50'", "Columna S9–S12 con 2 series y RIR 3 · 20' ergo Z2", ["C"]),
      D("Ensayo general corto", "sim", "dura", "70'", "C · 4 rondas: 1 km a RO + estación al 50 % · 500 m SkiErg · 25 m sled push · 25 m sled pull · 40 m burpee broad jumps · Con la ropa, las zapatillas, los guantes (si los usas) y el gel que llevarás · VC"),
      D("Rodaje", "run", "suave", "45'", "8 km Z2"),
    ],
  },
  {
    week: 13, phase: "carrera", title: "Semana final", focus: "−60 % volumen, frescura",
    key: "Sáb: prueba final", sunday: "Descanso", km: 19,
    notes: ["Jueves 4 y viernes 5: hidratos a 7–8 g/kg (570–650 g) y menos fibra el viernes.",
      "Desayuno del sábado 3 h antes de tu salida: 120–160 g de hidratos, poca grasa y poca fibra."],
    days: [
      D("Rodaje + Fuerza B ligera", "hybrid", "suave", "50'", "30' Z2 + 4 × 200 m en 43\" · Press banca, dominadas y remo, 2 × 5 a RIR 3", ["B"]),
      D("Activación de estaciones", "hybrid", "media", "50'", "C · 2 rondas: 500 m SkiErg a ritmo objetivo + 1 km a RO; rec 3' · 2 × 12,5 m sled push · 20 wall balls · VC"),
      D("Rodaje corto", "run", "suave", "35'", "30' Z2 + 4 × 80 m"),
      D("Descanso", "rest", "libre", "20'", "20' de movilidad y paseo · Empieza la carga de hidratos"),
      D("Soltar piernas", "run", "suave", "20'", "15' Z1 + 4 × 80 m · Deja preparado el material para mañana"),
      D("Prueba final", "race", "carrera", "~60'", "Desayuno 3 h antes · Calentamiento de 20': 10' trote, movilidad, 3 × 100 m progresivos y 10 wall balls suaves; termina 10' antes de empezar · Circuito completo: 8 × 1 km + 8 estaciones · Km 1 a RO, nunca más rápido · Transiciones trotando, nunca andando · Wall balls en series fijas", [], "simFull"),
      D("Descanso", "rest", "libre", "—", "Paseo suave · Vuelves a entrenar el martes o el miércoles, en suave"),
    ],
  },
];

// ——— Fuerza: plantillas y columnas por semana ———
const STRENGTH = {
  A: {
    name: "Fuerza A — pierna y bisagra", day: "Martes",
    cols: ["S1", "S2–S3", "S4", "S5–S7", "S8", "S9–S11", "S12"],
    weekCol: { 1: 0, 2: 1, 3: 1, 4: 2, 5: 3, 6: 3, 7: 3, 8: 4, 9: 5, 10: 5, 11: 5, 12: 6, 13: 6 },
    rows: [
      { ex: "Sentadilla trasera", values: ["Test 5RM", "4×6 RIR2", "3×5 RIR3", "4×5 RIR2", "2×5 RIR4", "3×3 RIR2", "2×3 RIR3"], main: "sq" },
      { ex: "Peso muerto convencional", values: ["Test 5RM", "4×5 RIR2", "3×4 RIR3", "4×4 RIR2", "2×4 RIR4", "3×3 RIR2", "2×3 RIR3"], main: "dl" },
      { ex: "Zancada búlgara (mancuernas)", values: ["3×8 técnica", "3×8/pierna RIR2", "2×8", "3×10 RIR2", "2×8", "3×8 RIR2", "2×6"] },
      { ex: "Hip thrust", values: ["3×10", "3×10 RIR2", "2×10", "3×8 RIR2", "2×8", "3×8 RIR2", "—"] },
      { ex: "Curl nórdico", values: ["3×4", "3×5", "2×4", "3×6", "2×4", "3×5", "—"] },
      { ex: "Gemelo de pie + sóleo sentado", values: ["3×12 + 3×15", "3×12 + 3×15", "2 + 2", "3×12 + 3×15", "2 + 2", "3×12 + 3×15", "2 + 2"] },
      { ex: "Rueda abdominal + Pallof", values: ["3×10 + 3×12/lado", "3×10 + 3×12/lado", "2 + 2", "3×10 + 3×12/lado", "2 + 2", "3×10 + 3×12/lado", "2 + 2"] },
    ],
  },
  B: {
    name: "Fuerza B — torso, fuerza e hipertrofia", day: "Lunes",
    cols: ["S1", "S2–S3", "S4", "S5–S7", "S8", "S9–S11", "S12–S13"],
    weekCol: { 1: 0, 2: 1, 3: 1, 4: 2, 5: 3, 6: 3, 7: 3, 8: 4, 9: 5, 10: 5, 11: 5, 12: 6, 13: 6 },
    rows: [
      { ex: "Press banca con barra", values: ["4×8 RIR3 (buscar carga)", "4×6–8 RIR2", "3×6 RIR3", "4×6 RIR2", "2×6 RIR4", "3×5 RIR2", "2×5 RIR3"], main: "bp" },
      { ex: "Dominadas (lastre si haces más de 8)", values: ["4×máx−2", "4×6–8 RIR2", "3×6", "4×6 RIR2", "2×6", "3×5 RIR2", "2×5"] },
      { ex: "Press militar con mancuernas", values: ["3×10", "3×8–10 RIR2", "2×8", "3×8 RIR2", "2×8", "3×8 RIR2", "2×8"] },
      { ex: "Remo con barra", values: ["3×10", "3×8 RIR2", "2×8", "3×8 RIR2", "2×8", "3×8 RIR2", "2×8"] },
      { ex: "Fondos en paralelas", values: ["3×10", "3×10–12", "2×10", "3×10–12", "2×10", "2×10", "—"] },
      { ex: "Curl con barra + tríceps en polea", values: ["3×12", "3×12", "2×12", "3×12", "2×12", "2×12", "—"] },
      { ex: "Face pull", values: ["3×15", "3×15", "2×15", "3×15", "2×15", "2×15", "2×15"] },
    ],
  },
  C: {
    name: "Fuerza C — hipertrofia de torso y agarre", day: "Viernes",
    note: "Siempre a RIR 2, sin tocar la pierna pesada. Al terminar, 20–30' de ergo en Z2.",
    cols: ["S1–S7", "Descarga", "S9–S12"],
    weekCol: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 0, 6: 0, 7: 0, 8: 1, 9: 2, 10: 2, 11: 2, 12: 2, 13: 2 },
    rows: [
      { ex: "Press inclinado con mancuernas", values: ["3×10–12", "2×10", "3×8–10"] },
      { ex: "Jalón al pecho, agarre neutro", values: ["3×10–12", "2×10", "3×10"] },
      { ex: "Remo en polea baja", values: ["3×12", "2×12", "2×12"] },
      { ex: "Elevaciones laterales", values: ["4×15", "2×15", "3×15"] },
      { ex: "Curl martillo + extensión de tríceps", values: ["3×12 + 3×12", "2 + 2", "2 + 2"] },
      { ex: "Farmers carry pesado", values: ["4×40 m con 2×32 kg", "2×40 m", "3×60 m con 2×28 kg, rápido"] },
      { ex: "Hollow hold + dead bug", values: ["3×30\" + 3×10", "2 + 2", "3×30\" + 3×10"] },
    ],
  },
};

const STRENGTH_RULES = [
  "RIR = repeticiones en reserva. RIR 2 es acabar sabiendo que podías hacer 2 más.",
  "Si completas todas las series con las reps máximas y el RIR objetivo, sube 2,5 kg en torso y 5 kg en pierna la semana siguiente.",
  "En pierna nunca llegues al fallo. Si vas cargado, quita una serie en lugar de acercarte más al fallo.",
  "Calienta 5' en ergo y haz 2–3 series de aproximación del primer ejercicio.",
  "Referencia: 4×6 ≈ 75 % 1RM · 4×5 ≈ 80 % · 4×4 ≈ 82 % · 3×3 ≈ 85 %. 1RM estimado = 5RM ÷ 0,87.",
];

// ——— Zonas ———
const ZONES = [
  { z: "Z1", name: "Recuperación", use: "Enfriar, días suaves", pace: "5:40–6:10/km", erg: "2:25+", hr: "<80 %" },
  { z: "Z2", name: "Aeróbico", use: "Rodajes, tirada larga", pace: "5:05–5:35/km", erg: "2:12–2:22", hr: "80–88 %" },
  { z: "Z3", name: "Ritmo medio", use: "Híbridos largos", pace: "4:30–4:45/km", erg: "2:05–2:10", hr: "89–94 %" },
  { z: "Z4", name: "Umbral", use: "Tempo, objetivo B", pace: "4:10–4:18/km", erg: "1:58–2:03", hr: "95–100 %" },
  { z: "RO", name: "Ritmo objetivo", use: "Ritmo objetivo A", pace: "4:00/km", erg: "1:55", hr: "98–102 %" },
  { z: "Z5", name: "VO2máx", use: "Series 600–1.200 m", pace: "3:50–3:56/km", erg: "1:48–1:52", hr: ">102 %" },
  { z: "VEL", name: "Velocidad", use: "200–400 m", pace: "3:35–3:40/km", erg: "—", hr: "—" },
];

// ——— Estaciones y objetivos ———
const STATIONS = [
  { n: 1, key: "s_ski", name: "SkiErg", dist: "1.000 m", load: "—", A: "3:50", B: "4:00", rule: "Damper libre",
    tech: "Damper 5–6. Tirón desde la cadera, brazos casi estirados, manos junto a los muslos.", strat: "3–5\" por 500 m más lento que tu test. No ganas aquí; pierdes si te pasas." },
  { n: 2, key: "s_push", name: "Sled push", dist: "50 m (4 × 12,5)", load: "152 kg", A: "2:30", B: "2:50", rule: "Trineo entero tras la línea",
    tech: "Cuerpo a 45°, brazos firmes, pasos cortos y rápidos con el antepié.", strat: "No pares a mitad de tramo. Gira rápido en cada 12,5 m." },
  { n: 3, key: "s_pull", name: "Sled pull", dist: "50 m (4 × 12,5)", load: "103 kg", A: "3:00", B: "3:20", rule: "Tiras desde detrás de la línea",
    tech: "Pies anchos, rodillas flexionadas, mano sobre mano, cuerda pegada al cuerpo.", strat: "Tirones largos y constantes. Cuerda recogida a un lado." },
  { n: 4, key: "s_bbj", name: "Burpee broad jumps", dist: "80 m", load: "—", A: "2:50", B: "3:10", rule: "Pecho al suelo; salto a pies juntos",
    tech: "Pecho y muslos al suelo; salto de 1,8–2 m cómodo.", strat: "Ritmo de metrónomo desde el primer salto; respira en cada burpee." },
  { n: 5, key: "s_row", name: "Remo", dist: "1.000 m", load: "—", A: "3:50", B: "4:00", rule: "Damper libre",
    tech: "Damper 5–6. Piernas, tronco, brazos. 24–28 paladas/min.", strat: "30\" para bajar pulsaciones y luego a tu split objetivo." },
  { n: 6, key: "s_farm", name: "Farmers carry", dist: "200 m", load: "2 × 24 kg", A: "1:10", B: "1:15", rule: "Puedes soltar y retomar",
    tech: "Agarre centrado, hombros abajo, pasos cortos y rápidos.", strat: "Sin soltar: 200 m seguidos." },
  { n: 7, key: "s_lunge", name: "Sandbag lunges", dist: "100 m", load: "20 kg", A: "2:50", B: "3:15", rule: "Rodilla de atrás toca el suelo",
    tech: "Saco tras el cuello, tronco erguido, rodilla al suelo con suavidad.", strat: "Una respiración por zancada, sin paradas de pie." },
  { n: 8, key: "s_wb", name: "Wall balls", dist: "100 reps", load: "6 kg · 3 m", A: "3:50", B: "4:40", rule: "Cadera bajo la rodilla; centro de diana",
    tech: "Bola al pecho, sentadilla profunda, extensión explosiva; recibe bajando.", strat: "Series fijas: A = 30-25-25-20; B = 25-25-20-15-15. 3 respiraciones." },
];
const SPLITS = { run: { A: "32:00", B: "33:36" }, rox: { A: "4:00", B: "4:45" } };

const FATIGUE = {
  signals: [
    "FC en reposo 7+ ppm por encima de tu media de la semana.",
    "VFC nocturna por debajo de tu rango normal dos noches seguidas.",
    "Menos de 6 h de sueño.",
    "Piernas pesadas en el calentamiento, o RPE 1–2 puntos más alto al mismo ritmo.",
  ],
  lights: [
    { c: "verde", when: "0 señales", what: "Sesión tal cual." },
    { c: "amarillo", when: "1–2 señales", what: "Quita un 30–40 % de las series de calidad o conviértela en Z2. En fuerza, una serie menos por ejercicio." },
    { c: "rojo", when: "3–4 señales, dolor articular, fiebre", what: "Descanso, o 30' Z1 / natación suave. Vuelve a valorar mañana." },
  ],
  missed: [
    "Sesión suave perdida (mié, vie, dom): no se recupera.",
    "Sesión clave perdida (lun, mar, jue, sáb): pásala al siguiente día suave y elimina esa sesión suave.",
    "Nunca dos sesiones clave el mismo día ni dos días duros de carrera seguidos.",
    "Si solo puedes entrenar 4 días: sábado > jueves > martes > lunes.",
    "Semana entera perdida: la siguiente es de descarga y retomas donde lo dejaste.",
    "Simulacro completo perdido: muévelo solo si quedan 14+ días hasta la semana final; si no, haz un parcial.",
  ],
};

const ABBR = [
  ["C", "Calentamiento: 2 km Z1–Z2, 5' movilidad dinámica y 4 × 80 m progresivos."],
  ["VC", "Vuelta a la calma: 1,5 km en Z1."],
  ["rec", "Recuperación entre series (trotando salvo que diga «andando»)."],
  ["RO", "Ritmo objetivo: 4:00/km (A) o 4:12/km (B)."],
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
  w.id = "w" + String(w.week).padStart(2, "0");
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
