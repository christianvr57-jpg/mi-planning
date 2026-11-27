// Diario de comidas: guarda lo que has comido un día en data/diario.json (lo lee la app).
// Uso:
//   node tools/diario.mjs set 2026-11-27 dia.json   → guarda el día (sustituye lo que hubiera)
//   node tools/diario.mjs add 2026-11-27 dia.json   → añade alimentos a ese día
//   node tools/diario.mjs del 2026-11-27            → borra el día
//   node tools/diario.mjs show 2026-11-27           → muestra el día y el objetivo
// dia.json: { "items": [{ "m": "Desayuno", "n": "Tostadas de pan Panrico", "q": "2 rebanadas", "k": 150, "p": 6, "c": 28, "f": 2 }], "note": "opcional" }
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const FILE = new URL("data/diario.json", root);
const ctx = {};
vm.createContext(ctx);
const src = (f) => fs.readFileSync(new URL("js/" + f, root), "utf8");
vm.runInContext(src("plan.js") + ";" + src("foods-db.js") + ";" + src("nutrition.js") + ";this.P = { WEEKS, DAY_TYPES, dietTypeFor };", ctx);
const { WEEKS, DAY_TYPES, dietTypeFor } = ctx.P;

const [cmd, date, file] = process.argv.slice(2);
if (!["set", "add", "del", "show"].includes(cmd) || !/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
  console.error("Uso: node tools/diario.mjs set|add|del|show AAAA-MM-DD [dia.json]"); process.exit(1);
}
const db = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf8")) : {};
const r1 = (x) => Math.round(Number(x) * 10) / 10;

if (cmd === "set" || cmd === "add") {
  const d = JSON.parse(fs.readFileSync(file, "utf8"));
  const items = (Array.isArray(d) ? d : d.items || []).map((it, i) => {
    if (!it.n) throw new Error(`Alimento ${i + 1} sin nombre (n)`);
    ["k", "p", "c", "f"].forEach((x) => { if (!Number.isFinite(Number(it[x]))) throw new Error(`«${it.n}»: falta ${x}`); });
    return { ...(it.m ? { m: String(it.m) } : {}), n: String(it.n), ...(it.q ? { q: String(it.q) } : {}), k: Math.round(it.k), p: r1(it.p), c: r1(it.c), f: r1(it.f) };
  });
  const prev = cmd === "add" ? db[date]?.items || [] : [];
  const note = d.note ?? (cmd === "add" ? db[date]?.note : undefined);
  db[date] = { items: [...prev, ...items], ...(note ? { note } : {}), at: new Date().toISOString() };
} else if (cmd === "del") delete db[date];

if (cmd !== "show") {
  const sorted = Object.fromEntries(Object.keys(db).sort().map((k) => [k, db[k]]));
  fs.writeFileSync(FILE, JSON.stringify(sorted, null, 1) + "\n");
}

// Resumen frente al objetivo del día según el plan
const s = WEEKS.flatMap((w) => w.sessions).find((x) => x.date === date);
const type = dietTypeFor(s), t = DAY_TYPES[type];
const day = db[date];
if (!day) { console.log(`${date}: sin registro`); process.exit(0); }
const tot = day.items.reduce((a, x) => ({ k: a.k + x.k, p: a.p + x.p, c: a.c + x.c, f: a.f + x.f }), { k: 0, p: 0, c: 0, f: 0 });
console.log(`${date} · ${s ? s.title : "sin sesión"} → día «${t.name}»`);
day.items.forEach((x) => console.log(`  ${x.m ? x.m + " · " : ""}${x.n}${x.q ? ` (${x.q})` : ""}: ${x.k} kcal · P ${x.p} · H ${x.c} · G ${x.f}`));
console.log(`TOTAL: ${Math.round(tot.k)} kcal · P ${Math.round(tot.p)} · H ${Math.round(tot.c)} · G ${Math.round(tot.f)}`);
console.log(`OBJETIVO: ${t.kcal} kcal · P ${t.p} · H ${t.c} · G ${t.f}`);
console.log(`DIFERENCIA: ${Math.round(tot.k - t.kcal)} kcal · P ${Math.round(tot.p - t.p)} · H ${Math.round(tot.c - t.c)} · G ${Math.round(tot.f - t.f)}`);
