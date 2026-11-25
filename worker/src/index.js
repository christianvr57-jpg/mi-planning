// Entrenador personal en Telegram para "Mi planning".
// - Webhook de Telegram: hablas con el entrenador (Claude) y apruebas sus ajustes con un botón.
// - /api/sync: la app envía el plan cercano y tus registros, y recibe los ajustes aprobados.
// - Cron diario: mensaje de la mañana con el entreno de hoy y el check-in.
//
// Secretos (wrangler secret put): TELEGRAM_TOKEN, ANTHROPIC_API_KEY, APP_TOKEN, TG_SECRET
import Anthropic from "@anthropic-ai/sdk";

const KINDS = ["run", "strength", "hybrid", "test", "rest", "race"];
const INTENS = ["suave", "media", "dura", "muy", "carrera", "libre"];
const BLOCKS = ["TA", "PA", "TB", "BR", "PB"];
const DOW = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const FEEL = ["😫", "😕", "😐", "🙂", "💪"];

// ——— utilidades ———
const json = (d, status = 200, headers = {}) => new Response(JSON.stringify(d), { status, headers: { "content-type": "application/json", ...headers } });
const madridToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
const addDays = (iso, n) => { const [y, m, d] = iso.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
const fmtDate = (iso) => { const [y, m, d] = iso.split("-").map(Number); return `${DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d} ${MONTHS[m - 1]}`; };
const getJ = async (env, k, def) => { const v = await env.KV.get(k, "json"); return v == null ? def : v; };
const putJ = (env, k, v, opts) => env.KV.put(k, JSON.stringify(v), opts);
const rid = () => crypto.randomUUID().slice(0, 8);

async function tg(env, method, body) {
  const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/${method}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  return r.json();
}
const send = (env, chat, text, extra = {}) => tg(env, "sendMessage", { chat_id: chat, text: text.slice(0, 4000), disable_web_page_preview: true, ...extra });

// ——— plan con ajustes ———
function modScheme(v, ex, m) {
  if (!m || !v || v === "—") return v;
  if ((m.drop || []).includes(ex)) return "—";
  let out = v;
  if (m.sets) out = out.replace(/^(\d+)×/, (_, n) => `${Math.max(1, Number(n) + m.sets)}×`);
  if (m.rir) out = out.replace(/RIR(\d)(?:–(\d))?/, (_, a, b) => `RIR${Math.max(0, Number(a) + m.rir)}${b ? "–" + Math.max(0, Number(b) + m.rir) : ""}`);
  return out;
}
function session(ctx, ov, date) {
  const base = (ctx?.sessions || []).find((s) => s.date === date);
  if (!base) return null;
  const p = ov[date] || {};
  const s = { ...base };
  ["title", "kind", "intensity", "duration", "detail", "strength", "strengthMod"].forEach((f) => { if (p[f] != null) s[f] = p[f]; });
  s.why = p.why || null;
  s.rows = (s.strength || []).flatMap((k) => {
    const t = ctx.strength?.[k]; if (!t) return [];
    const ci = t.weekCol[s.week];
    return [{ label: t.label, rows: t.rows.map(([ex, ...vals]) => [ex, modScheme(vals[ci], ex, s.strengthMod)]).filter(([, v]) => v && v !== "—") }];
  });
  return s;
}
function sessText(s, full = true) {
  if (!s) return "Hoy no hay sesión en el plan.";
  const lines = [`${s.title} · ${s.duration}${s.why ? "  (ajustada)" : ""}`];
  if (full) {
    String(s.detail || "").split(" · ").filter(Boolean).forEach((x) => lines.push("• " + x));
    s.rows.forEach((b) => { lines.push("", b.label + ":"); b.rows.forEach(([ex, v]) => lines.push(`  ${ex}: ${v}`)); });
    if (s.why) lines.push("", "Nota del entrenador: " + s.why);
  }
  return lines.join("\n");
}

// ——— el entrenador (Claude) ———
const SYSTEM = `Eres el entrenador personal de un atleta aficionado que sigue un plan de 15 semanas (23 nov 2026 – 7 mar 2027): prioridad ganar músculo (hipertrofia), con trabajo funcional y una carrera de 10K el 6 de marzo de 2027. Hablas con él por Telegram, en español de España, de tú, cercano y directo.

Cómo trabajas:
- Usa los datos del contexto: plan de los próximos días, registros (estado, RPE 1-10, fatiga, kg y repeticiones, km, ritmo, FC), check-ins de la mañana (1 = reventado, 5 = genial) y los ajustes ya aplicados. No inventes datos que no estén.
- Respuestas cortas, para leer en el móvil: normalmente 2-6 frases. Sin tablas ni markdown (texto plano; puedes usar saltos de línea y guiones).
- Propón cambios en "changes" solo cuando haga falta o te lo pidan. Si solo pregunta algo, contesta y deja "changes" vacío. Él aprueba los cambios con un botón; en "reply" explica qué cambias y por qué, sin repetir cada campo.
- Criterio: proteger la hipertrofia y llegar fresco a las series de calidad de carrera. Ante fatiga, primero quita volumen (series) o sube RIR antes que quitar sesiones enteras; baja carreras de calidad a Z2 o acórtalas; un día de descanso extra si hay varios indicadores malos seguidos. No acumules dos días duros seguidos al mover sesiones. No toques la fecha de la carrera y mueve los tests solo si es necesario.
- Si describe dolor agudo, punzante, que empeora al correr o que dura varios días, recomiéndale parar esa zona y consultar a un fisioterapeuta o médico; no diagnostiques.

Formato de "changes" (uno por fecha afectada; solo fechas que existan en el plan del contexto):
- date: AAAA-MM-DD.
- restore: true para devolver ese día a lo planificado originalmente (el resto de campos a null).
- title, kind, intensity, duration, detail: null para dejar el valor actual. kind ∈ run|strength|hybrid|test|rest|race; intensity ∈ suave|media|dura|muy|carrera|libre. detail son los pasos separados por " · " (igual que en el plan), por ejemplo "Mañana: 30' continuos en Z2 · Tarde: Torso A".
- strength: lista de bloques de fuerza del día (TA, PA, TB, BR, PB; [] si ese día no hay fuerza) o null para no cambiarla.
- strengthMod: ajuste de las series del día o null. sets = series a sumar por ejercicio (p. ej. -1), rir = RIR a sumar (p. ej. 1 = más lejos del fallo), drop = nombres exactos de ejercicios a quitar ese día.
- why: nota breve (máx. 1 frase) que verá en la app en esa sesión.
- Para mover una sesión de día, da los dos días con todos sus campos.`;

const SCHEMA = {
  type: "object", additionalProperties: false, required: ["reply", "changes"],
  properties: {
    reply: { type: "string" },
    changes: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["date", "restore", "title", "kind", "intensity", "duration", "detail", "strength", "strengthMod", "why"],
        properties: {
          date: { type: "string", format: "date" },
          restore: { type: "boolean" },
          title: { anyOf: [{ type: "string" }, { type: "null" }] },
          kind: { anyOf: [{ type: "string", enum: KINDS }, { type: "null" }] },
          intensity: { anyOf: [{ type: "string", enum: INTENS }, { type: "null" }] },
          duration: { anyOf: [{ type: "string" }, { type: "null" }] },
          detail: { anyOf: [{ type: "string" }, { type: "null" }] },
          strength: { anyOf: [{ type: "array", items: { type: "string", enum: BLOCKS } }, { type: "null" }] },
          strengthMod: {
            anyOf: [{
              type: "object", additionalProperties: false, required: ["sets", "rir", "drop"],
              properties: { sets: { type: "integer" }, rir: { type: "integer" }, drop: { type: "array", items: { type: "string" } } },
            }, { type: "null" }],
          },
          why: { type: "string" },
        },
      },
    },
  },
};

async function coach(env, chat, text) {
  const [ctx, ov, conv, checkins] = await Promise.all([getJ(env, "ctx", null), getJ(env, "ov", {}), getJ(env, "conv", []), getJ(env, "checkins", {})]);
  if (!ctx) return send(env, chat, "Todavía no tengo tu plan. Abre la app (Datos → Entrenador en Telegram) para que se sincronice y vuelve a escribirme.");
  tg(env, "sendChatAction", { chat_id: chat, action: "typing" }).catch(() => {});
  const today = madridToday();
  const context = {
    hoy: `${today} (${fmtDate(today)})`, sincronizado: ctx.syncedAt, atleta: ctx.athlete, semanas: ctx.weeks,
    plan_base: ctx.sessions, plantillas_fuerza: ctx.strength, registros: ctx.logs, checkins, ajustes_aplicados: ov,
  };
  const messages = [
    ...conv.flatMap((m) => [{ role: "user", content: m.u }, { role: "assistant", content: m.a }]),
    { role: "user", content: text },
  ];
  let out;
  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const res = await client.beta.messages.create({
      model: env.MODEL || "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // El contexto solo cambia al sincronizar: va cacheado en el system para abaratar los mensajes seguidos
      system: [{ type: "text", text: SYSTEM }, { type: "text", text: `<contexto>\n${JSON.stringify(context)}\n</contexto>`, cache_control: { type: "ephemeral" } }],
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      messages,
    });
    if (res.stop_reason === "refusal") return send(env, chat, "No puedo ayudarte con eso. Cuéntamelo de otra forma.");
    const txt = res.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    out = JSON.parse(txt);
  } catch (e) {
    const msg = e instanceof Anthropic.APIError ? `error ${e.status}` : e.message;
    return send(env, chat, `Ahora mismo no puedo responder (${msg}). Prueba otra vez en un rato.`);
  }

  // Solo cambios válidos sobre fechas del plan
  const dates = new Set(ctx.sessions.map((s) => s.date));
  const changes = (out.changes || []).filter((c) => dates.has(c.date));
  await putJ(env, "conv", [...conv, { u: text, a: out.reply }].slice(-8));
  if (!changes.length) return send(env, chat, out.reply);

  const id = rid();
  await putJ(env, "prop:" + id, changes, { expirationTtl: 7 * 86400 });
  const sum = changes.map((c) => c.restore ? `↩️ ${fmtDate(c.date)}: vuelve a lo planificado`
    : `📅 ${fmtDate(c.date)}: ${sessText(session(ctx, applyChanges({ ...ov }, [c]), c.date), false)}${c.strengthMod ? `\n    fuerza: ${modTxt(c.strengthMod)}` : ""}`).join("\n");
  return send(env, chat, `${out.reply}\n\n${sum}`, {
    reply_markup: { inline_keyboard: [[{ text: "✅ Aplicar", callback_data: "ap:" + id }, { text: "✖️ Descartar", callback_data: "no:" + id }]] },
  });
}
const modTxt = (m) => [m.sets ? `${m.sets > 0 ? "+" : ""}${m.sets} series` : "", m.rir ? `RIR ${m.rir > 0 ? "+" : ""}${m.rir}` : "", m.drop?.length ? `sin ${m.drop.join(", ")}` : ""].filter(Boolean).join(" · ");

function applyChanges(ov, changes) {
  changes.forEach((c) => {
    if (c.restore) { delete ov[c.date]; return; }
    const p = { ...(ov[c.date] || {}) };
    ["title", "kind", "intensity", "duration", "detail", "strength", "strengthMod"].forEach((f) => { if (c[f] != null) p[f] = c[f]; });
    if (c.strengthMod && !c.strengthMod.sets && !c.strengthMod.rir && !c.strengthMod.drop?.length) delete p.strengthMod;
    p.why = c.why;
    ov[c.date] = p;
  });
  return ov;
}

// ——— Telegram ———
async function onUpdate(env, u, origin) {
  if (await env.KV.get("upd:" + u.update_id)) return; // Telegram reintenta si tardamos
  await env.KV.put("upd:" + u.update_id, "1", { expirationTtl: 3600 });
  const owner = await env.KV.get("owner");

  if (u.callback_query) {
    const q = u.callback_query, chat = q.message.chat.id;
    if (String(chat) !== owner) return;
    const [act, arg] = q.data.split(":");
    const done = (t) => tg(env, "answerCallbackQuery", { callback_query_id: q.id, text: t });
    const clearKb = () => tg(env, "editMessageReplyMarkup", { chat_id: chat, message_id: q.message.message_id, reply_markup: { inline_keyboard: [] } });
    if (act === "ci") {
      const n = Number(arg), today = madridToday();
      const checkins = await getJ(env, "checkins", {});
      checkins[today] = n;
      const keep = Object.fromEntries(Object.entries(checkins).filter(([d]) => d >= addDays(today, -21)));
      await putJ(env, "checkins", keep);
      await done(`Anotado: ${FEEL[n - 1]} ${n}/5`); await clearKb();
      if (n <= 2) return coach(env, chat, `Check-in de hoy: ${n}/5 (me encuentro mal o muy cansado). Revisa si hay que ajustar la sesión de hoy o los próximos días.`);
      return send(env, chat, `${FEEL[n - 1]} Anotado. ${n >= 4 ? "¡A por ello!" : "Escúchate durante la sesión; si algo no va, escríbeme."}`);
    }
    if (act === "ap" || act === "no") {
      const changes = await getJ(env, "prop:" + arg, null);
      await clearKb();
      if (!changes) return done("Esta propuesta ya no está disponible");
      await env.KV.delete("prop:" + arg);
      if (act === "no") { await done("Descartado"); return send(env, chat, "Vale, lo dejamos como estaba."); }
      const ov = await getJ(env, "ov", {});
      const prev = Object.fromEntries(changes.map((c) => [c.date, ov[c.date] || null]));
      await putJ(env, "ov", applyChanges(ov, changes));
      const hist = await getJ(env, "hist", []);
      await putJ(env, "hist", [...hist, prev].slice(-20));
      await done("Aplicado ✓");
      return send(env, chat, "✅ Aplicado. Lo verás en la app al abrirla (y en la nota del reloj). /deshacer para volver atrás.");
    }
    return done("");
  }

  const m = u.message;
  if (!m || !m.text) return;
  const chat = m.chat.id, text = m.text.trim();
  if (!owner) {
    if (!text.startsWith("/start")) return send(env, chat, "Envía /start para empezar.");
    await env.KV.put("owner", String(chat));
    return send(env, chat, welcome(env, origin));
  }
  if (String(chat) !== owner) return send(env, chat, "Este bot es privado.");

  const cmd = text.split(/[\s@]/)[0].toLowerCase();
  if (cmd === "/start" || cmd === "/codigo") return send(env, chat, welcome(env, origin));
  if (cmd === "/ayuda" || cmd === "/help") return send(env, chat, HELP);
  if (cmd === "/hoy") return sendToday(env, chat, false);
  if (cmd === "/semana") {
    const [ctx, ov] = await Promise.all([getJ(env, "ctx", null), getJ(env, "ov", {})]);
    const t = madridToday();
    const lines = Array.from({ length: 7 }, (_, i) => addDays(t, i)).map((d) => { const s = session(ctx, ov, d); return s ? `${fmtDate(d)}: ${sessText(s, false)}` : null; }).filter(Boolean);
    return send(env, chat, lines.length ? lines.join("\n") : "No tengo el plan: abre la app para sincronizar.");
  }
  if (cmd === "/deshacer") {
    const hist = await getJ(env, "hist", []);
    const prev = hist.pop();
    if (!prev) return send(env, chat, "No hay nada que deshacer.");
    const ov = await getJ(env, "ov", {});
    Object.entries(prev).forEach(([d, p]) => { if (p) ov[d] = p; else delete ov[d]; });
    await Promise.all([putJ(env, "ov", ov), putJ(env, "hist", hist)]);
    return send(env, chat, `↩️ Deshecho (${Object.keys(prev).map(fmtDate).join(", ")}).`);
  }
  if (cmd === "/original") {
    await putJ(env, "ov", {});
    return send(env, chat, "Plan devuelto al original: sin ajustes.");
  }
  if (cmd === "/olvidar") { await putJ(env, "conv", []); return send(env, chat, "Conversación reiniciada (tus datos y ajustes siguen)."); }
  return coach(env, chat, text);
}

const HELP = `Escríbeme como a tu entrenador: «hoy voy reventado», «me molesta el gemelo», «el jueves no puedo entrenar», «¿qué ritmo llevo en las series?».
Si propongo cambios, los apruebas con ✅ y se aplican solos en la app.

/hoy — el entreno de hoy
/semana — los próximos 7 días
/deshacer — quita el último ajuste aprobado
/original — quita todos los ajustes
/olvidar — reinicia la conversación
/codigo — código para conectar la app`;

function welcome(env, origin) {
  const code = "planning:" + btoa(JSON.stringify({ u: origin, t: env.APP_TOKEN }));
  return `👋 Soy tu entrenador. Para conectar la app, ábrela → Datos → «Entrenador en Telegram» y pega este código (no lo compartas):\n\n${code}\n\n${HELP}`;
}

async function sendToday(env, chat, morning) {
  const [ctx, ov] = await Promise.all([getJ(env, "ctx", null), getJ(env, "ov", {})]);
  const s = session(ctx, ov, madridToday());
  if (!s) return morning ? null : send(env, chat, "No tengo la sesión de hoy: abre la app para sincronizar.");
  const head = morning ? (s.kind === "rest" ? "☀️ Buenos días. Hoy toca descanso." : "☀️ Buenos días. Este es tu entreno de hoy:") : "Hoy:";
  return send(env, chat, `${head}\n\n${sessText(s)}${morning ? "\n\n¿Cómo te encuentras?" : ""}`,
    morning ? { reply_markup: { inline_keyboard: [FEEL.map((f, i) => ({ text: `${f} ${i + 1}`, callback_data: "ci:" + (i + 1) }))] } } : {});
}

// ——— HTTP ———
function cors(env, req) {
  const o = req.headers.get("origin") || "";
  const ok = o === env.APP_ORIGIN || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
  return ok ? { "access-control-allow-origin": o, "access-control-allow-headers": "authorization, content-type", "access-control-allow-methods": "GET, POST, OPTIONS", vary: "origin" } : {};
}
const authed = (env, req) => req.headers.get("authorization") === "Bearer " + env.APP_TOKEN;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const h = cors(env, req);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });

    if (url.pathname === "/telegram" && req.method === "POST") {
      if (req.headers.get("x-telegram-bot-api-secret-token") !== env.TG_SECRET) return new Response("no", { status: 401 });
      try { await onUpdate(env, await req.json(), url.origin); } catch (e) { console.error(e); }
      return new Response("ok");
    }

    if (url.pathname === "/api/sync" && req.method === "POST") {
      if (!authed(env, req)) return json({ error: "auth" }, 401, h);
      const body = await req.json();
      if (!Array.isArray(body.sessions)) return json({ error: "bad" }, 400, h);
      await putJ(env, "ctx", { ...body, syncedAt: new Date().toISOString() });
      const [ov, owner, bot] = await Promise.all([getJ(env, "ov", {}), env.KV.get("owner"), botName(env)]);
      return json({ ov, bot, linked: !!owner }, 200, h);
    }

    if (url.pathname === "/api/overrides") {
      if (!authed(env, req)) return json({ error: "auth" }, 401, h);
      return json({ ov: await getJ(env, "ov", {}) }, 200, h);
    }

    // Una vez tras desplegar: /setup?key=APP_TOKEN registra el webhook y los comandos
    if (url.pathname === "/setup") {
      if (url.searchParams.get("key") !== env.APP_TOKEN) return new Response("no", { status: 401 });
      const hook = await tg(env, "setWebhook", { url: url.origin + "/telegram", secret_token: env.TG_SECRET, allowed_updates: ["message", "callback_query"], drop_pending_updates: true });
      const cmds = await tg(env, "setMyCommands", { commands: [
        { command: "hoy", description: "El entreno de hoy" }, { command: "semana", description: "Los próximos 7 días" },
        { command: "deshacer", description: "Quitar el último ajuste" }, { command: "original", description: "Quitar todos los ajustes" },
        { command: "olvidar", description: "Reiniciar la conversación" }, { command: "ayuda", description: "Qué puedo hacer" } ] });
      return json({ webhook: hook, commands: cmds, bot: await botName(env) });
    }
    return new Response("Mi planning · entrenador", { status: 200 });
  },

  async scheduled(event, env, ctx) {
    const owner = await env.KV.get("owner");
    if (!owner) return;
    const key = "morning:" + madridToday();
    if (await env.KV.get(key)) return;
    await env.KV.put(key, "1", { expirationTtl: 2 * 86400 });
    ctx.waitUntil(sendToday(env, owner, true));
  },
};

async function botName(env) {
  let n = await env.KV.get("botname");
  if (!n) { const r = await tg(env, "getMe", {}); n = r.result?.username || ""; if (n) await env.KV.put("botname", n); }
  return n;
}
