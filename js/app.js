// Mi planning — app principal (vanilla JS, rutas por hash)
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const app = $("#app");
  const ALL = WEEKS.flatMap((w) => w.sessions);
  const byId = Object.fromEntries(ALL.map((s) => [s.id, s]));

  // ——— utilidades ———
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
  const DOW_LONG = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const dowIdx = (iso) => { const [y, m, d] = iso.split("-").map(Number); return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; };
  const fmtDate = (iso, long = false) => {
    const [, m, d] = iso.split("-").map(Number);
    return long ? `${DOW[dowIdx(iso)]} ${d} de ${MONTHS[m - 1]}` : `${d} ${MONTHS[m - 1]}`;
  };
  const toSec = (v) => {
    if (v == null || v === "") return null;
    const s = String(v).trim().replace(",", ".");
    if (/^\d+(\.\d+)?$/.test(s)) return Number(s) * 60;
    const p = s.split(":").map(Number);
    if (p.some(isNaN)) return null;
    return p.reduce((acc, x) => acc * 60 + x, 0);
  };
  const fmtSec = (sec) => {
    if (sec == null || isNaN(sec)) return "—";
    sec = Math.round(sec);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
  };
  const num = (v) => { const n = parseFloat(String(v ?? "").replace(",", ".")); return isNaN(n) ? null : n; };
  const fmtNum = (n, d = 1) => (n == null ? "—" : n.toLocaleString("es-ES", { maximumFractionDigits: d }));

  const KIND = { run: "Carrera", strength: "Fuerza", hybrid: "Doble", test: "Test", rest: "Descanso", race: "Carrera 10K" };
  const INT = { suave: "Suave", media: "Media", dura: "Dura", muy: "Muy dura", carrera: "Máxima", libre: "Libre" };
  const INT_LVL = { libre: 0, suave: 1, media: 2, dura: 3, muy: 4, carrera: 5 };
  const STATUS = { done: "Hecha", partial: "Parcial", skipped: "No hecha" };
  const ICON = {
    run: "M22 12h-4l-3 9L9 3l-3 9H2",
    strength: "M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11",
    hybrid: "M13 2 3 14h9l-1 8 10-12h-9l1-8z",
    test: "M12 9v4l2.5 1.5M9 2h6M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z",
    sim: "M4 22V4M4 4h13l-2.5 4L17 12H4",
    rest: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",
    race: "M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3",
    clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
    chev: "M9 18l6-6-6-6",
    copy: "M9 9h11v11H9zM5 15H4V4h11v1",
    check: "M20 6 9 17l-5-5",
  };
  const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
  const ico = (k, cls = "") => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON[k]}"/></svg>`;
  const meter = (i) => `<span class="meter" title="Intensidad: ${INT[i]}">${[1, 2, 3, 4, 5].map((n) => `<i class="${n <= INT_LVL[i] ? "on" : ""}"></i>`).join("")}</span>`;

  function currentWeekNum() {
    const idx = daysBetween(PLAN_START, todayISO());
    if (idx < 0) return 1;
    return Math.min(WEEKS.length, Math.floor(idx / 7) + 1);
  }
  function todaySession() {
    const t = todayISO();
    return ALL.find((s) => s.date === t) || (t < PLAN_START ? ALL[0] : ALL[ALL.length - 1]);
  }
  const target = () => Store.settings.activeTarget || "A";

  function richText(t) {
    let h = esc(t);
    h = h.replace(/\b(Z[1-5](?:–Z[1-5])?)\b/g, (m) => `<span class="zchip z-${m.slice(0, 2).toLowerCase()}">${m}</span>`);
    h = h.replace(/\bRO\b/g, `<span class="zchip z-ro">RO</span>`);
    STRENGTH_ORDER.forEach((k) => { const l = STRENGTH[k].label; h = h.replace(new RegExp(`\\b${l}\\b`, "g"), `<a class="fchip" href="#/fuerza/${k}">${l}</a>`); });
    h = h.replace(/^(C|VC)(\s|$|\s\()/, `<abbr title="${t.startsWith("VC") ? "Vuelta a la calma" : "Calentamiento"}">$1</abbr>$2`);
    return h;
  }

  function statusKey(s) {
    const log = Store.getLog(s.id);
    if (log) return log.status;
    if (s.kind === "rest") return "rest";
    if (s.date < todayISO()) return "missing";
    return "pending";
  }
  const statusDot = (s) => `<span class="dot st-${statusKey(s)}" title="${STATUS[statusKey(s)] || ""}"></span>`;

  function weekStats(w) {
    const train = w.sessions.filter((s) => s.kind !== "rest");
    let done = 0, partial = 0, skipped = 0, km = 0, min = 0, rpeSum = 0, rpeN = 0, sets = 0, vol = 0;
    const fat = { verde: 0, amarillo: 0, rojo: 0 };
    w.sessions.forEach((s) => {
      const l = Store.getLog(s.id);
      if (!l) return;
      if (l.status === "done") done++;
      else if (l.status === "partial") partial++;
      else if (l.status === "skipped") skipped++;
      km += num(l.km) || 0;
      min += num(l.minutes) || 0;
      if (num(l.rpe)) { rpeSum += num(l.rpe); rpeN++; }
      if (fat[l.fatigue] != null) fat[l.fatigue]++;
      Object.values(l.sets || {}).forEach((ss) => ss.forEach((x) => { sets++; vol += (x.kg || 0) * (x.reps || 0); }));
    });
    return { planned: train.length, done, partial, skipped, km, min, rpe: rpeN ? rpeSum / rpeN : null, fat, sets, vol };
  }
  function overall() {
    const train = ALL.filter((s) => s.kind !== "rest");
    const done = train.filter((s) => ["done", "partial"].includes(Store.getLog(s.id)?.status)).length;
    return { done, total: train.length, pct: Math.round((done / train.length) * 100) };
  }

  function ring(pct, size = 40, stroke = 4) {
    const r = (size - stroke) / 2, c = 2 * Math.PI * r;
    return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" class="ring-bg"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" class="ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct / 100)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`;
  }

  // ——— cabecera y navegación ———
  function header(active) {
    const wn = currentWeekNum(), w = WEEKS[wn - 1], o = overall();
    const tabs = [["hoy", "Hoy", "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"],
      ["plan", "Plan", "M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"],
      ["fuerza", "Fuerza", ICON.strength],
      ["movilidad", "Movilidad", "M12 6.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM4 10.5l8 1.5 8-1.5M12 12v3.5l-4.5 6M12 15.5l4.5 6"],
      ["nutricion", "Comida", "M7 2v20M4 2v6a3 3 0 0 0 6 0V2M17 2c-1.7 0-3 2.2-3 5s1.3 5 3 5v10M17 2c1.7 0 3 2.2 3 5s-1.3 5-3 5"],
      ["progreso", "Progreso", "M3 3v18h18M7 15l4-4 3 3 6-6"],
      ["guia", "Guía", "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"]];
    $("#topbar").innerHTML = `
      <a class="brand" href="#/hoy"><span class="logo"><svg viewBox="0 0 512 512" style="stroke:#b8f550;stroke-width:44"><path d="M282 196 236 306M282 196 338 246 390 222M276 200 212 226 176 282M236 306 322 350 306 438M236 306 208 392 126 374"/><circle cx="318" cy="118" r="42" fill="#b8f550" stroke="none"/></svg></span>
        <span><b>Mi planning</b><small>Semana ${wn} de ${WEEKS.length} · ${PHASES[w.phase].name}</small></span></a>
      <a class="ringbtn" href="#/progreso" title="Plan completado: ${o.done} de ${o.total} sesiones">${ring(o.pct)}<span>${o.pct}%</span><em class="side-only"><b>Plan completado</b><small>${o.done} de ${o.total} sesiones</small></em></a>
      <a class="iconbtn mob-only" href="#/guia" aria-label="Guía del plan"><svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg></a>
      <a class="iconbtn ${active === "datos" ? "on" : ""}" href="#/datos" aria-label="Datos y copia de seguridad"><svg viewBox="0 0 24 24"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></svg><span class="side-only">Datos y ajustes</span></a>`;
    $("#tabbar").innerHTML = tabs.map(([k, l, d]) =>
      `<a href="#/${k}" class="${active === k ? "on" : ""}"><svg viewBox="0 0 24 24"><path d="${d}"/></svg><span>${l}</span></a>`).join("");
  }

  function phaseTimeline(sel) {
    const cw = currentWeekNum();
    const used = [...new Set(WEEKS.map((w) => w.phase))];
    return `<div class="timeline" style="grid-template-columns:repeat(${WEEKS.length},1fr)">${WEEKS.map((w) => {
      const st = weekStats(w);
      const pct = st.planned ? ((st.done + st.partial) / st.planned) * 100 : 0;
      return `<a href="#/plan/${w.week}" class="tl ${PHASES[w.phase].color} ${w.week === cw ? "now" : ""} ${w.week === sel ? "sel" : ""}" title="S${w.week} · ${esc(w.title)}">
        <span class="tl-bar"><i style="height:${pct}%"></i></span><small>${w.week}</small></a>`;
    }).join("")}</div>
    <div class="tl-legend">${used.map((p) => `<span class="${PHASES[p].color}"><i></i>${PHASES[p].name}</span>`).join("")}</div>`;
  }

  function sessionCard(s, opts = {}) {
    const log = Store.getLog(s.id);
    const [d, n] = s.day.split(" ");
    return `<a class="scard int-${s.intensity} ${s.date === todayISO() ? "is-today" : ""} st-${statusKey(s)}" href="#/sesion/${s.id}">
      <div class="scard-day"><small>${d}</small><b>${n}</b></div>
      <div class="kicon k-${s.kind}">${ico(s.kind)}</div>
      <div class="scard-body">
        <div class="scard-title">${esc(s.title)}</div>
        <div class="scard-meta"><span>${KIND[s.kind]}</span><span class="sep"></span><span>${s.duration}</span>${s.kind !== "rest" ? meter(s.intensity) : ""}</div>
        ${log ? `<div class="scard-log">${ico("check")}${STATUS[log.status]}${log.km ? ` · ${esc(log.km)} km` : ""}${log.minutes ? ` · ${esc(log.minutes)}'` : ""}${log.rpe ? ` · RPE ${esc(log.rpe)}` : ""}</div>`
          : opts.preview ? `<div class="scard-prev">${esc(s.steps.slice(0, 3).join(" · "))}${s.steps.length > 3 ? "…" : ""}</div>` : ""}
      </div>
      ${statusDot(s)}
    </a>`;
  }

  // Pasos: si la sesión es doble, se agrupan en Mañana y Tarde
  function stepsHtml(steps) {
    if (!steps.some((x) => /^(Mañana|Tarde):/.test(x))) return `<ol class="steps">${steps.map((x) => `<li>${richText(x)}</li>`).join("")}</ol>`;
    const groups = [];
    steps.forEach((x) => {
      const m = x.match(/^(Mañana|Tarde):\s*(.*)$/);
      if (m || !groups.length) groups.push({ t: m ? m[1] : "", items: [] });
      groups[groups.length - 1].items.push(m ? m[2] : x);
    });
    return groups.map((g) => `<div class="slot">${g.t ? `<div class="slot-h">${g.t === "Mañana" ? "☀️" : "🌙"} ${g.t}</div>` : ""}<ol class="steps">${g.items.filter(Boolean).map((x) => `<li>${richText(x)}</li>`).join("")}</ol></div>`).join("");
  }
  // Predicción del 10K (Riegel) con el último test registrado
  // Predicción del 10K (Riegel, exponente 1,06): la mejor marca equivalente de las últimas 6 semanas,
  // entre tests y los mejores 5 y 10 km que Strava detecta en cualquier carrera
  function runMarks() {
    const out = [];
    ALL.forEach((s) => {
      const l = Store.getLog(s.id); if (!l) return;
      const add = (v, dist, src, test) => { const sec = toSec(v); if (!sec || sec < dist * 150 || sec > dist * 480) return;
        out.push({ s, date: s.date, dist, sec, eq: sec * Math.pow(10 / dist, 1.06), src, test }); };
      const key = { test5k: "t5k", test10k: "t10k", race10k: "race10k" }[s.metrics];
      if (key && l.metrics?.[key]) add(l.metrics[key], s.metrics === "test5k" ? 5 : 10, s.metrics === "race10k" ? "el 10K" : `el test de ${s.metrics === "test5k" ? 5 : 10} km`, true);
      if (l.be10k) add(l.be10k, 10, "tu mejor 10 km en Strava");
      if (l.be5k) add(l.be5k, 5, "tu mejor 5 km en Strava");
    });
    return out;
  }
  function runPrediction() {
    const marks = runMarks(), from = addDays(todayISO(), -42);
    const recent = marks.filter((m) => m.date >= from);
    const pool = recent.length ? recent : marks.filter((m) => m.test).slice(-1);
    const best = pool.reduce((a, b) => (!a || b.eq < a.eq ? b : a), null);
    return { pred: best ? best.eq : toSec("20:00") * Math.pow(2, 1.06), last: best, marks };
  }

  function heroSession(s, label) {
    const w = WEEKS[s.week - 1];
    const log = Store.getLog(s.id);
    return `<section class="hero int-${s.intensity}">
      <div class="hero-top">
        <div class="kicon big k-${s.kind}">${ico(s.kind)}</div>
        <div><div class="eyebrow">${label}</div><h1>${esc(s.title)}</h1></div>
      </div>
      <div class="hero-meta">
        <span>${ico("clock")}${s.duration}</span>
        <span>${KIND[s.kind]}</span>
        ${s.kind !== "rest" ? `<span>${meter(s.intensity)} ${INT[s.intensity]}</span>` : ""}
        <span class="ph ${PHASES[w.phase].color}"><i></i>S${s.week} · ${PHASES[w.phase].name}</span>
      </div>
      ${stepsHtml(s.steps)}
      ${mobChips(s)}
      ${label.startsWith("Hoy") || label.startsWith("Primera") || label.startsWith("Última") ? s.strength.map((k) => strengthBlock(k, s.week, s.id, false)).join("") : ""}
      ${watchNotesHtml(s)}
      ${label.startsWith("Hoy") || label.startsWith("Primera") || label.startsWith("Última") ? `<a class="btn primary block" href="#/sesion/${s.id}">${log ? `${ico("check")} ${STATUS[log.status]} · ver registro` : "Registrar sesión"}</a>` : ""}
    </section>`;
  }

  // ——— Notas para el reloj (SuuntoPlus Notes: hasta 10 notas, "|" = salto de línea) ———
  const watchTxt = (x) => String(x).replace(/×/g, "x").replace(/[–—−]/g, "-").replace(/≈/g, "~").replace(/[“”″]/g, '"').replace(/[‘’′]/g, "'").replace(/\|/g, "/").replace(/\s+/g, " ").trim();
  const shortEx = (ex) => ex.replace(/\s*\(.*?\)\s*/g, " ").trim();
  function watchNotes(s) {
    if (!s || s.kind === "rest") return [];
    const notes = [];
    const labels = (s.strength || []).map((k) => STRENGTH[k].label);
    const isRef = (x) => labels.some((l) => x.startsWith(l));
    // Pasos agrupados por mañana / tarde
    const groups = [];
    s.steps.forEach((x) => {
      const m = x.match(/^(Mañana|Tarde):\s*(.*)$/);
      if (m || !groups.length) groups.push({ t: m ? m[1] : "", items: [] });
      groups[groups.length - 1].items.push(m ? m[2] : x);
    });
    groups.forEach((g) => {
      const items = g.items.filter(Boolean);
      const runGroup = g.t === "Mañana" || (!g.t && ["run", "test", "race"].includes(s.kind));
      if (runGroup) {
        const ro = ATHLETE.targets[target()].pace.replace("/km", "");
        const run = items.map((x) => x === "C" ? "Calent: 2 km Z1-Z2 + 4x80 m" : x === "VC" ? "Calma: 1,5 km Z1" : x.replace(/^C \((\d+')\)/, "Calent. $1").replace(/\bRO\b/g, `RO (${ro})`));
        notes.push({ title: g.t === "Mañana" ? "Carrera (mañana)" : "Carrera", text: [g.t === "Mañana" ? "MAÑANA" : s.title.toUpperCase(), ...run].map(watchTxt).join("|") });
        return;
      }
      items.filter((x) => !isRef(x)).forEach((x) => {
        const m = x.match(/^([^:]{2,40}):\s*(.*)$/);
        const lines = m ? [m[1], ...m[2].split(/\s*(?:\+|;|,(?=\s*\d))\s*/)] : [x];
        notes.push({ title: m ? m[1] : "Extra", text: lines.map(watchTxt).filter(Boolean).join("|") });
      });
    });
    // Un ejercicio por nota, con la carga de la última vez y la sugerida
    (s.strength || []).forEach((k) => {
      const t = STRENGTH[k], ci = t.weekCol[s.week];
      const rows = t.rows.filter((r) => parseScheme(r.values[ci]));
      rows.forEach((r, i) => {
        const prev = lastSets(r.ex, s.date);
        const sug = suggestKg(k, parseScheme(r.values[ci]), prev);
        const lines = [`${i + 1}/${rows.length} ${shortEx(r.ex)}`, r.values[ci]];
        if (sug) lines.push(`Hoy: ${kgStr(sug.kg)} kg${sug.up ? " (sube)" : ""}`);
        if (prev) lines.push(`Ult: ${prev.text}`);
        notes.splice(notes.length, 0, { title: shortEx(r.ex), text: lines.map(watchTxt).join("|"), ex: true });
      });
    });
    // Orden: carrera, ejercicios, extras (funcional, core…) al final
    const order = (n) => (n.title.startsWith("Carrera") ? 0 : n.ex ? 1 : 2);
    notes.sort((a, b) => order(a) - order(b));
    return notes;
  }
  // ——— Nota del reloj ———
  // Pantalla (Suunto, texto Medium): ~10 líneas visibles y ~24 caracteres por línea sin que salte.
  const WATCH_LINES = 10, WATCH_W = 24;
  // [nombre claro, nombre mínimo]: se usa el mínimo solo si la línea no cabe
  const EX_SHORT = {
    "Press banca con barra": ["Press banca", "Banca"], "Dominadas (lastre si haces más de 8)": ["Dominadas", "Domin"],
    "Press militar con mancuernas": ["Press militar", "Militar"], "Remo con barra": ["Remo barra", "Remo"],
    "Press inclinado con mancuernas": ["Incl mancuer", "Incl manc"], "Face pull": ["Face pull", "Face pull"],
    "Sentadilla trasera": ["Sentadilla", "Sent"], "Prensa de piernas": ["Prensa", "Prensa"], "Peso muerto rumano": ["PM rumano", "PM rum"],
    "Extensión de cuádriceps": ["Ext cuadri", "Ext cuad"], "Gemelo de pie": ["Gemelo pie", "Gemelo"], "Rueda abdominal": ["Rueda abdo", "Rueda"],
    "Press inclinado con barra": ["Incl barra", "Incl barra"], "Jalón al pecho": ["Jalon pecho", "Jalon"],
    "Remo en polea baja": ["Remo polea", "Remo pol"], "Fondos en paralelas (lastre si puedes)": ["Fondos", "Fondos"],
    "Aperturas en máquina o polea": ["Aperturas", "Apert"], "Elevaciones laterales": ["Laterales", "Lat"],
    "Curl con barra Z": ["Curl barra Z", "Curl Z"], "Press francés": ["Press frances", "Frances"],
    "Curl inclinado con mancuernas": ["Curl inclinado", "Curl incl"], "Extensión de tríceps en polea": ["Triceps polea", "Tri polea"],
    "Elevaciones laterales en polea": ["Lat polea", "Lat pol"], "Pájaros (deltoides posterior)": ["Pajaros", "Pajaros"],
    "Curl martillo": ["Curl martillo", "Martillo"], "Peso muerto convencional": ["Peso muerto", "PM"],
    "Zancada búlgara (mancuernas)": ["Bulgara", "Bulgara"], "Hip thrust": ["Hip thrust", "Hip thr"],
    "Curl femoral": ["Curl femoral", "Femoral"], "Gemelo sentado": ["Gemelo sent", "Gem sent"], "Elevación de piernas colgado": ["Elev piernas", "Elev pier"],
  };
  // Descanso entre series: básicos pesados 3', multiarticulares 2', aislamiento 90" o 60"
  const REST_RULES = [[/sentadilla trasera|peso muerto convencional|press banca/i, "3m"],
    [/dominadas|press militar|remo con barra|press inclinado|jalón|remo en polea|fondos|prensa|rumano|búlgara|hip thrust/i, "2m"],
    [/extensión de cuádriceps|curl femoral|curl con barra|press francés|curl inclinado|aperturas/i, "90s"]];
  const restFor = (ex) => (REST_RULES.find(([re]) => re.test(ex)) || [, "60s"])[1];
  const restLabel = (r) => r.replace("m", "'").replace("s", "\"");
  // Finishers en una línea
  const FX_SHORT = { base1: "Fx 3r remo/KB/farmers", base2: "Fx 4x sled 25m+10 WB", des1: "Fx EMOM12 remo/KB/farm", des2: "Fx AMRAP12 ski/burp/WB",
    esp1: "Fx 5x ski 10+8 thrust", esp2: "Fx 4x sled+sandbag", afi1: "Fx 4x remo200+10 KB", core: "Core plank/Pallof/bug" };
  const schemeParts = (v) => {
    const m = v.match(/^(.*?)\s*RIR\s*(.*)$/i);
    const sets = watchTxt((m ? m[1] : v).replace(/\/pierna/, "/p").replace(/máx/i, "max"));
    return { sets, rir: m ? "R" + watchTxt(m[2]) : "" };
  };
  // Línea de un ejercicio: «Sentadilla 4x6-8 R2 85 3m» (kg y descanso). Si no cabe, quita el RIR y luego acorta el nombre.
  function exLine(ex, v, kg) {
    const [long, short] = EX_SHORT[ex] || [shortEx(ex), shortEx(ex)];
    const { sets, rir } = schemeParts(v);
    const k = kg != null ? kgStr(kg) : "", d = restFor(ex);
    const opts = [[long, sets, rir, k, d], [long, sets, k, d], [short, sets, rir, k, d], [short, sets, k, d], [short, sets, k]].map((x) => x.filter(Boolean).join(" "));
    return opts.find((x) => x.length <= WATCH_W) || opts[opts.length - 1];
  }
  // Días solo de carrera: título + pasos abreviados y partidos en líneas de 24 caracteres
  const RUN_ABBR = [[/\bcontinuos\b/g, "cont"], [/\bprogresivos\b/g, "prog"], [/Calentamiento/g, "Calent"],
    [/\blos (\d+) últimos\b/g, "últ $1 km"], [/\(~ ?([\d,]+ km)\)/g, "~$1"], [/primer km/g, "km 1"], [/nunca más rápido/g, "no más rápido"],
    [/\bmovilidad\b/g, "movil."], [/ sin mirar a nadie/g, " a lo tuyo"]];
  // Parte en trozos por «, », « + » y «: » y los empaqueta en líneas; solo corta palabras si un trozo no cabe
  function wrapW(text) {
    const out = [];
    let cur = "";
    text.split(/(?<=,|:) | (?=\+ )/).flatMap((c) => (c.length <= WATCH_W ? [c.replace(/ /g, "\u0000")] : c.split(" "))).forEach((w) => {
      if (!cur) cur = w;
      else if ((cur + " " + w).length <= WATCH_W) cur += " " + w;
      else { out.push(cur); cur = w; }
    });
    if (cur) out.push(cur);
    return out.map((l) => l.replace(/\u0000/g, " "));
  }
  function runLines(s) {
    const ro = ATHLETE.targets[target()].pace.replace("/km", "");
    const steps = s.steps.filter((x) => !/^(Apunta|Prepara)/.test(x)).map((x) => {
      let t = watchTxt(x.replace(/^C \((\d+')\)/, "Calent $1").replace(/\bRO\b/g, `RO ${ro}`));
      RUN_ABBR.forEach(([re, b]) => (t = t.replace(re, b)));
      return t;
    });
    return [watchTxt(s.title).toUpperCase().slice(0, WATCH_W), ...steps.flatMap(wrapW)].slice(0, WATCH_LINES);
  }
  function watchLines(s) {
    if (!s || s.kind === "rest") return [];
    const lines = [];
    (s.strength || []).forEach((k) => {
      const ci = STRENGTH[k].weekCol[s.week];
      STRENGTH[k].rows.forEach((r) => {
        const sc = parseScheme(r.values[ci]);
        if (!sc) return;
        const sug = suggestKg(k, sc, lastSets(r.ex, s.date));
        lines.push(exLine(r.ex, r.values[ci], sug ? sug.kg : null));
      });
    });
    if (!lines.length) return runLines(s); // días solo de carrera
    const fx = Object.keys(FX_SHORT).find((key) => s.detail.includes(FX[key]));
    if (fx && lines.length < WATCH_LINES) lines.push(FX_SHORT[fx]);
    return lines;
  }
  const watchNote = (s) => watchLines(s).join("|");
  function watchNotesHtml(s) {
    const lines = watchLines(s);
    if (!lines.length) return "";
    const text = lines.join("|"), maxW = Math.max(...lines.map((l) => l.length));
    const warn = lines.length > WATCH_LINES || maxW > WATCH_W;
    return `<details class="watch"><summary>⌚ Nota para el reloj</summary>
      <p class="muted tiny">Ejercicio, series, RIR (R), kg sugeridos (si ya tienes cargas registradas) y descanso entre series (3m, 2m, 90s, 60s). Pégala en <b>Note 1</b> de la app Notes (SuuntoPlus).</p>
      <div class="wnote"><div class="wnote-h"><b>Note 1</b><span class="${warn ? "warn" : ""}">${lines.length}/${WATCH_LINES} líneas · ${maxW}/${WATCH_W} car.</span><button type="button" class="chip-btn" data-copy-note="${esc(text)}">Copiar</button></div>
        <div class="wnote-p">${lines.map(esc).join("<br>")}</div></div>
    </details>`;
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-copy-note]");
    if (b) { e.preventDefault(); copy(b.dataset.copyNote, b); }
  });

  // ——— Hoy ———
  function viewHoy() {
    const s = todaySession();
    const w = WEEKS[s.week - 1];
    const t = todayISO();
    const tomorrow = ALL[ALL.indexOf(s) + 1];
    const st = weekStats(w);
    const before = t < PLAN_START;
    const pend = ALL.filter((x) => x.date < t && x.kind !== "rest" && !Store.getLog(x.id)).slice(-5);
    const dayN = ALL.indexOf(s) + 1;
    app.innerHTML = `
      <section class="greet">
        <div><div class="eyebrow">${DOW_LONG[dowIdx(t)]}</div><h1 class="display">${fmtDate(t).replace(" ", " de ")}</h1></div>
        <div class="greet-right"><b>Día ${dayN}</b><small>de ${ALL.length}</small></div>
      </section>
      ${heroSession(s, before ? "Primera sesión · " + fmtDate(s.date, true) : s.date === t ? "Hoy" : "Última sesión · " + fmtDate(s.date, true))}
      ${(() => {
        const tg = target(), dl = daysBetween(t, RACE_DATE), rp = runPrediction();
        const nextTest = ALL.find((x) => x.metrics && x.date >= t);
        if (dl < 0) return "";
        return `<a class="card racecard" href="#/progreso">
          <div class="rc-days"><b>${dl}</b><small>${dl === 1 ? "día" : "días"} al 10K</small></div>
          <div class="rc-body">
            <div class="rc-row"><span>Objetivo ${tg}</span><b>${ATHLETE.targets[tg].total} <small>${ATHLETE.targets[tg].pace}</small></b></div>
            <div class="rc-row"><span>Predicción</span><b>${rp.last ? fmtSec(rp.pred) : "<small>tras el test de la S4</small>"}</b></div>
            ${nextTest ? `<div class="rc-next">${nextTest.date === t ? "Hoy" : "Próximo"}: <b>${esc(nextTest.title.replace(/ \+ .*/, ""))}</b> · ${nextTest.date === t ? "¡a por ello!" : `${fmtDate(nextTest.date, true)} (en ${daysBetween(t, nextTest.date)} d)`}</div>` : ""}
          </div></a>`; })()}
      ${(() => { const nst = dayState(t), ntg = targetsFor(nst.type), ne = consumed(t), np = Math.min(100, Math.round((ne.k / ntg.kcal) * 100));
        return `<a class="card nutmini" href="#/nutricion"><div class="nm-ring">${ring(np, 52, 6)}<span>${np}%</span></div>
          <div class="nm-body"><div class="eyebrow">Comida · ${DAY_TYPES[nst.type].name}${DIARIO[t]?.items?.length ? " · diario" : ""}</div><b>${fmtNum(ne.k, 0)} / ${fmtNum(ntg.kcal, 0)} kcal${ne.k ? ` <span class="nm-left">${ne.k < ntg.kcal ? `faltan ${fmtNum(ntg.kcal - ne.k, 0)}` : "✓"}</span>` : ""}</b>
            <div class="nm-macros">${[["P", ne.p, ntg.p, "m-p"], ["H", ne.c, ntg.c, "m-c"], ["G", ne.f, ntg.f, "m-f"]].map(([l, v, g, c]) => `<span class="${c}"><i style="width:${Math.min(100, (v / g) * 100)}%"></i><em>${l} ${Math.round(v)}/${g}</em></span>`).join("")}</div>
            <small>${ne.k ? "" : "Cuéntale a tu chat del diario lo que comas · "}${nst.weight ? `${esc(nst.weight)} kg` : "pésate en ayunas"}</small></div>${ico("chev")}</a>`; })()}
      <section class="card">
        <div class="row-between"><div><div class="eyebrow">Semana ${w.week}</div><h2>${esc(w.title)}</h2></div><a class="link" href="#/plan/${w.week}">Ver semana ${ico("chev")}</a></div>
        <div class="weekstrip">${w.sessions.map((x) => `<a href="#/sesion/${x.id}" class="int-${x.intensity} ${x.id === s.id ? "on" : ""} st-${statusKey(x)}">
          <small>${x.day.split(" ")[0]}</small><b>${x.day.split(" ")[1]}</b><span class="ws-ico k-${x.kind}">${ico(x.kind)}</span>${statusDot(x)}</a>`).join("")}</div>
        <div class="kpis">
          <div><span>Sesiones</span><b>${st.done + st.partial}<small>/${st.planned}</small></b></div>
          <div><span>Km carrera</span><b>${fmtNum(st.km)}<small>/${w.km}</small></b></div>
          <div><span>Series de fuerza</span><b>${st.sets || "—"}</b></div>
          <div><span>RPE medio</span><b>${st.rpe ? fmtNum(st.rpe) : "—"}</b></div>
        </div>
        <p class="muted tiny">${esc(w.focus)} · Sesión clave: ${esc(w.key)}</p>
      </section>
      ${pend.length ? `<section class="card warn"><div class="eyebrow">Pendiente</div><h2>Sin registrar</h2><p class="muted">Si no las hiciste, márcalas como «No hecha» para que el resumen sea fiel.</p>
        <div class="list">${pend.map((x) => sessionCard(x)).join("")}</div></section>` : ""}
      ${tomorrow ? `<section><div class="section-title">Mañana</div><div class="list">${sessionCard(tomorrow, { preview: true })}</div></section>` : ""}
      <section class="card"><div class="eyebrow">${WEEKS.length} semanas</div><h2>Tu temporada</h2>${phaseTimeline()}</section>
      ${trafficLight()}
    `;
  }

  function trafficLight() {
    return `<section class="card"><div class="eyebrow">Antes de entrenar</div><h2>Semáforo de fatiga</h2>
      <ul class="bul">${FATIGUE.signals.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      <div class="lights">${FATIGUE.lights.map((l) => `<div class="light f-${l.c}"><div><i></i><b>${l.c[0].toUpperCase() + l.c.slice(1)}</b></div><small>${esc(l.when)}</small><p>${esc(l.what)}</p></div>`).join("")}</div>
    </section>`;
  }

  // ——— Plan ———
  function viewPlan(n) {
    const wn = Math.max(1, Math.min(WEEKS.length, Number(n) || currentWeekNum()));
    const w = WEEKS[wn - 1];
    const st = weekStats(w);
    const pct = st.planned ? Math.round(((st.done + st.partial * 0.5) / st.planned) * 100) : 0;
    app.innerHTML = `
      <section class="card flat">${phaseTimeline(wn)}</section>
      <section class="weekhead ${PHASES[w.phase].color}">
        <div class="wh-top">
          <div><div class="eyebrow"><span class="ph-dot"></span>${PHASES[w.phase].name} · ${fmtDate(w.start)} – ${fmtDate(w.end)}</div>
          <h1>Semana ${w.week}</h1><p class="wh-sub">${esc(w.title)} · ${esc(w.focus)}</p></div>
          <div class="wh-ring">${ring(pct, 64, 6)}<span>${pct}%</span></div>
        </div>
        <div class="kpis">
          <div><span>Sesiones</span><b>${st.done + st.partial}<small>/${st.planned}</small></b></div>
          <div><span>Km carrera</span><b>${fmtNum(st.km)}<small>/${w.km}</small></b></div>
          <div><span>Series fuerza</span><b>${st.sets || "—"}<small>${st.vol ? ` · ${fmtNum(st.vol / 1000, 1)} t` : ""}</small></b></div>
          <div><span>RPE medio</span><b>${st.rpe ? fmtNum(st.rpe) : "—"}</b></div>
        </div>
        <dl class="facts"><div><dt>Sesión clave</dt><dd>${esc(w.key)}</dd></div><div><dt>Domingo</dt><dd>${esc(w.sunday)}</dd></div>
        ${st.fat.verde || st.fat.amarillo || st.fat.rojo ? `<div><dt>Fatiga</dt><dd><span class="fd f-verde">${st.fat.verde}</span><span class="fd f-amarillo">${st.fat.amarillo}</span><span class="fd f-rojo">${st.fat.rojo}</span></dd></div>` : ""}</dl>
        ${w.notes.length ? `<ul class="notes">${w.notes.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      </section>
      <section class="list">${w.sessions.map((s) => sessionCard(s, { preview: true })).join("")}</section>
      <section class="card">
        <div class="eyebrow">Revisión semanal</div><h2>Resumen para tu entrenador</h2>
        <p class="muted">Copia el resumen y pégalo en tu chat con Claude: «Revisa mi semana y prepárame la siguiente».</p>
        <button class="btn primary block" id="copySum">${ico("copy")} Copiar resumen de la semana ${w.week}</button>
        <details class="mt"><summary>Ver texto</summary><pre class="pre" id="sumText">${esc(weekSummary(w))}</pre></details>
      </section>
      <div class="pager">${wn > 1 ? `<a class="btn" href="#/plan/${wn - 1}">← Semana ${wn - 1}</a>` : "<span></span>"}${wn < WEEKS.length ? `<a class="btn" href="#/plan/${wn + 1}">Semana ${wn + 1} →</a>` : ""}</div>
    `;
    $("#copySum").onclick = () => copy(weekSummary(w), $("#copySum"));
  }

  function weekSummary(w) {
    const st = weekStats(w);
    const lines = [];
    lines.push(`RESUMEN SEMANA ${w.week} (${fmtDate(w.start)} – ${fmtDate(w.end)}) · ${PHASES[w.phase].name} · ${w.title}`);
    lines.push(`Ritmo objetivo activo: ${target()} (${ATHLETE.targets[target()].pace})`);
    lines.push(`Sesiones: ${st.done} hechas, ${st.partial} parciales, ${st.skipped} no hechas de ${st.planned} · Km carrera: ${fmtNum(st.km)} / ~${w.km} · Tiempo: ${Math.round(st.min)}' · RPE medio: ${st.rpe ? fmtNum(st.rpe) : "—"}`);
    lines.push(`Semáforo: verde ${st.fat.verde}, amarillo ${st.fat.amarillo}, rojo ${st.fat.rojo}`);
    lines.push(`Fuerza: ${st.sets} series registradas · volumen ${fmtNum(st.vol, 0)} kg`);
    nutritionSummaryLines(w).forEach((x) => lines.push(x));
    lines.push("");
    w.sessions.forEach((s) => {
      const l = Store.getLog(s.id);
      lines.push(`${s.day} · ${s.title} [plan: ${INT[s.intensity]}, ${s.duration}]`);
      if (!l) { lines.push(s.kind === "rest" ? "  Descanso" : "  Sin registrar"); return; }
      const parts = [STATUS[l.status] || l.status];
      if (l.minutes) parts.push(`${l.minutes}'`);
      if (l.km) parts.push(`${l.km} km`);
      if (l.pace) parts.push(`ritmo ${l.pace}/km`);
      if (l.hr) parts.push(`FC media ${l.hr}`);
      if (l.hrmax) parts.push(`FC máx ${l.hrmax}`);
      if (l.rpe) parts.push(`RPE ${l.rpe}`);
      if (l.fatigue) parts.push(`semáforo ${l.fatigue}`);
      if (l.weight) parts.push(`peso ${l.weight} kg`);
      lines.push("  " + parts.join(" · "));
      const defs = s.metrics ? METRIC_SETS[s.metrics] : [];
      const m = Object.entries(l.metrics || {}).filter(([, v]) => v !== "" && v != null);
      if (m.length) lines.push("  Resultados: " + m.map(([k, v]) => `${(defs.find((d) => d.key === k) || { label: k }).label} ${v}`).join(" · "));
      const ld = Object.entries(l.loads || {}).filter(([, v]) => v);
      if (ld.length) lines.push("  Cargas: " + ld.map(([k, v]) => `${k}: ${v}`).join(" · "));
      if (l.splits) lines.push("  Parciales: " + l.splits.replace(/\n+/g, " "));
      if (l.notes) lines.push("  Notas: " + l.notes.replace(/\n+/g, " "));
    });
    return lines.join("\n");
  }

  // ——— Series de fuerza: kg × reps por serie, sin cálculos a mano ———
  // "4×6 RIR2" → {sets: 4, reps: 6} · "Test 5RM" → {1, 5} · "2 + 2" → {2, null} · "—" → null
  function parseScheme(v) {
    if (!v || v === "—") return null;
    if (/test\s*5rm/i.test(v)) return { sets: 1, reps: 5 };
    const m = v.match(/(\d+)\s*×\s*(\d+|máx)?/i);
    if (m) return { sets: Math.min(8, +m[1]), reps: m[2] && !/máx/i.test(m[2]) ? +m[2] : null };
    const m2 = v.match(/^(\d+)\s*\+/);
    if (m2) return { sets: +m2[1], reps: null };
    return { sets: 3, reps: null };
  }
  const isDumbbell = (ex) => /mancuerna|martillo|laterales/i.test(ex);
  const isBodyweight = (ex) => /dominadas|fondos/i.test(ex);
  const kgStr = (n) => (n == null ? "PC" : fmtNum(n, 2));
  const e1rm = (kg, reps) => (kg && reps ? kg * (1 + Math.min(reps, 12) / 30) : 0);

  function setsSummary(sets) {
    if (!sets || !sets.length) return "";
    const kgs = [...new Set(sets.map((x) => x.kg))];
    if (kgs.length === 1) return `${kgStr(kgs[0])}${kgs[0] != null ? " kg" : ""} × ${sets.map((x) => x.reps ?? "?").join("-")}`;
    return sets.map((x) => `${kgStr(x.kg)}×${x.reps ?? "?"}`).join(", ");
  }
  function setsStats(sets) {
    let vol = 0, best = 0, reps = 0;
    (sets || []).forEach((x) => { vol += (x.kg || 0) * (x.reps || 0); reps += x.reps || 0; best = Math.max(best, e1rm(x.kg, x.reps)); });
    return { vol, best, reps, top: Math.max(0, ...(sets || []).map((x) => x.kg || 0)) };
  }
  function lastSets(exercise, beforeDate) {
    for (let i = ALL.length - 1; i >= 0; i--) {
      const s = ALL[i];
      if (s.date >= beforeDate) continue;
      const l = Store.getLog(s.id);
      if (l?.sets?.[exercise]?.length) return { sets: l.sets[exercise], text: setsSummary(l.sets[exercise]), date: s.date };
      if (l?.loads?.[exercise]) return { sets: null, text: l.loads[exercise], date: s.date };
    }
    return null;
  }
  // Sugerencia según las reglas del plan: si completaste todas las series y reps, +2,5 kg torso / +5 kg pierna
  function suggestKg(k, scheme, prev) {
    if (!prev?.sets?.length) return null;
    const top = Math.max(...prev.sets.map((x) => x.kg || 0));
    if (!top) return null;
    const allDone = scheme && prev.sets.length >= scheme.sets && (!scheme.reps || prev.sets.every((x) => (x.reps || 0) >= scheme.reps));
    return { kg: allDone ? top + (STRENGTH[k]?.legs ? 5 : 2.5) : top, up: allDone };
  }

  function strengthBlock(k, week, sessionId, editable) {
    const t = STRENGTH[k];
    const ci = t.weekCol[week];
    const s = byId[sessionId];
    const log = sessionId ? Store.getLog(sessionId) : null;
    const head = `<div class="row-between"><h3><span class="fbadge">${k}</span>${esc(t.label)}</h3><span class="pill">${t.cols[ci]}</span></div>
      ${t.note ? `<p class="muted tiny">${esc(t.note)}</p>` : ""}`;
    if (!editable) {
      return `<div class="strength">${head}<div class="exlist">${t.rows.map((r) =>
        `<div class="ex">${exThumb(r.ex)}<div class="ex-name">${esc(r.ex)}</div><div class="ex-sets">${esc(r.values[ci])}</div></div>`).join("")}</div></div>`;
    }
    return `<div class="strength" data-block="${k}">${head}
      <p class="muted tiny how">Ajusta <b>peso</b> y <b>reps</b> y toca la serie al acabarla. Se guarda sola. Para corregir una, tócala otra vez.</p>
      ${t.rows.map((r) => {
        const scheme = parseScheme(r.values[ci]);
        if (!scheme) return "";
        const prev = lastSets(r.ex, s.date);
        const sug = suggestKg(k, scheme, prev);
        const saved = log?.sets?.[r.ex] || [];
        const n = Math.max(scheme.sets, saved.length);
        const last = saved[saved.length - 1];
        const kg0 = last ? last.kg : sug?.kg ?? (prev?.sets ? prev.sets[prev.sets.length - 1].kg : null);
        const reps0 = last?.reps ?? scheme.reps ?? prev?.sets?.[0]?.reps ?? null;
        const unit = isDumbbell(r.ex) ? "kg/manc." : isBodyweight(r.ex) ? "lastre kg" : "kg";
        return `<div class="exlog" data-ex="${esc(r.ex)}" data-reps="${scheme.reps ?? ""}">
          <div class="exlog-head">${exThumb(r.ex)}<div class="ex-name">${esc(r.ex)}<small class="target">${esc(r.values[ci])} · descanso ${restLabel(restFor(r.ex))}</small></div><span class="exlog-stat"></span></div>
          ${prev ? `<div class="exlog-prev">Última · ${fmtDate(prev.date)}: <b>${esc(prev.text)}</b>${sug?.up ? ` · <span class="up">↑ toca subir</span>` : ""}</div>` : ""}
          ${!saved.length && log?.loads?.[r.ex] ? `<div class="exlog-prev">Anotado: <b>${esc(log.loads[r.ex])}</b></div>` : ""}
          <div class="pick">
            <div class="pk"><span>Peso <small>${unit}</small></span><div class="stepper"><button type="button" data-kstep="-2.5" aria-label="Menos 2,5 kg">−</button><input class="kg" inputmode="decimal" value="${kg0 != null ? fmtNum(kg0, 2) : ""}" placeholder="${isBodyweight(r.ex) ? "0" : "kg"}" aria-label="Peso"><button type="button" data-kstep="2.5" aria-label="Más 2,5 kg">+</button></div></div>
            <div class="pk"><span>Reps</span><div class="stepper"><button type="button" data-rstep="-1" aria-label="Una rep menos">−</button><input class="reps" inputmode="numeric" value="${reps0 ?? ""}" placeholder="reps" aria-label="Repeticiones"><button type="button" data-rstep="1" aria-label="Una rep más">+</button></div></div>
          </div>
          <div class="schips">${Array.from({ length: n }, (_, i) => setChip(i, saved[i])).join("")}<button type="button" class="sc add" data-act="add" aria-label="Añadir serie">+</button></div>
        </div>`;
      }).join("")}
      <div class="block-total"></div>
    </div>`;
  }

  // Ficha de una serie: vacía (pendiente) o hecha con su peso × reps
  function setChip(i, saved) {
    const d = saved ? ` data-kg="${saved.kg ?? ""}" data-reps="${saved.reps ?? ""}"` : "";
    return `<button type="button" class="sc ${saved ? "done" : ""}"${d}><b>${i + 1}</b><small>${saved ? chipTxt(saved) : "serie"}</small></button>`;
  }
  const chipTxt = (x) => `${x.kg != null ? kgStr(x.kg) : "PC"}×${x.reps ?? "?"}`;

  // Lógica de las fichas: tocar = serie hecha con el peso y reps del selector; tocar otra vez = deshacer
  function bindSets(root, onChange) {
    const refresh = (ex) => {
      const sets = readSets(ex);
      const st = setsStats(sets);
      ex.querySelector(".exlog-stat").innerHTML = sets.length ? `${sets.length} × · <b>${fmtNum(st.vol, 0)}</b> kg` : "";
      const block = ex.closest(".strength");
      let tv = 0, ts = 0;
      block.querySelectorAll(".exlog").forEach((e) => { const ss = readSets(e); ts += ss.length; tv += setsStats(ss).vol; });
      block.querySelector(".block-total").innerHTML = ts ? `<span>Total sesión</span><b>${ts} series · ${fmtNum(tv, 0)} kg</b>` : "";
    };
    root.querySelectorAll(".exlog").forEach((ex) => {
      refresh(ex);
      ex.addEventListener("click", (e) => {
        const b = e.target.closest("button"); if (!b) return;
        const kg = ex.querySelector(".kg"), reps = ex.querySelector(".reps");
        if (b.dataset.kstep) { kg.value = fmtNum(Math.max(0, (num(kg.value) ?? 0) + Number(b.dataset.kstep)), 2); return; }
        if (b.dataset.rstep) { reps.value = Math.max(0, (num(reps.value) ?? num(ex.dataset.reps) ?? 0) + Number(b.dataset.rstep)); return; }
        if (b.dataset.act === "add") {
          const n = ex.querySelectorAll(".sc:not(.add)").length;
          b.insertAdjacentHTML("beforebegin", setChip(n, null));
          return;
        }
        if (!b.classList.contains("sc")) return;
        if (b.classList.contains("done")) {
          b.classList.remove("done"); delete b.dataset.kg; delete b.dataset.reps; b.querySelector("small").textContent = "serie";
        } else {
          const x = { kg: num(kg.value), reps: num(reps.value) ?? num(ex.dataset.reps) };
          b.dataset.kg = x.kg ?? ""; b.dataset.reps = x.reps ?? "";
          b.classList.add("done"); b.querySelector("small").textContent = chipTxt(x);
          if (navigator.vibrate) navigator.vibrate(15);
        }
        refresh(ex);
        if (onChange) onChange();
      });
    });
  }

  // Lee las series hechas (fichas marcadas)
  function readSets(ex) {
    return [...ex.querySelectorAll(".sc.done")].map((c) => ({ kg: num(c.dataset.kg), reps: num(c.dataset.reps) }));
  }

  // Texto para Strava («¿Qué entrenamiento hiciste?»): ejercicio: N series x R repeticiones con K kg
  function stravaText(s, form) {
    const lines = [];
    form.querySelectorAll(".exlog").forEach((ex) => {
      const name = ex.dataset.ex;
      let sets = readSets(ex);
      if (!sets.length) return;
      const groups = [];
      sets.forEach((x) => { const g = groups[groups.length - 1]; if (g && g.kg === x.kg && g.reps === x.reps) g.n++; else groups.push({ ...x, n: 1 }); });
      const per = isDumbbell(name) ? " por mancuerna" : "";
      lines.push(`${name}: ${groups.map((g) => `${g.n} ${g.n === 1 ? "serie" : "series"}${g.reps != null ? ` x ${g.reps} repeticiones` : ""}${g.kg ? ` con ${kgStr(g.kg)} kg${per}` : isBodyweight(name) ? " con peso corporal" : ""}`).join(", ")}`);
    });
    const fx = Object.values(FX).find((f) => s.detail.includes(f));
    if (fx && lines.length) lines.push(fx);
    return lines.join("\n");
  }

  // ——— Movilidad y vídeos de ejercicios ———
  const mediaHtml = (m, cls = "") => m.fig ? `<div class="media fig-wrap ${cls}">${Figs.svg(m.fig)}</div>`
    : `<div class="media anim ${cls}"><img src="img/ex/${m.img}/0.jpg" alt="" loading="lazy"><img class="b" src="img/ex/${m.img}/1.jpg" alt="" loading="lazy"></div>`;
  const doseTxt = (d) => `${d.reps ? `${d.reps} reps` : `${d.secs}"`}${d.sides ? " por lado" : ""}`;
  const exThumb = (name) => GYM_MEDIA[name] ? `<button type="button" class="exthumb" data-exmedia="${esc(name)}" aria-label="Ver cómo se hace ${esc(name)}"><img src="img/ex/${GYM_MEDIA[name][0]}/0.jpg" alt="" loading="lazy"></button>` : "";
  const mobDone = (date) => (Store.settings.mob || {})[date] || [];
  function mobChips(s) {
    const ids = mobilityFor(s);
    if (!ids.length) return "";
    return `<div class="mobchips"><span class="muted tiny">Movilidad</span>${ids.map((id) => { const r = ROUTINES.find((x) => x.id === id), d = mobDone(s.date).includes(id);
      return `<button type="button" class="mobchip ${d ? "done" : ""}" data-play="${id}">${d ? "✓" : "▶"} ${esc(r.name)} · ${r.min}'</button>`; }).join("")}</div>`;
  }
  function openSheetHtml(title, html) {
    closeSheet();
    const sh = document.createElement("div");
    sh.className = "sheet-wrap";
    sh.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sheet-head"><h2>${esc(title)}</h2><button class="iconbtn" data-close aria-label="Cerrar">×</button></div><div class="sheet-body">${html}</div></div>`;
    document.body.appendChild(sh);
    document.body.classList.add("noscroll");
    sh.addEventListener("click", (e) => { if (e.target === sh || e.target.closest("[data-close]")) closeSheet(); });
    Figs.start();
  }
  function openExercise(name) {
    const g = GYM_MEDIA[name];
    openSheetHtml(name, `${g ? `${mediaHtml({ img: g[0] }, "big")}<p class="muscles">Trabaja: <b>${esc(g[1])}</b></p>` : ""}
      <h3 class="mt">Tu progreso</h3>${exProgressHtml(name)}${g ? `<p class="muted tiny">Imágenes: free-exercise-db (dominio público).</p>` : ""}`);
    bindTips();
  }
  function openMove(id, dose) {
    const m = MOVES[id];
    openSheetHtml(m.name, `${mediaHtml(m, "big")}${dose ? `<div class="pdose"><b class="small">${doseTxt(dose)}</b></div>` : ""}<ul class="cues">${m.cues.map((c) => `<li>${esc(c)}</li>`).join("")}</ul><p class="muscles">Estira: <b>${esc(m.muscles.join(", "))}</b></p>`);
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-exmedia]");
    if (b) { e.preventDefault(); e.stopPropagation(); openExercise(b.dataset.exmedia); return; }
    const m = e.target.closest("[data-move]");
    if (m) { e.preventDefault(); const r = ROUTINES.find((x) => x.id === m.dataset.routine); openMove(m.dataset.move, r && r.items.find((i) => i[0] === m.dataset.move)[1]); return; }
    const p = e.target.closest("[data-play]");
    if (p) { e.preventDefault(); playRoutine(p.dataset.play); }
  });

  // Rutina guiada: un ejercicio por pantalla, cronómetro en los de tiempo y cambio de lado
  function playRoutine(rid) {
    const r = ROUTINES.find((x) => x.id === rid); if (!r) return;
    const steps = r.items.flatMap(([id, d]) => (d.sides ? [{ id, d, side: "Lado izquierdo" }, { id, d, side: "Lado derecho" }] : [{ id, d }]));
    let i = 0, left = 0, timer = null, lock = null, actx = null;
    try { if (navigator.wakeLock) navigator.wakeLock.request("screen").then((l) => (lock = l)).catch(() => {}); } catch {}
    closeSheet();
    const sh = document.createElement("div");
    sh.className = "sheet-wrap";
    document.body.appendChild(sh);
    document.body.classList.add("noscroll");
    const stop = () => { clearInterval(timer); timer = null; };
    const close = () => { stop(); try { if (lock) lock.release(); } catch {} closeSheet(); route(); };
    const beep = () => {
      try {
        actx = actx || new (window.AudioContext || window.webkitAudioContext)();
        const o = actx.createOscillator(), g = actx.createGain();
        o.frequency.value = 880; o.connect(g); g.connect(actx.destination);
        g.gain.setValueAtTime(0.25, actx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.45);
        o.start(); o.stop(actx.currentTime + 0.45);
      } catch {}
      if (navigator.vibrate) navigator.vibrate([120, 80, 120]);
    };
    const go = (n, auto) => { stop(); i = n; left = steps[i] ? steps[i].d.secs || 0 : 0; if (auto && left) startTimer(); else render(); };
    const startTimer = () => {
      stop();
      timer = setInterval(() => {
        left--;
        const c = sh.querySelector("#pClock"); if (c) c.textContent = left + "\"";
        if (left <= 0) { beep(); go(i + 1, true); }
      }, 1000);
      render();
    };
    function render() {
      if (i >= steps.length) {
        const mob = { ...(Store.settings.mob || {}) }, t = todayISO();
        mob[t] = [...new Set([...(mob[t] || []), rid])];
        Store.setSetting("mob", mob);
        try { if (lock) lock.release(); } catch {}
        sh.innerHTML = `<div class="sheet player" role="dialog" aria-modal="true"><div class="sheet-body done-screen"><div class="big-check">✓</div><h2>${esc(r.name)}: hecha</h2><p class="muted">${r.items.length} ejercicios · unos ${r.min} minutos</p><button class="btn primary" data-close>Cerrar</button></div></div>`;
        return;
      }
      const st = steps[i], m = MOVES[st.id];
      sh.innerHTML = `<div class="sheet player" role="dialog" aria-modal="true" aria-label="${esc(r.name)}">
        <div class="sheet-head"><div><div class="eyebrow">${esc(r.name)} · ${i + 1}/${steps.length}</div><h2>${esc(m.name)}</h2></div><button class="iconbtn" data-close aria-label="Cerrar">×</button></div>
        <div class="pbar"><i style="width:${(i / steps.length) * 100}%"></i></div>
        <div class="sheet-body">${mediaHtml(m, "big")}
          <div class="pdose">${st.side ? `<span class="side">${st.side}</span>` : ""}${st.d.secs ? `<b id="pClock">${left}"</b>` : `<b>${st.d.reps} reps</b>`}</div>
          <ul class="cues">${m.cues.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
          <p class="muscles">Estira: <b>${esc(m.muscles.join(", "))}</b></p></div>
        <div class="pctl"><button class="btn" data-prev ${i === 0 ? "disabled" : ""} aria-label="Anterior">←</button>
          ${st.d.secs ? `<button class="btn primary grow" data-timer>${timer ? "Pausa" : left < st.d.secs ? "Seguir" : "Empezar"}</button>` : `<button class="btn primary grow" data-next>Hecho ✓</button>`}
          <button class="btn" data-skip aria-label="Siguiente">→</button></div></div>`;
      Figs.start();
    }
    sh.addEventListener("click", (e) => {
      if (e.target === sh || e.target.closest("[data-close]")) return close();
      if (e.target.closest("[data-prev]")) return go(Math.max(0, i - 1));
      if (e.target.closest("[data-skip]") || e.target.closest("[data-next]")) return go(i + 1);
      if (e.target.closest("[data-timer]")) { if (timer) { stop(); render(); } else startTimer(); }
    });
    go(0);
  }

  // ——— Movilidad (pantalla) ———
  function viewMovilidad() {
    const t = todaySession(), rec = mobilityFor(t), done = mobDone(todayISO());
    app.innerHTML = `
      <section class="pagehead"><div class="eyebrow">Para corredores · cadera, flexores y tobillos</div><h1 class="display">Movilidad</h1>
        <p class="muted">Hoy toca <b>${rec.map((id) => ROUTINES.find((r) => r.id === id).name.toLowerCase()).join(" y ")}</b>. Toca un ejercicio para ver cómo se hace, o empieza la rutina guiada con cronómetro.</p></section>
      ${ROUTINES.map((r) => `<section class="card routine ${rec.includes(r.id) ? "rec" : ""}">
        <div class="row-between"><div><div class="eyebrow">${esc(r.when)}${rec.includes(r.id) ? " · toca hoy" : ""}</div><h2>${esc(r.name)}</h2></div><span class="pill">${r.min}'</span></div>
        <p class="muted tiny">${esc(r.tone)}</p>
        <div class="mlist">${r.items.map(([id, d]) => `<button type="button" class="mrow" data-move="${id}" data-routine="${r.id}">${mediaHtml(MOVES[id], "thumb")}<span><b>${esc(MOVES[id].name)}</b><small>${doseTxt(d)}</small></span></button>`).join("")}</div>
        <button class="btn ${done.includes(r.id) ? "" : "primary"} block" data-play="${r.id}">${done.includes(r.id) ? "✓ Hecha hoy · repetir" : "▶ Empezar rutina guiada"}</button>
      </section>`).join("")}
      <p class="muted tiny credits">Fotos: free-exercise-db (dominio público). Monigotes: en rojo, la zona que se estira.</p>`;
    Figs.start();
  }

  // ——— Sesión ———
  function viewSesion(id) {
    const s = byId[id];
    if (!s) return viewHoy();
    const log = Store.getLog(id) || {};
    const idx = ALL.indexOf(s);
    const prev = ALL[idx - 1], next = ALL[idx + 1];
    const metrics = s.metrics ? METRIC_SETS[s.metrics] : [];
    const hasRun = ["run", "hybrid", "test", "race"].includes(s.kind);
    const seg = (name, opts, val) => `<div class="seg" data-name="${name}">${opts.map(([v, l]) => `<button type="button" data-v="${v}" class="${val === v ? "on" : ""} ${name === "fatigue" ? "f-" + v : ""}">${l}</button>`).join("")}</div>`;
    app.innerHTML = `
      <div class="pager top">${prev ? `<a class="btn ghost" href="#/sesion/${prev.id}">← ${prev.day}</a>` : "<span></span>"}<a class="btn ghost" href="#/plan/${s.week}">Semana ${s.week}</a>${next ? `<a class="btn ghost" href="#/sesion/${next.id}">${next.day} →</a>` : "<span></span>"}</div>
      ${heroSession(s, fmtDate(s.date, true))}
      <form id="logForm" class="card form" autocomplete="off" data-date="${s.date}">
        <div class="eyebrow">Registro</div><h2>¿Cómo ha ido?</h2>
        ${s.strength.map((k) => strengthBlock(k, s.week, s.id, true)).join("")}
        ${s.strength.length ? `<div class="stravabox">
          <div class="row-between"><label for="stravaTxt">Para pegar en Strava</label><button type="button" class="chip-btn" id="cpStrava">${ico("copy")} Copiar</button></div>
          <textarea id="stravaTxt" rows="5" readonly placeholder="Marca las series hechas y aquí aparecerá el texto."></textarea>
          <p class="muted tiny">En Strava: «¿Qué entrenamiento hiciste?» → pegar.</p>
        </div>` : ""}
        ${hasRun ? `<div class="stravarun" id="stravaRun">${Strava.connected()
          ? `<button type="button" class="btn ghost" id="stravaImp">↓ Traer la carrera de Strava</button><span class="muted tiny" id="stravaMsg"></span>`
          : `<span class="muted tiny">Conecta Strava en <a class="link" href="#/datos">Datos</a> para rellenar la carrera sola.</span>`}</div>` : ""}
        <label>Estado</label>
        ${seg("status", [["done", "Hecha"], ["partial", "Parcial"], ["skipped", "No hecha"]], log.status || "")}
        <label>Semáforo de fatiga (antes de entrenar)</label>
        ${seg("fatigue", [["verde", "Verde"], ["amarillo", "Amarillo"], ["rojo", "Rojo"]], log.fatigue || "")}
        <label for="rpe">Esfuerzo percibido (RPE) <output id="rpeOut">${log.rpe || "—"}</output></label>
        <input type="range" id="rpe" name="rpe" min="1" max="10" step="1" value="${log.rpe || 6}" data-touched="${log.rpe ? 1 : 0}">
        <div class="rpe-scale"><span>1 · muy fácil</span><span>5 · moderado</span><span>10 · máximo</span></div>
        <div class="grid2">
          <div><label for="minutes">Duración (min)</label><input id="minutes" name="minutes" inputmode="decimal" value="${esc(log.minutes || "")}" placeholder="${parseInt(s.duration) || ""}"></div>
          ${hasRun ? `<div><label for="km">Km de carrera</label><input id="km" name="km" inputmode="decimal" value="${esc(log.km || "")}" placeholder="0"></div>` : ""}
          <div><label for="hr">FC media (ppm)</label><input id="hr" name="hr" inputmode="numeric" value="${esc(log.hr || "")}"></div>
          ${hasRun ? `<div><label for="hrmax">FC máx (ppm)</label><input id="hrmax" name="hrmax" inputmode="numeric" value="${esc(log.hrmax || "")}"></div>
          <div><label for="pace">Ritmo medio (min/km)</label><input id="pace" name="pace" value="${esc(log.pace || "")}" placeholder="4:30"></div>` : ""}
          <div><label for="weight">Peso (kg, en ayunas)</label><input id="weight" name="weight" inputmode="decimal" value="${esc(log.weight || "")}" placeholder="81"></div>
        </div>
        ${metrics.length ? `<div class="metricbox"><h3>Resultados</h3><div class="grid2">${metrics.map((m) =>
          `<div><label for="m_${m.key}">${esc(m.label)} <small>(${m.unit})</small></label><input id="m_${m.key}" data-metric="${m.key}" value="${esc(log.metrics?.[m.key] || "")}" placeholder="${esc(m.hint)}"></div>`).join("")}</div></div>` : ""}
        ${hasRun ? `<label for="splits">Parciales de carrera (opcional)</label>
        <textarea id="splits" name="splits" rows="2" placeholder="p. ej. 3:50, 3:49, 3:51, 3:48, 3:47">${esc(log.splits || "")}</textarea>
        <input type="hidden" name="be5k" value="${esc(log.be5k || "")}"><input type="hidden" name="be10k" value="${esc(log.be10k || "")}">
        ${log.be5k || log.be10k ? `<p class="muted tiny">Mejores marcas en esta carrera (Strava): ${[log.be5k && `5 km ${esc(log.be5k)}`, log.be10k && `10 km ${esc(log.be10k)}`].filter(Boolean).join(" · ")}</p>` : ""}` : ""}
        <label for="notes">Notas</label>
        <textarea id="notes" name="notes" rows="3" placeholder="Sensaciones, molestias, cambios…">${esc(log.notes || "")}</textarea>
        <div class="actions">
          <button class="btn primary grow" type="submit">Guardar registro</button>
          ${Store.getLog(id) ? `<button class="btn danger" type="button" id="delLog">Borrar</button>` : ""}
        </div>
        ${log.updatedAt ? `<p class="muted tiny">Actualizado: ${new Date(log.updatedAt).toLocaleString("es-ES")}</p>` : ""}
      </form>
    `;
    const form = $("#logForm");
    const stx = $("#stravaTxt");
    const paintStrava = () => { if (stx) stx.value = stravaText(s, form); };
    // Autoguardado de las series al marcarlas (no se pierden si sales de la pantalla)
    const autosave = () => {
      paintStrava();
      const cur = Store.getLog(id) || {};
      const sets = {}, loads = { ...(cur.loads || {}) };
      form.querySelectorAll(".exlog").forEach((ex) => { const ss = readSets(ex); if (ss.length) { sets[ex.dataset.ex] = ss; loads[ex.dataset.ex] = setsSummary(ss); } else if (cur.sets?.[ex.dataset.ex]) delete loads[ex.dataset.ex]; });
      if (!Object.keys(sets).length && !cur.status) { if (Store.getLog(id)) Store.deleteLog(id); return; }
      Store.setLog(id, { week: s.week, date: s.date, title: s.title, ...cur, status: cur.status || "partial", sets, loads });
    };
    bindSets(form, autosave);
    paintStrava();
    if ($("#cpStrava")) $("#cpStrava").onclick = () => { if (!stx.value) { toast("Aún no has marcado ninguna serie"); return; } copy(stx.value, $("#cpStrava")); };
    // Carrera desde Strava: se rellena sola al abrir si aún no hay km, o con el botón
    const impBtn = $("#stravaImp");
    const importRun = async (auto) => {
      const msg = $("#stravaMsg");
      msg.textContent = "Buscando en Strava…";
      try {
        const r = await Strava.runSummary(s.date);
        if (!r) { msg.textContent = "No hay carreras en Strava ese día."; return; }
        const setv = (n, v) => { const el = form.elements[n]; if (el && v != null && v !== "" && (!auto || !el.value)) el.value = v; };
        setv("km", fmtNum(r.km, 2));
        setv("pace", r.pace);
        setv("hr", r.hr ?? "");
        setv("hrmax", r.hrmax ?? "");
        setv("splits", r.splits);
        setv("be5k", r.best5k); setv("be10k", r.best10k);
        if (["run", "test", "race"].includes(s.kind)) setv("minutes", r.minutes);
        const mk = { test5k: ["t5k", r.best5k, "t5k_hr"], test10k: ["t10k", r.best10k, "t10k_hr"], race10k: ["race10k", r.best10k, "race_hr"] }[s.metrics];
        if (mk) { const t = form.querySelector(`[data-metric="${mk[0]}"]`), h = form.querySelector(`[data-metric="${mk[2]}"]`);
          if (t && mk[1] && (!auto || !t.value)) t.value = mk[1]; if (h && r.hr && (!auto || !h.value)) h.value = r.hr; }
        if (s.kind !== "hybrid" && !form.querySelector('.seg[data-name="status"] .on')) form.querySelector('.seg[data-name="status"] [data-v="done"]').classList.add("on");
        msg.innerHTML = `✓ ${esc(r.names)} · revisa y pulsa <b>Guardar</b>`;
      } catch (err) { msg.textContent = "No se pudo leer Strava: " + err.message; }
    };
    if (impBtn) {
      impBtn.onclick = () => importRun(false);
      if (!log.km && s.date <= todayISO()) importRun(true);
    }
    form.querySelectorAll(".seg").forEach((g) => g.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      const was = b.classList.contains("on");
      g.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
      if (!was) b.classList.add("on");
    }));
    const rpe = $("#rpe");
    const paintRpe = () => rpe.style.setProperty("--p", ((rpe.value - 1) / 9) * 100 + "%");
    paintRpe();
    rpe.addEventListener("input", () => { rpe.dataset.touched = 1; $("#rpeOut").textContent = rpe.value; paintRpe(); });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const segv = (n) => form.querySelector(`.seg[data-name="${n}"] .on`)?.dataset.v || "";
      const status = segv("status");
      if (!status) { toast("Elige el estado de la sesión"); return; }
      const data = { week: s.week, date: s.date, title: s.title, status, fatigue: segv("fatigue"),
        rpe: rpe.dataset.touched === "1" ? Number(rpe.value) : "", metrics: {}, loads: {} };
      ["minutes", "km", "hr", "hrmax", "pace", "weight", "splits", "be5k", "be10k", "notes"].forEach((k) => (data[k] = form.elements[k] ? form.elements[k].value.trim() : log[k] || ""));
      form.querySelectorAll("[data-metric]").forEach((i) => { if (i.value.trim()) data.metrics[i.dataset.metric] = i.value.trim(); });
      data.sets = {};
      form.querySelectorAll(".exlog").forEach((ex) => {
        const sets = readSets(ex);
        const name = ex.dataset.ex;
        if (sets.length) { data.sets[name] = sets; data.loads[name] = setsSummary(sets); }
        else if (log.loads?.[name] && !log.sets?.[name]) data.loads[name] = log.loads[name]; // conserva anotaciones antiguas
      });
      Store.setLog(id, { ...(Store.getLog(id) || {}), ...data });
      toast("Sesión guardada ✓");
      route();
    });
    const del = $("#delLog");
    if (del) del.onclick = () => { if (confirm("¿Borrar el registro de esta sesión?")) { Store.deleteLog(id); toast("Registro borrado"); route(); } };
  }

  // ——— Fuerza ———
  function viewFuerza(k) {
    const wn = currentWeekNum();
    const keys = STRENGTH_ORDER;
    const sel = keys.includes(k) ? k : null;
    app.innerHTML = `
      <section class="pagehead"><div class="eyebrow">Hipertrofia · ${keys.length} sesiones por semana</div><h1 class="display">Fuerza</h1>
      <p class="muted">${keys.map((x) => `${STRENGTH[x].label} (${STRENGTH[x].day.toLowerCase()})`).join(" · ")}. Resaltada, la columna de la semana ${wn}.</p>
      <div class="catchips">${keys.map((x) => `<a href="#/fuerza/${x}" class="chiplink ${sel === x ? "on" : ""}">${STRENGTH[x].label}</a>`).join("")}<a href="#/fuerza" class="chiplink ${!sel ? "on" : ""}">Todas</a></div></section>
      ${(sel ? [sel] : keys).map((x) => {
        const t = STRENGTH[x]; const ci = t.weekCol[wn];
        return `<section class="card"><div class="row-between"><h2><span class="fbadge">${x}</span>${esc(t.label)}</h2><span class="pill">${t.day}</span></div>
        ${t.note ? `<p class="muted">${esc(t.note)}</p>` : ""}
        <div class="exlist">${t.rows.map((r) => `<div class="ex">${exThumb(r.ex)}<div class="ex-name">${esc(r.ex)}</div><div class="ex-sets now">${esc(r.values[ci])}</div></div>`).join("")}</div>
        <details class="mt"><summary>Progresión completa</summary>
        <div class="scroll-x"><table class="tbl wide"><thead><tr><th>Ejercicio</th>${t.cols.map((c, i) => `<th class="${i === ci ? "hl" : ""}">${c}</th>`).join("")}</tr></thead>
        <tbody>${t.rows.map((r) => `<tr><td>${esc(r.ex)}</td>${r.values.map((v, i) => `<td class="${i === ci ? "hl" : ""}">${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div></details>
        ${loadHistory(x)}</section>`;
      }).join("")}
      <section class="card"><h2>Cómo cargar</h2><ul class="bul">${STRENGTH_RULES.map((r) => `<li>${esc(r)}</li>`).join("")}</ul></section>
      ${bestLifts()}
    `;
  }

  function loadHistory(k) {
    const rows = STRENGTH[k].rows.map((r) => {
      const hist = ALL.map((s) => ({ s, l: Store.getLog(s.id) })).filter(({ l }) => l?.sets?.[r.ex]?.length || l?.loads?.[r.ex]);
      return { ex: r.ex, hist };
    }).filter((r) => r.hist.length);
    if (!rows.length) return `<p class="muted tiny mt">Cuando registres series en las sesiones, aquí verás la evolución de kg, volumen y 1RM estimado.</p>`;
    return `<h3 class="mt">Historial</h3><div class="hist">
      ${rows.map((r) => {
        const pts = r.hist.map(({ s, l }) => ({ s, sets: l.sets?.[r.ex], text: l.sets?.[r.ex] ? setsSummary(l.sets[r.ex]) : l.loads[r.ex] }));
        const withSets = pts.filter((p) => p.sets);
        const last = withSets[withSets.length - 1], first = withSets[0];
        const b1 = last ? setsStats(last.sets).top : 0, b0 = first ? setsStats(first.sets).top : 0;
        const delta = withSets.length > 1 && b0 ? b1 - b0 : null;
        return `<details class="hist-ex"><summary><span class="ex-name">${esc(r.ex)}</span>
          <span class="hist-last">${last ? `<b>${esc(kgStr(setsStats(last.sets).top))}${setsStats(last.sets).top ? " kg" : ""}</b>` : ""}${delta != null ? `<small class="${delta >= 0 ? "pos" : "neg"}">${delta >= 0 ? "▲" : "▼"} ${fmtNum(Math.abs(delta), 1)} kg desde S${first.s.week}</small>` : ""}</span>${ico("chev", "chev")}</summary>
          ${withSets.length > 1 ? spark(withSets.map((p) => setsStats(p.sets).top)) : ""}
          <table class="tbl"><thead><tr><th>Sem</th><th>Series</th><th>Vol.</th><th>1RM est.</th></tr></thead><tbody>
          ${pts.slice().reverse().map((p) => { const st = p.sets ? setsStats(p.sets) : null;
            return `<tr><td><a href="#/sesion/${p.s.id}">S${p.s.week}</a></td><td>${esc(p.text)}</td><td>${st ? fmtNum(st.vol, 0) : "—"}</td><td>${st?.best ? fmtNum(st.best, 0) : "—"}</td></tr>`; }).join("")}
          </tbody></table></details>`;
      }).join("")}
    </div>`;
  }

  function spark(vals) {
    const W = 300, H = 46, p = 5;
    const lo = Math.min(...vals), hi = Math.max(...vals), rng = hi - lo || 1;
    const x = (i) => p + (W - 2 * p) * (i / (vals.length - 1));
    const y = (v) => H - p - (H - 2 * p) * ((v - lo) / rng);
    const d = vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    return `<div class="chart spark"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path class="l-real" d="${d}"/>${vals.map((v, i) => `<circle class="pt" cx="${x(i)}" cy="${y(v)}" r="3.5"/>`).join("")}</svg></div>`;
  }

  function metricValue(key) {
    let val = null, when = null;
    ALL.forEach((s) => { const v = Store.getLog(s.id)?.metrics?.[key]; if (v) { val = v; when = s; } });
    return val ? { val, s: when } : null;
  }

  // Mejores marcas estimadas (1RM por Epley) a partir de las series registradas
  function bestLifts() {
    const lifts = ["Press banca con barra", "Sentadilla trasera", "Peso muerto convencional", "Dominadas (lastre si haces más de 8)", "Press militar con mancuernas", "Hip thrust"];
    const rows = lifts.map((ex) => {
      let best = null;
      ALL.forEach((s) => { (Store.getLog(s.id)?.sets?.[ex] || []).forEach((x) => { const v = e1rm(x.kg, x.reps); if (v && (!best || v > best.v)) best = { v, x, s }; }); });
      return { ex, best };
    }).filter((r) => r.best);
    if (!rows.length) return `<section class="card"><h2>Marcas estimadas</h2><p class="muted">Cuando registres series de los básicos, aquí verás tu 1RM estimado y las cargas para cada rango.</p></section>`;
    const pc = [["10 reps", 0.75], ["8 reps", 0.8], ["6 reps", 0.85], ["5 reps", 0.87]];
    return `<section class="card"><h2>Marcas estimadas</h2><p class="muted">1RM estimado con tu mejor serie (fórmula de Epley) y la carga orientativa para cada rango a RIR 1–2.</p>
      <div class="scroll-x"><table class="tbl"><thead><tr><th>Ejercicio</th><th>Mejor serie</th><th>1RM</th>${pc.map(([l]) => `<th>${l}</th>`).join("")}</tr></thead><tbody>
      ${rows.map(({ ex, best }) => `<tr><td>${esc(ex.replace(" (lastre si haces más de 8)", " (lastre)"))}</td><td class="nowrap"><a href="#/sesion/${best.s.id}">${kgStr(best.x.kg)}×${best.x.reps}</a></td><td><b>${fmtNum(best.v, 0)}</b></td>${pc.map(([, p]) => `<td>${Math.round((best.v * p) / 2.5) * 2.5}</td>`).join("")}</tr>`).join("")}
      </tbody></table></div></section>`;
  }

  // ——— Gráfica de evolución en el tiempo (fechas en X) ———
  // pts: [{ date, v, tip }] · refs: líneas de referencia [{ v, label }] · invert: valores menores arriba (tiempos)
  function trendChart(pts, { fmtY = (v) => fmtNum(v, 0), refs = [], invert = false, H = 170, label = "Evolución" } = {}) {
    if (!pts.length) return "";
    const W = 420, pl = 44, pr = 12, pt = 14, pb = 24;
    const vals = [...pts.map((p) => p.v), ...refs.map((r) => r.v)];
    let lo = Math.min(...vals), hi = Math.max(...vals);
    const pad = (hi - lo || Math.abs(hi) * 0.05 || 1) * 0.15; lo -= pad; hi += pad;
    const t0 = Date.parse(pts[0].date), t1 = Date.parse(pts[pts.length - 1].date), span = t1 - t0;
    const x = (d) => (span ? pl + (W - pl - pr) * ((Date.parse(d) - t0) / span) : (pl + W - pr) / 2);
    const y = (v) => { const f = (v - lo) / (hi - lo); return pt + (H - pt - pb) * (invert ? f : 1 - f); };
    const ticks = [lo + (hi - lo) * 0.15, (lo + hi) / 2, hi - (hi - lo) * 0.15];
    const path = pts.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
    const xl = span ? [pts[0], pts[pts.length - 1]] : [pts[0]];
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">
      ${ticks.map((v) => `<line class="grid" x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="${pl - 6}" y="${y(v) + 4}" text-anchor="end">${fmtY(v)}</text>`).join("")}
      ${refs.map((r) => `<line class="l-ref" x1="${pl}" x2="${W - pr}" y1="${y(r.v)}" y2="${y(r.v)}"/><text class="axis ref" x="${W - pr}" y="${y(r.v) - 4}" text-anchor="end">${esc(r.label)}</text>`).join("")}
      ${xl.map((p, i) => `<text class="axis" x="${x(p.date)}" y="${H - 6}" text-anchor="${span ? (i ? "end" : "start") : "middle"}">${fmtDate(p.date)}</text>`).join("")}
      ${pts.length > 1 ? `<path class="l-real" d="${path}"/>` : ""}
      ${pts.map((p) => `<circle class="pt" cx="${x(p.date)}" cy="${y(p.v)}" r="4"/>`).join("")}
      ${pts.map((p) => `<g class="hit" data-tip="${esc(p.tip)}"><circle cx="${x(p.date)}" cy="${y(p.v)}" r="12" fill="transparent"/></g>`).join("")}
    </svg></div>`;
  }

  // ——— Progreso por ejercicio ———
  function exHistory(ex) {
    return ALL.map((s) => ({ s, sets: Store.getLog(s.id)?.sets?.[ex] })).filter((h) => h.sets?.length)
      .map(({ s, sets }) => ({ s, date: s.date, sets, text: setsSummary(sets), ...setsStats(sets) }));
  }
  function exProgressHtml(ex) {
    const h = exHistory(ex);
    if (!h.length) return `<p class="muted tiny">Aún no has registrado series de este ejercicio. Cuando lo hagas, aquí verás cómo evolucionan tus kilos y tu 1RM estimado.</p>`;
    const bw = isBodyweight(ex) && h.every((x) => !x.top);
    const pr = h.reduce((a, b) => (b.best > a.best ? b : a), h[0]);
    const prSet = pr.sets.reduce((a, b) => (e1rm(b.kg, b.reps) > e1rm(a.kg, a.reps) ? b : a));
    const first = h[0], last = h[h.length - 1];
    const d = (a, b) => { const v = a - b; return `<small class="${v >= 0 ? "pos" : "neg"}">${v >= 0 ? "▲" : "▼"} ${fmtNum(Math.abs(v), 1)}</small>`; };
    const series = bw ? h.map((x) => ({ date: x.date, v: x.reps, tip: `${fmtDate(x.date)} · ${x.text}` }))
      : h.map((x) => ({ date: x.date, v: Math.round(x.best * 10) / 10, tip: `${fmtDate(x.date)} · ${x.text} · 1RM ≈ ${fmtNum(x.best, 0)} kg` }));
    return `<div class="kpis three exkpis">
        <div><span>${bw ? "Reps totales" : "Última carga"}</span><b>${bw ? last.reps : `${kgStr(last.top)}<small> kg</small>`}</b>${h.length > 1 ? d(bw ? last.reps : last.top, bw ? first.reps : first.top) : ""}</div>
        <div><span>1RM estimado</span><b>${last.best ? fmtNum(last.best, 0) : "—"}<small>${last.best ? " kg" : ""}</small></b>${h.length > 1 && last.best ? d(last.best, first.best) : ""}</div>
        <div><span>Mejor marca</span><b>${pr.best ? `${kgStr(prSet.kg)}×${prSet.reps}` : "—"}</b><small>${fmtDate(pr.date)}</small></div>
      </div>
      <h3 class="mt">${bw ? "Repeticiones por sesión" : "1RM estimado por sesión"}</h3>
      ${trendChart(series, { fmtY: (v) => fmtNum(v, 0), label: `Evolución de ${ex}` })}
      <table class="tbl"><thead><tr><th>Fecha</th><th>Series</th><th>Vol.</th><th>1RM</th></tr></thead><tbody>
      ${h.slice().reverse().slice(0, 8).map((x) => `<tr><td><a href="#/sesion/${x.s.id}">${fmtDate(x.date)}</a></td><td>${esc(x.text)}</td><td>${x.vol ? fmtNum(x.vol, 0) : "—"}</td><td>${x.best ? fmtNum(x.best, 0) : "—"}</td></tr>`).join("")}
      </tbody></table>`;
  }
  function strengthProgressSection() {
    const exs = [...new Set(STRENGTH_ORDER.flatMap((k) => STRENGTH[k].rows.map((r) => r.ex)))].map((ex) => ({ ex, h: exHistory(ex) })).filter((x) => x.h.length);
    if (!exs.length) return `<section class="card"><h2>Fuerza por ejercicio</h2><p class="muted">Cuando registres series, aquí verás la evolución de cada ejercicio. Toca uno para ver su gráfica.</p></section>`;
    return `<section class="card"><h2>Fuerza por ejercicio</h2><p class="muted">1RM estimado (Epley) de la última sesión y cambio desde la primera. Toca un ejercicio para ver su gráfica.</p>
      <div class="exprog">${exs.map(({ ex, h }) => { const a = h[0], b = h[h.length - 1], dv = b.best - a.best;
        return `<button type="button" class="exrow" data-exmedia="${esc(ex)}"><span class="ex-name">${esc(ex)}<small>${h.length} sesión${h.length > 1 ? "es" : ""} · última ${esc(b.text)}</small></span>
          <span class="exrow-v"><b>${b.best ? fmtNum(b.best, 0) : "—"}</b>${h.length > 1 && b.best ? `<small class="${dv >= 0 ? "pos" : "neg"}">${dv >= 0 ? "▲" : "▼"} ${fmtNum(Math.abs(dv), 1)}</small>` : ""}</span>${ico("chev", "chev")}</button>`; }).join("")}</div></section>`;
  }

  // ——— Eficiencia aeróbica: ritmo en Z2 frente al pulso ———
  function z2Runs() {
    return ALL.map((s) => ({ s, l: Store.getLog(s.id) }))
      .filter(({ s, l }) => l && ["run", "hybrid"].includes(s.kind) && s.intensity === "suave" && num(l.hr) > 90 && toSec(l.pace) > 150 && toSec(l.pace) < 600)
      .map(({ s, l }) => { const pace = toSec(l.pace), hr = num(l.hr); return { s, date: s.date, pace, hr, eff: 60000 / pace / hr }; });
  }
  function efficiencySection() {
    const r = z2Runs();
    if (r.length < 2) return `<section class="card"><h2>Eficiencia aeróbica</h2><p class="muted">Compara tu ritmo en los rodajes suaves con tu pulso: si a igual pulso vas más rápido, tu motor aeróbico mejora. Necesito al menos 2 rodajes en Z2 con ritmo y FC (se rellenan solos desde Strava).</p></section>`;
    const hrs = r.map((x) => x.hr).sort((a, b) => a - b), ref = Math.round(hrs[Math.floor(hrs.length / 2)]);
    const at = (eff) => 60000 / (eff * ref); // seg/km a la FC de referencia
    const n = Math.min(3, Math.floor(r.length / 2)) || 1;
    const avg = (xs) => xs.reduce((a, x) => a + x.eff, 0) / xs.length;
    const e0 = avg(r.slice(0, n)), e1 = avg(r.slice(-n));
    const gain = at(e0) - at(e1), pct = (e1 / e0 - 1) * 100;
    return `<section class="card"><h2>Eficiencia aeróbica</h2>
      <p class="muted">Tu ritmo en los rodajes suaves llevado a una misma FC (${ref} ppm, tu pulso típico en Z2). Si la línea sube, a igual pulso vas más rápido.</p>
      <div class="kpis three">
        <div><span>Al principio</span><b>${fmtSec(at(e0))}<small>/km</small></b></div>
        <div><span>Ahora</span><b>${fmtSec(at(e1))}<small>/km</small></b></div>
        <div><span>Mejora</span><b class="${gain >= 0 ? "pos" : "neg"}">${gain >= 0 ? "−" : "+"}${Math.round(Math.abs(gain))}"<small>/km</small></b></div>
      </div>
      ${trendChart(r.map((x) => ({ date: x.date, v: Math.round(at(x.eff)), tip: `${fmtDate(x.date)} · ${fmtSec(x.pace)}/km a ${x.hr} ppm → ${fmtSec(at(x.eff))}/km a ${ref}` })),
        { fmtY: (v) => fmtSec(v), invert: true, label: "Ritmo a FC de referencia" })}
      <p class="muted tiny">${r.length} rodajes · ${pct >= 0 ? "+" : ""}${fmtNum(pct, 1)} % de metros por latido (medias de los ${n} primeros y los ${n} últimos). El calor, el desnivel o el cansancio también suben el pulso: mira la tendencia, no un día suelto.</p>
    </section>`;
  }

  // ——— Progreso ———
  function viewProgreso() {
    const t = todayISO();
    const past = ALL.filter((s) => s.date <= t && s.kind !== "rest");
    const logs = ALL.map((s) => Store.getLog(s.id)).filter(Boolean);
    const done = logs.filter((l) => ["done", "partial"].includes(l.status)).length;
    const km = logs.reduce((a, l) => a + (num(l.km) || 0), 0);
    const min = logs.reduce((a, l) => a + (num(l.minutes) || 0), 0);
    const kmPlan = WEEKS.reduce((a, w) => a + w.km, 0);
    const o = overall();
    app.innerHTML = `
      <section class="pagehead"><div class="eyebrow">Semana ${currentWeekNum()} de ${WEEKS.length}</div><h1 class="display">Progreso</h1></section>
      <section class="card statgrid">
        <div class="bigring">${ring(o.pct, 112, 10)}<div><b>${o.pct}%</b><small>del plan</small></div></div>
        <div class="kpis two">
          <div><span>Sesiones hasta hoy</span><b>${done}<small>/${past.length}</small></b></div>
          <div><span>Km de carrera</span><b>${fmtNum(km, 0)}<small>/${kmPlan}</small></b></div>
          <div><span>Horas</span><b>${fmtNum(min / 60, 1)}</b></div>
          <div><span>Días restantes</span><b>${Math.max(0, daysBetween(t, PLAN_END))}</b></div>
        </div>
      </section>
      <section class="card"><h2>Km de carrera por semana</h2>
        <div class="legend"><span><i class="sw sw-plan"></i>Planificado</span><span><i class="sw sw-real"></i>Registrado</span></div>
        ${kmChart()}</section>
      <section class="card"><h2>Carga semanal</h2><p class="muted">Sesiones hechas, km de carrera, series de fuerza, horas, RPE medio y semáforo.</p>${loadTable()}</section>
      <section class="card"><h2>Peso corporal</h2><p class="muted">Fase de volumen: objetivo +0,4 a +0,7 kg por semana (media de 7 días).</p>${weightChart()}</section>
      ${runSection()}
      ${efficiencySection()}
      ${strengthProgressSection()}
    `;
    bindTips();
  }

  function kmChart() {
    const W = 420, H = 200, pl = 28, pr = 8, pt = 12, pb = 28;
    const data = WEEKS.map((w) => ({ w: w.week, plan: w.km, real: weekStats(w).km }));
    const max = Math.max(60, ...data.map((d) => Math.max(d.plan, d.real)));
    const bw = (W - pl - pr) / data.length;
    const y = (v) => pt + (H - pt - pb) * (1 - v / max);
    const ticks = [0, 20, 40, 60].filter((v) => v <= max);
    const bar = (x, v, cls, w) => { const h = H - pb - y(v); if (h <= 0) return ""; const r = Math.min(4, w / 2, h);
      return `<path class="${cls}" d="M${x},${H - pb} V${y(v) + r} q0,-${r} ${r},-${r} H${x + w - r} q${r},0 ${r},${r} V${H - pb} Z"/>`; };
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Km planificados y registrados por semana">
      ${ticks.map((v) => `<line class="grid" x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="${pl - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join("")}
      ${data.map((d, i) => { const x = pl + i * bw + bw * 0.14, w = (bw * 0.72 - 2) / 2;
        return `<g class="hit" data-tip="S${d.w}: ${fmtNum(d.real)} de ${d.plan} km">
          <rect x="${pl + i * bw}" y="${pt}" width="${bw}" height="${H - pt - pb}" fill="transparent"/>
          ${bar(x, d.plan, "b-plan", w)}${bar(x + w + 2, d.real, "b-real", w)}
          <text class="axis ${d.w === currentWeekNum() ? "now" : ""}" x="${pl + i * bw + bw / 2}" y="${H - 8}" text-anchor="middle">${d.w}</text></g>`; }).join("")}
    </svg></div>`;
  }

  function loadTable() {
    const ws = WEEKS.filter((w) => w.start <= todayISO());
    return `<div class="scroll-x"><table class="tbl"><thead><tr><th>Sem</th><th>Hechas</th><th>Km</th><th>Series</th><th>Horas</th><th>RPE</th><th>Semáforo</th></tr></thead><tbody>
      ${ws.map((w) => { const s = weekStats(w);
        return `<tr><td><a href="#/plan/${w.week}">S${w.week}</a></td><td>${s.done + s.partial}/${s.planned}</td><td>${fmtNum(s.km)} <small class="muted">/ ${w.km}</small></td><td>${s.sets || "—"}</td><td>${fmtNum(s.min / 60)}</td>
        <td>${s.rpe ? `<span class="rpebar"><i style="width:${s.rpe * 10}%"></i></span> ${fmtNum(s.rpe)}` : "—"}</td>
        <td>${s.fat.verde ? `<span class="fd f-verde">${s.fat.verde}</span>` : ""}${s.fat.amarillo ? `<span class="fd f-amarillo">${s.fat.amarillo}</span>` : ""}${s.fat.rojo ? `<span class="fd f-rojo">${s.fat.rojo}</span>` : ""}</td></tr>`; }).join("")}
    </tbody></table></div>`;
  }

  function weightChart() {
    const pts = weightSeries();
    if (pts.length < 2) return `<p class="muted tiny">${pts.length ? `Último peso: ${fmtNum(pts[pts.length - 1].v)} kg. ` : ""}Apunta tu peso cada mañana en <a class="link" href="#/nutricion">Comida</a>.</p>`;
    const W = 420, H = 170, pl = 30, pr = 12, pt = 12, pb = 26;
    const vals = pts.map((p) => p.v);
    const lo = Math.floor(Math.min(...vals, ATHLETE.weightRef) - 1), hi = Math.ceil(Math.max(...vals, ATHLETE.weightRef) + 1);
    const t0 = Date.parse(PLAN_START), t1 = Math.max(Date.parse(PLAN_END), Date.parse(pts[pts.length - 1].date));
    const x = (d) => pl + (W - pl - pr) * ((Date.parse(d) - t0) / (t1 - t0));
    const y = (v) => pt + (H - pt - pb) * (1 - (v - lo) / (hi - lo));
    const avg = pts.map((p) => ({ date: p.date, v: avgWeight(pts, p.date).avg }));
    const path = avg.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
    return `<div class="legend"><span><i class="sw sw-plan"></i>Pesaje</span><span><i class="sw sw-real"></i>Media 7 días</span></div>
    <div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución del peso">
      ${[lo, ATHLETE.weightRef, hi].map((v) => `<line class="grid ${v === ATHLETE.weightRef ? "ref" : ""}" x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="${pl - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join("")}
      ${[1, 5, 9, 13, WEEKS.length].filter((v, i, a) => v <= WEEKS.length && a.indexOf(v) === i).map((wk) => `<text class="axis" x="${x(WEEKS[wk - 1].start)}" y="${H - 6}" text-anchor="middle">S${wk}</text>`).join("")}
      ${pts.map((p) => `<circle class="pt-raw" cx="${x(p.date)}" cy="${y(p.v)}" r="3"/>`).join("")}
      <path class="l-real" d="${path}"/>
      ${pts.map((p, i) => `<g class="hit" data-tip="${fmtDate(p.date)}: ${fmtNum(p.v)} kg · media ${fmtNum(avg[i].v, 1)}"><circle cx="${x(p.date)}" cy="${y(p.v)}" r="10" fill="transparent"/></g>`).join("")}
    </svg></div>`;
  }

  // Carrera: tests, predicción del 10K y objetivo
  function runSection() {
    const tg = target();
    const tests = [
      ...WEEKS.flatMap((w) => w.sessions.filter((x) => x.metrics === "test5k").map((x) => ({ s: x, key: "t5k", label: `Test 5 km (S${w.week})`, dist: 5 }))),
      ...WEEKS.flatMap((w) => w.sessions.filter((x) => x.metrics === "test10k").map((x) => ({ s: x, key: "t10k", label: `Test 10 km (S${w.week})`, dist: 10 }))),
      ...WEEKS.flatMap((w) => w.sessions.filter((x) => x.metrics === "race10k").map((x) => ({ s: x, key: "race10k", label: "<b>10K</b>", dist: 10 }))),
    ].map((t) => ({ ...t, v: Store.getLog(t.s.id)?.metrics?.[t.key] || null }));
    const rp = runPrediction(), pred = rp.pred, last = rp.last;
    // Mejor 10K equivalente de cada semana, para ver la tendencia
    const byWeek = {};
    rp.marks.forEach((m) => { const k = m.s.week; if (!byWeek[k] || m.eq < byWeek[k].eq) byWeek[k] = m; });
    const wk = Object.values(byWeek).sort((a, b) => (a.date < b.date ? -1 : 1));
    const goal = toSec(ATHLETE.targets[tg].total);
    const gap = pred - goal;
    return `<section class="card"><div class="row-between"><h2>Carrera 10K</h2>
      <div class="seg mini" id="tgSeg"><button data-v="A" class="${tg === "A" ? "on" : ""}">A</button><button data-v="B" class="${tg === "B" ? "on" : ""}">B</button></div></div>
      <div class="kpis three">
        <div><span>Predicción actual</span><b>${fmtSec(pred)}</b></div>
        <div><span>Objetivo ${tg}</span><b>${ATHLETE.targets[tg].total}</b></div>
        <div><span>Diferencia</span><b class="${gap <= 0 ? "pos" : "neg"}">${gap <= 0 ? "−" : "+"}${fmtSec(Math.abs(gap))}</b></div>
      </div>
      <p class="muted tiny">Predicción con la fórmula de Riegel a partir de ${last ? `${last.src} (${fmtSec(last.sec)}, ${fmtDate(last.date)})` : "tu 5 km de partida (20:00)"}: la mejor marca equivalente de las últimas 6 semanas. Ritmo objetivo: ${ATHLETE.targets[tg].pace}.</p>
      ${wk.length ? `<h3 class="mt">Tu 10K estimado, semana a semana</h3>${trendChart(wk.map((m) => ({ date: m.date, v: Math.round(m.eq), tip: `S${m.s.week} · ${fmtSec(m.eq)} (${m.src}: ${fmtSec(m.sec)})` })),
        { fmtY: (v) => fmtSec(v), invert: true, refs: ["A", "B"].map((k) => ({ v: toSec(ATHLETE.targets[k].total), label: `${k} ${ATHLETE.targets[k].total}` })), label: "10K estimado por semana" })}` : ""}
      <div class="scroll-x"><table class="tbl"><thead><tr><th>Test</th><th>Tiempo</th><th>Ritmo</th><th>10K equiv.</th></tr></thead><tbody>
        <tr><td class="muted">Punto de partida</td><td>20:00</td><td>4:00/km</td><td>${fmtSec(toSec("20:00") * Math.pow(2, 1.06))}</td></tr>
        ${tests.map((t) => { const sec = t.v ? toSec(t.v) : null;
          return `<tr><td>${t.label}<small class="src">${fmtDate(t.s.date)}</small></td><td>${sec ? `<a href="#/sesion/${t.s.id}"><b>${esc(t.v)}</b></a>` : "—"}</td><td>${sec ? fmtSec(sec / t.dist) + "/km" : ""}</td><td>${sec ? fmtSec(sec * Math.pow(10 / t.dist, 1.06)) : ""}</td></tr>`; }).join("")}
      </tbody></table></div>
      <p class="muted tiny">Para el sub-38 deberías hacer el 5 km en ~18:15 y el test de 10 km (S10) por debajo de 39:00.</p>
    </section>`;
  }

  // ——— Guía ———
  function phaseBlocks() {
    // Agrupa semanas consecutivas de la misma fase
    const out = [];
    WEEKS.forEach((w) => {
      const last = out[out.length - 1];
      if (last && last.phase === w.phase) { last.to = w; } else out.push({ phase: w.phase, from: w, to: w });
    });
    return out;
  }
  const PHASE_INFO = {
    base: "Vuelta a correr: rodajes continuos en Z2 controlando ritmo y pulso, y un fartlek suave en la S3. Fuerza a RIR 3.",
    descarga: "−40 % de volumen en fuerza y carrera. Se aprovecha la frescura para el test de 5 km (S4 y S8).",
    desarrollo: "Pico de volumen de hipertrofia. Llegan las series (800 m a 1,2 km), el umbral y tiradas de hasta 14 km.",
    especifica: "Bloques largos cerca del ritmo de 10K. La pierna baja un poco de volumen; el torso sigue a tope. Test de 10 km.",
    afinado: "Últimas sesiones duras a ritmo de carrera. La pierna pasa a mantenimiento.",
    carrera: "Frescura: poco volumen, toques de ritmo, carga de hidratos jueves y viernes.",
  };
  const WEEK_TEMPLATE = [
    ["Lunes", "Series en pista", "Torso A"],
    ["Martes", "Pierna A + funcional", ""],
    ["Miércoles", "Opcional: 30' Z2 (desde S5)", "Torso B"],
    ["Jueves", "Umbral o tempo", "Brazos y hombro"],
    ["Viernes", "Pierna B + funcional", ""],
    ["Sábado", "Descanso", ""],
    ["Domingo", "Tirada larga", ""],
  ];
  const FX_BY_PHASE = [
    ["Base (S1–S4)", [FX.base1, FX.base2]],
    ["Desarrollo (S5–S8)", [FX.des1, FX.des2]],
    ["Específica (S9–S12)", [FX.esp1, FX.esp2]],
    ["Afinado (S13–S15)", [FX.afi1, FX.core]],
  ];

  function viewGuia() {
    const tg = target();
    const tests = ALL.filter((s) => s.metrics);
    const cw = currentWeekNum();
    app.innerHTML = `
      <section class="pagehead"><div class="eyebrow">Plan 10K · ${WEEKS.length} semanas</div><h1 class="display">Guía</h1>
        <p class="muted">Prioridad: ganar músculo. La carrera se entrena 3 días con calidad para correr el 10K del ${fmtDate(RACE_DATE, true)} lo mejor posible.</p></section>

      <section class="card"><h2>Tu objetivo</h2>
        <div class="goals">${["A", "B"].map((k) => `<div class="goal-card ${k === tg ? "on" : ""}"><small>${k === tg ? "Activo · " : ""}Objetivo ${k}</small><b>${ATHLETE.targets[k].total}</b><span>${ATHLETE.targets[k].pace}</span></div>`).join("")}</div>
        <p class="muted tiny">El test de 10 km del ${fmtDate(tests.find((s) => s.metrics === "test10k")?.date || RACE_DATE, true)} decide con cuál sales: por debajo de 39:00, objetivo A; si no, B. Cámbialo en <a class="link" href="#/datos">Datos</a>. En <a class="link" href="#/progreso">Progreso</a> tienes tu predicción actualizada.</p>
      </section>

      <section class="card"><h2>Semana tipo</h2><p class="muted">6 días, 2 dobles. Carrera por la mañana y fuerza por la tarde, con 6 h y una comida entre medias.</p>
        <div class="scroll-x"><table class="tbl week-tpl"><thead><tr><th>Día</th><th>Mañana</th><th>Tarde</th></tr></thead><tbody>
        ${WEEK_TEMPLATE.map(([d, m, t]) => `<tr><td><b>${d}</b></td><td>${richText(m)}</td><td>${t ? richText(t) : "<span class='muted'>—</span>"}</td></tr>`).join("")}
        </tbody></table></div>
        <p class="muted tiny">S1–S3: el lunes y el jueves son rodajes en Z2; las series empiezan en la S5. Nunca va pierna el día antes de series o de un test. El sábado de descanso deja las piernas frescas para la tirada.</p>
      </section>

      <section class="card"><h2>Fases</h2>
        <div class="phases">${phaseBlocks().map((b) => `<a class="phase-row ${PHASES[b.phase].color} ${cw >= b.from.week && cw <= b.to.week ? "now" : ""}" href="#/plan/${b.from.week}">
          <i></i><div><b>${PHASES[b.phase].name} <small>S${b.from.week}${b.to.week !== b.from.week ? "–" + b.to.week : ""} · ${fmtDate(b.from.start)} – ${fmtDate(b.to.end)}</small></b><span>${PHASE_INFO[b.phase]}</span></div></a>`).join("")}</div>
      </section>

      <section class="card"><h2>Tests y fechas clave</h2>
        <div class="timeline-v">${tests.map((s) => `<div><b>${fmtDate(s.date, true)}</b><span><a class="link" href="#/sesion/${s.id}">${esc(s.title)}</a>${s.metrics === "test5k" ? " · con él ajustamos ritmos" : s.metrics === "test10k" ? " · decide el objetivo A o B" : " · la carrera"}</span></div>`).join("")}</div>
      </section>

      <section class="card"><h2>Zonas y ritmos</h2><p class="muted">Orientativas (5 km en 20:00). Se recalculan con el test de 5 km (S4 y S8) y el de 10 km (S10). Hasta la S4, todo en Z2: apunta ritmo y FC para ver cómo mejora la forma.</p>
        <div class="zones">${ZONES.map((z) => `<div class="zone"><span class="zchip z-${z.z.toLowerCase()}">${z.z}</span><div><b>${z.name}</b><small>${z.use}</small></div>
          <div class="zone-v"><b>${z.z === "RO" ? ATHLETE.targets[tg].pace : z.pace}</b><small>${z.hr !== "—" ? z.hr + " FC umbral" : ""}</small></div></div>`).join("")}</div>
        ${hrZones()}
        <p class="muted tiny mt">Las series se miden por metros. En pista, vuelta automática por distancia en el reloj (o pulsa vuelta al llegar a los metros de la serie).</p></section>

      <section class="card"><h2>Hipertrofia</h2><p class="muted">Torso/Pierna + brazos: cada grupo muscular, 2 veces por semana. Detalle y progresión en <a class="link" href="#/fuerza">Fuerza</a>.</p>
        <ul class="bul">${STRENGTH_RULES.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>
        <div class="split">${STRENGTH_ORDER.map((k) => `<a href="#/fuerza/${k}" class="split-item"><span class="fbadge">${k}</span><b>${STRENGTH[k].label}</b><small>${STRENGTH[k].day}</small></a>`).join("")}</div>
      </section>

      <section class="card"><h2>Funcional</h2><p class="muted">Finishers de 8–12' al final de Pierna A y Pierna B: acondicionamiento y cuerpo entero sin restar a la hipertrofia ni castigar la pierna antes de correr.</p>
        ${FX_BY_PHASE.map(([ph, list]) => `<h3 class="mt">${ph}</h3><ul class="bul">${list.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`).join("")}
        <p class="muted tiny mt">Cargas que te dejen moverte sin pararte. En descargas y antes de tests, solo core. Si al día siguiente hay series y vas cargado, sáltatelo.</p></section>

      <section class="card"><h2>Estrategia del 10K</h2><ul class="bul">${RACE_TIPS.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></section>

      ${trafficLight()}

      <section class="card"><h2>Si pierdes un día</h2><ul class="bul">${FATIGUE.missed.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        <p class="muted">Dolor punzante o localizado en una articulación o tendón: para la sesión. Agujetas o fatiga difusa no son motivo para parar. Vigila lumbar y cadera en sentadilla, peso muerto y zancada búlgara: técnica antes que kilos.</p></section>

      <section class="card"><h2>Comida y recuperación</h2><p class="muted">Volumen: ganar 0,4–0,7 kg por semana. Menús, checklist y lista de la compra en <a class="link" href="#/nutricion">Comida</a>.</p>
        <div class="scroll-x"><table class="tbl"><thead><tr><th>Tipo de día</th><th>kcal</th><th>Hidratos</th></tr></thead><tbody>
          ${["doble", "pierna", "torso", "tirada", "descanso"].map((k) => { const t = targetsFor(k); return `<tr><td>${DAY_TYPES[k].name}<small class="src">${esc(DAY_TYPES[k].why)}</small></td><td>${fmtNum(t.kcal, 0)}</td><td>${t.c} g</td></tr>`; }).join("")}
        </tbody></table></div>
        <ul class="bul mt">
          <li><b>Proteína:</b> 180–215 g/día en 4–5 tomas; una en las 2 h tras entrenar.</li>
          <li><b>Creatina:</b> 5 g todos los días.</li>
          <li><b>Sueño:</b> 7–8 h. En los días dobles, una siesta de 20' entre sesiones ayuda mucho.</li>
          <li><b>Peso:</b> cada mañana en ayunas; manda la media semanal, no el dato suelto.</li>
          <li><b>Semana del 10K:</b> carga de hidratos jueves y viernes (7–8 g/kg) y desayuno 3 h antes de la salida.</li>
        </ul></section>

      <section class="card"><h2>Abreviaturas</h2><dl class="facts">${ABBR.map(([a, b]) => `<div><dt><b>${a}</b></dt><dd>${esc(b)}</dd></div>`).join("")}</dl></section>
    `;
  }

  function hrZones() {
    const hr5 = num(metricValue("t5k_hr")?.val);
    if (!hr5) return `<p class="muted tiny mt">Registra la FC media del test de 5 km para estimar aquí tus zonas de FC en ppm.</p>`;
    const hr = Math.round(hr5 * 0.96); // umbral ≈ 96 % de la FC media de un 5 km a tope
    const z = [["Z1", 0, 0.8], ["Z2", 0.8, 0.88], ["Z3", 0.89, 0.94], ["Z4", 0.95, 1.0], ["Z5", 1.02, null]];
    return `<h3 class="mt">Tus zonas de FC (umbral estimado ${hr} ppm)</h3><div class="hrz">${z.map(([n, a, b]) =>
      `<div><span class="zchip z-${n.toLowerCase()}">${n}</span><b>${a ? Math.round(hr * a) : "<"}${b ? (a ? "–" : "") + Math.round(hr * b) : "+"}</b></div>`).join("")}</div>`;
  }

  // ——— Nutrición ———
  const isoAdd = (iso, n) => addDays(iso, n);
  function sessionOn(date) { return ALL.find((s) => s.date === date) || null; }
  function autoDayType(date) { return dietTypeFor(sessionOn(date)); }
  function dayState(date) {
    const d = Store.getDay(date) || {};
    const manual = d.type ? (LEGACY_DAY[d.type] || d.type) : null;
    return { type: manual && DAY_TYPES[manual] ? manual : autoDayType(date), auto: !manual, opts: d.opts || {}, done: d.done || {}, extras: d.extras || {},
      swaps: d.swaps || {}, added: d.added || {}, weight: d.weight || "", raw: d };
  }
  function saveDay(date, patch) { const cur = Store.getDay(date) || {}; Store.setDay(date, { ...cur, ...patch }); }
  const boost = () => Number(Store.settings.dietBoost || 0);
  function targetsFor(type) {
    const t = DAY_TYPES[LEGACY_DAY[type] || type] || DAY_TYPES.suave, b = boost();
    return { kcal: t.kcal + b * 250, p: t.p, c: t.c + b * 40, f: t.f + b * 10 };
  }
  function mealOption(meal, st) { return meal.options.find((o) => o.id === (st.opts[meal.id] || "A")) || meal.options[0]; }

  // Gramos equivalentes en calorías al cambiar un alimento por otro (redondeo a 5 g o a ½ unidad)
  function equivGrams(fromKey, g, toKey) {
    const from = getFood(fromKey), to = getFood(toKey);
    const kcal = (from.k * g) / 100;
    if (!kcal || !to.k) return g;
    let ng = (kcal / to.k) * 100;
    if (to.unit === "ud" && to.unitG) return Math.max(to.unitG / 2, Math.round(ng / (to.unitG / 2)) * (to.unitG / 2));
    return Math.max(5, Math.round(ng / 5) * 5);
  }
  // Alimentos efectivos de una comida: plantilla + cambios (hoy o siempre) + añadidos
  function mealItems(meal, st) {
    const opt = mealOption(meal, st);
    const perm = Store.settings.swaps || {};
    const items = opt.items.map((it, i) => {
      const slot = `${meal.id}.${opt.id}.${i}`;
      const baseG = itemGrams(it, st.type);
      const sw = st.swaps[slot] || perm[slot];
      if (!sw || !baseG) return { key: it[0], g: baseG, i, slot, base: it[0] };
      return { key: sw.key, g: st.swaps[slot]?.g ?? equivGrams(it[0], baseG, sw.key), i, slot, base: it[0], swapped: st.swaps[slot] ? "day" : "perm" };
    });
    const added = (st.added[meal.id] || []).map((a, j) => ({ ...a, j }));
    return { opt, items, added };
  }
  // Diario de comidas: lo que le cuentas a Claude se publica en data/diario.json
  const DIARIO_KEY = "mi-planning-diario";
  let DIARIO = {};
  try { DIARIO = JSON.parse(localStorage.getItem(DIARIO_KEY)) || {}; } catch { DIARIO = {}; }
  async function loadDiario() {
    try {
      const r = await fetch("data/diario.json", { cache: "no-store" });
      if (!r.ok) return;
      const txt = await r.text();
      if (txt === localStorage.getItem(DIARIO_KEY)) return;
      DIARIO = JSON.parse(txt);
      try { localStorage.setItem(DIARIO_KEY, txt); } catch {}
      if (["hoy", "nutricion", "progreso"].includes(app.dataset.view)) { const y = window.scrollY; route(); window.scrollTo(0, y); }
    } catch {}
  }
  const diaryTotals = (day) => day.items.reduce((a, x) => ({ k: a.k + x.k, p: a.p + x.p, c: a.c + x.c, f: a.f + x.f }), { k: 0, p: 0, c: 0, f: 0 });
  function diaryCard(date, tg) {
    const day = DIARIO[date];
    if (!day || !day.items?.length) return "";
    const t = diaryTotals(day);
    const groups = [];
    day.items.forEach((x) => { const g = x.m || ""; if (!groups.length || groups[groups.length - 1].m !== g) groups.push({ m: g, items: [] }); groups[groups.length - 1].items.push(x); });
    const row = (x) => `<tr><td>${esc(x.n)}${x.q ? `<small>${esc(x.q)}</small>` : ""}</td><td>${Math.round(x.k)}</td><td>${fmtNum(x.p, 0)}</td><td>${fmtNum(x.c, 0)}</td><td>${fmtNum(x.f, 0)}</td></tr>`;
    const diff = (v, o) => { const d = Math.round(v - o); return `<span class="${d < 0 ? "neg" : "pos"}">${d > 0 ? "+" : ""}${fmtNum(d, 0)}</span>`; };
    return `<section class="card diary"><div class="row-between"><div><div class="eyebrow">Calculado por Claude</div><h2>Lo que has comido</h2></div><span class="pill">${day.items.length} alimentos</span></div>
      <div class="dtable-wrap"><table class="dtable"><thead><tr><th>Alimento</th><th>kcal</th><th>P</th><th>H</th><th>G</th></tr></thead>
      <tbody>${groups.map((g) => `${g.m ? `<tr class="grp"><td colspan="5">${esc(g.m)}</td></tr>` : ""}${g.items.map(row).join("")}`).join("")}</tbody>
      <tfoot><tr><td>Total</td><td>${fmtNum(t.k, 0)}</td><td>${fmtNum(t.p, 0)}</td><td>${fmtNum(t.c, 0)}</td><td>${fmtNum(t.f, 0)}</td></tr>
        <tr class="obj"><td>Objetivo</td><td>${fmtNum(tg.kcal, 0)}</td><td>${tg.p}</td><td>${tg.c}</td><td>${tg.f}</td></tr>
        <tr class="dif"><td>Diferencia</td><td>${diff(t.k, tg.kcal)}</td><td>${diff(t.p, tg.p)}</td><td>${diff(t.c, tg.c)}</td><td>${diff(t.f, tg.f)}</td></tr></tfoot></table></div>
      ${day.note ? `<p class="muted tiny">${esc(day.note)}</p>` : ""}
      <p class="muted tiny">Este día cuenta lo que le has dicho a Claude en lugar de las comidas marcadas abajo.</p></section>`;
  }
  function consumed(date) {
    if (DIARIO[date]?.items?.length) return diaryTotals(DIARIO[date]);
    const st = dayState(date);
    const parts = [];
    MEALS.forEach((m) => {
      const { items, added } = mealItems(m, st);
      const done = st.done[m.id] || [];
      items.forEach((it) => { if (done[it.i] && it.g) parts.push(macrosOf(it.key, it.g)); });
      added.forEach((a) => { if (a.done !== false) parts.push(macrosOf(a.key, a.g)); });
    });
    EXTRAS.forEach((e) => { const n = st.extras[e.id] || 0; for (let i = 0; i < n; i++) e.items.forEach((it) => parts.push(macrosOf(it[0], it[1]))); });
    return sumMacros(parts);
  }
  // Serie de pesos: diario de nutrición + registros de sesión
  function weightSeries() {
    const map = {};
    ALL.forEach((s) => { const v = num(Store.getLog(s.id)?.weight); if (v) map[s.date] = v; });
    Object.entries(Store.diet).forEach(([d, x]) => { const v = num(x.weight); if (v) map[d] = v; });
    return Object.keys(map).sort().map((d) => ({ date: d, v: map[d] }));
  }
  function avgWeight(series, endDate, days = 7) {
    const start = isoAdd(endDate, -(days - 1));
    const v = series.filter((p) => p.date >= start && p.date <= endDate).map((p) => p.v);
    return v.length ? { avg: v.reduce((a, b) => a + b, 0) / v.length, n: v.length } : null;
  }
  function weightTrend(date) {
    const ser = weightSeries();
    const cur = avgWeight(ser, date), prev = avgWeight(ser, isoAdd(date, -7)), prev2 = avgWeight(ser, isoAdd(date, -14));
    const rate = cur && prev && cur.n >= 3 && prev.n >= 3 ? cur.avg - prev.avg : null;
    const rate2 = prev && prev2 && prev.n >= 3 && prev2.n >= 3 ? prev.avg - prev2.avg : null;
    let advice = null;
    if (rate != null && rate2 != null) {
      if (rate < 0.25 && rate2 < 0.25) advice = { dir: 1, text: "Llevas 2 semanas subiendo menos de 0,25 kg/semana: toca comer más." };
      else if (rate > 1 && rate2 > 1) advice = { dir: -1, text: "Subes más de 1 kg/semana: gran parte es grasa. Baja un poco." };
      else advice = { dir: 0, text: "Ritmo de subida correcto. Mantén las calorías." };
    }
    return { cur, prev, rate, advice };
  }

  function macroBar(label, val, tgt, cls) {
    const pct = Math.min(100, (val / tgt) * 100);
    return `<div class="mbar ${cls}"><div class="mbar-top"><span>${label}</span><b>${Math.round(val)}<small> / ${tgt} g</small></b></div><div class="mbar-track"><i style="width:${pct}%"></i></div></div>`;
  }
  const SWAP_ICO = "M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7";

  function viewNutricion(arg) {
    if (arg === "pautas") return viewPautas();
    if (arg === "compra") return viewCompra();
    if (arg === "alimentos") return viewAlimentos();
    const date = /^\d{4}-\d{2}-\d{2}$/.test(arg || "") ? arg : todayISO();
    const st = dayState(date);
    const tg = targetsFor(st.type);
    const eat = consumed(date);
    const s = sessionOn(date);
    const tr = weightTrend(date);
    const pct = Math.min(100, Math.round((eat.k / tg.kcal) * 100));
    const left = Math.round(tg.kcal - eat.k);
    app.innerHTML = `
      <section class="pagehead"><div class="row-between">
        <div><div class="eyebrow">${date === todayISO() ? "Hoy · " : ""}${fmtDate(date, true)}</div><h1 class="display">Nutrición</h1></div>
        <div class="daynav"><a class="iconbtn" href="#/nutricion/${isoAdd(date, -1)}" aria-label="Día anterior">‹</a>${date !== todayISO() ? `<a class="iconbtn txt" href="#/nutricion">Hoy</a>` : ""}<a class="iconbtn" href="#/nutricion/${isoAdd(date, 1)}" aria-label="Día siguiente">›</a></div>
      </div>
      <div class="catchips daychips" id="dayType">${DAY_ORDER.map((k) => `<button data-v="${k}" class="${st.type === k ? "on" : ""}">${DAY_TYPES[k].short}</button>`).join("")}</div>
      <p class="daytype-why">${esc(DAY_TYPES[st.type].why)}</p>
      <p class="muted tiny daytype-note">${st.auto ? "Automático según el plan" : "Elegido a mano"}${s ? ` · <a class="link" href="#/sesion/${s.id}">${esc(s.title)}</a>` : ""}${!st.auto ? ` · <a href="#" id="autoType" class="link">volver a automático</a>` : ""}</p></section>
      <section class="card kcalcard">
        <div class="kcal-ring">${ring(pct, 104, 10)}<div><b>${fmtNum(eat.k, 0)}</b><small>de ${fmtNum(tg.kcal, 0)} kcal</small></div></div>
        <div class="kcal-side">
          <div class="kcal-left ${left <= 0 ? "ok" : ""}">${left > 0 ? `Faltan <b>${fmtNum(left, 0)}</b> kcal` : `Objetivo cumplido ✓`}</div>
          ${macroBar("Proteína", eat.p, tg.p, "m-p")}${macroBar("Hidratos", eat.c, tg.c, "m-c")}${macroBar("Grasa", eat.f, tg.f, "m-f")}
        </div>
      </section>
      ${diaryCard(date, tg)}
      <section class="card">
        <div class="row-between"><div><div class="eyebrow">En ayunas</div><h2>Peso</h2></div>
          <div class="weight-in"><input id="wIn" inputmode="decimal" value="${esc(st.weight)}" placeholder="kg" aria-label="Peso del día"><span>kg</span></div></div>
        <div class="kpis three">
          <div><span>Media 7 días</span><b>${tr.cur ? fmtNum(tr.cur.avg, 1) : "—"}</b></div>
          <div><span>Semana anterior</span><b>${tr.prev ? fmtNum(tr.prev.avg, 1) : "—"}</b></div>
          <div><span>Cambio/semana</span><b class="${tr.rate == null ? "" : tr.rate >= 0.25 ? "pos" : "neg"}">${tr.rate == null ? "—" : (tr.rate >= 0 ? "+" : "") + fmtNum(tr.rate, 2)}</b></div>
        </div>
        <p class="muted tiny">Objetivo: +0,4 a +0,7 kg por semana.${boost() ? ` Ajuste actual: <b>${boost() > 0 ? "+" : ""}${boost() * 250} kcal/día</b>.` : ""}</p>
        ${tr.advice ? `<div class="advice d${tr.advice.dir}"><span>${esc(tr.advice.text)}</span>${tr.advice.dir ? `<button class="btn ${tr.advice.dir > 0 ? "primary" : ""}" id="applyBoost" data-d="${tr.advice.dir}">${tr.advice.dir > 0 ? "Subir 250 kcal/día" : "Bajar 250 kcal/día"}</button>` : ""}</div>`
          : `<p class="muted tiny">Con 3+ pesajes en cada una de las últimas semanas te diré si hay que subir o bajar calorías.</p>`}
      </section>
      ${MEALS.map((m) => {
        const { opt, items, added } = mealItems(m, st);
        const done = st.done[m.id] || [];
        const visible = items.filter((it) => it.g);
        const all = visible.every((it) => done[it.i]) && added.every((a) => a.done !== false);
        const mm = sumMacros([...visible.map((it) => macrosOf(it.key, it.g)), ...added.map((a) => macrosOf(a.key, a.g))]);
        return `<section class="card meal ${all ? "complete" : ""}" data-meal="${m.id}">
          <div class="meal-head"><div><div class="eyebrow">${m.time}</div><h2>${m.name}</h2></div>
            <button class="mealcheck" data-all="${all ? 1 : 0}" aria-label="Marcar comida completa">${ico("check")}</button></div>
          ${m.options.length > 1 ? `<div class="seg mini opts">${m.options.map((o) => `<button data-opt="${o.id}" class="${o.id === opt.id ? "on" : ""}">${esc(o.name)}</button>`).join("")}</div>` : ""}
          <ul class="foods">${visible.map((it) => { const mc = macrosOf(it.key, it.g);
            return `<li class="${done[it.i] ? "on" : ""}" data-i="${it.i}"><span class="fcheck">${ico("check")}</span>
              <span class="fname">${esc(getFood(it.key).name)}${it.swapped ? `<small class="swapped">${it.swapped === "day" ? "cambiado hoy" : "cambiado siempre"}</small>` : ""}</span>
              <span class="famt">${fmtAmount(it.key, it.g)}</span><span class="fk">${mc.k ? Math.round(mc.k) : ""}</span>
              <button class="fbtn" data-swap="${it.slot}" data-base="${it.base}" data-key="${it.key}" data-g="${it.g}" data-bg="${itemGrams(opt.items[it.i], st.type)}" aria-label="Cambiar alimento"><svg class="ico" viewBox="0 0 24 24"><path d="${SWAP_ICO}"/></svg></button></li>`; }).join("")}
            ${added.map((a) => { const mc = macrosOf(a.key, a.g);
            return `<li class="added ${a.done !== false ? "on" : ""}" data-j="${a.j}"><span class="fcheck">${ico("check")}</span>
              <span class="fname">${esc(getFood(a.key).name)}<small class="swapped">añadido</small></span>
              <span class="famt">${fmtAmount(a.key, a.g)}</span><span class="fk">${Math.round(mc.k)}</span>
              <button class="fbtn del" data-del="${a.j}" aria-label="Quitar alimento">×</button></li>`; }).join("")}</ul>
          <button class="addfood" data-add="${m.id}">+ Añadir alimento</button>
          <div class="meal-foot"><span>${Math.round(mm.k)} kcal</span><span>P ${Math.round(mm.p)} · H ${Math.round(mm.c)} · G ${Math.round(mm.f)}</span></div>
          <p class="muted tiny">${esc(m.note)}</p>
        </section>`;
      }).join("")}
      <section class="card"><div class="eyebrow">Si te falta</div><h2>Extras</h2>
        <div class="extras">${EXTRAS.map((e) => { const n = st.extras[e.id] || 0; const k = Math.round(sumMacros(e.items.map((it) => macrosOf(it[0], it[1]))).k);
          return `<div class="extra ${n ? "on" : ""}" data-x="${e.id}"><div><b>${esc(e.name)}</b><small>${e.items.map((it) => `${fmtAmount(it[0], it[1])} ${getFood(it[0]).name.toLowerCase()}`).join(" + ")} · ${k} kcal</small></div>
            <div class="counter"><button data-d="-1" aria-label="Quitar">−</button><span>${n}</span><button data-d="1" aria-label="Añadir">+</button></div></div>`; }).join("")}</div>
      </section>
      <div class="pager three"><a class="btn" href="#/nutricion/alimentos">Alimentos</a><a class="btn" href="#/nutricion/pautas">Pautas</a><a class="btn" href="#/nutricion/compra">La compra</a></div>
    `;
    const rerender = () => { const y = window.scrollY; header("nutricion"); viewNutricion(date); window.scrollTo(0, y); };
    $("#dayType").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; saveDay(date, { type: b.dataset.v === autoDayType(date) ? null : b.dataset.v }); rerender(); };
    const at = $("#autoType"); if (at) at.onclick = (e) => { e.preventDefault(); saveDay(date, { type: null }); rerender(); };
    $("#wIn").onchange = (e) => { saveDay(date, { weight: e.target.value.trim() }); toast("Peso guardado ✓"); rerender(); };
    const ab = $("#applyBoost"); if (ab) ab.onclick = () => { Store.setSetting("dietBoost", boost() + Number(ab.dataset.d)); toast(`Calorías ${ab.dataset.d > 0 ? "+" : "−"}250 kcal/día`); rerender(); };
    app.querySelectorAll(".meal").forEach((card) => {
      const mid = card.dataset.meal;
      const meal = MEALS.find((m) => m.id === mid);
      card.addEventListener("click", (e) => {
        const cur = dayState(date);
        const done = [...(cur.done[mid] || [])];
        const ob = e.target.closest("[data-opt]");
        if (ob) { saveDay(date, { opts: { ...cur.opts, [mid]: ob.dataset.opt }, done: { ...cur.done, [mid]: [] } }); return rerender(); }
        const sw = e.target.closest("[data-swap]");
        if (sw) {
          const slot = sw.dataset.swap, baseKey = sw.dataset.base, baseG = Number(sw.dataset.bg);
          return openFoodPicker({
            title: `Cambiar ${getFood(sw.dataset.key).name.toLowerCase()}`, swapFrom: { key: baseKey, g: baseG }, current: sw.dataset.key, scope: true,
            isSwapped: !!(cur.swaps[slot] || (Store.settings.swaps || {})[slot]),
            onPick: (key, g, scope) => {
              const swaps = { ...cur.swaps }; const perm = { ...(Store.settings.swaps || {}) };
              if (key === null) { delete swaps[slot]; delete perm[slot]; Store.setSetting("swaps", perm); saveDay(date, { swaps }); toast("Alimento original"); return rerender(); }
              if (scope === "siempre") { perm[slot] = { key }; delete swaps[slot]; Store.setSetting("swaps", perm); saveDay(date, { swaps }); }
              else { swaps[slot] = { key, g }; saveDay(date, { swaps }); }
              toast(`Cambiado por ${getFood(key).name.toLowerCase()} ✓`); rerender();
            },
          });
        }
        const del = e.target.closest("[data-del]");
        if (del) { const list = [...(cur.added[mid] || [])]; list.splice(+del.dataset.del, 1); saveDay(date, { added: { ...cur.added, [mid]: list } }); return rerender(); }
        const add = e.target.closest("[data-add]");
        if (add) return openFoodPicker({ title: `Añadir a ${meal.name.toLowerCase()}`, onPick: (key, g) => {
          const list = [...(cur.added[mid] || []), { key, g, done: true }];
          saveDay(date, { added: { ...cur.added, [mid]: list } }); toast(`${getFood(key).name} añadido ✓`); rerender(); } });
        const lj = e.target.closest("li[data-j]");
        if (lj) { const list = [...(cur.added[mid] || [])]; const a = list[+lj.dataset.j]; list[+lj.dataset.j] = { ...a, done: a.done === false }; saveDay(date, { added: { ...cur.added, [mid]: list } }); return rerender(); }
        const li = e.target.closest("li[data-i]");
        if (li) { const i = +li.dataset.i; done[i] = !done[i]; saveDay(date, { done: { ...cur.done, [mid]: done } }); return rerender(); }
        const mc = e.target.closest(".mealcheck");
        if (mc) {
          const on = mc.dataset.all !== "1";
          const n = mealOption(meal, cur).items.length;
          const added = (cur.added[mid] || []).map((a) => ({ ...a, done: on }));
          saveDay(date, { done: { ...cur.done, [mid]: Array.from({ length: n }, () => on) }, added: { ...cur.added, [mid]: added } });
          return rerender();
        }
      });
    });
    app.querySelectorAll(".extra").forEach((x) => x.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      const cur = dayState(date);
      const n = Math.max(0, (cur.extras[x.dataset.x] || 0) + Number(b.dataset.d));
      saveDay(date, { extras: { ...cur.extras, [x.dataset.x]: n } });
      rerender();
    }));
  }

  // ——— Buscador de alimentos (hoja inferior) ———
  function pushRecent(key) {
    const r = (Store.settings.recentFoods || []).filter((k) => k !== key);
    Store.setSetting("recentFoods", [key, ...r].slice(0, 15));
  }
  function foodRow(f, extra = "") {
    return `<button class="frow" data-k="${esc(f.key)}"><span><b>${esc(f.name)}</b><small>${FOOD_CATS[f.cat] || "Mis alimentos"}${f.unitG && f.unitName ? ` · 1 ${esc(f.unitName)} = ${f.unitG} ${f.base === "ml" ? "ml" : "g"}` : ""}</small></span>
      <span class="frow-m"><b>${Math.round(f.k)}</b><small>P ${fmtNum(f.p, 1)} · H ${fmtNum(f.c, 1)} · G ${fmtNum(f.f, 1)}</small></span>${extra}</button>`;
  }
  function openFoodPicker(opts) {
    closeSheet();
    const sheet = document.createElement("div");
    sheet.className = "sheet-wrap";
    sheet.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(opts.title)}">
      <div class="sheet-head"><h2>${esc(opts.title)}</h2><button class="iconbtn" data-close aria-label="Cerrar">×</button></div>
      <div class="sheet-body" id="pickBody"></div></div>`;
    document.body.appendChild(sheet);
    document.body.classList.add("noscroll");
    sheet.addEventListener("click", (e) => { if (e.target === sheet || e.target.closest("[data-close]")) closeSheet(); });
    let cat = (Store.settings.recentFoods || []).length ? "recientes" : "todos", q = "";
    const body = sheet.querySelector("#pickBody");
    const list = () => {
      let foods = allFoods();
      if (q) { const n = normTxt(q); foods = foods.filter((f) => normTxt(f.name).includes(n)); }
      else if (cat === "recientes") foods = (Store.settings.recentFoods || []).map((k) => getFood(k)).filter((f) => f && f.name);
      else if (cat === "mios") foods = Object.values(Store.foods);
      else if (cat !== "todos") foods = foods.filter((f) => f.cat === cat);
      if (opts.swapFrom && !q && cat === "todos") { const bc = getFood(opts.swapFrom.key).cat; foods = [...foods.filter((f) => f.cat === bc), ...foods.filter((f) => f.cat !== bc)]; }
      return foods;
    };
    const renderList = () => {
      const foods = list();
      body.innerHTML = `
        <div class="search"><svg class="ico" viewBox="0 0 24 24"><path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3"/></svg><input id="fq" type="search" placeholder="Buscar alimento…" value="${esc(q)}" autocomplete="off"></div>
        <div class="catchips">${[["recientes", "Recientes"], ["todos", "Todos"], ["mios", "Mis alimentos"], ...Object.entries(FOOD_CATS)].map(([k, l]) => `<button data-cat="${k}" class="${cat === k && !q ? "on" : ""}">${l}</button>`).join("")}</div>
        ${opts.isSwapped ? `<button class="btn ghost block" data-reset>↺ Volver al alimento original (${esc(getFood(opts.swapFrom.key).name)})</button>` : ""}
        <div class="flist">${foods.length ? foods.slice(0, 120).map((f) => foodRow(f)).join("") : `<p class="muted center">No hay resultados.${cat === "mios" || q ? "" : ""}</p>`}</div>
        <button class="btn block mt" data-new>+ Crear alimento${q ? ` «${esc(q)}»` : ""}</button>
        <p class="muted tiny center">kcal y macros por 100 g (o 100 ml)</p>`;
      const inp = body.querySelector("#fq");
      inp.oninput = () => { q = inp.value; const pos = inp.selectionStart; renderList(); const n = body.querySelector("#fq"); n.focus(); n.setSelectionRange(pos, pos); };
    };
    const renderAmount = (key) => {
      const f = getFood(key);
      let g = opts.swapFrom ? equivGrams(opts.swapFrom.key, opts.swapFrom.g, key) : f.unitG || 100;
      let scope = "hoy";
      const unitTxt = f.base === "ml" ? "ml" : "g";
      const draw = () => {
        const m = macrosOf(key, g);
        body.innerHTML = `
          <button class="link back" data-back>‹ Volver a la lista</button>
          <div class="pick-food"><b>${esc(f.name)}</b><small>${Math.round(f.k)} kcal · P ${fmtNum(f.p, 1)} · H ${fmtNum(f.c, 1)} · G ${fmtNum(f.f, 1)} por 100 ${unitTxt}</small></div>
          ${opts.swapFrom ? `<p class="muted tiny">Cantidad calculada para dar las mismas calorías que ${fmtAmount(opts.swapFrom.key, opts.swapFrom.g)} de ${esc(getFood(opts.swapFrom.key).name.toLowerCase())}.</p>` : ""}
          <div class="amount"><button data-step="-1">−</button><input id="gIn" inputmode="decimal" value="${Math.round(g)}"><span>${unitTxt}</span><button data-step="1">+</button></div>
          ${f.unitG ? `<div class="unitchips">${[0.5, 1, 2, 3].map((n) => `<button data-units="${n}">${String(n).replace(".", ",")} ${esc(f.unitName || "ud")}</button>`).join("")}</div>` : ""}
          <div class="pick-macros"><div><b>${Math.round(m.k)}</b><small>kcal</small></div><div><b>${Math.round(m.p)}</b><small>prot.</small></div><div><b>${Math.round(m.c)}</b><small>hidr.</small></div><div><b>${Math.round(m.f)}</b><small>grasa</small></div></div>
          ${opts.scope ? `<div class="seg" id="scopeSeg"><button data-scope="hoy" class="${scope === "hoy" ? "on" : ""}">Solo hoy</button><button data-scope="siempre" class="${scope === "siempre" ? "on" : ""}">Siempre en este menú</button></div>
            ${scope === "siempre" ? `<p class="muted tiny">«Siempre» ajusta los gramos solo según el tipo de día para mantener las calorías.</p>` : ""}` : ""}
          <button class="btn primary block mt" data-ok>${opts.swapFrom ? "Cambiar" : "Añadir"}</button>`;
        const gi = body.querySelector("#gIn");
        gi.onchange = () => { g = Math.max(0, num(gi.value) || 0); draw(); };
        body.querySelectorAll("[data-step]").forEach((b) => b.onclick = () => { const st = f.unitG && f.unit === "ud" ? f.unitG / 2 : g >= 100 ? 10 : 5; g = Math.max(0, g + Number(b.dataset.step) * st); draw(); });
        body.querySelectorAll("[data-units]").forEach((b) => b.onclick = () => { g = f.unitG * Number(b.dataset.units); draw(); });
        body.querySelectorAll("[data-scope]").forEach((b) => b.onclick = () => { scope = b.dataset.scope; draw(); });
        body.querySelector("[data-back]").onclick = renderList;
        body.querySelector("[data-ok]").onclick = () => { pushRecent(key); closeSheet(); opts.onPick(key, Math.round(g), scope); };
      };
      draw();
    };
    body.addEventListener("click", (e) => {
      const c = e.target.closest("[data-cat]"); if (c) { cat = c.dataset.cat; q = ""; return renderList(); }
      const r = e.target.closest(".frow"); if (r) return renderAmount(r.dataset.k);
      if (e.target.closest("[data-reset]")) { closeSheet(); return opts.onPick(null); }
      if (e.target.closest("[data-new]")) return renderFoodForm(body, { name: q }, (key) => renderAmount(key), renderList);
    });
    renderList();
  }
  function closeSheet() { document.querySelectorAll(".sheet-wrap").forEach((s) => s.remove()); document.body.classList.remove("noscroll"); }

  // Formulario de alimento propio (crear / editar)
  function renderFoodForm(container, food, onSaved, onCancel) {
    const f = { name: "", k: "", p: "", c: "", f: "", base: "g", unitG: "", unitName: "", ...food };
    container.innerHTML = `
      ${onCancel ? `<button class="link back" data-back>‹ Volver</button>` : ""}
      <form class="form foodform" autocomplete="off">
        <label for="ff_name">Nombre</label><input id="ff_name" required value="${esc(f.name)}" placeholder="p. ej. Mi batido de proteína">
        <label>Valores por 100</label>
        <div class="seg" id="ffBase"><button type="button" data-b="g" class="${f.base !== "ml" ? "on" : ""}">gramos</button><button type="button" data-b="ml" class="${f.base === "ml" ? "on" : ""}">ml</button></div>
        <div class="grid2">
          <div><label for="ff_k">Calorías (kcal)</label><input id="ff_k" inputmode="decimal" required value="${f.k}"></div>
          <div><label for="ff_p">Proteína (g)</label><input id="ff_p" inputmode="decimal" value="${f.p}"></div>
          <div><label for="ff_c">Hidratos (g)</label><input id="ff_c" inputmode="decimal" value="${f.c}"></div>
          <div><label for="ff_f">Grasa (g)</label><input id="ff_f" inputmode="decimal" value="${f.f}"></div>
          <div><label for="ff_u">Una unidad pesa (opcional)</label><input id="ff_u" inputmode="decimal" value="${f.unitG || ""}" placeholder="p. ej. 30"></div>
          <div><label for="ff_un">Nombre de la unidad</label><input id="ff_un" value="${esc(f.unitName || "")}" placeholder="cacito, barrita…"></div>
        </div>
        <p class="muted tiny">Copia los valores de la etiqueta (columna «por 100 g»).</p>
        <button class="btn primary block mt" type="submit">Guardar alimento</button>
      </form>`;
    let base = f.base;
    container.querySelector("#ffBase").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; base = b.dataset.b; container.querySelectorAll("#ffBase button").forEach((x) => x.classList.toggle("on", x === b)); };
    const back = container.querySelector("[data-back]"); if (back) back.onclick = onCancel;
    container.querySelector("form").onsubmit = (e) => {
      e.preventDefault();
      const v = (id) => num(container.querySelector(id).value) || 0;
      const name = container.querySelector("#ff_name").value.trim();
      if (!name || !v("#ff_k")) { toast("Pon al menos el nombre y las kcal"); return; }
      const key = f.key || "mi_" + Date.now().toString(36);
      const unitG = v("#ff_u") || null;
      const unitName = container.querySelector("#ff_un").value.trim() || (unitG ? "ud" : null);
      Store.setFood(key, { key, name, cat: "mios", k: v("#ff_k"), p: v("#ff_p"), c: v("#ff_c"), f: v("#ff_f"), base, unit: unitName === "ud" ? "ud" : base, unitG, unitName, custom: true });
      toast("Alimento guardado ✓");
      onSaved(key);
    };
  }

  // ——— Página de alimentos ———
  function viewAlimentos() {
    let cat = "todos", q = "";
    app.innerHTML = `
      <section class="pagehead"><a class="link" href="#/nutricion">‹ Nutrición</a><h1 class="display">Alimentos</h1>
        <p class="muted">${FOOD_DB.length} alimentos de referencia + ${Object.keys(Store.foods).length} tuyos. Valores por 100 g (o 100 ml): kcal, proteína, hidratos y grasa.</p></section>
      <section class="card"><div class="row-between"><div><h2>Mis alimentos</h2><p class="muted tiny">Tus productos de marca o recetas.</p></div><button class="btn primary" id="newFood">+ Crear</button></div>
        <div class="flist" id="myFoods"></div></section>
      <section class="card" id="dbCard"></section>`;
    const my = $("#myFoods");
    const drawMine = () => {
      const foods = Object.values(Store.foods);
      my.innerHTML = foods.length ? foods.map((f) => foodRow(f, `<span class="frow-act"><span data-edit="${esc(f.key)}">Editar</span><span data-delf="${esc(f.key)}">Borrar</span></span>`)).join("") : `<p class="muted tiny">Todavía no has creado ninguno.</p>`;
    };
    const drawDb = () => {
      let foods = FOOD_DB.map(([k]) => FOOD_DB_MAP[k]);
      if (q) { const n = normTxt(q); foods = foods.filter((f) => normTxt(f.name).includes(n)); }
      else if (cat !== "todos") foods = foods.filter((f) => f.cat === cat);
      $("#dbCard").innerHTML = `<h2>Base de referencia</h2>
        <div class="search"><svg class="ico" viewBox="0 0 24 24"><path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3"/></svg><input id="dq" type="search" placeholder="Buscar…" value="${esc(q)}"></div>
        <div class="catchips">${[["todos", "Todos"], ...Object.entries(FOOD_CATS)].map(([k, l]) => `<button data-cat="${k}" class="${cat === k && !q ? "on" : ""}">${l}</button>`).join("")}</div>
        <div class="flist static">${foods.map((f) => foodRow(f)).join("") || `<p class="muted">Sin resultados.</p>`}</div>`;
      const inp = $("#dq");
      inp.oninput = () => { q = inp.value; const pos = inp.selectionStart; drawDb(); const n = $("#dq"); n.focus(); n.setSelectionRange(pos, pos); };
    };
    const openForm = (food) => {
      closeSheet();
      const sheet = document.createElement("div");
      sheet.className = "sheet-wrap";
      sheet.innerHTML = `<div class="sheet"><div class="sheet-head"><h2>${food ? "Editar alimento" : "Nuevo alimento"}</h2><button class="iconbtn" data-close aria-label="Cerrar">×</button></div><div class="sheet-body"></div></div>`;
      document.body.appendChild(sheet); document.body.classList.add("noscroll");
      sheet.addEventListener("click", (e) => { if (e.target === sheet || e.target.closest("[data-close]")) closeSheet(); });
      renderFoodForm(sheet.querySelector(".sheet-body"), food || {}, () => { closeSheet(); viewAlimentos(); });
    };
    $("#newFood").onclick = () => openForm(null);
    my.onclick = (e) => {
      const ed = e.target.closest("[data-edit]"); if (ed) { e.stopPropagation(); return openForm(Store.foods[ed.dataset.edit]); }
      const dl = e.target.closest("[data-delf]"); if (dl && confirm("¿Borrar este alimento? Si lo usas en algún día, dejará de contar.")) { Store.deleteFood(dl.dataset.delf); viewAlimentos(); }
    };
    $("#dbCard").addEventListener("click", (e) => { const c = e.target.closest("[data-cat]"); if (c) { cat = c.dataset.cat; q = ""; drawDb(); } });
    drawMine(); drawDb();
  }

  function viewPautas() {
    app.innerHTML = `
      <section class="pagehead"><a class="link" href="#/nutricion">‹ Nutrición</a><h1 class="display">Pautas</h1>
        <p class="muted">Fase de volumen: ganar toda la masa muscular posible. Superávit de ~500–700 kcal sobre tu gasto.</p></section>
      <section class="card"><h2>Objetivos por tipo de día</h2>
        <div class="scroll-x"><table class="tbl"><thead><tr><th>Día</th><th>kcal</th><th>Prot.</th><th>Hidr.</th><th>Grasa</th></tr></thead><tbody>
        ${DAY_ORDER.map((k) => { const t = targetsFor(k); return `<tr><td><b>${DAY_TYPES[k].name}</b><small class="src">${DAY_TYPES[k].why}</small></td><td>${fmtNum(t.kcal, 0)}</td><td>${t.p} g</td><td>${t.c} g</td><td>${t.f} g</td></tr>`; }).join("")}
        </tbody></table></div>
        <p class="muted tiny">Esta semana: media de ${fmtNum(WEEKS[currentWeekNum() - 1].sessions.reduce((a, x) => a + targetsFor(dietTypeFor(x)).kcal, 0) / 7, 0)} kcal/día. El tipo de día sale solo de la sesión del plan.${boost() ? ` Incluye tu ajuste de ${boost() > 0 ? "+" : ""}${boost() * 250} kcal.` : ""}</p>
        ${boost() ? `<button class="btn ghost" id="resetBoost">Quitar ajuste de calorías</button>` : ""}
      </section>
      <section class="card"><h2>Reglas</h2><ul class="bul">${DIET_RULES.map((r) => `<li>${esc(r)}</li>`).join("")}</ul></section>
      <section class="card"><h2>Horario tipo</h2><p class="muted">Días dobles (lunes y jueves): carrera a media mañana y fuerza por la tarde. Días de solo fuerza: entrena a media mañana o por la tarde, igual.</p>
        <div class="timeline-v">
          <div><b>08:00</b><span>Desayuno: hidratos y algo de proteína, poca grasa y fibra.</span></div>
          <div><b>10:00–11:00</b><span>Carrera (o fuerza). En series y tiradas de más de 75', 30–60 g de hidratos (zumo, dátiles o isotónica).</span></div>
          <div><b>Al terminar</b><span>Batido: whey + plátano + 5 g de creatina.</span></div>
          <div><b>13:00</b><span>Comida grande: el plato más fuerte del día.</span></div>
          <div><b>17:00</b><span>Merienda: batido ganador casero (~1.000 kcal), 1–1,5 h antes de la fuerza.</span></div>
          <div><b>18:30–19:30</b><span>Fuerza en los días dobles.</span></div>
          <div><b>21:00</b><span>Cena + skyr. Si te falta, un extra antes de dormir.</span></div>
        </div></section>
      <section class="card"><h2>Suplementos</h2><ul class="bul">
        <li><b>Creatina monohidrato:</b> 5 g/día, todos los días.</li>
        <li><b>Proteína whey:</b> solo para cuadrar la proteína; la comida va primero.</li>
        <li><b>Cafeína (opcional):</b> 3 mg/kg (~240 mg) 45' antes de sesiones duras, nunca después de las 15:00.</li>
        <li>Si te haces analítica, revisa vitamina D y hierro: con este volumen de carrera se resienten.</li></ul></section>
      <section class="card"><h2>Trucos para comer más</h2><ul class="bul">
        <li>Bebe calorías: leche entera, zumo y el batido ganador llenan mucho menos que la comida sólida.</li>
        <li>Aceite de oliva generoso en arroz, pasta y patatas: 10 g son 90 kcal invisibles.</li>
        <li>Prepara el batido ganador por la mañana y bébelo en 2–3 veces si te cuesta de golpe.</li>
        <li>Menos verdura en las comidas grandes y más en las de los días suaves: sacia sin aportar.</li>
        <li>Cocina por tandas el domingo (arroz, pasta, pollo, ternera) para que la comida nunca dependa de las ganas.</li></ul></section>
      <p class="muted tiny">Pauta orientativa para una persona sana. Si tienes algún problema médico, consúltala con un profesional.</p>
    `;
    const rb = $("#resetBoost"); if (rb) rb.onclick = () => { Store.setSetting("dietBoost", 0); toast("Ajuste quitado"); viewPautas(); };
  }

  function viewCompra() {
    const wn = currentWeekNum();
    const w = WEEKS[wn - 1];
    const tot = {};
    w.sessions.forEach((s) => {
      const st = dayState(s.date);
      MEALS.forEach((m) => { const { items, added } = mealItems(m, st); [...items, ...added].forEach((it) => { if (it.g) tot[it.key] = (tot[it.key] || 0) + it.g; }); });
    });
    const fmt = (k, g) => {
      const f = getFood(k);
      const ml = f.base === "ml" || f.unit === "ml";
      if (f.unit === "ud" && f.unitG) return `${Math.ceil(g / f.unitG)} ${f.unitName && f.unitName !== "ud" ? f.unitName + "s" : "ud"}`;
      if (g >= 1000) return `${fmtNum(Math.ceil(g / 100) / 10, 1)} ${ml ? "L" : "kg"}`;
      return `${Math.ceil(g / 10) * 10} ${ml ? "ml" : "g"}`;
    };
    const rows = Object.entries(tot).filter(([k, g]) => g > 0 && getFood(k).k > 0 || k === "creatina").sort((a, b) => getFood(a[0]).name.localeCompare(getFood(b[0]).name));
    const text = `Lista de la compra · semana ${wn} (${fmtDate(w.start)} – ${fmtDate(w.end)})\n` + rows.map(([k, g]) => `- ${getFood(k).name}: ${fmt(k, g)}`).join("\n");
    app.innerHTML = `
      <section class="pagehead"><a class="link" href="#/nutricion">‹ Nutrición</a><h1 class="display">La compra</h1>
        <p class="muted">Semana ${wn} · ${fmtDate(w.start)} – ${fmtDate(w.end)}. Calculada con el tipo de cada día, las opciones de menú elegidas (por defecto, la A), tus cambios y lo añadido.</p></section>
      <section class="card"><ul class="shop">${rows.map(([k, g]) => `<li><span>${esc(getFood(k).name)}</span><b>${fmt(k, g)}</b></li>`).join("")}</ul>
        <button class="btn primary block mt" id="copyShop">${ico("copy")} Copiar lista</button></section>
      <p class="muted tiny">No incluye los extras. Arroz, pasta y patata, en crudo.</p>
    `;
    $("#copyShop").onclick = () => copy(text, $("#copyShop"));
  }

  function nutritionSummaryLines(w) {
    const wa = avgWeight(weightSeries(), w.end);
    const rows = w.sessions.map((s) => ({ eat: consumed(s.date), tg: targetsFor(dayState(s.date).type) })).filter((r) => r.eat.k > 0);
    if (!rows.length) return ["Nutrición: sin registrar", ...(wa ? [`Peso medio de la semana: ${fmtNum(wa.avg, 1)} kg (${wa.n} pesajes)`] : [])];
    const avg = (f) => rows.reduce((a, r) => a + f(r), 0) / rows.length;
    const lines = [`Nutrición (${rows.length} días registrados): media ${fmtNum(avg((r) => r.eat.k), 0)} kcal de ${fmtNum(avg((r) => r.tg.kcal), 0)} objetivo · proteína ${fmtNum(avg((r) => r.eat.p), 0)} g · hidratos ${fmtNum(avg((r) => r.eat.c), 0)} g · grasa ${fmtNum(avg((r) => r.eat.f), 0)} g${boost() ? ` · ajuste ${boost() * 250} kcal` : ""}`];
    if (wa) lines.push(`Peso medio de la semana: ${fmtNum(wa.avg, 1)} kg (${wa.n} pesajes)`);
    return lines;
  }

  // ——— Datos ———
  function viewDatos() {
    const n = Object.keys(Store.logs).length;
    const theme = Store.settings.theme || "auto";
    app.innerHTML = `
      <section class="pagehead"><div class="eyebrow">Ajustes</div><h1 class="display">Datos</h1></section>
      <section class="card"><h2>Tus registros</h2>
        <p>Se guardan <b>solo en este navegador</b> (${n} sesiones registradas). No se suben a ningún servidor.</p>
        <p class="muted">Exporta una copia de vez en cuando y úsala para pasar tus datos a otro dispositivo.</p>
        <div class="actions"><button class="btn primary" id="exp">Exportar copia (.json)</button><label class="btn" for="imp">Importar copia</label><input type="file" id="imp" accept=".json,application/json" hidden></div>
        <div class="actions"><button class="btn ghost" id="copyAll">${ico("copy")} Copiar todos los datos (JSON)</button></div>
      </section>
      ${stravaCard()}
      <section class="card" id="pushCard"><h2>Aviso diario</h2><p class="muted">Cada mañana, sobre las 7:00, una notificación con tu entreno del día.</p><div id="pushBody" class="muted tiny">Comprobando…</div></section>
      <section class="card"><h2>Apariencia</h2>
        <div class="seg" id="themeSeg">${[["auto", "Automático"], ["light", "Claro"], ["dark", "Oscuro"]].map(([v, l]) => `<button data-v="${v}" class="${theme === v ? "on" : ""}">${l}</button>`).join("")}</div></section>
      <section class="card"><h2>Ritmo objetivo</h2><p class="muted">Lo decide el test de 10 km de la semana 10.</p>
        <div class="seg" id="tgSeg2">${["A", "B"].map((k) => `<button data-v="${k}" class="${target() === k ? "on" : ""}">${k} · ${ATHLETE.targets[k].pace} · ${ATHLETE.targets[k].total}</button>`).join("")}</div></section>
      <section class="card"><h2>Instalar en el iPhone</h2><p class="muted">Abre esta página en Safari → Compartir → «Añadir a pantalla de inicio». Funciona como una app y sin conexión.</p></section>
      <section class="card danger-zone"><h2>Borrar todo</h2><p class="muted">Elimina todos los registros de este navegador. Exporta antes una copia.</p><button class="btn danger" id="reset">Borrar todos los registros</button></section>
    `;
    $("#exp").onclick = () => {
      const blob = new Blob([Store.exportJSON()], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `planning-registros-${todayISO()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    $("#imp").onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const replace = confirm("¿Reemplazar todos tus registros por los del archivo?\n\nAceptar = reemplazar · Cancelar = combinar (el archivo gana en sesiones repetidas)");
        const c = Store.importJSON(await f.text(), replace ? "replace" : "merge");
        toast(`${c} sesiones importadas ✓`); route();
      } catch (err) { alert("No se pudo importar: " + err.message); }
    };
    $("#copyAll").onclick = () => copy(Store.exportJSON(), $("#copyAll"));
    bindStravaCard();
    pushCard();
    $("#themeSeg").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; Store.setSetting("theme", b.dataset.v); applyTheme(); viewDatos(); };
    $("#tgSeg2").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; Store.setSetting("activeTarget", b.dataset.v); viewDatos(); toast(`Ritmo objetivo ${b.dataset.v} activo`); };
    $("#reset").onclick = () => { if (confirm("¿Seguro? Se borrarán todos los registros de este navegador.") && confirm("Última confirmación: no se puede deshacer.")) { Store.reset(); toast("Registros borrados"); route(); } };
  }

  // ——— Aviso diario (Web Push) ———
  const VAPID_PUBLIC = "BJVyiOdDFr7olgp-GC9ueCqJFsfC_POZGyfM3moGeLDzoBLBrhYbTfZeeZsQAAGtcRUsI50K-0d6u3OzuVJoxdI";
  const b64ToBytes = (b) => { const p = "=".repeat((4 - (b.length % 4)) % 4); const r = atob((b + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(r, (c) => c.charCodeAt(0)); };
  async function pushCard() {
    const box = $("#pushBody"); if (!box) return;
    const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      box.innerHTML = /iPhone|iPad/.test(navigator.userAgent) && !standalone
        ? "En el iPhone los avisos solo funcionan con la app instalada: Safari → Compartir → «Añadir a pantalla de inicio», y ábrela desde el icono."
        : "Este navegador no admite notificaciones.";
      return;
    }
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) { box.textContent = "Abre la app desde su web (https) para activar los avisos."; return; }
    const sub = await reg.pushManager.getSubscription();
    if (!sub) {
      box.innerHTML = `<div class="actions"><button class="btn primary" id="pushOn">Activar avisos</button></div>`;
      $("#pushOn").onclick = async () => {
        try {
          if ((await Notification.requestPermission()) !== "granted") { toast("Permiso de notificaciones denegado"); return; }
          await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID_PUBLIC) });
          toast("Avisos activados ✓"); pushCard();
        } catch (e) { toast("No se pudo activar: " + e.message); }
      };
      return;
    }
    const code = JSON.stringify(sub);
    box.innerHTML = `<p>✓ Activados en este dispositivo. Último paso: copia el código y pásamelo (a Claude) para guardarlo en el envío diario. Solo hace falta una vez.</p>
      <div class="actions"><button class="btn primary" id="pushCopy">${ico("copy")} Copiar código</button><button class="btn ghost" id="pushTest">Probar aviso</button><button class="btn danger" id="pushOff">Desactivar</button></div>`;
    $("#pushCopy").onclick = () => copy(code, $("#pushCopy"));
    $("#pushTest").onclick = () => { const t = todaySession(); reg.showNotification(t.kind === "rest" ? "Hoy toca descanso" : `Hoy: ${t.title}`, { body: `${t.duration} · ${t.steps.join(" · ")}`, icon: "icon-192.png", tag: "prueba", data: { url: "./#/hoy" } }); };
    $("#pushOff").onclick = async () => { await sub.unsubscribe(); toast("Avisos desactivados"); pushCard(); };
  }

  // ——— Strava ———
  function stravaCard() {
    const c = Strava.get();
    if (Strava.connected()) return `<section class="card"><h2>Strava</h2>
      <p>✓ Conectado${c.athlete ? ` como <b>${esc(c.athlete)}</b>` : ""}. Al abrir una sesión con carrera, se rellenan solos km, ritmo, FC y parciales.</p>
      <div class="actions"><button class="btn ghost" id="stKey">${ico("copy")} Copiar clave de conexión</button><button class="btn danger" id="stOff">Desconectar</button></div>
      <p class="muted tiny">La clave sirve para conectar la app instalada en el iPhone si la conexión se hizo en Safari: pégala abajo en la otra. No la compartas.</p></section>`;
    return `<section class="card"><h2>Strava</h2>
      <p class="muted">Para que las carreras se rellenen solas. Se hace una vez:</p>
      <ol class="steps tiny">
        <li>Entra en <b>strava.com/settings/api</b> y crea una app (nombre: el que quieras; web: <b>${esc(location.origin)}</b>; dominio de la devolución: <b>${esc(location.hostname)}</b>).</li>
        <li>Copia aquí su <b>Client ID</b> y su <b>Client Secret</b> y pulsa Conectar.</li>
      </ol>
      <div class="grid2"><div><label for="stId">Client ID</label><input id="stId" inputmode="numeric" value="${esc(c.id || "")}"></div>
      <div><label for="stSec">Client Secret</label><input id="stSec" type="password" value="${esc(c.secret || "")}"></div></div>
      <div class="actions"><button class="btn primary" id="stGo">Conectar con Strava</button></div>
      <details class="mt"><summary>¿Ya lo conectaste en otro sitio? Pega la clave</summary>
        <input id="stPaste" placeholder="Clave de conexión"><div class="actions"><button class="btn" id="stUse">Usar clave</button></div></details>
      <p class="muted tiny">Todo se guarda solo en este dispositivo; no va en las copias de seguridad.</p></section>`;
  }
  function bindStravaCard() {
    const on = (sel, fn) => { const el = $(sel); if (el) el.onclick = fn; };
    on("#stGo", () => {
      const id = $("#stId").value.trim(), secret = $("#stSec").value.trim();
      if (!id || !secret) { toast("Rellena Client ID y Client Secret"); return; }
      Strava.set({ id, secret });
      location.href = Strava.authorizeUrl();
    });
    on("#stUse", () => { try { Strava.useKey($("#stPaste").value); toast("Strava conectado ✓"); viewDatos(); } catch { toast("Esa clave no es válida"); } });
    on("#stKey", () => copy(Strava.key(), $("#stKey")));
    on("#stOff", () => { if (confirm("¿Desconectar Strava de este dispositivo?")) { Strava.disconnect(); viewDatos(); } });
  }

  // ——— helpers UI ———
  function applyTheme() {
    const t = Store.settings.theme || "auto";
    if (t === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
  }
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2200);
  }
  async function copy(text, btn) {
    try { await navigator.clipboard.writeText(text); }
    catch { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); }
    toast("Copiado al portapapeles ✓");
    if (btn) { const o = btn.innerHTML; btn.textContent = "¡Copiado!"; setTimeout(() => (btn.innerHTML = o), 1600); }
  }
  function bindTips() {
    const tip = $("#tip");
    document.querySelectorAll(".chart .hit").forEach((g) => {
      const show = (e) => { tip.textContent = g.dataset.tip; tip.classList.add("show");
        const p = e.touches ? e.touches[0] : e; tip.style.left = Math.min(window.innerWidth - 150, Math.max(8, p.clientX - 60)) + "px"; tip.style.top = p.clientY - 44 + "px"; g.classList.add("hov"); };
      const hide = () => { tip.classList.remove("show"); g.classList.remove("hov"); };
      g.addEventListener("mousemove", show); g.addEventListener("mouseleave", hide);
      g.addEventListener("touchstart", show, { passive: true }); g.addEventListener("touchend", () => setTimeout(hide, 1200));
    });
    const seg = $("#tgSeg");
    if (seg) seg.onclick = (e) => { const b = e.target.closest("button"); if (!b) return; Store.setSetting("activeTarget", b.dataset.v); viewProgreso(); };
  }

  // ——— router ———
  function route() {
    const [, view = "hoy", arg] = location.hash.split("/");
    header(view === "sesion" ? "plan" : view);
    app.dataset.view = view;
    ({ hoy: viewHoy, plan: () => viewPlan(arg), sesion: () => viewSesion(arg), fuerza: () => viewFuerza(arg), movilidad: viewMovilidad,
      nutricion: () => viewNutricion(arg), progreso: viewProgreso, guia: viewGuia, datos: viewDatos }[view] || viewHoy)();
  }
  window.addEventListener("hashchange", () => { route(); window.scrollTo(0, 0); });
  loadDiario();
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") loadDiario(); });
  applyTheme();
  if (new URLSearchParams(location.search).get("state") === "strava") {
    location.hash = "#/datos";
    Strava.handleRedirect().then((r) => { toast(r.ok ? "Strava conectado ✓" : r.msg); route(); }).catch((e) => { toast("Error con Strava: " + e.message); route(); });
  }
  route();

  // Service worker: busca versión nueva al abrir o volver a la app y recarga sola cuando la hay
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    const hadSW = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (hadSW && !reloading) { reloading = true; location.reload(); } });
    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then((reg) => {
      reg.update().catch(() => {});
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") reg.update().catch(() => {}); });
    }).catch(() => {});
  }
})();
