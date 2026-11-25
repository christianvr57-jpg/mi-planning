// Entrenador por Telegram: los ajustes que apruebas en el bot se aplican encima del plan base.
// La app envía al bot el plan cercano y tus registros, y recibe los ajustes (por fecha).
const Coach = (() => {
  const KEY = "mi-planning-coach";
  const SESS = WEEKS.flatMap((w) => w.sessions);
  const PATCH = ["title", "kind", "intensity", "duration", "detail", "strength", "strengthMod"];
  SESS.forEach((s) => { s._base = { title: s.title, kind: s.kind, intensity: s.intensity, duration: s.duration, detail: s.detail, strength: s.strength, steps: s.steps }; });

  // "4×8 RIR3" + { sets: -1, rir: 1 } → "3×8 RIR4". drop: ejercicios que se quitan ese día.
  function modScheme(v, ex, m) {
    if (!m || !v || v === "—") return v;
    if ((m.drop || []).includes(ex)) return "—";
    let out = v;
    if (m.sets) out = out.replace(/^(\d+)×/, (_, n) => `${Math.max(1, Number(n) + m.sets)}×`);
    if (m.rir) out = out.replace(/RIR(\d)(?:–(\d))?/, (_, a, b) => `RIR${Math.max(0, Number(a) + m.rir)}${b ? "–" + Math.max(0, Number(b) + m.rir) : ""}`);
    return out;
  }

  function apply(ov) {
    let n = 0;
    SESS.forEach((s) => {
      Object.assign(s, s._base); delete s.strengthMod; delete s.coach;
      const p = ov && ov[s.date];
      if (!p) return;
      PATCH.forEach((f) => { if (p[f] != null) s[f] = p[f]; });
      if (p.detail != null) s.steps = String(p.detail).split(" · ").map((x) => x.trim()).filter(Boolean);
      s.coach = p.why || "Ajustada por tu entrenador";
      n++;
    });
    return n;
  }

  const hasLS = typeof localStorage !== "undefined";
  let cfg = {};
  try { cfg = (hasLS && JSON.parse(localStorage.getItem(KEY))) || {}; } catch { cfg = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch {} };
  apply(cfg.ov || {});

  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // Lo que el entrenador necesita saber: plan de -21 a +28 días, registros y plantillas de fuerza
  function payload() {
    const today = iso(new Date());
    const from = addDays(today, -21), to = addDays(today, 28);
    const near = SESS.filter((s) => s.date >= from && s.date <= to);
    const weeks = [...new Set(near.map((s) => s.week))].map((n) => {
      const w = WEEKS[n - 1];
      return { week: n, phase: PHASES[w.phase].name, title: w.title, focus: w.focus, km: w.km, notes: w.notes };
    });
    const logs = {};
    near.forEach((s) => {
      const l = typeof Store !== "undefined" && Store.getLog(s.id);
      if (!l) return;
      const { sessionId, updatedAt, ...rest } = l;
      logs[s.date] = rest;
    });
    const tpl = {};
    Object.entries(STRENGTH).forEach(([k, t]) => { tpl[k] = { label: t.label, legs: !!t.legs, weekCol: t.weekCol, rows: t.rows.map((r) => [r.ex, ...r.values]) }; });
    return {
      today,
      athlete: { goal: ATHLETE.goal, targets: ATHLETE.targets, active: (typeof Store !== "undefined" && Store.settings.activeTarget) || "A", race: RACE_DATE },
      weeks,
      sessions: near.map((s) => ({ date: s.date, day: s.day, week: s.week, ...s._base, steps: undefined, metrics: s.metrics || null })),
      logs,
      strength: tpl,
    };
  }

  let busy = false, last = 0, timer = null;
  async function sync(force) {
    if (!cfg.url || !cfg.token || busy) return false;
    if (!force && Date.now() - last < 60000) return false;
    busy = true; last = Date.now();
    try {
      const r = await fetch(cfg.url.replace(/\/$/, "") + "/api/sync", {
        method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + cfg.token },
        body: JSON.stringify(payload()),
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const d = await r.json();
      const changed = JSON.stringify(d.ov || {}) !== JSON.stringify(cfg.ov || {});
      cfg = { ...cfg, ov: d.ov || {}, bot: d.bot || cfg.bot, linked: !!d.linked, at: new Date().toISOString(), err: null };
      save();
      if (changed) { apply(cfg.ov); window.dispatchEvent(new Event("coach-updated")); }
      return changed;
    } catch (e) {
      cfg.err = e.message; save();
      return false;
    } finally { busy = false; }
  }

  if (hasLS && typeof window !== "undefined") {
    // Sincroniza al abrir, al volver a la app y unos segundos después de guardar un registro
    setTimeout(() => sync(true), 800);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") sync(); });
    if (typeof Store !== "undefined") {
      const orig = Store.setLog;
      Store.setLog = (id, log) => { orig(id, log); clearTimeout(timer); timer = setTimeout(() => sync(true), 4000); };
    }
  }

  return {
    modScheme, apply, sync, payload,
    get cfg() { return cfg; },
    connected: () => !!(cfg.url && cfg.token),
    // Código que te da el bot: "planning:<base64 de {u,t}>"
    useCode(code) {
      const raw = String(code).trim().replace(/^planning:/, "");
      const d = JSON.parse(atob(raw));
      if (!d.u || !d.t) throw new Error("bad");
      cfg = { url: d.u, token: d.t, ov: cfg.ov || {} }; save();
    },
    disconnect() { cfg = {}; save(); apply({}); },
  };
})();
