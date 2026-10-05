const REQUIRED_ENV = ["ADMIN_USER", "ADMIN_PASSWORD", "SESSION_SECRET", "GITHUB_TOKEN"];

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function allow(req, res, methods) {
  if (methods.includes(req.method)) return true;
  res.setHeader("Allow", methods.join(", "));
  send(res, 405, { error: "Método no permitido" });
  return false;
}

function checkEnv(res) {
  const missing = REQUIRED_ENV.filter(name => !process.env[name]);
  if (!missing.length) return true;
  send(res, 500, { error: `Faltan variables de entorno en Vercel: ${missing.join(", ")}` });
  return false;
}

function isJson(req) {
  return String(req.headers["content-type"] || "").startsWith("application/json");
}

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

module.exports = { send, allow, checkEnv, isJson, readJson };
