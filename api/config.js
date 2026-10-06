const { send, allow, checkEnv, isJson, readJson } = require("./_lib/http");
const { getSession } = require("./_lib/session");
const { readFile, writeFile } = require("./_lib/github");

const CONFIG_JSON_PATH = "data/config.json";
const CONFIG_JS_PATH = "js/modules/config.js";

const commitMessage = msg => `Config: ${String(msg || "actualización").replace(/[\r\n]+/g, " ").slice(0, 100)}`;

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
      // Intentar leer del JSON primero, si no existe, leer del JS
      let config = null;
      let sha = null;

      try {
        const data = await readFile(CONFIG_JSON_PATH);
        if (data.text) {
          config = JSON.parse(data.text);
          sha = data.sha;
        }
      } catch (err) {
        // Si no existe el JSON, intentar leer del JS
        try {
          const jsData = await readFile(CONFIG_JS_PATH);
          if (jsData.text) {
            // Extraer CONFIG del JS
            const match = jsData.text.match(/export const CONFIG\s*=\s*({[\s\S]*?});/);
            if (match) {
              config = JSON.parse(match[1].trim());
              sha = jsData.sha;
            }
          }
        } catch (jsErr) {
          console.error("Error reading JS config:", jsErr);
        }
      }

      return send(res, 200, { sha, config });
    }

    if (!isJson(req)) return send(res, 415, { error: "Se esperaba JSON" });
    let body;
    try { body = await readJson(req); } catch { return send(res, 400, { error: "JSON inválido" }); }

    let config;
    try { config = normalizeConfig(body.config); } catch (err) { return send(res, 400, { error: err.message }); }

    // Guardar en ambos archivos: JSON y JS
    const jsonText = `${JSON.stringify(config, null, 2)}\n`;
    const jsText = configToJS(config);

    // Primero guardar el JSON
    const jsonSha = await writeFile(CONFIG_JSON_PATH, jsonText, body.sha || null, commitMessage(body.message));

    // Luego guardar el JS (usando el sha del JSON como base para evitar conflictos)
    try {
      await writeFile(CONFIG_JS_PATH, jsText, null, commitMessage(`${body.message} (JS)`));
    } catch (jsErr) {
      console.error("Error saving JS config:", jsErr);
      // No fallar si no se puede guardar el JS, el JSON es lo importante
    }

    send(res, 200, { sha: jsonSha, config });
  } catch (err) {
    if (err.status === 409 || err.status === 422) return send(res, 409, { error: "El config cambió mientras editabas. Se recargó, probá de nuevo." });
    console.error(err);
    send(res, 502, { error: `No se pudo hablar con GitHub: ${err.message}` });
  }
};
