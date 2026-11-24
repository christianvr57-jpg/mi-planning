// Conexión con Strava (OAuth) para traer las carreras. Las claves se guardan solo en este dispositivo,
// en una entrada aparte que no entra en las copias de seguridad.
const Strava = (() => {
  const KEY = "mi-planning-strava";
  const get = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const set = (o) => { try { localStorage.setItem(KEY, JSON.stringify({ ...get(), ...o })); } catch {} };
  const redirectUri = () => location.origin + location.pathname;
  const pace = (sec, km) => { if (!km) return ""; const p = Math.round(sec / km); return `${Math.floor(p / 60)}:${String(p % 60).padStart(2, "0")}`; };
  const mmss = (sec) => { sec = Math.round(sec); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`; };

  function authorizeUrl() {
    const q = new URLSearchParams({ client_id: get().id, response_type: "code", redirect_uri: redirectUri(), approval_prompt: "auto", scope: "activity:read_all", state: "strava" });
    return "https://www.strava.com/oauth/authorize?" + q;
  }
  async function tokenReq(params) {
    const c = get();
    const r = await fetch("https://www.strava.com/oauth/token", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: c.id, client_secret: c.secret, ...params }) });
    if (!r.ok) throw new Error(r.status === 400 || r.status === 401 ? "credenciales no válidas" : "HTTP " + r.status);
    const j = await r.json();
    set({ access: j.access_token, refresh: j.refresh_token, expires: j.expires_at, ...(j.athlete ? { athlete: j.athlete.firstname } : {}) });
    return j;
  }
  async function handleRedirect() {
    const q = new URLSearchParams(location.search);
    const code = q.get("code"), err = q.get("error");
    history.replaceState(null, "", location.pathname + location.hash);
    if (err || !code) return { ok: false, msg: "Conexión con Strava cancelada" };
    if (!/activity:read/.test(q.get("scope") || "")) return { ok: false, msg: "Hay que permitir ver tus actividades" };
    if (!get().secret) return { ok: false, msg: "Falta el Client Secret en este dispositivo" };
    await tokenReq({ code, grant_type: "authorization_code" });
    return { ok: true };
  }
  async function token() {
    const c = get();
    if (!c.refresh) throw new Error("no conectado");
    if (c.access && c.expires * 1000 > Date.now() + 60000) return c.access;
    await tokenReq({ grant_type: "refresh_token", refresh_token: c.refresh });
    return get().access;
  }
  async function api(path) {
    const r = await fetch("https://www.strava.com/api/v3" + path, { headers: { Authorization: "Bearer " + (await token()) } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }

  // Resumen de las carreras de un día (YYYY-MM-DD, hora local)
  async function runSummary(dateISO) {
    const after = Math.floor(new Date(dateISO + "T00:00:00").getTime() / 1000);
    const acts = (await api(`/athlete/activities?after=${after - 1}&before=${after + 86400}&per_page=30`))
      .filter((a) => /Run/.test(a.sport_type || a.type) && a.start_date_local.slice(0, 10) === dateISO);
    if (!acts.length) return null;
    let dist = 0, mov = 0, el = 0, hrT = 0, hrS = 0, hrmax = 0;
    acts.forEach((a) => {
      dist += a.distance; mov += a.moving_time; el += a.elapsed_time;
      if (a.average_heartrate) { hrS += a.average_heartrate * a.moving_time; hrT += a.moving_time; }
      if (a.max_heartrate) hrmax = Math.max(hrmax, a.max_heartrate);
    });
    const main = acts.reduce((x, y) => (y.distance > x.distance ? y : x));
    let splits = "", best5k = "", best10k = "";
    try {
      const d = await api(`/activities/${main.id}`);
      splits = (d.splits_metric || []).filter((x) => x.distance > 500).map((x) => pace(x.moving_time, x.distance / 1000)).join(", ");
      const be = (n) => (d.best_efforts || []).find((x) => x.name === n);
      if (be("5K")) best5k = mmss(be("5K").elapsed_time);
      if (be("10K")) best10k = mmss(be("10K").elapsed_time);
    } catch {}
    const km = dist / 1000;
    return { km: Math.round(km * 100) / 100, minutes: Math.round(el / 60), pace: pace(mov, km), hr: hrT ? Math.round(hrS / hrT) : null,
      hrmax: hrmax ? Math.round(hrmax) : null, splits, best5k, best10k, names: acts.map((a) => a.name).join(" + ") };
  }

  // Clave de conexión: permite pasar la conexión de Safari a la app instalada
  const key = () => { const c = get(); return btoa(JSON.stringify({ i: c.id, s: c.secret, r: c.refresh, a: c.athlete })); };
  function useKey(k) {
    const o = JSON.parse(atob(k.trim()));
    if (!o.i || !o.s || !o.r) throw new Error("clave");
    localStorage.removeItem(KEY);
    set({ id: o.i, secret: o.s, refresh: o.r, athlete: o.a });
  }

  return { get, set, connected: () => !!get().refresh, authorizeUrl, handleRedirect, runSummary, key, useKey,
    disconnect: () => { try { localStorage.removeItem(KEY); } catch {} } };
})();
