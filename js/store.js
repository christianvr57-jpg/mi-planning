// Almacenamiento local (en este dispositivo) + copia de seguridad JSON
const STORE_KEY = "mi-planning";

const Store = (() => {
  let state = { version: 1, logs: {}, diet: {}, settings: { activeTarget: "A" } };

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state = { ...state, ...parsed, diet: parsed.diet || {}, settings: { ...state.settings, ...(parsed.settings || {}) } };
      }
    } catch (e) {
      console.warn("No se pudo leer el almacenamiento local", e);
    }
  }

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      alert("No se pudo guardar en este navegador. Exporta tus datos para no perderlos.");
      return false;
    }
  }

  load();

  return {
    get logs() { return state.logs; },
    get settings() { return state.settings; },
    get diet() { return state.diet; },
    getDay(date) { return state.diet[date] || null; },
    setDay(date, day) { state.diet[date] = { ...day, updatedAt: new Date().toISOString() }; save(); },
    getLog(id) { return state.logs[id] || null; },
    setLog(id, log) {
      state.logs[id] = { ...log, sessionId: id, updatedAt: new Date().toISOString() };
      save();
    },
    deleteLog(id) { delete state.logs[id]; save(); },
    setSetting(k, v) { state.settings[k] = v; save(); },
    exportJSON() {
      return JSON.stringify({ app: "mi-planning", exportedAt: new Date().toISOString(), ...state }, null, 2);
    },
    importJSON(text, mode = "merge") {
      const data = JSON.parse(text);
      // Acepta { logs: {...} } o un array de logs [{ sessionId, ... }]
      let logs = {};
      if (Array.isArray(data)) data.forEach((l) => { if (l.sessionId) logs[l.sessionId] = l; });
      else if (data.logs && Array.isArray(data.logs)) data.logs.forEach((l) => { if (l.sessionId) logs[l.sessionId] = l; });
      else if (data.logs) logs = data.logs;
      else if (!data.diet) throw new Error("El archivo no contiene registros.");
      if (mode === "replace") state.logs = logs;
      else state.logs = { ...state.logs, ...logs };
      if (data.diet) state.diet = mode === "replace" ? data.diet : { ...state.diet, ...data.diet };
      if (data.settings) state.settings = { ...state.settings, ...data.settings };
      save();
      return Object.keys(logs).length + Object.keys(data.diet || {}).length;
    },
    reset() { state = { version: 1, logs: {}, diet: {}, settings: { activeTarget: "A" } }; save(); },
  };
})();
