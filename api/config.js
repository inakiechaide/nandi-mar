// api/config.js
// Única fuente de verdad: js/modules/config.js (el mismo archivo que importa el sitio).
// Un guardado = un commit = un deploy.
const { send, allow, checkEnv, isJson, readJson } = require("./_lib/http");
const { getSession } = require("./_lib/session");
const { readFile, writeFile } = require("./_lib/github");
const vm = require("vm");

const CONFIG_PATH = "js/modules/config.js";
const MAX_BYTES = 300 * 1024;
const PREFIX = "export const CONFIG = ";

const commitMessage = msg => `Config: ${String(msg || "actualización").replace(/[\r\n]+/g, " ").slice(0, 100)}`;
const serialize = config => `${PREFIX}${JSON.stringify(config, null, 2)};\n`;
const hasOtherExports = text => /^\s*export\s+(?!const\s+CONFIG\b)/m.test(text);

// Lee CONFIG del módulo. Si lo escribió este endpoint es JSON puro; si todavía es el
// archivo escrito a mano (claves sin comillas, comillas simples, comentarios) se evalúa
// aislado en un contexto vacío.
function parseConfig(text) {
  const src = text.trim();
  if (src.startsWith(PREFIX)) {
    try { return JSON.parse(src.slice(PREFIX.length).replace(/;\s*$/, "")); } catch { /* escrito a mano */ }
  }
  if (!/^\s*export\s+const\s+CONFIG\b/m.test(src)) throw new Error("no exporta CONFIG");
  const script = `${src.replace(/^\s*import\s.*$/gm, "").replace(/^(\s*)export\s+(default\s+)?/gm, "$1")}\n;CONFIG`;
  const value = vm.runInNewContext(script, Object.create(null), { timeout: 500 });
  return JSON.parse(JSON.stringify(value));
}

function normalizeConfig(raw) {
  if (!raw || typeof raw !== "object") throw new Error("El formato de config es inválido");
  if (!raw.site || typeof raw.site !== "object") throw new Error("Falta site");
  if (!raw.about || typeof raw.about !== "object") throw new Error("Falta about");
  if (!Array.isArray(raw.areas)) throw new Error("Falta areas");
  if (!raw.contact || typeof raw.contact !== "object") throw new Error("Falta contact");
  if (!Array.isArray(raw.socials)) throw new Error("Falta socials");
  if (!raw.newsletter || typeof raw.newsletter !== "object") throw new Error("Falta newsletter");

  if (raw.areas.length === 0) throw new Error("Debe haber al menos un área");
  const ids = new Set();
  raw.areas.forEach((area, i) => {
    if (!area || !area.id || !area.navLabel || !area.title) throw new Error(`Área ${i + 1}: falta id, navLabel o title`);
    if (ids.has(area.id)) throw new Error(`Área ${i + 1}: el id "${area.id}" está repetido`);
    ids.add(area.id);
    if (!Array.isArray(area.offerings)) throw new Error(`Área ${i + 1}: falta offerings`);
    if (!Array.isArray(area.media)) throw new Error(`Área ${i + 1}: falta media`);
  });

  raw.socials.forEach((social, i) => {
    if (!social || !social.name || !social.url || !social.icon) throw new Error(`Red social ${i + 1}: falta name, url o icon`);
  });

  const colors = raw.theme?.colors;
  if (colors !== undefined) {
    if (!colors || typeof colors !== "object" || Array.isArray(colors)) throw new Error("Los colores del tema son inválidos");
    for (const [key, value] of Object.entries(colors)) {
      if (!/^[a-z0-9-]{1,20}$/.test(key) || !/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value))) throw new Error(`Color inválido: ${key}`);
    }
  }

  // Las imágenes van como archivo en img/ (o una URL), nunca incrustadas: un config.js de varios MB
  // frena el sitio y GitHub deja de devolver su contenido por la API.
  if (JSON.stringify(raw).includes('"data:')) throw new Error("Las imágenes no pueden ir en base64. Subilas con el botón «Subir imagen» o pegá una URL.");
  if (Buffer.byteLength(JSON.stringify(raw)) > MAX_BYTES) throw new Error("La configuración es demasiado grande.");

  return raw;
}

module.exports = async (req, res) => {
  if (!allow(req, res, ["GET", "PUT"]) || !checkEnv(res)) return;
  if (!getSession(req)) return send(res, 401, { error: "Sesión vencida, volvé a ingresar" });

  try {
    if (req.method === "GET") {
      const { sha, text } = await readFile(CONFIG_PATH);
      if (!text) return send(res, 404, { error: `No se encontró ${CONFIG_PATH} en el repositorio` });
      let config;
      try { config = parseConfig(text); } catch (err) { return send(res, 500, { error: `No se pudo leer ${CONFIG_PATH}: ${err.message}` }); }
      return send(res, 200, { sha, config });
    }

    if (!isJson(req)) return send(res, 415, { error: "Se esperaba JSON" });
    let body;
    try { body = await readJson(req); } catch { return send(res, 400, { error: "JSON inválido" }); }

    let config;
    try { config = normalizeConfig(body.config); } catch (err) { return send(res, 400, { error: err.message }); }

    const text = serialize(config);
    const current = await readFile(CONFIG_PATH);
    if (current.text && hasOtherExports(current.text)) {
      return send(res, 400, { error: `${CONFIG_PATH} exporta otras cosas además de CONFIG; movelas a otro módulo antes de editar desde el panel.` });
    }
    if (current.text === text) return send(res, 200, { sha: current.sha, config });

    const sha = await writeFile(CONFIG_PATH, text, body.sha || null, commitMessage(body.message));
    send(res, 200, { sha, config });
  } catch (err) {
    if (err.status === 409 || err.status === 422) return send(res, 409, { error: "La configuración cambió mientras editabas. Se recargó, probá de nuevo." });
    console.error(err);
    send(res, 502, { error: `No se pudo hablar con GitHub: ${err.message}` });
  }
};
