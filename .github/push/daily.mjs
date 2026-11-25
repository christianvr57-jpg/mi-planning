// Construye el aviso con la sesión de hoy (según js/plan.js) y lo envía por Web Push a las suscripciones guardadas
import fs from "node:fs";
import vm from "node:vm";

const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL("../../js/plan.js", import.meta.url), "utf8") + ";this.P = { WEEKS, STRENGTH, FX };", ctx);
const { WEEKS, STRENGTH, FX } = ctx.P;

const today = process.env.FECHA || new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
const s = WEEKS.flatMap((w) => w.sessions).find((x) => x.date === today);
if (!s) { console.log("Sin sesión para", today); process.exit(0); }

const clean = (t) => t.replace(/\s*\(.*?\)/g, "");
const fxShort = (t) => { const f = Object.values(FX).find((x) => t.includes(x)); return f ? t.replace(f, f.split(":")[0]) : t; };
let title, body;
if (s.kind === "rest") {
  title = "Hoy toca descanso";
  body = s.detail;
} else {
  title = `Hoy: ${s.title}`;
  const labels = s.strength.map((k) => STRENGTH[k].label);
  const steps = s.steps.map((x) => fxShort(x).replace(/\s*\((?!≈).*?\)/g, "")).filter((x) => !labels.includes(x));
  const lines = [[s.duration, ...steps].join(" · ")];
  s.strength.forEach((k) => {
    const t = STRENGTH[k], ci = t.weekCol[s.week];
    const ex = t.rows.filter((r) => r.values[ci] && r.values[ci] !== "—").map((r) => `${clean(r.ex)} ${r.values[ci]}`);
    lines.push(`${t.label}: ${ex.join(", ")}`);
  });
  body = lines.join("\n");
}
const payload = JSON.stringify({ title, body, url: "./#/hoy", tag: "hoy-" + today });
console.log(payload);
if (process.env.DRY_RUN) process.exit(0);

const { default: webpush } = await import("web-push");
webpush.setVapidDetails("https://christianvr57-jpg.github.io/mi-planning/", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
let subs = JSON.parse(process.env.PUSH_SUBSCRIPTIONS || "[]");
if (!Array.isArray(subs)) subs = [subs];
if (!subs.length) { console.log("No hay suscripciones guardadas (secreto PUSH_SUBSCRIPTIONS)"); process.exit(0); }
let fail = 0;
for (const sub of subs) {
  try { await webpush.sendNotification(sub, payload, { TTL: 6 * 3600, urgency: "high" }); console.log("Enviado ✓"); }
  catch (e) { fail++; console.error("Error", e.statusCode, e.body); }
}
if (fail === subs.length) process.exit(1);
