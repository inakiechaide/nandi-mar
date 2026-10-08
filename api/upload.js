// api/upload.js
// Sube una imagen a img/ en el repositorio. El panel la achica antes de enviarla.
const { send, allow, checkEnv, isJson, readJson } = require("./_lib/http");
const { getSession } = require("./_lib/session");
const { writeFile } = require("./_lib/github");

const MAX_BYTES = 3 * 1024 * 1024;
const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const slug = name => String(name || "imagen")
  .replace(/\.[a-z0-9]+$/i, "")
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
  .slice(0, 40) || "imagen";

module.exports = async (req, res) => {
  if (!allow(req, res, ["POST"]) || !checkEnv(res)) return;
  if (!getSession(req)) return send(res, 401, { error: "Sesión vencida, volvé a ingresar" });
  if (!isJson(req)) return send(res, 415, { error: "Se esperaba JSON" });

  let body;
  try { body = await readJson(req); } catch { return send(res, 400, { error: "JSON inválido" }); }

  const match = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(body.dataUrl || ""));
  const ext = match && TYPES[match[1]];
  if (!ext) return send(res, 400, { error: "La imagen tiene que ser JPG, PNG o WebP." });
  const data = Buffer.from(match[2], "base64");
  if (!data.length || data.length > MAX_BYTES) return send(res, 400, { error: "La imagen es demasiado pesada (máximo 3 MB)." });

  const path = `img/${slug(body.name)}-${Date.now().toString(36)}.${ext}`;
  try {
    await writeFile(path, data, null, `Imagen: ${path}`);
    send(res, 200, { path });
  } catch (err) {
    console.error(err);
    send(res, 502, { error: `No se pudo subir la imagen a GitHub: ${err.message}` });
  }
};
