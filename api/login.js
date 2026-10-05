const { send, allow, checkEnv, isJson, readJson } = require("./_lib/http");
const { checkCredentials, startSession } = require("./_lib/session");

module.exports = async (req, res) => {
  if (!allow(req, res, ["POST"]) || !checkEnv(res)) return;
  if (!isJson(req)) return send(res, 415, { error: "Se esperaba JSON" });
  let body;
  try { body = await readJson(req); } catch { return send(res, 400, { error: "JSON inválido" }); }
  if (!checkCredentials(body.user, body.password)) {
    await new Promise(r => setTimeout(r, 600));
    return send(res, 401, { error: "Usuario o contraseña incorrectos" });
  }
  startSession(req, res);
  send(res, 200, { user: process.env.ADMIN_USER });
};
