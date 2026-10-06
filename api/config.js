const { send, allow, checkEnv, isJson, readJson } = require("./_lib/http");
const { getSession } = require("./_lib/session");
const { readFile, writeFile } = require("./_lib/github");

const CONFIG_PATH = "js/modules/config.js";

const commitMessage = msg => `Config: ${String(msg || "actualización").replace(/[\r\n]+/g, " ").slice(0, 100)}`;

function extractConfigFromJS(jsText) {
  const match = jsText.match(/export const CONFIG\s*=\s*({[\s\S]*});/);
  if (!match) throw new Error("No se pudo encontrar CONFIG en el archivo");
  try {
    return JSON.parse(match[1]);
  } catch (err) {
    throw new Error("El formato de CONFIG no es válido JSON");
  }
}

function configToJS(config) {
  return `export const CONFIG = ${JSON.stringify(config, null, 2)};\n`;
}

function normalizeConfig(raw) {
  if (!raw || typeof raw !== "object") throw new Error("El formato de config es inválido");
  
  // Validar estructura básica
  if (!raw.site || typeof raw.site !== "object") throw new Error("Falta site");
  if (!raw.about || typeof raw.about !== "object") throw new Error("Falta about");
  if (!raw.areas || !Array.isArray(raw.areas)) throw new Error("Falta areas");
  if (!raw.contact || typeof raw.contact !== "object") throw new Error("Falta contact");
  if (!raw.socials || !Array.isArray(raw.socials)) throw new Error("Falta socials");
  if (!raw.newsletter || typeof raw.newsletter !== "object") throw new Error("Falta newsletter");
  
  // Validar areas
  if (raw.areas.length === 0) throw new Error("Debe haber al menos un área");
  for (let i = 0; i < raw.areas.length; i++) {
    const area = raw.areas[i];
    if (!area.id || !area.navLabel || !area.title) {
      throw new Error(`Área ${i + 1}: falta id, navLabel o title`);
    }
    if (!area.offerings || !Array.isArray(area.offerings)) {
      throw new Error(`Área ${i + 1}: falta offerings`);
    }
    if (!area.media || !Array.isArray(area.media)) {
      throw new Error(`Área ${i + 1}: falta media`);
    }
  }
  
  // Validar socials
  for (let i = 0; i < raw.socials.length; i++) {
    const social = raw.socials[i];
    if (!social.name || !social.url || !social.icon) {
      throw new Error(`Red social ${i + 1}: falta name, url o icon`);
    }
  }
  
  return raw;
}

module.exports = async (req, res) => {
  if (!allow(req, res, ["GET", "PUT"]) || !checkEnv(res)) return;
  if (!getSession(req)) return send(res, 401, { error: "Sesión vencida, volvé a ingresar" });

  try {
    if (req.method === "GET") {
      const { sha, text } = await readFile(CONFIG_PATH);
      const config = text ? extractConfigFromJS(text) : null;
      return send(res, 200, { sha, config });
    }

    if (!isJson(req)) return send(res, 415, { error: "Se esperaba JSON" });
    let body;
    try { body = await readJson(req); } catch { return send(res, 400, { error: "JSON inválido" }); }

    let config;
    try { config = normalizeConfig(body.config); } catch (err) { return send(res, 400, { error: err.message }); }

    const jsText = configToJS(config);
    const sha = await writeFile(CONFIG_PATH, jsText, body.sha || null, commitMessage(body.message));
    send(res, 200, { sha, config });
  } catch (err) {
    if (err.status === 409 || err.status === 422) return send(res, 409, { error: "El config cambió mientras editabas. Se recargó, probá de nuevo." });
    console.error(err);
    send(res, 502, { error: `No se pudo hablar con GitHub: ${err.message}` });
  }
};
