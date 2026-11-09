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

  const KIND = { run: "Carrera", strength: "Fuerza", hybrid: "Híbrido", test: "Test", sim: "Simulacro", rest: "Descanso", race: "Prueba final" };
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
    return Math.min(13, Math.floor(idx / 7) + 1);
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
    h = h.replace(/\bFuerza ([ABC])\b/g, `<a class="fchip" href="#/fuerza/$1">Fuerza $1</a>`);
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
    let done = 0, partial = 0, skipped = 0, km = 0, min = 0, rpeSum = 0, rpeN = 0;
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
    });
    return { planned: train.length, done, partial, skipped, km, min, rpe: rpeN ? rpeSum / rpeN : null, fat };
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
      ["progreso", "Progreso", "M3 3v18h18M7 15l4-4 3 3 6-6"],
      ["guia", "Guía", "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"]];
    $("#topbar").innerHTML = `
      <a class="brand" href="#/hoy"><span class="logo"><svg viewBox="0 0 24 24"><path d="M2 13h4l3-8 4 14 3-9 2 3h4"/></svg></span>
        <span><b>Mi planning</b><small>Semana ${wn} de 13 · ${PHASES[w.phase].name}</small></span></a>
      <a class="ringbtn" href="#/progreso" title="Plan completado: ${o.done} de ${o.total} sesiones">${ring(o.pct)}<span>${o.pct}%</span></a>
      <a class="iconbtn" href="#/datos" aria-label="Datos y copia de seguridad"><svg viewBox="0 0 24 24"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></svg></a>`;
    $("#tabbar").innerHTML = tabs.map(([k, l, d]) =>
      `<a href="#/${k}" class="${active === k ? "on" : ""}"><svg viewBox="0 0 24 24"><path d="${d}"/></svg><span>${l}</span></a>`).join("");
  }

  function phaseTimeline(sel) {
    const cw = currentWeekNum();
    const used = [...new Set(WEEKS.map((w) => w.phase))];
    return `<div class="timeline">${WEEKS.map((w) => {
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
      <ol class="steps">${s.steps.map((x) => `<li>${richText(x)}</li>`).join("")}</ol>
      ${label.startsWith("Hoy") || label.startsWith("Primera") || label.startsWith("Última") ? s.strength.map((k) => strengthBlock(k, s.week, s.id, false)).join("") : ""}
      ${label.startsWith("Hoy") || label.startsWith("Primera") || label.startsWith("Última") ? `<a class="btn primary block" href="#/sesion/${s.id}">${log ? `${ico("check")} ${STATUS[log.status]} · ver registro` : "Registrar sesión"}</a>` : ""}
    </section>`;
  }

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
      <section class="card">
        <div class="row-between"><div><div class="eyebrow">Semana ${w.week}</div><h2>${esc(w.title)}</h2></div><a class="link" href="#/plan/${w.week}">Ver semana ${ico("chev")}</a></div>
        <div class="weekstrip">${w.sessions.map((x) => `<a href="#/sesion/${x.id}" class="int-${x.intensity} ${x.id === s.id ? "on" : ""} st-${statusKey(x)}">
          <small>${x.day.split(" ")[0]}</small><b>${x.day.split(" ")[1]}</b><span class="ws-ico k-${x.kind}">${ico(x.kind)}</span>${statusDot(x)}</a>`).join("")}</div>
        <div class="kpis three">
          <div><span>Sesiones</span><b>${st.done + st.partial}<small>/${st.planned}</small></b></div>
          <div><span>Km carrera</span><b>${fmtNum(st.km)}<small>/${w.km}</small></b></div>
          <div><span>RPE medio</span><b>${st.rpe ? fmtNum(st.rpe) : "—"}</b></div>
        </div>
      </section>
      ${pend.length ? `<section class="card warn"><div class="eyebrow">Pendiente</div><h2>Sin registrar</h2><p class="muted">Si no las hiciste, márcalas como «No hecha» para que el resumen sea fiel.</p>
        <div class="list">${pend.map((x) => sessionCard(x)).join("")}</div></section>` : ""}
      ${tomorrow ? `<section><div class="section-title">Mañana</div><div class="list">${sessionCard(tomorrow, { preview: true })}</div></section>` : ""}
      <section class="card"><div class="eyebrow">13 semanas</div><h2>Tu temporada</h2>${phaseTimeline()}</section>
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
    const wn = Math.max(1, Math.min(13, Number(n) || currentWeekNum()));
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
          <div><span>Horas</span><b>${st.min ? fmtNum(st.min / 60) : "—"}</b></div>
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
      <div class="pager">${wn > 1 ? `<a class="btn" href="#/plan/${wn - 1}">← Semana ${wn - 1}</a>` : "<span></span>"}${wn < 13 ? `<a class="btn" href="#/plan/${wn + 1}">Semana ${wn + 1} →</a>` : ""}</div>
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
    return { kg: allDone ? top + (k === "A" ? 5 : 2.5) : top, up: allDone };
  }

  function strengthBlock(k, week, sessionId, editable) {
    const t = STRENGTH[k];
    const ci = t.weekCol[week];
    const s = byId[sessionId];
    const log = sessionId ? Store.getLog(sessionId) : null;
    const head = `<div class="row-between"><h3><span class="fbadge">${k}</span>${esc(cap(t.name.split(" — ")[1] || t.name))}</h3><span class="pill">${t.cols[ci]}</span></div>
      ${week === 13 && k === "B" ? `<p class="muted tiny">Semana final: solo press banca, dominadas y remo, 2 × 5 a RIR 3.</p>` : ""}
      ${(week === 6 || week === 10) && k === "C" ? `<p class="muted tiny">Reducida: solo torso, 2 series por ejercicio y sin farmers.</p>` : ""}`;
    if (!editable) {
      return `<div class="strength">${head}<div class="exlist">${t.rows.map((r) =>
        `<div class="ex"><div class="ex-name">${esc(r.ex)}</div><div class="ex-sets">${esc(r.values[ci])}</div></div>`).join("")}</div></div>`;
    }
    return `<div class="strength" data-block="${k}">${head}
      <p class="muted tiny how">Escribe los kg de la 1.ª serie y toca <b>✓</b> en las demás: se copian solas. Si dejas las reps vacías, cuentan las del plan.</p>
      ${t.rows.map((r) => {
        const scheme = parseScheme(r.values[ci]);
        if (!scheme) return "";
        const prev = lastSets(r.ex, s.date);
        const sug = suggestKg(k, scheme, prev);
        const saved = log?.sets?.[r.ex] || [];
        const n = Math.max(scheme.sets, saved.length);
        const baseKg = sug?.kg ?? null;
        const unit = isDumbbell(r.ex) ? "kg/manc." : isBodyweight(r.ex) ? "lastre" : "kg";
        return `<div class="exlog" data-ex="${esc(r.ex)}" data-reps="${scheme.reps ?? ""}" data-base="${baseKg ?? ""}">
          <div class="exlog-head"><div class="ex-name">${esc(r.ex)}<small class="target">${esc(r.values[ci])}</small></div><span class="exlog-stat"></span></div>
          ${prev ? `<div class="exlog-prev">Última · ${fmtDate(prev.date)}: <b>${esc(prev.text)}</b></div>` : ""}
          ${!saved.length && log?.loads?.[r.ex] ? `<div class="exlog-prev">Anotado: <b>${esc(log.loads[r.ex])}</b></div>` : ""}
          <div class="sets-head"><span></span><span>${unit}</span><span>reps</span><span></span></div><div class="sets">${Array.from({ length: n }, (_, i) => setRow(i, saved[i], scheme.reps)).join("")}</div>
          <div class="exlog-actions">
            <button type="button" class="chip-btn" data-act="add">+ Serie</button>
            ${prev?.sets ? `<button type="button" class="chip-btn" data-act="repeat">Repetir última</button>` : ""}
            ${sug ? `<button type="button" class="chip-btn ${sug.up ? "up" : ""}" data-act="suggest" data-kg="${sug.kg}">${sug.up ? "↑ " : ""}${kgStr(sug.kg)} kg en todas</button>` : ""}
          </div>
        </div>`;
      }).join("")}
      <div class="block-total"></div>
    </div>`;
  }

  function setRow(i, saved, reps) {
    const done = saved ? "done" : "";
    return `<div class="set ${done}">
      <span class="set-n">${i + 1}</span>
      <div class="stepper"><button type="button" data-step="-2.5" aria-label="Menos 2,5 kg">−</button><input class="kg" inputmode="decimal" value="${saved?.kg ?? ""}" aria-label="Kg serie ${i + 1}"><button type="button" data-step="2.5" aria-label="Más 2,5 kg">+</button></div>
      <input class="reps" inputmode="numeric" value="${saved?.reps ?? ""}" placeholder="${reps ?? "reps"}" aria-label="Reps serie ${i + 1}">
      <button type="button" class="tick" aria-label="Serie hecha">${ico("check")}</button>
    </div>`;
  }

  // Lógica interactiva de las series (placeholders encadenados, ✓, +/−, totales)
  function bindSets(root) {
    const num0 = (v) => { const n = num(v); return n == null ? null : n; };
    const refresh = (ex) => {
      const base = num0(ex.dataset.base);
      let carry = base;
      const rows = [...ex.querySelectorAll(".set")];
      rows.forEach((row) => {
        const kg = row.querySelector(".kg");
        kg.placeholder = carry != null ? fmtNum(carry, 2) : "kg";
        const v = num0(kg.value);
        if (v != null) carry = v;
      });
      const sets = readSets(ex);
      const st = setsStats(sets);
      ex.querySelector(".exlog-stat").innerHTML = sets.length ? `${sets.length} × · <b>${fmtNum(st.vol, 0)}</b> kg${st.best ? ` · 1RM ~${fmtNum(st.best, 0)}` : ""}` : "";
      const block = ex.closest(".strength");
      let tv = 0, ts = 0;
      block.querySelectorAll(".exlog").forEach((e) => { const ss = readSets(e); ts += ss.length; tv += setsStats(ss).vol; });
      block.querySelector(".block-total").innerHTML = ts ? `<span>Total sesión</span><b>${ts} series · ${fmtNum(tv, 0)} kg</b>` : "";
    };
    root.querySelectorAll(".exlog").forEach((ex) => {
      refresh(ex);
      ex.addEventListener("input", () => {
        ex.querySelectorAll(".set").forEach((row) => row.classList.toggle("done", !!(row.querySelector(".kg").value || row.querySelector(".reps").value) || row.classList.contains("ticked")));
        refresh(ex);
      });
      ex.addEventListener("click", (e) => {
        const b = e.target.closest("button"); if (!b) return;
        const row = b.closest(".set");
        if (b.dataset.step && row) {
          const kg = row.querySelector(".kg");
          const cur = num0(kg.value) ?? num0(kg.placeholder) ?? 0;
          kg.value = fmtNum(Math.max(0, cur + Number(b.dataset.step)), 2);
          row.classList.add("done");
        } else if (b.classList.contains("tick") && row) {
          const kg = row.querySelector(".kg"), reps = row.querySelector(".reps");
          if (row.classList.contains("done")) { kg.value = ""; reps.value = ""; row.classList.remove("done", "ticked"); }
          else {
            if (!kg.value && num0(kg.placeholder) != null) kg.value = kg.placeholder;
            if (!reps.value && num0(reps.placeholder) != null) reps.value = reps.placeholder;
            row.classList.add("done", "ticked");
          }
        } else if (b.dataset.act === "add") {
          const sets = ex.querySelector(".sets");
          const n = sets.children.length;
          sets.insertAdjacentHTML("beforeend", setRow(n, null, num0(ex.dataset.reps)));
        } else if (b.dataset.act === "repeat") {
          const prev = lastSets(ex.dataset.ex, ex.closest("form").dataset.date);
          const sets = ex.querySelector(".sets");
          while (sets.children.length < prev.sets.length) sets.insertAdjacentHTML("beforeend", setRow(sets.children.length, null, num0(ex.dataset.reps)));
          [...sets.children].forEach((row, i) => { const p = prev.sets[i]; if (!p) return;
            row.querySelector(".kg").value = p.kg != null ? fmtNum(p.kg, 2) : ""; row.querySelector(".reps").value = p.reps ?? ""; row.classList.add("done"); });
        } else if (b.dataset.act === "suggest") {
          ex.querySelectorAll(".set").forEach((row) => { row.querySelector(".kg").value = fmtNum(Number(b.dataset.kg), 2); row.classList.add("done"); });
        }
        refresh(ex);
      });
    });
  }

  // Lee las series marcadas: kg vacío = hereda el de la serie anterior; reps vacías = las del plan
  function readSets(ex) {
    const out = [];
    let carry = num(ex.dataset.base);
    const target = num(ex.dataset.reps);
    ex.querySelectorAll(".set").forEach((row) => {
      const kgV = num(row.querySelector(".kg").value), repsV = num(row.querySelector(".reps").value);
      if (kgV != null) carry = kgV;
      if (!row.classList.contains("done")) return;
      const reps = repsV ?? target;
      const kg = kgV ?? carry;
      if (reps == null && kg == null) return;
      out.push({ kg: kg ?? null, reps: reps ?? null });
    });
    return out;
  }

  // ——— Sesión ———
  function viewSesion(id) {
    const s = byId[id];
    if (!s) return viewHoy();
    const log = Store.getLog(id) || {};
    const idx = ALL.indexOf(s);
    const prev = ALL[idx - 1], next = ALL[idx + 1];
    const metrics = s.metrics ? METRIC_SETS[s.metrics] : [];
    const seg = (name, opts, val) => `<div class="seg" data-name="${name}">${opts.map(([v, l]) => `<button type="button" data-v="${v}" class="${val === v ? "on" : ""} ${name === "fatigue" ? "f-" + v : ""}">${l}</button>`).join("")}</div>`;
    app.innerHTML = `
      <div class="pager top">${prev ? `<a class="btn ghost" href="#/sesion/${prev.id}">← ${prev.day}</a>` : "<span></span>"}<a class="btn ghost" href="#/plan/${s.week}">Semana ${s.week}</a>${next ? `<a class="btn ghost" href="#/sesion/${next.id}">${next.day} →</a>` : "<span></span>"}</div>
      ${heroSession(s, fmtDate(s.date, true))}
      <form id="logForm" class="card form" autocomplete="off" data-date="${s.date}">
        <div class="eyebrow">Registro</div><h2>¿Cómo ha ido?</h2>
        ${s.strength.map((k) => strengthBlock(k, s.week, s.id, true)).join("")}
        <label>Estado</label>
        ${seg("status", [["done", "Hecha"], ["partial", "Parcial"], ["skipped", "No hecha"]], log.status || "")}
        <label>Semáforo de fatiga (antes de entrenar)</label>
        ${seg("fatigue", [["verde", "Verde"], ["amarillo", "Amarillo"], ["rojo", "Rojo"]], log.fatigue || "")}
        <label for="rpe">Esfuerzo percibido (RPE) <output id="rpeOut">${log.rpe || "—"}</output></label>
        <input type="range" id="rpe" name="rpe" min="1" max="10" step="1" value="${log.rpe || 6}" data-touched="${log.rpe ? 1 : 0}">
        <div class="rpe-scale"><span>1 · muy fácil</span><span>5 · moderado</span><span>10 · máximo</span></div>
        <div class="grid2">
          <div><label for="minutes">Duración (min)</label><input id="minutes" name="minutes" inputmode="decimal" value="${esc(log.minutes || "")}" placeholder="${parseInt(s.duration) || ""}"></div>
          <div><label for="km">Km de carrera</label><input id="km" name="km" inputmode="decimal" value="${esc(log.km || "")}" placeholder="0"></div>
          <div><label for="hr">FC media (ppm)</label><input id="hr" name="hr" inputmode="numeric" value="${esc(log.hr || "")}"></div>
          <div><label for="hrmax">FC máx (ppm)</label><input id="hrmax" name="hrmax" inputmode="numeric" value="${esc(log.hrmax || "")}"></div>
          <div><label for="pace">Ritmo medio (min/km)</label><input id="pace" name="pace" value="${esc(log.pace || "")}" placeholder="4:30"></div>
          <div><label for="weight">Peso (kg, en ayunas)</label><input id="weight" name="weight" inputmode="decimal" value="${esc(log.weight || "")}" placeholder="81"></div>
        </div>
        ${metrics.length ? `<div class="metricbox"><h3>Resultados</h3><div class="grid2">${metrics.map((m) =>
          `<div><label for="m_${m.key}">${esc(m.label)} <small>(${m.unit})</small></label><input id="m_${m.key}" data-metric="${m.key}" value="${esc(log.metrics?.[m.key] || "")}" placeholder="${esc(m.hint)}"></div>`).join("")}</div></div>` : ""}
        <label for="splits">Parciales / series (opcional)</label>
        <textarea id="splits" name="splits" rows="2" placeholder="p. ej. 3:07, 3:06, 3:08, 3:05, 3:04">${esc(log.splits || "")}</textarea>
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
    bindSets(form);
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
      ["minutes", "km", "hr", "hrmax", "pace", "weight", "splits", "notes"].forEach((k) => (data[k] = form.elements[k].value.trim()));
      form.querySelectorAll("[data-metric]").forEach((i) => { if (i.value.trim()) data.metrics[i.dataset.metric] = i.value.trim(); });
      data.sets = {};
      form.querySelectorAll(".exlog").forEach((ex) => {
        const sets = readSets(ex);
        const name = ex.dataset.ex;
        if (sets.length) { data.sets[name] = sets; data.loads[name] = setsSummary(sets); }
        else if (log.loads?.[name] && !log.sets?.[name]) data.loads[name] = log.loads[name]; // conserva anotaciones antiguas
      });
      // Test de 5RM: rellena el resultado con la serie más pesada de 5+ reps si no lo has escrito
      const top5 = (ex) => { const ss = data.sets[ex] || []; const ok = ss.filter((x) => (x.reps || 0) >= 5 && x.kg); return ok.length ? Math.max(...ok.map((x) => x.kg)) : null; };
      if (s.metrics === "test5rm") {
        if (!data.metrics.sq5rm && top5("Sentadilla trasera")) data.metrics.sq5rm = String(top5("Sentadilla trasera"));
        if (!data.metrics.dl5rm && top5("Peso muerto convencional")) data.metrics.dl5rm = String(top5("Peso muerto convencional"));
      }
      Store.setLog(id, data);
      toast("Sesión guardada ✓");
      route();
    });
    const del = $("#delLog");
    if (del) del.onclick = () => { if (confirm("¿Borrar el registro de esta sesión?")) { Store.deleteLog(id); toast("Registro borrado"); route(); } };
  }

  // ——— Fuerza ———
  function viewFuerza(k) {
    const wn = currentWeekNum();
    const keys = ["B", "A", "C"];
    const sel = keys.includes(k) ? k : null;
    app.innerHTML = `
      <section class="pagehead"><div class="eyebrow">3 sesiones por semana</div><h1 class="display">Fuerza</h1>
      <p class="muted">B lunes (torso) · A martes (pierna) · C viernes (torso y agarre). Resaltada, la columna de la semana ${wn}.</p>
      <div class="seg nav">${keys.map((x) => `<a href="#/fuerza/${x}" class="${sel === x ? "on" : ""}">Fuerza ${x}</a>`).join("")}<a href="#/fuerza" class="${!sel ? "on" : ""}">Todas</a></div></section>
      ${(sel ? [sel] : keys).map((x) => {
        const t = STRENGTH[x]; const ci = t.weekCol[wn];
        return `<section class="card"><div class="row-between"><h2><span class="fbadge">${x}</span>${esc(cap(t.name.split(" — ")[1]))}</h2><span class="pill">${t.day}</span></div>
        ${t.note ? `<p class="muted">${esc(t.note)}</p>` : ""}
        <div class="exlist">${t.rows.map((r) => `<div class="ex"><div class="ex-name">${esc(r.ex)}</div><div class="ex-sets now">${esc(r.values[ci])}</div></div>`).join("")}</div>
        <details class="mt"><summary>Progresión completa</summary>
        <div class="scroll-x"><table class="tbl wide"><thead><tr><th>Ejercicio</th>${t.cols.map((c, i) => `<th class="${i === ci ? "hl" : ""}">${c}</th>`).join("")}</tr></thead>
        <tbody>${t.rows.map((r) => `<tr><td>${esc(r.ex)}</td>${r.values.map((v, i) => `<td class="${i === ci ? "hl" : ""}">${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div></details>
        ${loadHistory(x)}</section>`;
      }).join("")}
      <section class="card"><h2>Cómo cargar</h2><ul class="bul">${STRENGTH_RULES.map((r) => `<li>${esc(r)}</li>`).join("")}</ul></section>
      ${oneRM()}
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

  function oneRM() {
    const sq = num(metricValue("sq5rm")?.val), dl = num(metricValue("dl5rm")?.val);
    if (!sq && !dl) return `<section class="card"><h2>1RM estimado</h2><p class="muted">Registra el test de 5RM (martes de la semana 1) para ver aquí tus cargas de trabajo.</p></section>`;
    const pc = [["4×6", 0.75], ["4×5", 0.8], ["4×4", 0.82], ["3×3", 0.85]];
    const row = (name, r) => { const rm = r / 0.87; return `<tr><td>${name}</td><td>${fmtNum(r)}</td><td><b>${fmtNum(rm, 0)}</b></td>${pc.map(([, p]) => `<td>${Math.round((rm * p) / 2.5) * 2.5}</td>`).join("")}</tr>`; };
    return `<section class="card"><h2>1RM estimado y cargas</h2><p class="muted">1RM = 5RM ÷ 0,87. Cargas redondeadas a 2,5 kg.</p>
      <div class="scroll-x"><table class="tbl"><thead><tr><th></th><th>5RM</th><th>1RM</th>${pc.map(([l, p]) => `<th>${l}<small> ${p * 100}%</small></th>`).join("")}</tr></thead><tbody>
      ${sq ? row("Sentadilla", sq) : ""}${dl ? row("Peso muerto", dl) : ""}</tbody></table></div></section>`;
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
      <section class="pagehead"><div class="eyebrow">Semana ${currentWeekNum()} de 13</div><h1 class="display">Progreso</h1></section>
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
      <section class="card"><h2>Carga semanal</h2><p class="muted">Sesiones hechas, km, horas, RPE medio y semáforo.</p>${loadTable()}</section>
      <section class="card"><h2>Peso corporal</h2><p class="muted">Referencia: estable en torno a ${ATHLETE.weightRef} kg. Si bajas más de 1 kg en 2 semanas, suma ~300 kcal/día.</p>${weightChart()}</section>
      ${stationTable()}
      ${testsTable()}
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
    return `<div class="scroll-x"><table class="tbl"><thead><tr><th>Sem</th><th>Hechas</th><th>Km</th><th>Horas</th><th>RPE</th><th>Semáforo</th></tr></thead><tbody>
      ${ws.map((w) => { const s = weekStats(w);
        return `<tr><td><a href="#/plan/${w.week}">S${w.week}</a></td><td>${s.done + s.partial}/${s.planned}</td><td>${fmtNum(s.km)} <small class="muted">/ ${w.km}</small></td><td>${fmtNum(s.min / 60)}</td>
        <td>${s.rpe ? `<span class="rpebar"><i style="width:${s.rpe * 10}%"></i></span> ${fmtNum(s.rpe)}` : "—"}</td>
        <td>${s.fat.verde ? `<span class="fd f-verde">${s.fat.verde}</span>` : ""}${s.fat.amarillo ? `<span class="fd f-amarillo">${s.fat.amarillo}</span>` : ""}${s.fat.rojo ? `<span class="fd f-rojo">${s.fat.rojo}</span>` : ""}</td></tr>`; }).join("")}
    </tbody></table></div>`;
  }

  function weightChart() {
    const pts = ALL.map((s) => ({ s, v: num(Store.getLog(s.id)?.weight) })).filter((p) => p.v);
    if (pts.length < 2) return `<p class="muted tiny">${pts.length ? `Último peso: ${fmtNum(pts[0].v)} kg. ` : ""}Apunta tu peso en ayunas dos veces por semana en el registro de cualquier sesión.</p>`;
    const W = 420, H = 170, pl = 30, pr = 12, pt = 12, pb = 26;
    const vals = pts.map((p) => p.v);
    const lo = Math.floor(Math.min(...vals, ATHLETE.weightRef) - 1), hi = Math.ceil(Math.max(...vals, ATHLETE.weightRef) + 1);
    const t0 = Date.parse(PLAN_START), t1 = Date.parse(PLAN_END);
    const x = (d) => pl + (W - pl - pr) * ((Date.parse(d) - t0) / (t1 - t0));
    const y = (v) => pt + (H - pt - pb) * (1 - (v - lo) / (hi - lo));
    const path = pts.map((p, i) => `${i ? "L" : "M"}${x(p.s.date).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución del peso">
      ${[lo, ATHLETE.weightRef, hi].map((v) => `<line class="grid ${v === ATHLETE.weightRef ? "ref" : ""}" x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="${pl - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join("")}
      ${[1, 5, 9, 13].map((wk) => `<text class="axis" x="${x(WEEKS[wk - 1].start)}" y="${H - 6}" text-anchor="middle">S${wk}</text>`).join("")}
      <path class="l-real" d="${path}"/>
      ${pts.map((p) => `<g class="hit" data-tip="${fmtDate(p.s.date)}: ${fmtNum(p.v)} kg"><circle cx="${x(p.s.date)}" cy="${y(p.v)}" r="12" fill="transparent"/><circle class="pt" cx="${x(p.s.date)}" cy="${y(p.v)}" r="4"/></g>`).join("")}
    </svg></div>`;
  }

  function stationTable() {
    const tg = target();
    const fromTests = { s_push: "push50", s_pull: "pull50", s_farm: "farm200", s_lunge: "lunge100", s_wb: "wb100" };
    const rows = STATIONS.map((st) => {
      let v = metricValue(st.key), src = v ? "simulacro" : "";
      if (!v && st.key === "s_ski") { v = metricValue("ski1000r") || metricValue("ski1000"); src = "test"; }
      if (!v && st.key === "s_row") { v = metricValue("row1000r") || metricValue("row1000"); src = "test"; }
      if (!v && st.key === "s_bbj") { const b = metricValue("bbj40"); if (b) { v = { val: fmtSec(toSec(b.val) * 2), s: b.s }; src = "test ×2"; } }
      if (!v && fromTests[st.key]) { v = metricValue(fromTests[st.key]); src = "test"; }
      const sec = v ? toSec(v.val) : null;
      const goal = toSec(st[tg]);
      const diff = sec ? sec - goal : null;
      return `<tr><td><span class="num">${st.n}</span>${esc(st.name)}<small class="src">${st.dist}${st.load !== "—" ? " · " + st.load : ""}</small></td><td class="nowrap">${st[tg]}</td><td>${sec ? `<b>${fmtSec(sec)}</b><small class="src">${src}</small>` : "—"}</td>
        <td class="${diff == null ? "" : diff > 0 ? "neg" : "pos"}">${diff == null ? "" : (diff > 0 ? "+" : "−") + fmtSec(Math.abs(diff))}</td></tr>`;
    });
    return `<section class="card"><div class="row-between"><h2>Ejercicios específicos</h2>
      <div class="seg mini" id="tgSeg"><button data-v="A" class="${tg === "A" ? "on" : ""}">A</button><button data-v="B" class="${tg === "B" ? "on" : ""}">B</button></div></div>
      <p class="muted">Tiempo de referencia (nivel ${tg}) frente a tu mejor dato registrado en tests y simulacros.</p>
      <div class="scroll-x"><table class="tbl stations-tbl"><thead><tr><th>Ejercicio</th><th>Ref.</th><th>Tú</th><th>Dif.</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>
    </section>`;
  }

  function testsTable() {
    const T = [
      ["Test 30' · distancia", "dist30", null, "m"], ["Test 30' · ritmo", "pace30", null, "/km"], ["FC de umbral", "hr20", null, "ppm"],
      ["5RM sentadilla", "sq5rm", null, "kg"], ["5RM peso muerto", "dl5rm", null, "kg"],
      ["1.000 m SkiErg", "ski1000", "ski1000r", "<3:40"], ["1.000 m remo", "row1000", "row1000r", "<3:40"],
      ["Sled push 50 m", "push50", null, ""], ["Sled pull 50 m", "pull50", null, ""], ["Burpee BJ 40 m", "bbj40", null, ""],
      ["Farmers 200 m", "farm200", null, ""], ["Lunges 100 m", "lunge100", null, ""], ["Wall balls seguidas", "wbmax", null, ""], ["100 wall balls", "wb100", null, "≤4 series"],
      ["Simulacro parcial 1.ª mitad", "half1", null, ""], ["Simulacro parcial 2.ª mitad", "half2", null, ""],
    ];
    const sims = [6, 10, 13].map((wk) => { const s = WEEKS[wk - 1].sessions[5]; return { wk, s, v: Store.getLog(s.id)?.metrics?.total }; });
    return `<section class="card"><h2>Tests y simulacros</h2><div class="scroll-x"><table class="tbl"><thead><tr><th>Test</th><th>S1</th><th>Retest</th><th>Ref.</th></tr></thead><tbody>
      ${T.map(([l, k, r, ref]) => { const a = metricValue(k), b = r ? metricValue(r) : null;
        return `<tr><td>${l}</td><td>${a ? `<a href="#/sesion/${a.s.id}">${esc(a.val)}</a>` : "—"}</td><td>${b ? `<a href="#/sesion/${b.s.id}">${esc(b.val)}</a>` : r ? "S4: —" : ""}</td><td class="muted">${ref}</td></tr>`; }).join("")}
      ${sims.map((x) => `<tr><td>${x.wk === 13 ? "<b>Prueba final (S13)</b>" : `Simulacro completo #${x.wk === 6 ? 1 : 2} (S${x.wk})`}</td><td colspan="2">${x.v ? `<a href="#/sesion/${x.s.id}"><b>${esc(x.v)}</b></a>` : "—"}</td><td class="muted">${x.wk === 6 ? "<66' → A" : x.wk === 10 ? "≤61' → A" : ""}</td></tr>`).join("")}
    </tbody></table></div>
    <p class="muted tiny">Referencias para mediados de enero: 5 km en ~18:45, SkiErg y remo por debajo de 3:40 y 100 wall balls en 4 series o menos.</p></section>`;
  }

  // ——— Guía ———
  function viewGuia() {
    app.innerHTML = `
      <section class="pagehead"><div class="eyebrow">Referencias</div><h1 class="display">Guía</h1></section>
      <section class="card"><h2>Zonas y ritmos</h2><p class="muted">Basadas en 5 km en 20:00. Se recalculan con el test de 30' (S1) y el simulacro #1 (S6).</p>
        <div class="zones">${ZONES.map((z) => `<div class="zone"><span class="zchip z-${z.z.toLowerCase()}">${z.z}</span><div><b>${z.name}</b><small>${z.use}</small></div>
          <div class="zone-v"><b>${z.pace}</b><small>${z.erg !== "—" ? `ergo ${z.erg}` : ""}${z.hr !== "—" ? ` · ${z.hr}` : ""}</small></div></div>`).join("")}</div>
        ${hrZones()}</section>
      <section class="card"><h2>Ejercicios específicos</h2><p class="muted">Técnica y claves de ejecución.</p><div class="stations">
        ${STATIONS.map((s) => `<details class="station"><summary><span class="num">${s.n}</span><span><b>${s.name}</b><small>${s.dist}${s.load !== "—" ? " · " + s.load : ""}</small></span><span class="goal">${s.A}<small>${s.B}</small></span>${ico("chev", "chev")}</summary>
          <p><b>Norma:</b> ${esc(s.rule)}</p><p><b>Técnica:</b> ${esc(s.tech)}</p><p><b>Clave:</b> ${esc(s.strat)}</p></details>`).join("")}
      </div></section>
      <section class="card"><h2>Si pierdes un día</h2><ul class="bul">${FATIGUE.missed.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        <p class="muted">Dolor punzante o localizado en articulación o tendón: para la sesión. Agujetas o fatiga difusa no son motivo para parar. Vigila lumbar y cadera en sled push, lunges y peso muerto.</p></section>
      ${trafficLight()}
      <section class="card"><h2>Abreviaturas</h2><dl class="facts">${ABBR.map(([a, b]) => `<div><dt><b>${a}</b></dt><dd>${esc(b)}</dd></div>`).join("")}</dl></section>
      <section class="card"><h2>Nutrición y recuperación</h2><div class="scroll-x"><table class="tbl"><tbody>
        <tr><td>Proteína</td><td>150–175 g/día · 4–5 tomas de 30–40 g</td></tr>
        <tr><td>Hidratos días suaves</td><td>320–400 g (mié, dom)</td></tr>
        <tr><td>Hidratos días duros</td><td>490–570 g (lun, mar, jue, sáb)</td></tr>
        <tr><td>Creatina</td><td>3–5 g/día</td></tr>
        <tr><td>Peso</td><td>2 veces por semana en ayunas</td></tr>
        <tr><td>Sueño</td><td>7–8 h; siesta de 20' en días dobles</td></tr>
        <tr><td>Semana final</td><td>Jue–vie 7–8 g/kg de hidratos; desayuno 3 h antes con 120–160 g</td></tr>
      </tbody></table></div></section>
    `;
  }

  function hrZones() {
    const hr = num(metricValue("hr20")?.val);
    if (!hr) return `<p class="muted tiny mt">Registra la FC media de los últimos 20' del test de 30' para calcular aquí tus zonas de FC en ppm.</p>`;
    const z = [["Z1", 0, 0.8], ["Z2", 0.8, 0.88], ["Z3", 0.89, 0.94], ["Z4", 0.95, 1.0], ["Z5", 1.02, null]];
    return `<h3 class="mt">Tus zonas de FC (umbral ${hr} ppm)</h3><div class="hrz">${z.map(([n, a, b]) =>
      `<div><span class="zchip z-${n.toLowerCase()}">${n}</span><b>${a ? Math.round(hr * a) : "<"}${b ? (a ? "–" : "") + Math.round(hr * b) : "+"}</b></div>`).join("")}</div>`;
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
      <section class="card"><h2>Apariencia</h2>
        <div class="seg" id="themeSeg">${[["auto", "Automático"], ["light", "Claro"], ["dark", "Oscuro"]].map(([v, l]) => `<button data-v="${v}" class="${theme === v ? "on" : ""}">${l}</button>`).join("")}</div></section>
      <section class="card"><h2>Ritmo objetivo</h2><p class="muted">Lo decide el simulacro #1 (S6) y se confirma en el #2 (S10).</p>
        <div class="seg" id="tgSeg2"><button data-v="A" class="${target() === "A" ? "on" : ""}">A · 4:00/km</button><button data-v="B" class="${target() === "B" ? "on" : ""}">B · 4:12/km</button></div></section>
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
    $("#themeSeg").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; Store.setSetting("theme", b.dataset.v); applyTheme(); viewDatos(); };
    $("#tgSeg2").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; Store.setSetting("activeTarget", b.dataset.v); viewDatos(); toast(`Ritmo objetivo ${b.dataset.v} activo`); };
    $("#reset").onclick = () => { if (confirm("¿Seguro? Se borrarán todos los registros de este navegador.") && confirm("Última confirmación: no se puede deshacer.")) { Store.reset(); toast("Registros borrados"); route(); } };
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
    ({ hoy: viewHoy, plan: () => viewPlan(arg), sesion: () => viewSesion(arg), fuerza: () => viewFuerza(arg),
      progreso: viewProgreso, guia: viewGuia, datos: viewDatos }[view] || viewHoy)();
  }
  window.addEventListener("hashchange", () => { route(); window.scrollTo(0, 0); });
  applyTheme();
  route();

  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
})();
